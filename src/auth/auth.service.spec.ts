import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb(mockPrismaService)),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const configMap: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-jwt-access-secret-1234567890',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-1234567890',
        JWT_REFRESH_TTL: '7d',
      };
      return configMap[key] || 'default-secret';
    }),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mocked-jwt-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@pecsummit.com',
      password: 'StrongPassword@2026',
      name: 'Test Delegate',
      phone: '+91 98765 43210',
      college: 'Punjab Engineering College',
    };

    it('should successfully register a new user and return tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id-1',
        email: registerDto.email,
        name: registerDto.name,
        phone: registerDto.phone,
        college: registerDto.college,
        role: Role.DELEGATE,
        referralCode: 'PEC999999',
        createdAt: new Date(),
      });

      const result = await service.register(registerDto, { ipAddress: '127.0.0.1' });

      expect(result).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
      expect(result.tokens.accessToken).toBe('mocked-jwt-token');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register(registerDto, { ipAddress: '127.0.0.1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'delegate@pecsummit.com',
      password: 'PecSummit@2026',
    };

    it('should authenticate user with valid credentials and issue tokens', async () => {
      const passwordHash = await argon2.hash(loginDto.password);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id-2',
        email: loginDto.email,
        name: 'Delegate User',
        role: Role.DELEGATE,
        passwordHash,
      });

      const result = await service.login(loginDto, { ipAddress: '127.0.0.1' });

      expect(result).toBeDefined();
      expect(result.user.email).toBe(loginDto.email);
      expect(result.tokens.accessToken).toBe('mocked-jwt-token');
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login(loginDto, { ipAddress: '127.0.0.1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      const wrongHash = await argon2.hash('DifferentPassword');
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id-3',
        email: loginDto.email,
        name: 'Delegate User',
        role: Role.DELEGATE,
        passwordHash: wrongHash,
      });

      await expect(
        service.login(loginDto, { ipAddress: '127.0.0.1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('should return the user profile with registration passes', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id-1',
        email: 'delegate@pecsummit.com',
        name: 'Delegate User',
        role: Role.DELEGATE,
        registrations: [
          {
            passId: 'PEC-894210',
            passType: 'STUDENT_GENERAL',
            amountPaid: 499,
            isCheckedIn: false,
          },
        ],
      });

      const result = await service.me('user-id-1');

      expect(result).toBeDefined();
      expect(result.user.id).toBe('user-id-1');
      expect(result.passes).toHaveLength(1);
      expect(result.passes[0].passId).toBe('PEC-894210');
    });

    it('should throw UnauthorizedException if account was deleted', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.me('non-existent-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
