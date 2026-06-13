"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./ui";

/** Salin tautan undangan ke clipboard. `path` relatif terhadap origin. */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : "Salin tautan"}
    </Button>
  );
}
