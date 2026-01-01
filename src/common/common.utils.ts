import { HttpException, HttpStatus } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';

type HttpExceptionLike = {
  getStatus(): number;
  message: string;
};

export class CommonUtils {
  static formatError(error: unknown): HttpException {
    if (error instanceof HttpException) return error;

    if (error instanceof MongooseError.ValidationError) {
      const messages = Object.values(error.errors).map((err) => err.message);
      const message = messages.join(', ');
      return new HttpException(message, HttpStatus.BAD_REQUEST);
    }

    if (error instanceof MongooseError.CastError) {
      const message = `Invalid value for field '${error.path}': ${error.value}`;
      return new HttpException(message, HttpStatus.BAD_REQUEST);
    }

    if (error instanceof Error)
      return new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);

    const message = typeof error === 'string' ? error : 'Unexpected error occurred';
    return new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    
  }

  // --- Type guard for HttpException ---
  private static isHttpException(
    error: unknown,
  ): error is HttpExceptionLike {
    if (typeof error !== 'object' || error === null) return false;
    const maybe = error as Partial<HttpExceptionLike>;
    return (
      typeof maybe.getStatus === 'function' &&
      typeof maybe.message === 'string'
    );
  }

  // --- Type guard for standard Error ---
  private static isError(error: unknown): error is Error {
    return error instanceof Error && typeof error.message === 'string';
  }

  public static getDateRange(range: string) {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case 'thisMonth':
        start.setDate(1);
        break;

      case 'lastMonth':
        start.setMonth(start.getMonth() - 1, 1);
        end.setDate(0);
        break;

      case 'last2Months':
        start.setMonth(start.getMonth() - 2);
        break;

      case 'last3Months':
        start.setMonth(start.getMonth() - 3);
        break;

      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;

      case 'halfYearly':
        start.setMonth(start.getMonth() - 6);
        break;

      case 'lastYear':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return { start, end };
  }
}
