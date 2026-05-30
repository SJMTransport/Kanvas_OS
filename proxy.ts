import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const APP_ROUTES = ['/dashboard', '/calendar', '/content', '/performance', '/brand', '/settings', '/aset']
const AUTH_ROUTES = ['/login']

export async function proxy(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If env vars are missing, let the request through — pages will handle auth
    if (!url || !key) {
      return NextResponse.next({ request })
    }

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data } = await supabase.auth.getUser()
    const user = data?.user ?? null
    const { pathname } = request.nextUrl

    const isAppRoute = APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
    const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

    if (!user && isAppRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (user && isAppRoute && pathname !== '/onboarding') {
      try {
        const { data: members } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .limit(1)

        if (!members || members.length === 0) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      } catch {
        // DB unreachable — let the page handle auth
      }
    }

    return supabaseResponse
  } catch {
    // Proxy crashed — pass through to avoid blank 500
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
