import { IsString, IsOptional, IsNumber, Min, IsArray, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString() number: string;
  @IsString() title: string;
  @IsString() category: string;
  @IsString() @IsOptional() eyebrow?: string;
  @IsString() @IsOptional() image?: string;
  @IsString() @IsOptional() purpose?: string;
  @IsString() @IsOptional() delivery?: string;
  @IsString() @IsOptional() expectedParticipation?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsString() @IsOptional() partner?: string;
  @IsString() @IsOptional() registrationUrl?: string;
  // Schedule fields
  @IsString() @IsOptional() type?: string;
  @IsString() @IsOptional() track?: string;
  @IsNumber() @IsOptional() @Type(() => Number) day?: number;
  @IsString() @IsOptional() startTime?: string;
  @IsString() @IsOptional() endTime?: string;
  @IsString() @IsOptional() venue?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() speakerIds?: string[];
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
