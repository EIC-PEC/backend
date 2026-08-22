import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAlumniDto {
  @IsString() name: string;
  @IsString() batch: string;
  @IsString() role: string;
  @IsString() company: string;
  @IsString() @IsOptional() valuation?: string;
  @IsString() achievement: string;
  @IsString() @IsOptional() bio?: string;
  @IsString() @IsOptional() imageUrl?: string;
  @IsString() @IsOptional() linkedin?: string;
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
