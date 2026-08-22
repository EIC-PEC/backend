import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSpeakerDto {
  @IsString() name: string;
  @IsString() title: string;
  @IsString() @IsOptional() role?: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() badge?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() bio: string;
  @IsString() track: string;
  @IsString() @IsOptional() avatarUrl?: string;
  @IsString() initials: string;
  @IsString() @IsOptional() color?: string;
  @IsString() @IsOptional() linkedin?: string;
  @IsString() @IsOptional() twitter?: string;
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
