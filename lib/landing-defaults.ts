/**
 * Default copy for the landing page when no settings are stored.
 * Keep in sync with app/page.tsx fallbacks.
 */
export const DEFAULT_LANDING = {
  heroTitle: "Muslim Christian Fisherfolks",
  heroTitleHighlight: "Multi-Purpose Cooperative",
  heroDescription:
    "Money Lending and Management System — fair credit and Capital Build Up (CBU) for members in good standing.",
  ctaPrimaryText: "Login to your account",
  ctaSecondaryText: "Member portal",
  featuresTitle: "Why MCFMP Cooperative",
  featuresSubtitle:
    "Only members of good standing can avail our credit services. We use the 5C's of credit (Character, Capacity, Capital, Collateral, Conditions) to ensure responsible lending.",
  feature1Title: "Members in good standing",
  feature1Description:
    "Bona fide regular members with at least ₱20,000 Capital Build Up (CBU) can access our loan products.",
  feature2Title: "Multiple loan types",
  feature2Description:
    "Membership, Micro, Regular, Production, Short Term, Long Term, and Educational loans with clear terms and fair rates.",
  feature3Title: "Structured process",
  feature3Description:
    "From application and CI/BI to Manager or Committee approval, funding, and release — all tracked in one system.",
  feature4Title: "Transparent and secure",
  feature4Description:
    "7-day grace period after due date with no penalty. Loan renewal available when at least 70% of the loan is paid; balance is deducted upon renewal.",
  ctaSectionTitle: "Ready to manage your cooperative account?",
  ctaSectionDescription: "Sign in to apply for loans, view your CBU, and track payments.",
  footerText:
    "MCFMP-CMLMS — Muslim Christian Fisherfolks Multi-Purpose Cooperative Money Lending and Management System",
} as const

export type LandingFeature = { title: string; description: string; icon?: string | null }

export const DEFAULT_FEATURES: LandingFeature[] = [
  { title: DEFAULT_LANDING.feature1Title, description: DEFAULT_LANDING.feature1Description, icon: "users" },
  { title: DEFAULT_LANDING.feature2Title, description: DEFAULT_LANDING.feature2Description, icon: "hand-coins" },
  { title: DEFAULT_LANDING.feature3Title, description: DEFAULT_LANDING.feature3Description, icon: "file-check" },
  { title: DEFAULT_LANDING.feature4Title, description: DEFAULT_LANDING.feature4Description, icon: "shield" },
]

export type LandingSettings = {
  heroTitle?: string | null
  heroTitleHighlight?: string | null
  heroDescription?: string | null
  ctaPrimaryText?: string | null
  ctaSecondaryText?: string | null
  featuresTitle?: string | null
  featuresSubtitle?: string | null
  features?: LandingFeature[] | null
  feature1Title?: string | null
  feature1Description?: string | null
  feature2Title?: string | null
  feature2Description?: string | null
  feature3Title?: string | null
  feature3Description?: string | null
  feature4Title?: string | null
  feature4Description?: string | null
  ctaSectionTitle?: string | null
  ctaSectionDescription?: string | null
  footerText?: string | null
}
