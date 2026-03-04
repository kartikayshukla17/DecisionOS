import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// Next.js 16.1.x still requires 'middleware' as the export name
// 'proxy' is only available in newer releases — keep both for forward compatibility
export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export { middleware as proxy };

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
