import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for Server-Side Use
// Note: In a production app with 'cookie' auth, use @supabase/ssr
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
    // 1. Security: Extract Auth Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Missing Authorization Header' }, { status: 401 });
    }

    // 2. Security: Validate User Session
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid Session' }, { status: 401 });
    }

    const body = await request.json();
    const { income, employmentType } = body;

    // Deterministic Scoring Formula
    let score = 300; // Base Score

    // 1. Income Factors
    const monthlyIncome = parseFloat(income || '0');
    if (monthlyIncome > 15000) {
        score += 200;
    } else if (monthlyIncome > 5000) {
        score += 100;
    }

    // 2. Employment Type Factors
    const type = employmentType || '';
    if (type.toLowerCase().includes('government')) {
        score += 200;
    } else if (type.toLowerCase().includes('permanent')) {
        score += 150;
    } else if (type.toLowerCase().includes('contract')) {
        score += 50;
    }

    // Cap at 1000
    if (score > 1000) score = 1000;

    const isQualified = score >= 600;

    return NextResponse.json({
        success: true,
        data: {
            verified: true,
            score: score,
            isQualified: isQualified,
            breakdown: {
                base: 300,
                incomeFactor: monthlyIncome > 15000 ? 200 : (monthlyIncome > 5000 ? 100 : 0),
                employmentFactor: score - 300 - (monthlyIncome > 15000 ? 200 : (monthlyIncome > 5000 ? 100 : 0))
            },
            trace_id: crypto.randomUUID(),
        }
    });
}
