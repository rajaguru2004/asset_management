import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';

const ASSET_INCLUDE = {
  category: true,
  vendor: true,
} satisfies Prisma.AssetInclude;

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAssetDto, userId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    const existing = await this.prisma.asset.findUnique({
      where: { assetTag: dto.assetTag },
    });

    if (existing) {
      throw new ConflictException('Asset tag already exists');
    }

    const data: Prisma.AssetUncheckedCreateInput = {
      ...dto,
      createdById: userId,
    };

    return this.prisma.asset.create({
      data,
      include: ASSET_INCLUDE,
    });
  }

  async findAll(query: QueryAssetDto) {
    const { search, status, categoryId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        include: ASSET_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: ASSET_INCLUDE,
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async update(id: string, dto: UpdateAssetDto) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Asset not found');
    }

    if (dto.assetTag && dto.assetTag !== existing.assetTag) {
      const duplicate = await this.prisma.asset.findUnique({
        where: { assetTag: dto.assetTag },
      });

      if (duplicate) {
        throw new ConflictException('Asset tag already exists');
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }

    const data: Prisma.AssetUncheckedUpdateInput = { ...dto };

    return this.prisma.asset.update({
      where: { id },
      data,
      include: ASSET_INCLUDE,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Asset not found');
    }

    return this.prisma.asset.delete({
      where: { id },
      include: ASSET_INCLUDE,
    });
  }
}
