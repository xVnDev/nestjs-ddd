import { describe, expect, it, vi } from 'vitest';
import { DrainService } from './drain.service.js';

describe('DrainService', () => {
  it('notifies the collaborator on shutdown', () => {
    const collaborator = { record: vi.fn() };
    const service = new DrainService(collaborator);

    service.onApplicationShutdown('SIGTERM');

    expect(collaborator.record).toHaveBeenCalledOnce();
    expect(collaborator.record).toHaveBeenCalledWith('SIGTERM');
  });

  it('does not throw without a collaborator', () => {
    const service = new DrainService();
    expect(() => service.onApplicationShutdown('SIGTERM')).not.toThrow();
  });
});
