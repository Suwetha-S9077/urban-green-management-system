import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * Single place where every error becomes an HTTP response.
 * Response shape: { success: false, error: { code, message, details? } }
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong on the server.';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = err.flatten().fieldErrors;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Data validation failed.';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid value for "${err.path}".`;
  }

  if (statusCode >= 500) {
    console.error(err);
    if (env.NODE_ENV === 'production') details = undefined;
  }

  res.status(statusCode).json({ success: false, error: { code, message, details } });
};
