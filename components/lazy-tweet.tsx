"use client";

import { useInView } from "framer-motion";
import { useRef } from "react";
import { Tweet } from "react-tweet";

interface LazyTweetProps {
	id: string;
}

export function LazyTweet({ id }: LazyTweetProps) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: "400px" });

	return (
		<div ref={ref} className="w-full min-h-[250px] flex justify-center">
			{isInView ? <Tweet id={id} /> : null}
		</div>
	);
}
