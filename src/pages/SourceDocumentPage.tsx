import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { openExternalInNewTabOnly } from '../lib/openExternal'
import { fetchRegulationSourceChunks, fetchRegulationSourceDocumentById } from '../lib/regulations'
import { RegulationSourceChunk, RegulationSourceDocument } from '../types'

function buildDisplayLink(document: RegulationSourceDocument | null) {
  if (!document) return ''
  if (document.document_type === 'pdf') return document.archived_public_url || document.document_url || document.official_source_url || ''
  return document.document_url || document.official_source_url || ''
}

export default function SourceDocumentPage() {
  const { documentId } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [document, setDocument] = useState<RegulationSourceDocument | null>(null)
  const [chunks, setChunks] = useState<RegulationSourceChunk[]>([])
  const [loading, setLoading] = useState(true)
  const highlightedChunkIndex = Number(searchParams.get('chunk') || '-1')
  const excerptLabel = searchParams.get('excerpt')
  const chunkRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const navigationState = (
    location.state as {
      regulationPath?: string
      regulationBackTo?: string | null
      regulationBackLabel?: string
    } | null
  ) ?? null

  useEffect(() => {
    if (!documentId) return

    setLoading(true)
    Promise.all([fetchRegulationSourceDocumentById(documentId), fetchRegulationSourceChunks(documentId)])
      .then(([sourceDocument, sourceChunks]) => {
        setDocument(sourceDocument)
        setChunks(sourceChunks)
      })
      .finally(() => setLoading(false))
  }, [documentId])

  useEffect(() => {
    if (loading || highlightedChunkIndex < 0) return
    const target = chunkRefs.current[highlightedChunkIndex]
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [loading, highlightedChunkIndex, chunks.length])

  const displayLink = useMemo(() => buildDisplayLink(document), [document])
  const regulationPath = navigationState?.regulationPath || (document?.regulation_id ? `/esg-home/${document.regulation_id}` : '/esg-home')
  const regulationState = navigationState?.regulationPath
    ? {
        backTo: navigationState.regulationBackTo ?? undefined,
        backLabel: navigationState.regulationBackLabel ?? 'Back',
      }
    : undefined

  return (
    <div className="page-shell-narrow">
      <div className="surface-card min-h-[70vh] overflow-hidden">
        <div className="border-b border-[hsl(var(--border))] px-5 py-4">
          <Link
            to={regulationPath}
            state={regulationState}
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))]"
          >
            <ArrowLeft size={14} />
            Back to regulation
          </Link>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                {document?.title || 'Source document'}
              </h1>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                {document?.source_name || 'Research source'}
                {document?.version_label ? ` · ${document.version_label}` : ''}
                {document?.document_type === 'pdf' ? ' · PDF document' : document?.document_type === 'html' ? ' · Web Document' : ''}
              </p>
              {excerptLabel ? (
                <p className="mt-2 text-sm text-[hsl(var(--primary))]">
                  Jumped to cited excerpt {excerptLabel}.
                </p>
              ) : null}
            </div>

            {displayLink ? (
              <button
                type="button"
                onClick={() => openExternalInNewTabOnly(displayLink)}
                className="ui-button-ghost inline-flex items-center gap-2 self-start"
              >
                {document?.document_type === 'pdf' ? 'Open PDF' : 'Open Link'}
                <ExternalLink size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="px-5 py-5">
          {loading ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading cited source text...</p>
          ) : !document ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">This source document could not be found.</p>
          ) : chunks.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              No extracted text is available for this source document yet.
            </p>
          ) : (
            <div className="space-y-3">
              {chunks.map((chunk) => {
                const isHighlighted = chunk.chunk_index === highlightedChunkIndex

                return (
                  <div
                    key={`${chunk.document_id}-${chunk.chunk_index}`}
                    id={`chunk-${chunk.chunk_index}`}
                    ref={(node) => {
                      chunkRefs.current[chunk.chunk_index] = node
                    }}
                    className={`rounded-2xl border px-4 py-4 transition ${
                      isHighlighted
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))/0.08] shadow-sm'
                        : 'border-[hsl(var(--border))] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--primary))]">
                        Chunk {chunk.chunk_index + 1}
                      </p>
                      {isHighlighted && excerptLabel ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--primary))]">
                          {excerptLabel}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[hsl(var(--foreground))]">
                      {chunk.content}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
