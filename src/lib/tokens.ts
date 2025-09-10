import crypto from 'crypto'

/**
 * Generate a cryptographically secure access token
 */
export function generateAccessToken(): string {
  const randomBytes = crypto.randomBytes(48)
  return `at_${randomBytes.toString('base64url')}`
}

/**
 * Generate a cryptographically secure refresh token
 */
export function generateRefreshToken(): string {
  const randomBytes = crypto.randomBytes(48)
  return `rt_${randomBytes.toString('base64url')}`
}

/**
 * Generate a cryptographically secure OAuth state parameter
 */
export function generateOAuthState(): string {
  const randomBytes = crypto.randomBytes(32)
  return randomBytes.toString('base64url')
}

/**
 * Generate a cryptographically secure authorization code
 */
export function generateAuthCode(): string {
  const randomBytes = crypto.randomBytes(32)
  return `ac_${randomBytes.toString('base64url')}`
}
