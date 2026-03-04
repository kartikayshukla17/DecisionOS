"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "dos-theme";

export function useThemeToggle() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        // Read preference from localStorage on mount
        const stored = localStorage.getItem(STORAGE_KEY);
        const prefersDark = stored
            ? stored === "dark"
            : window.matchMedia("(prefers-color-scheme: dark)").matches;
        setDark(prefersDark);
        document.documentElement.classList.toggle("dark", prefersDark);
    }, []);

    function toggle() {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    }

    return { dark, toggle };
}
