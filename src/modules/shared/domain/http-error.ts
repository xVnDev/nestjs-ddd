/**
 * @file Domain-safe HTTP error carrying only status and a safe message.
 */

/** Domain-safe HTTP error. */
export class HttpError extends Error {
  /** HTTP status code. */
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
