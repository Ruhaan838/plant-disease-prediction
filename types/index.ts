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

export interface TopPrediction {
  id: number
  raw: string
  label: string
  prob: number
}

export interface PredictionResult {
  disease: string
  confidence: number
  treatment: string
  plantType: string
  modelVersion: string
  timestamp: string
  // Additional fields from FastAPI
  top?: TopPrediction
  topk?: TopPrediction[]
  probs?: number[]
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
  treatment: string
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
