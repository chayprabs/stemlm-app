/**
 * Saved-questions library: a search field with a time filter and the merge action, a scrolling
 * row of subject chips, and one ruled row per saved question with download / open / delete.
 * "Merge PDF" turns the list into a picker and combines the picked questions into one PDF.
 * A delete takes effect at once and can be undone from the bar it leaves at the foot of the list.
 */
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  deleteSavedSession,
  getSavedSessions,
  restoreSavedSession,
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
import { moveFocus } from './move-focus';

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

/** How long "Saved to Downloads" stays on a row after its PDF is written. */
const DOWNLOADED_NOTE_MS = 2_400;

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

  /** Closing from the keyboard hands focus back to the control: the option that held it is gone. */
  function close() {
    setOpen(false);
    btnRef.current?.focus();
  }

  // The menu opens with the current choice focused, so the arrow keys start from it.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      close();
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
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' || open) return;
          e.preventDefault();
          setOpen(true);
        }}
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
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              close();
              return;
            }
            moveFocus(e, [...e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')], 'ArrowUp', 'ArrowDown');
          }}
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
                    close();
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
      <div
        className="slm-library-chips"
        ref={railRef}
        role="group"
        aria-label="Categories"
        onKeyDown={(e) =>
          moveFocus(e, [...e.currentTarget.querySelectorAll<HTMLElement>('.slm-library-chip')], 'ArrowLeft', 'ArrowRight')}
      >
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
  // One PDF is built at a time: rendering is heavy, and two at once only make both slower.
  const [building, setBuilding] = useState<{ id: string; progress: RenderProgress | null } | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  // Deleted since the bar last cleared, kept whole so Undo puts each one back exactly as it was.
  const [removed, setRemoved] = useState<readonly SavedSessionSnapshot[]>([]);
  // What just happened, for assistive technology: the list itself only shows the result.
  const [announcement, setAnnouncement] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  /** The row whose Delete button takes focus once the list has redrawn; '' means the Undo button. */
  const focusAfter = useRef<string | null>(null);
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

  // Page-wide keys. The handler reads the latest state through a ref, so it is bound once.
  const onPageKey = useRef<(event: KeyboardEvent) => void>(() => undefined);
  onPageKey.current = (event) => {
    if (event.defaultPrevented) return;
    // Escape leaves the merge picker before it is allowed to close the library.
    if (event.key === 'Escape' && picking && !merging) {
      event.preventDefault();
      stopPicking();
      return;
    }
    if (event.altKey || isTypingTarget(event)) return;
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z' && removed.length > 0) {
      event.preventDefault();
      void undoRemove();
      return;
    }
    // "/" jumps to search from anywhere on the page, the way it does in most libraries.
    if (event.key !== '/' || event.ctrlKey || event.metaKey) return;
    const input = searchRef.current;
    if (!input) return;
    event.preventDefault();
    input.focus();
    input.select();
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => onPageKey.current(event);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!downloadedId) return;
    const timer = setTimeout(() => setDownloadedId(null), DOWNLOADED_NOTE_MS);
    return () => clearTimeout(timer);
  }, [downloadedId]);

  // After a delete or an undo the control that was pressed is gone. Focus goes to the row that
  // took its place, or to Undo when the list is empty, instead of falling back to the document.
  useLayoutEffect(() => {
    const id = focusAfter.current;
    if (id === null) return;
    focusAfter.current = null;
    const row = id
      ? [...(feedRef.current?.querySelectorAll<HTMLElement>('.slm-library-row') ?? [])].find((el) => el.dataset.id === id)
      : undefined;
    (row?.querySelector<HTMLElement>('[data-action="delete"]') ?? undoRef.current)?.focus();
  }, [items]);

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

  function fail(result: PdfExportResult, fallback: string, merged: boolean) {
    setError({
      message: result.reason ? pdfFailureMessage(result.reason, merged) : fallback,
      detail: result.detail,
    });
  }

  async function download(id: string) {
    if (building || merging) return;
    setError(null);
    setDownloadedId(null);
    setBuilding({ id, progress: null });
    try {
      const result = await downloadSavedSessionPdf(id, {
        onProgress: (next) => setBuilding({ id, progress: next }),
      });
      if (!result.ok) {
        fail(result, 'Could not build the PDF. Try again.', false);
        return;
      }
      onDownloaded?.();
      setDownloadedId(id);
      setAnnouncement('PDF saved to your Downloads folder.');
    } catch {
      setError({ message: 'Could not build the PDF. Try again.' });
    } finally {
      setBuilding(null);
    }
  }

  async function open(id: string) {
    setError(null);
    try {
      const result = await openSavedSessionPdf(id);
      if (!result.ok) setError({ message: 'Could not open that saved answer. Try again.' });
    } catch {
      setError({ message: 'Could not open that saved answer. Try again.' });
    }
  }

  async function remove(id: string) {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    setError(null);
    // Focus follows the list: the row below takes the deleted row's place, else the row above.
    const at = visible.findIndex((item) => item.id === id);
    const neighbour = visible[at + 1] ?? visible[at - 1];
    try {
      await deleteSavedSession(id);
      const next = await getSavedSessions();
      focusAfter.current = neighbour?.id ?? '';
      setItems(next);
      setPicked((prev) => prev.filter((pickedId) => pickedId !== id));
      setRemoved((prev) => [...prev, target]);
      setAnnouncement(`${plural(removed.length + 1, 'question', 'questions')} deleted. Undo is available.`);
      onSessionsChange?.(next);
    } catch {
      setError({ message: 'Could not delete that question. Try again.' });
    }
  }

  async function undoRemove() {
    if (removed.length === 0) return;
    setError(null);
    try {
      for (const snapshot of removed) await restoreSavedSession(snapshot);
      const next = await getSavedSessions();
      focusAfter.current = removed[removed.length - 1]?.id ?? null;
      setItems(next);
      setAnnouncement(`${plural(removed.length, 'question', 'questions')} restored.`);
      setRemoved([]);
      onSessionsChange?.(next);
    } catch {
      setError({ message: 'Could not bring that question back. Try again.' });
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
    if (pickedIds.length === 0 || merging || building) return;
    setError(null);
    setMerging(true);
    setProgress(null);
    try {
      const result = await downloadSavedSessionsPdf(pickedIds, {
        onProgress: setProgress,
      });
      if (!result.ok) {
        fail(result, 'Could not build the merged PDF. Try again.', true);
        return;
      }
      onDownloaded?.();
      setAnnouncement('Merged PDF saved to your Downloads folder.');
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
        <p className="slm-popup-error" role="alert">
          {error.message}
          {error.detail && <span className="slm-popup-error-detail">{error.detail}</span>}
        </p>
      )}

      <div className="slm-library-feed" ref={feedRef} data-picking={picking ? 'true' : undefined}>
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
                // A record with neither a question nor a topic still needs a name to act on.
                const question = savedSessionQuestion(item) || 'Untitled question';
                const subjectLabel = savedSessionSubject(item);
                const host = CHAT_HOST_LAUNCH.find((entry) => entry.id === item.platform);
                const stepCount = Array.isArray(item.steps) ? item.steps.length : 0;
                const chosen = pickedSet.has(item.id);
                const pdfBusy = building !== null || merging;
                // While its PDF is being built, and briefly after, the row says so where its date was.
                const note =
                  building?.id === item.id
                    ? building.progress
                      ? `Building PDF, page ${building.progress.page} of ${building.progress.total}`
                      : 'Building PDF'
                    : downloadedId === item.id
                      ? 'Saved to Downloads'
                      : null;
                return (
                  <li
                    key={item.id}
                    className="slm-library-row slm-saved-item"
                    data-id={item.id}
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
                    {/* The question opens its saved answer, as the Open button does for the keyboard.
                        A click that ends a text selection, or the second of a double click, does not. */}
                    <span
                      className="slm-library-row-copy"
                      onClick={picking ? undefined : (e) => {
                        if (e.detail > 1 || window.getSelection()?.toString()) return;
                        void open(item.id);
                      }}
                    >
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
                        {note ? (
                          <span className="slm-library-row-note">{note}</span>
                        ) : (
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
                          title={pdfBusy ? 'Another PDF is being built' : 'Download'}
                          aria-label={`Download PDF for ${question}`}
                          aria-busy={building?.id === item.id}
                          disabled={pdfBusy}
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
                          onClick={(e) => {
                            if (e.detail <= 1) void open(item.id);
                          }}
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
                          // The list closes up under the pointer and focus moves to the next row, so
                          // the second click of a double click, or a held key, would delete that one too.
                          onKeyDown={(e) => {
                            if (e.repeat) e.preventDefault();
                          }}
                          onClick={(e) => {
                            if (e.detail <= 1) void remove(item.id);
                          }}
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

      {removed.length > 0 && (
        <div className="slm-library-undo" role="group" aria-label="Deleted questions">
          <p className="slm-library-undo-text">{plural(removed.length, 'question', 'questions')} deleted</p>
          <button
            ref={undoRef}
            type="button"
            className="slm-library-merge-quiet slm-library-undo-btn"
            data-library="undo"
            aria-keyshortcuts="Control+Z"
            onClick={() => void undoRemove()}
          >
            Undo
          </button>
          <button
            type="button"
            className="slm-library-undo-dismiss"
            data-library="undo-dismiss"
            aria-label="Dismiss"
            title="Dismiss"
            onClick={() => setRemoved([])}
          >
            <IconClose width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="slm-sr-only" role="status" aria-live="polite">{announcement}</p>
    </section>
  );
}
