"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Navbar } from "@/components/navbar"
import { UploadBox } from "@/components/upload-box"
import { PredictionResultCard } from "@/components/prediction-result"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/lib/auth"
import { predictionApi, historyApi } from "@/lib/api"
import type { PredictionResult } from "@/types"
import { Loader2, RotateCcw, Save } from "lucide-react"

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [saveToHistory, setSaveToHistory] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [selectedFile])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setResult(null)
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    try {
      const prediction = await predictionApi.predict(selectedFile)
      setResult(prediction)

      toast({
        title: "Analysis complete",
        description: `Detected: ${prediction.disease} with ${Math.round(prediction.confidence * 100)}% confidence`,
      })

      // Auto-save to history if enabled
      if (saveToHistory && previewUrl) {
        setIsSaving(true)
        try {
          await historyApi.saveToHistory(prediction, previewUrl)
          toast({
            title: "Saved to history",
            description: "Prediction has been saved to your history",
          })
        } catch (error) {
          console.error("Failed to save to history:", error)
        } finally {
          setIsSaving(false)
        }
      }
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze image",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setResult(null)
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-balance">Upload Plant Image</h1>
            <p className="text-muted-foreground text-balance">
              Upload a clear image of your plant leaf to detect diseases and receive treatment recommendations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="space-y-4">
              <UploadBox onFileSelect={handleFileSelect} selectedFile={selectedFile} disabled={isAnalyzing} />

              {previewUrl && (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                  <Card>
                    <CardContent className="p-4">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <Image src={previewUrl || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div className="space-y-0.5">
                  <Label htmlFor="save-history" className="text-sm font-medium">
                    Save to History
                  </Label>
                  <p className="text-xs text-muted-foreground">Automatically save predictions to your history</p>
                </div>
                <Switch
                  id="save-history"
                  checked={saveToHistory}
                  onCheckedChange={setSaveToHistory}
                  disabled={isAnalyzing || isSaving}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Analyze Image
                    </>
                  )}
                </Button>
                {(selectedFile || result) && (
                  <Button onClick={handleReset} disabled={isAnalyzing} variant="outline" size="lg">
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Results Section */}
            <div>
              {isAnalyzing ? (
                <Card className="border-border/50">
                  <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
                    <div className="relative">
                      <Loader2 className="h-16 w-16 text-primary animate-spin" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-medium text-foreground">Analyzing image...</p>
                      <p className="text-sm text-muted-foreground">Our AI is examining your plant</p>
                    </div>
                  </CardContent>
                </Card>
              ) : result ? (
                <PredictionResultCard result={result} />
              ) : (
                <Card className="border-dashed border-2 border-border/50 bg-muted/20">
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-2">
                    <p className="text-muted-foreground">Upload and analyze an image to see results</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
