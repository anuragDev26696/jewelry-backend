import { Error as MongooseError } from 'mongoose';

function hasCodeProperty(error: unknown): error is { code: number } {
  if (typeof error !== 'object' || error === null) return false;
  const maybeError = error as Record<string, unknown>;
  return typeof maybeError.code === 'number';
}

export function parseMongooseError(error: unknown): { message: string; code?: number } {
  if (error instanceof MongooseError.ValidationError) {
    const messages = Object.values(error.errors).map((err) => err.message);
    return {
      message: messages.join(', '),
    };
  }

  if (error instanceof MongooseError.CastError) {
    return {
      message: `Invalid value for field '${error.path}': ${error.value}`,
    };
  }

  if (error instanceof Error) {
    const message = error.message;
    return hasCodeProperty(error)
      ? { message, code: error.code }
      : { message };
  }

  return {
    message: 'An unexpected error occurred',
  };
}
