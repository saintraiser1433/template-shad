"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import type { LandingSettings, LandingFeature } from "@/lib/landing-defaults"
import { DEFAULT_FEATURES } from "@/lib/landing-defaults"
import { FEATURE_ICON_OPTIONS } from "@/lib/landing-icons"
import { GripVertical, Trash2, Plus } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL_KEYS: (keyof LandingSettings)[] = [
  "heroTitle", "heroTitleHighlight", "heroDescription", "ctaPrimaryText", "ctaSecondaryText",
  "featuresTitle", "featuresSubtitle",
  "ctaSectionTitle", "ctaSectionDescription", "footerText",
]

function getInitialFeatures(initial: LandingSettings | null): LandingFeature[] {
  if (initial?.features && Array.isArray(initial.features) && initial.features.length > 0) {
    return initial.features.map((f) => ({
      title: typeof f.title === "string" ? f.title : "",
      description: typeof f.description === "string" ? f.description : "",
      icon: typeof (f as { icon?: string }).icon === "string" ? (f as { icon: string }).icon : "users",
    }))
  }
  return DEFAULT_FEATURES.map((f) => ({ ...f }))
}

export function LandingSettingsForm({ initial }: { initial: LandingSettings | null }) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [features, setFeatures] = useState<LandingFeature[]>(() => getInitialFeatures(initial))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const key of ALL_KEYS) {
      const v = initial?.[key]
      next[key] = v ?? ""
    }
    setForm(next)
    setFeatures(getInitialFeatures(initial))
  }, [initial])

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateFeature(index: number, field: "title" | "description" | "icon", value: string) {
    setFeatures((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addFeature() {
    setFeatures((prev) => [...prev, { title: "", description: "", icon: "users" }])
  }

  function removeFeature(index: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const body: LandingSettings & { features?: LandingFeature[] } = {}
      for (const key of ALL_KEYS) {
        const v = form[key]?.trim()
        body[key as keyof LandingSettings] = v === "" ? null : v
      }
      body.features = features.filter((f) => f.title.trim() || f.description.trim()).map((f) => ({
        title: f.title.trim() || "Feature",
        description: f.description.trim() || "",
        icon: f.icon?.trim() || "users",
      }))
      if (body.features.length === 0) body.features = DEFAULT_FEATURES
      const res = await fetch("/api/admin/landing-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save")
        return
      }
      toast.success("Landing page settings saved.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hero section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="heroTitle">Hero title (line 1)</FieldLabel>
            <Input
              id="heroTitle"
              value={form.heroTitle ?? ""}
              onChange={(e) => update("heroTitle", e.target.value)}
              placeholder="e.g. Muslim Christian Fisherfolks"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="heroTitleHighlight">Hero title highlight (line 2)</FieldLabel>
            <Input
              id="heroTitleHighlight"
              value={form.heroTitleHighlight ?? ""}
              onChange={(e) => update("heroTitleHighlight", e.target.value)}
              placeholder="e.g. Multi-Purpose Cooperative"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="heroDescription">Hero description</FieldLabel>
            <Textarea
              id="heroDescription"
              value={form.heroDescription ?? ""}
              onChange={(e) => update("heroDescription", e.target.value)}
              placeholder="Short tagline under the title"
              rows={3}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ctaPrimaryText">Primary button text</FieldLabel>
            <Input
              id="ctaPrimaryText"
              value={form.ctaPrimaryText ?? ""}
              onChange={(e) => update("ctaPrimaryText", e.target.value)}
              placeholder="e.g. Login to your account"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ctaSecondaryText">Secondary button text</FieldLabel>
            <Input
              id="ctaSecondaryText"
              value={form.ctaSecondaryText ?? ""}
              onChange={(e) => update("ctaSecondaryText", e.target.value)}
              placeholder="e.g. Member portal"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Features section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="featuresTitle">Section title</FieldLabel>
            <Input
              id="featuresTitle"
              value={form.featuresTitle ?? ""}
              onChange={(e) => update("featuresTitle", e.target.value)}
              placeholder="e.g. Why MCFMP Cooperative"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="featuresSubtitle">Section subtitle</FieldLabel>
            <Textarea
              id="featuresSubtitle"
              value={form.featuresSubtitle ?? ""}
              onChange={(e) => update("featuresSubtitle", e.target.value)}
              rows={2}
              placeholder="Intro paragraph for the features"
            />
          </Field>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Feature items</span>
              <Button type="button" variant="outline" size="sm" onClick={addFeature} className="gap-1">
                <Plus className="size-4" />
                Add feature
              </Button>
            </div>
            {features.map((f, i) => (
              <div key={i} className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex shrink-0 items-center text-muted-foreground">
                  <GripVertical className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Feature title"
                      value={f.title}
                      onChange={(e) => updateFeature(i, "title", e.target.value)}
                      className="flex-1 min-w-[140px]"
                    />
                    <Select
                      value={f.icon ?? "users"}
                      onValueChange={(v) => updateFeature(i, "icon", v)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEATURE_ICON_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Feature description"
                    value={f.description}
                    onChange={(e) => updateFeature(i, "description", e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFeature(i)}
                  className="shrink-0 text-destructive hover:text-destructive"
                  aria-label="Remove feature"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bottom CTA & footer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="ctaSectionTitle">CTA section title</FieldLabel>
            <Input
              id="ctaSectionTitle"
              value={form.ctaSectionTitle ?? ""}
              onChange={(e) => update("ctaSectionTitle", e.target.value)}
              placeholder="e.g. Ready to manage your cooperative account?"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="ctaSectionDescription">CTA section description</FieldLabel>
            <Input
              id="ctaSectionDescription"
              value={form.ctaSectionDescription ?? ""}
              onChange={(e) => update("ctaSectionDescription", e.target.value)}
              placeholder="e.g. Sign in to apply for loans..."
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="footerText">Footer text</FieldLabel>
            <Textarea
              id="footerText"
              value={form.footerText ?? ""}
              onChange={(e) => update("footerText", e.target.value)}
              rows={2}
              placeholder="Footer line"
            />
          </Field>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save landing page settings"}
      </Button>
    </form>
  )
}
