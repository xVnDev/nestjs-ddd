/**
 * @file Unit tests for {@link AdminUserController}.
 */

import { describe, expect, it, vi } from 'vitest';
import { AdminUserController } from './admin-user.controller.js';

describe('AdminUserController', () => {
  it('delegates create', async () => {
    const user = { id: 'u1', sub: { toString: () => 's' }, email: 'a@b.com', isActive: true, createdAt: new Date(), updatedAt: new Date() } as any;
    const createUser = { execute: vi.fn(async () => user) } as any;
    const getUser = { execute: vi.fn() } as any;
    const listUsers = { execute: vi.fn() } as any;
    const updateUser = { execute: vi.fn() } as any;
    const deleteUser = { execute: vi.fn() } as any;
    const controller = new AdminUserController(createUser, getUser, listUsers, updateUser, deleteUser);
    const dto = { email: 'a@b.com', password: 'password123' } as any;
    const res = await controller.create(dto);
    expect(createUser.execute).toHaveBeenCalledWith(dto);
    expect(res.id).toBe('u1');
  });

  it('delegates get', async () => {
    const user = { id: 'u1', sub: { toString: () => 's' }, email: 'a@b.com', isActive: true, createdAt: new Date(), updatedAt: new Date() } as any;
    const getUser = { execute: vi.fn(async () => user) } as any;
    const controller = new AdminUserController({ execute: vi.fn() } as any, getUser, { execute: vi.fn() } as any, { execute: vi.fn() } as any, { execute: vi.fn() } as any);
    const res = await controller.findOne('u1');
    expect(getUser.execute).toHaveBeenCalledWith('u1');
    expect(res.id).toBe('u1');
  });

  it('delegates list', async () => {
    const listUsers = { execute: vi.fn(async () => ({ items: [{ id: 'u1', sub: { toString: () => 's' }, email: 'a@b.com', isActive: true, createdAt: new Date(), updatedAt: new Date() }], total: 1 })) } as any;
    const controller = new AdminUserController({ execute: vi.fn() } as any, { execute: vi.fn() } as any, listUsers, { execute: vi.fn() } as any, { execute: vi.fn() } as any);
    const query = {} as any;
    const res = await controller.findAll(query);
    expect(listUsers.execute).toHaveBeenCalledWith(query);
    expect(res.total).toBe(1);
  });

  it('delegates update', async () => {
    const user = { id: 'u1', sub: { toString: () => 's' }, email: 'a@b.com', isActive: true, createdAt: new Date(), updatedAt: new Date() } as any;
    const updateUser = { execute: vi.fn(async () => user) } as any;
    const controller = new AdminUserController({ execute: vi.fn() } as any, { execute: vi.fn() } as any, { execute: vi.fn() } as any, updateUser, { execute: vi.fn() } as any);
    const dto = { email: 'x@y.com' } as any;
    const res = await controller.update('u1', dto);
    expect(updateUser.execute).toHaveBeenCalledWith('u1', dto);
    expect(res.id).toBe('u1');
  });

  it('delegates delete', async () => {
    const deleteUser = { execute: vi.fn(async () => undefined) } as any;
    const controller = new AdminUserController({ execute: vi.fn() } as any, { execute: vi.fn() } as any, { execute: vi.fn() } as any, { execute: vi.fn() } as any, deleteUser);
    await controller.remove('u1');
    expect(deleteUser.execute).toHaveBeenCalledWith('u1');
  });
});
