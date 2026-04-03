/**
 * Derive a display name from profile data or email fallback.
 */
export function getDisplayName(
  profileName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (profileName) return profileName
  if (email) return email.split('@')[0] ?? 'User'
  return 'User'
}

/**
 * Extract up to 2 uppercase initials from a display name.
 */
export function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
