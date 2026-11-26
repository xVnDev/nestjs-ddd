/**
 * @file Domain error hierarchy with stable codes and HTTP status hints.
 */

export abstract class DomainError extends Error {
  public readonly code: string;

  public readonly httpStatus: number;

  protected constructor(code: string, httpStatus: number, message: string) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationDomainError extends DomainError {
  public constructor(message = '') {
    super('VALIDATION_ERROR', 400, message);
  }
}

export class UnauthorizedDomainError extends DomainError {
  public constructor(message = '') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class NotFoundDomainError extends DomainError {
  public constructor(message = '') {
    super('NOT_FOUND', 404, message);
  }
}

export class ConflictDomainError extends DomainError {
  public constructor(message = '') {
    super('CONFLICT', 409, message);
  }
}
