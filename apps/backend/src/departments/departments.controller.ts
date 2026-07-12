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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

@ApiTags('Departments')
@ApiBearerAuth('JWT-auth')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  @RequirePermission({ resource: Resource.DEPARTMENTS, action: Action.VIEW })
  @ApiOperation({ summary: 'Flat list with member / child counts' })
  findAll() {
    return this.departments.findAll();
  }

  @Get('tree')
  @RequirePermission({ resource: Resource.DEPARTMENTS, action: Action.VIEW })
  @ApiOperation({ summary: 'Nested hierarchy' })
  tree() {
    return this.departments.tree();
  }

  @Get(':id')
  @RequirePermission({ resource: Resource.DEPARTMENTS, action: Action.VIEW })
  @ApiOperation({ summary: 'Detail + head + members + children' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departments.findOne(id);
  }

  @Post()
  @RequirePermission({ resource: Resource.DEPARTMENTS, action: Action.CREATE })
  @ApiOperation({ summary: 'Create department' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departments.create(dto);
  }

  @Patch(':id')
  @RequirePermission({ resource: Resource.DEPARTMENTS, action: Action.UPDATE })
  @ApiOperation({ summary: 'Rename / re-parent (cycle-checked) / assign head / (de)activate' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departments.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission({ resource: Resource.DEPARTMENTS, action: Action.DELETE })
  @ApiOperation({ summary: 'Soft-deactivate (blocked if active members / children)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.departments.remove(id);
  }
}
