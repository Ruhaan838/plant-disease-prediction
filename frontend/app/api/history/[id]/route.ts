import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Handle both sync and async params (Next.js 14+)
    const { id } = await Promise.resolve(params)

    // Verify the prediction belongs to the user
    const prediction = await prisma.prediction.findUnique({
      where: { id },
      select: { userId: true, s3Key: true, assets: { select: { s3Key: true } } },
    })

    if (!prediction) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 })
    }

    if (prediction.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete from S3 if s3Key exists (TODO: implement S3 deletion)
    // if (prediction.s3Key) {
    //   await deleteFromS3(prediction.s3Key)
    // }

    // Delete prediction (cascade will delete assets)
    await prisma.prediction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Prediction deleted successfully" })
  } catch (error) {
    console.error("History delete error:", error)
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("Record to delete does not exist")) {
        return NextResponse.json(
          { error: "Prediction not found" },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete prediction" },
      { status: 500 }
    )
  }
}

