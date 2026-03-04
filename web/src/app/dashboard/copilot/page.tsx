"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Message { role: "user" | "ai"; content: string; sources?: string[]; }

const STARTERS = [
    "Why did we choose Supabase over Firebase?",
    "What decisions are still pending approval?",
    "Show me critical decisions from last month",
    "Who approved the GraphQL migration?",
];

export default function CopilotPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function send(q = input.trim()) {
        if (!q || loading) return;
        setInput("");
        setMessages(p => [...p, { role: "user", content: q }]);
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_BASE}/decisions/draft`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ question: q }),
            });
            const data = await res.json();
            setMessages(p => [...p, {
                role: "ai",
                content: data.answer ?? data.message ?? "No answer returned.",
                sources: data.sources,
            }]);
        } catch {
            setMessages(p => [...p, { role: "ai", content: "Connection failed. Check your API status." }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex flex-col" style={{ height: "calc(100dvh - 48px - 60px)" }}>

            {/* Header */}
            <div className="px-5 pt-5 pb-3 max-w-2xl mx-auto w-full border-b border-border">
                <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: "var(--foreground)", fontVariationSettings: "'wdth' 105" }}>
                    AI Copilot
                </h1>
                <p className="text-xs font-mono mt-1" style={{ color: "var(--muted)" }}>
                    Ask questions about your team's decisions
                </p>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 max-w-2xl mx-auto w-full">
                {/* Starter prompts */}
                {messages.length === 0 && (
                    <div className="pt-2">
                        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
                            — Suggested queries —
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {STARTERS.map(s => (
                                <button key={s} onClick={() => send(s)}
                                    className="text-xs font-medium text-left px-4 py-3 border border-border border-l-2 border-l-accent rounded-r-sm transition-all duration-150 hover:bg-surface hover:border-accent"
                                    style={{ color: "var(--muted)" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message thread */}
                <div className="flex flex-col gap-5 pt-2">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            {m.role === "user" ? (
                                <div className="max-w-xs px-4 py-3 text-sm font-medium rounded-r-sm rounded-tl-sm"
                                    style={{ background: "var(--accent)", color: "#0A0F0D" }}>
                                    {m.content}
                                </div>
                            ) : (
                                <div className="max-w-sm">
                                    <div className="px-4 py-3 text-sm leading-relaxed border-l-2 rounded-r-sm"
                                        style={{ background: "var(--surface)", borderLeftColor: "var(--accent)", color: "var(--foreground)" }}>
                                        {m.content}
                                    </div>
                                    {m.sources && m.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {m.sources.map(src => (
                                                <span key={src} className="flex items-center gap-1 text-xs font-mono px-2 py-1 border border-border rounded-sm"
                                                    style={{ color: "var(--muted)" }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: "11px" }}>description</span>
                                                    {src}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Loading indicator */}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="px-4 py-3 text-sm border-l-2 rounded-r-sm"
                                style={{ background: "var(--surface)", borderLeftColor: "var(--accent)", color: "var(--muted)" }}>
                                <span className="inline-flex items-center gap-1 font-mono text-xs">
                                    processing
                                    <span className="blink" style={{ color: "var(--accent)" }}>█</span>
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Input */}
            <div className="px-5 pt-3 pb-4 max-w-2xl mx-auto w-full border-t border-border">
                <div className="flex gap-2 items-end">
                    <div className="flex-1 border border-border rounded-sm bg-surface transition-colors duration-150 focus-within:border-accent">
                        <div className="flex items-start gap-2 px-4 pt-3.5 pb-1">
                            <span className="text-sm font-mono mt-0.5 shrink-0 select-none" style={{ color: "var(--accent)" }}>›</span>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                                placeholder="Ask about your team's decisions…"
                                rows={1}
                                className="flex-1 resize-none outline-none text-sm bg-transparent leading-relaxed pb-2.5"
                                style={{ color: "var(--foreground)", fontFamily: "var(--font-sans)", maxHeight: "120px" }} />
                        </div>
                    </div>
                    <button onClick={() => send()} disabled={!input.trim() || loading}
                        className="w-10 h-10 flex items-center justify-center rounded-sm transition-all duration-150 shrink-0"
                        style={{
                            background: "var(--accent)",
                            color: "#0A0F0D",
                            opacity: !input.trim() || loading ? 0.35 : 1,
                        }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>send</span>
                    </button>
                </div>
                <p className="text-xs font-mono mt-1.5" style={{ color: "var(--muted)" }}>
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </main>
    );
}
