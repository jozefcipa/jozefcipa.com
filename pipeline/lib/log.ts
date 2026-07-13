export const log = (message: string): void => {
  console.log(`[pipeline] ${message}`)
}

// Logs an API failure with whatever HTTP details the SDK error carries
// (OpenRouter/Speakeasy: statusCode+body, Notion: status+body, Octokit:
// status+response.data, AWS: $metadata, grammY: error_code+description),
// then rethrows so the step still fails/retries as usual.
export function logApiError(context: string, error: unknown): never {
  const err = error as {
    statusCode?: number
    status?: number
    error_code?: number
    $metadata?: { httpStatusCode?: number }
    body?: unknown
    description?: string
    response?: { data?: unknown }
  } | null

  const status = err?.statusCode ?? err?.status ?? err?.error_code ?? err?.$metadata?.httpStatusCode
  const body = err?.body ?? err?.description ?? err?.response?.data
  const bodyText = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : ''

  console.error(
    `[pipeline] ✗ ${context} failed${status ? ` (HTTP ${status})` : ''}${bodyText ? `: ${bodyText.slice(0, 2000)}` : ''}`,
  )
  console.error(error)
  throw error
}
