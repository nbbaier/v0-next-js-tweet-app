"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        aria-hidden="true"
        className="opacity-0"
        size="icon"
        tabIndex={-1}
        variant="ghost"
      >
        <Sun aria-hidden="true" className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      size="icon"
      variant="ghost"
    >
      <Sun
        aria-hidden="true"
        className="h-5 w-5 rotate-0 scale-100 transition-[transform,opacity] dark:-rotate-90 dark:scale-0"
      />
      <Moon
        aria-hidden="true"
        className="absolute h-5 w-5 rotate-90 scale-0 transition-[transform,opacity] dark:rotate-0 dark:scale-100"
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
