import { Test, TestingModule } from '@nestjs/testing';
import { PassType, PaymentStatus, Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrismaService: any = {
    registration: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    checkIn: {
      count: jest.fn(),
    },
    team: {
      count: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
    },
    user: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAnalytics', () => {
    it('should return aggregated platform metrics', async () => {
      mockPrismaService.registration.count.mockResolvedValue(250);
      mockPrismaService.checkIn.count.mockResolvedValue(120);
      mockPrismaService.team.count.mockResolvedValue(45);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 150000 },
        _count: { id: 200 },
      });
      mockPrismaService.registration.groupBy.mockResolvedValue([
        { passType: PassType.STUDENT_GENERAL, _count: { id: 180 } },
      ]);
      mockPrismaService.user.groupBy.mockResolvedValue([
        { college: 'Punjab Engineering College', _count: { id: 95 } },
      ]);
      mockPrismaService.registration.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics();

      expect(result).toBeDefined();
      expect(result.overview.totalDelegates).toBe(250);
      expect(result.overview.totalCheckIns).toBe(120);
      expect(result.overview.totalRevenue).toBe(150000);
      expect(result.passTypeDistribution[0].passType).toBe(PassType.STUDENT_GENERAL);
      expect(result.collegeBreakdown[0].college).toBe('Punjab Engineering College');
    });
  });

  describe('getDelegates', () => {
    it('should paginate and return delegates', async () => {
      mockPrismaService.registration.count.mockResolvedValue(1);
      mockPrismaService.registration.findMany.mockResolvedValue([
        {
          id: 'reg-1',
          passId: 'PEC-894210',
          passType: PassType.STUDENT_GENERAL,
          amountPaid: 499,
          isCheckedIn: false,
          tracks: ['AI & ML'],
          createdAt: new Date(),
          user: {
            id: 'u-1',
            name: 'Rohan Sharma',
            email: 'rohan@pec.edu',
            phone: '9876543210',
            college: 'PEC',
            role: Role.USER,
          },
          payment: {
            orderId: 'order_1',
            transactionId: 'txn_1',
            status: PaymentStatus.SUCCESS,
          },
        },
      ]);

      const result = await service.getDelegates(1, 10, 'Rohan');

      expect(result.page).toBe(1);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].user.name).toBe('Rohan Sharma');
    });
  });

  describe('getCaLeaderboard', () => {
    it('should calculate referral counts and assign ambassador tiers', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'ca-1',
          name: 'Aman Verma',
          email: 'ca@pecsummit.com',
          college: 'IIT Ropar',
          referralCode: 'PECAMAN',
          referrals: [
            { id: 'u-10', registrations: [{ id: 'r-1' }] },
            { id: 'u-11', registrations: [{ id: 'r-2' }] },
          ],
        },
      ]);

      const leaderboard = await service.getCaLeaderboard();

      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].totalReferrals).toBe(2);
      expect(leaderboard[0].confirmedSignups).toBe(2);
      expect(leaderboard[0].tier).toBe('BRONZE_AMBASSADOR');
    });
  });

  describe('toggleCheckInOverride', () => {
    it('should invert the isCheckedIn boolean', async () => {
      mockPrismaService.registration.findUnique.mockResolvedValue({
        id: 'reg-1',
        isCheckedIn: false,
      });
      mockPrismaService.registration.update.mockResolvedValue({
        id: 'reg-1',
        isCheckedIn: true,
      });

      const updated = await service.toggleCheckInOverride('reg-1');

      expect(updated.isCheckedIn).toBe(true);
      expect(mockPrismaService.registration.update).toHaveBeenCalledWith({
        where: { id: 'reg-1' },
        data: { isCheckedIn: true },
      });
    });

    it('should throw NotFoundException on non-existent registration ID', async () => {
      mockPrismaService.registration.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleCheckInOverride('invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
