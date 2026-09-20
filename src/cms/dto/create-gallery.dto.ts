import { IsString, IsOptional, IsNumber, IsUrl, IsIn, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateGalleryDto {
  @IsString() @MaxLength(500) imageUrl: string
  @IsString() @IsOptional() @MaxLength(100) title?: string
  @IsString() @IsOptional() @IsIn(['IMAGE', 'VIDEO']) mediaType?: string
  @IsNumber() @IsOptional() @Type(() => Number) slot?: number
}
