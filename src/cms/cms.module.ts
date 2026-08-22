import { Module } from '@nestjs/common';
import {
  AlumniController,
  BundleController,
  EventsController,
  FaqsController,
  GalleryController,
  PortfolioEventsController,
  ScheduleController,
  SiteConfigController,
  SpeakersController,
  SponsorsController,
} from './cms.controller';
import { CmsService } from './cms.service';

@Module({
  controllers: [
    BundleController,
    SiteConfigController,
    EventsController,
    SpeakersController,
    ScheduleController,
    SponsorsController,
    AlumniController,
    FaqsController,
    GalleryController,
    PortfolioEventsController,
  ],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}

