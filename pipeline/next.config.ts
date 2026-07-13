import type { NextConfig } from 'next'
import { withWorkflow } from 'workflow/next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
}

export default withWorkflow(nextConfig)
