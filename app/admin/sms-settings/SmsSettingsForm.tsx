"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { toast } from "sonner"

const DEFAULT_BASE_URL = "https://api.sms-gate.app/3rdparty/v1"

type SmsSettings = {
  baseUrl: string
  username: string
}

export function SmsSettingsForm({ initial }: { initial: SmsSettings | null }) {
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? DEFAULT_BASE_URL)
  const [username, setUsername] = useState(initial?.username ?? "")
  const [password, setPassword] = useState("")
  const [testNumber, setTestNumber] = useState("")
  const [loadingSave, setLoadingSave] = useState(false)
  const [loadingTest, setLoadingTest] = useState(false)

  useEffect(() => {
    if (initial) {
      setBaseUrl(initial.baseUrl)
      setUsername(initial.username)
    } else {
      setBaseUrl(DEFAULT_BASE_URL)
    }
  }, [initial])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoadingSave(true)
    try {
      const res = await fetch("/api/admin/sms-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, username, password }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save SMS settings")
        return
      }
      toast.success("SMS settings updated.")
      setPassword("")
    } finally {
      setLoadingSave(false)
    }
  }

  async function handleTest() {
    if (!testNumber.trim()) {
      toast.error("Enter a test phone number.")
      return
    }
    setLoadingTest(true)
    try {
      const res = await fetch("/api/admin/sms-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: testNumber.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error ?? "Failed to send test SMS")
        return
      }
      toast.success("Test SMS sent. Check your device/number.")
    } finally {
      setLoadingTest(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel>Gateway base URL *</FieldLabel>
          <Input
            value={baseUrl}
            disabled
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Using SMS-Gate cloud endpoint. To use local server, this would need code/config change.
          </p>
        </Field>
        <Field>
          <FieldLabel>Username *</FieldLabel>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Gateway username"
          />
        </Field>
        <Field>
          <FieldLabel>Password *</FieldLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Gateway password"
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={loadingSave}>
          {loadingSave ? "Saving…" : "Save settings"}
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Example local server endpoint:</span>
          <code className="rounded bg-muted px-1.5 py-0.5">
            http://device-ip:8080
          </code>
        </div>
      </div>

      <div className="mt-4 rounded-md border bg-muted/30 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field className="flex-1 min-w-[220px]">
            <FieldLabel>Test phone number</FieldLabel>
            <Input
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="+63917xxxxxxx"
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={loadingTest}
          >
            {loadingTest ? "Sending…" : "Send test SMS"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Test SMS uses the configured gateway and sends a short message to the specified number.
        </p>
      </div>
    </form>
  )
}

