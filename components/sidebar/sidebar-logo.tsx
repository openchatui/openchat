"use client"

import * as React from "react"
import { FiSidebar } from "react-icons/fi";
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function SidebarLogo() {
  const { toggleSidebar, state } = useSidebar()

  return (
    <div className="flex items-center justify-between pl-1 pr-2 py-2">
      <div className="flex items-center gap-3 ">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Image
            src="/OpenChat.png"
            alt="OpenChat"
            width={24}
            height={24}
            className="h-6 w-6 rounded-full"
          />
        </div>
        {state === "expanded" && (
          <span className="text-xl font-semibold text-foreground">OpenChat</span>
        )}
      </div>
      {state === "expanded" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-6 w-6 shrink-0"
        >
          <FiSidebar className="h-4 w-4" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      )}
    </div>
  )
}
