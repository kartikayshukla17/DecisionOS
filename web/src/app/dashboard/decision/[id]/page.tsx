import Link from "next/link";

export default function DecisionDetailPage() {
    return (
        <main className="w-full max-w-2xl relative mx-auto my-12 pt-8 pb-32 px-4">
            <div className="glass-panel relative overflow-hidden">
                {/* Header Section */}
                <div className="border-b border-primary/20 p-4 flex items-center justify-between bg-primary/5">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-sm">
                            task_alt
                        </span>
                        <span className="font-mono text-xs uppercase tracking-widest text-primary/70">
                            Decision Detail
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 border border-primary/30 bg-primary/10 rounded-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary glow-dot"></div>
                            <span className="font-mono text-xs font-bold text-primary">
                                Approved
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100 leading-none">
                            Migrate API from REST to GraphQL
                        </h1>
                        <div className="h-1 w-16 bg-primary mt-4 rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <span className="material-symbols-outlined text-primary/40 mt-1">
                                notes
                            </span>
                            <p className="text-lg text-slate-300 font-light leading-relaxed">
                                We agreed that the current REST endpoints are too slow for the new dashboard features. The overhead of multiple round-trips is causing noticeable latency in client-side rendering.
                            </p>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-8 border-t border-primary/10">
                        <div className="space-y-1">
                            <p className="font-mono text-xs uppercase tracking-widest text-primary/50">
                                Source
                            </p>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-100" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                                </svg>
                                <span className="font-mono text-sm text-slate-100">GitHub</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="font-mono text-xs uppercase tracking-widest text-primary/50">
                                When
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-primary/40">
                                    schedule
                                </span>
                                <span className="font-mono text-sm text-slate-100">2 hours ago</span>
                            </div>
                        </div>
                        <div className="space-y-1 col-span-2 md:col-span-1">
                            <p className="font-mono text-xs uppercase tracking-widest text-primary/50">
                                Priority
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-primary/40">
                                    priority_high
                                </span>
                                <span className="font-mono text-sm text-slate-100">Critical Path</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer/Actions Section */}
                <div className="flex divide-x divide-primary/20 border-t border-primary/20 bg-primary/5">
                    <button className="flex-1 py-4 flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors group">
                        <span className="material-symbols-outlined text-primary/60 group-hover:text-primary">
                            open_in_new
                        </span>
                        <span className="font-mono text-xs font-bold tracking-widest uppercase text-primary/70 group-hover:text-primary">
                            View Thread
                        </span>
                    </button>
                    <button className="flex-1 py-4 flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors group">
                        <span className="material-symbols-outlined text-primary/60 group-hover:text-primary">
                            share
                        </span>
                        <span className="font-mono text-xs font-bold tracking-widest uppercase text-primary/70 group-hover:text-primary">
                            Share
                        </span>
                    </button>
                </div>
            </div>
        </main>
    );
}
