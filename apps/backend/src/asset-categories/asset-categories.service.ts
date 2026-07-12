import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CustomFieldDto } from './dto/custom-field.dto';

@Injectable()
export class AssetCategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.assetCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const cat = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    await this.assertNameFree(dto.name);
    this.assertUniqueKeys(dto.customFields);

    return this.prisma.assetCategory.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        tagPrefix: (dto.tagPrefix ?? 'AF').toUpperCase(),
        customFields: (dto.customFields ?? []) as unknown as Prisma.InputJsonValue,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const cat = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    if (dto.name && dto.name !== cat.name) await this.assertNameFree(dto.name);
    if (dto.customFields) this.assertUniqueKeys(dto.customFields);

    return this.prisma.assetCategory.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        tagPrefix: dto.tagPrefix ? dto.tagPrefix.toUpperCase() : undefined,
        customFields: dto.customFields
          ? (dto.customFields as unknown as Prisma.InputJsonValue)
          : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: number) {
    const cat = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');

    // TODO(Module 4): block hard-delete once assets reference this category.
    // For now categories are soft-deactivated so custom-field schemas survive.
    return this.prisma.assetCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async assertNameFree(name: string) {
    const exists = await this.prisma.assetCategory.findUnique({
      where: { name },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Category name already exists');
  }

  private assertUniqueKeys(fields?: CustomFieldDto[]) {
    if (!fields?.length) return;
    const keys = fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Custom field keys must be unique');
    }
  }
}
