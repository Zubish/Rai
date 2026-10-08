import { describe, expect, it } from 'vitest';
import { publicFailure } from './public-failure.mjs';

describe('safe actionable failure feedback', () => {
  it('explains an unavailable model without leaking upstream details', () => {
    const result = publicFailure({ code: 'model_unavailable', status: 503, message: 'private-token database-password' });
    expect(result.error.reason).toContain('could not be reached');
    expect(result.error.nextStep).toContain('Ollama');
    expect(JSON.stringify(result)).not.toContain('private-token');
  });
  it('distinguishes configuration, authentication, permission and rate-limit failures', () => {
    expect(publicFailure({ code: 'model_not_configured', status: 503 }).error.retryable).toBe(false);
    expect(publicFailure({ status: 401 }).error.nextStep).toContain('Connect');
    expect(publicFailure({ status: 403 }).error.reason).toContain('permissions');
    expect(publicFailure({ status: 429 }).error.nextStep).toContain('minute');
  });
  it('does not invent a precise cause for unknown errors', () => {
    const result = publicFailure({ status: 500, message: 'sensitive internal error' });
    expect(result.error.reason).toContain('could not be confirmed');
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });
});
