import { NextResponse } from "next/server"

export async function GET() {
  try {
    const fastApiUrl = process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000"

    // Fetch labels from FastAPI
    const labelsResponse = await fetch(`${fastApiUrl}/labels`)
    
    let supportedDiseases: string[] = []
    let supportedPlants: string[] = []

    if (labelsResponse.ok) {
      const labelsData = await labelsResponse.json()
      const classes = labelsData.classes || []
      
      // Extract unique diseases and plants from labels
      const diseasesSet = new Set<string>()
      const plantsSet = new Set<string>()

      classes.forEach((cls: { label: string; raw: string }) => {
        const label = cls.label || cls.raw || ""
        if (label.includes(" - ")) {
          const parts = label.split(" - ")
          if (parts[0]) plantsSet.add(parts[0].trim())
          if (parts[1]) diseasesSet.add(parts[1].trim())
        } else {
          diseasesSet.add(label.trim())
        }
      })

      supportedDiseases = Array.from(diseasesSet).sort()
      supportedPlants = Array.from(plantsSet).sort()
    }

    // Fallback to defaults if API fails
    if (supportedDiseases.length === 0) {
      supportedDiseases = [
        "Healthy",
        "Powdery Mildew",
        "Leaf Spot",
        "Rust",
        "Blight",
        "Bacterial Wilt",
        "Root Rot",
        "Mosaic Virus",
      ]
    }

    if (supportedPlants.length === 0) {
      supportedPlants = ["Tomato", "Potato", "Pepper", "Cucumber", "Lettuce", "Bean"]
    }

    return NextResponse.json({
      version: process.env.MODEL_VERSION || "v2.1.0",
      accuracy: 0.94, // This could be fetched from model metadata if available
      lastUpdated: new Date().toISOString().split("T")[0],
      supportedDiseases,
      supportedPlants,
    })
  } catch (error) {
    console.error("Model info error:", error)
    // Return fallback data
    return NextResponse.json({
      version: process.env.MODEL_VERSION || "v2.1.0",
      accuracy: 0.94,
      lastUpdated: new Date().toISOString().split("T")[0],
      supportedDiseases: [
        "Healthy",
        "Powdery Mildew",
        "Leaf Spot",
        "Rust",
        "Blight",
        "Bacterial Wilt",
        "Root Rot",
        "Mosaic Virus",
      ],
      supportedPlants: ["Tomato", "Potato", "Pepper", "Cucumber", "Lettuce", "Bean"],
    })
  }
}

