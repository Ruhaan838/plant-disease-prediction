"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, AlertTriangle, Leaf, Activity } from "lucide-react"
import type { PredictionResult } from "@/types"

interface PredictionResultProps {
  result: PredictionResult
}

export function PredictionResultCard({ result }: PredictionResultProps) {
  // Extract disease and plant type from label
  const label = result.top.label || result.top.raw || ""
  let plantType = ""
  let disease = ""

  if (label.includes(" - ")) {
    const parts = label.split(" - ")
    plantType = parts[0]?.trim() || ""
    disease = parts[1]?.trim() || parts[0]?.trim() || ""
  } else {
    disease = label
    plantType = label.split(" ")[0] || ""
  }

  const isHealthy = disease.toLowerCase().includes("healthy")
  const confidencePercentValue = result.top.prob * 100
  const confidencePercent = confidencePercentValue.toFixed(2)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl text-balance flex items-center gap-2">
                {isHealthy ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                )}
                {disease}
              </CardTitle>
              <CardDescription>Detection results from AI analysis</CardDescription>
            </div>
            <Badge variant={isHealthy ? "default" : "destructive"} className="text-sm px-3 py-1">
              {confidencePercent}% confident
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confidence Level</span>
              <span className="font-medium">{confidencePercent}%</span>
            </div>
            <Progress value={confidencePercentValue} className="h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Leaf className="h-4 w-4" />
                <span>Plant Type</span>
              </div>
              <p className="font-medium text-foreground">{plantType || "Unknown"}</p>
            </div>

        
          </div>

          {result.topk && result.topk.length > 1 && (
            <div className="space-y-2 pt-4 border-t border-border">
              <h4 className="font-semibold text-foreground text-sm">Other Predictions</h4>
              <div className="space-y-2">
                {result.topk.slice(1, 4).map((pred, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{pred.label}</span>
                    <span className="font-medium">{(pred.prob * 100).toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2">
            Analyzed on {new Date(result.timestamp).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
