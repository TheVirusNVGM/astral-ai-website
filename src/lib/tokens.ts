/**
 * Convert Uint8Array to base64url string (Edge Runtime compatible)
 */
function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Generate cryptographically secure random bytes (Edge Runtime compatible)
 */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

/**
 * Generate a cryptographically secure access token
 */
export function generateAccessToken(): string {
  const bytes = randomBytes(48)
  return `at_${toBase64Url(bytes)}`
}

/**
 * Generate a cryptographically secure refresh token
 */
export function generateRefreshToken(): string {
  const bytes = randomBytes(48)
  return `rt_${toBase64Url(bytes)}`
}

/**
 * Generate a cryptographically secure OAuth state parameter
 */
export function generateOAuthState(): string {
  const bytes = randomBytes(32)
  return toBase64Url(bytes)
}

/**
 * Generate a cryptographically secure authorization code
 */
export function generateAuthCode(): string {
  const bytes = randomBytes(32)
  return `ac_${toBase64Url(bytes)}`
}
