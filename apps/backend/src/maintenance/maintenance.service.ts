import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AllocationStatus, AssetStatus, MaintenanceRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN, ASSET_MANAGER, DEPT_HEAD } from '../common/rbac/permissions.enum';
import { assertTransition } from './maintenance-state.machine';
import { CreateRequestDto } from './dto/create-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { ResolveRequestDto } from './dto/resolve-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';

export interface RequestUser {
  id: number;
  roleId: number;
  departmentId: number | null;
}

const REQUEST_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true, departmentId: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  technician: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.MaintenanceRequestInclude;

const OPEN_STATUSES: MaintenanceRequestStatus[] = [
  MaintenanceRequestStatus.PENDING,
  MaintenanceRequestStatus.APPROVED,
  MaintenanceRequestStatus.TECHNICIAN_ASSIGNED,
  MaintenanceRequestStatus.IN_PROGRESS,
];

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async findAll(query: QueryRequestsDto, user: RequestUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.MaintenanceRequestWhereInput = {
      assetId: query.assetId,
      status: query.status,
      priority: query.priority,
    };
    this.applyRowScope(where, user);

    const [total, items] = await Promise.all([
      this.prisma.maintenanceRequest.count({ where }),
      this.prisma.maintenanceRequest.findMany({
        where,
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const request = await this.prisma.maintenanceRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE });
    if (!request) throw new NotFoundException('Maintenance request not found');
    return request;
  }

  async create(dto: CreateRequestDto, requestedById: number) {
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const open = await this.prisma.maintenanceRequest.findFirst({
      where: { assetId: dto.assetId, status: { in: OPEN_STATUSES } },
    });
    if (open) throw new ConflictException('Asset already has an open maintenance request');

    try {
      const request = await this.prisma.maintenanceRequest.create({
        data: {
          assetId: dto.assetId,
          requestedById,
          issue: dto.issue,
          description: dto.description ?? '',
          priority: dto.priority ?? undefined,
        },
        include: REQUEST_INCLUDE,
      });
      this.events.emit('maintenance.submitted', { requestId: request.id, assetId: dto.assetId });
      return request;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Asset already has an open maintenance request');
      }
      throw e;
    }
  }

  async approve(id: number, approverId: number) {
    const request = await this.getOrThrow(id);
    assertTransition(request.status, MaintenanceRequestStatus.APPROVED);

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: { status: MaintenanceRequestStatus.APPROVED, approvedById: approverId, approvedAt: new Date() },
      include: REQUEST_INCLUDE,
    });
    this.events.emit('maintenance.approved', { requestId: id, assetId: request.assetId });
    return updated;
  }

  async reject(id: number, dto: RejectRequestDto, approverId: number) {
    const request = await this.getOrThrow(id);
    assertTransition(request.status, MaintenanceRequestStatus.REJECTED);

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: MaintenanceRequestStatus.REJECTED,
        approvedById: approverId,
        rejectReason: dto.reason,
      },
      include: REQUEST_INCLUDE,
    });
    this.events.emit('maintenance.rejected', { requestId: id, assetId: request.assetId });
    return updated;
  }

  async assign(id: number, dto: AssignTechnicianDto) {
    const request = await this.getOrThrow(id);
    assertTransition(request.status, MaintenanceRequestStatus.TECHNICIAN_ASSIGNED);

    const tech = await this.prisma.user.findUnique({ where: { id: dto.technicianId }, select: { isActive: true } });
    if (!tech || !tech.isActive) throw new BadRequestException('technicianId must be an active user');

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: { status: MaintenanceRequestStatus.TECHNICIAN_ASSIGNED, technicianId: dto.technicianId, assignedAt: new Date() },
      include: REQUEST_INCLUDE,
    });
    this.events.emit('maintenance.assigned', { requestId: id, assetId: request.assetId, technicianId: dto.technicianId });
    return updated;
  }

  start(id: number, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Maintenance request not found');
      assertTransition(request.status, MaintenanceRequestStatus.IN_PROGRESS);
      this.assertAssignedOrPrivileged(request.technicianId, user);

      const asset = await tx.asset.findUniqueOrThrow({ where: { id: request.assetId } });
      await tx.asset.update({
        where: { id: request.assetId },
        data: { status: AssetStatus.UNDER_MAINTENANCE },
      });

      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: MaintenanceRequestStatus.IN_PROGRESS,
          startedAt: new Date(),
          prevAssetStatus: asset.status,
        },
        include: REQUEST_INCLUDE,
      });

      // Future CONFIRMED bookings on this asset are flagged for the AM to
      // triage manually — not auto-cancelled. // TODO(M10): surface this list
      // in the notification the AM receives from this event.
      this.events.emit('maintenance.started', { requestId: id, assetId: request.assetId });
      return updated;
    });
  }

  resolve(id: number, dto: ResolveRequestDto, user: RequestUser) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Maintenance request not found');
      assertTransition(request.status, MaintenanceRequestStatus.RESOLVED);
      this.assertAssignedOrPrivileged(request.technicianId, user);

      const activeAllocation = await tx.assetAllocation.findFirst({
        where: { assetId: request.assetId, status: AllocationStatus.ACTIVE },
      });
      await tx.asset.update({
        where: { id: request.assetId },
        data: { status: activeAllocation ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE },
      });

      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: MaintenanceRequestStatus.RESOLVED,
          resolutionNotes: dto.resolutionNotes,
          cost: dto.cost,
          resolvedAt: new Date(),
        },
        include: REQUEST_INCLUDE,
      });
      this.events.emit('maintenance.resolved', { requestId: id, assetId: request.assetId });
      return updated;
    });
  }

  async cancel(id: number, requesterId: number) {
    const request = await this.getOrThrow(id);
    if (request.requestedById !== requesterId) throw new ForbiddenException('Only the requester can cancel');
    assertTransition(request.status, MaintenanceRequestStatus.CANCELLED);

    return this.prisma.maintenanceRequest.update({
      where: { id },
      data: { status: MaintenanceRequestStatus.CANCELLED },
      include: REQUEST_INCLUDE,
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async getOrThrow(id: number) {
    const request = await this.prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Maintenance request not found');
    return request;
  }

  private applyRowScope(where: Prisma.MaintenanceRequestWhereInput, user: RequestUser) {
    if (user.roleId === ADMIN || user.roleId === ASSET_MANAGER) return;
    if (user.roleId === DEPT_HEAD) {
      where.OR = [{ requestedBy: { departmentId: user.departmentId } }, { technicianId: user.id }];
      return;
    }
    where.OR = [{ requestedById: user.id }, { technicianId: user.id }];
  }

  private assertAssignedOrPrivileged(technicianId: number | null, user: RequestUser) {
    if (user.roleId === ADMIN || user.roleId === ASSET_MANAGER) return;
    if (technicianId !== user.id) throw new ForbiddenException('Only the assigned technician can do this');
  }
}
