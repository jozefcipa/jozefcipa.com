const required = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const optional = (name: string, fallback: string): string => process.env[name] ?? fallback

export const config = {
  // Telegram — the bot only talks to this user (numeric Telegram user id as a string)
  get telegramBotToken() {
    return required('TELEGRAM_BOT_TOKEN')
  },
  get telegramWebhookSecret() {
    return optional('TELEGRAM_WEBHOOK_SECRET_TOKEN', '')
  },
  get telegramAllowedUserId() {
    return required('TELEGRAM_ALLOWED_USER_ID')
  },

  // Notion internal integration token; articles must be shared with the integration
  get notionToken() {
    return required('NOTION_TOKEN')
  },

  // OpenRouter model ids (OPENROUTER_API_KEY is read by the SDK itself)
  get textModel() {
    return optional('TEXT_MODEL', 'google/gemini-3.1-flash-lite-preview')
  },
  get imageModel() {
    return optional('IMAGE_MODEL', 'google/gemini-2.5-flash-image')
  },

  // GitHub — fine-grained PAT with contents read/write on the site repo
  get githubToken() {
    return required('GITHUB_TOKEN')
  },
  get githubRepo() {
    return optional('GITHUB_REPO', 'jozefcipa/jozefcipa.com')
  },
  get siteDefaultBranch() {
    return optional('SITE_DEFAULT_BRANCH', 'main')
  },

  // S3 — AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are read by the AWS SDK itself
  get s3Bucket() {
    return required('S3_BUCKET')
  },
  get awsRegion() {
    return optional('AWS_REGION', 'us-east-1')
  },
  get assetsBaseUrl() {
    return optional('ASSETS_BASE_URL', 'https://assets.jozefcipa.com')
  },

  // Vercel project of the Hugo site, used to compute preview deployment URLs
  get siteVercelProjectName() {
    return required('SITE_VERCEL_PROJECT_NAME')
  },
  get vercelTeamSlug() {
    return required('VERCEL_TEAM_SLUG')
  },
  get siteBaseUrl() {
    return optional('SITE_BASE_URL', 'https://jozefcipa.com')
  },
}
