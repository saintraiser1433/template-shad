import { prisma } from "@/lib/prisma"

/**
 * Normalize to PH mobile format +639XXXXXXXXX.
 * Accepts 09xxxxxxxxx, 9xxxxxxxxx, 639xxxxxxxxx, +639xxxxxxxxx.
 */
export function normalizePhMobile(raw: string | undefined | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("639") && digits.length === 12) {
    return `+${digits}`
  }
  if (digits.startsWith("09") && digits.length === 11) {
    return `+63${digits.slice(1)}`
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return `+639${digits}`
  }
  return null
}

export type SendSmsResult = { ok: true } | { ok: false; error: string }

/**
 * Send SMS to a phone number using configured gateway.
 * Phone will be normalized to +639XXXXXXXXX.
 * Does not throw; returns { ok, error } so callers can log and continue.
 */
export async function sendSms(
  phone: string | undefined | null,
  message: string
): Promise<SendSmsResult> {
  const normalized = normalizePhMobile(phone ?? "")
  if (!normalized) {
    return { ok: false, error: "Invalid or missing PH mobile number" }
  }

  const settings = await prisma.smsSettings.findFirst()
  if (!settings) {
    return { ok: false, error: "SMS settings are not configured" }
  }

  const endpoint = `${settings.baseUrl.replace(/\/+$/, "")}/message`
  const authHeader =
    "Basic " +
    Buffer.from(`${settings.username}:${settings.password}`, "utf8").toString("base64")

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        textMessage: { text: message },
        phoneNumbers: [normalized],
      }),
    })

    const text = await res.text()
    if (!res.ok) {
      return {
        ok: false,
        error: `Gateway error ${res.status}: ${text.slice(0, 200)}`,
      }
    }
    return { ok: true }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Send failed: ${err}` }
  }
}
