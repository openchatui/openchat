"use client"

import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavChannels({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    type: "button" | "collapse"
    isActive?: boolean
    items?: {
      title: string
      url: string
      icon?: LucideIcon
    }[]
  }[]
}) {
  return (
    <SidebarGroup className="pt-0 pb-0">
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          if (item.type === "button") {
            return (
              <SidebarMenuItem key={item.title} className="py-0">
                <SidebarMenuButton asChild tooltip={item.title} className="h-8">
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          if (item.type === "collapse") {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem className="py-0">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className="h-8">
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="py-0">
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title} className="py-0">
                          <SidebarMenuSubButton asChild className="h-8">
                            <Link href={subItem.url}>
                              {subItem.icon && <subItem.icon />}
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return null
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}


