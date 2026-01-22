
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validation Schema
const profileSchema = z.object({
    phone: z.string().min(10, "Invalid phone number"),
    address: z.string().min(5, "Address is too short"),
    nokName: z.string().min(3, "Next of Kin name required"),
    nokPhone: z.string().min(10, "Next of Kin phone required"),
    nokRelation: z.string().min(2, "Relationship required"),
})

export async function PUT(request: Request) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
            },
        }
    )

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()

        // 2. Validate
        const validData = profileSchema.parse(body)

        // 3. Update DB
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                phone_number: validData.phone,
                address: validData.address,
                next_of_kin_name: validData.nokName,
                next_of_kin_phone: validData.nokPhone,
                next_of_kin_relation: validData.nokRelation,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true, message: 'Profile updated successfully' })

    } catch (error: any) {
        console.error("Profile Update Error:", error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as z.ZodError).errors[0].message }, { status: 400 })
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
