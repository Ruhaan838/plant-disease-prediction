import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { uploadToS3, getPresignedUrl } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const disease = searchParams.get("disease")
    const plantType = searchParams.get("plantType")
    const search = searchParams.get("search")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (disease) {
      where.disease = disease
    }

    if (plantType) {
      where.plantType = plantType
    }

    if (search) {
      where.OR = [
        { disease: { contains: search, mode: "insensitive" } },
        { plantType: { contains: search, mode: "insensitive" } },
        { plantName: { contains: search, mode: "insensitive" } },
      ]
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Get total count
    const total = await prisma.prediction.count({ where })

    // Get predictions with pagination
    const predictions = await prisma.prediction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        assets: {
          take: 1, // Get first image asset
        },
      },
    })

    // Transform to HistoryItem format and generate presigned URLs for S3 images
    const data = await Promise.all(
      predictions.map(async (pred) => {
        // Get S3 key from assets or prediction
        const s3Key = pred.assets[0]?.s3Key || pred.s3Key
        let imageUrl = pred.assets[0]?.url || pred.imageUrl || "/placeholder.svg"
        
        // If it's a blob URL, it's invalid - use placeholder
        if (imageUrl.startsWith("blob:")) {
          imageUrl = "/placeholder.svg"
        }
        
        // If we have an S3 key, generate a presigned URL
        if (s3Key) {
          try {
            imageUrl = await getPresignedUrl(s3Key)
          } catch (error) {
            console.error(`Failed to generate presigned URL for ${s3Key}:`, error)
            // Fall back to stored URL or placeholder
            if (!imageUrl || imageUrl.startsWith("blob:")) {
              imageUrl = "/placeholder.svg"
            }
          }
        }
        
        return {
          id: pred.id,
          userId: pred.userId,
          imageUrl,
          disease: pred.disease,
          confidence: Number(pred.confidence),
          plantType: pred.plantType || "",
          plantName: pred.plantName || "",
          treatment: pred.treatment || null,
          modelVersion: pred.modelVersion || "v2.1.0",
          createdAt: pred.createdAt.toISOString(),
        }
      })
    )

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error("History fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { prediction, imageUrl, s3Key, imageFile } = body

    if (!prediction || !prediction.top) {
      return NextResponse.json({ error: "Invalid prediction data" }, { status: 400 })
    }

    // Upload image to S3 - prioritize file upload over existing S3 key
    let finalS3Key = s3Key || null
    let finalImageUrl = imageUrl || null

    // Always try to upload if we have imageFile and no S3 key, or if imageUrl is a blob URL
    if (imageFile && (!s3Key || (imageUrl && imageUrl.startsWith("blob:")))) {
      try {
        // If imageFile is a base64 string, convert it to buffer
        let fileBuffer: Buffer
        if (typeof imageFile === "string" && imageFile.startsWith("data:")) {
          // Base64 data URL: data:image/jpeg;base64,/9j/4AAQ...
          const base64Data = imageFile.split(",")[1]
          if (!base64Data) {
            throw new Error("Invalid base64 data")
          }
          fileBuffer = Buffer.from(base64Data, "base64")
        } else if (imageFile instanceof File) {
          const arrayBuffer = await imageFile.arrayBuffer()
          fileBuffer = Buffer.from(arrayBuffer)
        } else {
          throw new Error("Invalid image file format")
        }

        const uploadResult = await uploadToS3(fileBuffer, session.user.id)
        finalS3Key = uploadResult.s3Key
        finalImageUrl = uploadResult.url
      } catch (s3Error) {
        console.error("S3 upload error:", s3Error)
        // If S3 upload fails and we have a blob URL, we can't save it properly
        if (imageUrl && imageUrl.startsWith("blob:")) {
          throw new Error("Failed to upload image to S3. Blob URLs cannot be saved permanently.")
        }
        // Continue without S3 upload if it fails but we have a valid URL
      }
    } else if (imageUrl && !s3Key && imageUrl.startsWith("blob:")) {
      // If we have a blob URL but no S3 key and no file, we can't save it
      throw new Error("Cannot save blob URL. Please provide the image file for upload to S3.")
    }

    // Ensure we have a valid image URL (not a blob URL)
    if (finalImageUrl && finalImageUrl.startsWith("blob:")) {
      finalImageUrl = null
    }

    // Extract disease and plant type from model output
    const top = prediction.top
    const label = top.label || top.raw || ""
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

    // Create prediction in database
    const savedPrediction = await prisma.prediction.create({
      data: {
        userId: session.user.id,
        disease: disease || "Unknown",
        confidence: top.prob || 0,
        plantType: plantType || null,
        plantName: plantType || null,
        modelVersion: prediction.modelVersion || process.env.MODEL_VERSION || "v2.1.0",
        imageUrl: finalImageUrl || null,
        s3Key: finalS3Key || null,
        metadata: {
          top: prediction.top,
          topk: prediction.topk || [],
          probs: prediction.probs || [],
        },
        saved: true,
        assets: finalImageUrl
          ? {
              create: {
                url: finalImageUrl,
                s3Key: finalS3Key || null,
                type: "IMAGE",
              },
            }
          : undefined,
      },
      include: {
        assets: {
          take: 1,
        },
      },
    })

    return NextResponse.json({
      id: savedPrediction.id,
      userId: savedPrediction.userId,
      imageUrl: savedPrediction.assets[0]?.url || savedPrediction.imageUrl || "/placeholder.svg",
      disease: savedPrediction.disease,
      confidence: Number(savedPrediction.confidence),
      plantType: savedPrediction.plantType || "",
      plantName: savedPrediction.plantName || "",
      treatment: savedPrediction.treatment || null,
      modelVersion: savedPrediction.modelVersion || "v2.1.0",
      createdAt: savedPrediction.createdAt.toISOString(),
    })
  } catch (error) {
    console.error("History save error:", error)
    return NextResponse.json(
      { error: "Failed to save prediction" },
      { status: 500 }
    )
  }
}

