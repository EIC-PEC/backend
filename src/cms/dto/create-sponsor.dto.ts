import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSponsorDto {
  @IsString() name: string;
  @IsString() tier: string;
  @IsString() @IsOptional() logoUrl?: string;
  @IsString() @IsOptional() websiteUrl?: string;
  @IsString() @IsOptional() category?: string;
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
