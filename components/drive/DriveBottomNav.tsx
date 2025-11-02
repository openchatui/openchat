"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Star, Users, Folder } from "lucide-react"
import { cn } from "@/lib/utils"

interface DriveBottomNavProps {
  localRootId: string
}

export function DriveBottomNav({ localRootId }: DriveBottomNavProps) {
  const pathname = usePathname()

  const isHome = pathname === "/drive"
  const isStarred = pathname?.startsWith("/drive/starred")
  const isShared = pathname?.startsWith("/drive/shared")
  const isFiles = pathname?.startsWith("/drive/folder")

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="grid grid-cols-4 gap-1 py-2">
        <NavItem href="/drive" icon={<Home className="h-5 w-5" />} label="Home" active={!!isHome} />
        <NavItem href="/drive/starred" icon={<Star className="h-5 w-5" />} label="Starred" active={!!isStarred} />
        <NavItem href="/drive/shared" icon={<Users className="h-5 w-5" />} label="Shared" active={!!isShared} />
        <NavItem href={localRootId ? `/drive/folder/${localRootId}` : "/drive"} icon={<Folder className="h-5 w-5" />} label="Files" active={!!isFiles} />
      </div>
    </nav>
  )
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 py-1 text-xs">
      <span className={cn("flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground", active && "bg-primary/10 text-primary")}>{icon}</span>
      <span className={cn("text-muted-foreground", active && "text-foreground font-medium")}>{label}</span>
    </Link>
  )
}


