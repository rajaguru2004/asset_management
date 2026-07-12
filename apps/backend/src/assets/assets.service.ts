import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';

interface CustomFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  required?: boolean;
  libraryName?: string;
}

type Tx = Prisma.TransactionClient;

const DETAIL_INCLUDE = {
  category: { select: { id: true, name: true, tagPrefix: true } },
  allocations: {
    where: { status: 'ACTIVE' as const },
    take: 1,
    select: {
      id: true,
      userId: true,
      departmentId: true,
      allocatedAt: true,
      expectedReturnDate: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      department: { select: { id: true, code: true, name: true } },
    },
  },
} satisfies Prisma.AssetInclude;

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  findAll(query: QueryAssetsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.AssetWhereInput = {
      isActive: true,
      categoryId: query.categoryId,
      status: query.status,
      condition: query.condition,
      location: query.location,
      isShared: query.isShared,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { assetTag: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [total, items] = await Promise.all([
        tx.asset.count({ where }),
        tx.asset.findMany({
          where,
          include: { category: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    });
  }

  async findOne(id: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        ...DETAIL_INCLUDE,
        maintenance: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, issue: true, status: true, priority: true, createdAt: true, resolvedAt: true },
        },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  create(dto: CreateAssetDto) {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.assetCategory.findUnique({ where: { id: dto.categoryId } });
      if (!category || !category.isActive) {
        throw new BadRequestException('Category not found or inactive');
      }

      await this.validateCustomValues(
        tx,
        dto.customValues ?? {},
        (category.customFields as unknown as CustomFieldDefinition[]) ?? [],
      );

      if (dto.location) await this.assertLibraryActive(tx, 'location', dto.location);
      if (dto.serialNumber) await this.assertSerialFree(tx, dto.serialNumber);

      const sequence = await tx.assetTagSequence.upsert({
        where: { categoryId: dto.categoryId },
        update: { lastNumber: { increment: 1 } },
        create: { categoryId: dto.categoryId, lastNumber: 1 },
      });
      const assetTag = `${category.tagPrefix}-${String(sequence.lastNumber).padStart(4, '0')}`;

      return tx.asset.create({
        data: {
          assetTag,
          name: dto.name,
          categoryId: dto.categoryId,
          serialNumber: dto.serialNumber,
          condition: dto.condition ?? undefined,
          location: dto.location ?? '',
          isShared: dto.isShared ?? false,
          acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
          acquisitionCost: dto.acquisitionCost,
          photoUrl: dto.photoUrl,
          customValues: (dto.customValues ?? {}) as Prisma.InputJsonValue,
        },
        include: { category: { select: { id: true, name: true } } },
      });
    });
  }

  async update(id: number, dto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.customValues) {
        const category = await tx.assetCategory.findUniqueOrThrow({ where: { id: asset.categoryId } });
        await this.validateCustomValues(
          tx,
          dto.customValues,
          (category.customFields as unknown as CustomFieldDefinition[]) ?? [],
        );
      }
      if (dto.location) await this.assertLibraryActive(tx, 'location', dto.location);
      if (dto.serialNumber && dto.serialNumber !== asset.serialNumber) {
        await this.assertSerialFree(tx, dto.serialNumber);
      }

      return tx.asset.update({
        where: { id },
        data: {
          name: dto.name,
          serialNumber: dto.serialNumber,
          condition: dto.condition,
          location: dto.location,
          isShared: dto.isShared,
          acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
          acquisitionCost: dto.acquisitionCost,
          photoUrl: dto.photoUrl,
          customValues: dto.customValues ? (dto.customValues as Prisma.InputJsonValue) : undefined,
        },
        include: { category: { select: { id: true, name: true } } },
      });
    });
  }

  async remove(id: number) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status === AssetStatus.ALLOCATED) {
      throw new BadRequestException('Cannot retire: asset is currently allocated');
    }

    return this.prisma.asset.update({
      where: { id },
      data: { status: AssetStatus.RETIRED, isActive: false },
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async validateCustomValues(
    tx: Tx,
    customValues: Record<string, unknown>,
    customFields: CustomFieldDefinition[],
  ) {
    const allowedKeys = new Set(customFields.map((f) => f.key));
    for (const key of Object.keys(customValues)) {
      if (!allowedKeys.has(key)) throw new BadRequestException(`Unknown custom field: ${key}`);
    }

    for (const field of customFields) {
      const value = customValues[field.key];
      if (value === undefined || value === null || value === '') {
        if (field.required) throw new BadRequestException(`${field.label} is required`);
        continue;
      }

      switch (field.type) {
        case 'number':
          if (typeof value !== 'number') {
            throw new BadRequestException(`${field.label} must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new BadRequestException(`${field.label} must be true/false`);
          }
          break;
        case 'date':
          if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
            throw new BadRequestException(`${field.label} must be a valid date`);
          }
          break;
        case 'select':
          if (typeof value !== 'string') {
            throw new BadRequestException(`${field.label} must be a string`);
          }
          if (field.libraryName) {
            await this.assertLibraryActive(tx, field.libraryName, value, field.label);
          }
          break;
        case 'text':
        default:
          if (typeof value !== 'string') {
            throw new BadRequestException(`${field.label} must be text`);
          }
      }
    }
  }

  private async assertLibraryActive(tx: Tx, libName: string, dataId: string, label = 'location') {
    const item = await tx.libraryItem.findUnique({
      where: { libName_dataId: { libName, dataId } },
    });
    if (!item || !item.isActive) {
      throw new BadRequestException(`${label}: "${dataId}" is not a valid option`);
    }
  }

  private async assertSerialFree(tx: Tx, serialNumber: string) {
    const exists = await tx.asset.findUnique({ where: { serialNumber }, select: { id: true } });
    if (exists) throw new BadRequestException('Serial number already registered');
  }
}
