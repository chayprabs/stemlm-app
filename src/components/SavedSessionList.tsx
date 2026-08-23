/**
 * Toolbar saved-questions library: search, subject filter, question-first rows.
 * Activating a row downloads the stored snapshot as PDF — it does not open Gemini.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteSavedSession,
  downloadSavedSessionPdf,
  getSavedSessions,
  type SavedSessionSnapshot,
} from '@/src/lib/saved-sessions';
import {
  ALL_SAVED_SUBJECTS,
  filterSavedSessions,
  latestSavedSessions,
  savedSessionHeading,
  savedSessionSubject,
  savedSessionSubjects,
} from '@/src/lib/saved-library';
import { OPEN_ALL_SAVED_LABEL } from '@/src/lib/saved-library';
import { IconCheck, IconClose, IconFilter, IconHelp, IconPdf, IconSave, IconSearch } from './icons';

const SAVED_HELP = 'Bookmark it in the panel. Click a question here for the PDF.';

function SavedHelp() {
  return (
    <span className="slm-saved-help">
      <button
        type="button"
        className="slm-popup-settings slm-saved-help-btn"
        aria-label={SAVED_HELP}
        aria-describedby="slm-saved-help-tip"
      >
        <IconHelp />
      </button>
      <span id="slm-saved-help-tip" role="tooltip" className="slm-saved-help-tip">
        {SAVED_HELP}
      </span>
    </span>
  );
}

function SavedHead({ countLabel, hide }: { countLabel?: string; hide?: boolean }) {
  if (hide) return null;
  return (
    <div className="slm-saved-head">
      <h2 className="slm-popup-section-title">
        Saved questions
        {countLabel ? <span className="slm-saved-count">{countLabel}</span> : null}
      </h2>
      <SavedHelp />
    </div>
  );
}

function SubjectFilter({
  subject,
  subjects,
  onChange,
}: {
  subject: string;
  subjects: string[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const filtered = subject !== ALL_SAVED_SUBJECTS;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options = [
    { value: ALL_SAVED_SUBJECTS, label: 'All subjects' },
    ...subjects.map((name) => ({ value: name, label: name })),
  ];

  return (
    <div className="slm-saved-filter-wrap" ref={rootRef}>
      <button
        type="button"
        className="slm-saved-filter"
        aria-label="Filter by subject"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-active={filtered ? 'true' : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <IconFilter />
      </button>
      {open && (
        <ul className="slm-saved-menu" role="listbox" aria-label="Filter by subject">
          {options.map((opt) => {
            const selected = opt.value === subject;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`slm-saved-menu-item ${selected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {selected && <IconCheck width={14} height={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function SavedSessionList({
  sessions,
  onSessionsChange,
  onDownloaded,
  variant = 'full',
  hideHeading = false,
  onOpenAll,
}: {
  sessions: SavedSessionSnapshot[];
  onSessionsChange?: (sessions: SavedSessionSnapshot[]) => void;
  onDownloaded?: () => void;
  variant?: 'compact' | 'full';
  hideHeading?: boolean;
  onOpenAll?: () => void;
}) {
  const [items, setItems] = useState(sessions);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState(ALL_SAVED_SUBJECTS);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const compact = variant === 'compact';

  useEffect(() => {
    setItems(sessions);
  }, [sessions]);

  const subjects = useMemo(() => savedSessionSubjects(items), [items]);
  const visible = useMemo(
    () => (compact ? latestSavedSessions(items) : filterSavedSessions(items, { query, subject })),
    [compact, items, query, subject],
  );

  async function download(id: string) {
    setError(null);
    setDownloadingId(id);
    try {
      const result = await downloadSavedSessionPdf(id);
      if (!result.ok) {
        setError('PDF export failed. Try again.');
        return;
      }
      onDownloaded?.();
    } catch {
      setError('Could not export PDF. Try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await deleteSavedSession(id);
      const next = await getSavedSessions();
      setItems(next);
      onSessionsChange?.(next);
    } catch {
      setError('Could not delete saved question. Try again.');
    }
  }

  if (items.length === 0) {
    return (
      <section className="slm-popup-section" aria-label="Saved questions">
        <SavedHead hide={hideHeading} />
        <div className="slm-saved-empty">
          <span className="slm-saved-empty-mark" aria-hidden="true">
            <IconSave width={22} height={22} />
          </span>
          <p className="slm-popup-empty">Nothing saved yet.</p>
        </div>
      </section>
    );
  }

  const countLabel =
    compact || visible.length === items.length
      ? `${items.length}`
      : `${visible.length} / ${items.length}`;

  return (
    <section
      className={`slm-popup-section ${compact ? 'slm-saved-compact' : 'slm-saved-full'}`}
      aria-label="Saved questions"
    >
      <SavedHead countLabel={countLabel} hide={hideHeading} />

      {!compact && (
        <div className="slm-saved-toolbar">
          <div className="slm-saved-search-wrap">
            <IconSearch width={14} height={14} aria-hidden="true" />
            <input
              type="text"
              className="slm-saved-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search saved questions"
              autoComplete="off"
              spellCheck={false}
            />
            <SubjectFilter subject={subject} subjects={subjects} onChange={setSubject} />
          </div>
        </div>
      )}

      {error && <p className="slm-popup-error">{error}</p>}

      {visible.length === 0 ? (
        <p className="slm-popup-empty" role="status">
          No questions match.
        </p>
      ) : (
        <ul className="slm-saved-list">
          {visible.map((item) => {
            const heading = savedSessionHeading(item);
            const subjectLabel = savedSessionSubject(item);
            const busy = downloadingId === item.id;
            return (
              <li key={item.id} className="slm-saved-item">
                <button
                  type="button"
                  className="slm-saved-open"
                  onClick={() => void download(item.id)}
                  disabled={busy}
                  title="Download PDF"
                  aria-label={`Download PDF for ${heading}`}
                >
                  <span className="slm-saved-meta">
                    <span className="slm-saved-question">
                      <IconPdf width={13} height={13} aria-hidden="true" />
                      <span className="slm-saved-question-text">{heading}</span>
                    </span>
                    <span className="slm-saved-sub">
                      <span className="slm-saved-chip">{subjectLabel}</span>
                      <span>{busy ? 'Preparing PDF…' : 'PDF'}</span>
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="slm-saved-del"
                  title="Delete saved question"
                  aria-label={`Delete ${heading}`}
                  onClick={() => void remove(item.id)}
                >
                  <IconClose width={14} height={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {compact && onOpenAll && (
        <button type="button" className="slm-saved-open-all" onClick={onOpenAll}>
          {OPEN_ALL_SAVED_LABEL}
        </button>
      )}
    </section>
  );
}
