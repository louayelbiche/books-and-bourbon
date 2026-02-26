import { createHealthCheck } from '@runwell/health'

export const GET = createHealthCheck({
  projectName: 'books-and-bourbon',
  version: process.env.npm_package_version || '0.1.0',
  checks: [],
})
