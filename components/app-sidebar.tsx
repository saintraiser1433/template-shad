"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Wallet,
  Banknote,
  FileText,
  Scale,
  FileCheck,
  ScrollText,
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
  {
    title: "Loans",
    url: "/loans",
    icon: Wallet,
    items: [
      { title: "Apply for Loan", url: "/loans/apply" },
      { title: "My Loans", url: "/loans" },
    ],
  },
]

const collectorNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  {
    title: "Loans",
    url: "/loans/pending",
    icon: Wallet,
    items: [{ title: "Pending CI/BI", url: "/loans/pending" }],
  },
]

const managerNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  {
    title: "Loans",
    url: "/loans/for-approval",
    icon: Wallet,
    items: [{ title: "For Approval", url: "/loans/for-approval" }],
  },
  { title: "Reports", url: "/reports", icon: FileText },
]

const committeeNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  {
    title: "Loans",
    url: "/loans/for-approval",
    icon: Wallet,
    items: [{ title: "For Approval", url: "/loans/for-approval" }],
  },
]

const financeNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  {
    title: "Loans",
    url: "/loans/for-funding",
    icon: Wallet,
    items: [{ title: "For Funding", url: "/loans/for-funding" }],
  },
  { title: "Payments", url: "/payments", icon: Banknote },
]

const adminNavMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/users", icon: Users },
  { title: "Members", url: "/members", icon: UserCircle },
  { title: "Activity log", url: "/admin/activity-log", icon: ScrollText },
  {
    title: "Loans",
    url: "/loans",
    icon: Wallet,
    items: [
      { title: "All Loans", url: "/loans" },
      { title: "Pending CI/BI", url: "/loans/pending" },
      { title: "For Approval", url: "/loans/for-approval" },
      { title: "For Funding", url: "/loans/for-funding" },
      { title: "Type of Loans", url: "/loan-types" },
    ],
  },
  { title: "Requirements", url: "/requirements", icon: FileCheck },
  { title: "Payments", url: "/payments", icon: Banknote },
  { title: "Reports", url: "/reports", icon: FileText },
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
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Scale className="size-4" />
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
