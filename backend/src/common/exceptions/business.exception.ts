import { HttpException, HttpStatus } from '@nestjs/common';

export interface BusinessErrorPayload {
  code: number;
  message: string;
  data: unknown;
}

export class BusinessException extends HttpException {
  constructor(message: string, code: number, httpStatus: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ code, message, data: null } satisfies BusinessErrorPayload, httpStatus);
  }
}