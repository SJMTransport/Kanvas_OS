// Phase 03B-1 — the single shared "VID-XXX — Judul" presentation. Pure
// display, no business logic: every screen that shows a Content's title
// must show its video number alongside it, in this exact shape, so a user
// never has to guess which content something refers to.

interface ContentIdentityProps {
  videoNo?: string | null
  judul?: string | null
  /** Falls back to a muted placeholder when true and judul is empty. */
  emptyPlaceholder?: string
  className?: string
  numberClassName?: string
  titleClassName?: string
}

export function ContentIdentity({
  videoNo,
  judul,
  emptyPlaceholder = 'Tanpa Judul',
  className,
  numberClassName,
  titleClassName,
}: ContentIdentityProps) {
  const title = judul?.trim() ? judul : emptyPlaceholder
  const isEmpty = !judul?.trim()

  return (
    <span className={className}>
      {videoNo && (
        <span className={numberClassName ?? 'font-mono text-text-muted'}>{videoNo}</span>
      )}
      {videoNo && ' — '}
      <span className={isEmpty ? `italic text-text-muted ${titleClassName ?? ''}` : titleClassName}>
        {title}
      </span>
    </span>
  )
}

/** Plain-string version for contexts that need text, not JSX (titles, aria-labels, PDF). */
export function contentIdentityText(videoNo?: string | null, judul?: string | null, emptyPlaceholder = 'Tanpa Judul'): string {
  const title = judul?.trim() ? judul : emptyPlaceholder
  return videoNo ? `${videoNo} — ${title}` : title
}
