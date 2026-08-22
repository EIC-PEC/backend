import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatMessageDto {
  @IsNotEmpty()
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @IsNotEmpty()
  @IsString()
  content: string;
}

export class ChatQueryDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: ChatMessageDto[];
}
