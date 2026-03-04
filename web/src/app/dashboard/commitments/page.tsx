"use client";

const OPEN = [
    { id: "1", owner: "Kartikay", description: "Set up GitHub webhook in production", deadline: "Mar 5" },
    { id: "2", owner: "Priya", description: "Write migration runbook for new DB schema", deadline: "Mar 8" },
    { id: "3", owner: "Alex", description: "Audit API endpoint permissions post-migration", deadline: "Mar 10" },
];
const DONE = [
    { id: "4", owner: "Kartikay", description: "Deploy Next.js 16 edge runtime", completedAt: "Feb 28" },
];

export default function CommitmentsPage() {
    return (
        <main className="max-w-2xl mx-auto px-4 pt-6 pb-32 font-sans">
            <div className="flex items-baseline justify-between mb-5">
                <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: "var(--foreground)", fontVariationSettings: "'wdth' 105" }}>
                    Commitments
                </h1>
                <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    {OPEN.length} open
                </span>
            </div>

            {/* Column headers */}
            <div className="grid text-xs font-mono uppercase tracking-widest px-4 py-2 border-t border-b border-border"
                style={{ gridTemplateColumns: "28px 1fr 80px 72px", gap: "12px", color: "var(--muted)" }}>
                <span />
                <span>Task</span>
                <span className="text-right">Owner</span>
                <span className="text-right">Due</span>
            </div>

            {/* Open items */}
            {OPEN.map((c, i) => (
                <div key={c.id}
                    className={`enter-x d-${i + 1} grid items-center px-4 py-3.5 border-b border-border border-l-2 border-l-accent transition-colors duration-100 hover:bg-surface`}
                    style={{ gridTemplateColumns: "28px 1fr 80px 72px", gap: "12px" }}>
                    <button
                        className="w-4 h-4 rounded-sm border transition-all duration-150 flex items-center justify-center shrink-0"
                        style={{ borderColor: "var(--border-col)" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-col)")} />
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{c.description}</span>
                    <span className="text-xs font-mono text-right" style={{ color: "var(--muted)" }}>@{c.owner}</span>
                    <span className="text-xs font-mono text-right" style={{ color: "var(--muted)" }}>{c.deadline}</span>
                </div>
            ))}

            {/* Completed */}
            <details className="mt-6">
                <summary className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest cursor-pointer select-none mb-3 transition-colors hover:text-accent"
                    style={{ color: "var(--muted)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>expand_more</span>
                    Completed · {DONE.length}
                </summary>
                {DONE.map(c => (
                    <div key={c.id}
                        className="grid items-center px-4 py-3 border-b border-border border-l-2 opacity-40"
                        style={{ gridTemplateColumns: "28px 1fr 80px 72px", gap: "12px", borderLeftColor: "var(--border-col)" }}>
                        <div className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ background: "#34D399" }}>
                            <span className="material-symbols-outlined text-white" style={{ fontSize: "11px" }}>check</span>
                        </div>
                        <span className="text-sm line-through" style={{ color: "var(--muted)" }}>{c.description}</span>
                        <span className="text-xs font-mono text-right" style={{ color: "var(--muted)" }}>@{c.owner}</span>
                        <span className="text-xs font-mono text-right" style={{ color: "var(--muted)" }}>{c.completedAt}</span>
                    </div>
                ))}
            </details>
        </main>
    );
}
