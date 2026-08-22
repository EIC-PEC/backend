import { IsString, IsOptional, IsNumber, IsArray, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleItemDto {
  @IsNumber() @Type(() => Number) day: number;
  @IsString() date: string;
  @IsString() time: string;
  @IsString() title: string;
  @IsString() tag: string;
  @IsString() venueId: string;
  @IsString() venueName: string;
  @IsString() building: string;
  @IsNumber() @Type(() => Number) lat: number;
  @IsNumber() @Type(() => Number) lng: number;
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
