/**
 * Saved-questions library: a search field with a time filter and the merge action, a scrolling
 * row of subject chips, and one ruled row per saved question with download / open / delete.
 * "Merge PDF" turns the list into a picker and combines the picked questions into one PDF.
 */
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  deleteSavedSession,
  getSavedSessions,
  type SavedSessionSnapshot,
} from '@/src/lib/saved-sessions';
import {
  downloadSavedSessionPdf,
  downloadSavedSessionsPdf,
  openSavedSessionPdf,
} from '@/src/lib/saved-session-pdf';
import type { PdfExportResult } from '@/src/lib/pdf';
import type { RenderProgress } from '@/src/lib/pdf-raster';
import {
  ALL_SAVED_SUBJECTS,
  ALL_SAVED_TIME,
  MERGE_CANCEL_LABEL,
  MERGE_START_LABEL,
  SAVED_SEARCH_PLACEHOLDER,
  SAVED_TIME_ANY_LABEL,
  SAVED_TIME_FILTERS,
  SELECT_ALL_LABEL,
  TIME_MENU_MIN_WIDTH_PX,
  filterSavedSessions,
  mergeDownloadLabel,
  pdfFailureMessage,
  savedSessionQuestion,
  savedSessionSubject,
  savedSessionSubjects,
  savedTimeFilterLabel,
  type SavedTimeFilter,
} from '@/src/lib/saved-library';
import { CHAT_HOST_LAUNCH } from '@/src/platforms/hosts';
import {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconClose,
  IconDownload,
  IconLayers,
  IconOpen,
  IconPdf,
  IconSave,
  IconSearch,
  IconTrash,
} from './icons';
import { HostLogo } from './host-logos';
import { MathMarkdown } from './MathMarkdown';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** When a question was saved: relative while it is recent, a calendar date after a week. */
export function savedWhenLabel(savedAt: number, now: number): string {
  const age = now - savedAt;
  if (!Number.isFinite(age) || age < MINUTE) return 'Just now';
  if (age < HOUR) return `${Math.floor(age / MINUTE)} min ago`;
  if (age < DAY) return `${Math.floor(age / HOUR)} h ago`;
  if (age < 7 * DAY) return `${Math.floor(age / DAY)} d ago`;
  const date = new Date(savedAt);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** True when a key press belongs to something the reader is typing into. */
function isTypingTarget(event: KeyboardEvent): boolean {
  const target = (event.composedPath?.()[0] ?? event.target) as Element | null;
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

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
      // The control shrink-wraps its label, so the menu takes the wider of the
      // two — long window labels stay on one line.
      const width = Math.round(Math.max(r.width, TIME_MENU_MIN_WIDTH_PX));
      const right = Math.round(r.right);
      menu.style.top = `${Math.round(r.bottom + 4)}px`;
      menu.style.left = `${Math.max(4, right - width)}px`;
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

/**
 * A single-row category rail. Chips never wrap, so fifteen subjects cost the
 * same vertical space as two; arrows appear only when there is more to reach.
 */
function CategoryRail({
  subjects,
  counts,
  total,
  value,
  onChange,
}: {
  subjects: string[];
  counts: ReadonlyMap<string, number>;
  total: number;
  value: string;
  onChange: (next: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });
  const reducedMotion = useReducedMotion();

  const sync = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    setOverflow({ start: rail.scrollLeft > 2, end: max > 2 && rail.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    sync();
    rail.addEventListener('scroll', sync, { passive: true });
    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(sync) : null;
    observer?.observe(rail);
    return () => {
      rail.removeEventListener('scroll', sync);
      observer?.disconnect();
    };
  }, [sync, subjects.length]);

  // Keep the active chip reachable when a filter is restored or the list changes.
  useEffect(() => {
    const active = railRef.current?.querySelector<HTMLElement>('.slm-library-chip.is-active');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  function nudge(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(120, rail.clientWidth * 0.7),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <div
      className="slm-library-rail"
      data-overflow-start={overflow.start ? 'true' : undefined}
      data-overflow-end={overflow.end ? 'true' : undefined}
    >
      {overflow.start && (
        <button
          type="button"
          className="slm-library-rail-arrow"
          data-dir="start"
          aria-label="Scroll categories left"
          tabIndex={-1}
          onClick={() => nudge(-1)}
        >
          <IconChevronLeft width={14} height={14} />
        </button>
      )}
      <div className="slm-library-chips" ref={railRef} role="group" aria-label="Categories">
        <button
          type="button"
          className={`slm-library-chip ${value === ALL_SAVED_SUBJECTS ? 'is-active' : ''}`}
          aria-pressed={value === ALL_SAVED_SUBJECTS}
          onClick={() => onChange(ALL_SAVED_SUBJECTS)}
        >
          All categories
          <span className="slm-library-chip-count">{total}</span>
        </button>
        {subjects.map((name) => (
          <button
            key={name}
            type="button"
            className={`slm-library-chip ${value === name ? 'is-active' : ''}`}
            aria-pressed={value === name}
            onClick={() => onChange(name)}
          >
            {name}
            <span className="slm-library-chip-count">{counts.get(name) ?? 0}</span>
          </button>
        ))}
      </div>
      {overflow.end && (
        <button
          type="button"
          className="slm-library-rail-arrow"
          data-dir="end"
          aria-label="Scroll categories right"
          tabIndex={-1}
          onClick={() => nudge(1)}
        >
          <IconChevronRight width={14} height={14} />
        </button>
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
  const deferredQuery = useDeferredValue(query);
  const [subject, setSubject] = useState(ALL_SAVED_SUBJECTS);
  const [time, setTime] = useState<SavedTimeFilter>(ALL_SAVED_TIME);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // One clock reading per list, so every row's "saved 2 h ago" agrees with the others.
  const now = useMemo(() => Date.now(), [items]);

  useEffect(() => {
    setItems(sessions);
  }, [sessions]);

  const subjects = useMemo(() => savedSessionSubjects(items), [items]);
  const subjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const name = savedSessionSubject(item);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }, [items]);
  const visible = useMemo(
    () => filterSavedSessions(items, { query: deferredQuery, subject, time }),
    [items, deferredQuery, subject, time],
  );

  const pickedSet = useMemo(() => new Set(picked), [picked]);
  /**
   * The merged PDF reads top-to-bottom exactly as the list shows it. Picks that
   * a later filter hides are kept — the count promised them — and appended.
   */
  const pickedIds = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const item of visible) {
      if (!pickedSet.has(item.id)) continue;
      ordered.push(item.id);
      seen.add(item.id);
    }
    for (const item of items) {
      if (pickedSet.has(item.id) && !seen.has(item.id)) ordered.push(item.id);
    }
    return ordered;
  }, [items, visible, pickedSet]);
  const allVisiblePicked =
    visible.length > 0 && visible.every((item) => pickedSet.has(item.id));

  const filtering = query.trim().length > 0 || subject !== ALL_SAVED_SUBJECTS || time !== ALL_SAVED_TIME;

  // "/" jumps to search from anywhere on the page, the way it does in most libraries.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event)) return;
      const input = searchRef.current;
      if (!input) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function clearFilters() {
    setQuery('');
    setSubject(ALL_SAVED_SUBJECTS);
    setTime(ALL_SAVED_TIME);
  }

  /** What is narrowing the list, in words, for the no-results state. */
  function filterSummary(): string {
    const parts: string[] = [];
    if (query.trim()) parts.push(`\u201c${query.trim()}\u201d`);
    if (subject !== ALL_SAVED_SUBJECTS) parts.push(`in ${subject}`);
    if (time !== ALL_SAVED_TIME) parts.push(`from the ${savedTimeFilterLabel(time).toLowerCase()}`);
    return parts.length > 0 ? `Nothing saved matches ${parts.join(' ')}.` : 'Nothing saved matches.';
  }

  function fail(result: PdfExportResult, fallback: string) {
    setError({
      message: result.reason ? pdfFailureMessage(result.reason) : fallback,
      detail: result.detail,
    });
  }

  async function download(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const result = await downloadSavedSessionPdf(id);
      if (!result.ok) {
        fail(result, 'Download failed. Try again.');
        return;
      }
      onDownloaded?.();
    } catch {
      setError({ message: 'Could not download the report. Try again.' });
    } finally {
      setBusyId(null);
    }
  }

  async function open(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const result = await openSavedSessionPdf(id);
      if (!result.ok) setError({ message: 'Could not open the report. Try again.' });
    } catch {
      setError({ message: 'Could not open the report. Try again.' });
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
      setPicked((prev) => prev.filter((pickedId) => pickedId !== id));
      onSessionsChange?.(next);
    } catch {
      setError({ message: 'Could not delete saved question. Try again.' });
    }
  }

  function togglePick(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }

  function toggleAllVisible() {
    const ids = visible.map((item) => item.id);
    setPicked((prev) =>
      allVisiblePicked
        ? prev.filter((id) => !ids.includes(id))
        : [...prev, ...ids.filter((id) => !prev.includes(id))],
    );
  }

  function stopPicking() {
    setPicking(false);
    setPicked([]);
    setProgress(null);
  }

  async function downloadPicked() {
    if (pickedIds.length === 0 || merging) return;
    setError(null);
    setMerging(true);
    setProgress(null);
    try {
      const result = await downloadSavedSessionsPdf(pickedIds, {
        onProgress: setProgress,
      });
      if (!result.ok) {
        fail(result, 'Could not build the merged PDF. Try again.');
        return;
      }
      onDownloaded?.();
      stopPicking();
    } catch {
      setError({ message: 'Could not build the merged PDF. Try again.' });
    } finally {
      setMerging(false);
      setProgress(null);
    }
  }

  const empty = items.length === 0;

  return (
    <section className="slm-library-main" aria-label="Saved questions">
      {!empty && (
        <div className="slm-library-toolbar-row">
          <div className="slm-library-toolbar">
            <div className="slm-library-search-wrap">
              <IconSearch width={16} height={16} aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                className="slm-library-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Escape empties a search first; only an already empty field lets it close the library.
                  if (e.key === 'Escape' && query) {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuery('');
                  }
                }}
                placeholder={SAVED_SEARCH_PLACEHOLDER}
                aria-label="Search saved questions"
                aria-keyshortcuts="/"
                autoComplete="off"
                spellCheck={false}
              />
              {query ? (
                <button
                  type="button"
                  className="slm-library-search-clear"
                  aria-label="Clear search"
                  title="Clear search"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                >
                  <IconClose width={14} height={14} aria-hidden="true" />
                </button>
              ) : (
                <kbd className="slm-library-search-key" aria-hidden="true">/</kbd>
              )}
            </div>
          </div>
          <TimeFilter value={time} onChange={setTime} />
          {!picking && (
            <button
              type="button"
              className="slm-library-merge"
              data-merge="start"
              aria-label={MERGE_START_LABEL}
              title="Combine several saved questions into one PDF"
              onClick={() => setPicking(true)}
            >
              <IconLayers width={15} height={15} aria-hidden="true" />
              <span className="slm-library-merge-label">{MERGE_START_LABEL}</span>
            </button>
          )}
        </div>
      )}

      {!empty && (
        <CategoryRail
          subjects={subjects}
          counts={subjectCounts}
          total={items.length}
          value={subject}
          onChange={setSubject}
        />
      )}

      {picking && (
        <div className="slm-library-select" role="group" aria-label="Merge into one PDF">
          <p className="slm-library-select-status" role="status">
            <strong>{pickedIds.length === 0 ? 'Pick questions to merge' : `${pickedIds.length} selected`}</strong>
            <span>They are combined into one PDF, in the order shown.</span>
          </p>
          <div className="slm-library-merge-actions">
            <button
              type="button"
              className="slm-library-merge-quiet"
              data-merge="select-all"
              disabled={merging || visible.length === 0}
              onClick={toggleAllVisible}
            >
              {allVisiblePicked ? 'Clear' : SELECT_ALL_LABEL}
            </button>
            <button
              type="button"
              className="slm-library-merge-quiet"
              data-merge="cancel"
              disabled={merging}
              onClick={stopPicking}
            >
              {MERGE_CANCEL_LABEL}
            </button>
            <button
              type="button"
              className="slm-library-merge is-primary"
              data-merge="download"
              disabled={pickedIds.length === 0 || merging}
              aria-label={mergeDownloadLabel(pickedIds.length)}
              onClick={() => void downloadPicked()}
            >
              <IconDownload width={15} height={15} aria-hidden="true" />
              <span className="slm-library-merge-label">
                {merging
                  ? progress
                    ? `Page ${progress.page}/${progress.total}`
                    : 'Building…'
                  : mergeDownloadLabel(pickedIds.length)}
              </span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="slm-popup-error" role="status">
          {error.message}
          {error.detail && <span className="slm-popup-error-detail">{error.detail}</span>}
        </p>
      )}

      <div className="slm-library-feed" data-picking={picking ? 'true' : undefined}>
        {empty ? (
          <div className="slm-library-empty">
            <span className="slm-saved-empty-mark" aria-hidden="true">
              <IconSave width={22} height={22} />
            </span>
            <p className="slm-library-empty-title">Nothing saved yet.</p>
            <p className="slm-library-empty-text">
              Press the bookmark at the top of the study panel to keep an answer. It stays in this browser, ready to
              reopen or to export as a PDF.
            </p>
            <div className="slm-library-empty-hosts">
              <span className="slm-library-empty-label">Start in a chat</span>
              <div className="slm-library-empty-host-row">
                {CHAT_HOST_LAUNCH.map((host) => (
                  <a
                    key={host.id}
                    className="slm-library-empty-host"
                    href={host.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <HostLogo id={host.id} size={15} />
                    {host.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="slm-library-empty slm-library-empty--filtered" role="status">
            <span className="slm-library-empty-mark" aria-hidden="true">
              <IconSearch width={20} height={20} />
            </span>
            <p className="slm-library-empty-title">No questions match.</p>
            <p className="slm-library-empty-text">{filterSummary()}</p>
            <button type="button" className="slm-library-clear" data-library="clear-filters" onClick={clearFilters}>
              Clear search and filters
            </button>
          </div>
        ) : (
          <>
            {filtering && (
              <p className="slm-library-summary" role="status">
                <span>{visible.length} of {plural(items.length, 'question', 'questions')}</span>
                <button type="button" className="slm-library-summary-clear" data-library="clear-filters" onClick={clearFilters}>
                  Clear filters
                </button>
              </p>
            )}
            <ul className="slm-library-list">
              {visible.map((item) => {
                const question = savedSessionQuestion(item);
                const subjectLabel = savedSessionSubject(item);
                const host = CHAT_HOST_LAUNCH.find((entry) => entry.id === item.platform);
                const stepCount = Array.isArray(item.steps) ? item.steps.length : 0;
                const busy = busyId === item.id;
                const chosen = pickedSet.has(item.id);
                return (
                  <li
                    key={item.id}
                    className="slm-library-row slm-saved-item"
                    data-selected={picking && chosen ? 'true' : undefined}
                    onClick={picking ? () => togglePick(item.id) : undefined}
                  >
                    {picking ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={chosen}
                        className="slm-library-check"
                        aria-label={`Select ${question}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePick(item.id);
                        }}
                      >
                        <IconCheck width={12} height={12} strokeWidth={2.5} aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="slm-library-row-icon" aria-hidden="true">
                        <IconPdf width={16} height={16} />
                      </span>
                    )}
                    <span className="slm-library-row-copy">
                      <MathMarkdown
                        content={question}
                        className="slm-library-row-q slm-saved-question-text"
                      />
                      <span className="slm-library-row-meta">
                        <span className="slm-library-row-subject">{subjectLabel}</span>
                        {host && (
                          <span className="slm-library-row-host">
                            <HostLogo id={host.id} size={11} />
                            {host.label}
                          </span>
                        )}
                        {stepCount > 0 && <span className="slm-library-row-steps">{plural(stepCount, 'step', 'steps')}</span>}
                        {typeof item.savedAt === 'number' && (
                          <time dateTime={new Date(item.savedAt).toISOString()}>{savedWhenLabel(item.savedAt, now)}</time>
                        )}
                      </span>
                    </span>
                    {!picking && (
                      <span className="slm-library-row-actions">
                        <button
                          type="button"
                          className="slm-library-icon-btn"
                          data-action="download"
                          data-label="Download"
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
                          data-label="Open"
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
                          data-label="Delete"
                          title="Delete saved question"
                          aria-label={`Delete ${question}`}
                          onClick={() => void remove(item.id)}
                        >
                          <IconTrash width={15} height={15} />
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
