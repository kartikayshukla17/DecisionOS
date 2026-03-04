"use client";

import { useIntegrations } from "@/hooks/useDecisions";

export default function SettingsPage() {
    const { data: integrations, isLoading } = useIntegrations();
    const github = integrations?.find((i: { platform: string; sync_status?: string; last_synced_at?: string; external_username?: string }) => i.platform === "github");

    return (
        <main className="max-w-2xl mx-auto px-4 pt-6 pb-32 font-sans">
            <h1 className="font-display font-bold text-2xl tracking-tight mb-1" style={{ color: "var(--foreground)", fontVariationSettings: "'wdth' 105" }}>
                Settings
            </h1>
            <p className="text-xs font-mono mb-8" style={{ color: "var(--muted)" }}>
                Manage integrations and data sources
            </p>

            {/* Section label */}
            <div className="text-xs font-mono uppercase tracking-widest px-4 py-2 border-t border-b border-border mb-0"
                style={{ color: "var(--muted)", background: "var(--surface)" }}>
                Integrations
            </div>

            {/* GitHub */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border border-l-2 border-l-accent transition-colors duration-100 hover:bg-surface">
                <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://www.svgrepo.com/show/512317/github-142.svg" alt="GitHub" className="w-4 h-4"
                        style={{ filter: "var(--github-icon-filter, invert(1))", opacity: 0.8 }} />
                    <div>
                        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>GitHub</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: "var(--muted)" }}>
                            {isLoading ? "Checking…" : github
                                ? `Connected as ${github.external_username ?? "user"} · ${github.sync_status ?? "idle"}`
                                : "Not connected · read-only OAuth"}
                        </p>
                    </div>
                </div>
                {github ? (
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono px-2 py-1 border rounded-sm status-approved"
                            style={{ borderColor: "rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.06)" }}>
                            Active
                        </span>
                        <button className="text-xs font-mono transition-colors duration-150 hover:text-accent" style={{ color: "var(--muted)" }}>
                            Resync
                        </button>
                    </div>
                ) : (
                    <button
                        className="text-xs font-semibold px-4 py-2 rounded-sm transition-all duration-150 hover:opacity-85"
                        style={{ background: "var(--accent)", color: "#0A0F0D" }}
                        onClick={() => {
                            const id = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
                            const redir = `${window.location.origin}/auth/github/callback`;
                            window.location.href = `https://github.com/login/oauth/authorize?client_id=${id}&redirect_uri=${redir}&scope=repo:read`;
                        }}>
                        Connect
                    </button>
                )}
            </div>

            {/* Coming soon integrations */}
            {[
                { icon: "mail", name: "Gmail", desc: "Decisions from email threads" },
                { icon: "calendar_month", name: "Google Calendar", desc: "Meeting note decisions" },
                { icon: "chat", name: "Slack", desc: "Channel discussion decisions" },
            ].map(int => (
                <div key={int.name}
                    className="flex items-center justify-between px-4 py-4 border-b border-border border-l-2 opacity-45"
                    style={{ borderLeftColor: "var(--border-col)" }}>
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--muted)" }}>{int.icon}</span>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{int.name}</p>
                                <span className="text-xs font-mono px-1.5 py-0.5 border rounded-sm"
                                    style={{ borderColor: "rgba(52,211,153,0.3)", color: "var(--accent)", background: "rgba(52,211,153,0.05)" }}>
                                    Premium
                                </span>
                            </div>
                            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--muted)" }}>{int.desc}</p>
                        </div>
                    </div>
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>Coming soon</span>
                </div>
            ))}

            {/* Privacy card */}
            <div className="mt-6 p-5 border border-border rounded-sm bg-surface">
                <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
                    Privacy guarantee
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    Raw PR bodies and emails are never stored. Only AI-extracted summaries. OAuth tokens are AES-256 encrypted at rest. Read-only scopes only.
                </p>
            </div>
        </main>
    );
}
