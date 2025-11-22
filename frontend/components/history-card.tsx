"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Leaf, Eye } from "lucide-react"
import type { HistoryItem } from "@/types"

interface HistoryCardProps {
  item: HistoryItem
  onViewDetails: () => void
}

export function HistoryCard({ item, onViewDetails }: HistoryCardProps) {
  const isHealthy = item.disease.toLowerCase() === "healthy"
  const confidencePercent = (item.confidence * 100).toFixed(2)

  return (
    /* Replaced motion.div with regular div and hover transition */
    <Card
      className="overflow-hidden border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
      onClick={onViewDetails}
    >
      <div className="relative aspect-square bg-muted">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={`${item.plantType} - ${item.disease}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        <div className="absolute top-2 right-2">
          <Badge variant={isHealthy ? "default" : "destructive"} className="backdrop-blur-sm bg-black">
            {confidencePercent}%
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground line-clamp-1">{item.disease}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="h-3.5 w-3.5" />
            <span>{item.plantType}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(item.createdAt).toLocaleDateString()}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails()
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
