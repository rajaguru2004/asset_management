import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

@ApiTags('Employee Directory')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission({ resource: Resource.EMPLOYEE_DIRECTORY, action: Action.VIEW })
  @ApiOperation({ summary: 'List employees (search / filter / paginate)' })
  findAll(@Query() query: QueryUsersDto) {
    return this.users.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ resource: Resource.EMPLOYEE_DIRECTORY, action: Action.VIEW })
  @ApiOperation({ summary: 'Get an employee profile' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }

  @Post()
  @RequirePermission({ resource: Resource.EMPLOYEE_DIRECTORY, action: Action.CREATE })
  @ApiOperation({ summary: 'Create an employee (any role)' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @RequirePermission({ resource: Resource.EMPLOYEE_DIRECTORY, action: Action.UPDATE })
  @ApiOperation({ summary: 'Update profile / department / status' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch(':id/role')
  @RequirePermission({ resource: Resource.EMPLOYEE_DIRECTORY, action: Action.UPDATE })
  @ApiOperation({
    summary: 'Promote / demote — the only place a role changes (live, no re-login)',
  })
  assignRole(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignRoleDto) {
    return this.users.assignRole(id, dto.roleId);
  }

  @Delete(':id')
  @RequirePermission({ resource: Resource.EMPLOYEE_DIRECTORY, action: Action.DELETE })
  @ApiOperation({ summary: 'Soft-deactivate an employee' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.users.remove(id);
  }
}
