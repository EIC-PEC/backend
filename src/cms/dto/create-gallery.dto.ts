import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGalleryDto {
  @IsString() imageUrl: string;
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() mediaType?: string;
  @IsNumber() @IsOptional() @Type(() => Number) slot?: number;
}
