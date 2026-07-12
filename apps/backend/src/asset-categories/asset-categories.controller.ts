import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetCategoriesService } from './asset-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

@ApiTags('Asset Categories')
@ApiBearerAuth('JWT-auth')
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(private readonly categories: AssetCategoriesService) {}

  @Get()
  @RequirePermission({ resource: Resource.ASSET_CATEGORIES, action: Action.VIEW })
  @ApiOperation({ summary: 'List categories (ordered by sortOrder)' })
  findAll() {
    return this.categories.findAll();
  }

  @Get(':id')
  @RequirePermission({ resource: Resource.ASSET_CATEGORIES, action: Action.VIEW })
  @ApiOperation({ summary: 'Get a category (with custom fields)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categories.findOne(id);
  }

  @Post()
  @RequirePermission({ resource: Resource.ASSET_CATEGORIES, action: Action.CREATE })
  @ApiOperation({ summary: 'Create category + custom-field schema' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @RequirePermission({ resource: Resource.ASSET_CATEGORIES, action: Action.UPDATE })
  @ApiOperation({ summary: 'Edit category / custom fields / (de)activate' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ resource: Resource.ASSET_CATEGORIES, action: Action.DELETE })
  @ApiOperation({ summary: 'Soft-deactivate category' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}
