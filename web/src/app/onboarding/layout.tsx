export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#09090B",
                color: "#FAFAF9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-body)",
            }}
        >
            {children}
        </div>
    );
}
