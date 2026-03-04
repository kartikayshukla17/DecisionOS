"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const JADE = "#34D399";
const BG = "#09090B";
const SURF = "#111916";
const BORDER = "rgba(52,211,153,0.1)";
const TEXT = "#E8F0EB";
const MUTED = "#5A6E63";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function GitHubCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Connecting GitHub…");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
            setStatus("error");
            setMessage("No OAuth code received from GitHub.");
            return;
        }

        async function connect() {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    setStatus("error");
                    setMessage("Not authenticated. Please sign in first.");
                    return;
                }

                const res = await fetch(`${API_BASE}/integrations/github/connect`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        code,
                        redirectUri: window.location.origin + window.location.pathname,
                        data_range_days: parseInt(localStorage.getItem("dos-github-range") ?? "30", 10),
                    }),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message ?? "Connection failed.");
                }

                setStatus("success");
                setMessage("GitHub connected! Backfilling your decisions…");

                // Redirect after short success display
                setTimeout(() => router.push("/dashboard"), 1800);
            } catch (e: any) {
                setStatus("error");
                setMessage(e.message ?? "Something went wrong.");
            }
        }

        connect();
    }, [router]);

    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ background: BG, color: TEXT, fontFamily: "var(--font-body)" }}
        >
            <div className="flex flex-col items-center gap-4 text-center px-4">

                {/* Icon */}
                <span
                    className="material-symbols-outlined text-5xl"
                    style={{
                        color: status === "error" ? "#EF4444" : status === "success" ? "#22C55E" : JADE,
                        animation: status === "loading" ? "spin 1.5s linear infinite" : "none",
                    }}
                >
                    {status === "error" ? "error" : status === "success" ? "check_circle" : "sync"}
                </span>

                {/* Status text */}
                <h2
                    className="font-display font-bold text-xl"
                    style={{ color: TEXT }}
                >
                    {status === "error" ? "Connection Failed" : status === "success" ? "Connected!" : "Connecting GitHub"}
                </h2>
                <p className="text-sm max-w-xs" style={{ color: MUTED }}>{message}</p>

                {/* Error: retry */}
                {status === "error" && (
                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={() => router.push("/onboarding")}
                            className="text-sm font-mono px-5 py-2.5 transition-all"
                            style={{ background: JADE, color: BG }}
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="text-sm font-mono px-5 py-2.5 transition-all"
                            style={{ border: `1px solid ${BORDER}`, color: MUTED }}
                        >
                            Skip
                        </button>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
