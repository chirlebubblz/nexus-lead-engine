import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getServiceSupabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'jerafisabalo@gmail.com';

export async function POST(request: Request) {
    try {
        // 1. Authenticate the request
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.email !== ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        // 2. Create the user using the Service Role
        // This is crucial: Using the service role bypasses the normal "sign up" flow
        // and creates the user in the backend WITHOUT logging the Admin out of their active session.
        const serviceSupabase = getServiceSupabase();
        const { data, error } = await serviceSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true // Force confirmation so they can log in instantly
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            message: 'Guest account created successfully.',
            user: { id: data.user.id, email: data.user.email }
        });

    } catch (error: any) {
        console.error('Admin Create User API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
