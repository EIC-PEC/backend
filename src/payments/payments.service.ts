import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';

import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly keyId?: string;
  private readonly keySecret?: string;
  private readonly webhookSecret?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
  }


  async validateCoupon(code: string) {
    if (!code || typeof code !== 'string') {
      throw new BadRequestException('Coupon code is required.');
    }
    const cleanCode = code.trim().toUpperCase();
    const VALID_COUPONS: Record<string, { discountPercent: number; description: string }> = {
      EARLYBIRD: { discountPercent: 100, description: 'Early Bird 100% Free Delegate Pass' },
      PECFAM: { discountPercent: 100, description: 'PEC Internal 100% Waiver' },
      FREEPASS: { discountPercent: 100, description: 'Promotional 100% Full Waiver' },
      STUDENT50: { discountPercent: 50, description: 'Student Community 50% Discount' },
      SUMMIT20: { discountPercent: 20, description: 'Summit Special 20% Discount' },
    };

    const coupon = VALID_COUPONS[cleanCode];
    if (!coupon) {
      throw new NotFoundException(`Invalid or expired promo code: ${cleanCode}`);
    }

    return {
      valid: true,
      code: cleanCode,
      discountPercent: coupon.discountPercent,
      description: coupon.description,
    };
  }

  async createOrder(dto: CreateOrderDto) {
    const registration = await this.prisma.registration.findUnique({
      where: { passId: dto.passId.trim().toUpperCase() },
      include: { payment: true, user: true },
    });

    if (!registration) {
      throw new NotFoundException(`Pass with ID ${dto.passId} not found.`);
    }

    if (!registration.payment) {
      throw new BadRequestException('This registration pass does not require payment.');
    }

    if (registration.payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment for this pass has already been completed.');
    }

    return {
      orderId: registration.payment.orderId,
      amount: registration.payment.amount,
      amountInPaisa: Math.round(registration.payment.amount * 100),
      currency: registration.payment.currency,
      passId: registration.passId,
      customerName: registration.user.name,
      customerEmail: registration.user.email,
      customerPhone: registration.user.phone,
      razorpayKeyId: this.keyId,
    };
  }

  async verifyPayment(dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
      include: {
        registration: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record for order ${dto.orderId} not found.`);
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return { success: true, message: 'Payment was already verified and confirmed.', payment };
    }

    // Signature verification is unconditional — a missing secret is a misconfiguration,
    // not a reason to skip the check and mark payments as SUCCESS for free.
    if (!this.keySecret) {
      throw new BadRequestException(
        'Payment gateway is not configured. Contact the administrator.',
      );
    }
    if (!dto.signature) {
      throw new BadRequestException('Payment signature is missing from the request.');
    }

    const generatedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${dto.orderId}|${dto.transactionId}`)
      .digest('hex');

    if (generatedSignature !== dto.signature) {
      throw new BadRequestException('Invalid Razorpay cryptographic signature.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          transactionId: dto.transactionId,
          status: PaymentStatus.SUCCESS,
        },
      });

      if (payment.registration) {
        await tx.registration.update({
          where: { id: payment.registration.id },
          data: {
            amountPaid: payment.amount,
          },
        });
      }

      return updatedPayment;
    });

    this.logger.log(`Payment confirmed for Order ${dto.orderId}`);

    // Asynchronously dispatch pass email with QR badge
    if (payment.registration && payment.registration.user) {
      const reg = payment.registration;
      QRCode.toDataURL(reg.qrToken, { width: 240, margin: 2 })
        .then((qrDataUrl) => {
          return this.emailService.sendPassConfirmationEmail({
            to: reg.user.email,
            recipientName: reg.user.name,
            passId: reg.passId,
            passType: reg.passType,
            qrDataUrl,
            college: reg.user.college ?? undefined,
            amountPaid: payment.amount,
          });
        })
        .catch((err) => this.logger.error(`Paid pass email dispatch failed: ${err.message}`));
    }

    return {
      success: true,
      message: 'Payment verified and pass confirmed successfully.',
      payment: updated,
    };
  }


  async handleWebhook(rawBody: string | Buffer, signatureHeader: string | undefined, payload: any) {
    if (this.webhookSecret && signatureHeader) {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'))
        .digest('hex');

      if (expectedSignature !== signatureHeader) {
        throw new BadRequestException('Invalid Razorpay webhook signature.');
      }
    }

    const event = payload?.event;
    const orderId = payload?.payload?.payment?.entity?.order_id;
    const transactionId = payload?.payload?.payment?.entity?.id;

    if (event === 'order.paid' || event === 'payment.captured') {
      if (orderId) {
        const payment = await this.prisma.payment.findUnique({ where: { orderId } });
        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              transactionId: transactionId || payment.transactionId,
              rawWebhookLog: payload,
            },
          });
        }
      }
    } else if (event === 'payment.failed') {
      if (orderId) {
        await this.prisma.payment.updateMany({
          where: { orderId },
          data: {
            status: PaymentStatus.FAILED,
            rawWebhookLog: payload,
          },
        });
      }
    }

    return { status: 'ok', received: true };
  }
}
