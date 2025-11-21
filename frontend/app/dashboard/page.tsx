"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { predictionApi } from "@/lib/api"
import type { ModelInfo } from "@/types"
import { Upload, History, Brain, TrendingUp, Leaf, Activity } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "loading") {
      return
    }

    const fetchModelInfo = async () => {
      try {
        const info = await predictionApi.getModelInfo()
        setModelInfo(info)
      } catch (error) {
        console.error("Failed to fetch model info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchModelInfo()
  }, [status, router])

  if (status === "loading" || status === "unauthenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-secondary/10 to-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-transparent overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-3xl text-balance">Welcome back, {session?.user?.name || "User"}!</CardTitle>
                    <CardDescription className="text-base text-balance">
                      Upload plant images to detect diseases and get treatment recommendations
                    </CardDescription>
                  </div>
                  <div className="hidden sm:block">
                    <div className="bg-primary/10 p-4 rounded-2xl">
                      <Leaf className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <Link href="/upload">
                  <Button size="lg" className="gap-2">
                    <Upload className="h-5 w-5" />
                    Start Detection
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/upload">
                <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer border-border/50 group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Upload Image</CardTitle>
                        <CardDescription>Detect plant diseases</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/history">
                <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer border-border/50 group">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <History className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">View History</CardTitle>
                        <CardDescription>Past predictions</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>

          {/* Model Information */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <h2 className="text-xl font-semibold mb-4">AI Model Information</h2>
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </CardContent>
              </Card>
            ) : modelInfo ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardDescription className="text-xs">Model Version</CardDescription>
                        <CardTitle className="text-xl">{modelInfo.version}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardDescription className="text-xs">Accuracy</CardDescription>
                        <CardTitle className="text-xl">{(modelInfo.accuracy * 100).toFixed(1)}%</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardDescription className="text-xs">Last Updated</CardDescription>
                        <CardTitle className="text-xl">
                          {new Date(modelInfo.lastUpdated).toLocaleDateString()}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="lg:col-span-3 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Supported Detection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Plant Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {modelInfo.supportedPlants.map((plant) => (
                            <span
                              key={plant}
                              className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                            >
                              {plant}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Disease Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {modelInfo.supportedDiseases.slice(0, 6).map((disease) => (
                            <span
                              key={disease}
                              className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                            >
                              {disease}
                            </span>
                          ))}
                          {modelInfo.supportedDiseases.length > 6 && (
                            <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
                              +{modelInfo.supportedDiseases.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
