import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrismaService: any = {
    registration: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb(mockPrismaService)),
  };

  const keySecret = 'test-razorpay-key-secret-123456';
  const webhookSecret = 'test-webhook-secret-987654';

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_pec_2026';
      if (key === 'RAZORPAY_KEY_SECRET') return keySecret;
      if (key === 'RAZORPAY_WEBHOOK_SECRET') return webhookSecret;
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create order checkout configuration for pending registration', async () => {
      mockPrismaService.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        passId: 'PEC-894210',
        user: {
          name: 'Priya Sharma',
          email: 'priya@pecsummit.com',
          phone: '+91 99999 88888',
        },
        payment: {
          id: 'pay-1',
          orderId: 'order_PEC_894210_123',
          amount: 499,
          currency: 'INR',
          status: PaymentStatus.PENDING,
        },
      });

      const res = await service.createOrder({ passId: 'PEC-894210' });

      expect(res).toBeDefined();
      expect(res.orderId).toBe('order_PEC_894210_123');
      expect(res.amount).toBe(499);
      expect(res.amountInPaisa).toBe(49900);
      expect(res.razorpayKeyId).toBe('rzp_test_pec_2026');
    });

    it('should throw NotFoundException if pass does not exist', async () => {
      mockPrismaService.registration.findUnique.mockResolvedValue(null);

      await expect(service.createOrder({ passId: 'PEC-000000' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if pass is free and requires no payment', async () => {
      mockPrismaService.registration.findUnique.mockResolvedValue({
        id: 'reg-free',
        passId: 'PEC-111111',
        user: { name: 'Free User', email: 'free@pec.com' },
        payment: null,
      });

      await expect(service.createOrder({ passId: 'PEC-111111' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if payment is already completed', async () => {
      mockPrismaService.registration.findUnique.mockResolvedValue({
        id: 'reg-paid',
        passId: 'PEC-222222',
        user: { name: 'Paid User', email: 'paid@pec.com' },
        payment: {
          status: PaymentStatus.SUCCESS,
        },
      });

      await expect(service.createOrder({ passId: 'PEC-222222' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyPayment', () => {
    const orderId = 'order_PEC_894210_123';
    const transactionId = 'pay_test_transaction_999';

    it('should verify payment with valid HMAC signature and transition status to SUCCESS', async () => {
      const validSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${transactionId}`)
        .digest('hex');

      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId,
        amount: 499,
        status: PaymentStatus.PENDING,
        registration: { id: 'reg-1' },
      });

      mockPrismaService.payment.update.mockResolvedValue({
        id: 'pay-1',
        orderId,
        transactionId,
        status: PaymentStatus.SUCCESS,
        amount: 499,
      });

      const res = await service.verifyPayment({
        orderId,
        transactionId,
        signature: validSignature,
      });

      expect(res.success).toBe(true);
      expect(res.payment.status).toBe(PaymentStatus.SUCCESS);
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({ status: PaymentStatus.SUCCESS }),
        }),
      );
    });

    it('should throw BadRequestException on invalid signature', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId,
        amount: 499,
        status: PaymentStatus.PENDING,
        registration: { id: 'reg-1' },
      });

      await expect(
        service.verifyPayment({
          orderId,
          transactionId,
          signature: 'invalid-tampered-signature-12345',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook', () => {
    it('should handle order.paid webhook and mark payment SUCCESS', async () => {
      const payload = {
        event: 'order.paid',
        payload: {
          payment: {
            entity: {
              order_id: 'order_test_123',
              id: 'pay_test_999',
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: 'order_test_123',
        status: PaymentStatus.PENDING,
      });

      const res = await service.handleWebhook(rawBody, signature, payload);

      expect(res.status).toBe('ok');
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({ status: PaymentStatus.SUCCESS }),
        }),
      );
    });
  });
});
