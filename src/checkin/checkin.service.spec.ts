import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateSignedQrToken } from '../common/utils/qr.util';

describe('CheckinService', () => {
  let service: CheckinService;
  const qrSecret = 'test-qr-hmac-secret-key-pec-2026';

  const mockPrismaService: any = {
    registration: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    checkIn: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (promises: any[]) => Promise.all(promises)),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'QR_HMAC_SECRET') return qrSecret;
      return 'default-secret';
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckinService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CheckinService>(CheckinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyQrCheckIn', () => {
    it('should successfully check in a valid delegate pass', async () => {
      const validToken = generateSignedQrToken('user-1', 'PEC-894210', qrSecret);

      mockPrismaService.registration.findFirst.mockResolvedValue({
        id: 'reg-1',
        userId: 'user-1',
        passId: 'PEC-894210',
        passType: 'STUDENT_GENERAL',
        isCheckedIn: false,
        user: { name: 'Aarav Sharma', email: 'aarav@pec.edu', college: 'PEC' },
      });

      mockPrismaService.checkIn.create.mockResolvedValue({
        id: 'checkin-1',
        userId: 'user-1',
        gateName: 'MAIN_GATE',
        timestamp: new Date(),
      });
      mockPrismaService.registration.update.mockResolvedValue({
        id: 'reg-1',
        isCheckedIn: true,
      });

      const result = await service.verifyQrCheckIn(
        { qrToken: validToken, gateName: 'MAIN_GATE' },
        'volunteer-1',
      );

      expect(result.status).toBe('VERIFIED');
      expect(result.passId).toBe('PEC-894210');
      expect(result.delegateName).toBe('Aarav Sharma');
      expect(mockPrismaService.checkIn.create).toHaveBeenCalled();
    });

    it('should reject a forged or tampered QR token', async () => {
      await expect(
        service.verifyQrCheckIn(
          { qrToken: 'invalid.forged-token', gateName: 'MAIN_GATE' },
          'volunteer-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if the pass was already checked in', async () => {
      const validToken = generateSignedQrToken('user-1', 'PEC-894210', qrSecret);

      mockPrismaService.registration.findFirst.mockResolvedValue({
        id: 'reg-1',
        userId: 'user-1',
        passId: 'PEC-894210',
        passType: 'STUDENT_GENERAL',
        isCheckedIn: true,
        user: { name: 'Aarav Sharma', email: 'aarav@pec.edu', college: 'PEC' },
      });

      mockPrismaService.checkIn.findFirst.mockResolvedValue({
        id: 'old-checkin',
        gateName: 'MAIN_GATE_01',
        timestamp: new Date(),
        scannedBy: { name: 'Volunteer #1', email: 'vol@pec.edu' },
      });

      await expect(
        service.verifyQrCheckIn(
          { qrToken: validToken, gateName: 'MAIN_GATE' },
          'volunteer-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('manualLookup', () => {
    it('should find attendees by passId query', async () => {
      mockPrismaService.registration.findMany.mockResolvedValue([
        {
          id: 'reg-1',
          passId: 'PEC-894210',
          passType: 'STUDENT_GENERAL',
          isCheckedIn: false,
          user: {
            name: 'Aarav Sharma',
            email: 'aarav@pec.edu',
            college: 'PEC',
            phone: '9876543210',
          },
          createdAt: new Date(),
        },
      ]);

      const result: any = await service.manualLookup({ query: 'PEC-894210' });

      expect(result.count).toBe(1);
      expect(result.results?.[0]?.passId).toBe('PEC-894210');
      expect(result.results?.[0]?.delegateName).toBe('Aarav Sharma');
    });

    it('should throw NotFoundException if no attendees match', async () => {
      mockPrismaService.registration.findMany.mockResolvedValue([]);

      await expect(
        service.manualLookup({ query: 'NONEXISTENT' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCheckInStats', () => {
    it('should aggregate check-in statistics', async () => {
      mockPrismaService.checkIn.count.mockResolvedValue(150);
      mockPrismaService.checkIn.groupBy.mockResolvedValue([
        { gateName: 'MAIN_GATE', _count: { id: 100 } },
        { gateName: 'AUDITORIUM', _count: { id: 50 } },
      ]);
      mockPrismaService.checkIn.findMany.mockResolvedValue([]);

      const stats = await service.getCheckInStats();

      expect(stats.totalCheckIns).toBe(150);
      expect(stats.byGate).toHaveLength(2);
      expect(stats.byGate[0].gate).toBe('MAIN_GATE');
      expect(stats.byGate[0].count).toBe(100);
    });
  });
});
