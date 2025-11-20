"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { HistoryFilters } from "@/components/history-filters"
import { HistoryCard } from "@/components/history-card"
import { HistoryDetailModal } from "@/components/history-detail-modal"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/lib/auth"
import { historyApi } from "@/lib/api"
import type { HistoryItem, HistoryFilters as Filters } from "@/types"
import { ChevronLeft, ChevronRight, FileX } from "lucide-react"

export default function HistoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())

  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const pageSize = 12

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      try {
        const response = await historyApi.getHistory(filters, page, pageSize)
        setHistory(response.data)
        setTotalPages(Math.ceil(response.total / pageSize))
      } catch (error) {
        console.error("Failed to fetch history:", error)
        toast({
          title: "Error",
          description: "Failed to load history",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchHistory()
    }
  }, [filters, page, isAuthenticated, toast])

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleResetFilters = () => {
    setFilters({})
    setPage(1)
  }

  const handleViewDetails = (item: HistoryItem) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      await historyApi.deleteHistory(id)
      setHistory((prev) => prev.filter((item) => item.id !== id))
      setIsModalOpen(false)
      toast({
        title: "Deleted",
        description: "Prediction removed from history",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete prediction",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-balance">Prediction History</h1>
            <p className="text-muted-foreground text-balance">View and manage your past plant disease predictions</p>
          </div>

          <HistoryFilters filters={filters} onFiltersChange={handleFiltersChange} onReset={handleResetFilters} />

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : history.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {history.map((item, index) => (
                  /* Replaced motion.div with staggered CSS animations using inline style */
                  <div
                    key={item.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <HistoryCard item={item} onViewDetails={() => handleViewDetails(item)} />
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted rounded-full p-6 mb-4">
                <FileX className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No predictions found</h3>
              <p className="text-muted-foreground mb-6 text-balance">
                {Object.keys(filters).length > 0
                  ? "Try adjusting your filters or upload a new image"
                  : "Start by uploading plant images for analysis"}
              </p>
              <Button onClick={() => router.push("/upload")}>Upload Image</Button>
            </div>
          )}
        </div>
      </main>

      <HistoryDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
