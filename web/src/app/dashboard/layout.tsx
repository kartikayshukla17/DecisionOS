"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDecisions } from "@/hooks/useDecisions";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
    { href: "/dashboard", icon: "grid_view", label: "Queue" },
    { href: "/dashboard/commitments", icon: "task_alt", label: "Commitments" },
    { href: "/dashboard/copilot", icon: "chat_bubble", label: "Copilot" },
    { href: "/dashboard/settings", icon: "settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const path = usePathname();
    const { user, signOut } = useAuth();
    const { data: decisions } = useDecisions();
    const [menuOpen, setMenuOpen] = useState(false);

    const critical = decisions?.filter(d => d.status === "critical").length ?? 0;
    const pending = decisions?.filter(d => d.status === "pending").length ?? 0;
    const resolved = decisions?.filter(d => ["approved", "resolved"].includes(d.status as string)).length ?? 0;

    const email = user?.email ?? "";
    const initials = user?.user_metadata?.full_name
        ? (user.user_metadata.full_name as string).split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2)
        : email.slice(0, 2).toUpperCase() || "U";

    return (
        <div className="hud bg-hud-grid bg-hud-glow min-h-screen text-text font-sans" style={{ background: "var(--ground)" }}>

            {/* ── TOP BAR ── */}
            <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border"
                style={{ background: "color-mix(in srgb, var(--ground) 80%, transparent)" }}>
                <div className="max-w-5xl mx-auto px-5 h-12 flex items-center gap-4 justify-between">

                    {/* Logo */}
                    <span className="font-display font-extrabold text-lg tracking-tight shrink-0"
                        style={{ color: "var(--accent)", fontVariationSettings: "'wdth' 115" }}>
                        Decision<span style={{ color: "var(--foreground)" }}>OS</span>
                    </span>

                    {/* Status strip */}
                    <div className="flex items-center gap-5 text-xs font-mono">
                        {critical > 0 && (
                            <span className="flex items-center gap-2 status-critical">
                                <span className="relative inline-flex w-2 h-2">
                                    <span className="pulse-dot absolute inset-0 rounded-full" style={{ color: "#F87171" }} />
                                    <span className="w-2 h-2 rounded-full status-critical" style={{ background: "currentColor" }} />
                                </span>
                                {critical} Critical
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 status-pending">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FB923C" }} />
                            {pending} Pending
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5 status-approved">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399" }} />
                            {resolved} Resolved
                        </span>
                    </div>

                    {/* User avatar + dropdown */}
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setMenuOpen(v => !v)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-150"
                            style={{
                                background: "var(--surface)",
                                borderColor: menuOpen ? "var(--accent)" : "var(--border-col)",
                                color: menuOpen ? "var(--accent)" : "var(--muted)",
                            }}>
                            {initials}
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 top-9 w-52 z-50 shadow-2xl border border-border rounded-sm overflow-hidden"
                                style={{ background: "var(--surface)", borderTop: "2px solid var(--accent)" }}>
                                {email && (
                                    <div className="px-4 py-3 border-b border-border">
                                        <p className="text-xs font-mono mb-0.5" style={{ color: "var(--muted)" }}>Signed in as</p>
                                        <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{email}</p>
                                    </div>
                                )}
                                <div className="py-1">
                                    <Link href="/dashboard/settings"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-xs transition-colors duration-100 hover:bg-ground"
                                        style={{ color: "var(--muted)" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>settings</span>
                                        Settings
                                    </Link>
                                    <button
                                        onClick={() => { setMenuOpen(false); signOut(); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left transition-colors duration-100 hover:bg-red-500/10"
                                        style={{ color: "#F87171" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>logout</span>
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Backdrop for dropdown */}
            {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

            {/* Page content */}
            {children}

            {/* ── BOTTOM NAV ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t border-border"
                style={{ background: "color-mix(in srgb, var(--ground) 92%, transparent)" }}>
                <div className="max-w-sm mx-auto flex justify-around items-center px-4 py-2 pb-6">
                    {NAV.map(item => {
                        const active = path === item.href;
                        return (
                            <Link key={item.href} href={item.href}
                                className="flex flex-col items-center gap-1 pt-1 transition-all duration-150"
                                style={{ color: active ? "var(--accent)" : "var(--muted)" }}>
                                <span className="material-symbols-outlined"
                                    style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}`, fontSize: "22px" }}>
                                    {item.icon}
                                </span>
                                <span className="text-[10px] font-mono uppercase tracking-wider">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
