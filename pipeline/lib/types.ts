export interface ArticleMeta {
  title: string
  slug: string
  tags: string[]
  summary: string
}

export interface ReviewDecision {
  action: 'publish' | 'cancel' | 'revise'
  updates?: {
    title?: string
    slug?: string
    tags?: string[]
    summary?: string
  }
  regenerateCover?: boolean
  coverFeedback?: string
  refetchContent?: boolean
  reply?: string
}
