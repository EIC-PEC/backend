import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';

@ApiTags('Subscribers & Newsletter')
@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe email to E-Summit updates (Public)' })
  @ApiResponse({ status: 200, description: 'Subscribed successfully' })
  async subscribe(@Body() dto: CreateSubscriberDto) {
    return this.subscribersService.subscribe(dto.email);
  }

  @ApiBearerAuth()
  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all email subscribers (Organizer+ only)' })
  async getAll() {
    return this.subscribersService.getAllSubscribers();
  }

  @ApiBearerAuth()
  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a subscriber by ID (Organizer+ only)' })
  async remove(@Param('id') id: string) {
    return this.subscribersService.deleteSubscriber(id);
  }
}
