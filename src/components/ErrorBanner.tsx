import { errorMessage } from '../api/http'

export function ErrorBanner({ error }: { error?: unknown }) {
  if (!error) return null
  return <div className="error-banner" role="alert">{errorMessage(error)}</div>
}
