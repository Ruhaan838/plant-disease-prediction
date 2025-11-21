"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import type { HistoryFilters as Filters } from "@/types"

interface HistoryFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  onReset: () => void
}

const PLANT_TYPES = ["All", "Tomato", "Potato", "Pepper", "Cucumber", "Lettuce", "Bean"]
const DISEASES = [
  "All",
  "Healthy",
  "Powdery Mildew",
  "Leaf Spot",
  "Rust",
  "Blight",
  "Bacterial Wilt",
  "Root Rot",
  "Mosaic Virus",
]

export function HistoryFilters({ filters, onFiltersChange, onReset }: HistoryFiltersProps) {
  const hasActiveFilters = filters.search || filters.plantType || filters.disease

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search predictions..."
              value={filters.search || ""}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plant-type" className="text-sm">
            Plant Type
          </Label>
          <Select
            value={filters.plantType || "All"}
            onValueChange={(value) => onFiltersChange({ ...filters, plantType: value === "All" ? undefined : value })}
          >
            <SelectTrigger id="plant-type">
              <SelectValue placeholder="All plants" />
            </SelectTrigger>
            <SelectContent>
              {PLANT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="disease" className="text-sm">
            Disease
          </Label>
          <Select
            value={filters.disease || "All"}
            onValueChange={(value) => onFiltersChange({ ...filters, disease: value === "All" ? undefined : value })}
          >
            <SelectTrigger id="disease">
              <SelectValue placeholder="All diseases" />
            </SelectTrigger>
            <SelectContent>
              {DISEASES.map((disease) => (
                <SelectItem key={disease} value={disease}>
                  {disease}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          {hasActiveFilters && (
            <Button onClick={onReset} variant="outline" className="w-full gap-2 bg-transparent">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
