"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  Wallet,
  Banknote,
  FileText,
  Scale,
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

const staffNavMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Members",
    url: "/members",
    icon: Users,
  },
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
  {
    title: "Payments",
    url: "/payments",
    icon: Banknote,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
  },
]

const memberNavMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const role = session?.user?.role
  const navMain = role === "MEMBER" ? memberNavMain : staffNavMain

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
