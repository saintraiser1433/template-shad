import Link from "next/link"
import Image from "next/image"
import { HandCoins, Users, FileCheck, Shield, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-gradient-to-b from-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex size-9 items-center justify-center rounded-full bg-white">
              <Image
                src="/logo.png"
                alt="MCFMP Cooperative logo"
                width={36}
                height={36}
                className="rounded-full"
                priority
              />
            </div>
            <span className="text-lg">MCFMP-CMLMS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild>
              <Link href="/login">Login to your account</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 md:py-24">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Muslim Christian Fisherfolks
            <br />
            <span className="text-primary">Multi-Purpose Cooperative</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Money Lending and Management System — fair credit and Capital Build
            Up (CBU) for members in good standing.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild className="gap-2">
              <Link href="/login">
                Login to your account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Member portal</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-5xl">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            Why MCFMP Cooperative
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
            Only members of good standing can avail our credit services. We use
            the 5C&apos;s of credit (Character, Capacity, Capital, Collateral,
            Conditions) to ensure responsible lending.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-6" />
              </div>
              <h3 className="mt-4 font-semibold">Members in good standing</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Bona fide regular members with at least ₱20,000 Capital Build Up
                (CBU) can access our loan products.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HandCoins className="size-6" />
              </div>
              <h3 className="mt-4 font-semibold">Multiple loan types</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Membership, Micro, Regular, Production, Short Term, Long Term,
                and Educational loans with clear terms and fair rates.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileCheck className="size-6" />
              </div>
              <h3 className="mt-4 font-semibold">Structured process</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                From application and CI/BI to Manager or Committee approval,
                funding, and release — all tracked in one system.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:col-span-2 lg:col-span-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="size-6" />
              </div>
              <h3 className="mt-4 font-semibold">Transparent and secure</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                7-day grace period after due date with no penalty. Loan renewal
                available when at least 70% of the loan is paid; balance is
                deducted upon renewal.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-3xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm md:p-12">
          <h2 className="text-xl font-semibold sm:text-2xl">
            Ready to manage your cooperative account?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to apply for loans, view your CBU, and track payments.
          </p>
          <Button size="lg" className="mt-6 gap-2" asChild>
            <Link href="/login">
              Login to your account
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="mt-24 border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          MCFMP-CMLMS — Muslim Christian Fisherfolks Multi-Purpose Cooperative
          Money Lending and Management System
        </div>
      </footer>
    </div>
  )
}
