"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf } from "lucide-react"

interface AuthCardProps {
  title: string
  description: string
  children: ReactNode
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-500 delay-200">
            <div className="bg-primary text-primary-foreground p-3 rounded-xl">
              <Leaf className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">PlantCare AI</h1>
              <p className="text-sm text-muted-foreground">Disease Detection</p>
            </div>
          </div>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-balance">{title}</CardTitle>
            <CardDescription className="text-balance">{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
