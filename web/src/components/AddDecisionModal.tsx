"use client";

import { useState } from "react";
import { useCreateDecision } from "@/hooks/useDecisions";

type Status = "pending" | "approved" | "critical";

const STATUS_STYLES: Record<Status, { color: string; border: string; bg: string }> = {
    pending: { color: "#FB923C", border: "rgba(251,146,60,0.4)", bg: "rgba(251,146,60,0.08)" },
    approved: { color: "#34D399", border: "rgba(52,211,153,0.4)", bg: "rgba(52,211,153,0.08)" },
    critical: { color: "#F87171", border: "rgba(248,113,113,0.4)", bg: "rgba(248,113,113,0.08)" },
};

export function AddDecisionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<Status>("pending");
    const [sourceUrl, setSourceUrl] = useState("");
    const { mutate: create, isPending } = useCreateDecision();

    if (!open) return null;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        create(
            { title, description, status, source_url: sourceUrl || undefined },
            {
                onSuccess: () => {
                    onClose();
                    setTitle(""); setDescription(""); setStatus("pending"); setSourceUrl("");
                },
            }
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md enter-scale"
                style={{ fontFamily: "var(--font-sans)" }}
                onClick={e => e.stopPropagation()}>

                {/* Accent top bar */}
                <div className="h-0.5" style={{ background: "#34D399" }} />

                {/* Card body */}
                <div className="border border-border border-t-0" style={{ background: "#111916" }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <h2 className="font-display font-bold text-xl tracking-tight" style={{ color: "#E8F0EB", fontVariationSettings: "'wdth' 108" }}>
                            New Decision
                        </h2>
                        <button type="button" onClick={onClose}
                            className="material-symbols-outlined w-7 h-7 flex items-center justify-center rounded-sm transition-colors duration-150 hover:bg-surface text-sm"
                            style={{ color: "#5A6E63", fontSize: "18px" }}>
                            close
                        </button>
                    </div>

                    {/* Fields */}
                    <div className="px-5 py-4 flex flex-col gap-4">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "#5A6E63" }}>
                                Title <span style={{ color: "#34D399" }}>*</span>
                            </label>
                            <input required value={title} onChange={e => setTitle(e.target.value)}
                                placeholder="We decided to…"
                                className="w-full text-sm px-3 py-2.5 outline-none border transition-colors duration-150 focus:border-accent"
                                style={{
                                    background: "#0A0F0D", color: "#E8F0EB",
                                    borderColor: "#1E2921", fontFamily: "var(--font-sans)",
                                }} />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "#5A6E63" }}>
                                Description
                            </label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="Context, rationale, alternatives considered…"
                                rows={3}
                                className="w-full text-sm px-3 py-2.5 outline-none border transition-colors duration-150 focus:border-accent resize-none"
                                style={{
                                    background: "#0A0F0D", color: "#E8F0EB",
                                    borderColor: "#1E2921", fontFamily: "var(--font-sans)",
                                }} />
                        </div>

                        {/* Status selector */}
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "#5A6E63" }}>
                                Status
                            </label>
                            <div className="flex gap-2">
                                {(["pending", "approved", "critical"] as Status[]).map(s => {
                                    const st = STATUS_STYLES[s];
                                    const active = status === s;
                                    return (
                                        <button key={s} type="button" onClick={() => setStatus(s)}
                                            className="flex-1 py-2 text-xs font-medium capitalize rounded-sm border transition-all duration-150"
                                            style={{
                                                borderColor: active ? st.border : "#1E2921",
                                                background: active ? st.bg : "transparent",
                                                color: active ? st.color : "#5A6E63",
                                            }}>
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Source URL */}
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "#5A6E63" }}>
                                Source URL <span className="normal-case not-uppercase">(optional)</span>
                            </label>
                            <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
                                placeholder="https://github.com/…"
                                className="w-full text-sm px-3 py-2.5 outline-none border transition-colors duration-150 focus:border-accent"
                                style={{
                                    background: "#0A0F0D", color: "#E8F0EB",
                                    borderColor: "#1E2921", fontFamily: "var(--font-sans)",
                                }} />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 flex gap-3 border-t border-border">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-medium rounded-sm border transition-all duration-150 hover:border-accent"
                            style={{ borderColor: "#1E2921", color: "#5A6E63" }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={!title.trim() || isPending}
                            className="flex-1 py-2.5 text-sm font-semibold rounded-sm transition-all duration-150 hover:opacity-85 disabled:opacity-35"
                            style={{ background: "#34D399", color: "#0A0F0D" }}>
                            {isPending ? "Saving…" : "Add Decision"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
