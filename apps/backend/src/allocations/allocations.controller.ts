import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllocationsService } from './allocations.service';
import { AllocateDto } from './dto/allocate.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { TransferRequestDto } from './dto/transfer-request.dto';
import { QueryAllocationsDto } from './dto/query-allocations.dto';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Resource, Action } from '../common/rbac/permissions.enum';

interface AuthedUser {
  id: number;
}

@ApiTags('Allocations')
@ApiBearerAuth('JWT-auth')
@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocations: AllocationsService) {}

  @Get()
  @RequirePermission({ resource: Resource.ALLOCATIONS, action: Action.VIEW })
  @ApiOperation({ summary: 'Paginated list, filterable incl. overdue' })
  findAll(@Query() query: QueryAllocationsDto) {
    return this.allocations.findAll(query);
  }

  @Get('my')
  @ApiOperation({ summary: 'My ACTIVE allocations (auth-only, employee self-service)' })
  my(@CurrentUser() user: AuthedUser) {
    return this.allocations.my(user.id);
  }

  @Get('overdue')
  @RequirePermission({ resource: Resource.ALLOCATIONS, action: Action.VIEW })
  @ApiOperation({ summary: 'ACTIVE allocations past expectedReturnDate' })
  overdue() {
    return this.allocations.overdue();
  }

  @Get('transfers/pending')
  @RequirePermission({ resource: Resource.ALLOCATIONS, action: Action.UPDATE })
  @ApiOperation({ summary: 'Pending transfer-request queue' })
  transfersPending() {
    return this.allocations.transfersPending();
  }

  @Post()
  @RequirePermission({ resource: Resource.ALLOCATIONS, action: Action.CREATE })
  @ApiOperation({ summary: 'Allocate an AVAILABLE, non-shared asset (409 if already held / shared)' })
  create(@Body() dto: AllocateDto, @CurrentUser() user: AuthedUser) {
    return this.allocations.create(dto, user.id);
  }

  @Post(':id/return')
  @RequirePermission({ resource: Resource.ALLOCATIONS, action: Action.UPDATE })
  @ApiOperation({ summary: 'Return an ACTIVE allocation (condition check-in)' })
  returnAsset(@Param('id', ParseIntPipe) id: number, @Body() dto: ReturnAssetDto) {
    return this.allocations.returnAsset(id, dto);
  }

  @Post('transfer-request')
  @ApiOperation({ summary: 'Request transfer of a held asset to yourself (auth-only)' })
  transferRequest(@Body() dto: TransferRequestDto, @CurrentUser() user: AuthedUser) {
    return this.allocations.transferRequest(dto, user.id);
  }

  @Patch('transfers/:id/approve')
  @RequirePermission({ resource: Resource.ALLOCATIONS, action: Action.UPDATE })
  @ApiOperation({ summary: 'Approve pending transfer — atomic holder swap' })
  approveTransfer(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthedUser) {
    return this.allocations.approveTransfer(id, user.id);
  }

  @Patch('transfers/:id/reject')
  @RequirePermission({ resource: Resource.ALLOCATIONS, action: Action.UPDATE })
  @ApiOperation({ summary: 'Reject pending transfer (row removed — no REJECTED state for allocations)' })
  rejectTransfer(@Param('id', ParseIntPipe) id: number) {
    return this.allocations.rejectTransfer(id);
  }
}
