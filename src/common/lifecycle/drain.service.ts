import { Injectable, OnApplicationShutdown, Optional } from '@nestjs/common';

/**
 * Collaborator notified when the application drains during shutdown.
 */
export interface DrainCollaborator {
  /**
   * Records the shutdown signal.
   *
   * @param signal - The signal that triggered the shutdown.
   */
  record(signal?: string): void;
}

/**
 * Service that participates in Nest's graceful shutdown lifecycle.
 */
@Injectable()
export class DrainService implements OnApplicationShutdown {
  constructor(@Optional() private readonly collaborator?: DrainCollaborator) {}

  /**
   * Called by Nest when the application is shutting down.
   *
   * @param signal - The signal that triggered the shutdown.
   */
  onApplicationShutdown(signal?: string): void {
    this.collaborator?.record(signal);
  }
}
