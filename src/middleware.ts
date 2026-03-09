import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const CSRF_SECRET = process.env.CSRF_SECRET || 'fallback-build-secret-do-not-use-in-prod';
const CSRF_COOKIE_NAME = 'csrf_token';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Web Crypto helpers (Edge Runtime compatible)
function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSign(secret: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return toHex(sig);
}

async function generateCSRFToken(): Promise<string> {
    const timestamp = Date.now();
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomPart = toHex(randomBytes.buffer);
    const payload = `${timestamp}:${randomPart}`;
    const signature = await hmacSign(CSRF_SECRET, payload);
    return `${payload}:${signature}`;
}

async function isTokenValid(token: string): Promise<boolean> {
    if (!token || !CSRF_SECRET) return false;
    const parts = token.split(':');
    if (parts.length !== 3) return false;
    const [timestamp, randomPart, signature] = parts;
    const payload = `${timestamp}:${randomPart}`;
    const expectedSig = await hmacSign(CSRF_SECRET, payload);
    if (signature !== expectedSig) return false;
    const tokenTime = parseInt(timestamp, 10);
    return !isNaN(tokenTime) && Date.now() - tokenTime < TOKEN_EXPIRY_MS;
}

export async function middleware(request: NextRequest) {
    const response = await updateSession(request)

    // Ensure every response has a valid CSRF cookie (double-submit pattern)
    const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    if (!existingToken || !(await isTokenValid(existingToken))) {
        const newToken = await generateCSRFToken();
        response.cookies.set(CSRF_COOKIE_NAME, newToken, {
            httpOnly: false,       // Client JS must read this to send as header
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60,       // 1 hour
        });
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
