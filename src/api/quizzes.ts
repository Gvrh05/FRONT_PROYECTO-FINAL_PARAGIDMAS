import type { AxiosInstance } from 'axios'
import type {
  QuestionInput,
  QuestionResource,
  QuizDetail,
  QuizInput,
  QuizSummary,
} from '../types'

const base = '/quizzes'

export async function listQuizzes(
  client: AxiosInstance,
  signal?: AbortSignal,
): Promise<QuizSummary[]> {
  const { data } = await client.get<QuizSummary[]>(base, { signal })
  return data
}

export async function getQuiz(
  client: AxiosInstance,
  id: string,
  signal?: AbortSignal,
): Promise<QuizDetail> {
  const { data } = await client.get<QuizDetail>(`${base}/${id}`, { signal })
  return data
}

export async function createQuiz(
  client: AxiosInstance,
  input: QuizInput,
): Promise<QuizSummary> {
  const { data } = await client.post<QuizSummary>(base, input)
  return data
}

export async function updateQuiz(
  client: AxiosInstance,
  id: string,
  input: Partial<QuizInput>,
): Promise<QuizSummary> {
  const { data } = await client.patch<QuizSummary>(`${base}/${id}`, input)
  return data
}

export async function deleteQuiz(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`${base}/${id}`)
}

export async function createQuestion(
  client: AxiosInstance,
  quizId: string,
  input: QuestionInput,
): Promise<QuestionResource> {
  const { data } = await client.post<QuestionResource>(
    `${base}/${quizId}/questions`,
    input,
  )
  return data
}

export async function updateQuestion(
  client: AxiosInstance,
  quizId: string,
  questionId: string,
  input: Partial<QuestionInput>,
): Promise<QuestionResource> {
  const { data } = await client.patch<QuestionResource>(
    `${base}/${quizId}/questions/${questionId}`,
    input,
  )
  return data
}

export async function deleteQuestion(
  client: AxiosInstance,
  quizId: string,
  questionId: string,
): Promise<void> {
  await client.delete(`${base}/${quizId}/questions/${questionId}`)
}

export async function uploadQuestionImage(
  client: AxiosInstance,
  quizId: string,
  questionId: string,
  file: File,
): Promise<QuestionResource> {
  const body = new FormData()
  body.append('image', file)
  // Never set Content-Type manually: the browser adds the multipart boundary.
  const { data } = await client.post<QuestionResource>(
    `${base}/${quizId}/questions/${questionId}/image`,
    body,
  )
  return data
}

export async function deleteQuestionImage(
  client: AxiosInstance,
  quizId: string,
  questionId: string,
): Promise<void> {
  await client.delete(`${base}/${quizId}/questions/${questionId}/image`)
}

export async function fetchQuestionImage(
  client: AxiosInstance,
  imageUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const apiOrigin = new URL(
    client.defaults.baseURL ?? '',
    window.location.origin,
  ).origin
  const publicUrl = new URL(imageUrl, apiOrigin).toString()
  const { data } = await client.get<Blob>(publicUrl, {
    responseType: 'blob',
    signal,
  })
  return data
}
