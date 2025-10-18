"use client"

import {
  ChevronsUpDown,
  LogOut,
  Settings,
  Archive,
} from "lucide-react"

import { CgProfile } from "react-icons/cg";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { getEmailInitials } from "@/constants/user"
import Link from "next/link";

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar?: string
    image?: string
    role?: string
  }
}) {
  const { isMobile } = useSidebar()

  const [displayName, setDisplayName] = useState<string>(user.name)
  const [displayEmail, setDisplayEmail] = useState<string>(user.email)
  // Keep local display state in sync with incoming props (no extra fetch)
  useEffect(() => {
    setDisplayName(user.name)
    setDisplayEmail(user.email)
  }, [user.name, user.email])


  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const avatarSrc = user.image ?? user.avatar
  const [activeUsers, setActiveUsers] = useState<number | null>(null)

  useEffect(() => {
    let timer: number | null = null
    let canceled = false
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/v1/activity/active-users', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (!canceled) setActiveUsers(Array.isArray((data as any)?.users) ? (data as any).users.length : 0)
      } catch {
        if (!canceled) setActiveUsers(null)
      }
    }
    fetchCount()
    timer = window.setInterval(fetchCount, 15000) as unknown as number
    return () => {
      canceled = true
      if (timer) window.clearInterval(timer)
    }
  }, [])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback className="rounded-lg">{getEmailInitials(displayEmail)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs">{displayEmail}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="top"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarSrc} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{getEmailInitials(displayEmail)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs">{displayEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>            
            <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link prefetch href="/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link prefetch href="/archive">
                <Archive />
                Archive
              </Link>
            </DropdownMenuItem>
              {user.role === 'ADMIN' && (
                <DropdownMenuItem asChild>
                  <Link prefetch href="/admin/users">
                    <CgProfile />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              <span>Active Users: {activeUsers ?? '—'}</span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
