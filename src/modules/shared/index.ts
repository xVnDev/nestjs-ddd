/**
 * @file Public barrel for the shared kernel.
 *
 * Re-exports only cross-context port tokens and default adapters. Context
 * domain internals must never be reachable through this barrel.
 */

export * from './ports/index.js';
