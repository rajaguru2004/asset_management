import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LibrariesService } from './libraries.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { UpdateLibraryItemDto } from './dto/update-library-item.dto';
import { QueryLibraryItemsDto } from './dto/query-library-items.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

@ApiTags('Libraries')
@ApiBearerAuth('JWT-auth')
@Controller('libraries')
export class LibrariesController {
  constructor(private readonly libraries: LibrariesService) {}

  @Get()
  @RequirePermission({ resource: Resource.LIBRARIES, action: Action.VIEW })
  @ApiOperation({ summary: 'List items, optionally filtered by libName' })
  findAll(@Query() query: QueryLibraryItemsDto) {
    return this.libraries.findAll(query.libName);
  }

  @Get(':id')
  @RequirePermission({ resource: Resource.LIBRARIES, action: Action.VIEW })
  @ApiOperation({ summary: 'Get one library item' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.libraries.findOne(id);
  }

  @Post()
  @RequirePermission({ resource: Resource.LIBRARIES, action: Action.CREATE })
  @ApiOperation({ summary: 'Create library item' })
  create(@Body() dto: CreateLibraryItemDto) {
    return this.libraries.create(dto);
  }

  @Patch(':id')
  @RequirePermission({ resource: Resource.LIBRARIES, action: Action.UPDATE })
  @ApiOperation({ summary: 'Update data / (de)activate' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLibraryItemDto) {
    return this.libraries.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ resource: Resource.LIBRARIES, action: Action.DELETE })
  @ApiOperation({ summary: 'Soft-deactivate (blocked if referenced, where checkable)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.libraries.remove(id);
  }
}
