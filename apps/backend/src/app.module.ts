import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { AllocationsModule } from './allocations/allocations.module';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module';
import { AssetsModule } from './assets/assets.module';
import { BookingsModule } from './bookings/bookings.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { LibrariesModule } from './libraries/libraries.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { SchedulerModule } from './common/scheduler/scheduler.module';
import { EventsModule } from './common/events/events.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    AllocationsModule,
    AssetCategoriesModule,
    AssetsModule,
    BookingsModule,
    DashboardModule,
    HealthModule,
    LibrariesModule,
    MaintenanceModule,
    SchedulerModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard order matters: authenticate first (sets req.user), then authorize.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
