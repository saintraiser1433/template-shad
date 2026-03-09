"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { MemberCbuDisplay } from "@/components/member-cbu-display"
import { NotificationBell } from "@/components/notification-bell"

type ModuleHeaderProps = {
  breadcrumb: React.ReactNode
  /** Optional e.g. "Back to list" on detail pages; list pages put Add button on the data table card. */
  addButton?: React.ReactNode
}

/**
 * Top bar: breadcrumb and notification bell. Search and primary Add live on the data table card.
 */
export function ModuleHeader({
  breadcrumb,
  addButton,
}: ModuleHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4">
      <div className="flex flex-1 items-center gap-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        {breadcrumb}
      </div>
      <div className="flex items-center gap-4">
        <MemberCbuDisplay />
        <NotificationBell />
        {addButton && <div className="shrink-0">{addButton}</div>}
      </div>
    </header>
  )
}
