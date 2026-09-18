import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFaqDto {
  @IsString() @MaxLength(500) question: string;
  @IsString() @MaxLength(2000) answer: string;
  @IsString() @IsOptional() @MaxLength(50) category?: string;
  @IsNumber() @IsOptional() @Type(() => Number) order?: number;
}
