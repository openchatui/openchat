import { LucideIcon, Users, Link as LinkIcon, Box, LayoutGrid } from "lucide-react"
import { ReactSVGElement } from "react";
import { CgScreen } from "react-icons/cg";
import { IconTree, IconType } from "react-icons/lib";

export interface AdminNavItem {
    id: string
    label: string
    icon: LucideIcon | IconType
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
    },
    {
        id: "ui",
        label: "UI",
        icon: CgScreen,
        href: "/admin/ui"
    }
] as const

export type AdminTab = typeof ADMIN_NAV_ITEMS[number]['id']
