"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TweetSubmitForm } from "./tweet-submit-form";

export function AddTweetDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Tweet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Tweet</DialogTitle>
        </DialogHeader>
        <TweetSubmitForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
