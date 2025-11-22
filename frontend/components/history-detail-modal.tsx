"use client"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Trash2, Leaf, Activity, Calendar, AlertCircle, CheckCircle2 } from "lucide-react"
import type { HistoryItem } from "@/types"

interface HistoryDetailModalProps {
  item: HistoryItem | null
  isOpen: boolean
  onClose: () => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function HistoryDetailModal({ item, isOpen, onClose, onDelete, isDeleting = false }: HistoryDetailModalProps) {
  if (!item) return null

  const isHealthy = item.disease.toLowerCase() === "healthy"
  const confidencePercentValue = item.confidence * 100
  const confidencePercent = confidencePercentValue.toFixed(2)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-balance">
            {isHealthy ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : (
              <AlertCircle className="h-6 w-6 text-destructive" />
            )}
            {item.disease}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <Image
              src={item.imageUrl || "/placeholder.svg"}
              alt={`${item.plantType} - ${item.disease}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence Level</span>
              <Badge variant={isHealthy ? "default" : "destructive"}>{confidencePercent}%</Badge>
            </div>
            <Progress value={confidencePercentValue} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Leaf className="h-4 w-4" />
                <span>Plant Type</span>
              </div>
              <p className="font-medium text-foreground">{item.plantType}</p>
            </div>

       

            <div className="space-y-1 col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Analyzed On</span>
              </div>
              <p className="font-medium text-foreground">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <Separator />

          {/* <div className="space-y-2">
            <h4 className="font-semibold text-foreground">
              {isHealthy ? "Care Recommendations" : "Treatment Recommendations"}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.treatment}</p>
          </div> */}

          {/* <Separator /> */}

          <div className="flex gap-3">
            <Button onClick={() => onDelete(item.id)} disabled={isDeleting} variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
