"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, AlertTriangle, Leaf, Activity, TrendingUp } from "lucide-react"
import type { PredictionResult } from "@/types"

interface PredictionResultProps {
  result: PredictionResult
}

export function PredictionResultCard({ result }: PredictionResultProps) {
  const isHealthy = result.disease.toLowerCase().includes("healthy")
  const confidencePercent = Math.round(result.confidence * 100)
  
  // Get top 3 predictions if available
  const topPredictions = result.topk?.slice(0, 3) || []

  return (
    /* Replaced motion.div with regular div and CSS animation */
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
                {result.disease}
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
            <Progress value={confidencePercent} className="h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Leaf className="h-4 w-4" />
                <span>Plant Type</span>
              </div>
              <p className="font-medium text-foreground">{result.plantType}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>Model Version</span>
              </div>
              <p className="font-medium text-foreground">{result.modelVersion}</p>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-border">
            <h4 className="font-semibold text-foreground">
              {isHealthy ? "Care Recommendations" : "Treatment Recommendations"}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.treatment}</p>
          </div>

          {topPredictions.length > 1 && (
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Alternative Predictions</span>
              </div>
              {topPredictions.slice(1).map((pred, idx) => (
                <div key={pred.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{pred.label}</p>
                    <p className="text-xs text-muted-foreground">Rank #{idx + 2}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(pred.prob * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
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
