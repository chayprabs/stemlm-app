/**
 * Saved-questions library: search + time in a top toolbar, a scrolling category
 * rail, and question cards with download / open actions. "Merge PDF" turns the
 * list into a picker and combines the picked questions into one continuous PDF.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  deleteSavedSession,
  downloadSavedSessionPdf,
  downloadSavedSessionsPdf,
  getSavedSessions,
  openSavedSessionPdf,
  type SavedSessionSnapshot,
} from '@/src/lib/saved-sessions';
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
import {
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconLayers,
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
  value,
  onChange,
}: {
  subjects: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

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
    rail.scrollBy({ left: direction * Math.max(120, rail.clientWidth * 0.7), behavior: 'smooth' });
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
  const [subject, setSubject] = useState(ALL_SAVED_SUBJECTS);
  const [time, setTime] = useState<SavedTimeFilter>(ALL_SAVED_TIME);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState<RenderProgress | null>(null);

  useEffect(() => {
    setItems(sessions);
  }, [sessions]);

  const subjects = useMemo(() => savedSessionSubjects(items), [items]);
  const visible = useMemo(
    () => filterSavedSessions(items, { query, subject, time }),
    [items, query, subject, time],
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

  return (
    <section className="slm-library-main" aria-label="Saved questions">
      <div className="slm-library-toolbar-row">
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

        {items.length > 0 &&
          (picking ? (
            <div className="slm-library-merge-actions">
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
            </div>
          ) : (
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
          ))}
      </div>

      {items.length > 0 && (
        <CategoryRail subjects={subjects} value={subject} onChange={setSubject} />
      )}

      {error && (
        <p className="slm-popup-error" role="status">
          {error.message}
          {error.detail && <span className="slm-popup-error-detail">{error.detail}</span>}
        </p>
      )}

      <div className="slm-library-feed" data-picking={picking ? 'true' : undefined}>
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
                    <span className="slm-library-row-meta">{subjectLabel}</span>
                  </span>
                  {!picking && (
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
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
