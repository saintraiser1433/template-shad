"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type LoanOption = {
  id: string
  loanNo: string
  memberName: string
  outstandingBalance: number
}

export function RecordPaymentForm({ loans }: { loans: LoanOption[] }) {
  const router = useRouter()
  const [loanId, setLoanId] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedLoan = loans.find((l) => l.id === loanId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const num = parseFloat(amount)
    if (!loanId || !Number.isFinite(num) || num <= 0) {
      setError("Select a loan and enter a valid amount")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/loans/${loanId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          paymentDate: new Date(date).toISOString(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to record payment")
        return
      }
      setAmount("")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel>Loan</FieldLabel>
          <Select value={loanId} onValueChange={setLoanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select loan" />
            </SelectTrigger>
            <SelectContent>
              {loans.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.loanNo} — {l.memberName} (Outstanding: ₱
                  {l.outstandingBalance.toLocaleString("en-PH")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Amount (₱)</FieldLabel>
          <Input
            type="number"
            step="0.01"
            min="0"
            max={selectedLoan?.outstandingBalance}
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
      <Button type="submit" disabled={loading || loans.length === 0}>
        {loading ? "Saving…" : "Record payment"}
      </Button>
    </form>
  )
}
