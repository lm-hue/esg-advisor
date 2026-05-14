import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  ExternalLink,
  Eye,
  FilePlus2,
  Globe2,
  Loader2,
  Save,
  Search,
  Shield,
  Trash2,
  Unplug,
  XCircle,
} from 'lucide-react'
import { supabase, supabaseUrl } from '../lib/supabase'
import {
  fetchAllRegulations,
  fetchRegulationSourceDocuments,
} from '../lib/regulations'
import {
  formatCategoryLabel,
  formatStatusLabel,
} from '../lib/appTheme'
import {
  getRegulationSourceLinks,
  getSupabasePdfDocument,
  sanitizeRegulationSourceUrl,
} from '../lib/regulationSourceLinks'
import { openExternalInNewTabOnly } from '../lib/openExternal'
import type {
  Regulation,
  RegulationSourceDocument,
  RegulationSourceDocumentType,
} from '../types'

interface AdminRegulationSourceDeskPageProps {
  user: any
}

interface RegulationDraft {
  source_name: string
  source_url: string
  official_source_url: string
  policy_page_url: string
  human_verified: boolean
}

interface SourceDocumentDraft {
  id?: string
  title: string
  source_name: string
  source_url: string
  official_source_url: string
  policy_page_url: string
  document_url: string
  archived_storage_path: string
  archived_public_url: string
  archived_mime_type: string
  content_sha256: string
  version_label: string
  document_type: RegulationSourceDocumentType
  fetch_status: 'pending' | 'indexed' | 'failed'
}

interface FlashMessage {
  tone: 'success' | 'error'
  text: string
}

type BinaryFilter = 'all' | 'yes' | 'no'
type SortMode = 'title_asc' | 'title_desc'

interface SourceDocumentSummary {
  id: string
  regulation_id: string
  document_type: RegulationSourceDocumentType
  source_url: string | null
  official_source_url: string | null
  policy_page_url: string | null
  archived_public_url: string | null
}

interface RegulationAvailabilitySummary {
  hasOfficialWebsite: boolean
  hasPolicyPage: boolean
  hasOpenPdf: boolean
}

const ARCHIVE_BUCKET = 'regulation-source-archives'
const ARCHIVE_PUBLIC_PREFIX = `${supabaseUrl}/storage/v1/object/public/${ARCHIVE_BUCKET}/`
const CONTROL_BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60'
const CONTROL_BUTTON_PRIMARY = `${CONTROL_BUTTON_BASE} border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))/0.92]`
const CONTROL_BUTTON_SECONDARY = `${CONTROL_BUTTON_BASE} border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))/0.45]`
const CONTROL_BUTTON_VERIFIED = `${CONTROL_BUTTON_BASE} border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200`

function parseBinaryFilter(value: string | null): BinaryFilter {
  return value === 'yes' || value === 'no' ? value : 'all'
}

function parseSortMode(value: string | null): SortMode {
  return value === 'title_desc' ? 'title_desc' : 'title_asc'
}

function sanitizeStorageToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file'
}

function deriveStoragePathFromPublicUrl(url?: string | null) {
  const normalized = (url || '').trim()
  if (!normalized || !normalized.startsWith(ARCHIVE_PUBLIC_PREFIX)) return ''
  return decodeURIComponent(normalized.slice(ARCHIVE_PUBLIC_PREFIX.length).split(/[?#]/)[0] || '')
}

async function computeSha256Hex(file: File) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

function buildAdminPdfStoragePath(regulationId: string, draft: SourceDocumentDraft, fileName: string, sha256: string) {
  const safeVersion = sanitizeStorageToken(draft.version_label || 'admin-entry')
  const safeName = sanitizeStorageToken(fileName || draft.title || 'upload')
  return `${regulationId}/${safeVersion}/admin-${safeName}-${sha256.slice(0, 12)}.pdf`
}

async function fetchPersistedRegulationIds() {
  const ids = new Set<string>()
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('regulations')
      .select('id')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error

    const rows = data || []
    rows.forEach((row) => {
      if (typeof row.id === 'string' && row.id.trim()) ids.add(row.id)
    })

    if (rows.length < pageSize) break
    from += pageSize
  }

  return ids
}

async function fetchRegulationSourceDocumentSummaries() {
  const documentsByRegulationId = new Map<string, SourceDocumentSummary[]>()
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('regulation_source_documents')
      .select('id, regulation_id, document_type, source_url, official_source_url, policy_page_url, archived_public_url')
      .order('regulation_id', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error

    const rows = (data || []) as SourceDocumentSummary[]
    rows.forEach((row) => {
      const current = documentsByRegulationId.get(row.regulation_id) || []
      current.push(row)
      documentsByRegulationId.set(row.regulation_id, current)
    })

    if (rows.length < pageSize) break
    from += pageSize
  }

  return documentsByRegulationId
}

function createRegulationDraft(regulation: Regulation): RegulationDraft {
  return {
    source_name: regulation.source_name || '',
    source_url: regulation.source_url || '',
    official_source_url: regulation.official_source_url || '',
    policy_page_url: regulation.policy_page_url || '',
    human_verified: regulation.human_verified ?? false,
  }
}

function createDocumentSummary(
  document:
    | Pick<
        RegulationSourceDocument,
        'id' | 'regulation_id' | 'document_type' | 'source_url' | 'official_source_url' | 'policy_page_url' | 'archived_public_url'
      >
    | SourceDocumentSummary,
): SourceDocumentSummary {
  return {
    id: document.id,
    regulation_id: document.regulation_id,
    document_type: document.document_type,
    source_url: document.source_url || null,
    official_source_url: document.official_source_url || null,
    policy_page_url: document.policy_page_url || null,
    archived_public_url: document.archived_public_url || null,
  }
}

function createSyntheticDocument(summary: SourceDocumentSummary): RegulationSourceDocument {
  return {
    id: summary.id,
    regulation_id: summary.regulation_id,
    title: '',
    source_name: '',
    source_url: summary.source_url || '',
    official_source_url: summary.official_source_url,
    policy_page_url: summary.policy_page_url,
    document_url: null,
    document_type: summary.document_type,
    version_label: 'summary',
    archived_storage_path: null,
    archived_public_url: summary.archived_public_url,
    archived_mime_type: null,
    content_sha256: null,
    fetch_status: 'indexed',
    error_message: null,
    extracted_text: null,
    last_indexed_at: null,
    created_at: '',
    updated_at: '',
  }
}

function getRegulationAvailabilitySummary(
  regulation: Regulation,
  summaries: SourceDocumentSummary[] = [],
): RegulationAvailabilitySummary {
  const syntheticDocuments = summaries.map(createSyntheticDocument)
  const { officialWebsiteUrl, policyPageUrl } = getRegulationSourceLinks(regulation, syntheticDocuments)
  const pdfDocument = getSupabasePdfDocument(syntheticDocuments)

  return {
    hasOfficialWebsite: !!officialWebsiteUrl,
    hasPolicyPage: !!policyPageUrl,
    hasOpenPdf: !!pdfDocument,
  }
}

function matchesBinaryFilter(value: boolean, filter: BinaryFilter) {
  if (filter === 'all') return true
  return filter === 'yes' ? value : !value
}

function createSourceDocumentDraft(
  regulation: Regulation,
  document?: RegulationSourceDocument | null,
): SourceDocumentDraft {
  return {
    id: document?.id,
    title: document?.title || regulation.title,
    source_name: document?.source_name || regulation.source_name || regulation.region || 'Research source',
    source_url: document?.source_url || regulation.source_url || '',
    official_source_url: document?.official_source_url || regulation.official_source_url || '',
    policy_page_url: document?.policy_page_url || regulation.policy_page_url || '',
    document_url: document?.document_url || '',
    archived_storage_path: document?.archived_storage_path || deriveStoragePathFromPublicUrl(document?.archived_public_url),
    archived_public_url: document?.archived_public_url || '',
    archived_mime_type: document?.archived_mime_type || 'application/pdf',
    content_sha256: document?.content_sha256 || '',
    version_label: document?.version_label || 'admin-entry',
    document_type: document?.document_type || 'pdf',
    fetch_status: document?.fetch_status || 'indexed',
  }
}

function getUiButtonAudit(regulation: Regulation, documents: RegulationSourceDocument[]) {
  const { officialWebsiteUrl, officialSourcePdfUrl, policyPageUrl } = getRegulationSourceLinks(regulation, documents)
  const pdfDocument = getSupabasePdfDocument(documents)

  return {
    officialWebsite: {
      shown: !!officialWebsiteUrl,
      url: officialWebsiteUrl,
      note: officialWebsiteUrl
        ? 'The current regulation detail page will show the Official Website button.'
        : officialSourcePdfUrl
          ? 'The current regulation detail page will hide Official Website and surface Official Source PDF instead.'
          : 'The current regulation detail page will hide Official Website because no site URL is available.',
    },
    policyPage: {
      shown: !!policyPageUrl,
      url: policyPageUrl,
      note: policyPageUrl
        ? 'The current regulation detail page will show the Link to Policy button.'
        : 'The current regulation detail page will hide Link to Policy because no policy-page URL is available.',
    },
    pdf: {
      shown: !!pdfDocument,
      url: sanitizeRegulationSourceUrl(pdfDocument?.archived_public_url),
      note: pdfDocument
        ? 'The current regulation detail page will show Open PDF from the Supabase-saved PDF record.'
        : 'The current regulation detail page will hide Open PDF because no Supabase archived PDF is attached.',
    },
  }
}

function getPreviewUrl(kind: 'official' | 'policy' | 'pdf', regulation: Regulation, documents: RegulationSourceDocument[]) {
  const { officialWebsiteUrl, policyPageUrl } = getRegulationSourceLinks(regulation, documents)
  const pdfDocument = getSupabasePdfDocument(documents)

  if (kind === 'official') return officialWebsiteUrl
  if (kind === 'policy') return policyPageUrl
  return sanitizeRegulationSourceUrl(pdfDocument?.archived_public_url)
}

function ButtonAuditPill({
  label,
  shown,
}: {
  label: string
  shown: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        shown
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {shown ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {label}
    </span>
  )
}

function QuickStatusCard({
  label,
  shown,
  url,
  tone,
  previewKind,
  emptyLabel = 'No URL saved yet',
  children,
}: {
  label: string
  shown: boolean
  url: string
  tone: 'emerald' | 'sky' | 'violet'
  previewKind: 'official' | 'policy' | 'pdf'
  emptyLabel?: string
  children?: ReactNode
}) {
  const toneClasses =
    tone === 'emerald'
      ? shown
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-slate-100 text-slate-600'
      : tone === 'sky'
        ? shown
          ? 'bg-sky-100 text-sky-700'
          : 'bg-slate-100 text-slate-600'
        : shown
          ? 'bg-violet-100 text-violet-700'
          : 'bg-slate-100 text-slate-600'

  return (
    <div className="surface-card flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{label}</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{shown ? 'Visible in current UI' : 'Hidden in current UI'}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClasses}`}>
          {shown ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {shown ? 'Shown' : 'Hidden'}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.32] px-3 py-3">
        <p className="line-clamp-2 break-all text-xs font-medium text-[hsl(var(--foreground))]">
          {url || emptyLabel}
        </p>
      </div>

      <div className="mt-3 relative min-h-[10rem] flex-1 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.18]">
        {url ? (
          <>
            <iframe
              title={`${label} preview`}
              src={previewKind === 'pdf' ? `${url}#toolbar=0&navpanes=0&scrollbar=0` : url}
              className="h-full min-h-[10rem] w-full border-0 bg-white"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/90 via-white/50 to-transparent px-3 py-2 text-[11px] text-[hsl(var(--muted-foreground))]">
              {previewKind === 'pdf'
                ? 'Supabase PDF preview'
                : 'Embedded preview. Some sites may block framing.'}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[10rem] items-center justify-center px-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No saved target yet.
          </div>
        )}
      </div>

      {children ? <div className="mt-4 space-y-3">{children}</div> : null}
    </div>
  )
}

function DocumentEditorCard({
  draft,
  onChange,
  onSave,
  onDelete,
  onUploadPdf,
  onRemoveStoredPdf,
  saving,
  deleting,
  uploadingPdf,
  removingStoredPdf,
  isNew = false,
}: {
  draft: SourceDocumentDraft
  onChange: (next: SourceDocumentDraft) => void
  onSave: () => void
  onDelete?: () => void
  onUploadPdf?: (file: File) => void
  onRemoveStoredPdf?: () => void
  saving: boolean
  deleting: boolean
  uploadingPdf: boolean
  removingStoredPdf: boolean
  isNew?: boolean
}) {
  const previewUrl =
    draft.document_type === 'pdf'
      ? sanitizeRegulationSourceUrl(draft.archived_public_url || draft.document_url || draft.official_source_url)
      : sanitizeRegulationSourceUrl(draft.document_url || draft.policy_page_url || draft.source_url || draft.official_source_url)

  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              {isNew ? 'New source document / PDF record' : draft.title || 'Source document'}
            </p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {draft.document_type.toUpperCase()} · {draft.version_label || 'No version label'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className={CONTROL_BUTTON_PRIMARY}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isNew ? 'Add record' : 'Save changes'}
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className={CONTROL_BUTTON_SECONDARY}
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-4 py-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Title
            </span>
            <input
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              className="ui-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Source name
            </span>
            <input
              value={draft.source_name}
              onChange={(event) => onChange({ ...draft, source_name: event.target.value })}
              className="ui-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Source URL
            </span>
            <input
              value={draft.source_url}
              onChange={(event) => onChange({ ...draft, source_url: event.target.value })}
              className="ui-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Official Website URL
            </span>
            <input
              value={draft.official_source_url}
              onChange={(event) => onChange({ ...draft, official_source_url: event.target.value })}
              className="ui-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Policy page URL
            </span>
            <input
              value={draft.policy_page_url}
              onChange={(event) => onChange({ ...draft, policy_page_url: event.target.value })}
              className="ui-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Document URL
            </span>
            <input
              value={draft.document_url}
              onChange={(event) => onChange({ ...draft, document_url: event.target.value })}
              className="ui-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Supabase archived PDF URL
            </span>
            <input
              value={draft.archived_public_url}
              onChange={(event) => onChange({ ...draft, archived_public_url: event.target.value })}
              className="ui-input"
            />
          </label>

          <div className="md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Manage stored PDF
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${CONTROL_BUTTON_SECONDARY} cursor-pointer`}>
                {uploadingPdf ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />}
                {draft.archived_public_url ? 'Upload replacement PDF' : 'Upload PDF to Supabase'}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={uploadingPdf || removingStoredPdf}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.currentTarget.value = ''
                    if (file && onUploadPdf) onUploadPdf(file)
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onRemoveStoredPdf}
                disabled={!draft.archived_public_url || removingStoredPdf || uploadingPdf}
                className={CONTROL_BUTTON_SECONDARY}
              >
                {removingStoredPdf ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Remove stored PDF
              </button>
            </div>
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
              Uploading here stores the PDF in Supabase and updates this record. Removing it deletes the archived Supabase PDF from this record, and attempts to remove the stored file as well.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Version label
            </span>
            <input
              value={draft.version_label}
              onChange={(event) => onChange({ ...draft, version_label: event.target.value })}
              className="ui-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Document type
            </span>
            <select
              value={draft.document_type}
              onChange={(event) => onChange({ ...draft, document_type: event.target.value as RegulationSourceDocumentType })}
              className="ui-select"
            >
              <option value="pdf">PDF</option>
              <option value="html">HTML</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
              Fetch status
            </span>
            <select
              value={draft.fetch_status}
              onChange={(event) => onChange({ ...draft, fetch_status: event.target.value as SourceDocumentDraft['fetch_status'] })}
              className="ui-select"
            >
              <option value="indexed">indexed</option>
              <option value="pending">pending</option>
              <option value="failed">failed</option>
            </select>
          </label>
        </div>

        <div className="surface-card-muted overflow-hidden">
          <div className="border-b border-[hsl(var(--border))] px-4 py-3">
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">Preview</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              For PDFs, the current UI requires the Supabase archived PDF URL to show the Open PDF button.
            </p>
          </div>
          <div className="flex min-h-[18rem] flex-col gap-3 px-4 py-4">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
              {previewUrl || 'No preview URL available'}
            </div>
            <div className="relative min-h-[14rem] flex-1 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-white">
              {previewUrl ? (
                <iframe
                  title={`${draft.title || 'Source document'} preview`}
                  src={draft.document_type === 'pdf' ? `${previewUrl}#toolbar=0&navpanes=0&scrollbar=0` : previewUrl}
                  className="h-full min-h-[14rem] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full min-h-[14rem] items-center justify-center px-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  Add a URL above to preview this record.
                </div>
              )}
            </div>
            {previewUrl ? (
              <button
                type="button"
                onClick={() => openExternalInNewTabOnly(previewUrl)}
                className={`${CONTROL_BUTTON_SECONDARY} self-start`}
              >
                <Eye size={16} />
                Open target
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminRegulationSourceDeskPage({ user }: AdminRegulationSourceDeskPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [selectedDocumentsLoading, setSelectedDocumentsLoading] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [sortMode, setSortMode] = useState<SortMode>(parseSortMode(searchParams.get('sort')))
  const [officialWebsiteFilter, setOfficialWebsiteFilter] = useState<BinaryFilter>(parseBinaryFilter(searchParams.get('official')))
  const [policyPageFilter, setPolicyPageFilter] = useState<BinaryFilter>(parseBinaryFilter(searchParams.get('policy')))
  const [pdfFilter, setPdfFilter] = useState<BinaryFilter>(parseBinaryFilter(searchParams.get('pdf')))
  const [verifiedFilter, setVerifiedFilter] = useState<BinaryFilter>(parseBinaryFilter(searchParams.get('verified')))
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [persistedRegulationIds, setPersistedRegulationIds] = useState<Set<string>>(new Set())
  const [documentsByRegulationId, setDocumentsByRegulationId] = useState<Map<string, RegulationSourceDocument[]>>(new Map())
  const [documentSummariesByRegulationId, setDocumentSummariesByRegulationId] = useState<Map<string, SourceDocumentSummary[]>>(new Map())
  const [savingRegulation, setSavingRegulation] = useState(false)
  const [savingDocumentIds, setSavingDocumentIds] = useState<Record<string, boolean>>({})
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Record<string, boolean>>({})
  const [uploadingDocumentIds, setUploadingDocumentIds] = useState<Record<string, boolean>>({})
  const [removingStoredPdfIds, setRemovingStoredPdfIds] = useState<Record<string, boolean>>({})
  const [detailPreviewMode, setDetailPreviewMode] = useState<'library' | 'esg-home' | null>(null)
  const [showSourceDocuments, setShowSourceDocuments] = useState(searchParams.get('pdf') === 'yes')
  const [focusedPdfDocumentId, setFocusedPdfDocumentId] = useState('')
  const [regulationDraft, setRegulationDraft] = useState<RegulationDraft | null>(null)
  const [documentDrafts, setDocumentDrafts] = useState<Record<string, SourceDocumentDraft>>({})
  const [newDocumentDraft, setNewDocumentDraft] = useState<SourceDocumentDraft | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setAvailabilityLoading(true)
      setError(null)

      try {
        const [allRegulations, persistedIds, documentSummaries] = await Promise.all([
          fetchAllRegulations(),
          fetchPersistedRegulationIds(),
          fetchRegulationSourceDocumentSummaries(),
        ])

        if (cancelled) return

        setRegulations(allRegulations)
        setPersistedRegulationIds(persistedIds)
        setDocumentSummariesByRegulationId(documentSummaries)
      } catch (loadError: any) {
        if (cancelled) return
        setError(loadError?.message || 'The admin source desk could not load.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setAvailabilityLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => setFlashMessage(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [flashMessage])

  const regulationAvailabilityById = useMemo(() => {
    const next = new Map<string, RegulationAvailabilitySummary>()
    regulations.forEach((regulation) => {
      next.set(
        regulation.id,
        getRegulationAvailabilitySummary(regulation, documentSummariesByRegulationId.get(regulation.id) || []),
      )
    })
    return next
  }, [documentSummariesByRegulationId, regulations])

  const sortedRegulations = useMemo(() => {
    const next = [...regulations]
    next.sort((left, right) => {
      const direction = sortMode === 'title_desc' ? -1 : 1
      return left.title.localeCompare(right.title) * direction
    })
    return next
  }, [regulations, sortMode])

  const filteredRegulations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return sortedRegulations.filter((regulation) => {
      const availability = regulationAvailabilityById.get(regulation.id) || {
        hasOfficialWebsite: false,
        hasPolicyPage: false,
        hasOpenPdf: false,
      }
      const matchesQuery =
        regulation.title.toLowerCase().includes(query) ||
        (regulation.formal_title || '').toLowerCase().includes(query) ||
        (regulation.region || '').toLowerCase().includes(query) ||
        (regulation.source_name || '').toLowerCase().includes(query)
      const queryPasses = !query || matchesQuery

      return (
        queryPasses &&
        matchesBinaryFilter(availability.hasOfficialWebsite, officialWebsiteFilter) &&
        matchesBinaryFilter(availability.hasPolicyPage, policyPageFilter) &&
        matchesBinaryFilter(availability.hasOpenPdf, pdfFilter) &&
        matchesBinaryFilter(regulation.human_verified ?? false, verifiedFilter)
      )
    })
  }, [
    searchQuery,
    sortedRegulations,
    regulationAvailabilityById,
    officialWebsiteFilter,
    policyPageFilter,
    pdfFilter,
    verifiedFilter,
  ])

  const selectedRegulationId = useMemo(() => {
    const requestedId = searchParams.get('id')
    if (requestedId && filteredRegulations.some((regulation) => regulation.id === requestedId)) {
      return requestedId
    }
    return filteredRegulations[0]?.id || ''
  }, [filteredRegulations, searchParams])

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams)
    if (searchQuery) nextParams.set('q', searchQuery)
    else nextParams.delete('q')
    if (sortMode !== 'title_asc') nextParams.set('sort', sortMode)
    else nextParams.delete('sort')
    if (officialWebsiteFilter !== 'all') nextParams.set('official', officialWebsiteFilter)
    else nextParams.delete('official')
    if (policyPageFilter !== 'all') nextParams.set('policy', policyPageFilter)
    else nextParams.delete('policy')
    if (pdfFilter !== 'all') nextParams.set('pdf', pdfFilter)
    else nextParams.delete('pdf')
    if (verifiedFilter !== 'all') nextParams.set('verified', verifiedFilter)
    else nextParams.delete('verified')

    if (selectedRegulationId) nextParams.set('id', selectedRegulationId)
    else nextParams.delete('id')

    const current = searchParams.toString()
    const next = nextParams.toString()
    if (current !== next) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [
    searchParams,
    searchQuery,
    sortMode,
    officialWebsiteFilter,
    policyPageFilter,
    pdfFilter,
    verifiedFilter,
    selectedRegulationId,
    setSearchParams,
  ])

  const selectedRegulation = filteredRegulations.find((regulation) => regulation.id === selectedRegulationId) || null
  const selectedDocuments = useMemo(
    () => (selectedRegulation ? documentsByRegulationId.get(selectedRegulation.id) || [] : []),
    [documentsByRegulationId, selectedRegulation],
  )
  const selectedIsPersisted = selectedRegulation ? persistedRegulationIds.has(selectedRegulation.id) : false

  useEffect(() => {
    let cancelled = false

    async function loadSelectedDocuments() {
      if (!selectedRegulation) return
      if (documentsByRegulationId.has(selectedRegulation.id)) return

      setSelectedDocumentsLoading(true)
      try {
        const documents = await fetchRegulationSourceDocuments(selectedRegulation.id)
        if (cancelled) return
        setDocumentsByRegulationId((current) => {
          const next = new Map(current)
          next.set(selectedRegulation.id, documents)
          return next
        })
        setDocumentSummariesByRegulationId((current) => {
          const next = new Map(current)
          next.set(selectedRegulation.id, documents.map(createDocumentSummary))
          return next
        })
      } finally {
        if (!cancelled) setSelectedDocumentsLoading(false)
      }
    }

    loadSelectedDocuments()

    return () => {
      cancelled = true
    }
  }, [documentsByRegulationId, selectedRegulation])

  useEffect(() => {
    if (!selectedRegulation) {
      setRegulationDraft(null)
      setDocumentDrafts({})
      setNewDocumentDraft(null)
      return
    }

    setRegulationDraft(createRegulationDraft(selectedRegulation))
    setDocumentDrafts(
      Object.fromEntries(
        selectedDocuments.map((document) => [document.id, createSourceDocumentDraft(selectedRegulation, document)]),
      ),
    )
    setNewDocumentDraft(null)
  }, [selectedDocuments, selectedRegulation])

  const selectedButtonAudit = useMemo(() => {
    if (!selectedRegulation) return null
    return getUiButtonAudit(selectedRegulation, selectedDocuments)
  }, [selectedDocuments, selectedRegulation])
  const selectedPdfDocuments = useMemo(
    () =>
      selectedDocuments.filter(
        (document) =>
          document.document_type === 'pdf' && !!sanitizeRegulationSourceUrl(document.archived_public_url),
      ),
    [selectedDocuments],
  )
  useEffect(() => {
    if (selectedPdfDocuments.length === 0) {
      setFocusedPdfDocumentId('')
      return
    }

    if (!selectedPdfDocuments.some((document) => document.id === focusedPdfDocumentId)) {
      setFocusedPdfDocumentId(selectedPdfDocuments[0].id)
    }
  }, [focusedPdfDocumentId, selectedPdfDocuments])
  const selectedPrimaryPdfDocument = useMemo(
    () =>
      selectedPdfDocuments.find((document) => document.id === focusedPdfDocumentId) ||
      selectedPdfDocuments[0] ||
      getSupabasePdfDocument(selectedDocuments) ||
      null,
    [focusedPdfDocumentId, selectedDocuments, selectedPdfDocuments],
  )
  const selectedPrimaryPdfDraft = useMemo(() => {
    if (!selectedRegulation || !selectedPrimaryPdfDocument) return null
    return documentDrafts[selectedPrimaryPdfDocument.id] || createSourceDocumentDraft(selectedRegulation, selectedPrimaryPdfDocument)
  }, [documentDrafts, selectedPrimaryPdfDocument, selectedRegulation])
  const embeddedDetailUrl = useMemo(() => {
    if (!selectedRegulation || !detailPreviewMode) return ''
    return detailPreviewMode === 'library'
      ? `/framework-library/${selectedRegulation.id}`
      : `/esg-home/${selectedRegulation.id}`
  }, [detailPreviewMode, selectedRegulation])

  const verifiedCount = useMemo(
    () => regulations.filter((regulation) => regulation.human_verified).length,
    [regulations],
  )

  const handleSelectRegulation = (regulationId: string) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('id', regulationId)
    if (searchQuery) nextParams.set('q', searchQuery)
    setSearchParams(nextParams, { replace: true })
  }

  const openNewPdfDraft = () => {
    if (!selectedRegulation) return
    setShowSourceDocuments(true)
    setNewDocumentDraft((current) => current || createSourceDocumentDraft(selectedRegulation))
  }

  const updateDocumentsForRegulation = (regulationId: string, updater: (documents: RegulationSourceDocument[]) => RegulationSourceDocument[]) => {
    setDocumentsByRegulationId((current) => {
      const next = new Map(current)
      const currentDocuments = next.get(regulationId) || []
      next.set(regulationId, updater(currentDocuments))
      return next
    })
  }

  const updateDocumentSummariesForRegulation = (
    regulationId: string,
    updater: (documents: SourceDocumentSummary[]) => SourceDocumentSummary[],
  ) => {
    setDocumentSummariesByRegulationId((current) => {
      const next = new Map(current)
      const currentDocuments = next.get(regulationId) || []
      next.set(regulationId, updater(currentDocuments))
      return next
    })
  }

  const syncDocumentDraft = (documentId: string, updater: (draft: SourceDocumentDraft) => SourceDocumentDraft) => {
    setDocumentDrafts((current) => {
      const existing = current[documentId]
      if (!existing) return current
      return {
        ...current,
        [documentId]: updater(existing),
      }
    })
  }

  const applyUploadedPdfToExistingDocument = async (
    documentId: string,
    currentDraft: SourceDocumentDraft,
    file: File,
  ) => {
    if (!selectedRegulation) return

    setUploadingDocumentIds((current) => ({ ...current, [documentId]: true }))

    const previousStoragePath =
      currentDraft.archived_storage_path.trim() || deriveStoragePathFromPublicUrl(currentDraft.archived_public_url)

    try {
      if (file.type && file.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file.')
      }

      const sha256 = await computeSha256Hex(file)
      const storagePath = buildAdminPdfStoragePath(selectedRegulation.id, currentDraft, file.name, sha256)
      const { error: uploadError } = await supabase.storage.from(ARCHIVE_BUCKET).upload(storagePath, file, {
        contentType: 'application/pdf',
        upsert: true,
      })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(storagePath)
      const publicUrl = publicUrlData.publicUrl
      const payload = {
        document_type: 'pdf' as const,
        document_url: currentDraft.document_url.trim() || publicUrl,
        archived_storage_path: storagePath,
        archived_public_url: publicUrl,
        archived_mime_type: 'application/pdf',
        content_sha256: sha256,
      }

      const { data, error: updateError } = await supabase
        .from('regulation_source_documents')
        .update(payload)
        .eq('id', documentId)
        .select('*')
        .maybeSingle()

      if (updateError) throw updateError

      if (previousStoragePath && previousStoragePath !== storagePath) {
        await supabase.storage.from(ARCHIVE_BUCKET).remove([previousStoragePath])
      }

      if (data) {
        updateDocumentsForRegulation(selectedRegulation.id, (documents) =>
          documents.map((document) => (document.id === data.id ? { ...document, ...data } : document)),
        )
        updateDocumentSummariesForRegulation(selectedRegulation.id, (documents) =>
          documents.map((document) => (document.id === data.id ? createDocumentSummary(data as RegulationSourceDocument) : document)),
        )
      }

      syncDocumentDraft(documentId, (draft) => ({
        ...draft,
        document_type: 'pdf',
        document_url: currentDraft.document_url.trim() || publicUrl,
        archived_storage_path: storagePath,
        archived_public_url: publicUrl,
        archived_mime_type: 'application/pdf',
        content_sha256: sha256,
      }))

      setFlashMessage({
        tone: 'success',
        text: 'The PDF was uploaded and replaced successfully.',
      })
    } catch (uploadError: any) {
      setFlashMessage({
        tone: 'error',
        text: uploadError?.message || 'The PDF could not be uploaded.',
      })
    } finally {
      setUploadingDocumentIds((current) => ({ ...current, [documentId]: false }))
    }
  }

  const applyUploadedPdfToNewDraft = async (file: File, draftOverride?: SourceDocumentDraft | null) => {
    if (!selectedRegulation) return

    const baseDraft = draftOverride || newDocumentDraft
    if (!baseDraft) return

    const pendingKey = '__new__'
    setUploadingDocumentIds((current) => ({ ...current, [pendingKey]: true }))

    try {
      if (file.type && file.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file.')
      }

      const sha256 = await computeSha256Hex(file)
      const storagePath = buildAdminPdfStoragePath(selectedRegulation.id, baseDraft, file.name, sha256)
      const { error: uploadError } = await supabase.storage.from(ARCHIVE_BUCKET).upload(storagePath, file, {
        contentType: 'application/pdf',
        upsert: true,
      })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(storagePath)
      const publicUrl = publicUrlData.publicUrl

      setNewDocumentDraft({
        ...baseDraft,
        document_type: 'pdf',
        document_url: baseDraft.document_url.trim() || publicUrl,
        archived_storage_path: storagePath,
        archived_public_url: publicUrl,
        archived_mime_type: 'application/pdf',
        content_sha256: sha256,
      })

      setFlashMessage({
        tone: 'success',
        text: 'The PDF was uploaded. Save the new record to attach it to this regulation.',
      })
    } catch (uploadError: any) {
      setFlashMessage({
        tone: 'error',
        text: uploadError?.message || 'The PDF could not be uploaded.',
      })
    } finally {
      setUploadingDocumentIds((current) => ({ ...current, [pendingKey]: false }))
    }
  }

  const removeStoredPdfFromExistingDocument = async (documentId: string, currentDraft: SourceDocumentDraft) => {
    if (!selectedRegulation) return

    const storagePath =
      currentDraft.archived_storage_path.trim() || deriveStoragePathFromPublicUrl(currentDraft.archived_public_url)

    setRemovingStoredPdfIds((current) => ({ ...current, [documentId]: true }))

    try {
      if (storagePath) {
        const { error: removeError } = await supabase.storage.from(ARCHIVE_BUCKET).remove([storagePath])
        if (removeError) throw removeError
      }

      const nextDocumentUrl =
        currentDraft.document_url.trim() === currentDraft.archived_public_url.trim()
          ? null
          : currentDraft.document_url.trim() || null

      const payload = {
        document_url: nextDocumentUrl,
        archived_storage_path: null,
        archived_public_url: null,
        archived_mime_type: null,
        content_sha256: null,
      }

      const { data, error: updateError } = await supabase
        .from('regulation_source_documents')
        .update(payload)
        .eq('id', documentId)
        .select('*')
        .maybeSingle()

      if (updateError) throw updateError

      if (data) {
        updateDocumentsForRegulation(selectedRegulation.id, (documents) =>
          documents.map((document) => (document.id === data.id ? { ...document, ...data } : document)),
        )
        updateDocumentSummariesForRegulation(selectedRegulation.id, (documents) =>
          documents.map((document) => (document.id === data.id ? createDocumentSummary(data as RegulationSourceDocument) : document)),
        )
      }

      syncDocumentDraft(documentId, (draft) => ({
        ...draft,
        document_url: nextDocumentUrl || '',
        archived_storage_path: '',
        archived_public_url: '',
        archived_mime_type: 'application/pdf',
        content_sha256: '',
      }))

      setFlashMessage({
        tone: 'success',
        text: 'The stored PDF was removed from this record.',
      })
    } catch (removeError: any) {
      setFlashMessage({
        tone: 'error',
        text: removeError?.message || 'The stored PDF could not be removed.',
      })
    } finally {
      setRemovingStoredPdfIds((current) => ({ ...current, [documentId]: false }))
    }
  }

  const removeStoredPdfFromNewDraft = async () => {
    if (!newDocumentDraft) return

    const pendingKey = '__new__'
    setRemovingStoredPdfIds((current) => ({ ...current, [pendingKey]: true }))

    try {
      const storagePath =
        newDocumentDraft.archived_storage_path.trim() || deriveStoragePathFromPublicUrl(newDocumentDraft.archived_public_url)

      if (storagePath) {
        const { error: removeError } = await supabase.storage.from(ARCHIVE_BUCKET).remove([storagePath])
        if (removeError) throw removeError
      }

      setNewDocumentDraft((current) =>
        current
          ? {
              ...current,
              document_url: current.document_url.trim() === current.archived_public_url.trim() ? '' : current.document_url,
              archived_storage_path: '',
              archived_public_url: '',
              archived_mime_type: 'application/pdf',
              content_sha256: '',
            }
          : current,
      )

      setFlashMessage({
        tone: 'success',
        text: 'The uploaded PDF was removed from the draft record.',
      })
    } catch (removeError: any) {
      setFlashMessage({
        tone: 'error',
        text: removeError?.message || 'The uploaded PDF could not be removed.',
      })
    } finally {
      setRemovingStoredPdfIds((current) => ({ ...current, [pendingKey]: false }))
    }
  }

  const handleQuickToggleVerified = async () => {
    if (!selectedRegulation || !selectedIsPersisted || !regulationDraft) return

    const nextVerified = !regulationDraft.human_verified
    setSavingRegulation(true)

    try {
      const { data, error: updateError } = await supabase
        .from('regulations')
        .update({ human_verified: nextVerified })
        .eq('id', selectedRegulation.id)
        .select('*')
        .maybeSingle()

      if (updateError) throw updateError

      if (data) {
        const updatedRegulation = {
          ...selectedRegulation,
          ...data,
          source_name: data.source_name || '',
          source_url: data.source_url || '',
          official_source_url: data.official_source_url || null,
          policy_page_url: data.policy_page_url || null,
          human_verified: data.human_verified ?? false,
        }

        setRegulations((current) =>
          current.map((regulation) => (regulation.id === updatedRegulation.id ? updatedRegulation : regulation)),
        )
        setRegulationDraft((current) =>
          current ? { ...current, human_verified: updatedRegulation.human_verified ?? false } : current,
        )
      } else {
        setRegulations((current) =>
          current.map((regulation) =>
            regulation.id === selectedRegulation.id ? { ...regulation, human_verified: nextVerified } : regulation,
          ),
        )
        setRegulationDraft((current) => (current ? { ...current, human_verified: nextVerified } : current))
      }

      setFlashMessage({
        tone: 'success',
        text: nextVerified ? 'Marked as human-verified.' : 'Removed the human-verified flag.',
      })
    } catch (saveError: any) {
      setFlashMessage({
        tone: 'error',
        text: saveError?.message || 'The verification flag could not be updated.',
      })
    } finally {
      setSavingRegulation(false)
    }
  }

  const handleSaveRegulation = async () => {
    if (!selectedRegulation || !regulationDraft || !selectedIsPersisted) return

    setSavingRegulation(true)
    try {
      const payload = {
        source_name: regulationDraft.source_name.trim() || null,
        source_url: regulationDraft.source_url.trim() || null,
        official_source_url: regulationDraft.official_source_url.trim() || null,
        policy_page_url: regulationDraft.policy_page_url.trim() || null,
        human_verified: regulationDraft.human_verified,
      }

      const { data, error: updateError } = await supabase
        .from('regulations')
        .update(payload)
        .eq('id', selectedRegulation.id)
        .select('*')
        .maybeSingle()

      if (updateError) throw updateError

      if (data) {
        const updatedRegulation = {
          ...selectedRegulation,
          source_name: data.source_name || '',
          source_url: data.source_url || '',
          official_source_url: data.official_source_url || null,
          policy_page_url: data.policy_page_url || null,
          human_verified: data.human_verified ?? false,
        }
        setRegulations((current) =>
          current.map((regulation) => (regulation.id === updatedRegulation.id ? updatedRegulation : regulation)),
        )
        setRegulationDraft(createRegulationDraft(updatedRegulation))
      }

      setFlashMessage({
        tone: 'success',
        text: `${selectedRegulation.title} was updated.`,
      })
    } catch (saveError: any) {
      setFlashMessage({
        tone: 'error',
        text: saveError?.message || 'The regulation links could not be saved.',
      })
    } finally {
      setSavingRegulation(false)
    }
  }

  const handleSaveDocument = async (draft: SourceDocumentDraft) => {
    if (!selectedRegulation || !draft.id) return

    setSavingDocumentIds((current) => ({ ...current, [draft.id!]: true }))
    try {
      const payload = {
        title: draft.title.trim(),
        source_name: draft.source_name.trim(),
        source_url: draft.source_url.trim(),
        official_source_url: draft.official_source_url.trim() || null,
        policy_page_url: draft.policy_page_url.trim() || null,
        document_url: draft.document_url.trim() || null,
        archived_storage_path: draft.archived_storage_path.trim() || null,
        archived_public_url: draft.archived_public_url.trim() || null,
        archived_mime_type: draft.archived_mime_type.trim() || null,
        content_sha256: draft.content_sha256.trim() || null,
        version_label: draft.version_label.trim() || 'admin-entry',
        document_type: draft.document_type,
        fetch_status: draft.fetch_status,
      }

      const { data, error: updateError } = await supabase
        .from('regulation_source_documents')
        .update(payload)
        .eq('id', draft.id)
        .select('*')
        .maybeSingle()

      if (updateError) throw updateError

      if (data) {
        updateDocumentsForRegulation(selectedRegulation.id, (documents) =>
          documents.map((document) => (document.id === data.id ? {
            ...document,
            ...data,
          } : document)),
        )
        updateDocumentSummariesForRegulation(selectedRegulation.id, (documents) =>
          documents.map((document) => (document.id === data.id ? createDocumentSummary(data as RegulationSourceDocument) : document)),
        )
      }

      setFlashMessage({
        tone: 'success',
        text: 'The source document was saved.',
      })
    } catch (saveError: any) {
      setFlashMessage({
        tone: 'error',
        text: saveError?.message || 'The source document could not be saved.',
      })
    } finally {
      setSavingDocumentIds((current) => ({ ...current, [draft.id!]: false }))
    }
  }

  const handleCreateDocument = async () => {
    if (!selectedRegulation || !newDocumentDraft) return

    const pendingKey = '__new__'
    setSavingDocumentIds((current) => ({ ...current, [pendingKey]: true }))

    try {
      const payload = {
        regulation_id: selectedRegulation.id,
        title: newDocumentDraft.title.trim() || selectedRegulation.title,
        source_name: newDocumentDraft.source_name.trim() || selectedRegulation.source_name || 'Research source',
        source_url: newDocumentDraft.source_url.trim() || selectedRegulation.source_url || '',
        official_source_url: newDocumentDraft.official_source_url.trim() || null,
        policy_page_url: newDocumentDraft.policy_page_url.trim() || null,
        document_url: newDocumentDraft.document_url.trim() || null,
        archived_storage_path: newDocumentDraft.archived_storage_path.trim() || null,
        archived_public_url: newDocumentDraft.archived_public_url.trim() || null,
        archived_mime_type: newDocumentDraft.archived_mime_type.trim() || null,
        content_sha256: newDocumentDraft.content_sha256.trim() || null,
        version_label: newDocumentDraft.version_label.trim() || 'admin-entry',
        document_type: newDocumentDraft.document_type,
        fetch_status: newDocumentDraft.fetch_status,
      }

      const { data, error: insertError } = await supabase
        .from('regulation_source_documents')
        .insert(payload)
        .select('*')
        .maybeSingle()

      if (insertError) throw insertError

      if (data) {
        updateDocumentsForRegulation(selectedRegulation.id, (documents) => [
          data as RegulationSourceDocument,
          ...documents,
        ])
        updateDocumentSummariesForRegulation(selectedRegulation.id, (documents) => [
          createDocumentSummary(data as RegulationSourceDocument),
          ...documents,
        ])
      }

      setNewDocumentDraft(null)
      setFlashMessage({
        tone: 'success',
        text: 'A new source document was added.',
      })
    } catch (createError: any) {
      setFlashMessage({
        tone: 'error',
        text: createError?.message || 'The new source document could not be added.',
      })
    } finally {
      setSavingDocumentIds((current) => ({ ...current, [pendingKey]: false }))
    }
  }

  const handleDeleteDocument = async (documentId: string, title: string) => {
    if (!selectedRegulation) return
    const confirmed = window.confirm(`Delete "${title}" from this regulation?`)
    if (!confirmed) return

    const existingDocument = selectedDocuments.find((document) => document.id === documentId)
    const storagePath =
      existingDocument?.archived_storage_path ||
      deriveStoragePathFromPublicUrl(existingDocument?.archived_public_url)

    setDeletingDocumentIds((current) => ({ ...current, [documentId]: true }))
    try {
      if (storagePath) {
        await supabase.storage.from(ARCHIVE_BUCKET).remove([storagePath])
      }

      const { error: deleteError } = await supabase
        .from('regulation_source_documents')
        .delete()
        .eq('id', documentId)

      if (deleteError) throw deleteError

      updateDocumentsForRegulation(selectedRegulation.id, (documents) =>
        documents.filter((document) => document.id !== documentId),
      )
      updateDocumentSummariesForRegulation(selectedRegulation.id, (documents) =>
        documents.filter((document) => document.id !== documentId),
      )

      setDocumentDrafts((current) => {
        const next = { ...current }
        delete next[documentId]
        return next
      })

      setFlashMessage({
        tone: 'success',
        text: `"${title}" was deleted.`,
      })
    } catch (deleteErr: any) {
      setFlashMessage({
        tone: 'error',
        text: deleteErr?.message || 'The source document could not be deleted.',
      })
    } finally {
      setDeletingDocumentIds((current) => ({ ...current, [documentId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-6">
        <div className="surface-card flex items-center gap-3 px-5 py-4">
          <Loader2 size={18} className="animate-spin text-[hsl(var(--primary))]" />
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">Loading regulation source control room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-6">
        <div className="surface-card max-w-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-amber-600" size={20} />
            <div>
              <h1 className="text-lg font-semibold text-[hsl(var(--foreground))]">Admin source desk unavailable</h1>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{error}</p>
              <div className="mt-4">
                <Link to="/framework-library" className={CONTROL_BUTTON_SECONDARY}>
                  <ArrowLeft size={16} />
                  Back to library
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-y-auto bg-[hsl(var(--background))]">
      <div className="mx-auto flex min-h-full w-full max-w-[1700px] flex-col gap-6 px-4 py-5 md:px-6 lg:h-full lg:overflow-hidden lg:flex-row">
        <aside className="surface-card flex w-full shrink-0 flex-col overflow-hidden lg:h-full lg:w-[24rem]">
          <div className="border-b border-[hsl(var(--border))] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="page-icon h-11 w-11 rounded-2xl">
                <Shield size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">Admin only</p>
                <h1 className="font-display text-2xl font-semibold text-[hsl(var(--foreground))]">Regulation Source Control Room</h1>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <div className="inline-flex items-baseline gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.22] px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Regs</span>
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{regulations.length}</span>
              </div>
              <div className="inline-flex items-baseline gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.22] px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Verified</span>
                <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{verifiedCount}</span>
              </div>
              <div className="inline-flex min-w-0 items-baseline gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.22] px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">User</span>
                <span className="max-w-[9rem] truncate text-sm font-semibold text-[hsl(var(--foreground))]">
                  {user?.email || 'Admin'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-[hsl(var(--border))] px-5 py-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search regulation name, title, region, or source"
                className="ui-input pl-10"
              />
            </label>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                  Sort
                </span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="ui-select"
                >
                  <option value="title_asc">Title A to Z</option>
                  <option value="title_desc">Title Z to A</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                  Official Website
                </span>
                <select
                  value={officialWebsiteFilter}
                  onChange={(event) => setOfficialWebsiteFilter(event.target.value as BinaryFilter)}
                  className="ui-select"
                >
                  <option value="all">All regulations</option>
                  <option value="yes">Has Official Website</option>
                  <option value="no">Missing Official Website</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                  Link to Policy
                </span>
                <select
                  value={policyPageFilter}
                  onChange={(event) => setPolicyPageFilter(event.target.value as BinaryFilter)}
                  className="ui-select"
                >
                  <option value="all">All regulations</option>
                  <option value="yes">Has Link to Policy</option>
                  <option value="no">Missing Link to Policy</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                  Open PDF
                </span>
                <select
                  value={pdfFilter}
                  onChange={(event) => setPdfFilter(event.target.value as BinaryFilter)}
                  className="ui-select"
                >
                  <option value="all">All regulations</option>
                  <option value="yes">Has Open PDF</option>
                  <option value="no">Missing Open PDF</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                  Human verification
                </span>
                <select
                  value={verifiedFilter}
                  onChange={(event) => setVerifiedFilter(event.target.value as BinaryFilter)}
                  className="ui-select"
                >
                  <option value="all">All regulations</option>
                  <option value="yes">Verified by human</option>
                  <option value="no">Not verified yet</option>
                </select>
              </label>
            </div>
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
              Showing {filteredRegulations.length} of {regulations.length} regulations.
              {availabilityLoading ? ' Refreshing Official Website, Link to Policy, and Open PDF availability…' : ''}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-2">
              {filteredRegulations.map((regulation) => {
                const isSelected = regulation.id === selectedRegulationId
                const hasPersistedRecord = persistedRegulationIds.has(regulation.id)
                const availability = regulationAvailabilityById.get(regulation.id) || {
                  hasOfficialWebsite: false,
                  hasPolicyPage: false,
                  hasOpenPdf: false,
                }
                return (
                  <button
                    key={regulation.id}
                    type="button"
                    onClick={() => handleSelectRegulation(regulation.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.08] shadow-sm'
                        : 'border-[hsl(var(--border))] bg-white hover:border-[hsl(var(--primary))/0.3] hover:bg-[hsl(var(--muted))/0.4]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-[hsl(var(--foreground))]">{regulation.title}</p>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          {regulation.region} · {formatCategoryLabel(regulation.category)} · {formatStatusLabel(regulation.status)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${availability.hasOfficialWebsite ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            Official Website {availability.hasOfficialWebsite ? 'yes' : 'no'}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${availability.hasPolicyPage ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                            Policy {availability.hasPolicyPage ? 'yes' : 'no'}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${availability.hasOpenPdf ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                            PDF {availability.hasOpenPdf ? 'yes' : 'no'}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${regulation.human_verified ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {regulation.human_verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                          hasPersistedRecord
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                          {hasPersistedRecord ? <Database size={11} /> : <Unplug size={11} />}
                          {hasPersistedRecord ? 'DB' : 'Supplemental'}
                        </span>
                      </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto">
          <div className="surface-card overflow-hidden lg:min-h-full">
            <div className="sticky top-0 z-20 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))/0.96] px-5 py-5 backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-semibold text-[hsl(var(--foreground))]">
                    {selectedRegulation?.title || 'Select a regulation'}
                  </h2>
                  {selectedRegulation ? (
                    <>
                      <p className="mt-2 line-clamp-4 max-w-4xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                        {selectedRegulation.formal_title || selectedRegulation.description || selectedRegulation.full_description || 'No description available.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${(regulationDraft?.human_verified ?? selectedRegulation.human_verified) ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {(regulationDraft?.human_verified ?? selectedRegulation.human_verified) ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          {(regulationDraft?.human_verified ?? selectedRegulation.human_verified) ? 'Verified by human' : 'Not yet human-verified'}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedRegulation ? (
                    <button
                      type="button"
                      onClick={handleQuickToggleVerified}
                      disabled={!selectedIsPersisted || savingRegulation || !regulationDraft}
                      className={`${
                        regulationDraft?.human_verified
                          ? CONTROL_BUTTON_VERIFIED
                          : CONTROL_BUTTON_PRIMARY
                      }`}
                    >
                      {savingRegulation ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {regulationDraft?.human_verified ? 'Verified' : 'Mark as Verified'}
                    </button>
                  ) : null}
                  {selectedRegulation ? (
                    <button
                      type="button"
                      onClick={handleSaveRegulation}
                      disabled={savingRegulation || !selectedIsPersisted || !regulationDraft}
                      className={CONTROL_BUTTON_PRIMARY}
                    >
                      {savingRegulation ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save links
                    </button>
                  ) : null}
                  {selectedRegulation ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setDetailPreviewMode((current) => (current === 'library' ? null : 'library'))}
                        className={CONTROL_BUTTON_SECONDARY}
                      >
                        <Globe2 size={16} />
                        {detailPreviewMode === 'library' ? 'Hide library detail' : 'Open library detail'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailPreviewMode((current) => (current === 'esg-home' ? null : 'esg-home'))}
                        className={CONTROL_BUTTON_SECONDARY}
                      >
                        <Globe2 size={16} />
                        {detailPreviewMode === 'esg-home' ? 'Hide ESG Home detail' : 'Open ESG Home detail'}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {flashMessage ? (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                    flashMessage.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  {flashMessage.text}
                </div>
              ) : null}
            </div>

            {!selectedRegulation || !regulationDraft || !selectedButtonAudit ? (
              <div className="px-6 py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Select a regulation from the left panel to review and edit its current links and PDFs.
              </div>
            ) : (
              <div className="space-y-6 px-5 py-5">
                {embeddedDetailUrl ? (
                  <section className="surface-card overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          {detailPreviewMode === 'library' ? 'Library detail window' : 'ESG Home detail window'}
                        </p>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          Embedded inside the control room for quick checking.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailPreviewMode(null)}
                        className={CONTROL_BUTTON_SECONDARY}
                      >
                        <XCircle size={16} />
                        Close window
                      </button>
                    </div>
                    <div className="h-[30rem] overflow-hidden bg-white">
                      <iframe
                        title={detailPreviewMode === 'library' ? 'Library detail preview' : 'ESG Home detail preview'}
                        src={embeddedDetailUrl}
                        className="h-full w-full border-0"
                        loading="lazy"
                      />
                    </div>
                  </section>
                ) : null}

                <section className="grid gap-4 lg:grid-cols-3">
                  <QuickStatusCard
                    label="Official Website"
                    shown={selectedButtonAudit.officialWebsite.shown}
                    url={getPreviewUrl('official', selectedRegulation, selectedDocuments)}
                    tone="emerald"
                    previewKind="official"
                  >
                    <div className="flex flex-wrap gap-2">
                      {getPreviewUrl('official', selectedRegulation, selectedDocuments) ? (
                        <button
                          type="button"
                          onClick={() => openExternalInNewTabOnly(getPreviewUrl('official', selectedRegulation, selectedDocuments))}
                          className={CONTROL_BUTTON_SECONDARY}
                        >
                          <ExternalLink size={16} />
                          Open
                        </button>
                      ) : null}
                    </div>
                  </QuickStatusCard>

                  <QuickStatusCard
                    label="Link to Policy"
                    shown={selectedButtonAudit.policyPage.shown}
                    url={getPreviewUrl('policy', selectedRegulation, selectedDocuments)}
                    tone="sky"
                    previewKind="policy"
                  >
                    <div className="flex flex-wrap gap-2">
                      {getPreviewUrl('policy', selectedRegulation, selectedDocuments) ? (
                        <button
                          type="button"
                          onClick={() => openExternalInNewTabOnly(getPreviewUrl('policy', selectedRegulation, selectedDocuments))}
                          className={CONTROL_BUTTON_SECONDARY}
                        >
                          <ExternalLink size={16} />
                          Open
                        </button>
                      ) : null}
                    </div>
                  </QuickStatusCard>

                  <QuickStatusCard
                    label="Supabase PDF"
                    shown={selectedButtonAudit.pdf.shown}
                    url={getPreviewUrl('pdf', selectedRegulation, selectedDocuments)}
                    tone="violet"
                    previewKind="pdf"
                    emptyLabel="No saved PDF yet"
                  >
                    <div className="space-y-3">
                      {selectedPdfDocuments.length > 1 ? (
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                            Saved PDFs ({selectedPdfDocuments.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedPdfDocuments.map((document) => (
                              <button
                                key={document.id}
                                type="button"
                                onClick={() => setFocusedPdfDocumentId(document.id)}
                                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                  document.id === selectedPrimaryPdfDocument?.id
                                    ? 'border-violet-300 bg-violet-100 text-violet-700'
                                    : 'border-[hsl(var(--border))] bg-white text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))/0.45]'
                                }`}
                              >
                                {document.version_label || document.title || 'PDF'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-2 sm:grid-cols-2">
                        {getPreviewUrl('pdf', selectedRegulation, selectedDocuments) ? (
                          <button
                            type="button"
                            onClick={() => openExternalInNewTabOnly(getPreviewUrl('pdf', selectedRegulation, selectedDocuments))}
                            className={CONTROL_BUTTON_SECONDARY}
                          >
                            <ExternalLink size={16} />
                            Open PDF
                          </button>
                        ) : null}
                        <label className={`${CONTROL_BUTTON_SECONDARY} cursor-pointer`}>
                          <FilePlus2 size={16} />
                          {selectedPrimaryPdfDocument ? 'Replace PDF' : 'Upload PDF'}
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            disabled={!!uploadingDocumentIds[selectedPrimaryPdfDocument?.id || '__new__']}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              event.currentTarget.value = ''
                              if (!file) return
                              if (selectedPrimaryPdfDocument && selectedPrimaryPdfDraft) {
                                void applyUploadedPdfToExistingDocument(selectedPrimaryPdfDocument.id, selectedPrimaryPdfDraft, file)
                                return
                              }
                              const baseDraft = newDocumentDraft || createSourceDocumentDraft(selectedRegulation)
                              void applyUploadedPdfToNewDraft(file, baseDraft)
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedPrimaryPdfDocument && selectedPrimaryPdfDraft) {
                              void removeStoredPdfFromExistingDocument(selectedPrimaryPdfDocument.id, selectedPrimaryPdfDraft)
                              return
                            }
                            if (newDocumentDraft?.archived_public_url) {
                              void removeStoredPdfFromNewDraft()
                            }
                          }}
                          disabled={
                            (!selectedPrimaryPdfDocument && !newDocumentDraft?.archived_public_url) ||
                            !!removingStoredPdfIds[selectedPrimaryPdfDocument?.id || '__new__']
                          }
                          className={CONTROL_BUTTON_SECONDARY}
                        >
                          <Trash2 size={16} />
                          Remove PDF
                        </button>
                        <button
                          type="button"
                          onClick={openNewPdfDraft}
                          className={CONTROL_BUTTON_SECONDARY}
                        >
                          <FilePlus2 size={16} />
                          Add another PDF
                        </button>
                      </div>
                    </div>
                  </QuickStatusCard>
                </section>

                <section className="surface-card overflow-hidden">
                  <div className="border-b border-[hsl(var(--border))] px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[hsl(var(--foreground))]">Current UI button audit</p>
                        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                          Fast view of what the user currently sees, without opening the public page.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ButtonAuditPill label="Official Website" shown={selectedButtonAudit.officialWebsite.shown} />
                        <ButtonAuditPill label="Link to Policy" shown={selectedButtonAudit.policyPage.shown} />
                        <ButtonAuditPill label="Open PDF" shown={selectedButtonAudit.pdf.shown} />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 px-4 py-4 lg:grid-cols-3">
                    {selectedDocumentsLoading ? (
                      <div className="lg:col-span-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.35] px-4 py-6 text-sm text-[hsl(var(--muted-foreground))]">
                        Loading source documents and PDF availability for this regulation...
                      </div>
                    ) : null}
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Official Website</p>
                      <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))]">{selectedButtonAudit.officialWebsite.note}</p>
                    </div>
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Link to Policy</p>
                      <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))]">{selectedButtonAudit.policyPage.note}</p>
                    </div>
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">Open PDF</p>
                      <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))]">{selectedButtonAudit.pdf.note}</p>
                    </div>
                  </div>
                </section>

                <details className="surface-card overflow-hidden" open>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-4">
                    <div>
                      <p className="text-lg font-semibold text-[hsl(var(--foreground))]">Regulation-level links</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Edit the main Official Website and Link to Policy URLs used by the public UI.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          selectedIsPersisted
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {selectedIsPersisted ? <Database size={13} /> : <Unplug size={13} />}
                        {selectedIsPersisted ? 'Live DB row' : 'Supplemental only'}
                      </span>
                    </div>
                  </summary>

                  <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                        Source name
                      </span>
                      <input
                        value={regulationDraft.source_name}
                        onChange={(event) => setRegulationDraft({ ...regulationDraft, source_name: event.target.value })}
                        className="ui-input"
                        disabled={!selectedIsPersisted}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                        Raw source URL
                      </span>
                      <input
                        value={regulationDraft.source_url}
                        onChange={(event) => setRegulationDraft({ ...regulationDraft, source_url: event.target.value })}
                        className="ui-input"
                        disabled={!selectedIsPersisted}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                        Official Website URL
                      </span>
                      <input
                        value={regulationDraft.official_source_url}
                        onChange={(event) => setRegulationDraft({ ...regulationDraft, official_source_url: event.target.value })}
                        className="ui-input"
                        disabled={!selectedIsPersisted}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]">
                        Policy page URL
                      </span>
                      <input
                        value={regulationDraft.policy_page_url}
                        onChange={(event) => setRegulationDraft({ ...regulationDraft, policy_page_url: event.target.value })}
                        className="ui-input"
                        disabled={!selectedIsPersisted}
                      />
                    </label>
                  </div>

                  {!selectedIsPersisted ? (
                    <div className="border-t border-[hsl(var(--border))] bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      This regulation is currently supplemental-only in the frontend merge layer, so regulation-row edits are disabled. You can still add or edit source documents below for this ID.
                    </div>
                  ) : null}
                </details>

                <section className="surface-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-4 py-4">
                    <div>
                      <p className="text-lg font-semibold text-[hsl(var(--foreground))]">Source documents and PDFs</p>
                      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        Manage all attached source rows here, including multiple PDFs for one regulation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSourceDocuments((current) => !current)}
                      className={CONTROL_BUTTON_SECONDARY}
                    >
                      {showSourceDocuments ? 'Hide editors' : 'Show editors'}
                    </button>
                  </div>
                  {showSourceDocuments ? (
                    <div className="space-y-4 px-4 py-4">
                    {newDocumentDraft ? (
                      <DocumentEditorCard
                        draft={newDocumentDraft}
                        onChange={setNewDocumentDraft}
                        onSave={handleCreateDocument}
                        onUploadPdf={(file) => applyUploadedPdfToNewDraft(file, newDocumentDraft)}
                        onRemoveStoredPdf={removeStoredPdfFromNewDraft}
                        saving={!!savingDocumentIds.__new__}
                        deleting={false}
                        uploadingPdf={!!uploadingDocumentIds.__new__}
                        removingStoredPdf={!!removingStoredPdfIds.__new__}
                        isNew
                      />
                    ) : null}

                    {selectedDocuments.length === 0 ? (
                      <div className="surface-card-muted px-5 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        No source documents are currently attached to this regulation.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedDocuments.map((document) => {
                          const draft = documentDrafts[document.id] || createSourceDocumentDraft(selectedRegulation, document)
                          return (
                            <DocumentEditorCard
                              key={document.id}
                              draft={draft}
                              onChange={(nextDraft) => setDocumentDrafts((current) => ({ ...current, [document.id]: nextDraft }))}
                              onSave={() => handleSaveDocument(draft)}
                              onDelete={() => handleDeleteDocument(document.id, document.title)}
                              onUploadPdf={(file) => applyUploadedPdfToExistingDocument(document.id, draft, file)}
                              onRemoveStoredPdf={() => removeStoredPdfFromExistingDocument(document.id, draft)}
                              saving={!!savingDocumentIds[document.id]}
                              deleting={!!deletingDocumentIds[document.id]}
                              uploadingPdf={!!uploadingDocumentIds[document.id]}
                              removingStoredPdf={!!removingStoredPdfIds[document.id]}
                            />
                          )
                        })}
                      </div>
                    )}
                    </div>
                  ) : null}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
