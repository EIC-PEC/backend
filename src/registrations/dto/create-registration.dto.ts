import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { PassType } from '@prisma/client'

export class CreateRegistrationDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @IsNotEmpty()
  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'Phone number format is invalid' })
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(150)
  college?: string

  @IsOptional()
  @IsString()
  @Matches(/^(19|20)\d{2}$/, { message: 'gradYear must be a 4-digit year' })
  gradYear?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string

  @IsNotEmpty()
  @IsEnum(PassType, {
    message:
      'passType must be one of: STUDENT_GENERAL, FOUNDER_PITCH, HACKATHON_BUILDER, CAMPUS_AMBASSADOR',
  })
  passType: PassType

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tracks?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(30)
  referralCode?: string
}
