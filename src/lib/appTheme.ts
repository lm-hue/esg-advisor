export const CATEGORY_BADGES: Record<string, string> = {
  Climate: 'bg-amber-100 text-amber-800',
  Circularity: 'bg-cyan-100 text-cyan-700',
  Nature: 'bg-teal-100 text-teal-700',
  Social: 'bg-blue-100 text-blue-700',
  Governance: 'bg-purple-100 text-purple-700',
}

export const CATEGORY_DOTS: Record<string, string> = {
  Climate: 'bg-amber-500',
  Circularity: 'bg-cyan-500',
  Nature: 'bg-teal-500',
  Social: 'bg-blue-500',
  Governance: 'bg-purple-500',
}

export const STATUS_BADGES: Record<string, string> = {
  in_force: 'bg-red-100 text-red-700',
  adopted: 'bg-orange-100 text-orange-700',
  draft: 'bg-amber-100 text-amber-700',
  amended: 'bg-blue-100 text-blue-700',
  repealed: 'bg-slate-100 text-slate-500',
}

export const REGION_FLAGS: Record<string, string> = {
  EU: '🇪🇺',
  USA: '🇺🇸',
  UK: '🇬🇧',
  Australia: '🇦🇺',
  Global: '🌍',
  Canada: '🇨🇦',
  Japan: '🇯🇵',
  Brazil: '🇧🇷',
  Singapore: '🇸🇬',
  'South Africa': '🇿🇦',
  'Hong Kong': '🇭🇰',
}

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ')
}
