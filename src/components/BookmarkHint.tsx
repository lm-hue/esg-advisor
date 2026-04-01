import type { ReactNode } from 'react'
import { LogIn, Star } from 'lucide-react'

interface BookmarkHintProps {
  showHint: boolean
  children: ReactNode
}

export default function BookmarkHint({ showHint, children }: BookmarkHintProps) {
  return (
    <div className="group/bookmark relative inline-flex">
      {children}
      {showHint && (
        <div className="ui-bookmark-hint" aria-hidden="true">
          <div className="ui-bookmark-hint-card">
            <span className="ui-bookmark-hint-badge">
              <LogIn size={11} />
            </span>
            <span className="ui-bookmark-hint-copy">
              Sign in to save bookmarks
            </span>
            <Star size={11} className="text-amber-500" />
          </div>
          <span className="ui-bookmark-hint-arrow" />
        </div>
      )}
    </div>
  )
}
