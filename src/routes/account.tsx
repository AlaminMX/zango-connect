/**
 * account.tsx — Buyer "account" is just the wishlist in MVP.
 * The full account experience is disabled while authentication is hidden;
 * this route redirects to /wishlist so existing links stay alive.
 */
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/account")({
  component: () => <Navigate to="/wishlist" replace />,
});
