import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { PassType, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('delegates')
  async getDelegates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('passType') passType?: PassType,
    @Query('isCheckedIn') isCheckedIn?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const checkedInBool =
      isCheckedIn !== undefined ? isCheckedIn === 'true' : undefined;

    return this.adminService.getDelegates(
      pageNum,
      limitNum,
      search,
      passType,
      checkedInBool,
    );
  }

  @Get('ca-leaderboard')
  async getCaLeaderboard() {
    return this.adminService.getCaLeaderboard();
  }

  @Patch('delegates/:id/override')
  @HttpCode(HttpStatus.OK)
  async toggleCheckInOverride(@Param('id') id: string) {
    return this.adminService.toggleCheckInOverride(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  async updateUserRole(
    @Param('id') userId: string,
    @Body('role') role: Role,
  ) {
    return this.adminService.updateUserRole(userId, role);
  }

  @Get('delegates/export')
  async exportAllDelegates() {
    return this.adminService.exportAllDelegates();
  }

  @Post('delegates/:id/resend-pass')
  @HttpCode(HttpStatus.OK)
  async resendPassEmail(@Param('id') id: string) {
    return this.adminService.resendPassEmail(id);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 30;
    return this.adminService.getAuditLogs(pageNum, limitNum, search, action, entity);
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('audit-logs/prune')
  @HttpCode(HttpStatus.OK)
  async pruneAuditLogs(@Body('olderThanDays') olderThanDays?: number) {
    return this.adminService.pruneAuditLogs(olderThanDays ?? 90);
  }
}



