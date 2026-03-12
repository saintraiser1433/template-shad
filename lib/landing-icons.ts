import type { LucideIcon } from "lucide-react"
import {
  Users,
  HandCoins,
  FileCheck,
  Shield,
  Banknote,
  PiggyBank,
  Scale,
  Building2,
  Wallet,
  BadgeCheck,
  HeartHandshake,
  TrendingUp,
} from "lucide-react"

/**
 * Icon keys stored in DB; must match keys in FEATURE_ICON_OPTIONS and FEATURE_ICON_MAP.
 */
export const FEATURE_ICON_KEYS = [
  "users",
  "hand-coins",
  "file-check",
  "shield",
  "banknote",
  "piggy-bank",
  "scale",
  "building2",
  "wallet",
  "badge-check",
  "heart-handshake",
  "trending-up",
] as const

export type FeatureIconKey = (typeof FEATURE_ICON_KEYS)[number]

export const FEATURE_ICON_MAP: Record<FeatureIconKey, LucideIcon> = {
  users: Users,
  "hand-coins": HandCoins,
  "file-check": FileCheck,
  shield: Shield,
  banknote: Banknote,
  "piggy-bank": PiggyBank,
  scale: Scale,
  building2: Building2,
  wallet: Wallet,
  "badge-check": BadgeCheck,
  "heart-handshake": HeartHandshake,
  "trending-up": TrendingUp,
}

/** Options for the admin icon picker: key + label. */
export const FEATURE_ICON_OPTIONS: { value: FeatureIconKey; label: string }[] = [
  { value: "users", label: "Users" },
  { value: "hand-coins", label: "Hand coins" },
  { value: "file-check", label: "File check" },
  { value: "shield", label: "Shield" },
  { value: "banknote", label: "Banknote" },
  { value: "piggy-bank", label: "Piggy bank" },
  { value: "scale", label: "Scale" },
  { value: "building2", label: "Building" },
  { value: "wallet", label: "Wallet" },
  { value: "badge-check", label: "Badge check" },
  { value: "heart-handshake", label: "Handshake" },
  { value: "trending-up", label: "Trending up" },
]

const DEFAULT_ICON: FeatureIconKey = "users"

export function getFeatureIcon(key: string | undefined | null): LucideIcon {
  if (!key || !(key in FEATURE_ICON_MAP)) return FEATURE_ICON_MAP[DEFAULT_ICON]
  return FEATURE_ICON_MAP[key as FeatureIconKey] ?? FEATURE_ICON_MAP[DEFAULT_ICON]
}
