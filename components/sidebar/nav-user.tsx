"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Moon,
  Settings,
  Settings2,
  Sparkles,
  Sun,
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
  DropdownMenuGroup,
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
import { useTheme } from "next-themes"
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


  const handleSignOut = async () => {
    await signOut();
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
        const data = await res.json()
        if (!canceled) setActiveUsers(Array.isArray(data?.users) ? data.users.length : 0)
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
                <AvatarImage src={avatarSrc} alt={user.name} />
                <AvatarFallback className="rounded-lg">{getEmailInitials(user.email)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
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
                  <AvatarImage src={avatarSrc} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getEmailInitials(user.email)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>            
            <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/archive">
                <Archive />
                Archive
              </Link>
            </DropdownMenuItem>
              {user.role === 'ADMIN' && (
                <DropdownMenuItem asChild>
                  <Link prefetch={true} href="/admin">
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
