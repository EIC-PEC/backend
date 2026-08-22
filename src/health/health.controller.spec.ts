import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: PrismaService;

  const mockPrismaService = {
    $runCommandRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return status ok when database is up', async () => {
    mockPrismaService.$runCommandRaw.mockResolvedValue({ ok: 1 });

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(typeof result.timestamp).toBe('string');
  });

  it('should return status degraded when database is down', async () => {
    mockPrismaService.$runCommandRaw.mockRejectedValue(new Error('DB Connection lost'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
  });

  it('should return detailed metrics for detailedCheck', async () => {
    mockPrismaService.$runCommandRaw.mockResolvedValue({ ok: 1 });


    const result = await controller.detailedCheck();

    expect(result.status).toBe('ok');
    expect(result.dependencies.database).toBe('up');
    expect(typeof result.uptimeSeconds).toBe('number');
  });
});

