"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import Image from "next/image"
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Wallet,
  FileText,
  Scale,
  FileCheck,
  ScrollText,
  CreditCard,
  Globe,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const memberNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Apply for Loan", url: "/loans/apply", icon: Wallet },
  { title: "My Loans", url: "/loans", icon: Wallet },
]

const collectorNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pending CI/BI", url: "/loans/pending", icon: Wallet },
]

const managerNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "For Approval", url: "/loans/for-approval", icon: Wallet },
  { title: "Reports", url: "/reports", icon: FileText },
]

const committeeNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "For Approval", url: "/loans/for-approval", icon: Wallet },
]

const financeNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "All Loans", url: "/loans", icon: Wallet },
  { title: "For Funding", url: "/loans/for-funding", icon: Wallet },
]

const adminNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/users", icon: Users },
  { title: "Members", url: "/members", icon: UserCircle },
  { title: "Activity log", url: "/admin/activity-log", icon: ScrollText },
  { title: "All Loans", url: "/loans", icon: Wallet },
  { title: "Pending CI/BI", url: "/loans/pending", icon: Wallet },
  { title: "For Approval", url: "/loans/for-approval", icon: Wallet },
  { title: "For Funding", url: "/loans/for-funding", icon: Wallet },
  { title: "Type of Loans", url: "/loan-types", icon: Wallet },
  { title: "Requirements", url: "/requirements", icon: FileCheck },
  { title: "Payment methods", url: "/payment-methods", icon: CreditCard },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Landing page", url: "/admin/landing-settings", icon: Globe },
  { title: "SMS settings", url: "/admin/sms-settings", icon: Scale },
]

function getNavForRole(role: string | undefined) {
  switch (role) {
    case "ADMIN":
      return adminNavMain
    case "MANAGER":
      return managerNavMain
    case "COLLECTOR":
      return collectorNavMain
    case "CREDIT_COMMITTEE":
    case "BOARD_OF_DIRECTORS":
      return committeeNavMain
    case "TREASURER":
    case "LOANS_CLERK":
    case "DISBURSING_STAFF":
    case "CASHIER":
      return financeNavMain
    case "MEMBER":
      return memberNavMain
    default:
      return adminNavMain
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const role = session?.user?.role
  const navMain = getNavForRole(role)

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
                  <Image
                    src="/logo.png"
                    alt="MCFMP Cooperative logo"
                    width={32}
                    height={32}
                    className="rounded-full"
                    priority
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">MCFMP-CMLMS</span>
                  <span className="truncate text-xs">Cooperative</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
