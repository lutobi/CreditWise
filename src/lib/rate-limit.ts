/**
 * Simple In-Memory Rate Limiter
 * 
 * ⚠️  WARNING: This uses an in-memory Map that resets on every serverless cold start.
 * On Vercel/Lambda, rate limits are PER-INSTANCE and NOT enforced across invocations.
 * For production, replace with @upstash/ratelimit + Redis for distributed rate limiting.
 * This implementation only works reliably for long-running single-server deployments.
 */

// Log warning once at startup on serverless-like environments
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.warn(
        '[SECURITY] In-memory rate limiter detected on serverless platform. ' +
        'Rate limits will NOT be reliably enforced. Migrate to @upstash/ratelimit.'
    );
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
            if (entry.resetTime < now) {
                store.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
    /** Maximum number of requests allowed in the window */
    limit: number;
    /** Time window in milliseconds */
    windowMs: number;
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    reset: number;
}

/**
 * Check if a request should be rate limited
 * @param key Unique identifier (e.g., IP address, user ID, or combination)
 * @param config Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    // No existing entry or expired window
    if (!entry || entry.resetTime < now) {
        store.set(key, {
            count: 1,
            resetTime: now + config.windowMs,
        });
        return {
            success: true,
            remaining: config.limit - 1,
            reset: now + config.windowMs,
        };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > config.limit) {
        return {
            success: false,
            remaining: 0,
            reset: entry.resetTime,
        };
    }

    return {
        success: true,
        remaining: config.limit - entry.count,
        reset: entry.resetTime,
    };
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
    return headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headers.get('x-real-ip')
        || 'unknown';
}

// Pre-configured rate limiters for common use cases
export const RATE_LIMITS = {
    /** Login: 5 attempts per 15 minutes */
    AUTH: { limit: 5, windowMs: 15 * 60 * 1000 },

    /** Password Reset: 3 attempts per hour */
    PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 },

    /** API General: 100 requests per minute */
    API_GENERAL: { limit: 100, windowMs: 60 * 1000 },

    /** Verification: 10 per hour (AWS costs) */
    VERIFICATION: { limit: 10, windowMs: 60 * 60 * 1000 },

    /** Loan Submit: 5 per day */
    LOAN_SUBMIT: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
} as const;
