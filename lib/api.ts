import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  PredictionResult,
  HistoryItem,
  HistoryFilters,
  PaginatedResponse,
  ModelInfo,
} from "@/types"

// Mock data matching FastAPI structure
const MOCK_USER = {
  id: "1",
  email: "user@example.com",
  name: "Plant Enthusiast",
  createdAt: new Date().toISOString(),
}

const MOCK_DISEASES = [
  "Healthy",
  "Powdery Mildew",
  "Leaf Spot",
  "Rust",
  "Blight",
  "Bacterial Wilt",
  "Root Rot",
  "Mosaic Virus",
]

const MOCK_PLANTS = ["Tomato", "Potato", "Pepper", "Cucumber", "Lettuce", "Bean"]

// Auth API
export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (credentials.email && credentials.password) {
      return {
        user: MOCK_USER,
        token: "mock_jwt_token_" + Date.now(),
      }
    }
    throw new Error("Invalid credentials")
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return {
      user: {
        ...MOCK_USER,
        email: data.email,
        name: data.name,
      },
      token: "mock_jwt_token_" + Date.now(),
    }
  },

  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
}

// Get API URL from environment or default to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Treatment recommendations based on disease type
function getTreatmentRecommendation(disease: string): string {
  const diseaseLower = disease.toLowerCase()
  
  if (diseaseLower.includes("healthy")) {
    return "No treatment needed. Continue regular care and monitoring."
  } else if (diseaseLower.includes("scab")) {
    return "Remove infected leaves. Apply fungicide. Improve air circulation and avoid overhead watering."
  } else if (diseaseLower.includes("rot")) {
    return "Remove and destroy infected parts. Improve drainage. Apply appropriate fungicide."
  } else if (diseaseLower.includes("rust")) {
    return "Remove infected leaves. Apply sulfur-based fungicide. Ensure proper spacing for air circulation."
  } else if (diseaseLower.includes("mildew")) {
    return "Apply neem oil or fungicide spray. Improve air circulation and reduce humidity."
  } else if (diseaseLower.includes("blight")) {
    return "Remove infected plants immediately. Apply copper-based fungicide. Practice crop rotation."
  } else if (diseaseLower.includes("spot") || diseaseLower.includes("leaf spot")) {
    return "Remove affected leaves. Apply copper fungicide. Avoid wetting foliage when watering."
  } else if (diseaseLower.includes("curl")) {
    return "Remove infected leaves. Control vector insects. Use resistant varieties when replanting."
  } else if (diseaseLower.includes("whitefly")) {
    return "Use insecticidal soap or neem oil. Introduce natural predators. Remove heavily infested leaves."
  } else if (diseaseLower.includes("mite") || diseaseLower.includes("spider mite")) {
    return "Spray with water to dislodge mites. Apply miticide or neem oil. Increase humidity."
  } else if (diseaseLower.includes("virus") || diseaseLower.includes("mosaic")) {
    return "Remove and destroy infected plants. Control aphid and whitefly populations. Disinfect tools."
  } else if (diseaseLower.includes("bacterial")) {
    return "Remove infected tissue. Apply copper-based bactericide. Improve sanitation and avoid overhead watering."
  }
  
  return "Monitor plant closely. Remove affected parts. Consult with a local agricultural extension office for specific treatment."
}

// Extract plant type from disease label
function extractPlantType(diseaseLabel: string): string {
  const parts = diseaseLabel.split("-")
  return parts[0]?.trim() || "Unknown"
}

// Prediction API
export const predictionApi = {
  async predict(image: File): Promise<PredictionResult> {
    const formData = new FormData()
    formData.append("file", image)

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to analyze image" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // FastAPI returns: { top: {id, raw, label, prob}, topk: [...], probs: [...] }
      const topPrediction = data.top || data.topk?.[0]
      
      if (!topPrediction) {
        throw new Error("Invalid prediction response from server")
      }

      const disease = topPrediction.label
      const confidence = topPrediction.prob
      const plantType = extractPlantType(disease)
      const treatment = getTreatmentRecommendation(disease)

      return {
        disease,
        confidence,
        treatment,
        plantType,
        modelVersion: "v2.1.0",
        timestamp: new Date().toISOString(),
        top: data.top,
        topk: data.topk,
        probs: data.probs,
      }
    } catch (error) {
      console.error("Prediction error:", error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Failed to connect to prediction service. Make sure the FastAPI server is running.")
    }
  },

  async getModelInfo(): Promise<ModelInfo> {
    try {
      const response = await fetch(`${API_URL}/labels`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch model info")
      }

      const data = await response.json()
      const classes = data.classes || []
      
      // Extract unique plant types and diseases
      const diseases = classes.map((c: any) => c.label || c.raw || c)
      const plants = [...new Set(diseases.map((d: string) => extractPlantType(d)))]

      return {
        version: "v2.1.0",
        accuracy: 0.94,
        lastUpdated: new Date().toISOString().split("T")[0],
        supportedDiseases: diseases,
        supportedPlants: plants,
      }
    } catch (error) {
      console.error("Failed to fetch model info:", error)
      // Return fallback data
      return {
        version: "v2.1.0",
        accuracy: 0.94,
        lastUpdated: "2024-01-15",
        supportedDiseases: MOCK_DISEASES,
        supportedPlants: MOCK_PLANTS,
      }
    }
  },
}

// History API
export const historyApi = {
  async getHistory(filters?: HistoryFilters, page = 1, pageSize = 10): Promise<PaginatedResponse<HistoryItem>> {
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Generate mock history data
    const mockHistory: HistoryItem[] = Array.from({ length: 25 }, (_, i) => ({
      id: `hist_${i + 1}`,
      userId: MOCK_USER.id,
      imageUrl: `/placeholder.svg?height=100&width=100&query=${MOCK_PLANTS[i % MOCK_PLANTS.length]} plant leaf`,
      disease: MOCK_DISEASES[i % MOCK_DISEASES.length],
      confidence: 0.7 + Math.random() * 0.29,
      plantType: MOCK_PLANTS[i % MOCK_PLANTS.length],
      treatment: "Treatment recommendation for this condition.",
      modelVersion: "v2.1.0",
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }))

    // Apply filters
    let filtered = mockHistory
    if (filters?.disease) {
      filtered = filtered.filter((item) => item.disease === filters.disease)
    }
    if (filters?.plantType) {
      filtered = filtered.filter((item) => item.plantType === filters.plantType)
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        (item) => item.disease.toLowerCase().includes(search) || item.plantType.toLowerCase().includes(search),
      )
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
    }
  },

  async deleteHistory(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500))
  },

  async saveToHistory(prediction: PredictionResult, imageUrl: string): Promise<HistoryItem> {
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      id: "hist_" + Date.now(),
      userId: MOCK_USER.id,
      imageUrl,
      disease: prediction.disease,
      confidence: prediction.confidence,
      plantType: prediction.plantType,
      treatment: prediction.treatment,
      modelVersion: prediction.modelVersion,
      createdAt: prediction.timestamp,
    }
  },
}

// Placeholder for future Prisma integration
export const prismaHooks = {
  // These will be replaced with actual Prisma queries
  useHistory: () => {
    // Future: useQuery with Prisma client
    return { data: [], isLoading: false, error: null }
  },
  usePredictions: () => {
    // Future: useQuery with Prisma client
    return { data: [], isLoading: false, error: null }
  },
}
