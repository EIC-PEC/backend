import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { VerifyQrDto } from './dto/verify-qr.dto';
import { ManualLookupDto } from './dto/manual-lookup.dto';
import { CheckinService } from './checkin.service';

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Roles(Role.GATE, Role.ADMIN)
  @Post('verify-qr')
  @HttpCode(HttpStatus.OK)
  async verifyQr(
    @Body() dto: VerifyQrDto,
    @CurrentUser('id') volunteerUserId: string,
  ) {
    return this.checkinService.verifyQrCheckIn(dto, volunteerUserId);
  }

  @Roles(Role.GATE, Role.ADMIN)
  @Post('manual-lookup')
  @HttpCode(HttpStatus.OK)
  async manualLookup(
    @Body() dto: ManualLookupDto,
    @CurrentUser('id') volunteerUserId: string,
  ) {
    return this.checkinService.manualLookup(dto, volunteerUserId);
  }

  @Roles(Role.GATE, Role.ADMIN)
  @Get('stats')
  async getCheckInStats() {
    return this.checkinService.getCheckInStats();
  }
}
