"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FileText, Image, Upload, ExternalLink, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type DocumentRecord = {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  mimeType: string | null
  category: string
  requirementId?: string | null
  createdAt: string
}

export function DocumentUploader({
  applicationId,
  category = "REQUIREMENT",
  label = "Upload documents",
  requirementId = null,
  requirementName,
  onUploadComplete,
  getOrCreateApplicationId,
}: {
  applicationId: string | null
  category?: "REQUIREMENT" | "PHOTO" | "INVESTIGATION"
  label?: string
  requirementId?: string | null
  requirementName?: string
  onUploadComplete?: () => void
  /** Optional callback to lazily create an application (e.g. from a loan apply form) */
  getOrCreateApplicationId?: () => Promise<string | null>
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [appId, setAppId] = useState<string | null>(applicationId)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    setAppId(applicationId)
  }, [applicationId])

  const loadDocuments = useCallback(
    async (overrideId?: string | null) => {
      const targetId = overrideId ?? appId
      if (!targetId) return
      const res = await fetch(`/api/documents?applicationId=${targetId}`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
      setLoaded(true)
    },
    [appId]
  )

  useEffect(() => {
    if (appId) loadDocuments(appId)
  }, [appId, loadDocuments])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      let effectiveAppId = appId
      if (!effectiveAppId && getOrCreateApplicationId) {
        effectiveAppId = await getOrCreateApplicationId()
        if (!effectiveAppId) {
          setLoading(false)
          return
        }
        setAppId(effectiveAppId)
      }
      if (!effectiveAppId) {
        setLoading(false)
        return
      }
      const formData = new FormData()
      formData.set("file", file)
      formData.set("applicationId", effectiveAppId)
      formData.set("category", category)
      if (requirementId) formData.set("requirementId", requirementId)
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        let message = "Upload failed"
        try {
          const json = await res.json()
          if (json?.error) message = json.error
        } catch {
          // response had no JSON body; keep default message
        }
        throw new Error(message)
      }
      await loadDocuments(effectiveAppId)
      onUploadComplete?.()
      router.refresh()
      e.target.value = ""
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        let message = "Delete failed"
        try {
          const json = await res.json()
          if (json?.error) message = json.error
        } catch {
          // ignore
        }
        throw new Error(message)
      }
      await loadDocuments()
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isImage = (mime: string | null) =>
    mime?.startsWith("image/") ?? false

  const filteredDocs = documents.filter((d) => {
    if (d.category !== category) return false
    if (requirementId != null) {
      return d.requirementId === requirementId
    }
    return true
  })

  const canUploadWithoutId = !!getOrCreateApplicationId

  const uploadControl = appId || canUploadWithoutId ? (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={
          category === "PHOTO"
            ? "image/*"
            : "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }
        onChange={handleFileChange}
        disabled={loading}
        className="hidden"
        aria-hidden
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="gap-2"
      >
        <Upload className="size-4" />
        {loading ? "Uploading…" : "Upload"}
      </Button>
    </div>
  ) : (
    <p className="text-xs text-muted-foreground">Submit application first to upload.</p>
  )

  const listContent =
    filteredDocs.length > 0 ? (
      <ul className="mt-1.5 space-y-2 text-xs pl-0">
        {filteredDocs.map((d) => (
          <li
            key={d.id}
            className="rounded border bg-muted/30 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-2 py-1.5">
              {isImage(d.mimeType) ? (
                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={d.fileUrl}
                    alt={d.fileName}
                    className="size-10 rounded object-cover border"
                  />
                </a>
              ) : (
                <FileText className="size-8 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.fileName}</p>
                {d.fileSize != null && (
                  <p className="text-muted-foreground">{(d.fileSize / 1024).toFixed(1)} KB</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    Preview
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Delete"
                  onClick={() => setPendingDeleteId(d.id)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    ) : null

  return (
    <>
      {requirementName != null ? (
        <div className="py-2">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-sm">{requirementName}</span>
            {uploadControl}
          </div>
          {listContent}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{label}</Label>
          {appId || canUploadWithoutId ? (
          <>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  category === "PHOTO"
                    ? "image/*"
                    : "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                }
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
                aria-hidden
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="gap-2"
              >
                <Upload className="size-4" />
                {loading ? "Uploading…" : "Upload"}
              </Button>
            </div>
            {documents.length > 0 && (
              <ul className="mt-2 space-y-2 text-xs">
                {filteredDocs.map((d) => (
                  <li key={d.id} className="rounded border bg-muted/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      {isImage(d.mimeType) ? (
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img
                            src={d.fileUrl}
                            alt={d.fileName}
                            className="size-10 rounded object-cover border"
                          />
                        </a>
                      ) : (
                        <FileText className="size-8 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{d.fileName}</p>
                        {d.fileSize != null && (
                          <p className="text-muted-foreground">{(d.fileSize / 1024).toFixed(1)} KB</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="sm" asChild className="gap-1">
                          <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-3.5" />
                            Preview
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Delete"
                          onClick={() => setPendingDeleteId(d.id)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Save the application first to upload documents.
          </p>
        )}
        </div>
      )}

      <AlertDialog
        open={pendingDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the uploaded file from this application.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDeleteId && handleDelete(pendingDeleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
