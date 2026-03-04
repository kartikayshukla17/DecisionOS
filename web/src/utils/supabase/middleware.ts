import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with cross-browser cookies, etc.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // ─── AUTH PROTECTION ───
    if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if (user && request.nextUrl.pathname === "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    // ─── ONBOARDING REDIRECTION ───
    if (user) {
        // We check the 'users' table for onboarding status
        // Note: This requires a 'SELECT' policy on the 'users' table for auth.uid()
        const { data: profile } = await supabase
            .from("users")
            .select("onboarding_completed")
            .eq("id", user.id)
            .single();

        const isOnboarding = request.nextUrl.pathname === "/onboarding";
        const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

        if (profile) {
            if (!profile.onboarding_completed && isDashboard) {
                const url = request.nextUrl.clone();
                url.pathname = "/onboarding";
                return NextResponse.redirect(url);
            }

            if (profile.onboarding_completed && isOnboarding) {
                const url = request.nextUrl.clone();
                url.pathname = "/dashboard";
                return NextResponse.redirect(url);
            }
        }
    }
    return supabaseResponse;
}
