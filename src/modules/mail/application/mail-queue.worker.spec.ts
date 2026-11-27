/**
 * @file Mail queue worker spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MailSendStatus } from '../domain/mail-send-status.js';
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

  it('writes PROCESSING and SENT when a status store is provided', async () => {
    let handler: ((payload: unknown) => void | Promise<void>) | undefined;
    const queue = {
      enqueue: vi.fn(),
      registerWorker: vi.fn((name, h) => {
        handler = h;
      }),
      close: vi.fn(),
    };
    const mail = { send: vi.fn(async () => undefined) };
    const renderer = { render: vi.fn(async () => ({ subject: 'rendered', body: 'body' })) };
    const set = vi.fn(async () => undefined);
    const store = { set, get: vi.fn(async () => null), listByStatus: vi.fn(async () => []) };
    const worker = new MailQueueWorker(queue as any, mail as any, renderer as any, store as any);
    worker.onModuleInit();
    await handler?.({
      id: '1',
      message: { to: 'to@example.com', subject: 'hi', template: 'welcome', locale: 'fr', context: { name: 'Ada' } },
    });
    expect(set).toHaveBeenCalledWith('1', MailSendStatus.PROCESSING);
    expect(set).toHaveBeenCalledWith('1', MailSendStatus.SENT);
  });

  it('writes FAILED when a rendered send fails', async () => {
    let handler: ((payload: unknown) => void | Promise<void>) | undefined;
    const queue = {
      enqueue: vi.fn(),
      registerWorker: vi.fn((name, h) => {
        handler = h;
      }),
      close: vi.fn(),
    };
    const mail = { send: vi.fn(async () => {
      throw new Error('boom');
    }) };
    const renderer = { render: vi.fn(async () => ({ subject: 'rendered', body: 'body' })) };
    const set = vi.fn(async () => undefined);
    const store = { set, get: vi.fn(async () => null), listByStatus: vi.fn(async () => []) };
    const worker = new MailQueueWorker(queue as any, mail as any, renderer as any, store as any);
    worker.onModuleInit();
    await expect(
      handler?.({
        id: '1',
        message: { to: 'to@example.com', subject: 'hi', template: 'welcome' },
      }),
    ).rejects.toThrow('boom');
    expect(set).toHaveBeenCalledWith('1', MailSendStatus.FAILED);
  });

  it('writes SENT without a renderer', async () => {
    let handler: ((payload: unknown) => void | Promise<void>) | undefined;
    const queue = {
      enqueue: vi.fn(),
      registerWorker: vi.fn((name, h) => {
        handler = h;
      }),
      close: vi.fn(),
    };
    const mail = { send: vi.fn(async () => undefined) };
    const set = vi.fn(async () => undefined);
    const store = { set, get: vi.fn(async () => null), listByStatus: vi.fn(async () => []) };
    const worker = new MailQueueWorker(queue as any, mail as any, store as any);
    worker.onModuleInit();
    await handler?.({ id: '2', message: { to: 'to@example.com', subject: 'hi' } });
    expect(set).toHaveBeenCalledWith('2', MailSendStatus.PROCESSING);
    expect(set).toHaveBeenCalledWith('2', MailSendStatus.SENT);
  });

  it('writes FAILED without a renderer', async () => {
    let handler: ((payload: unknown) => void | Promise<void>) | undefined;
    const queue = {
      enqueue: vi.fn(),
      registerWorker: vi.fn((name, h) => {
        handler = h;
      }),
      close: vi.fn(),
    };
    const mail = { send: vi.fn(async () => {
      throw new Error('boom');
    }) };
    const set = vi.fn(async () => undefined);
    const store = { set, get: vi.fn(async () => null), listByStatus: vi.fn(async () => []) };
    const worker = new MailQueueWorker(queue as any, mail as any, store as any);
    worker.onModuleInit();
    await expect(handler?.({ id: '3', message: { to: 'to@example.com', subject: 'hi' } })).rejects.toThrow('boom');
    expect(set).toHaveBeenCalledWith('3', MailSendStatus.FAILED);
  });

  it('supports a tracker-like status store wrapper', () => {
    const queue = { enqueue: vi.fn(), registerWorker: vi.fn(), close: vi.fn() };
    const mail = { send: vi.fn(async () => undefined) };
    const renderer = { render: vi.fn(async () => ({ subject: 'rendered', body: 'body' })) };
    const set = vi.fn(async () => undefined);
    const store = { set, get: vi.fn(async () => null), listByStatus: vi.fn(async () => []) };
    const tracker = { store };
    const worker = new MailQueueWorker(queue as any, mail as any, renderer as any, tracker as any);
    expect((worker as any).statusStore).toBeDefined();
  });

  it('ignores an invalid status store wrapper', () => {
    const queue = { enqueue: vi.fn(), registerWorker: vi.fn(), close: vi.fn() };
    const mail = { send: vi.fn(async () => undefined) };
    const renderer = { render: vi.fn(async () => ({ subject: 'rendered', body: 'body' })) };
    const worker = new MailQueueWorker(queue as any, mail as any, renderer as any, { store: 'invalid' } as any);
    expect(worker).toBeDefined();
  });

  it('propagates rendered send errors without a status store', async () => {
    let handler: ((payload: unknown) => void | Promise<void>) | undefined;
    const queue = {
      enqueue: vi.fn(),
      registerWorker: vi.fn((name, h) => {
        handler = h;
      }),
      close: vi.fn(),
    };
    const mail = { send: vi.fn(async () => {
      throw new Error('boom');
    }) };
    const renderer = { render: vi.fn(async () => ({ subject: 'rendered', body: 'body' })) };
    const worker = new MailQueueWorker(queue as any, mail as any, renderer as any);
    worker.onModuleInit();
    await expect(
      handler?.({ id: '4', message: { to: 'to@example.com', subject: 'hi', template: 'welcome' } }),
    ).rejects.toThrow('boom');
  });

  it('propagates plain send errors without a status store', async () => {
    let handler: ((payload: unknown) => void | Promise<void>) | undefined;
    const queue = {
      enqueue: vi.fn(),
      registerWorker: vi.fn((name, h) => {
        handler = h;
      }),
      close: vi.fn(),
    };
    const mail = { send: vi.fn(async () => {
      throw new Error('boom');
    }) };
    const worker = new MailQueueWorker(queue as any, mail as any);
    worker.onModuleInit();
    await expect(handler?.({ id: '5', message: { to: 'to@example.com', subject: 'hi' } })).rejects.toThrow('boom');
  });
});