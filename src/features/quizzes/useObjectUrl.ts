import { useEffect, useState } from 'react'

/**
 * Creates and revokes an object URL for a blob. Revoking on change/unmount
 * keeps previews and authenticated images from leaking memory or surviving
 * a logout.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])

  return url
}
