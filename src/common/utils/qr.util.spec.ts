import { generateSignedQrToken, verifySignedQrToken } from './qr.util';

describe('QrUtil', () => {
  const secret = 'super-secret-test-hmac-key-2026';
  const userId = 'user-uuid-123';
  const passId = 'PEC-894210';

  describe('generateSignedQrToken', () => {
    it('should generate a valid base64 encoded token with signature', () => {
      const token = generateSignedQrToken(userId, passId, secret);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      expect(decoded.split(':')).toHaveLength(4);
    });
  });

  describe('verifySignedQrToken', () => {
    it('should successfully verify a freshly signed token', () => {
      const token = generateSignedQrToken(userId, passId, secret);
      const result = verifySignedQrToken(token, secret);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.userId).toBe(userId);
      expect(result.payload?.passId).toBe(passId);
      expect(typeof result.payload?.timestamp).toBe('number');
    });

    it('should reject a token with an invalid signature (tampered payload)', () => {
      const token = generateSignedQrToken(userId, passId, secret);
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [u, , t, sig] = decoded.split(':');

      // Tamper with passId
      const tamperedComposite = `${u}:PEC-FORGED:${t}:${sig}`;
      const forgedToken = Buffer.from(tamperedComposite, 'utf-8').toString('base64');

      const result = verifySignedQrToken(forgedToken, secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('signature mismatch');
    });

    it('should reject a token verified with the wrong secret key', () => {
      const token = generateSignedQrToken(userId, passId, secret);
      const result = verifySignedQrToken(token, 'wrong-secret-key-xyz');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('signature mismatch');
    });

    it('should reject a malformed token without parts', () => {
      const malformed = Buffer.from('invalid-token', 'utf-8').toString('base64');
      const result = verifySignedQrToken(malformed, secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Malformed token structure');
    });
  });
});
