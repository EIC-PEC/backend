import { IsString, IsOptional, IsNumber, IsArray, MaxLength, IsUrl, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { IsAfter } from '../../common/validators/is-after.validator';

export class CreateEventDto {
  @IsString() @MaxLength(10) number: string;
  @IsString() @MaxLength(100) title: string;
  @IsString() @MaxLength(50) category: string;
  @IsString() @IsOptional() @MaxLength(50) eyebrow?: string;
  @IsString() @IsOptional() @MaxLength(500) image?: string;
  @IsString() @IsOptional() @MaxLength(1000) purpose?: string;
  @IsString() @IsOptional() @MaxLength(1000) delivery?: string;
  @IsString() @IsOptional() @MaxLength(200) expectedParticipation?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsString() @IsOptional() @MaxLength(100) partner?: string;
  @IsString() @IsOptional() @MaxLength(500) registrationUrl?: string;
  // Schedule fields
  @IsString() @IsOptional() @IsIn(['keynote', 'panel', 'competition', 'hackathon', 'general']) type?: string;
  @IsString() @IsOptional() @MaxLength(50) track?: string;
  @IsNumber() @IsOptional() @Type(() => Number) day?: number;
  @IsString() @IsOptional() @MaxLength(10) startTime?: string;
  @IsString() @IsOptional() @MaxLength(10) @IsAfter('startTime') endTime?: string;
  @IsString() @IsOptional() @MaxLength(200) venue?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() speakerIds?: string[];
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
