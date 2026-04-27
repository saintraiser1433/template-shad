"use client"

import { forwardRef, useImperativeHandle, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DocumentUploader } from "@/components/document-uploader"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  // I. CHARACTER
  char_creditBureau: z.enum(["SATISFACTORY", "ADVERSE", "NO_HISTORY"]).nullable().default(null),
  char_creditBureauNotes: z.string().optional(),
  char_priorDefault: z.enum(["NONE", "RESOLVED", "ACTIVE"]).nullable().default(null),
  char_priorDefaultNotes: z.string().optional(),
  char_employment: z.enum(["GT_2_YEARS", "1_2_YEARS", "LT_1_YEAR"]).nullable().default(null),
  char_employmentNotes: z.string().optional(),

  // II. CAPACITY
  cap_grossIncome: z.string().optional(),
  cap_grossIncomeRisk: z.enum(["HIGH", "MID", "LOW"]).nullable().default(null),
  cap_debtService: z.string().optional(),
  cap_debtServiceRisk: z.enum(["MANAGEABLE", "STRETCHED"]).nullable().default(null),
  cap_dtiRatio: z.string().optional(),
  cap_dtiRisk: z.enum(["LT_35", "36_45", "GT_45"]).nullable().default(null),

  // III. CAPITAL
  cap2_downPayment: z.string().optional(),
  cap2_downPaymentDetails: z.string().optional(),
  cap2_emergencySavings: z.enum(["3_6_MONTHS", "LT_3_MONTHS", "NONE"]).nullable().default(null),
  cap2_emergencySavingsDetails: z.string().optional(),

  // IV. COLLATERAL
  col_assetRealEstate: z.boolean().default(false),
  col_assetVehicle: z.boolean().default(false),
  col_assetEquipment: z.boolean().default(false),
  col_appraisedValue: z.string().optional(),
  col_marketability: z.enum(["HIGH", "MODERATE", "LOW"]).nullable().default(null),
  col_ownership: z.enum(["VERIFIED", "PENDING"]).nullable().default(null),
  col_ownershipDetails: z.string().optional(),

  // V. CONDITIONS
  cond_marketStability: z.enum(["GROWING", "STABLE", "DECLINING"]).nullable().default(null),
  cond_marketStabilityNotes: z.string().optional(),
  cond_interestRate: z.enum(["MINIMAL", "MODERATE", "HIGH"]).nullable().default(null),
  cond_interestRateNotes: z.string().optional(),

  // Investigator Recommendation
  rec_riskScore: z.string().optional(),
  rec_proposedAction: z.enum(["APPROVE", "DECLINE", "CONDITIONAL"]).nullable().default(null),
  rec_conditionsForApproval: z.string().optional(),

  // CI/BI result
  cibiPassed: z.boolean(),
})

type FormData = z.infer<typeof schema>

// ─── Serialize / Deserialize ─────────────────────────────────────────────────

function toNotes(data: FormData) {
  return {
    characterNotes: JSON.stringify({
      creditBureau: data.char_creditBureau,
      creditBureauNotes: data.char_creditBureauNotes,
      priorDefault: data.char_priorDefault,
      priorDefaultNotes: data.char_priorDefaultNotes,
      employment: data.char_employment,
      employmentNotes: data.char_employmentNotes,
    }),
    capacityNotes: JSON.stringify({
      grossIncome: data.cap_grossIncome,
      grossIncomeRisk: data.cap_grossIncomeRisk,
      debtService: data.cap_debtService,
      debtServiceRisk: data.cap_debtServiceRisk,
      dtiRatio: data.cap_dtiRatio,
      dtiRisk: data.cap_dtiRisk,
    }),
    capitalNotes: JSON.stringify({
      downPayment: data.cap2_downPayment,
      downPaymentDetails: data.cap2_downPaymentDetails,
      emergencySavings: data.cap2_emergencySavings,
      emergencySavingsDetails: data.cap2_emergencySavingsDetails,
    }),
    collateralNotes: JSON.stringify({
      assetRealEstate: data.col_assetRealEstate,
      assetVehicle: data.col_assetVehicle,
      assetEquipment: data.col_assetEquipment,
      appraisedValue: data.col_appraisedValue,
      marketability: data.col_marketability,
      ownership: data.col_ownership,
      ownershipDetails: data.col_ownershipDetails,
    }),
    conditionsNotes: JSON.stringify({
      marketStability: data.cond_marketStability,
      marketStabilityNotes: data.cond_marketStabilityNotes,
      interestRate: data.cond_interestRate,
      interestRateNotes: data.cond_interestRateNotes,
      riskScore: data.rec_riskScore,
      proposedAction: data.rec_proposedAction,
      conditionsForApproval: data.rec_conditionsForApproval,
    }),
  }
}

function fromNotes(defaults: {
  characterNotes: string
  capacityNotes: string
  capitalNotes: string
  collateralNotes: string
  conditionsNotes: string
  cibiPassed: boolean
}): FormData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ch: any = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ca: any = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cp: any = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let co: any = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cn: any = {}
  try { ch = JSON.parse(defaults.characterNotes) } catch { /* plain text or empty */ }
  try { ca = JSON.parse(defaults.capacityNotes) } catch { /* plain text or empty */ }
  try { cp = JSON.parse(defaults.capitalNotes) } catch { /* plain text or empty */ }
  try { co = JSON.parse(defaults.collateralNotes) } catch { /* plain text or empty */ }
  try { cn = JSON.parse(defaults.conditionsNotes) } catch { /* plain text or empty */ }

  return {
    char_creditBureau: ch.creditBureau ?? null,
    char_creditBureauNotes: ch.creditBureauNotes ?? "",
    char_priorDefault: ch.priorDefault ?? null,
    char_priorDefaultNotes: ch.priorDefaultNotes ?? "",
    char_employment: ch.employment ?? null,
    char_employmentNotes: ch.employmentNotes ?? "",

    cap_grossIncome: ca.grossIncome ?? "",
    cap_grossIncomeRisk: ca.grossIncomeRisk ?? null,
    cap_debtService: ca.debtService ?? "",
    cap_debtServiceRisk: ca.debtServiceRisk ?? null,
    cap_dtiRatio: ca.dtiRatio ?? "",
    cap_dtiRisk: ca.dtiRisk ?? null,

    cap2_downPayment: cp.downPayment ?? "",
    cap2_downPaymentDetails: cp.downPaymentDetails ?? "",
    cap2_emergencySavings: cp.emergencySavings ?? null,
    cap2_emergencySavingsDetails: cp.emergencySavingsDetails ?? "",

    col_assetRealEstate: co.assetRealEstate ?? false,
    col_assetVehicle: co.assetVehicle ?? false,
    col_assetEquipment: co.assetEquipment ?? false,
    col_appraisedValue: co.appraisedValue ?? "",
    col_marketability: co.marketability ?? null,
    col_ownership: co.ownership ?? null,
    col_ownershipDetails: co.ownershipDetails ?? "",

    cond_marketStability: cn.marketStability ?? null,
    cond_marketStabilityNotes: cn.marketStabilityNotes ?? "",
    cond_interestRate: cn.interestRate ?? null,
    cond_interestRateNotes: cn.interestRateNotes ?? "",

    rec_riskScore: cn.riskScore ?? "",
    rec_proposedAction: cn.proposedAction ?? null,
    rec_conditionsForApproval: cn.conditionsForApproval ?? "",

    cibiPassed: defaults.cibiPassed,
  }
}

// ─── UI helpers ─────────────────────────────────────────────────────────────

function RadioGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | null
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {options.map((opt) => (
        <label key={opt.value} className="flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="radio"
            className="size-3 accent-primary"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

function SectionTable({
  title,
  number,
  subtitle,
  col1Header,
  col2Header,
  col3Header,
  children,
}: {
  title: string
  number: number
  subtitle: string
  col1Header: string
  col2Header: string
  col3Header: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">
        {number}. {title}
      </h3>
      <p className="mb-2 mt-0.5 text-xs italic text-muted-foreground">{subtitle}</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-[32%] px-3 py-2 text-left font-medium">{col1Header}</th>
              <th className="w-[36%] px-3 py-2 text-left font-medium">{col2Header}</th>
              <th className="px-3 py-2 text-left font-medium">{col3Header}</th>
            </tr>
          </thead>
          <tbody className="divide-y">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

function TableRow({
  label,
  status,
  notes,
  labelElement,
}: {
  label?: string
  labelElement?: React.ReactNode
  status: React.ReactNode
  notes: React.ReactNode
}) {
  return (
    <tr className="align-top">
      <td className="px-3 py-2.5 text-xs">{labelElement ?? label}</td>
      <td className="px-3 py-2.5">{status}</td>
      <td className="px-3 py-2.5">{notes}</td>
    </tr>
  )
}

// ─── Props & Handle ──────────────────────────────────────────────────────────

type CIBIFormProps = {
  applicationId: string
  applicationNo: string
  memberName: string
  memberNo: string
  currentStatus: string
  defaultValues: {
    characterNotes: string
    capacityNotes: string
    capitalNotes: string
    collateralNotes: string
    conditionsNotes: string
    cibiPassed: boolean
  }
  hideActions?: boolean
}

export type CIBIFormHandle = {
  submit: () => void
  saveDraft: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export const CIBIForm = forwardRef<CIBIFormHandle, CIBIFormProps>(function CIBIForm(
  { applicationId, applicationNo, memberName, memberNo, currentStatus, defaultValues, hideActions = false },
  ref
) {
  const router = useRouter()
  const { data: session } = useSession()
  const [error, setError] = useState<string | null>(null)
  const collectorId = session?.user?.id ?? null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: fromNotes(defaultValues),
  })

  const w = watch()

  // ── Save draft ────────────────────────────────────────────────────────────

  async function saveDraft(data: FormData) {
    setError(null)
    const notes = toNotes(data)
    const res = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...notes,
        cibiPassed: data.cibiPassed,
        collectorId,
        status: currentStatus === "PENDING" ? "CIBI_REVIEW" : currentStatus,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Failed to save"); return }
    toast.success("Draft saved")
    window.dispatchEvent(new Event("activity-log-updated"))
    router.refresh()
  }

  // ── Submit to Manager ─────────────────────────────────────────────────────

  async function submitToManager(data: FormData) {
    setError(null)
    const notes = toNotes(data)
    const res = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...notes,
        cibiPassed: data.cibiPassed,
        collectorId,
        status: "MANAGER_REVIEW",
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? "Failed to submit"); return }
    toast.success("Submitted to Manager")
    window.dispatchEvent(new Event("activity-log-updated"))
    router.push("/loans/pending")
    router.refresh()
  }

  useImperativeHandle(ref, () => ({
    submit: () => { void handleSubmit((d) => submitToManager(d))() },
    saveDraft: () => { void handleSubmit((d) => saveDraft(d))() },
  }), [handleSubmit, submitToManager, saveDraft])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit((d) => submitToManager(d))(e) }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Credit Investigation &amp; Risk Assessment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Application {applicationNo} — {memberName} ({memberNo}). Complete all 5 Cs and record findings below.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* ── II. THE 5 Cs COMPREHENSIVE EVALUATION ──────────────────────── */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
          The 5 Cs Comprehensive Evaluation
        </h3>

        {/* 1. CHARACTER */}
        <SectionTable
          number={1}
          title="CHARACTER (Integrity &amp; Reliability)"
          subtitle="The applicant's history of meeting financial obligations."
          col1Header="Verification Step"
          col2Header="Status / Finding"
          col3Header="Notes"
        >
          <TableRow
            label="Credit Bureau Report Check"
            status={
              <RadioGroup
                value={w.char_creditBureau}
                onChange={(v) => setValue("char_creditBureau", v)}
                options={[
                  { value: "SATISFACTORY", label: "Satisfactory" },
                  { value: "ADVERSE", label: "Adverse" },
                  { value: "NO_HISTORY", label: "No History" },
                ]}
              />
            }
            notes={
              <Textarea
                {...register("char_creditBureauNotes")}
                rows={2}
                placeholder="Notes..."
                className="min-w-[120px] text-xs"
              />
            }
          />
          <TableRow
            label="Prior Loan Default / Arrears"
            status={
              <RadioGroup
                value={w.char_priorDefault}
                onChange={(v) => setValue("char_priorDefault", v)}
                options={[
                  { value: "NONE", label: "None" },
                  { value: "RESOLVED", label: "Resolved" },
                  { value: "ACTIVE", label: "Active Case" },
                ]}
              />
            }
            notes={
              <Textarea
                {...register("char_priorDefaultNotes")}
                rows={2}
                placeholder="Notes..."
                className="min-w-[120px] text-xs"
              />
            }
          />
          <TableRow
            label="Employment / Business Stability"
            status={
              <RadioGroup
                value={w.char_employment}
                onChange={(v) => setValue("char_employment", v)}
                options={[
                  { value: "GT_2_YEARS", label: "> 2 Years" },
                  { value: "1_2_YEARS", label: "1-2 Years" },
                  { value: "LT_1_YEAR", label: "< 1 Year" },
                ]}
              />
            }
            notes={
              <Textarea
                {...register("char_employmentNotes")}
                rows={2}
                placeholder="Notes..."
                className="min-w-[120px] text-xs"
              />
            }
          />
        </SectionTable>

        {/* 2. CAPACITY */}
        <SectionTable
          number={2}
          title="CAPACITY (Ability to Repay)"
          subtitle="Evaluation of cash flow and debt-to-income limits."
          col1Header="Financial Metric"
          col2Header="Value / Ratio"
          col3Header="Risk Assessment"
        >
          <TableRow
            label="Gross Monthly Income"
            status={
              <Input
                {...register("cap_grossIncome")}
                placeholder="e.g. ₱25,000"
                className="h-7 text-xs"
              />
            }
            notes={
              <RadioGroup
                value={w.cap_grossIncomeRisk}
                onChange={(v) => setValue("cap_grossIncomeRisk", v)}
                options={[
                  { value: "HIGH", label: "High" },
                  { value: "MID", label: "Mid" },
                  { value: "LOW", label: "Low" },
                ]}
              />
            }
          />
          <TableRow
            label="Existing Monthly Debt Service"
            status={
              <Input
                {...register("cap_debtService")}
                placeholder="e.g. ₱5,000"
                className="h-7 text-xs"
              />
            }
            notes={
              <RadioGroup
                value={w.cap_debtServiceRisk}
                onChange={(v) => setValue("cap_debtServiceRisk", v)}
                options={[
                  { value: "MANAGEABLE", label: "Manageable" },
                  { value: "STRETCHED", label: "Stretched" },
                ]}
              />
            }
          />
          <TableRow
            labelElement={<span>Debt-to-Income (DTI) Ratio</span>}
            status={
              <div className="flex items-center gap-1">
                <Input
                  {...register("cap_dtiRatio")}
                  placeholder="e.g. 32"
                  className="h-7 w-20 text-xs"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            }
            notes={
              <RadioGroup
                value={w.cap_dtiRisk}
                onChange={(v) => setValue("cap_dtiRisk", v)}
                options={[
                  { value: "LT_35", label: "< 35%" },
                  { value: "36_45", label: "36–45%" },
                  { value: "GT_45", label: "> 45%" },
                ]}
              />
            }
          />
        </SectionTable>

        {/* 3. CAPITAL */}
        <SectionTable
          number={3}
          title="CAPITAL (Net Worth)"
          subtitle="The borrower's investment in the asset and financial reserves."
          col1Header="Capital Indicator"
          col2Header="Status"
          col3Header="Details"
        >
          <TableRow
            label="Down Payment / Equity Contribution"
            status={
              <div className="flex items-center gap-1">
                <Input
                  {...register("cap2_downPayment")}
                  placeholder="e.g. 20"
                  className="h-7 w-20 text-xs"
                />
                <span className="text-xs text-muted-foreground">% of total cost</span>
              </div>
            }
            notes={
              <Textarea
                {...register("cap2_downPaymentDetails")}
                rows={2}
                placeholder="Details..."
                className="min-w-[120px] text-xs"
              />
            }
          />
          <TableRow
            label="Emergency Savings / Reserves"
            status={
              <RadioGroup
                value={w.cap2_emergencySavings}
                onChange={(v) => setValue("cap2_emergencySavings", v)}
                options={[
                  { value: "3_6_MONTHS", label: "3–6 Months" },
                  { value: "LT_3_MONTHS", label: "< 3 Months" },
                  { value: "NONE", label: "None" },
                ]}
              />
            }
            notes={
              <Textarea
                {...register("cap2_emergencySavingsDetails")}
                rows={2}
                placeholder="Details..."
                className="min-w-[120px] text-xs"
              />
            }
          />
        </SectionTable>

        {/* 4. COLLATERAL */}
        <SectionTable
          number={4}
          title="COLLATERAL (Security)"
          subtitle="Assets pledged to secure the loan."
          col1Header="Asset Type"
          col2Header="Appraised Value"
          col3Header="Marketability"
        >
          <TableRow
            labelElement={
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {(
                  [
                    { field: "col_assetRealEstate", label: "Real Estate" },
                    { field: "col_assetVehicle", label: "Vehicle" },
                    { field: "col_assetEquipment", label: "Equipment" },
                  ] as const
                ).map((a) => (
                  <label key={a.field} className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      className="size-3 accent-primary"
                      checked={!!w[a.field]}
                      onChange={(e) => setValue(a.field, e.target.checked)}
                    />
                    {a.label}
                  </label>
                ))}
              </div>
            }
            status={
              <Input
                {...register("col_appraisedValue")}
                placeholder="e.g. ₱500,000"
                className="h-7 text-xs"
              />
            }
            notes={
              <RadioGroup
                value={w.col_marketability}
                onChange={(v) => setValue("col_marketability", v)}
                options={[
                  { value: "HIGH", label: "High" },
                  { value: "MODERATE", label: "Moderate" },
                  { value: "LOW", label: "Low" },
                ]}
              />
            }
          />
          <TableRow
            label="Ownership Verification (Title/ORCR)"
            status={
              <RadioGroup
                value={w.col_ownership}
                onChange={(v) => setValue("col_ownership", v)}
                options={[
                  { value: "VERIFIED", label: "Verified" },
                  { value: "PENDING", label: "Pending" },
                ]}
              />
            }
            notes={
              <Textarea
                {...register("col_ownershipDetails")}
                rows={2}
                placeholder="Details..."
                className="min-w-[120px] text-xs"
              />
            }
          />
        </SectionTable>

        {/* 5. CONDITIONS */}
        <SectionTable
          number={5}
          title="CONDITIONS (External Factors)"
          subtitle="Economic and environmental context of the loan."
          col1Header="Condition Category"
          col2Header="Status"
          col3Header="Notes"
        >
          <TableRow
            label="Industry / Market Stability"
            status={
              <RadioGroup
                value={w.cond_marketStability}
                onChange={(v) => setValue("cond_marketStability", v)}
                options={[
                  { value: "GROWING", label: "Growing" },
                  { value: "STABLE", label: "Stable" },
                  { value: "DECLINING", label: "Declining" },
                ]}
              />
            }
            notes={
              <Textarea
                {...register("cond_marketStabilityNotes")}
                rows={2}
                placeholder="Notes..."
                className="min-w-[120px] text-xs"
              />
            }
          />
          <TableRow
            label="Impact of Interest Rate Fluctuations"
            status={
              <RadioGroup
                value={w.cond_interestRate}
                onChange={(v) => setValue("cond_interestRate", v)}
                options={[
                  { value: "MINIMAL", label: "Minimal" },
                  { value: "MODERATE", label: "Moderate" },
                  { value: "HIGH", label: "High" },
                ]}
              />
            }
            notes={
              <Textarea
                {...register("cond_interestRateNotes")}
                rows={2}
                placeholder="Notes..."
                className="min-w-[120px] text-xs"
              />
            }
          />
        </SectionTable>
      </div>

      {/* ── III. INVESTIGATOR RECOMMENDATION ──────────────────────────────── */}
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide">Investigator Recommendation</h3>

        <FieldGroup>
          <Field>
            <FieldLabel>Overall Risk Score (1–100)</FieldLabel>
            <Input
              {...register("rec_riskScore")}
              type="number"
              min={1}
              max={100}
              placeholder="e.g. 75"
              className="w-32"
            />
          </Field>

          <Field>
            <FieldLabel>Proposed Action</FieldLabel>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {(
                [
                  { value: "APPROVE", label: "Approve" },
                  { value: "DECLINE", label: "Decline" },
                  { value: "CONDITIONAL", label: "Conditional Approval" },
                ] as const
              ).map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    className="size-3.5 accent-primary"
                    checked={w.rec_proposedAction === opt.value}
                    onChange={() => setValue("rec_proposedAction", opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </Field>

          <Field>
            <FieldLabel>Conditions for Approval (if any)</FieldLabel>
            <Textarea
              {...register("rec_conditionsForApproval")}
              rows={3}
              placeholder="List any conditions required for approval..."
            />
          </Field>
        </FieldGroup>
      </div>

      {/* ── CI/BI passed + uploads ────────────────────────────────────────── */}
      <FieldGroup>
        <Field>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <FieldLabel>CI/BI passed</FieldLabel>
              <p className="text-xs text-muted-foreground">
                Mark whether the applicant passed the investigation.
              </p>
            </div>
            <input
              type="checkbox"
              checked={w.cibiPassed}
              onChange={(e) => setValue("cibiPassed", e.target.checked)}
              className="size-4 rounded border-input"
            />
          </div>
        </Field>

        <Field>
          <DocumentUploader
            applicationId={applicationId}
            category="PHOTO"
            label="Upload photos (residence/business)"
          />
        </Field>

        <Field>
          <DocumentUploader
            applicationId={applicationId}
            category="INVESTIGATION"
            label="Upload investigation report"
          />
        </Field>
      </FieldGroup>

      {!hideActions && (
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit to Manager"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleSubmit(saveDraft)}
          >
            Save draft
          </Button>
        </div>
      )}
    </form>
  )
})
