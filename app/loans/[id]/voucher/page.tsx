import { redirect } from "next/navigation"

export default async function LoanVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/loans/${id}`)
}
