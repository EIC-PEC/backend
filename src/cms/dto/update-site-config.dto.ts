import { IsString, IsOptional, IsObject, MaxLength, IsUrl } from 'class-validator';

export class UpdateSiteConfigDto {
  @IsString() @IsOptional() @MaxLength(100) heroTitle?: string;
  @IsString() @IsOptional() @MaxLength(200) heroSubtitle?: string;
  @IsString() @IsOptional() @MaxLength(100) summitDates?: string;
  @IsString() @IsOptional() @MaxLength(200) summitVenue?: string;
  @IsString() @IsOptional() @MaxLength(500) heroVideoUrl?: string;
  @IsString() @IsOptional() @MaxLength(500) announcementText?: string;
  @IsString() @IsOptional() @MaxLength(500) announcementLink?: string;
  @IsObject() @IsOptional() stats?: Record<string, string>;
  @IsObject() @IsOptional() contacts?: Record<string, unknown>;
}
