"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Banknote } from "lucide-react"

export function RecordPaymentButton({ loanId }: { loanId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const num = parseFloat(amount)
    if (!Number.isFinite(num) || num <= 0) {
      setError("Enter a valid amount")
      setLoading(false)
      return
    }
    const res = await fetch(`/api/loans/${loanId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: num,
        paymentDate: new Date(date).toISOString(),
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(json.error ?? "Failed to record payment")
      return
    }
    setOpen(false)
    setAmount("")
    setDate(new Date().toISOString().slice(0, 10))
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="action" size="icon-sm" title="Record payment">
          <Banknote className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Record payment</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel>Amount (₱)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Payment date</FieldLabel>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save payment"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
