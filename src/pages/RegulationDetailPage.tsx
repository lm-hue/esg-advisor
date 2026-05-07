import { KeyboardEvent, useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { withAuthModal } from '../lib/authModal'
import BookmarkHint from '../components/BookmarkHint'
import { fetchRegulationById, fetchRegulationSourceDocuments, fetchRelatedRegulations } from '../lib/regulations'
import { getUserWatchlist, saveUserWatchlist } from '../lib/userSettings'
import { Regulation, RegulationSourceDocument } from '../types'
import { ArrowLeft, ArrowUp, ExternalLink, FileText, GitBranch, Globe, Star } from 'lucide-react'
import {
  CATEGORY_BADGES,
  CATEGORY_DOTS,
  STATUS_BADGES,
  TOPIC_BADGES,
  formatCategoryLabel,
  formatDateWithPrecision,
  formatJurisdictionTypeLabel,
  formatRegulationTypeLabel,
  formatStatusLabel,
  formatTopicLabel,
  getJurisdictionTypeDefinition,
  getRegulationTypeDefinition,
  getRegulationTypeKey,
  getStatusDefinition,
  getTopicDefinition,
  normalizeCategoryKey,
} from '../lib/appTheme'
import { REGION_EMOJIS } from '../lib/geography'

interface RegulationDetailPageProps {
  user: any
}

const ARCHIVED_SOURCE_PREFIX = 'https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/'

function isCarrotsSourceUrl(url?: string | null) {
  return (url || '').trim().toLowerCase().includes('carrotsandsticks.org')
}

function isArchivedSourceUrl(url?: string | null) {
  return (url || '').trim().toLowerCase().startsWith(ARCHIVED_SOURCE_PREFIX.toLowerCase())
}

function sanitizeUrl(url?: string | null) {
  const normalized = (url || '').trim()
  if (!normalized) return ''
  if (isCarrotsSourceUrl(normalized)) return ''
  return normalized
}

function looksLikePdfUrl(url?: string | null) {
  const normalized = (url || '').trim().toLowerCase()
  return normalized.includes('/api/download-pdf') || normalized.endsWith('.pdf')
}

function getOfficialWebsiteHref(regulation: Regulation, sourceDocuments: RegulationSourceDocument[]) {
  const candidates = [
    regulation.official_source_url,
    ...sourceDocuments.map((document) => document.official_source_url),
  ]
    .map((url) => sanitizeUrl(url))
    .filter((url) => !!url && !isArchivedSourceUrl(url))

  return candidates.find((url) => !looksLikePdfUrl(url)) || ''
}

function getPolicySourceHref(
  regulation: Regulation,
  sourceDocuments: RegulationSourceDocument[],
) {
  const candidates = [
    regulation.policy_page_url,
    ...sourceDocuments.map((document) => document.policy_page_url),
  ]
    .map((url) => sanitizeUrl(url))
    .filter((url) => !!url && !isArchivedSourceUrl(url) && !looksLikePdfUrl(url))

  return candidates.find((url, index) => candidates.indexOf(url) === index) || ''
}

function getSourceDocumentDisplayHref(document: RegulationSourceDocument) {
  if (document.document_type === 'pdf') return sanitizeUrl(document.archived_public_url)
  return sanitizeUrl(document.document_url || document.official_source_url)
}

export default function RegulationDetailPage({ user }: RegulationDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [regulation, setRegulation] = useState<Regulation | null>(null)
  const [sourceDocuments, setSourceDocuments] = useState<RegulationSourceDocument[]>([])
  const [familyChildren, setFamilyChildren] = useState<Regulation[]>([])
  const [umbrellaParent, setUmbrellaParent] = useState<Regulation | null>(null)
  const [loading, setLoading] = useState(true)
  const [isWatched, setIsWatched] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const navigationState = (
    location.state as {
      backLabel?: string
      backTo?: string
      sourceDocumentBackTo?: string
      sourceDocumentBackLabel?: string
    } | null
  ) ?? null
  const isEsgHomeDetailRoute = location.pathname.startsWith('/esg-home/')

  useEffect(() => {
    fetchRegulation()
    if (user) checkWatchlist()
  }, [id, user])

  useEffect(() => {
    const scroller = document.getElementById('main-scroll')
    if (!scroller) return

    const onScroll = () => setShowScrollTop(scroller.scrollTop > 400)
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })

    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  const fetchRegulation = async () => {
    if (!id) return

    try {
      const data = await fetchRegulationById(id)
      setRegulation(data)
      if (id) {
        const documents = await fetchRegulationSourceDocuments(id)
        setSourceDocuments(documents)
      }
      if (data) {
        if (data.umbrella_id) {
          const [parent, siblings] = await Promise.all([
            fetchRegulationById(data.umbrella_id),
            fetchRelatedRegulations(data.umbrella_id),
          ])
          setUmbrellaParent(parent)
          setFamilyChildren(siblings)
        } else {
          const children = await fetchRelatedRegulations(data.id)
          setFamilyChildren(children)
        }
      }
    } catch (error) {
      console.error('Error fetching regulation:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkWatchlist = async () => {
    if (!id || !user) return

    try {
      const watchlist = await getUserWatchlist(user.id)
      setIsWatched(watchlist.includes(id))
    } catch (error) {
      console.error('Error checking watchlist:', error)
    }
  }

  const toggleWatch = async () => {
    if (!user) return navigate(withAuthModal(location.pathname, location.search))
    if (!id) return

    try {
      const currentWatchlist = await getUserWatchlist(user.id)
      const nextWatchlist = isWatched
        ? currentWatchlist.filter((regulationId: string) => regulationId !== id)
        : [...currentWatchlist, id]

      await saveUserWatchlist(user.id, nextWatchlist)

      setIsWatched(!isWatched)
    } catch (error) {
      console.error('Error updating watchlist:', error)
    }
  }

  if (loading) {
    return (
      <div className="page-shell-narrow">
        <div className="surface-card flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading regulation...</p>
          </div>
        </div>
      </div>
    )
  }

  const backLabel =
    navigationState?.backLabel ??
    (isEsgHomeDetailRoute ? 'Back to Regulations & Frameworks Library' : 'Back')
  const handleBack = () => {
    if (navigationState?.backTo) {
      navigate(navigationState.backTo)
      return
    }

    if (isEsgHomeDetailRoute) {
      navigate('/framework-library')
      return
    }

    navigate(-1)
  }
  const scrollToTop = () => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!regulation) {
    return (
      <div className="page-shell-narrow">
        <button onClick={handleBack} className="ui-button-ghost mb-4 !px-0">
          <ArrowLeft size={16} />
          {backLabel}
        </button>
        <div className="surface-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Regulation not found</p>
        </div>
      </div>
    )
  }

  const officialWebsiteUrl = getOfficialWebsiteHref(regulation, sourceDocuments)
  const policySourceUrl = getPolicySourceHref(regulation, sourceDocuments)
  const showOfficialWebsiteButton = !!officialWebsiteUrl
  const showPolicySourceButton = !!policySourceUrl && policySourceUrl !== officialWebsiteUrl

  const handleSourceDocumentCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, documentId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    navigate(`/sources/${documentId}`, {
      state: {
        regulationPath: `${location.pathname}${location.search}`,
        regulationBackTo: navigationState?.backTo ?? (isEsgHomeDetailRoute ? '/framework-library' : null),
        regulationBackLabel: backLabel,
      },
    })
  }

  const openExternalDocument = (event: React.MouseEvent<HTMLButtonElement>, href: string) => {
    event.stopPropagation()
    const opened = window.open(href, '_blank', 'noopener,noreferrer')
    if (!opened) {
      window.location.assign(href)
    }
  }

  return (
    <div className="page-shell-narrow">
      <div className="sticky top-4 z-30 mb-4">
        <button
          onClick={handleBack}
          className="ui-button-ghost rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))/0.94] px-4 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))/0.82]"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </button>
      </div>

      <div className="surface-card p-6 md:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <span
                title={getStatusDefinition(regulation.status)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGES[regulation.status] || 'bg-slate-100 text-slate-600'}`}
              >
                {formatStatusLabel(regulation.status)}
              </span>
              <span
                title={getRegulationTypeDefinition(getRegulationTypeKey(regulation))}
                className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]"
              >
                {formatRegulationTypeLabel(getRegulationTypeKey(regulation))}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${CATEGORY_BADGES[normalizeCategoryKey(regulation.category)] || 'bg-slate-100 text-slate-600'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOTS[normalizeCategoryKey(regulation.category)] || 'bg-slate-400'}`} />
                {formatCategoryLabel(regulation.category)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                <span>{REGION_EMOJIS[regulation.region] || '🌍'}</span>
                {regulation.region}
              </span>
              {regulation.topics?.map((topic) => (
                <span
                  key={`${regulation.id}-${topic}`}
                  title={getTopicDefinition(topic)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${TOPIC_BADGES[topic] || 'bg-slate-100 text-slate-600'}`}
                >
                  {formatTopicLabel(topic)}
                </span>
              ))}
            </div>

            <h2 className="font-display text-3xl font-semibold leading-tight text-[hsl(var(--foreground))]">
              {regulation.title}
            </h2>
            {regulation.formal_title && (
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                <span className="font-medium">Official name:</span> {regulation.formal_title}
              </p>
            )}
          </div>

          <BookmarkHint showHint={!user}>
            <button
              onClick={toggleWatch}
              className={`rounded-full p-3 transition-colors ${
                isWatched ? 'bg-amber-100 text-amber-600' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-amber-600'
              }`}
              aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Star size={18} className={isWatched ? 'fill-current' : ''} />
            </button>
          </BookmarkHint>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="surface-card-muted p-4">
            <p className="ui-caption mb-1">Effective Date</p>
            <p className="text-base font-semibold text-[hsl(var(--foreground))]">
              {formatDateWithPrecision(regulation.effective_date, regulation.date_precision)}
            </p>
          </div>


          <div className="surface-card-muted p-4">
            <p className="ui-caption mb-1">Source</p>
            <p className="text-base font-semibold text-[hsl(var(--foreground))]">{regulation.source_name}</p>
          </div>

          <div className="surface-card-muted p-4" title={getJurisdictionTypeDefinition(regulation.jurisdiction_type)}>
            <p className="ui-caption mb-1">Jurisdiction</p>
            <p className="text-base font-semibold text-[hsl(var(--foreground))]">{regulation.jurisdiction_value || regulation.region}</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {formatJurisdictionTypeLabel(regulation.jurisdiction_type)}
            </p>
          </div>

          <div className="surface-card-muted p-4">
            <p className="ui-caption mb-1">Current Status</p>
            <p className="text-base font-semibold capitalize text-[hsl(var(--foreground))]">
              {formatStatusLabel(regulation.status)}
            </p>
          </div>

        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-base font-semibold text-[hsl(var(--foreground))]">Overview</h3>
          <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">
            {regulation.full_description || regulation.description}
          </p>
        </div>

        {regulation.tags && regulation.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-base font-semibold text-[hsl(var(--foreground))]">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {regulation.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-3">
          {showOfficialWebsiteButton && (
            <a
              href={officialWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-button-secondary"
            >
              <ExternalLink size={16} />
              Official Website
            </a>
          )}
          {showPolicySourceButton && (
            <a
              href={policySourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-button-secondary"
            >
              <ExternalLink size={16} />
              Link to Policy
            </a>
          )}
          <BookmarkHint showHint={!user}>
            <button
              onClick={toggleWatch}
              className="ui-button-primary"
            >
              <Star size={16} className={isWatched ? 'fill-current' : ''} />
              {isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </button>
          </BookmarkHint>
        </div>

        {/* Child view: "Part of [parent]" + sibling list */}
        {regulation.umbrella_id && familyChildren.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-[hsl(var(--foreground))]">
              <GitBranch size={15} className="text-[hsl(var(--muted-foreground))]" />
              Family
            </h3>
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-[hsl(var(--muted))] px-4 py-3">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Part of</span>
              {umbrellaParent ? (
                <button
                  onClick={() => navigate(`/framework-library/${umbrellaParent.id}`, { state: { backLabel: regulation.title } })}
                  className="text-sm font-semibold text-[hsl(var(--primary))] hover:underline"
                >
                  {umbrellaParent.title}
                </button>
              ) : (
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">this family</span>
              )}
              {regulation.version_label && (
                <span className="ml-auto rounded-full bg-[hsl(var(--primary)/0.1)] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--primary))]">
                  {regulation.version_label}
                </span>
              )}
            </div>
            {familyChildren.filter((c) => c.id !== id).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Also in this family</p>
                {familyChildren.filter((c) => c.id !== id).map((sibling) => (
                  <button
                    key={sibling.id}
                    onClick={() => navigate(`/framework-library/${sibling.id}`, { state: { backLabel: umbrellaParent?.title ?? 'Family' } })}
                    className="flex w-full items-center gap-3 rounded-xl bg-[hsl(var(--muted))] px-4 py-3 text-left hover:bg-[hsl(var(--muted)/0.7)] transition-colors"
                  >
                    <span className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">{sibling.title}</span>
                    {sibling.version_label && (
                      <span className="shrink-0 rounded-full bg-[hsl(var(--background))] px-2.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        {sibling.version_label}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Umbrella view: list of children */}
        {!regulation.umbrella_id && familyChildren.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-[hsl(var(--foreground))]">
              <GitBranch size={15} className="text-[hsl(var(--muted-foreground))]" />
              Family
              <span className="ml-1 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                {familyChildren.length}
              </span>
            </h3>
            <div className="space-y-2">
              {familyChildren.map((child) => {
                const relationLabel = child.umbrella_relation === 'part_of' ? 'Part of'
                  : child.umbrella_relation === 'component' ? 'Component'
                  : child.umbrella_relation === 'version' ? 'Version'
                  : child.umbrella_relation === 'amendment' ? 'Amendment'
                  : ''
                return (
                  <button
                    key={child.id}
                    onClick={() => navigate(`/framework-library/${child.id}`, { state: { backLabel: regulation?.title } })}
                    className="flex w-full items-center gap-3 rounded-xl bg-[hsl(var(--muted))] px-4 py-3 text-left hover:bg-[hsl(var(--muted)/0.7)] transition-colors"
                  >
                    <span className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">{child.title}</span>
                    {child.version_label && (
                      <span className="shrink-0 rounded-full bg-[hsl(var(--background))] px-2.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        {child.version_label}
                      </span>
                    )}
                    {relationLabel && (
                      <span className="shrink-0 text-xs text-[hsl(var(--muted-foreground))]">{relationLabel}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {sourceDocuments.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-base font-semibold text-[hsl(var(--foreground))]">Versioned Source Files</h3>
            <div className="space-y-3">
              {sourceDocuments.map((document) => {
                const displayHref = getSourceDocumentDisplayHref(document)

                return (
                  <div
                    key={document.id}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/sources/${document.id}`, {
                        state: {
                          regulationPath: `${location.pathname}${location.search}`,
                          regulationBackTo: navigationState?.backTo ?? (isEsgHomeDetailRoute ? '/framework-library' : null),
                          regulationBackLabel: backLabel,
                        },
                      })
                    }
                    onKeyDown={(event) => handleSourceDocumentCardKeyDown(event, document.id)}
                    className="surface-card-muted flex cursor-pointer flex-col gap-3 rounded-2xl p-4 transition-colors hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--primary))/0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.45)] md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        {document.document_type === 'html' ? 'Web Document' : `${document.document_type.toUpperCase()} document`}
                      </p>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        Version {document.version_label} · {document.source_name}
                      </p>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        {document.fetch_status !== 'indexed' ? 'Text extraction pending or failed' : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {displayHref && (
                        <button
                          type="button"
                          onClick={(event) => openExternalDocument(event, displayHref)}
                          className="ui-button-secondary"
                        >
                          {document.document_type === 'pdf' ? <FileText size={16} /> : <Globe size={16} />}
                          Open {document.document_type === 'pdf' ? 'PDF' : 'Link'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-lg transition-all duration-200 hover:bg-[hsl(var(--primary)/0.85)] ${
          showScrollTop ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <ArrowUp size={18} />
      </button>
    </div>
  )
}
