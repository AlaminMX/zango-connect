import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { captureAttribution } from "@/lib/attribution";

// Remember the ?ref= tag from the landing URL before any navigation can drop it.
// Only touches browser storage, never the DOM, so it can't affect hydration.
captureAttribution();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
