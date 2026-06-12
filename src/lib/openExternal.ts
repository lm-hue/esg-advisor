export function openExternalInNewTabOnly(href: string) {
  const normalized = (href || '').trim()
  if (!normalized) return

  const opened = window.open(normalized, '_blank', 'noopener,noreferrer')
  if (opened) {
    try {
      opened.opener = null
    } catch {
      // Ignore browsers that do not allow touching opener.
    }
  }
}
