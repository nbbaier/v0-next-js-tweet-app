"use client";

import { RealtimeProvider } from "@upstash/realtime/client";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<RealtimeProvider
			api={{
				url: "/api/realtime",
			}}
		>
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				enableSystem
				disableTransitionOnChange
			>
				{children}
			</ThemeProvider>
		</RealtimeProvider>
	);
}
