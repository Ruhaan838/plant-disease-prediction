export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface PredictionResult {
  top: {
    id: number
    raw: string
    label: string
    prob: number
  }
  topk: Array<{
    id: number
    raw: string
    label: string
    prob: number
  }>
  probs: number[]
  modelVersion: string
  timestamp: string
  s3Key?: string
  s3Url?: string
}

export interface PredictionRequest {
  image: File
}

export interface HistoryItem {
  id: string
  userId: string
  imageUrl: string
  disease: string
  confidence: number
  plantType: string
  plantName?: string
  treatment: string | null
  modelVersion: string
  createdAt: string
}

export interface HistoryFilters {
  dateFrom?: string
  dateTo?: string
  plantType?: string
  disease?: string
  search?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ModelInfo {
  version: string
  accuracy: number
  lastUpdated: string
  supportedDiseases: string[]
  supportedPlants: string[]
}
