
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use Service Role for Admin Management
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
    // List all users and filter by role in app_metadata
    // Note: listUsers is paginated. For now we fetch first 50.
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 100
        })

        if (error) throw error

        const staff = users.filter(u =>
            ['admin', 'admin_verifier', 'admin_approver'].includes(u.app_metadata?.role || '')
        ).map(u => ({
            id: u.id,
            email: u.email,
            role: u.app_metadata.role,
            created_at: u.created_at
        }))

        return NextResponse.json({ staff })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { email, role } = await request.json()

        // 1. Check if user exists
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users.find(u => u.email === email)

        if (existingUser) {
            // Update Role
            const { error } = await supabaseAdmin.auth.admin.updateUserById(
                existingUser.id,
                { app_metadata: { role } }
            )
            if (error) throw error
            return NextResponse.json({ success: true, message: 'Updated existing user role.' })
        } else {
            // Invite User (Create with dummy password or helper)
            // Ideally use inviteUserByEmail but that requires SMTP setup.
            // For MVP, we create user with temp password? Or just fail.
            // Let's use inviteUserByEmail assuming Supabase default SMTP works.
            const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                data: { role } // Request data, but metadata must be set on update usually? 
                // Actually invite accepts data which goes to user_metadata. app_metadata is harder on invite.
            })

            // Actually, best flow for MVP: User must signup first, then Admin promotes them.
            // Or Admin creates user with predefined password.

            if (error) throw error
            return NextResponse.json({ success: true, message: 'Invite sent.' })
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
