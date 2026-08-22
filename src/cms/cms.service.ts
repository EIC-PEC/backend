import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { CreateAlumniDto } from './dto/create-alumni.dto';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { CreateScheduleItemDto } from './dto/create-schedule-item.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';

@Injectable()

export class CmsService {
  private readonly logger = new Logger(CmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── SiteConfig (single row, id = "global") ───────────────────────────────

  async getSiteConfig() {
    return this.prisma.siteConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global' },
      update: {},
    });
  }

  async updateSiteConfig(dto: UpdateSiteConfigDto) {
    // Prisma requires an explicit cast for Json fields
    const data: Prisma.SiteConfigUpdateInput = {
      ...dto,
      stats: dto.stats as Prisma.InputJsonValue,
      contacts: dto.contacts as Prisma.InputJsonValue,
    };
    return this.prisma.siteConfig.upsert({
      where: { id: 'global' },
      create: { id: 'global', ...(data as Prisma.SiteConfigCreateInput) },
      update: data,
    });
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async getEvents(day?: number, track?: string, type?: string) {
    const where: Record<string, unknown> = {};
    if (day !== undefined) where.day = day;
    if (track) where.track = track;
    if (type) where.type = type;
    return this.prisma.event.findMany({
      where,
      orderBy: [{ order: 'asc' }, { day: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException(`Event ${id} not found.`);
    return event;
  }

  async createEvent(dto: CreateEventDto) {
    return this.prisma.event.create({
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
        type: dto.type?.trim().toLowerCase() ?? 'general',
        track: dto.track?.trim(),
        day: dto.day ?? 1,
        startTime: dto.startTime?.trim() ?? '09:00',
        endTime: dto.endTime?.trim() ?? '10:00',
        venue: dto.venue?.trim() ?? '',
        speakerIds: dto.speakerIds ?? [],
        order: dto.order ?? 0,
      },
    });
  }

  async updateEvent(id: string, dto: Partial<CreateEventDto>) {
    await this.getEventById(id);
    return this.prisma.event.update({ where: { id }, data: dto });
  }

  async deleteEvent(id: string) {
    await this.getEventById(id);
    return this.prisma.event.delete({ where: { id } });
  }

  // ── Speakers ──────────────────────────────────────────────────────────────

  async getSpeakers() {
    return this.prisma.speaker.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
  }

  async getSpeakerById(id: string) {
    const speaker = await this.prisma.speaker.findUnique({ where: { id } });
    if (!speaker) throw new NotFoundException(`Speaker ${id} not found.`);
    return speaker;
  }

  async createSpeaker(dto: CreateSpeakerDto) {
    return this.prisma.speaker.create({
      data: {
        name: dto.name.trim(),
        title: dto.title.trim(),
        role: dto.role?.trim() ?? '',
        company: dto.company?.trim() ?? '',
        badge: dto.badge?.trim() ?? '',
        category: dto.category?.trim() ?? 'keynote',
        bio: dto.bio.trim(),
        track: dto.track.trim(),
        avatarUrl: dto.avatarUrl?.trim(),
        initials: dto.initials.trim().toUpperCase(),
        color: dto.color ?? '#7ED321',
        linkedin: dto.linkedin?.trim(),
        twitter: dto.twitter?.trim(),
        order: dto.order ?? 0,
      },
    });
  }

  async updateSpeaker(id: string, dto: Partial<CreateSpeakerDto>) {
    await this.getSpeakerById(id);
    return this.prisma.speaker.update({ where: { id }, data: dto });
  }

  async deleteSpeaker(id: string) {
    await this.getSpeakerById(id);
    return this.prisma.speaker.delete({ where: { id } });
  }

  // ── Schedule Items ────────────────────────────────────────────────────────

  async getScheduleItems(day?: number) {
    return this.prisma.scheduleItem.findMany({
      where: day !== undefined ? { day } : {},
      orderBy: [{ day: 'asc' }, { order: 'asc' }],
    });
  }

  async createScheduleItem(dto: CreateScheduleItemDto) {
    return this.prisma.scheduleItem.create({ data: { ...dto, order: dto.order ?? 0 } });
  }

  async updateScheduleItem(id: string, dto: Partial<CreateScheduleItemDto>) {
    return this.prisma.scheduleItem.update({ where: { id }, data: dto });
  }

  async deleteScheduleItem(id: string) {
    return this.prisma.scheduleItem.delete({ where: { id } });
  }

  // ── Sponsors ──────────────────────────────────────────────────────────────

  async getSponsors() {
    return this.prisma.sponsor.findMany({ orderBy: [{ order: 'asc' }, { tier: 'asc' }] });
  }

  async createSponsor(dto: CreateSponsorDto) {
    return this.prisma.sponsor.create({
      data: {
        name: dto.name.trim(),
        tier: dto.tier.trim(),
        logoUrl: dto.logoUrl?.trim(),
        websiteUrl: dto.websiteUrl?.trim(),
        category: dto.category?.trim() ?? '',
        order: dto.order ?? 0,
      },
    });
  }

  async updateSponsor(id: string, dto: Partial<CreateSponsorDto>) {
    return this.prisma.sponsor.update({ where: { id }, data: dto });
  }

  async deleteSponsor(id: string) {
    return this.prisma.sponsor.delete({ where: { id } });
  }

  // ── Alumni ────────────────────────────────────────────────────────────────

  async getAlumni() {
    return this.prisma.alumni.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  }

  async getAlumniById(id: string) {
    const item = await this.prisma.alumni.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Alumni ${id} not found.`);
    return item;
  }

  async createAlumni(dto: CreateAlumniDto) {
    return this.prisma.alumni.create({
      data: {
        name: dto.name.trim(),
        batch: dto.batch.trim(),
        role: dto.role.trim(),
        company: dto.company.trim(),
        valuation: dto.valuation?.trim(),
        achievement: dto.achievement.trim(),
        bio: dto.bio?.trim() ?? '',
        imageUrl: dto.imageUrl?.trim(),
        linkedin: dto.linkedin?.trim(),
        order: dto.order ?? 0,
      },
    });
  }

  async updateAlumni(id: string, dto: Partial<CreateAlumniDto>) {
    await this.getAlumniById(id);
    return this.prisma.alumni.update({ where: { id }, data: dto });
  }

  async deleteAlumni(id: string) {
    await this.getAlumniById(id);
    return this.prisma.alumni.delete({ where: { id } });
  }

  // ── FAQs ──────────────────────────────────────────────────────────────────

  async getFaqs(category?: string) {
    return this.prisma.faq.findMany({
      where: category ? { category } : {},
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createFaq(dto: CreateFaqDto) {
    return this.prisma.faq.create({
      data: {
        question: dto.question.trim(),
        answer: dto.answer.trim(),
        category: dto.category?.trim() ?? 'General',
        order: dto.order ?? 0,
      },
    });
  }

  async updateFaq(id: string, dto: Partial<CreateFaqDto>) {
    return this.prisma.faq.update({ where: { id }, data: dto });
  }

  async deleteFaq(id: string) {
    return this.prisma.faq.delete({ where: { id } });
  }

  // ── Gallery ───────────────────────────────────────────────────────────────

  async getGallery() {
    return this.prisma.galleryItem.findMany({ orderBy: [{ slot: 'asc' }, { createdAt: 'desc' }] });
  }

  async createGalleryItem(dto: CreateGalleryDto) {
    return this.prisma.galleryItem.create({
      data: {
        imageUrl: dto.imageUrl.trim(),
        title: dto.title?.trim(),
        mediaType: dto.mediaType?.toUpperCase() ?? 'IMAGE',
        slot: dto.slot ?? 0,
      },
    });
  }

  async deleteGalleryItem(id: string) {
    return this.prisma.galleryItem.delete({ where: { id } });
  }

  // ── Portfolio Event Media ─────────────────────────────────────────────────

  async getPortfolioEventMedia() {
    return this.prisma.portfolioEventItem.findMany();
  }

  async setPortfolioEventImage(eventId: string, imageUrl: string) {
    return this.prisma.portfolioEventItem.upsert({
      where: { eventId },
      update: { imageUrl: imageUrl.trim() },
      create: { eventId, imageUrl: imageUrl.trim() },
    });
  }

  async deletePortfolioEventImage(eventId: string) {
    return this.prisma.portfolioEventItem.deleteMany({ where: { eventId } });
  }

  // ── Bundle: single-payload for fast frontend bootstrap ────────────────────


  async getBundle() {
    const [siteConfig, events, speakers, scheduleItems, sponsors, alumni, faqs, gallery, portfolioMedia] =
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

    return { siteConfig, events, speakers, scheduleItems, sponsors, alumni, faqs, gallery, portfolioMedia };
  }
}
