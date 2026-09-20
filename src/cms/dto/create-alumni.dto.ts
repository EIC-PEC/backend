import { IsString, IsOptional, IsNumber, MaxLength, IsUrl } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateAlumniDto {
  @IsString() @MaxLength(100) name: string
  @IsString() @MaxLength(50) batch: string
  @IsString() @MaxLength(100) role: string
  @IsString() @MaxLength(100) company: string
  @IsString() @IsOptional() @MaxLength(50) valuation?: string
  @IsString() @MaxLength(200) achievement: string
  @IsString() @IsOptional() @MaxLength(1000) bio?: string
  @IsString() @IsOptional() @MaxLength(500) imageUrl?: string
  @IsString() @IsOptional() @MaxLength(500) linkedin?: string
  @IsNumber() @IsOptional() @Type(() => Number) order?: number
}
