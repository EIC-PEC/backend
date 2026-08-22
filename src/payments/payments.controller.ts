import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(dto);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Public()
  @Post('validate-coupon')
  @HttpCode(HttpStatus.OK)
  async validateCoupon(@Body() body: { code: string }) {
    return this.paymentsService.validateCoupon(body.code);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() payload: any,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(payload);
    return this.paymentsService.handleWebhook(rawBody, signature, payload);
  }
}
