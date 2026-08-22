import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { nanoid } from 'nanoid';

export interface UploadResult {
  url: string;
  key: string;
  storage: 'cloudinary' | 'fallback_base64';
  mimeType: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly isCloudinaryConfigured: boolean = false;
  private readonly cloudName: string | null = null;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL');

    if ((cloudName && apiKey && apiSecret) || cloudinaryUrl) {
      if (cloudinaryUrl) {
        cloudinary.config({
          cloudinary_url: cloudinaryUrl,
        });
      } else {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });
      }
      this.cloudName = cloudName || 'configured';
      this.isCloudinaryConfigured = true;
      this.logger.log(`Cloudinary storage initialized for cloud: "${this.cloudName}"`);
    } else {
      this.logger.warn(
        'Cloudinary credentials not set. Storage will gracefully fall back to direct Data URIs in development.',
      );
    }
  }

  /**
   * Uploads a file buffer directly to Cloudinary using upload_stream.
   * If Cloudinary is not configured, generates a base64 Data URI fallback.
   */
  async upload(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string = 'image/jpeg',
    folder: string = 'esummit',
  ): Promise<UploadResult> {
    const cleanName = originalFilename.split('.')[0] || 'upload';
    const publicId = `${folder}/${cleanName}-${nanoid(8)}`;

    if (this.isCloudinaryConfigured) {
      try {
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder,
              public_id: `${cleanName}-${nanoid(8)}`,
              resource_type: 'auto',
            },
            (error, response) => {
              if (error || !response) {
                return reject(error || new Error('Cloudinary upload returned no response'));
              }
              resolve(response);
            },
          );

          uploadStream.end(buffer);
        });

        this.logger.log(`Uploaded to Cloudinary: ${result.secure_url} (${result.bytes} bytes)`);

        return {
          url: result.secure_url,
          key: result.public_id,
          storage: 'cloudinary',
          mimeType: result.format ? `image/${result.format}` : mimeType,
          size: result.bytes,
        };
      } catch (err: any) {
        this.logger.error(`Cloudinary upload error: ${err.message}`, err.stack);
        throw err;
      }
    }

    // Graceful fallback for local development without credentials
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    return {
      url: dataUri,
      key: publicId,
      storage: 'fallback_base64',
      mimeType,
      size: buffer.length,
    };
  }

  /**
   * Parse base64 string and upload directly to Cloudinary.
   */
  async uploadBase64(
    base64Data: string,
    filename: string = 'image.png',
    folder: string = 'esummit',
  ): Promise<UploadResult> {
    let mimeType = 'image/png';
    let rawBase64 = base64Data;

    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      rawBase64 = match[2];
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    return this.upload(buffer, filename, mimeType, folder);
  }

  /**
   * Deletes an asset from Cloudinary using its public_id.
   */
  async delete(publicId: string): Promise<boolean> {
    if (!this.isCloudinaryConfigured) {
      return true;
    }

    try {
      const res = await cloudinary.uploader.destroy(publicId);
      return res.result === 'ok';
    } catch (err: any) {
      this.logger.warn(`Failed to delete asset "${publicId}" from Cloudinary: ${err.message}`);
      return false;
    }
  }

  getStatus() {
    return {
      provider: 'Cloudinary',
      isConfigured: this.isCloudinaryConfigured,
      cloudName: this.cloudName,
    };
  }
}
