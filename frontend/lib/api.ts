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

// Prediction API
export const predictionApi = {
  async predict(image: File): Promise<PredictionResult> {
    const formData = new FormData()
    formData.append("image", image)

    const response = await fetch("/api/predict", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to get prediction" }))
      throw new Error(error.error || "Prediction failed")
    }

    const data = await response.json()
    return data
  },

  async getModelInfo(): Promise<ModelInfo> {
    const response = await fetch("/api/model-info")

    if (!response.ok) {
      // Return fallback data if API fails
      return {
        version: "v2.1.0",
        accuracy: 0.94,
        lastUpdated: new Date().toISOString().split("T")[0],
        supportedDiseases: MOCK_DISEASES,
        supportedPlants: MOCK_PLANTS,
      }
    }

    const data = await response.json()
    return data
  },
}

// History API
export const historyApi = {
  async getHistory(filters?: HistoryFilters, page = 1, pageSize = 10): Promise<PaginatedResponse<HistoryItem>> {
    const params = new URLSearchParams()
    params.append("page", page.toString())
    params.append("pageSize", pageSize.toString())

    if (filters?.disease) params.append("disease", filters.disease)
    if (filters?.plantType) params.append("plantType", filters.plantType)
    if (filters?.search) params.append("search", filters.search)
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom)
    if (filters?.dateTo) params.append("dateTo", filters.dateTo)

    const response = await fetch(`/api/history?${params.toString()}`)

    if (!response.ok) {
      throw new Error("Failed to fetch history")
    }

    return response.json()
  },

  async deleteHistory(id: string): Promise<void> {
    const response = await fetch(`/api/history/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to delete prediction" }))
      throw new Error(error.error || "Failed to delete prediction")
    }
  },

  async saveToHistory(
    prediction: PredictionResult,
    imageUrl: string,
    imageFile?: File | null,
    s3Key?: string
  ): Promise<HistoryItem> {
    // Convert file to base64 if provided (browser-compatible)
    let imageFileBase64: string | undefined
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ""
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)
      const mimeType = imageFile.type || "image/jpeg"
      imageFileBase64 = `data:${mimeType};base64,${base64}`
    }

    const response = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prediction,
        imageUrl: imageFileBase64 ? undefined : imageUrl, // Only send URL if no file
        imageFile: imageFileBase64,
        s3Key,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Failed to save prediction" }))
      throw new Error(error.error || "Failed to save prediction")
    }

    return response.json()
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
