import { ThemeToggle } from "@/components/theme-toggle";

export function TweetFeedHeader() {
	return (
		<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto py-6 flex justify-between items-center px-4">
				<h1 className="text-3xl font-bold tracking-tight">Tweet Feed</h1>
				<ThemeToggle />
			</div>
		</div>
	);
}
