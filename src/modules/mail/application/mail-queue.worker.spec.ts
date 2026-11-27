/**
 * @file Mail queue worker spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MailQueueWorker } from './mail-queue.worker.js';

describe('MailQueueWorker', () => {
  it('registers a worker on the mail queue', () => {
    const registerWorker = vi.fn();
    const queue = { enqueue: vi.fn(), registerWorker, close: vi.fn() };
    const mail = { send: vi.fn(async () => undefined) };
    const worker = new MailQueueWorker(queue as any, mail as any);
    worker.onModuleInit();
    expect(registerWorker).toHaveBeenCalledWith('mail', expect.any(Function));
  });

  it('sends the job message when invoked', async () => {
    let handler: ((payload: unknown) => void | Promise<void>) | undefined;
    const queue = {
      enqueue: vi.fn(),
      registerWorker: vi.fn((name, h) => {
        handler = h;
      }),
      close: vi.fn(),
    };
    const mail = { send: vi.fn(async () => undefined) };
    const worker = new MailQueueWorker(queue as any, mail as any);
    worker.onModuleInit();
    await handler?.({ id: '1', message: { to: 'to@example.com', subject: 'hi' } });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'to@example.com', subject: 'hi' }),
    );
  });

  it('renders before sending when a renderer is provided', async () => {
    let handler: ((payload: unknown) => void | Promise<void>) | undefined;
    const queue = {
      enqueue: vi.fn(),
      registerWorker: vi.fn((name, h) => {
        handler = h;
      }),
      close: vi.fn(),
    };
    const mail = { send: vi.fn(async () => undefined) };
    const renderer = {
      render: vi.fn(async () => ({ subject: 'rendered', body: 'body' })),
    };
    const worker = new MailQueueWorker(queue as any, mail as any, renderer as any);
    worker.onModuleInit();
    await handler?.({
      id: '1',
      message: { to: 'to@example.com', subject: 'hi', template: 'welcome', locale: 'fr', context: { name: 'Ada' } },
    });
    expect(renderer.render).toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'rendered', text: 'body' }),
    );
  });
});