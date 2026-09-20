import { IsString, IsOptional, IsNumber, MaxLength, IsUrl, IsHexColor, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateSpeakerDto {
  @IsString() @MaxLength(100) name: string
  @IsString() @MaxLength(100) title: string
  @IsString() @IsOptional() @MaxLength(100) role?: string
  @IsString() @IsOptional() @MaxLength(100) company?: string
  @IsString() @IsOptional() @MaxLength(50) badge?: string
  @IsString()
  @IsOptional()
  @IsIn(['keynote', 'panelist', 'investor', 'mentor', 'general'])
  category?: string
  @IsString() @MaxLength(2000) bio: string
  @IsString() @MaxLength(50) track: string
  @IsString() @IsOptional() @MaxLength(500) avatarUrl?: string
  @IsString() @MaxLength(5) initials: string
  @IsHexColor() @IsOptional() color?: string
  @IsString() @IsOptional() @MaxLength(500) linkedin?: string
  @IsString() @IsOptional() @MaxLength(500) twitter?: string
  @IsNumber() @IsOptional() @Type(() => Number) order?: number
}
