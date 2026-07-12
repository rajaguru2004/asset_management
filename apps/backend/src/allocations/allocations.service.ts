import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AllocationStatus, AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AllocateDto } from './dto/allocate.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { TransferRequestDto } from './dto/transfer-request.dto';
import { QueryAllocationsDto } from './dto/query-allocations.dto';

const HOLDER_INCLUDE = {
  asset: { select: { id: true, assetTag: true, name: true, status: true, categoryId: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  department: { select: { id: true, code: true, name: true } },
  allocatedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.AssetAllocationInclude;

@Injectable()
export class AllocationsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async findAll(query: QueryAllocationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.AssetAllocationWhereInput = {
      status: query.status,
      assetId: query.assetId,
      userId: query.userId,
      departmentId: query.departmentId,
    };
    if (query.overdue) {
      where.status = AllocationStatus.ACTIVE;
      where.expectedReturnDate = { lt: new Date() };
    }

    const [total, items] = await Promise.all([
      this.prisma.assetAllocation.count({ where }),
      this.prisma.assetAllocation.findMany({
        where,
        include: HOLDER_INCLUDE,
        orderBy: { allocatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  my(userId: number) {
    return this.prisma.assetAllocation.findMany({
      where: { userId, status: AllocationStatus.ACTIVE },
      include: HOLDER_INCLUDE,
      orderBy: { allocatedAt: 'desc' },
    });
  }

  overdue() {
    return this.prisma.assetAllocation.findMany({
      where: { status: AllocationStatus.ACTIVE, expectedReturnDate: { lt: new Date() } },
      include: HOLDER_INCLUDE,
      orderBy: { expectedReturnDate: 'asc' },
    });
  }

  transfersPending() {
    return this.prisma.assetAllocation.findMany({
      where: { status: AllocationStatus.TRANSFER_PENDING },
      include: HOLDER_INCLUDE,
      orderBy: { allocatedAt: 'asc' },
    });
  }

  create(dto: AllocateDto, allocatedById: number) {
    if ((dto.userId == null) === (dto.departmentId == null)) {
      throw new BadRequestException('Provide exactly one of userId or departmentId');
    }

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({ where: { id: dto.assetId } });
      if (!asset) throw new NotFoundException('Asset not found');

      if (asset.isShared) {
        throw new ConflictException({
          message: 'This is a shared resource — use booking instead',
          errors: null,
        });
      }

      if (asset.status === AssetStatus.ALLOCATED) {
        const active = await tx.assetAllocation.findFirst({
          where: { assetId: dto.assetId, status: AllocationStatus.ACTIVE },
          include: HOLDER_INCLUDE,
        });
        throw new ConflictException({
          message: 'Asset already allocated',
          errors: {
            holder: active?.user ?? active?.department ?? null,
            allocatedAt: active?.allocatedAt ?? null,
            canRequestTransfer: true,
          },
        });
      }

      if (asset.status !== AssetStatus.AVAILABLE) {
        throw new BadRequestException(`Cannot allocate an asset with status ${asset.status}`);
      }

      if (dto.userId != null) await this.assertActiveUser(tx, dto.userId);
      if (dto.departmentId != null) await this.assertActiveDepartment(tx, dto.departmentId);

      try {
        const allocation = await tx.assetAllocation.create({
          data: {
            assetId: dto.assetId,
            userId: dto.userId ?? null,
            departmentId: dto.departmentId ?? null,
            allocatedById,
            expectedReturnDate: dto.expectedReturnDate ? new Date(dto.expectedReturnDate) : null,
            notes: dto.notes ?? '',
          },
          include: HOLDER_INCLUDE,
        });
        await tx.asset.update({ where: { id: dto.assetId }, data: { status: AssetStatus.ALLOCATED } });
        this.events.emit('allocation.created', { allocationId: allocation.id, assetId: dto.assetId });
        return allocation;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('Asset was just allocated by someone else — please retry');
        }
        throw e;
      }
    });
  }

  returnAsset(id: number, dto: ReturnAssetDto) {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.assetAllocation.findUnique({ where: { id } });
      if (!allocation) throw new NotFoundException('Allocation not found');
      if (allocation.status !== AllocationStatus.ACTIVE) {
        throw new BadRequestException('Only an ACTIVE allocation can be returned');
      }

      const updated = await tx.assetAllocation.update({
        where: { id },
        data: {
          status: AllocationStatus.RETURNED,
          returnedAt: new Date(),
          returnCondition: dto.returnCondition,
          notes: dto.notes ?? allocation.notes,
        },
        include: HOLDER_INCLUDE,
      });

      // Condition (even DAMAGED/UNDER_REPAIR) is recorded on the asset; routing it
      // into maintenance is a separate M7 action, not automatic here.
      await tx.asset.update({
        where: { id: allocation.assetId },
        data: { status: AssetStatus.AVAILABLE, condition: dto.returnCondition ?? undefined },
      });

      this.events.emit('allocation.returned', { allocationId: id, assetId: allocation.assetId });
      return updated;
    });
  }

  async transferRequest(dto: TransferRequestDto, requestingUserId: number) {
    const active = await this.prisma.assetAllocation.findFirst({
      where: { assetId: dto.assetId, status: AllocationStatus.ACTIVE },
    });
    if (!active) throw new BadRequestException('Asset is not currently allocated');
    if (active.userId === requestingUserId) {
      throw new BadRequestException('You already hold this asset');
    }

    const existingPending = await this.prisma.assetAllocation.findFirst({
      where: { assetId: dto.assetId, userId: requestingUserId, status: AllocationStatus.TRANSFER_PENDING },
    });
    if (existingPending) throw new ConflictException('You already have a pending transfer request for this asset');

    const pending = await this.prisma.assetAllocation.create({
      data: {
        assetId: dto.assetId,
        userId: requestingUserId,
        allocatedById: requestingUserId,
        status: AllocationStatus.TRANSFER_PENDING,
        expectedReturnDate: dto.expectedReturnDate ? new Date(dto.expectedReturnDate) : null,
        notes: dto.notes ?? '',
      },
      include: HOLDER_INCLUDE,
    });
    this.events.emit('allocation.transferRequested', { allocationId: pending.id, assetId: dto.assetId });
    return pending;
  }

  approveTransfer(id: number, approverId: number) {
    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.assetAllocation.findUnique({ where: { id } });
      if (!pending || pending.status !== AllocationStatus.TRANSFER_PENDING) {
        throw new NotFoundException('Pending transfer not found');
      }

      const active = await tx.assetAllocation.findFirst({
        where: { assetId: pending.assetId, status: AllocationStatus.ACTIVE },
      });
      // Asset stays ALLOCATED throughout — old row is closed before the pending
      // row opens, so it never passes through AVAILABLE mid-transfer.
      if (active) {
        await tx.assetAllocation.update({
          where: { id: active.id },
          data: { status: AllocationStatus.RETURNED, returnedAt: new Date() },
        });
      }

      const updated = await tx.assetAllocation.update({
        where: { id },
        data: { status: AllocationStatus.ACTIVE, allocatedById: approverId, allocatedAt: new Date() },
        include: HOLDER_INCLUDE,
      });
      this.events.emit('allocation.transferApproved', { allocationId: id, assetId: pending.assetId });
      return updated;
    });
  }

  async rejectTransfer(id: number) {
    const pending = await this.prisma.assetAllocation.findUnique({ where: { id } });
    if (!pending || pending.status !== AllocationStatus.TRANSFER_PENDING) {
      throw new NotFoundException('Pending transfer not found');
    }
    await this.prisma.assetAllocation.delete({ where: { id } });
    this.events.emit('allocation.transferRejected', { allocationId: id, assetId: pending.assetId });
    return { id };
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async assertActiveUser(tx: Prisma.TransactionClient, userId: number) {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { isActive: true } });
    if (!u || !u.isActive) throw new BadRequestException('Target user must be active');
  }

  private async assertActiveDepartment(tx: Prisma.TransactionClient, departmentId: number) {
    const d = await tx.department.findUnique({ where: { id: departmentId }, select: { isActive: true } });
    if (!d || !d.isActive) throw new BadRequestException('Target department must be active');
  }
}
