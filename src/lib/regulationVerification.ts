import type { Regulation } from '../types'

const HUMAN_VERIFIED_STORAGE_KEY = 'esg-advisor-human-verified-overrides-v1'

type HumanVerifiedOverrides = Record<string, boolean>

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readHumanVerifiedOverrides(): HumanVerifiedOverrides {
  if (!canUseBrowserStorage()) return {}

  try {
    const raw = window.localStorage.getItem(HUMAN_VERIFIED_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    const entries = Object.entries(parsed).filter(([, value]) => typeof value === 'boolean')
    return Object.fromEntries(entries) as HumanVerifiedOverrides
  } catch {
    return {}
  }
}

function writeHumanVerifiedOverrides(overrides: HumanVerifiedOverrides) {
  if (!canUseBrowserStorage()) return

  try {
    window.localStorage.setItem(HUMAN_VERIFIED_STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Ignore storage failures and keep the UI responsive.
  }
}

export function getHumanVerifiedOverride(regulationId: string) {
  return readHumanVerifiedOverrides()[regulationId]
}

export function setHumanVerifiedOverride(regulationId: string, verified: boolean) {
  const overrides = readHumanVerifiedOverrides()
  overrides[regulationId] = verified
  writeHumanVerifiedOverrides(overrides)
}

export function clearHumanVerifiedOverride(regulationId: string) {
  const overrides = readHumanVerifiedOverrides()
  if (!(regulationId in overrides)) return
  delete overrides[regulationId]
  writeHumanVerifiedOverrides(overrides)
}

export function applyHumanVerifiedOverride<T extends Pick<Regulation, 'id' | 'human_verified'>>(regulation: T): T {
  const override = getHumanVerifiedOverride(regulation.id)
  if (typeof override !== 'boolean') return regulation
  return {
    ...regulation,
    human_verified: override,
  }
}

export function applyHumanVerifiedOverrides<T extends Pick<Regulation, 'id' | 'human_verified'>>(regulations: T[]) {
  const overrides = readHumanVerifiedOverrides()
  if (Object.keys(overrides).length === 0) return regulations

  return regulations.map((regulation) => {
    const override = overrides[regulation.id]
    if (typeof override !== 'boolean') return regulation
    return {
      ...regulation,
      human_verified: override,
    }
  })
}
