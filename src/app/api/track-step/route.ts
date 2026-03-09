import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const { step } = await req.json();
        if (typeof step !== 'number' || step < 1 || step > 7) {
            return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
        }

        // Store the highest step reached in user_metadata
        const currentStep = user.user_metadata?.application_step || 0;
        const highestStep = Math.max(currentStep, step);

        await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                application_step: highestStep,
                application_step_updated_at: new Date().toISOString()
            }
        });

        return NextResponse.json({ success: true, step: highestStep });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
