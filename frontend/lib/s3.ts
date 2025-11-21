import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "plant-disease-uploads"
const UPLOAD_PREFIX = process.env.S3_UPLOAD_PREFIX || "predictions"

/**
 * Upload a file to S3
 * @param file - The file to upload
 * @param userId - User ID for organizing uploads
 * @returns Object with s3Key and url
 */
export async function uploadToS3(
  file: File | Buffer,
  userId: string
): Promise<{ s3Key: string; url: string }> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials are not configured")
  }

  // Generate unique key for the file
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const fileExtension = file instanceof File ? file.name.split(".").pop() : "jpg"
  const s3Key = `${UPLOAD_PREFIX}/${userId}/${timestamp}-${randomId}.${fileExtension}`

  // Convert file to buffer if it's a File
  let buffer: Buffer
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
  } else if (file instanceof Uint8Array) {
    buffer = Buffer.from(file)
  } else {
    buffer = file
  }

  // Determine content type
  const contentType = file instanceof File ? file.type : "image/jpeg"

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
    // Make the object publicly readable (adjust based on your needs)
    // ACL: "public-read", // Uncomment if you want public access
  })

  await s3Client.send(command)

  // Generate presigned URL for reading (valid for 7 days)
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  })
  const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }) // 7 days

  return { s3Key, url }
}

/**
 * Generate a presigned URL for reading an S3 object
 * @param s3Key - The S3 key
 * @param expiresIn - Expiration time in seconds (default: 7 days)
 * @returns Presigned URL
 */
export async function getPresignedUrl(s3Key: string, expiresIn = 604800): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

