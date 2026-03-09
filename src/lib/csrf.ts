/**
 * CSRF Protection Utility
 * 
 * Provides CSRF token generation and validation for API routes.
 * Uses signed tokens with HMAC-SHA256 for verification.
 */

import { cookies } from 'next/headers';
import { createHmac, randomBytes } from 'crypto';

function getCSRFSecret(): string {
    const secret = process.env.CSRF_SECRET;
    if (!secret) {
        // Prevent Vercel static build from crashing when collecting page data if env var isn't loaded yet
        if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview' && process.env.VERCEL_ENV !== 'development') {
            console.warn('WARNING: CSRF_SECRET environment variable is missing.');
        }
        return 'fallback-build-secret-do-not-use-in-prod';
    }
    return secret;
}
const CSRF_SECRET: string = getCSRFSecret();
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CSRFToken {
    value: string;
    timestamp: number;
}

/**
 * Generate a signed CSRF token
 */
function generateToken(): string {
    const timestamp = Date.now();
    const randomPart = randomBytes(16).toString('hex');
    const payload = `${timestamp}:${randomPart}`;
    const signature = createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
    return `${payload}:${signature}`;
}

/**
 * Validate a CSRF token
 */
function validateToken(token: string): boolean {
    if (!token) return false;

    const parts = token.split(':');
    if (parts.length !== 3) return false;

    const [timestamp, randomPart, signature] = parts;
    const payload = `${timestamp}:${randomPart}`;

    // Verify signature
    const expectedSignature = createHmac('sha256', CSRF_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) return false;

    // Check expiry
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Date.now() - tokenTime > TOKEN_EXPIRY_MS) {
        return false;
    }

    return true;
}

/**
 * Get or create CSRF token from cookies (for server components)
 */
export async function getCSRFToken(): Promise<string> {
    const cookieStore = await cookies();
    let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!token || !validateToken(token)) {
        token = generateToken();
        // Note: Setting cookies in server components requires special handling
        // This is primarily for reading existing tokens
    }

    return token;
}

/**
 * Validate CSRF token from request headers
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    // Both must be present and match
    if (!headerToken || !cookieToken) {
        return false;
    }

    // Validate the token format and signature
    if (!validateToken(headerToken)) {
        return false;
    }

    // Tokens must match (double-submit pattern)
    return headerToken === cookieToken;
}

/**
 * CSRF validation result with error message
 */
export interface CSRFValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate CSRF and return detailed result
 */
export async function validateCSRF(request: Request): Promise<CSRFValidationResult> {
    const headerToken = request.headers.get(CSRF_HEADER_NAME);

    if (!headerToken) {
        return { valid: false, error: 'Missing CSRF token' };
    }

    if (!validateToken(headerToken)) {
        return { valid: false, error: 'Invalid or expired CSRF token' };
    }

    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!cookieToken || headerToken !== cookieToken) {
        return { valid: false, error: 'CSRF token mismatch' };
    }

    return { valid: true };
}

/**
 * Middleware helper to enforce CSRF on state-changing requests
 */
export function requireCSRF(handler: (req: Request) => Promise<Response>) {
    return async (req: Request): Promise<Response> => {
        // Only validate for state-changing methods
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            const validation = await validateCSRF(req);
            if (!validation.valid) {
                return new Response(
                    JSON.stringify({ error: validation.error }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } }
                );
            }
        }
        return handler(req);
    };
}
