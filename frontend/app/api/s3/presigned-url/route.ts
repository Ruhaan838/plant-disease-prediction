import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getPresignedUrl } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const s3Key = searchParams.get("key")

    if (!s3Key) {
      return NextResponse.json({ error: "S3 key is required" }, { status: 400 })
    }

    // Verify the key belongs to the user (security check)
    if (!s3Key.startsWith(`predictions/${session.user.id}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const presignedUrl = await getPresignedUrl(s3Key)

    return NextResponse.json({ url: presignedUrl })
  } catch (error) {
    console.error("Presigned URL error:", error)
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    )
  }
}

