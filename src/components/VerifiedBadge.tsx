/**
 * VerifiedBadge — the checkmark shown next to a verified seller's name.
 * Solid bright green circle, white tick. Single source so it can't drift
 * out of sync between the seller card, store page, admin panel, etc.
 */
interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className = "h-4 w-4" }: VerifiedBadgeProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verified seller"
      className={`shrink-0 ${className}`}
    >
      <circle cx="12" cy="12" r="10" fill="#22C55E" />
      <path
        d="M8.5 12.6l2.4 2.4 5-5.6"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
