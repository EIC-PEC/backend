import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PassType, PaymentStatus, Role } from '@prisma/client';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('RegistrationsService', () => {
  let service: RegistrationsService;

  const mockEmailService = {
    sendPassConfirmationEmail: jest.fn().mockResolvedValue(true),
  };

  const mockPrismaService: any = {
    registration: {
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb(mockPrismaService)),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'QR_HMAC_SECRET') return 'test-qr-hmac-secret-123456';
      return 'default';
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPassCatalog', () => {
    it('should return catalog tiers populated with totalIssued counts', async () => {
      mockPrismaService.registration.groupBy.mockResolvedValue([
        { passType: PassType.STUDENT_GENERAL, _count: { id: 142 } },
        { passType: PassType.FOUNDER_PITCH, _count: { id: 28 } },
      ]);

      const catalog = await service.getPassCatalog();

      expect(catalog).toBeDefined();
      expect(Array.isArray(catalog)).toBe(true);
      const studentTier = catalog.find((c) => c.enumType === PassType.STUDENT_GENERAL);
      expect(studentTier?.totalIssued).toBe(142);
      const founderTier = catalog.find((c) => c.enumType === PassType.FOUNDER_PITCH);
      expect(founderTier?.totalIssued).toBe(28);
    });
  });

  describe('createRegistration', () => {
    const validDto = {
      name: 'Rohan Sharma',
      email: 'rohan@pecsummit.com',
      phone: '+91 98765 43210',
      college: 'PEC Chandigarh',
      passType: PassType.STUDENT_GENERAL,
      tracks: ['Keynote Track', 'Hackathon Arena'],
    };

    it('should create a free registration pass without creating pending payment', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-rohan',
        email: validDto.email,
        name: validDto.name,
        role: Role.USER,
      });
      mockPrismaService.registration.findFirst.mockResolvedValue(null);
      mockPrismaService.registration.findUnique.mockResolvedValue(null); // for passId uniqueness check
      mockPrismaService.registration.create.mockResolvedValue({
        id: 'reg-1',
        passId: 'PEC-123456',
        passType: PassType.STUDENT_GENERAL,
        amountPaid: 0,
        tracks: validDto.tracks,
        qrToken: 'test-qr-token',
        isCheckedIn: false,
        createdAt: new Date(),
        user: {
          id: 'user-rohan',
          name: validDto.name,
          email: validDto.email,
          college: validDto.college,
          phone: validDto.phone,
        },
        payment: null,
      });

      const res = await service.createRegistration(validDto);

      expect(res).toBeDefined();
      expect(res.isPaymentRequired).toBe(false);
      expect(res.registration.passId).toBe('PEC-123456');
      expect(mockPrismaService.payment.create).not.toHaveBeenCalled();
    });

    it('should create a paid registration pass with a pending order', async () => {
      const paidDto = {
        ...validDto,
        passType: PassType.HACKATHON_BUILDER,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-rohan',
        email: paidDto.email,
        name: paidDto.name,
      });
      mockPrismaService.registration.findFirst.mockResolvedValue(null);
      mockPrismaService.registration.findUnique.mockResolvedValue(null);
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'pay-1',
        orderId: 'order_PEC_999999_12345',
        amount: 199,
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.registration.create.mockResolvedValue({
        id: 'reg-2',
        passId: 'PEC-999999',
        passType: PassType.HACKATHON_BUILDER,
        amountPaid: 199,
        tracks: ['Hackathon Arena'],
        qrToken: 'test-qr-token-2',
        isCheckedIn: false,
        createdAt: new Date(),
        user: {
          id: 'user-rohan',
          name: paidDto.name,
          email: paidDto.email,
          college: paidDto.college,
          phone: paidDto.phone,
        },
        payment: {
          orderId: 'order_PEC_999999_12345',
          status: PaymentStatus.PENDING,
          amount: 199,
        },
      });

      const res = await service.createRegistration(paidDto);

      expect(res).toBeDefined();
      expect(res.isPaymentRequired).toBe(true);
      expect(res.registration.payment?.status).toBe(PaymentStatus.PENDING);
      expect(mockPrismaService.payment.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if attendee is already registered with this pass category', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-rohan',
        email: validDto.email,
      });
      mockPrismaService.registration.findFirst.mockResolvedValue({
        id: 'existing-reg',
        passId: 'PEC-888888',
      });

      await expect(service.createRegistration(validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on unknown pass type', async () => {
      await expect(
        service.createRegistration({ ...validDto, passType: 'INVALID_PASS' as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyPasses', () => {
    it('should return all passes belonging to the authenticated user', async () => {
      mockPrismaService.registration.findMany.mockResolvedValue([
        {
          id: 'reg-1',
          passId: 'PEC-111111',
          passType: PassType.STUDENT_GENERAL,
          amountPaid: 0,
          tracks: ['Keynote Track'],
          qrToken: 'qr-token-1',
          isCheckedIn: false,
          createdAt: new Date(),
          user: {
            id: 'user-1',
            name: 'Rohan Sharma',
            email: 'rohan@pecsummit.com',
            college: 'PEC',
            phone: null,
          },
          payment: null,
        },
      ]);

      const passes = await service.getMyPasses('user-1');

      expect(passes).toHaveLength(1);
      expect(passes[0].passId).toBe('PEC-111111');
      expect(passes[0].categoryTitle).toBeDefined();
      expect(passes[0].qrCodeDataUrl).toContain('data:image/png;base64');
    });
  });

  describe('getPassById', () => {
    it('should return pass if passId exists', async () => {
      mockPrismaService.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        passId: 'PEC-771924',
        passType: PassType.STUDENT_GENERAL,
        amountPaid: 0,
        tracks: ['All Tracks'],
        qrToken: 'qr-token',
        isCheckedIn: true,
        createdAt: new Date(),
        user: {
          id: 'user-1',
          name: 'Aarav Sharma',
          email: 'aarav@pecsummit.com',
          college: 'PEC Chandigarh',
          phone: null,
        },
        payment: null,
      });

      const pass = await service.getPassById('PEC-771924');

      expect(pass).toBeDefined();
      expect(pass.passId).toBe('PEC-771924');
      expect(pass.isCheckedIn).toBe(true);
    });

    it('should throw NotFoundException if pass does not exist', async () => {
      mockPrismaService.registration.findUnique.mockResolvedValue(null);

      await expect(service.getPassById('PEC-000000')).rejects.toThrow(NotFoundException);
    });
  });
});
