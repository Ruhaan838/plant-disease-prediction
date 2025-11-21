import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { uploadToS3 } from "@/lib/s3"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("image") as File

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    // Upload image to S3
    let s3Key: string | null = null
    let s3Url: string | null = null

    try {
      const uploadResult = await uploadToS3(file, session.user.id)
      s3Key = uploadResult.s3Key
      s3Url = uploadResult.url
    } catch (s3Error) {
      console.error("S3 upload error:", s3Error)
      // Continue with prediction even if S3 upload fails
      // The image can be uploaded later when saving to history
    }

    // Get FastAPI base URL from environment
    const fastApiUrl = process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000"

    // Create FormData for FastAPI (need to recreate file from buffer)
    const fileBuffer = await file.arrayBuffer()
    const blob = new Blob([fileBuffer], { type: file.type })
    const fastApiFile = new File([blob], file.name, { type: file.type })

    const fastApiFormData = new FormData()
    fastApiFormData.append("file", fastApiFile)

    // Call FastAPI /predict endpoint
    const response = await fetch(`${fastApiUrl}/predict`, {
      method: "POST",
      body: fastApiFormData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to get prediction" }))
      return NextResponse.json(
        { error: error.error || "Prediction failed" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Return only the model output without any additional processing
    // The frontend will handle display formatting
    return NextResponse.json({
      top: data.top,
      topk: data.topk || [],
      probs: data.probs || [],
      modelVersion: process.env.MODEL_VERSION || "v2.1.0",
      timestamp: new Date().toISOString(),
      // Include S3 info if upload was successful
      s3Key: s3Key || undefined,
      s3Url: s3Url || undefined,
    })
  } catch (error) {
    console.error("Prediction error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process prediction" },
      { status: 500 }
    )
  }
}

