"use client"

import * as React from "react"
import { FiSidebar } from "react-icons/fi";
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function SidebarLogo() {
  const { toggleSidebar, state } = useSidebar()

  return (
    <div className="flex items-center pl-1 pr-2 py-2">
      <Link href="/" aria-label="Go to home" className="flex items-center gap-3 flex-1 h-full">
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
      </Link>
      {state === "expanded" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-6 w-6 shrink-0 ml-2"
        >
          <FiSidebar className="h-4 w-4" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      )}
    </div>
  )
}
