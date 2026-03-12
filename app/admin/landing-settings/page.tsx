import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ModuleHeader } from "@/components/module-header"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { LandingSettingsForm } from "./LandingSettingsForm"
import type { LandingSettings, LandingFeature } from "@/lib/landing-defaults"

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

export default async function LandingSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const row = await prisma.landingPageSettings.findUnique({
    where: { id: "singleton" },
  })

  const initial: LandingSettings = row
    ? {
        heroTitle: row.heroTitle,
        heroTitleHighlight: row.heroTitleHighlight,
        heroDescription: row.heroDescription,
        ctaPrimaryText: row.ctaPrimaryText,
        ctaSecondaryText: row.ctaSecondaryText,
        featuresTitle: row.featuresTitle,
        featuresSubtitle: row.featuresSubtitle,
        features: parseFeatures(row.features),
        feature1Title: row.feature1Title,
        feature1Description: row.feature1Description,
        feature2Title: row.feature2Title,
        feature2Description: row.feature2Description,
        feature3Title: row.feature3Title,
        feature3Description: row.feature3Description,
        feature4Title: row.feature4Title,
        feature4Description: row.feature4Description,
        ctaSectionTitle: row.ctaSectionTitle,
        ctaSectionDescription: row.ctaSectionDescription,
        footerText: row.footerText,
      }
    : {}

  return (
    <DashboardLayout>
      <ModuleHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/activity-log">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Landing page</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Landing page settings</h1>
          <p className="text-sm text-muted-foreground">
            Edit the text shown on the public landing page (hero, features, CTA, footer). Leave a field empty to use the default.
          </p>
        </div>
        <LandingSettingsForm initial={initial} />
      </div>
    </DashboardLayout>
  )
}
