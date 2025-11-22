"use client"

import type React from "react"

import { useCallback, useState } from "react"
import Image from "next/image"
import { Upload, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadBoxProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  previewUrl?: string | null
  disabled?: boolean
}

export function UploadBox({ onFileSelect, selectedFile, previewUrl, disabled }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((file) => file.type.startsWith("image/"))

      if (imageFile) {
        onFileSelect(imageFile)
      }
    },
    [disabled, onFileSelect],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && file.type.startsWith("image/")) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-8 transition-all duration-300",
        isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer",
      )}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        id="file-upload"
      />

      {previewUrl ? (
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-90 duration-500">
          <div className="relative w-full max-w-2xl aspect-4/3 md:aspect-video h-72 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-muted shadow-lg">
            <Image src={previewUrl} alt="Preview" fill className="object-cover" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{selectedFile?.name}</p>
            <p className="text-xs text-muted-foreground">{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ""}</p>
          </div>
        </div>
      ) : selectedFile ? (
        /* Replaced motion.div with regular div and CSS animation */
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-90 duration-500">
          <div className="relative">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <ImageIcon className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-secondary p-4 rounded-2xl">
            <Upload className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Drop your plant image here</p>
            <p className="text-sm text-muted-foreground">or click to browse files</p>
          </div>
          <p className="text-xs text-muted-foreground">Supports JPG, PNG</p>
        </div>
      )}
    </div>
  )
}
