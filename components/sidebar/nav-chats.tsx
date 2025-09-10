"use client"

import Link from "next/link"
import { ChevronRight, MessageSquare, Trash2 } from "lucide-react"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import type { ChatData } from "@/lib/chat-store"

interface NavChatsProps {
  chats: ChatData[]
}

export function NavChats({ chats }: NavChatsProps) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="w-full justify-between">
              <span>Chats</span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {chats.length === 0 ? (
                <SidebarMenuSubItem>
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    No chats yet
                  </div>
                </SidebarMenuSubItem>
              ) : (
                chats.map((chat) => {
                  const isActive = pathname === `/c/${chat.id}`
                  
                  return (
                    <SidebarMenuSubItem key={chat.id}>
                      <SidebarMenuSubButton asChild isActive={isActive}>
                        <Link href={`/c/${chat.id}`} className="group">
                          <MessageSquare className="h-4 w-4" />
                          <span className="truncate flex-1">
                            {chat.title || 'New Chat'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              // TODO: Implement delete chat functionality
                              console.log('Delete chat:', chat.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarGroup>
  )
}
