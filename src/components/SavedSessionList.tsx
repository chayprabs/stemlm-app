/**
 * Saved-questions library: search + time in a top toolbar, category chips,
 * 2-line rows with download + open actions.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  deleteSavedSession,
  downloadSavedSessionPdf,
  getSavedSessions,
  openSavedSessionPdf,
  type SavedSessionSnapshot,
} from '@/src/lib/saved-sessions';
import {
  ALL_SAVED_SUBJECTS,
  ALL_SAVED_TIME,
  SAVED_SEARCH_PLACEHOLDER,
  SAVED_TIME_ANY_LABEL,
  SAVED_TIME_FILTERS,
  filterSavedSessions,
  savedSessionQuestion,
  savedSessionSubject,
  savedSessionSubjects,
  savedTimeFilterLabel,
  type SavedTimeFilter,
} from '@/src/lib/saved-library';
import {
  IconCheck,
  IconChevronDown,
  IconClock,
  IconDownload,
  IconOpen,
  IconPdf,
  IconSave,
  IconSearch,
  IconTrash,
} from './icons';
import { MathMarkdown } from './MathMarkdown';

function TimeFilter({
  value,
  onChange,
}: {
  value: SavedTimeFilter;
  onChange: (next: SavedTimeFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const filtered = value !== ALL_SAVED_TIME;

  useLayoutEffect(() => {
    if (!open) return;
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const place = () => {
      const r = btn.getBoundingClientRect();
      const width = Math.round(r.width);
      menu.style.top = `${Math.round(r.bottom + 4)}px`;
      menu.style.left = `${Math.round(r.left)}px`;
      menu.style.right = 'auto';
      menu.style.width = `${width}px`;
      menu.style.minWidth = `${width}px`;
      menu.style.maxWidth = `${width}px`;
    };

    place();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
    };
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const options: { id: SavedTimeFilter; label: string }[] = [
    { id: ALL_SAVED_TIME, label: SAVED_TIME_ANY_LABEL },
    ...SAVED_TIME_FILTERS,
  ];

  return (
    <div className="slm-library-time" ref={rootRef} data-open={open ? 'true' : undefined}>
      <button
        ref={btnRef}
        type="button"
        className="slm-library-time-btn"
        aria-label="Filter by time"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-active={filtered ? 'true' : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="slm-library-time-leading">
          <IconClock width={16} height={16} className="slm-library-time-clock" aria-hidden="true" />
          <span className="slm-library-time-label">{savedTimeFilterLabel(value)}</span>
        </span>
        <IconChevronDown width={14} height={14} className="slm-library-time-chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={menuRef}
          className="slm-library-time-menu"
          role="listbox"
          aria-label="Filter by time"
        >
          {options.map((opt) => {
            const selected = opt.id === value;
            return (
              <li key={opt.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`slm-library-time-item ${selected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  <IconCheck
                    width={14}
                    height={14}
                    strokeWidth={2}
                    className="slm-library-time-check"
                    data-on={selected ? 'true' : undefined}
                    aria-hidden="true"
                  />
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
}: {
  sessions: SavedSessionSnapshot[];
  onSessionsChange?: (sessions: SavedSessionSnapshot[]) => void;
  onDownloaded?: () => void;
}) {
  const [items, setItems] = useState(sessions);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState(ALL_SAVED_SUBJECTS);
  const [time, setTime] = useState<SavedTimeFilter>(ALL_SAVED_TIME);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(sessions);
  }, [sessions]);

  const subjects = useMemo(() => savedSessionSubjects(items), [items]);
  const visible = useMemo(
    () => filterSavedSessions(items, { query, subject, time }),
    [items, query, subject, time],
  );

  async function download(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const result = await downloadSavedSessionPdf(id);
      if (!result.ok) {
        setError('Download failed. Try again.');
        return;
      }
      onDownloaded?.();
    } catch {
      setError('Could not download the report. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function open(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const result = await openSavedSessionPdf(id);
      if (!result.ok) setError('Could not open the report. Try again.');
    } catch {
      setError('Could not open the report. Try again.');
    } finally {
      setBusyId(null);
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

  return (
    <section className="slm-library-main" aria-label="Saved questions">
      <div className="slm-library-toolbar">
        <div className="slm-library-search-wrap">
          <IconSearch width={16} height={16} aria-hidden="true" />
          <input
            type="text"
            className="slm-library-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={SAVED_SEARCH_PLACEHOLDER}
            aria-label="Search saved questions"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <TimeFilter value={time} onChange={setTime} />
      </div>

      {items.length > 0 && (
        <div className="slm-library-chips" aria-label="Categories">
          <button
            type="button"
            className={`slm-library-chip ${subject === ALL_SAVED_SUBJECTS ? 'is-active' : ''}`}
            aria-pressed={subject === ALL_SAVED_SUBJECTS}
            onClick={() => setSubject(ALL_SAVED_SUBJECTS)}
          >
            All categories
          </button>
          {subjects.map((name) => (
            <button
              key={name}
              type="button"
              className={`slm-library-chip ${subject === name ? 'is-active' : ''}`}
              aria-pressed={subject === name}
              onClick={() => setSubject(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="slm-popup-error">{error}</p>}

      <div className="slm-library-feed">
        {items.length === 0 ? (
          <div className="slm-library-empty">
            <span className="slm-saved-empty-mark" aria-hidden="true">
              <IconSave width={22} height={22} />
            </span>
            <p className="slm-popup-empty">Nothing saved yet.</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="slm-popup-empty" role="status">
            No questions match.
          </p>
        ) : (
          <ul className="slm-library-list">
            {visible.map((item) => {
              const question = savedSessionQuestion(item);
              const subjectLabel = savedSessionSubject(item);
              const busy = busyId === item.id;
              return (
                <li key={item.id} className="slm-library-row slm-saved-item">
                  <span className="slm-library-row-icon" aria-hidden="true">
                    <IconPdf width={16} height={16} />
                  </span>
                  <span className="slm-library-row-copy" title={question}>
                    <MathMarkdown
                      content={question}
                      className="slm-library-row-q slm-saved-question-text"
                    />
                    <span className="slm-library-row-meta">{subjectLabel}</span>
                  </span>
                  <span className="slm-library-row-actions">
                    <button
                      type="button"
                      className="slm-library-icon-btn"
                      data-action="download"
                      title="Download"
                      aria-label={`Download PDF for ${question}`}
                      disabled={busy}
                      onClick={() => void download(item.id)}
                    >
                      <IconDownload width={15} height={15} />
                    </button>
                    <button
                      type="button"
                      className="slm-library-icon-btn"
                      data-action="open"
                      title="Open"
                      aria-label={`Open PDF for ${question}`}
                      disabled={busy}
                      onClick={() => void open(item.id)}
                    >
                      <IconOpen width={15} height={15} />
                    </button>
                    <button
                      type="button"
                      className="slm-library-icon-btn slm-library-icon-btn--quiet"
                      data-action="delete"
                      title="Delete saved question"
                      aria-label={`Delete ${question}`}
                      onClick={() => void remove(item.id)}
                    >
                      <IconTrash width={15} height={15} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
