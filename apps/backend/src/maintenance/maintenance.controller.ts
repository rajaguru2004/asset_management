import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MaintenanceService, type RequestUser } from './maintenance.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { ResolveRequestDto } from './dto/resolve-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

@ApiTags('Maintenance')
@ApiBearerAuth('JWT-auth')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  @RequirePermission({ resource: Resource.MAINTENANCE, action: Action.VIEW })
  @ApiOperation({ summary: 'Row scope: Employee=own, DeptHead=department, +assigned-to-me for everyone' })
  findAll(@Query() query: QueryRequestsDto, @CurrentUser() user: RequestUser) {
    return this.maintenance.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission({ resource: Resource.MAINTENANCE, action: Action.VIEW })
  @ApiOperation({ summary: 'Detail + stage timeline (approvedAt/assignedAt/startedAt/resolvedAt)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maintenance.findOne(id);
  }

  @Post()
  @RequirePermission({ resource: Resource.MAINTENANCE, action: Action.CREATE })
  @ApiOperation({ summary: 'Raise a request (409 if the asset already has an open one)' })
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: RequestUser) {
    return this.maintenance.create(dto, user.id);
  }

  @Patch(':id/approve')
  @RequirePermission({ resource: Resource.MAINTENANCE, action: Action.UPDATE })
  @ApiOperation({ summary: 'PENDING -> APPROVED' })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.maintenance.approve(id, user.id);
  }

  @Patch(':id/reject')
  @RequirePermission({ resource: Resource.MAINTENANCE, action: Action.UPDATE })
  @ApiOperation({ summary: 'PENDING -> REJECTED (reason required)' })
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectRequestDto, @CurrentUser() user: RequestUser) {
    return this.maintenance.reject(id, dto, user.id);
  }

  @Patch(':id/assign')
  @RequirePermission({ resource: Resource.MAINTENANCE, action: Action.UPDATE })
  @ApiOperation({ summary: 'APPROVED -> TECHNICIAN_ASSIGNED (technicianId = any active user)' })
  assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTechnicianDto) {
    return this.maintenance.assign(id, dto);
  }

  @Patch(':id/start')
  @RequirePermission({ resource: Resource.MAINTENANCE, action: Action.UPDATE })
  @ApiOperation({ summary: 'TECHNICIAN_ASSIGNED -> IN_PROGRESS; asset -> UNDER_MAINTENANCE (assigned tech or Admin/AM)' })
  start(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.maintenance.start(id, user);
  }

  @Patch(':id/resolve')
  @RequirePermission({ resource: Resource.MAINTENANCE, action: Action.UPDATE })
  @ApiOperation({ summary: 'IN_PROGRESS -> RESOLVED; restores ALLOCATED/AVAILABLE (assigned tech or Admin/AM)' })
  resolve(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolveRequestDto, @CurrentUser() user: RequestUser) {
    return this.maintenance.resolve(id, dto, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Requester cancels their own PENDING request (auth-only)' })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.maintenance.cancel(id, user.id);
  }
}
