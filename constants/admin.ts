import { LucideIcon, Users, Link as LinkIcon, Box, Mic, Globe, Image as ImageIcon, Terminal, HardDrive } from "lucide-react"
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
        id: "drive",
        label: "Drive",
        icon: HardDrive,
        href: "/admin/drive"
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
        id: "audio",
        label: "Audio",
        icon: Mic,
        href: "/admin/audio"
    },
    {
        id: "image",
        label: "Image",
        icon: ImageIcon,
        href: "/admin/image"
    },
    {
      id: "websearch",
      label: "Web Search",
      icon: Globe,
      href: "/admin/websearch"
    },
    {
        id: "code-interpreter",
        label: "Code Interpreter",
        icon: Terminal,
        href: "/admin/code-interpreter"
    },
    {
        id: "ui",
        label: "UI",
        icon: CgScreen,
        href: "/admin/ui"
  },
] as const

export type AdminTab = typeof ADMIN_NAV_ITEMS[number]['id']
