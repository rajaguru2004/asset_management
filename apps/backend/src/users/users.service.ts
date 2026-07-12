import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { USER_SAFE_SELECT } from '../common/selects/user.select';
import { ADMIN } from '../common/rbac/permissions.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const { search, roleId, departmentId, isActive } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleId !== undefined) where.roleId = roleId;
    if (departmentId !== undefined) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: USER_SAFE_SELECT,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Email already registered');

    await this.assertRoleExists(dto.roleId);
    if (dto.departmentId != null) await this.assertDeptExists(dto.departmentId);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? '',
        roleId: dto.roleId,
        departmentId: dto.departmentId ?? null,
        isActive: dto.isActive ?? true,
      },
      select: USER_SAFE_SELECT,
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.departmentId != null) await this.assertDeptExists(dto.departmentId);

    // Deactivating the final active Admin is blocked.
    if (dto.isActive === false && user.isActive && user.roleId === ADMIN) {
      await this.assertNotLastAdmin(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        departmentId: dto.departmentId,
        isActive: dto.isActive,
      },
      select: USER_SAFE_SELECT,
    });
  }

  /** The ONLY place a role changes. Promotion is effective on next request. */
  async assignRole(id: number, roleId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRoleExists(roleId);

    // Demoting the final active Admin is blocked.
    if (user.roleId === ADMIN && roleId !== ADMIN && user.isActive) {
      await this.assertNotLastAdmin(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: { roleId },
      select: USER_SAFE_SELECT,
    });
  }

  /** Soft-deactivate (never hard-delete a referenced user). */
  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.roleId === ADMIN && user.isActive) {
      await this.assertNotLastAdmin(id);
    }

    // Clear any department-head slots this user occupies (referential safety).
    await this.prisma.department.updateMany({
      where: { headId: id },
      data: { headId: null },
    });

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SAFE_SELECT,
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async assertRoleExists(roleId: number) {
    const role = await this.prisma.roleMaster.findUnique({
      where: { id: roleId },
      select: { id: true },
    });
    if (!role) throw new BadRequestException('Invalid role');
  }

  private async assertDeptExists(departmentId: number) {
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });
    if (!dept) throw new BadRequestException('Invalid department');
  }

  private async assertNotLastAdmin(excludingUserId: number) {
    const otherAdmins = await this.prisma.user.count({
      where: { roleId: ADMIN, isActive: true, id: { not: excludingUserId } },
    });
    if (otherAdmins === 0) {
      throw new BadRequestException(
        'Cannot demote or deactivate the last active Admin',
      );
    }
  }
}
