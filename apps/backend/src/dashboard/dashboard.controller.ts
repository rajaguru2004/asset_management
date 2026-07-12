import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  @RequirePermission({ resource: Resource.DASHBOARD, action: Action.VIEW })
  @ApiOperation({ summary: 'KPI batch for the home dashboard' })
  stats() {
    return this.dashboard.stats();
  }
}
