import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

const HEAD_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
};

const LIST_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  parentId: true,
  headId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  head: HEAD_SELECT,
  parent: { select: { id: true, code: true, name: true } },
  _count: { select: { members: true, children: true } },
} satisfies Prisma.DepartmentSelect;

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      select: LIST_SELECT,
      orderBy: { code: 'asc' },
    });
  }

  /** Nested hierarchy built from the flat list (parentId links). */
  async tree() {
    const flat = await this.prisma.department.findMany({
      select: LIST_SELECT,
      orderBy: { code: 'asc' },
    });
    type Node = (typeof flat)[number] & { children: Node[] };
    const byId = new Map<number, Node>();
    flat.forEach((d) => byId.set(d.id, { ...d, children: [] }));
    const roots: Node[] = [];
    byId.forEach((node) => {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async findOne(id: number) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      select: {
        ...LIST_SELECT,
        children: { select: { id: true, code: true, name: true, isActive: true } },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            role: { select: { roleName: true } },
          },
          orderBy: { firstName: 'asc' },
        },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    await this.assertCodeFree(dto.code);
    if (dto.parentId != null) await this.assertDeptExists(dto.parentId);
    if (dto.headId != null) await this.assertActiveUser(dto.headId);

    return this.prisma.department.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description ?? '',
        parentId: dto.parentId ?? null,
        headId: dto.headId ?? null,
        isActive: dto.isActive ?? true,
      },
      select: LIST_SELECT,
    });
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');

    if (dto.code && dto.code.toUpperCase() !== dept.code) {
      await this.assertCodeFree(dto.code);
    }
    if (dto.headId != null) await this.assertActiveUser(dto.headId);

    if (dto.parentId != null) {
      if (dto.parentId === id) {
        throw new BadRequestException('A department cannot be its own parent');
      }
      await this.assertDeptExists(dto.parentId);
      if (await this.wouldCycle(id, dto.parentId)) {
        throw new BadRequestException(
          'Invalid parent: that would create a cycle in the hierarchy',
        );
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        code: dto.code ? dto.code.toUpperCase() : undefined,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        headId: dto.headId,
        isActive: dto.isActive,
      },
      select: LIST_SELECT,
    });
  }

  async remove(id: number) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');

    const [activeMembers, activeChildren] = await Promise.all([
      this.prisma.user.count({ where: { departmentId: id, isActive: true } }),
      this.prisma.department.count({ where: { parentId: id, isActive: true } }),
    ]);
    if (activeMembers > 0) {
      throw new BadRequestException(
        'Cannot deactivate: department still has active members',
      );
    }
    if (activeChildren > 0) {
      throw new BadRequestException(
        'Cannot deactivate: department still has active sub-departments',
      );
    }

    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
      select: LIST_SELECT,
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async assertCodeFree(code: string) {
    const exists = await this.prisma.department.findUnique({
      where: { code: code.toUpperCase() },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Department code already exists');
  }

  private async assertDeptExists(id: number) {
    const d = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!d) throw new BadRequestException('Parent department not found');
  }

  private async assertActiveUser(id: number) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });
    if (!u || !u.isActive) {
      throw new BadRequestException('Head must be an active user');
    }
  }

  /** True if setting node `id`'s parent to `newParentId` would form a cycle. */
  private async wouldCycle(id: number, newParentId: number): Promise<boolean> {
    let cursor: number | null = newParentId;
    const seen = new Set<number>();
    while (cursor != null) {
      if (cursor === id) return true; // walking up from the new parent hit us
      if (seen.has(cursor)) break; // pre-existing cycle guard
      seen.add(cursor);
      const parent = await this.prisma.department.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = parent?.parentId ?? null;
    }
    return false;
  }
}
