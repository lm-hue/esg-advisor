export function withAuthModal(pathname: string, search: string) {
  const params = new URLSearchParams(search)
  params.set('auth', '1')
  const nextSearch = params.toString()
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}`
}

export function withoutAuthModal(pathname: string, search: string) {
  const params = new URLSearchParams(search)
  params.delete('auth')
  const nextSearch = params.toString()
  return `${pathname}${nextSearch ? `?${nextSearch}` : ''}`
}

export function isAuthModalOpen(search: string) {
  return new URLSearchParams(search).get('auth') === '1'
}
