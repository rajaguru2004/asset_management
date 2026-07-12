import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { UpdateLibraryItemDto } from './dto/update-library-item.dto';
import { CHECKABLE_LIBRARIES, LibraryName } from './library.config';

@Injectable()
export class LibrariesService {
  constructor(private prisma: PrismaService) {}

  findAll(libName?: string) {
    return this.prisma.libraryItem.findMany({
      where: libName ? { libName } : undefined,
      orderBy: [{ libName: 'asc' }, { dataId: 'asc' }],
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.libraryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Library item not found');
    return item;
  }

  async create(dto: CreateLibraryItemDto) {
    await this.assertDataIdFree(dto.libName, dto.dataId);
    return this.prisma.libraryItem.create({
      data: {
        libName: dto.libName,
        dataId: dto.dataId,
        data: dto.data as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateLibraryItemDto) {
    const item = await this.prisma.libraryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Library item not found');

    return this.prisma.libraryItem.update({
      where: { id },
      data: {
        data: dto.data !== undefined ? (dto.data as Prisma.InputJsonValue) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: number) {
    const item = await this.prisma.libraryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Library item not found');

    if (CHECKABLE_LIBRARIES.includes(item.libName as LibraryName)) {
      const count = await this.usageCount(item.libName as LibraryName, item.dataId);
      if (count > 0) {
        throw new BadRequestException(`Cannot deactivate: used by ${count} asset(s)`);
      }
    }

    return this.prisma.libraryItem.update({ where: { id }, data: { isActive: false } });
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private async assertDataIdFree(libName: string, dataId: string) {
    const exists = await this.prisma.libraryItem.findUnique({
      where: { libName_dataId: { libName, dataId } },
      select: { id: true },
    });
    if (exists) throw new ConflictException('dataId already exists in this library');
  }

  private usageCount(libName: LibraryName, dataId: string): Promise<number> {
    if (libName === 'location') {
      return this.prisma.asset.count({ where: { location: dataId, isActive: true } });
    }
    return Promise.resolve(0);
  }
}
