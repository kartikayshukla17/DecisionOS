"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useThemeToggle } from "@/hooks/useThemeToggle";

const MOCK = [
    { s: "critical", label: "Critical", title: "Node 16 EOL — upgrade CI pipeline", age: "1h", src: "github" },
    { s: "pending", label: "Pending", title: "Adopt Turborepo for monorepo builds", age: "4h", src: "github" },
    { s: "approved", label: "Approved", title: "React Query over Redux for API state", age: "2d", src: "github" },
    { s: "approved", label: "Approved", title: "Postgres over DynamoDB — final call", age: "5d", src: "manual" },
];

const STATUS_DOT: Record<string, string> = {
    critical: "#F87171",
    pending: "#FB923C",
    approved: "#34D399",
};

export default function LandingPage() {
    const [mounted, setMounted] = useState(false);
    const { dark, toggle } = useThemeToggle();
    useEffect(() => setMounted(true), []);

    return (
        <div className="min-h-screen bg-ground text-text font-sans relative overflow-hidden">

            {/* ── BACKGROUND: grid texture + diagonal radial gradient ── */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid opacity-50" />
                <div className="absolute inset-0"
                    style={{ background: "radial-gradient(ellipse 70% 55% at 70% 30%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 65%)" }} />
            </div>

            {/* ── NAV ── */}
            <nav className="relative z-20 sticky top-0 backdrop-blur-sm border-b border-border"
                style={{ background: "color-mix(in srgb, var(--ground) 88%, transparent)" }}>
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
                    {/* Logo: Bricolage Grotesque, wide weight */}
                    <span className="font-display font-extrabold text-xl tracking-tight text-text" style={{ fontVariationSettings: "'wdth' 125" }}>
                        Decision<span className="text-accent">OS</span>
                    </span>

                    <div className="hidden md:flex items-center gap-7 text-sm font-medium" style={{ color: "var(--muted)" }}>
                        {["Features", "Pricing", "Docs"].map(l => (
                            <span key={l} className="cursor-pointer transition-colors duration-150 hover:text-text">{l}</span>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Theme toggle — text label */}
                        {mounted && (
                            <button onClick={toggle}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-sm border border-border transition-all duration-150 hover:border-accent hover:text-accent"
                                style={{ color: "var(--muted)" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                    {dark ? "light_mode" : "dark_mode"}
                                </span>
                                {dark ? "Light" : "Dark"}
                            </button>
                        )}
                        <Link href="/login"
                            className="text-sm font-semibold px-4 py-2 rounded-sm transition-all duration-150 hover:opacity-85"
                            style={{ background: "var(--accent)", color: "#0A0F0D" }}>
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10">

                {/* ── HERO: full-width editorial masthead ── */}
                <section className="max-w-6xl mx-auto px-6 pt-16 pb-4">
                    {/* Badge */}
                    <div className="enter d-1 inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full mb-8 border border-border"
                        style={{ background: "color-mix(in srgb, var(--accent) 8%, var(--surface))", color: "var(--accent)" }}>
                        <span className="relative w-2 h-2 inline-flex items-center justify-center">
                            <span className="pulse-dot absolute inset-0 rounded-full" style={{ background: "var(--accent)" }} />
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                        </span>
                        Now in Beta · Free to start
                    </div>

                    {/* MASSIVE headline — Bricolage Grotesque at wide width */}
                    <h1 className="enter d-2 font-display font-extrabold leading-[0.92] tracking-tight mb-6"
                        style={{
                            fontSize: "clamp(3.5rem, 8.5vw, 7rem)",
                            fontVariationSettings: "'wdth' 115",
                            color: "var(--text)",
                        }}>
                        Your team's decisions,<br />
                        <span style={{ color: "var(--accent)" }}>finally organized.</span>
                    </h1>

                    <div className="enter d-3 flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-border">
                        <p className="text-lg leading-relaxed max-w-md" style={{ color: "var(--muted)" }}>
                            DecisionOS pulls decisions from GitHub PRs and Issues automatically —
                            distilled, indexed, and searchable. No copy-paste, no Notion templates.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                            <Link href="/login"
                                className="font-semibold text-sm px-7 py-3.5 rounded-sm transition-all duration-150 text-center hover:opacity-90"
                                style={{ background: "var(--accent)", color: "#0A0F0D" }}>
                                Start free →
                            </Link>
                            <Link href="#features"
                                className="font-medium text-sm px-7 py-3.5 rounded-sm border border-border transition-all duration-150 text-center hover:border-accent hover:text-accent"
                                style={{ color: "var(--muted)" }}>
                                See how it works
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── LIVE DECISION STREAM ── */}
                <section className="max-w-6xl mx-auto px-6 py-12">
                    <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>
                        — Live decision queue preview —
                    </p>

                    {/* Column header */}
                    <div className="grid text-xs font-mono uppercase tracking-widest px-4 py-2 border-t border-b border-border mb-0"
                        style={{ gridTemplateColumns: "80px 1fr 60px 48px", color: "var(--muted)", gap: "16px" }}>
                        <span>Status</span><span>Decision</span><span>Source</span><span className="text-right">Age</span>
                    </div>

                    {/* Mock rows with CSS stagger */}
                    {MOCK.map((d, i) => (
                        <div key={d.title}
                            className="enter-x grid items-center px-4 py-3.5 border-b border-border group cursor-default transition-colors duration-150 hover:bg-surface"
                            style={{
                                gridTemplateColumns: "80px 1fr 60px 48px",
                                gap: "16px",
                                animationDelay: `${400 + i * 60}ms`,
                                borderLeft: `2px solid ${STATUS_DOT[d.s] ?? "var(--border-col)"}`,
                            }}>
                            <span className="text-xs font-mono font-medium" style={{ color: STATUS_DOT[d.s] }}>{d.label}</span>
                            <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{d.title}</span>
                            <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{d.src}</span>
                            <span className="text-xs font-mono text-right" style={{ color: "var(--muted)" }}>{d.age}</span>
                        </div>
                    ))}
                </section>

                {/* ── STATS ── */}
                <div className="border-y border-border" style={{ background: "var(--surface)" }}>
                    <div className="max-w-6xl mx-auto grid grid-cols-3 divide-x divide-border">
                        {[
                            { v: "< 5 min", l: "Time to first decision" },
                            { v: "Read-only", l: "GitHub permission scope" },
                            { v: "$0", l: "Cost to start" },
                        ].map(s => (
                            <div key={s.l} className="px-8 py-10">
                                <p className="font-display font-bold text-4xl mb-2 tracking-tight" style={{ color: "var(--text)", fontVariationSettings: "'wdth' 110" }}>
                                    {s.v}
                                </p>
                                <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--muted)" }}>{s.l}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── FEATURES ── */}
                <section id="features" className="max-w-6xl mx-auto px-6 py-24">
                    <h2 className="font-display font-bold text-5xl mb-3 tracking-tight" style={{ fontVariationSettings: "'wdth' 110", color: "var(--text)" }}>
                        What it does
                    </h2>
                    <p className="text-base mb-14 max-w-lg" style={{ color: "var(--muted)" }}>
                        A structured layer on top of your existing GitHub workflow. Nothing changes — except you stop losing context.
                    </p>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: "bolt", t: "Decision Feed", d: "Every merged PR and closed Issue is scanned for decisions. Your team's reasoning is extracted and stored — no manual entry." },
                            { icon: "chat_bubble", t: "AI Copilot", d: "Ask \"why did we pick Postgres?\" and get a cited answer from your actual history. Not hallucinated, not guessed." },
                            { icon: "task_alt", t: "Commitments", d: "Each decision auto-generates action items with owners. Track follow-through without a separate project manager." },
                        ].map((f, i) => (
                            <div key={f.t}
                                className={`enter d-${i + 4} p-8 border border-border rounded-sm bg-surface cursor-default transition-all duration-200 group hover:border-accent`}>
                                <div className="w-10 h-10 flex items-center justify-center rounded-sm mb-5 transition-colors duration-200"
                                    style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--ground))" }}>
                                    <span className="material-symbols-outlined text-lg" style={{ color: "var(--accent)", fontSize: "20px" }}>{f.icon}</span>
                                </div>
                                <h3 className="font-display font-bold text-xl mb-3 tracking-tight" style={{ color: "var(--text)" }}>{f.t}</h3>
                                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{f.d}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── PRICING ── */}
                <section className="border-t border-border" style={{ background: "var(--surface)" }}>
                    <div className="max-w-4xl mx-auto px-6 py-24">
                        <h2 className="font-display font-bold text-5xl mb-3 text-center tracking-tight" style={{ color: "var(--text)", fontVariationSettings: "'wdth' 110" }}>Pricing</h2>
                        <p className="text-center text-sm mb-14" style={{ color: "var(--muted)" }}>Simple. No surprises.</p>
                        <div className="grid md:grid-cols-2 gap-px border border-border">
                            {/* Free */}
                            <div className="p-10 flex flex-col gap-6" style={{ background: "var(--ground)" }}>
                                <div>
                                    <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Starter</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-display font-bold text-5xl tracking-tight" style={{ color: "var(--text)" }}>Free</span>
                                    </div>
                                </div>
                                <ul className="space-y-2.5 text-sm flex-1" style={{ color: "var(--muted)" }}>
                                    {["Up to 3 members", "GitHub integration", "Decision feed", "Basic AI Copilot"].map(f => (
                                        <li key={f} className="flex items-center gap-2.5">
                                            <span className="text-xs" style={{ color: "var(--accent)" }}>✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/login"
                                    className="block text-center text-sm font-semibold py-3 rounded-sm border border-border transition-all duration-150 hover:border-accent hover:text-accent"
                                    style={{ color: "var(--text)" }}>
                                    Get started free
                                </Link>
                            </div>
                            {/* Pro */}
                            <div className="p-10 flex flex-col gap-6 relative" style={{ background: "var(--text)", color: "var(--ground)" }}>
                                <div className="absolute top-4 right-4 text-xs font-mono px-2 py-1 rounded-sm" style={{ background: "var(--accent)", color: "#0A0F0D" }}>Popular</div>
                                <div>
                                    <p className="text-xs font-mono uppercase tracking-widest mb-3 opacity-50">Pro</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-display font-bold text-5xl tracking-tight">$29</span>
                                        <span className="text-base opacity-40">/month</span>
                                    </div>
                                </div>
                                <ul className="space-y-2.5 text-sm flex-1 opacity-75">
                                    {["Unlimited members", "Gmail + Calendar (Premium)", "Priority AI Copilot", "Custom integrations", "Dedicated Slack support"].map(f => (
                                        <li key={f} className="flex items-center gap-2.5">
                                            <span className="text-xs" style={{ color: "var(--accent)" }}>✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link href="/login"
                                    className="block text-center text-sm font-semibold py-3 rounded-sm transition-all duration-150 hover:opacity-85"
                                    style={{ background: "var(--accent)", color: "#0A0F0D" }}>
                                    Upgrade to Pro
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <footer className="border-t border-border">
                    <div className="max-w-6xl mx-auto px-6 py-7 flex items-center justify-between text-xs font-mono" style={{ color: "var(--muted)" }}>
                        <span className="font-display font-extrabold text-base" style={{ color: "var(--accent)", fontVariationSettings: "'wdth' 125" }}>
                            Decision<span style={{ color: "var(--text)" }}>OS</span>
                        </span>
                        <span>© 2026 DecisionOS. All rights reserved.</span>
                        <div className="flex gap-5">
                            {["Privacy", "Terms", "Docs"].map(l => (
                                <span key={l} className="cursor-pointer hover:underline hover:text-text transition-colors">{l}</span>
                            ))}
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
