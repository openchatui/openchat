"use client"

import { Card, CardContent } from "@/components/ui/card"

export function ModelsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Models</h2>
        <p className="text-muted-foreground">
          Manage and configure AI models and providers
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Models management coming soon...</p>
            <p className="text-sm text-muted-foreground">
              Configure available models, defaults, and provider settings for your workspace
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


