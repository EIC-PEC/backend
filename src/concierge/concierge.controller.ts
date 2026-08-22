import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ChatQueryDto } from './dto/chat.dto';
import { ConciergeService } from './concierge.service';

@Controller('concierge')
export class ConciergeController {
  constructor(private readonly conciergeService: ConciergeService) {}

  @Public()
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatQueryDto) {
    return this.conciergeService.processChat(dto);
  }
}
