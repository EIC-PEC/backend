import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConciergeService } from './concierge.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ConciergeService', () => {
  let service: ConciergeService;

  const mockPrismaService: any = {
    event: {
      findMany: jest.fn(),
    },
    speaker: {
      findMany: jest.fn(),
    },
    sponsor: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GEMINI_API_KEY') return undefined; // test local semantic engine
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService.event.findMany.mockResolvedValue([
      {
        id: 'ev-1',
        title: 'Keynote: Scaling AI in 2026',
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        venue: 'Main Auditorium',
        day: 1,
      },
    ]);
    mockPrismaService.speaker.findMany.mockResolvedValue([
      {
        id: 'spk-1',
        name: 'Dr. Sameer Roy',
        title: 'Managing Director, Surge Ventures',
        bio: 'Investor in 40+ AI startups.',
      },
    ]);
    mockPrismaService.sponsor.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConciergeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ConciergeService>(ConciergeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processChat', () => {
    it('should recommend passes and emit navigate action for ticket/pass queries', async () => {
      const res = await service.processChat({
        message: 'How much are the passes and tickets for students?',
      });

      expect(res).toBeDefined();
      expect(res.reply).toContain('PEC Summit 2026');
      expect(res.action).toEqual({
        type: 'navigate',
        target: '/passes',
        payload: { section: 'passes' },
      });
      expect(res.source).toBe('festival_rag');
    });

    it('should provide schedule information and emit navigate action for timing/agenda queries', async () => {
      const res = await service.processChat({
        message: 'What is the schedule for Day 1?',
      });

      expect(res).toBeDefined();
      expect(res.reply).toContain('Schedule Highlights');
      expect(res.action).toEqual({
        type: 'navigate',
        target: '/schedule',
        payload: { section: 'schedule' },
      });
    });

    it('should provide hackathon track details for hacker queries', async () => {
      const res = await service.processChat({
        message: 'Tell me about the hackathon tracks and prizes',
      });

      expect(res).toBeDefined();
      expect(res.reply).toContain('24-Hour Hackathon');
      expect(res.action).toEqual({
        type: 'navigate',
        target: '/tracks',
        payload: { section: 'tracks' },
      });
    });

    it('should provide speaker directory info for guest inquiries', async () => {
      const res = await service.processChat({
        message: 'Who is speaking at the summit?',
      });

      expect(res).toBeDefined();
      expect(res.reply).toContain('Dr. Sameer Roy');
      expect(res.action).toEqual({
        type: 'navigate',
        target: '/speakers',
        payload: { section: 'speakers' },
      });
    });
  });
});
