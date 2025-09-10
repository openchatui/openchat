import { LucideIcon, Users, Link as LinkIcon, Box } from "lucide-react"

export interface AdminNavItem {
    id: string
    label: string
    icon: LucideIcon
    href: string
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
    {
        id: "users",
        label: "Users",
        icon: Users,
        href: "/admin/users"
    },
    {
        id: "connections",
        label: "Connections",
        icon: LinkIcon,
        href: "/admin/connections"
    },
    {
        id: "models",
        label: "Models",
        icon: Box,
        href: "/admin/models"
    }
] as const

export type AdminTab = typeof ADMIN_NAV_ITEMS[number]['id']
