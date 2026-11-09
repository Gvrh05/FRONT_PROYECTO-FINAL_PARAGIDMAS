export interface AuthUser {
  id: string
  username: string
  role: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface QuizSummary {
  id: string
  authorId: string
  isDemo?: boolean
  title: string
  description: string | null
  coverImageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface QuestionOptionResource {
  id: string
  text: string
  isCorrect: boolean
}

export interface QuestionResource {
  id: string
  quizId: string
  questionText: string
  timeLimitSeconds: number
  points: number
  options: QuestionOptionResource[]
  imageUrl: string | null
}

export interface QuizDetail extends QuizSummary {
  questions: QuestionResource[]
}

export interface QuizInput {
  title: string
  description?: string | null
  coverImageUrl?: string | null
}

export interface QuestionOptionInput {
  text: string
  isCorrect: boolean
}

export interface QuestionInput {
  questionText: string
  timeLimitSeconds?: number
  points?: number
  options: QuestionOptionInput[]
}
