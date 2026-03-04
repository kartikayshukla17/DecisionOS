"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
}

export interface Decision {
    id: string;
    title: string;
    summary: string;
    status: "pending" | "approved" | "critical";
    source_platform: "github" | "gmail" | "calendar" | "manual" | "slack";
    source_url: string | null;
    created_at: string;
    commitments?: Array<{
        id: string;
        description: string;
        owner_name: string;
        status: "open" | "completed" | "blocked" | "canceled";
    }>;
}

// ── Fetch the decision queue ─────────────────────────────────────

async function fetchDecisionQueue(): Promise<Decision[]> {
    const token = await getToken();
    if (!token) return [];

    const res = await fetch(`${API_BASE}/decisions/queue`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch decisions");
    return res.json();
}

export function useDecisions() {
    return useQuery({
        queryKey: ["decisions", "queue"],
        queryFn: fetchDecisionQueue,
        staleTime: 30_000, // 30 seconds
        refetchOnWindowFocus: true,
    });
}

// ── Create a manual decision ─────────────────────────────────────

export interface CreateDecisionInput {
    title: string;
    description: string;
    status?: "pending" | "approved" | "critical";
    source_url?: string;
}

async function createDecision(input: CreateDecisionInput): Promise<Decision> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/decisions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to create decision");
    }
    return res.json();
}

export function useCreateDecision() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDecision,
        onSuccess: () => {
            // Invalidate and refetch the decision queue
            queryClient.invalidateQueries({ queryKey: ["decisions", "queue"] });
        },
    });
}

// ── Fetch onboarding status ──────────────────────────────────────

export interface OnboardingStatus {
    onboarding_completed: boolean;
    github_connected: boolean;
    gmail_connected: boolean;
    calendar_connected: boolean;
}

async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch onboarding status");
    return res.json();
}

export function useOnboardingStatus() {
    return useQuery({
        queryKey: ["onboarding", "status"],
        queryFn: fetchOnboardingStatus,
        staleTime: 60_000,
    });
}

// ── Fetch integration status ─────────────────────────────────────

async function fetchIntegrations() {
    const token = await getToken();
    const res = await fetch(`${API_BASE}/integrations/github/status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
}

export function useIntegrations() {
    return useQuery({
        queryKey: ["integrations"],
        queryFn: fetchIntegrations,
    });
}

// ── Fetch GitHub action items ────────────────────────────────

export interface ActionItem {
    id: string;
    type: 'review_request' | 'assigned_issue' | 'mention' | 'changes_requested' | 'ready_to_merge';
    title: string;
    repo: string;
    url: string;
    author: string;
    created_at: string;
    urgency: 'high' | 'medium' | 'low';
    user_role: 'admin' | 'maintainer' | 'writer' | 'reader' | 'unknown';
}

async function fetchActionItems(): Promise<ActionItem[]> {
    const token = await getToken();
    if (!token) return [];

    const res = await fetch(`${API_BASE}/github/action-items`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
}

export function useActionItems() {
    return useQuery({
        queryKey: ["github", "action-items"],
        queryFn: fetchActionItems,
        staleTime: 60_000,
        refetchOnWindowFocus: true,
    });
}
