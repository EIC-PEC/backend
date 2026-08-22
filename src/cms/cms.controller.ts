import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CmsService } from './cms.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { CreateAlumniDto } from './dto/create-alumni.dto';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { CreateScheduleItemDto } from './dto/create-schedule-item.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';

// ── Bundle: single-payload for frontend bootstrap ──────────────────────────


@SkipThrottle()
@Controller('cms/bundle')
export class BundleController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getBundle() {
    return this.cms.getBundle();
  }
}

// ── Site Config ────────────────────────────────────────────────────────────

@SkipThrottle()
@Controller(['cms/site-config', 'cms/config'])
export class SiteConfigController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async get() {
    return this.cms.getSiteConfig();
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Put()
  async update(@Body() dto: UpdateSiteConfigDto) {
    return this.cms.updateSiteConfig(dto);
  }
}

// ── Events ─────────────────────────────────────────────────────────────────

@SkipThrottle()
@Controller('events')
export class EventsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getAll(@Query('day') day?: string, @Query('track') track?: string, @Query('type') type?: string) {
    return this.cms.getEvents(day ? parseInt(day, 10) : undefined, track, type);
  }

  @Public()
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.cms.getEventById(id);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEventDto) {
    return this.cms.createEvent(dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateEventDto>) {
    return this.cms.updateEvent(id, dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.cms.deleteEvent(id);
  }
}

// ── Speakers ───────────────────────────────────────────────────────────────

@SkipThrottle()
@Controller('speakers')
export class SpeakersController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getAll() {
    return this.cms.getSpeakers();
  }

  @Public()
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.cms.getSpeakerById(id);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSpeakerDto) {
    return this.cms.createSpeaker(dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateSpeakerDto>) {
    return this.cms.updateSpeaker(id, dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.cms.deleteSpeaker(id);
  }
}

// ── Schedule Items ─────────────────────────────────────────────────────────

@SkipThrottle()
@Controller('cms/schedule')
export class ScheduleController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getAll(@Query('day') day?: string) {
    return this.cms.getScheduleItems(day ? parseInt(day, 10) : undefined);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateScheduleItemDto) {
    return this.cms.createScheduleItem(dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateScheduleItemDto>) {
    return this.cms.updateScheduleItem(id, dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.cms.deleteScheduleItem(id);
  }
}

// ── Sponsors ───────────────────────────────────────────────────────────────

@SkipThrottle()
@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getAll() {
    return this.cms.getSponsors();
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSponsorDto) {
    return this.cms.createSponsor(dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateSponsorDto>) {
    return this.cms.updateSponsor(id, dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.cms.deleteSponsor(id);
  }
}

// ── Alumni ─────────────────────────────────────────────────────────────────

@SkipThrottle()
@Controller('alumni')
export class AlumniController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getAll() {
    return this.cms.getAlumni();
  }

  @Public()
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.cms.getAlumniById(id);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAlumniDto) {
    return this.cms.createAlumni(dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAlumniDto>) {
    return this.cms.updateAlumni(id, dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: Partial<CreateAlumniDto>) {
    return this.cms.updateAlumni(id, dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.cms.deleteAlumni(id);
  }
}

// ── FAQs ───────────────────────────────────────────────────────────────────

@SkipThrottle()
@Controller('cms/faqs')
export class FaqsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getAll(@Query('category') category?: string) {
    return this.cms.getFaqs(category);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFaqDto) {
    return this.cms.createFaq(dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateFaqDto>) {
    return this.cms.updateFaq(id, dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.cms.deleteFaq(id);
  }
}

// ── Gallery ────────────────────────────────────────────────────────────────

@SkipThrottle()
@Controller('gallery')
export class GalleryController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getAll() {
    return this.cms.getGallery();
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGalleryDto) {
    return this.cms.createGalleryItem(dto);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.cms.deleteGalleryItem(id);
  }
}

// ── Portfolio Events Media ─────────────────────────────────────────────────

@SkipThrottle()
@Controller('portfolio-events')
export class PortfolioEventsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get()
  async getAll() {
    return this.cms.getPortfolioEventMedia();
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.OK)
  async set(@Body() body: { eventId: string; imageUrl: string }) {
    return this.cms.setPortfolioEventImage(body.eventId, body.imageUrl);
  }

  @Roles(Role.ORGANIZER, Role.SUPER_ADMIN)
  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('eventId') eventId: string) {
    return this.cms.deletePortfolioEventImage(eventId);
  }
}

