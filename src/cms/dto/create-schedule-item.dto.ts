import { IsString, IsOptional, IsNumber, IsArray, IsIn, MaxLength, Matches, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleItemDto {
  @IsNumber() @Type(() => Number) @Min(1) @Max(10) day: number;
  @IsString() @MaxLength(50) date: string;
  @IsString() @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]( [AP]M)?$/, { message: 'Time must be in valid format (e.g. 09:30 AM)' }) time: string;
  @IsString() @MaxLength(100) title: string;
  @IsString() @MaxLength(50) tag: string;
  @IsString() @MaxLength(50) venueId: string;
  @IsString() @MaxLength(100) venueName: string;
  @IsString() @MaxLength(100) building: string;
  @IsNumber() @Type(() => Number) @Min(-90) @Max(90) lat: number;
  @IsNumber() @Type(() => Number) @Min(-180) @Max(180) lng: number;
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
