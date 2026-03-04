"use client";

import { useState } from "react";
import Link from "next/link";
import { useDecisions, useActionItems } from "@/hooks/useDecisions";
import type { ActionItem } from "@/hooks/useDecisions";
import { AddDecisionModal } from "@/components/AddDecisionModal";

const STATUS: Record<string, { label: string; cls: string; color: string }> = {
  critical: { label: "Critical", cls: "status-critical border-critical", color: "#F87171" },
  pending: { label: "Pending", cls: "status-pending border-pending", color: "#FB923C" },
  approved: { label: "Approved", cls: "status-approved border-approved", color: "#34D399" },
  resolved: { label: "Resolved", cls: "status-resolved border-approved", color: "#5A6E63" },
};

const PLATFORM_ICON: Record<string, string> = {
  github: "code", gmail: "mail", calendar: "calendar_month", manual: "edit_note", slack: "chat",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function DashboardPage() {
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  const { data: decisions, isLoading, isError } = useDecisions();
  const { data: actionItems, isLoading: actionsLoading } = useActionItems();

  const sorted = [...(decisions ?? [])].sort((a, b) => {
    const o: Record<string, number> = { critical: 0, pending: 1, approved: 2, resolved: 3 };
    return (o[a.status] ?? 9) - (o[b.status] ?? 9);
  });

  const ACTION_STYLE: Record<string, { color: string; icon: string; label: string }> = {
    review_request: { color: "#F87171", icon: "rate_review", label: "Review PR" },
    assigned_issue: { color: "#FB923C", icon: "assignment_ind", label: "Assigned" },
    mention: { color: "#5A6E63", icon: "alternate_email", label: "Mentioned" },
    changes_requested: { color: "#F87171", icon: "edit", label: "Changes Req" },
    ready_to_merge: { color: "#34D399", icon: "done_all", label: "Ready to Merge" },
  };

  return (
    <main className="max-w-2xl mx-auto px-4 pt-6 pb-32">

      {/* ─── ACTION ITEMS ─── */}
      {!actionsLoading && (actionItems ?? []).length > 0 && (
        <section className="mb-6">
          <button
            onClick={() => setActionsCollapsed(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-b border-border text-xs font-mono uppercase tracking-widest transition-colors hover:bg-surface"
            style={{ color: "var(--muted)", background: "var(--surface)" }}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--accent)" }}>notifications_active</span>
              Action Items
            </span>
            <span className="flex items-center gap-2">
              <span style={{ color: "var(--accent)" }}>{actionItems?.length ?? 0} items</span>
              <span className="material-symbols-outlined" style={{ fontSize: "16px", transition: "transform 0.15s", transform: actionsCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                expand_more
              </span>
            </span>
          </button>

          {!actionsCollapsed && (
            <div className="flex flex-col">
              {actionItems?.map((item: ActionItem, i: number) => {
                const style = ACTION_STYLE[item.type] ?? ACTION_STYLE.mention;
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border border-l-2 transition-colors duration-100 hover:bg-surface enter-x d-${Math.min(i + 1, 8)}`}
                    style={{ borderLeftColor: style.color, textDecoration: "none" }}
                  >
                    <span className="material-symbols-outlined mt-0.5" style={{ fontSize: "16px", color: style.color }}>
                      {style.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {item.title}
                      </p>
                      <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                        {item.repo}
                        {item.author ? ` · by ${item.author}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {item.user_role && item.user_role !== "unknown" && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm uppercase tracking-wide border"
                            style={{
                              color: "var(--accent)",
                              borderColor: "var(--accent)",
                              opacity: 0.8,
                              background: "rgba(52,211,153,0.1)"
                            }}
                          >
                            {item.user_role}
                          </span>
                        )}
                        <span className="text-xs font-mono" style={{ color: style.color }}>{style.label}</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums" style={{ color: "var(--muted)" }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      )}

      {actionsLoading && (
        <div className="mb-6 border-t border-border">
          <div className="px-4 py-2.5 text-xs font-mono uppercase tracking-widest" style={{ color: "var(--muted)", background: "var(--surface)" }}>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--accent)", animation: "spin 1.5s linear infinite" }}>sync</span>
              Loading action items…
            </span>
          </div>
        </div>
      )}

      {!actionsLoading && (actionItems ?? []).length === 0 && actionItems !== undefined && (
        <div className="mb-6 px-4 py-3 border border-dashed border-border rounded-sm text-center">
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            ✨ All caught up — no pending GitHub items
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: "var(--foreground)", fontVariationSettings: "'wdth' 105" }}>
          Decision Queue
        </h1>
        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
          {isLoading ? "…" : `${sorted.length} total`}
        </span>
      </div>

      {/* Column headers */}
      {!isLoading && !isError && sorted.length > 0 && (
        <div className="grid text-xs font-mono uppercase tracking-widest px-4 py-2 border-t border-b border-border"
          style={{ gridTemplateColumns: "76px 1fr 64px 36px", gap: "12px", color: "var(--muted)" }}>
          <span>Status</span><span>Decision</span><span>Source</span><span className="text-right">Age</span>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-0.5 border-t border-border">
          {[0.7, 0.55, 0.4, 0.25].map((op, i) => (
            <div key={i} className="h-12 skeleton border-l-2 border-border" style={{ opacity: op }} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="p-4 text-xs font-mono border border-red-500/30 bg-red-500/5 mt-4" style={{ color: "#F87171" }}>
          Failed to load decisions — check your API connection.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border mt-4">
          <span className="material-symbols-outlined text-5xl mb-4" style={{ color: "var(--muted)", fontSize: "48px" }}>inbox</span>
          <p className="font-display font-semibold text-xl mb-1.5 tracking-tight" style={{ color: "var(--foreground)" }}>
            No decisions yet
          </p>
          <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--muted)" }}>
            Connect GitHub in Settings, or paste a decision manually to get started.
          </p>
          <button onClick={() => setModal(true)}
            className="text-sm font-semibold px-5 py-2.5 rounded-sm transition-all duration-150 hover:opacity-85"
            style={{ background: "var(--accent)", color: "#0A0F0D" }}>
            + Add manually
          </button>
        </div>
      )}

      {/* Decision rows */}
      <div className="flex flex-col">
        {sorted.map((d, i) => {
          const s = STATUS[d.status] ?? { label: d.status, cls: "", color: "var(--muted)" };
          const open = expanded === d.id;
          return (
            <div key={d.id}
              className={`enter-x border-b border-border d-${Math.min(i + 1, 8)}`}>
              {/* Collapsed row */}
              <button
                onClick={() => setExpanded(open ? null : d.id)}
                className="w-full grid items-center px-4 py-3.5 text-left transition-colors duration-100 hover:bg-surface border-l-2"
                style={{ gridTemplateColumns: "76px 1fr 64px 36px", gap: "12px", borderLeftColor: s.color }}>
                <span className="text-xs font-mono font-medium" style={{ color: s.color }}>{s.label}</span>
                <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{d.title}</span>
                <span className="flex items-center gap-1 text-xs font-mono" style={{ color: "var(--muted)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>{PLATFORM_ICON[d.source_platform] ?? "circle"}</span>
                  <span className="hidden sm:inline">{d.source_platform}</span>
                </span>
                <span className="text-xs font-mono text-right tabular-nums" style={{ color: "var(--muted)" }}>
                  {timeAgo(d.created_at)}
                </span>
              </button>

              {/* Expanded panel */}
              {open && (
                <div className="px-4 pb-4 pt-2 bg-surface border-l-2" style={{ borderLeftColor: s.color }}>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
                    {d.summary}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    {d.source_url && (
                      <a href={d.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-mono flex items-center gap-1.5 transition-colors duration-150 hover:opacity-70"
                        style={{ color: "var(--accent)" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>open_in_new</span>
                        Open source
                      </a>
                    )}
                    <Link href={`/dashboard/decision/${d.id}`}
                      className="text-xs font-mono transition-colors duration-150 hover:text-accent"
                      style={{ color: "var(--muted)" }}>
                      Full detail →
                    </Link>
                    {d.status === "pending" && (
                      <button className="ml-auto text-xs font-semibold px-4 py-1.5 rounded-sm transition-all duration-150 hover:opacity-85"
                        style={{ background: "var(--accent)", color: "#0A0F0D" }}>
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={() => setModal(true)}
        className="fixed bottom-20 right-5 z-40 w-12 h-12 flex items-center justify-center rounded-sm transition-all duration-150 hover:scale-105 hover:opacity-90"
        style={{
          background: "var(--accent)",
          color: "#0A0F0D",
          boxShadow: "0 0 0 1px rgba(52,211,153,0.3), 0 8px 32px rgba(52,211,153,0.2)",
        }}
        title="Add Decision">
        <span className="material-symbols-outlined text-xl">add</span>
      </button>

      <AddDecisionModal open={modal} onClose={() => setModal(false)} />
    </main>
  );
}
