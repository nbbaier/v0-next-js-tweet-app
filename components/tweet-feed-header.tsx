import { ThemeToggle } from "@/components/theme-toggle";

export function TweetFeedHeader() {
	return (
		<div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto max-w-[550px] py-6 flex justify-between items-center">
				<h1 className="text-3xl font-bold tracking-tight">Tweet Feed</h1>
				<ThemeToggle />
			</div>
		</div>
	);
}
