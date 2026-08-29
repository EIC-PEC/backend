import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  serviceName?: string;
}

export class CircuitBreaker {
  private readonly logger: Logger;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly serviceName: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.serviceName = options.serviceName ?? 'ExternalService';
    this.logger = new Logger(`CircuitBreaker:${this.serviceName}`);
  }

  async execute<T>(action: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.warn(`Circuit half-opened for ${this.serviceName}. Testing upstream health.`);
      } else {
        this.logger.warn(`Circuit OPEN for ${this.serviceName}. Fast-failing / using fallback.`);
        if (fallback) return fallback();
        throw new Error(`Circuit for ${this.serviceName} is OPEN. Upstream temporarily disabled.`);
      }
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.logger.log(`Circuit closed for ${this.serviceName}. Upstream service recovered.`);
    }
  }

  private onFailure(error: unknown) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.logger.error(
      `Upstream call failed for ${this.serviceName} (${this.failureCount}/${this.failureThreshold}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    if (this.failureCount >= this.failureThreshold || this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.logger.error(`Circuit TRIPPED to OPEN for ${this.serviceName}. Fast-failing for ${this.resetTimeoutMs}ms.`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
