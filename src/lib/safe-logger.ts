/**
 * PII-Safe Logger
 * 
 * Provides structured logging that automatically redacts sensitive information.
 * Use this instead of console.log for any logs that might contain user data.
 */

// Patterns to detect and redact
const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
    // Email addresses
    { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
    // Namibian National IDs (11-13 digits)
    { name: 'national_id', pattern: /\b\d{11,13}\b/g, replacement: '[ID_REDACTED]' },
    // Phone numbers (various formats)
    { name: 'phone', pattern: /(\+?264|0)\s?\d{2}\s?\d{3}\s?\d{4}/g, replacement: '[PHONE_REDACTED]' },
    // Bank account numbers (8+ digits)
    { name: 'bank_account', pattern: /\b\d{8,16}\b/g, replacement: '[ACCOUNT_REDACTED]' },
    // Credit card numbers (16 digits with optional spaces/dashes)
    { name: 'credit_card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CARD_REDACTED]' },
    // IP addresses
    { name: 'ip_address', pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP_REDACTED]' },
    // JWT tokens
    { name: 'jwt', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replacement: '[TOKEN_REDACTED]' },
    // Authorization headers
    { name: 'auth_header', pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi, replacement: 'Bearer [TOKEN_REDACTED]' },
];

// Fields to always redact in objects
const REDACTED_FIELDS = new Set([
    'password',
    'confirmPassword',
    'secret',
    'apiKey',
    'api_key',
    'token',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'authorization',
    'ssn',
    'nationalId',
    'national_id',
    'bankAccount',
    'bank_account',
    'accountNumber',
    'account_number',
    'creditCard',
    'credit_card',
    'cvv',
    'pin',
]);

/**
 * Redact PII from a string
 */
function redactString(value: string): string {
    let result = value;
    for (const { pattern, replacement } of PII_PATTERNS) {
        result = result.replace(pattern, replacement);
    }
    return result;
}

/**
 * Recursively redact PII from an object
 */
function redactObject(obj: any, depth = 0): any {
    if (depth > 10) return '[MAX_DEPTH]'; // Prevent infinite recursion

    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return redactString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => redactObject(item, depth + 1));
    }

    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (REDACTED_FIELDS.has(key.toLowerCase())) {
                result[key] = '[REDACTED]';
            } else if (typeof value === 'string') {
                result[key] = redactString(value);
            } else if (typeof value === 'object') {
                result[key] = redactObject(value, depth + 1);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    return obj;
}

/**
 * Hash a user ID for logging (one-way, consistent)
 */
function hashUserId(userId: string): string {
    // Simple hash for logging purposes - not cryptographic
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `user_${Math.abs(hash).toString(36)}`;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: any;
    userId?: string;
    requestId?: string;
}

/**
 * Safe Logger class
 */
class SafeLogger {
    private formatEntry(level: LogLevel, message: string, context?: any, userId?: string): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: context ? redactObject(context) : undefined,
            userId: userId ? hashUserId(userId) : undefined,
        };
    }

    private log(level: LogLevel, message: string, context?: any, userId?: string): void {
        const entry = this.formatEntry(level, message, context, userId);
        const output = JSON.stringify(entry);

        switch (level) {
            case 'debug':
                if (process.env.NODE_ENV === 'development') {
                    console.debug(output);
                }
                break;
            case 'info':
                console.info(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            case 'error':
                console.error(output);
                break;
        }
    }

    debug(message: string, context?: any, userId?: string): void {
        this.log('debug', message, context, userId);
    }

    info(message: string, context?: any, userId?: string): void {
        this.log('info', message, context, userId);
    }

    warn(message: string, context?: any, userId?: string): void {
        this.log('warn', message, context, userId);
    }

    error(message: string, context?: any, userId?: string): void {
        this.log('error', message, context, userId);
    }

    /**
     * Log an API request (with automatic PII redaction)
     */
    request(method: string, path: string, status: number, durationMs: number, userId?: string): void {
        this.info('API Request', {
            method,
            path: redactString(path),
            status,
            durationMs,
        }, userId);
    }

    /**
     * Log an error with stack trace (redacted)
     */
    exception(message: string, error: Error, context?: any, userId?: string): void {
        this.error(message, {
            ...context,
            errorName: error.name,
            errorMessage: redactString(error.message),
            stack: error.stack ? redactString(error.stack).split('\n').slice(0, 5).join('\n') : undefined,
        }, userId);
    }
}

// Singleton export
export const logger = new SafeLogger();

// Helper for quick redaction
export { redactString, redactObject, hashUserId };
