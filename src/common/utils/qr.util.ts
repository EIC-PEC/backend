import * as crypto from 'crypto';

export interface QrTokenPayload {
  userId: string;
  passId: string;
  timestamp: number;
}

export function generateSignedQrToken(userId: string, passId: string, secret: string): string {
  const timestamp = Date.now();
  const rawPayload = `${userId}:${passId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
  const composite = `${rawPayload}:${signature}`;
  return Buffer.from(composite, 'utf-8').toString('base64');
}

export function verifySignedQrToken(
  token: string,
  secret: string,
): { valid: boolean; payload?: QrTokenPayload; reason?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 4) {
      return { valid: false, reason: 'Malformed token structure' };
    }

    const [userId, passId, timestampStr, signature] = parts;
    const rawPayload = `${userId}:${passId}:${timestampStr}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return { valid: false, reason: 'Invalid signature length' };
    }

    const isMatch = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    if (!isMatch) {
      return { valid: false, reason: 'Cryptographic signature mismatch (tampered token)' };
    }

    const timestamp = parseInt(timestampStr, 10);
    return {
      valid: true,
      payload: {
        userId,
        passId,
        timestamp,
      },
    };
  } catch (error) {
    return { valid: false, reason: `Token decode error: ${(error as Error).message}` };
  }
}
