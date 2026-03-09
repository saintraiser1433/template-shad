"use client"

import { useState, forwardRef, useImperativeHandle } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { DocumentUploader } from "@/components/document-uploader"
import { toast } from "sonner"

const schema = z.object({
  characterNotes: z.string().optional(),
  capacityNotes: z.string().optional(),
  capitalNotes: z.string().optional(),
  collateralNotes: z.string().optional(),
  conditionsNotes: z.string().optional(),
  cibiPassed: z.boolean(),
})

type FormData = z.infer<typeof schema>

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

export const CIBIForm = forwardRef<CIBIFormHandle, CIBIFormProps>(function CIBIForm(
  {
    applicationId,
    applicationNo,
    memberName,
    memberNo,
    currentStatus,
    defaultValues,
    hideActions = false,
  },
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
    defaultValues: {
      characterNotes: defaultValues.characterNotes,
      capacityNotes: defaultValues.capacityNotes,
      capitalNotes: defaultValues.capitalNotes,
      collateralNotes: defaultValues.collateralNotes,
      conditionsNotes: defaultValues.conditionsNotes,
      cibiPassed: defaultValues.cibiPassed,
    },
  })

  const cibiPassed = watch("cibiPassed")

  async function saveDraft(data: FormData) {
    setError(null)
    const res = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterNotes: data.characterNotes,
        capacityNotes: data.capacityNotes,
        capitalNotes: data.capitalNotes,
        collateralNotes: data.collateralNotes,
        conditionsNotes: data.conditionsNotes,
        cibiPassed: data.cibiPassed,
        collectorId,
        status: currentStatus === "PENDING" ? "CIBI_REVIEW" : currentStatus,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to save")
      return
    }
    toast.success("Draft saved")
    router.refresh()
  }

  async function submitToManager(data: FormData) {
    setError(null)
    const res = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterNotes: data.characterNotes,
        capacityNotes: data.capacityNotes,
        capitalNotes: data.capitalNotes,
        collateralNotes: data.collateralNotes,
        conditionsNotes: data.conditionsNotes,
        cibiPassed: data.cibiPassed,
        collectorId,
        status: "MANAGER_REVIEW",
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? "Failed to submit")
      return
    }
    toast.success("Submitted to Manager")
    router.push("/loans/pending")
    router.refresh()
  }

  useImperativeHandle(
    ref,
    () => ({
      submit: () => {
        void handleSubmit((data) => submitToManager(data))()
      },
      saveDraft: () => {
        void handleSubmit((data) => saveDraft(data))()
      },
    }),
    [handleSubmit, submitToManager, saveDraft]
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit((data) => submitToManager(data))(e)
      }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-base font-semibold">CI/BI — 5C&apos;s of Credit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Application {applicationNo} — {memberName} ({memberNo}). Conduct the character and background investigation and record findings below.
        </p>
      </div>
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel>Character</FieldLabel>
          <Textarea
            {...register("characterNotes")}
            rows={3}
            placeholder="Character assessment notes..."
          />
        </Field>
        <Field>
          <FieldLabel>Capacity</FieldLabel>
          <Textarea
            {...register("capacityNotes")}
            rows={3}
            placeholder="Capacity to repay notes..."
          />
        </Field>
        <Field>
          <FieldLabel>Capital</FieldLabel>
          <Textarea
            {...register("capitalNotes")}
            rows={3}
            placeholder="Capital / financial position notes..."
          />
        </Field>
        <Field>
          <FieldLabel>Collateral</FieldLabel>
          <Textarea
            {...register("collateralNotes")}
            rows={3}
            placeholder="Collateral or security notes..."
          />
        </Field>
        <Field>
          <FieldLabel>Conditions</FieldLabel>
          <Textarea
            {...register("conditionsNotes")}
            rows={3}
            placeholder="Economic and other conditions notes..."
          />
        </Field>
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
              checked={cibiPassed}
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
