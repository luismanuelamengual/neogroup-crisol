/**
 * Name shown for a user: its nickname when it has one, otherwise its player name and last name,
 * or the local part of its email when it has none.
 */
export function getUserDisplayName(user: {
  name?: string | null
  lastName?: string | null
  nickname?: string | null
  email: string
}): string {
  const nickname = user.nickname?.trim()

  if (nickname) {
    return nickname
  }

  const name = [user.name?.trim(), user.lastName?.trim()].filter(Boolean).join(' ')

  if (name) {
    return name
  }

  return user.email.split('@')[0] ?? user.email
}

/** Trims and collapses the inner whitespace of a player name. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

/** Very small email sanity check used by the register / forgot-password endpoints. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
