/**
 * API Validation Utilities
 * 
 * Provides standardized request validation for API routes using Zod.
 */

import { NextResponse } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import { logger } from './safe-logger';

export type ValidationResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
    details?: z.ZodIssue[];
};

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
    request: Request,
    schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            logger.warn('Request validation failed', {
                issues: result.error.issues.map(i => ({ path: i.path, message: i.message })),
            });

            return {
                success: false,
                error: result.error.issues[0]?.message || 'Validation failed',
                details: result.error.issues,
            };
        }

        return { success: true, data: result.data };
    } catch (error) {
        logger.error('Failed to parse request body', { error: String(error) });
        return { success: false, error: 'Invalid JSON body' };
    }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
    url: URL | string,
    schema: ZodSchema<T>
): ValidationResult<T> {
    const searchParams = typeof url === 'string' ? new URL(url).searchParams : url.searchParams;
    const params: Record<string, string> = {};

    searchParams.forEach((value, key) => {
        params[key] = value;
    });

    const result = schema.safeParse(params);

    if (!result.success) {
        return {
            success: false,
            error: result.error.issues[0]?.message || 'Invalid query parameters',
            details: result.error.issues,
        };
    }

    return { success: true, data: result.data };
}

/**
 * Create a validated API handler wrapper
 */
export function withValidation<T>(
    schema: ZodSchema<T>,
    handler: (data: T, request: Request) => Promise<Response>
) {
    return async (request: Request): Promise<Response> => {
        const validation = await validateBody(request, schema);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: validation.error,
                    details: validation.details
                },
                { status: 400 }
            );
        }

        return handler(validation.data, request);
    };
}

/**
 * Common validation schemas for reuse
 */
export const CommonSchemas = {
    /** UUID v4 */
    uuid: z.string().uuid('Invalid ID format'),

    /** Positive integer */
    positiveInt: z.coerce.number().int().positive(),

    /** Email address */
    email: z.string().email('Invalid email address'),

    /** Namibian phone number */
    namibianPhone: z.string().regex(
        /^(\+?264|0)\s?\d{2}\s?\d{3}\s?\d{4}$/,
        'Invalid Namibian phone number'
    ),

    /** National ID (11-13 digits) */
    nationalId: z.string().regex(/^\d{11,13}$/, 'Invalid National ID'),

    /** Non-empty string */
    nonEmpty: z.string().min(1, 'This field is required'),

    /** Pagination */
    pagination: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
};

/**
 * Utility to create error response
 */
export function validationError(message: string, details?: any): Response {
    return NextResponse.json(
        { success: false, error: message, details },
        { status: 400 }
    );
}

/**
 * Utility to create success response
 */
export function successResponse<T>(data: T, status = 200): Response {
    return NextResponse.json({ success: true, data }, { status });
}
