import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

@ApiTags('Assets')
@ApiBearerAuth('JWT-auth')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @RequirePermission({ resource: Resource.ASSETS, action: Action.VIEW })
  @ApiOperation({ summary: 'Paginated list, filterable by category/status/condition/location/isShared, searchable' })
  findAll(@Query() query: QueryAssetsDto) {
    return this.assets.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ resource: Resource.ASSETS, action: Action.VIEW })
  @ApiOperation({ summary: 'Detail + current holder + recent maintenance history' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assets.findOne(id);
  }

  @Post()
  @RequirePermission({ resource: Resource.ASSETS, action: Action.CREATE })
  @ApiOperation({ summary: 'Register asset (server generates the tag)' })
  create(@Body() dto: CreateAssetDto) {
    return this.assets.create(dto);
  }

  @Patch(':id')
  @RequirePermission({ resource: Resource.ASSETS, action: Action.UPDATE })
  @ApiOperation({ summary: 'Edit asset (assetTag, categoryId immutable)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssetDto) {
    return this.assets.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ resource: Resource.ASSETS, action: Action.DELETE })
  @ApiOperation({ summary: 'Soft-retire (blocked if currently ALLOCATED)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.assets.remove(id);
  }
}
