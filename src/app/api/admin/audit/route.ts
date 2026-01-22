
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const loanId = searchParams.get('loanId');

        if (!loanId) {
            return NextResponse.json({ success: false, error: 'Loan ID required' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: logs, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('loan_id', loanId)
            .order('created_at', { ascending: false });

        if (error) {
            // Handle missing table gracefully
            if (error.code === '42P01') {
                return NextResponse.json({ success: true, daa: [], message: 'Audit logging not enabled yet.' });
            }
            throw error;
        }

        return NextResponse.json({ success: true, data: logs });

    } catch (error: any) {
        console.error('Fetch Audit Error:', error);
        return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
    }
}
