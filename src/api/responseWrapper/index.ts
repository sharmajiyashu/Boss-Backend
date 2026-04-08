import { Response } from "express";

export class ResponseWrapper {
  static success<T>(res: Response, data: T, message: string = 'Success', code: number = 200) {
    return res.status(code).json({
      success: true,
      data,
      message,
    });
  }

  static error(res: Response, error: string | Error, code: number = 400) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return res.status(code).json({
      success: false,
      error: errorMessage,
    });
  }
}
