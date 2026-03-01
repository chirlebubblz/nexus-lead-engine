import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // FORCE NETLIFY EDGE FUNCTION TO RETURN 200 INSTEAD OF 307
    // This empty middleware replaces the stuck cached edge function.
    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
