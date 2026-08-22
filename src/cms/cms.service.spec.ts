import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CmsService } from './cms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CmsService', () => {
  let service: CmsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    speaker: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sponsor: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    alumni: {

      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    galleryItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CmsService>(CmsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Events CMS', () => {
    it('should query events with filters', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([
        { id: 'ev-1', title: 'Opening Ceremony', day: 1, type: 'ceremony' },
      ]);

      const events = await service.getEvents(1);

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Opening Ceremony');
      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: { day: 1 },
        orderBy: [{ order: 'asc' }, { day: 'asc' }, { startTime: 'asc' }],
      });
    });

    it('should create an event', async () => {
      const dto = {
        number: '01',
        title: 'Keynote: Future of AI',
        category: 'Keynotes',
        type: 'keynote',
        track: 'AI & ML',
        day: 1,
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        venue: 'Main Auditorium',
      };
      mockPrismaService.event.create.mockResolvedValue({ id: 'ev-2', ...dto });

      const created = await service.createEvent(dto);

      expect(created.id).toBe('ev-2');
      expect(mockPrismaService.event.create).toHaveBeenCalled();
    });
  });

  describe('Speakers CMS', () => {
    it('should list all speakers', async () => {
      mockPrismaService.speaker.findMany.mockResolvedValue([
        { id: 'sp-1', name: 'Priya Nair', title: 'Partner at Surge' },
      ]);

      const speakers = await service.getSpeakers();

      expect(speakers).toHaveLength(1);
      expect(speakers[0].name).toBe('Priya Nair');
    });

    it('should create a speaker profile', async () => {
      const dto = {
        name: 'Arjun Mehta',
        title: 'CTO, Kira.ai',
        bio: 'Pioneering multimodal AI systems.',
        track: 'AI & ML',
        initials: 'AM',
      };
      mockPrismaService.speaker.create.mockResolvedValue({ id: 'sp-2', ...dto });

      const speaker = await service.createSpeaker(dto);

      expect(speaker.id).toBe('sp-2');
      expect(speaker.name).toBe('Arjun Mehta');
    });
  });

  describe('Sponsors CMS', () => {
    it('should list sponsors ordered by tier', async () => {
      mockPrismaService.sponsor.findMany.mockResolvedValue([
        { id: 'spon-1', name: 'NorthStar Ventures', tier: 'title' },
      ]);

      const sponsors = await service.getSponsors();

      expect(sponsors).toHaveLength(1);
      expect(sponsors[0].name).toBe('NorthStar Ventures');
    });
  });

  describe('Alumni CMS', () => {

    it('should list alumni members', async () => {
      mockPrismaService.alumni.findMany.mockResolvedValue([
        { id: 'alm-1', name: 'Ananya Sharma', batch: "PEC '17", role: 'CEO', company: 'Lumina AI' },
      ]);

      const alumni = await service.getAlumni();

      expect(alumni).toHaveLength(1);
      expect(alumni[0].name).toBe('Ananya Sharma');
    });

    it('should create an alumni profile', async () => {
      const dto = {
        name: 'Rohan Verma',
        batch: "PEC '15",
        role: 'VP Engineering',
        company: 'Stripe',
        achievement: 'Architected Core Infra',
        bio: 'Scaled Stripe infrastructure to over $500B.',
      };
      mockPrismaService.alumni.create.mockResolvedValue({ id: 'alm-2', ...dto });

      const created = await service.createAlumni(dto);

      expect(created.id).toBe('alm-2');
      expect(mockPrismaService.alumni.create).toHaveBeenCalled();
    });
  });

  describe('Gallery CMS', () => {
    it('should list gallery items', async () => {
      mockPrismaService.galleryItem.findMany.mockResolvedValue([
        { id: 'gal-1', imageUrl: 'https://example.com/photo.jpg', slot: 1 },
      ]);

      const gallery = await service.getGallery();

      expect(gallery).toHaveLength(1);
      expect(gallery[0].slot).toBe(1);
    });
  });
});
