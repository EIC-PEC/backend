import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache/cache.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { CreateAlumniDto } from './dto/create-alumni.dto';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { CreateScheduleItemDto } from './dto/create-schedule-item.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';

const CMS_CACHE_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private invalidateCmsCache() {
    this.cacheService.invalidatePrefix('cms:');
  }

  // ── SiteConfig (single row, id = "global") ───────────────────────────────

  async getSiteConfig() {
    return this.cacheService.getOrSet('cms:config', CMS_CACHE_TTL_SECONDS, async () => {
      return this.prisma.siteConfig.upsert({
        where: { id: 'global' },
        create: { id: 'global' },
        update: {},
      });
    });
  }

  async updateSiteConfig(dto: UpdateSiteConfigDto) {
    const data: Prisma.SiteConfigUpdateInput = {
      ...dto,
      stats: dto.stats as Prisma.InputJsonValue,
      contacts: dto.contacts as Prisma.InputJsonValue,
    };
    const res = await this.prisma.siteConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', ...(data as Prisma.SiteConfigCreateInput) },
      update: data,
    });
    this.invalidateCmsCache();
    return res;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async getEvents(day?: number, track?: string, type?: string) {
    const cacheKey = `cms:events:${day ?? 'all'}:${track ?? 'all'}:${type ?? 'all'}`;
    return this.cacheService.getOrSet(cacheKey, CMS_CACHE_TTL_SECONDS, async () => {
      const where: Record<string, unknown> = {};
      if (day !== undefined) where.day = day;
      if (track) where.track = track;
      if (type) where.type = type;
      return this.prisma.event.findMany({
        where,
        orderBy: [{ order: 'asc' }, { day: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException(`Event ${id} not found.`);
    return event;
  }

  async createEvent(dto: CreateEventDto) {
    const res = await this.prisma.event.create({
      data: {
        number: dto.number,
        title: dto.title.trim(),
        category: dto.category ?? 'General',
        eyebrow: dto.eyebrow?.trim() ?? '',
        image: dto.image?.trim() ?? '',
        purpose: dto.purpose?.trim() ?? '',
        delivery: dto.delivery?.trim() ?? '',
        expectedParticipation: dto.expectedParticipation?.trim() ?? '',
        tags: dto.tags ?? [],
        partner: dto.partner?.trim(),
        registrationUrl: dto.registrationUrl?.trim(),
        type: dto.type ?? 'general',
        track: dto.track?.trim(),
        day: dto.day ?? 1,
        startTime: dto.startTime ?? '09:00',
        endTime: dto.endTime ?? '10:00',
        venue: dto.venue?.trim() ?? '',
        speakerIds: dto.speakerIds ?? [],
        order: dto.order ?? 0,
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async updateEvent(id: string, dto: Partial<CreateEventDto>) {
    await this.getEventById(id);
    const res = await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.number !== undefined && { number: dto.number }),
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.category && { category: dto.category }),
        ...(dto.eyebrow !== undefined && { eyebrow: dto.eyebrow.trim() }),
        ...(dto.image !== undefined && { image: dto.image.trim() }),
        ...(dto.purpose !== undefined && { purpose: dto.purpose.trim() }),
        ...(dto.delivery !== undefined && { delivery: dto.delivery.trim() }),
        ...(dto.expectedParticipation !== undefined && {
          expectedParticipation: dto.expectedParticipation.trim(),
        }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.partner !== undefined && { partner: dto.partner?.trim() || null }),
        ...(dto.registrationUrl !== undefined && {
          registrationUrl: dto.registrationUrl?.trim() || null,
        }),
        ...(dto.type && { type: dto.type }),
        ...(dto.track !== undefined && { track: dto.track?.trim() || null }),
        ...(dto.day !== undefined && { day: dto.day }),
        ...(dto.startTime && { startTime: dto.startTime }),
        ...(dto.endTime && { endTime: dto.endTime }),
        ...(dto.venue !== undefined && { venue: dto.venue.trim() }),
        ...(dto.speakerIds && { speakerIds: dto.speakerIds }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async deleteEvent(id: string) {
    await this.getEventById(id);
    const res = await this.prisma.event.delete({ where: { id } });
    this.invalidateCmsCache();
    return res;
  }

  // ── Speakers ──────────────────────────────────────────────────────────────

  async getSpeakers(category?: string) {
    const cacheKey = `cms:speakers:${category ?? 'all'}`;
    return this.cacheService.getOrSet(cacheKey, CMS_CACHE_TTL_SECONDS, async () => {
      const where = category ? { category } : {};
      return this.prisma.speaker.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }

  async getSpeakerById(id: string) {
    const speaker = await this.prisma.speaker.findUnique({ where: { id } });
    if (!speaker) throw new NotFoundException(`Speaker ${id} not found.`);
    return speaker;
  }

  async createSpeaker(dto: CreateSpeakerDto) {
    const res = await this.prisma.speaker.create({
      data: {
        name: dto.name.trim(),
        title: dto.title.trim(),
        role: dto.role?.trim() || '',
        company: dto.company?.trim() || '',
        badge: dto.badge?.trim() || '',
        category: dto.category?.trim() || 'Keynote',
        bio: dto.bio.trim(),
        track: dto.track.trim(),
        avatarUrl: dto.avatarUrl?.trim() || null,
        initials: dto.initials.trim(),
        color: dto.color?.trim() || '#7ED321',
        linkedin: dto.linkedin?.trim() || null,
        twitter: dto.twitter?.trim() || null,
        order: dto.order ?? 0,
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async updateSpeaker(id: string, dto: Partial<CreateSpeakerDto>) {
    await this.getSpeakerById(id);
    const res = await this.prisma.speaker.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.role !== undefined && { role: dto.role.trim() }),
        ...(dto.company !== undefined && { company: dto.company?.trim() || '' }),
        ...(dto.badge !== undefined && { badge: dto.badge?.trim() || '' }),
        ...(dto.category !== undefined && { category: dto.category?.trim() || '' }),
        ...(dto.bio && { bio: dto.bio.trim() }),
        ...(dto.track && { track: dto.track.trim() }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl?.trim() || null }),
        ...(dto.initials && { initials: dto.initials.trim() }),
        ...(dto.color !== undefined && { color: dto.color?.trim() || '#7ED321' }),
        ...(dto.linkedin !== undefined && { linkedin: dto.linkedin?.trim() || null }),
        ...(dto.twitter !== undefined && { twitter: dto.twitter?.trim() || null }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async deleteSpeaker(id: string) {
    await this.getSpeakerById(id);
    const res = await this.prisma.speaker.delete({ where: { id } });
    this.invalidateCmsCache();
    return res;
  }

  // ── Sponsors ──────────────────────────────────────────────────────────────

  async getSponsors(tier?: string) {
    const cacheKey = `cms:sponsors:${tier ?? 'all'}`;
    return this.cacheService.getOrSet(cacheKey, CMS_CACHE_TTL_SECONDS, async () => {
      const where = tier ? { tier } : {};
      return this.prisma.sponsor.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }

  async createSponsor(dto: CreateSponsorDto) {
    const res = await this.prisma.sponsor.create({
      data: {
        name: dto.name.trim(),
        tier: dto.tier,
        logoUrl: dto.logoUrl?.trim() || null,
        websiteUrl: dto.websiteUrl?.trim() || null,
        category: dto.category?.trim() || '',
        order: dto.order ?? 0,
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async updateSponsor(id: string, dto: Partial<CreateSponsorDto>) {
    const res = await this.prisma.sponsor.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.tier && { tier: dto.tier }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl?.trim() || null }),
        ...(dto.websiteUrl !== undefined && {
          websiteUrl: dto.websiteUrl?.trim() || null,
        }),
        ...(dto.category !== undefined && { category: dto.category?.trim() || '' }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async deleteSponsor(id: string) {
    const res = await this.prisma.sponsor.delete({ where: { id } });
    this.invalidateCmsCache();
    return res;
  }

  // ── Alumni ────────────────────────────────────────────────────────────────

  async getAlumni() {
    return this.cacheService.getOrSet('cms:alumni', CMS_CACHE_TTL_SECONDS, async () => {
      return this.prisma.alumni.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }

  async getAlumniById(id: string) {
    const item = await this.prisma.alumni.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Alumni ${id} not found.`);
    return item;
  }

  async createAlumni(dto: CreateAlumniDto) {
    const res = await this.prisma.alumni.create({
      data: {
        name: dto.name.trim(),
        batch: dto.batch.trim(),
        role: dto.role.trim(),
        company: dto.company.trim(),
        valuation: dto.valuation?.trim() || null,
        achievement: dto.achievement.trim(),
        bio: dto.bio?.trim() || '',
        imageUrl: dto.imageUrl?.trim() || null,
        linkedin: dto.linkedin?.trim() || null,
        order: dto.order ?? 0,
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async updateAlumni(id: string, dto: Partial<CreateAlumniDto>) {
    await this.getAlumniById(id);
    const res = await this.prisma.alumni.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.batch && { batch: dto.batch.trim() }),
        ...(dto.role && { role: dto.role.trim() }),
        ...(dto.company && { company: dto.company.trim() }),
        ...(dto.valuation !== undefined && { valuation: dto.valuation?.trim() || null }),
        ...(dto.achievement && { achievement: dto.achievement.trim() }),
        ...(dto.bio !== undefined && { bio: dto.bio.trim() }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl?.trim() || null }),
        ...(dto.linkedin !== undefined && { linkedin: dto.linkedin?.trim() || null }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async deleteAlumni(id: string) {
    await this.getAlumniById(id);
    const res = await this.prisma.alumni.delete({ where: { id } });
    this.invalidateCmsCache();
    return res;
  }

  // ── FAQs ──────────────────────────────────────────────────────────────────

  async getFaqs(category?: string) {
    const cacheKey = `cms:faqs:${category ?? 'all'}`;
    return this.cacheService.getOrSet(cacheKey, CMS_CACHE_TTL_SECONDS, async () => {
      const where = category ? { category } : {};
      return this.prisma.faq.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }

  async createFaq(dto: CreateFaqDto) {
    const res = await this.prisma.faq.create({
      data: {
        question: dto.question.trim(),
        answer: dto.answer.trim(),
        category: dto.category ?? 'General',
        order: dto.order ?? 0,
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async updateFaq(id: string, dto: Partial<CreateFaqDto>) {
    const res = await this.prisma.faq.update({
      where: { id },
      data: {
        ...(dto.question && { question: dto.question.trim() }),
        ...(dto.answer && { answer: dto.answer.trim() }),
        ...(dto.category && { category: dto.category }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async deleteFaq(id: string) {
    const res = await this.prisma.faq.delete({ where: { id } });
    this.invalidateCmsCache();
    return res;
  }

  // ── Schedule Items ────────────────────────────────────────────────────────

  async getScheduleItems(day?: number) {
    const cacheKey = `cms:schedule:${day ?? 'all'}`;
    return this.cacheService.getOrSet(cacheKey, CMS_CACHE_TTL_SECONDS, async () => {
      const where = day !== undefined ? { day } : {};
      return this.prisma.scheduleItem.findMany({
        where,
        orderBy: [{ day: 'asc' }, { order: 'asc' }, { time: 'asc' }],
      });
    });
  }

  async createScheduleItem(dto: CreateScheduleItemDto) {
    const res = await this.prisma.scheduleItem.create({
      data: {
        day: dto.day,
        date: dto.date.trim(),
        time: dto.time.trim(),
        title: dto.title.trim(),
        tag: dto.tag?.trim() ?? '',
        venueId: dto.venueId?.trim() ?? 'main_stage',
        venueName: dto.venueName?.trim() ?? '',
        building: dto.building?.trim() ?? '',
        lat: dto.lat ?? 30.7672,
        lng: dto.lng ?? 76.7874,
        order: dto.order ?? 0,
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async updateScheduleItem(id: string, dto: Partial<CreateScheduleItemDto>) {
    const res = await this.prisma.scheduleItem.update({
      where: { id },
      data: {
        ...(dto.day !== undefined && { day: dto.day }),
        ...(dto.date && { date: dto.date.trim() }),
        ...(dto.time && { time: dto.time.trim() }),
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.tag !== undefined && { tag: dto.tag.trim() }),
        ...(dto.venueId !== undefined && { venueId: dto.venueId.trim() }),
        ...(dto.venueName !== undefined && { venueName: dto.venueName.trim() }),
        ...(dto.building !== undefined && { building: dto.building.trim() }),
        ...(dto.lat !== undefined && { lat: dto.lat }),
        ...(dto.lng !== undefined && { lng: dto.lng }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async deleteScheduleItem(id: string) {
    const res = await this.prisma.scheduleItem.delete({ where: { id } });
    this.invalidateCmsCache();
    return res;
  }

  // ── Gallery Items ─────────────────────────────────────────────────────────

  async getGallery() {
    return this.cacheService.getOrSet('cms:gallery', CMS_CACHE_TTL_SECONDS, async () => {
      return this.prisma.galleryItem.findMany({
        orderBy: [{ slot: 'asc' }, { createdAt: 'desc' }],
      });
    });
  }

  async createGalleryItem(dto: CreateGalleryDto) {
    const res = await this.prisma.galleryItem.create({
      data: {
        imageUrl: dto.imageUrl.trim(),
        title: dto.title?.trim() || null,
        mediaType: dto.mediaType || 'IMAGE',
        slot: dto.slot ?? 0,
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async updateGalleryItem(id: string, dto: Partial<CreateGalleryDto>) {
    const res = await this.prisma.galleryItem.update({
      where: { id },
      data: {
        ...(dto.imageUrl && { imageUrl: dto.imageUrl.trim() }),
        ...(dto.title !== undefined && { title: dto.title?.trim() || null }),
        ...(dto.mediaType && { mediaType: dto.mediaType }),
        ...(dto.slot !== undefined && { slot: dto.slot }),
      },
    });
    this.invalidateCmsCache();
    return res;
  }

  async deleteGalleryItem(id: string) {
    const res = await this.prisma.galleryItem.delete({ where: { id } });
    this.invalidateCmsCache();
    return res;
  }

  // ── Portfolio Event Media ─────────────────────────────────────────────────

  async getPortfolioEventMedia() {
    return this.cacheService.getOrSet('cms:portfolio_media', CMS_CACHE_TTL_SECONDS, async () => {
      return this.prisma.portfolioEventItem.findMany();
    });
  }

  async setPortfolioEventImage(eventId: string, imageUrl: string) {
    const res = await this.prisma.portfolioEventItem.upsert({
      where: { eventId },
      update: { imageUrl: imageUrl.trim() },
      create: { eventId, imageUrl: imageUrl.trim() },
    });
    this.invalidateCmsCache();
    return res;
  }

  async deletePortfolioEventImage(eventId: string) {
    const res = await this.prisma.portfolioEventItem.deleteMany({ where: { eventId } });
    this.invalidateCmsCache();
    return res;
  }

  // ── Bundle: single-payload for fast frontend bootstrap ────────────────────

  async getBundle() {
    return this.cacheService.getOrSet('cms:bundle', CMS_CACHE_TTL_SECONDS, async () => {
      const [siteConfig, rawEvents, speakers, scheduleItems, sponsors, alumni, faqs, gallery, portfolioMedia] =
        await Promise.all([
          this.getSiteConfig(),
          this.getEvents(),
          this.getSpeakers(),
          this.getScheduleItems(),
          this.getSponsors(),
          this.getAlumni(),
          this.getFaqs(),
          this.getGallery(),
          this.getPortfolioEventMedia(),
        ]);

      const events = rawEvents.map((evt: any, idx: number) => {
        const numStr = evt.number || `0${idx + 1}`.slice(-2);
        const matched = portfolioMedia.find(
          (p: any) =>
            p.eventId === evt.id ||
            p.eventId === numStr ||
            (p.eventId === 'corporate-workshops' && (numStr === '01' || evt.title.includes('Workshop'))) ||
            (p.eventId === 'internship-job-fair' && (numStr === '02' || evt.title.includes('Internship') || evt.title.includes('Career'))) ||
            (p.eventId === 'rd-conclave' && (numStr === '03' || evt.title.includes('R&D'))) ||
            (p.eventId === 'ipl-auction' && (numStr === '04' || evt.title.includes('IPL'))) ||
            (p.eventId === 'ignite' && (numStr === '05' || evt.title.includes('Ignite'))) ||
            (p.eventId === 'treasure-hunt' && (numStr === '06' || evt.title.includes('Treasure'))) ||
            (p.eventId === 'baazar' && (numStr === '07' || evt.title.includes('Baazar'))) ||
            (p.eventId === 'bizquiz-saasc' && (numStr === '08' || evt.title.includes('BizQuiz'))) ||
            (p.eventId === 'additional-quiz-saasc' && (numStr === '09' || evt.title.includes('Knowledge Quiz'))) ||
            (p.eventId === 'campus-ambassador' && (numStr === '10' || evt.title.includes('Ambassador'))) ||
            (p.eventId === 'expert-speakers' && (numStr === '11' || evt.title.includes('Speaker'))) ||
            (p.eventId === 'funding-conclave' && (numStr === '12' || evt.title.includes('Funding'))) ||
            (p.eventId === 'case-competition' && (numStr === '13' || evt.title.includes('Case')))
        );
        return matched?.imageUrl ? { ...evt, image: matched.imageUrl } : evt;
      });

      return { siteConfig, events, speakers, scheduleItems, sponsors, alumni, faqs, gallery, portfolioMedia };
    });
  }
}
