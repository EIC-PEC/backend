import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService, UploadResult } from './storage.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Accepted image formats for media storage */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
]);

function inspectImageMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null;

  // SVG: <?xml or <svg
  const textHead = buffer.toString('utf8', 0, Math.min(buffer.length, 120)).trim().toLowerCase();
  if (textHead.startsWith('<svg') || textHead.startsWith('<?xml') || textHead.includes('<svg')) {
    return 'image/svg+xml';
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }

  // WEBP: RIFF + WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  // AVIF: ftyp with avif/avis/mif1 brand
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') {
      return 'image/avif';
    }
  }

  return null;
}


const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export class UploadBase64Dto {
  @IsOptional()
  @IsString()
  fileData?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  folder?: string;
}

@ApiTags('Storage & Media')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /** Only admins/organizers can check infrastructure status. */
  @Roles(Role.ADMIN)
  @Get('status')
  @ApiOperation({ summary: 'Get Cloudflare R2 storage integration status (Admin only)' })
  getStatus() {
    return this.storageService.getStatus();
  }

  @Roles(Role.ADMIN)
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload file to Cloudflare R2 bucket (Organizer+ only)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async uploadFile(
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: UploadBase64Dto,
  ): Promise<UploadResult> {
    if (file) {
      await this.validateMimeFromBuffer(file.buffer, file.originalname);
      return this.storageService.upload(
        file.buffer,
        file.originalname,
        file.mimetype,
        body?.folder || 'media',
      );
    }

    if (body?.fileData) {
      // Guard decoded size before allocating the full buffer.
      const base64Payload = body.fileData.replace(/^data:[^;]+;base64,/, '');
      const decodedBytes = Math.ceil((base64Payload.length * 3) / 4);
      if (decodedBytes > MAX_UPLOAD_BYTES) {
        throw new BadRequestException(
          `File exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`,
        );
      }

      const buffer = Buffer.from(base64Payload, 'base64');
      await this.validateMimeFromBuffer(buffer, body.filename || 'upload');
      return this.storageService.uploadBase64(
        body.fileData,
        body.filename || 'upload.png',
        body.folder || 'media',
      );
    }

    throw new BadRequestException('Provide either a multipart file or a base64 fileData payload.');
  }

  /** Reads actual magic bytes — client-supplied Content-Type is NOT trusted. */
  private async validateMimeFromBuffer(buffer: Buffer, filename: string): Promise<void> {
    const mime = inspectImageMagicBytes(buffer);

    if (!mime || !ALLOWED_MIME_TYPES.has(mime)) {
      throw new UnsupportedMediaTypeException(
        `File type "${mime ?? 'unknown'}" is not allowed for "${filename}". Only valid images (JPEG, PNG, WEBP, GIF, AVIF) are accepted.`,
      );
    }
  }
}


