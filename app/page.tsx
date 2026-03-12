import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { DEFAULT_LANDING, DEFAULT_FEATURES } from "@/lib/landing-defaults"
import { getFeatureIcon } from "@/lib/landing-icons"
import type { LandingFeature } from "@/lib/landing-defaults"

function parseFeatures(json: unknown): LandingFeature[] | null {
  if (!Array.isArray(json)) return null
  const out: LandingFeature[] = []
  for (const item of json) {
    if (item && typeof item === "object" && "title" in item && "description" in item) {
      const icon = "icon" in item && typeof (item as { icon?: unknown }).icon === "string"
        ? (item as { icon: string }).icon
        : undefined
      out.push({
        title: String(item.title),
        description: String(item.description),
        ...(icon ? { icon } : {}),
      })
    }
  }
  return out.length > 0 ? out : null
}

export default async function LandingPage() {
  const row = await prisma.landingPageSettings.findUnique({
    where: { id: "singleton" },
  })

  const heroTitle = row?.heroTitle ?? DEFAULT_LANDING.heroTitle
  const heroTitleHighlight = row?.heroTitleHighlight ?? DEFAULT_LANDING.heroTitleHighlight
  const heroDescription = row?.heroDescription ?? DEFAULT_LANDING.heroDescription
  const ctaPrimaryText = row?.ctaPrimaryText ?? DEFAULT_LANDING.ctaPrimaryText
  const ctaSecondaryText = row?.ctaSecondaryText ?? DEFAULT_LANDING.ctaSecondaryText
  const featuresTitle = row?.featuresTitle ?? DEFAULT_LANDING.featuresTitle
  const featuresSubtitle = row?.featuresSubtitle ?? DEFAULT_LANDING.featuresSubtitle
  const featuresList = parseFeatures(row?.features) ?? DEFAULT_FEATURES
  const ctaSectionTitle = row?.ctaSectionTitle ?? DEFAULT_LANDING.ctaSectionTitle
  const ctaSectionDescription = row?.ctaSectionDescription ?? DEFAULT_LANDING.ctaSectionDescription
  const footerText = row?.footerText ?? DEFAULT_LANDING.footerText

  return (
    <div className="min-h-svh bg-gradient-to-b from-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex size-9 items-center justify-center rounded-full bg-white">
              <Image
                src="/logo.png"
                alt="MCFMP Cooperative logo"
                width={36}
                height={36}
                className="rounded-full"
                priority
              />
            </div>
            <span className="text-lg">MCFMP-CMLMS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild>
              <Link href="/login">{ctaPrimaryText}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 md:py-24">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {heroTitle}
            <br />
            <span className="text-primary">{heroTitleHighlight}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            {heroDescription}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild className="gap-2">
              <Link href="/login">
                {ctaPrimaryText}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">{ctaSecondaryText}</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-5xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            {featuresTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
            {featuresSubtitle}
          </p>
          <div className="mt-12 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {featuresList.map((f, i) => {
              const Icon = getFeatureIcon(f.icon)
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title || "Feature"}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm md:p-12">
          <h2 className="text-xl font-semibold sm:text-2xl">
            {ctaSectionTitle}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {ctaSectionDescription}
          </p>
          <Button size="lg" className="mt-6 gap-2" asChild>
            <Link href="/login">
              {ctaPrimaryText}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="mt-24 border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {footerText}
        </div>
      </footer>
    </div>
  )
}
