"use client";

import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useThemeToggle } from "@/hooks/useThemeToggle";

export default function LoginPage() {
    const { dark, toggle } = useThemeToggle();

    const handleLogin = async (provider: "google" | "github") => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-ground">

            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid opacity-40" />
                <div className="absolute inset-0"
                    style={{ background: "radial-gradient(ellipse 60% 50% at 30% 60%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 65%)" }} />
            </div>

            {/* Top bar */}
            <div className="absolute top-5 left-6 right-6 z-20 flex items-center justify-between">
                <Link href="/"
                    className="flex items-center gap-2 text-sm font-medium transition-colors duration-150 hover:text-text"
                    style={{ color: "var(--muted)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_back</span>
                    <span className="font-display font-bold" style={{ fontVariationSettings: "'wdth' 120" }}>DecisionOS</span>
                </Link>
                <button onClick={toggle}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-border rounded-sm transition-all duration-150 hover:border-accent hover:text-accent"
                    style={{ color: "var(--muted)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{dark ? "light_mode" : "dark_mode"}</span>
                    {dark ? "Light" : "Dark"}
                </button>
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-sm enter d-1">
                {/* Top accent line */}
                <div className="h-0.5 rounded-t-none" style={{ background: "var(--accent)" }} />
                <div className="bg-surface border border-t-0 border-border p-8 rounded-b-sm">

                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="font-display font-extrabold text-3xl mb-1.5 tracking-tight" style={{ color: "var(--text)", fontVariationSettings: "'wdth' 110" }}>
                            Sign in
                        </h1>
                        <p className="text-sm" style={{ color: "var(--muted)" }}>
                            Connect a provider to continue to DecisionOS.
                        </p>
                    </div>

                    {/* OAuth buttons */}
                    <div className="flex flex-col gap-3 mb-8">
                        {[
                            {
                                provider: "google" as const, label: "Continue with Google",
                                icon: "https://www.svgrepo.com/show/475656/google-color.svg",
                                color: true,
                            },
                            {
                                provider: "github" as const, label: "Continue with GitHub",
                                icon: "https://www.svgrepo.com/show/512317/github-142.svg",
                                color: false,
                            },
                        ].map(b => (
                            <button
                                key={b.provider}
                                onClick={() => handleLogin(b.provider)}
                                className="group flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium rounded-sm border border-border bg-ground transition-all duration-150 hover:border-accent text-left"
                                style={{ color: "var(--text)" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--accent) 5%, var(--ground))"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--ground)"; }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={b.icon} alt="" className="w-4 h-4 shrink-0"
                                    style={{ filter: b.color ? "none" : (dark ? "invert(1)" : "none"), opacity: 0.9 }} />
                                <span>{b.label}</span>
                                <span className="material-symbols-outlined ml-auto text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                    style={{ color: "var(--accent)", fontSize: "16px" }}>
                                    arrow_forward
                                </span>
                            </button>
                        ))}
                    </div>

                    <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
                        By signing in you agree to our{" "}
                        <span className="underline cursor-pointer underline-offset-2 hover:text-accent transition-colors" style={{ color: "var(--accent)" }}>Terms</span>
                        {" "}and{" "}
                        <span className="underline cursor-pointer underline-offset-2 hover:opacity-70" style={{ color: "var(--accent)" }}>Privacy Policy</span>.
                    </p>
                </div>
            </div>
        </div>
    );
}
