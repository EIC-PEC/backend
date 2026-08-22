import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateSiteConfigDto {
  @IsString() @IsOptional() heroTitle?: string;
  @IsString() @IsOptional() heroSubtitle?: string;
  @IsString() @IsOptional() summitDates?: string;
  @IsString() @IsOptional() summitVenue?: string;
  @IsString() @IsOptional() heroVideoUrl?: string;
  @IsString() @IsOptional() announcementText?: string;
  @IsString() @IsOptional() announcementLink?: string;
  @IsObject() @IsOptional() stats?: Record<string, string>;
  @IsObject() @IsOptional() contacts?: Record<string, unknown>;
}
