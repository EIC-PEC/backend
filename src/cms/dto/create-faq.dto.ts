import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFaqDto {
  @IsString() question: string;
  @IsString() answer: string;
  @IsString() @IsOptional() category?: string;
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
