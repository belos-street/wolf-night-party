const trimTrailingSlash = (url: string): string => {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export const resolveHttpBaseUrl = (): string => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL

  if (typeof envBaseUrl === 'string' && envBaseUrl.trim()) {
    return trimTrailingSlash(envBaseUrl.trim())
  }

  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return 'http://127.0.0.1:3000'
  }

  if (typeof window !== 'undefined') {
    return trimTrailingSlash(window.location.origin)
  }

  return 'http://127.0.0.1:3000'
}

export const resolveWsBaseUrl = (httpBaseUrl: string): string => {
  const envBaseUrl = import.meta.env.VITE_WS_BASE_URL

  if (typeof envBaseUrl === 'string' && envBaseUrl.trim()) {
    return trimTrailingSlash(envBaseUrl.trim())
  }

  const httpUrl = new URL(httpBaseUrl)
  const wsProtocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:'

  return `${wsProtocol}//${httpUrl.host}`
}
