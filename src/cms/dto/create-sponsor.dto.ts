import { IsString, IsOptional, IsNumber, MaxLength, IsUrl, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSponsorDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() @IsIn(['Title Sponsor', 'Powered By', 'Associate Sponsor', 'Ecosystem Partner', 'Co-Sponsor', 'General']) tier: string;
  @IsString() @IsOptional() @MaxLength(500) logoUrl?: string;
  @IsString() @IsOptional() @MaxLength(500) websiteUrl?: string;
  @IsString() @IsOptional() @MaxLength(50) category?: string;
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
