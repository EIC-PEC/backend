import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Role } from '@prisma/client'
import { Public } from '../common/decorators/public.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateRegistrationDto } from './dto/create-registration.dto'
import { RegistrationsService } from './registrations.service'

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Public()
  @Get('types')
  async getPassTypes() {
    return this.registrationsService.getPassCatalog()
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createRegistration(
    @Body() dto: CreateRegistrationDto,
    @CurrentUser('id') authUserId?: string
  ) {
    return this.registrationsService.createRegistration(dto, authUserId)
  }

  @Get('my-passes')
  async getMyPasses(@CurrentUser('id') userId: string) {
    return this.registrationsService.getMyPasses(userId)
  }

  @Roles(Role.ADMIN)
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokePass(@Param('id') id: string, @CurrentUser('id') adminUserId: string) {
    return this.registrationsService.revokePass(id, adminUserId)
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':passId')
  async getPassById(
    @Param('passId') passId: string,
    @CurrentUser('id') authUserId?: string
  ) {
    return this.registrationsService.getPassById(passId, authUserId)
  }
}
