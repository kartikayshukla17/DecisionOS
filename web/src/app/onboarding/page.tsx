"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const JADE = "#34D399";
const BG = "#09090B";
const SURF = "#111916";
const BORDER = "rgba(52,211,153,0.1)";
const TEXT = "#E8F0EB";
const MUTED = "#5A6E63";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [dataRange, setDataRange] = useState<7 | 30 | 0>(30);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleConnectGithub() {
        const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
        const redirectUri = `${window.location.origin}/auth/github/callback`;
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo:read`;
    }

    async function handleFinish() {
        setLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${API_BASE}/onboarding/complete`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            router.push("/dashboard");
        } catch (e: any) {
            setError(e.message ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ width: "100%", maxWidth: 480, padding: "0 24px" }}>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-10">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-2">
                        <div
                            className="w-6 h-6 flex items-center justify-center text-xs font-mono font-bold transition-all"
                            style={{
                                background: step >= s ? JADE : "transparent",
                                border: `1px solid ${step >= s ? JADE : BORDER}`,
                                color: step >= s ? BG : MUTED,
                            }}
                        >
                            {s < step ? "✓" : s}
                        </div>
                        {s < 3 && <div className="w-12 h-px" style={{ background: step > s ? JADE : BORDER }} />}
                    </div>
                ))}
            </div>

            {/* ── Step 1: Connect GitHub ── */}
            {step === 1 && (
                <div>
                    <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: JADE, opacity: 0.7 }}>Step 1 of 3</p>
                    <h1 className="font-display font-black text-4xl mb-3" style={{ color: TEXT }}>Connect GitHub</h1>
                    <p className="text-sm mb-8 leading-relaxed" style={{ color: MUTED, fontFamily: "var(--font-body)" }}>
                        We read merged Pull Requests and closed Issues to extract decisions automatically.
                        We only ask for <strong style={{ color: TEXT }}>read-only</strong> access — we can never push code.
                    </p>

                    <div className="mb-8 p-5" style={{ border: `1px solid ${BORDER}`, background: SURF }}>
                        {[
                            { icon: "lock", text: "Read-only access — no write permissions" },
                            { icon: "visibility_off", text: "Raw PR content is never stored" },
                            { icon: "psychology", text: "Only AI-extracted summaries are saved" },
                        ].map(item => (
                            <div key={item.text} className="flex items-center gap-3 mb-3 last:mb-0">
                                <span className="material-symbols-outlined text-base" style={{ color: JADE }}>{item.icon}</span>
                                <span className="text-sm" style={{ color: MUTED, fontFamily: "var(--font-body)" }}>{item.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleConnectGithub}
                            className="w-full py-3.5 font-mono font-bold text-sm uppercase tracking-widest transition-all"
                            style={{ background: JADE, color: BG }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                        >
                            Connect GitHub
                        </button>
                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-3 font-mono text-sm transition-all"
                            style={{ color: MUTED, border: `1px solid ${BORDER}` }}
                            onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
                        >
                            Skip — start with manual input
                        </button>
                    </div>
                </div>
            )}

            {/* ── Step 2: Data range ── */}
            {step === 2 && (
                <div>
                    <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: JADE, opacity: 0.7 }}>Step 2 of 3</p>
                    <h1 className="font-display font-black text-4xl mb-3" style={{ color: TEXT }}>How far back?</h1>
                    <p className="text-sm mb-8" style={{ color: MUTED }}>
                        We'll scan your GitHub history for this window and populate your dashboard immediately.
                    </p>

                    <div className="flex flex-col gap-3 mb-8">
                        {([
                            { value: 7, label: "Last 7 days", desc: "Recent activity only" },
                            { value: 30, label: "Last 30 days", desc: "Recommended" },
                            { value: 0, label: "Start fresh", desc: "Only new activity going forward" },
                        ] as { value: 7 | 30 | 0; label: string; desc: string }[]).map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setDataRange(opt.value)}
                                className="flex items-center justify-between p-4 text-left transition-all"
                                style={{
                                    border: `1px solid ${dataRange === opt.value ? JADE : BORDER}`,
                                    background: dataRange === opt.value ? `color-mix(in srgb, ${JADE} 10%, ${SURF})` : SURF,
                                }}
                            >
                                <div>
                                    <p className="font-mono font-bold text-sm mb-0.5" style={{ color: TEXT }}>{opt.label}</p>
                                    <p className="text-xs" style={{ color: MUTED }}>{opt.desc}</p>
                                </div>
                                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                                    style={{ borderColor: dataRange === opt.value ? JADE : MUTED }}>
                                    {dataRange === opt.value && (
                                        <div className="w-2 h-2 rounded-full" style={{ background: JADE }} />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setStep(3)}
                        className="w-full py-3.5 font-mono font-bold text-sm uppercase tracking-widest transition-all"
                        style={{ background: JADE, color: BG }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                    >
                        Continue
                    </button>
                </div>
            )}

            {/* ── Step 3: Premium add-ons ── */}
            {step === 3 && (
                <div>
                    <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: JADE, opacity: 0.7 }}>Step 3 of 3</p>
                    <h1 className="font-display font-black text-4xl mb-3" style={{ color: TEXT }}>More integrations</h1>
                    <p className="text-sm mb-8" style={{ color: MUTED }}>
                        Connect email and calendar to capture decisions from meetings in real-time.
                        You can do this anytime from Settings.
                    </p>

                    <div className="flex flex-col gap-3 mb-8">
                        {[
                            { icon: "mail", label: "Gmail", desc: "Decisions from email threads" },
                            { icon: "calendar_month", label: "Google Calendar", desc: "Decisions from meeting notes" },
                        ].map(int => (
                            <div
                                key={int.label}
                                className="flex items-center justify-between p-4"
                                style={{ border: `1px solid ${BORDER}`, background: SURF, opacity: 0.65 }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-lg" style={{ color: MUTED }}>{int.icon}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-mono font-bold text-sm" style={{ color: TEXT }}>{int.label}</p>
                                            <span className="text-[10px] font-mono px-1.5 py-0.5" style={{ border: `1px solid ${JADE}40`, color: JADE }}>
                                                Premium
                                            </span>
                                        </div>
                                        <p className="text-xs" style={{ color: MUTED }}>{int.desc}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono" style={{ color: MUTED }}>Soon</span>
                            </div>
                        ))}
                    </div>

                    {error && <p className="font-mono text-xs mb-4 text-red-400">{error}</p>}

                    <button
                        onClick={handleFinish}
                        disabled={loading}
                        className="w-full py-3.5 font-mono font-bold text-sm uppercase tracking-widest transition-all"
                        style={{ background: JADE, color: BG, opacity: loading ? 0.6 : 1 }}
                    >
                        {loading ? "Setting up…" : "Go to Dashboard →"}
                    </button>
                </div>
            )}
        </div>
    );
}
