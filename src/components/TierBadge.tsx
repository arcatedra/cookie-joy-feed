import {
  TIER_ICON,
  TIER_LABEL,
  type DonationTier,
} from "@/lib/donation-tier";

interface TierBadgeProps {
  tier: DonationTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-xs",
  lg: "px-4 py-1.5 text-sm",
} as const;

export function TierBadge({ tier, size = "md", className = "" }: TierBadgeProps) {
  return (
    <span
      className={`tier-badge tier-${tier} inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-[0.12em] ${SIZE_CLASSES[size]} ${className}`}
    >
      <span aria-hidden="true">{TIER_ICON[tier]}</span>
      <span>{TIER_LABEL[tier]}</span>
    </span>
  );
}
