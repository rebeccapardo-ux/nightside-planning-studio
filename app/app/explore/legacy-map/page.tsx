"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Breadcrumbs from "@/app/components/navigation/Breadcrumbs";

// ─── Colors ──────────────────────────────────────────────────────────────────

const COLORS = {
  midnight: "#130426",
  night:    "#2C3777",
  dusk:     "#BBABF4",
  sunset:   "#DB5835",
  sunrise:  "#F29836",
  light:    "#F8F4EB",
};

// ─── Path geometry ────────────────────────────────────────────────────────────

const VB_W = 1000;
const VB_H = 380;
const PATH_MID_Y = 190;
const PATH_AMP_Y = 90;

function getPathPoint(xPercent: number): { x: number; y: number } {
  const t = (clamp(xPercent, 5, 95) - 5) / 90;
  const x = 50 + t * 900;
  const y = PATH_MID_Y + PATH_AMP_Y * Math.sin(t * 2 * Math.PI);
  return { x, y };
}

const SERPENTINE_D = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const x = 50 + t * 900;
    const y = PATH_MID_Y + PATH_AMP_Y * Math.sin(t * 2 * Math.PI);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${pts.join(" L ")}`;
})();

// ─── Placeholder ghost moments ────────────────────────────────────────────────

const PLACEHOLDER_MOMENTS = [
  { id: "ph-1", xPercent: 10 },
  { id: "ph-2", xPercent: 27 },
  { id: "ph-3", xPercent: 45 },
  { id: "ph-4", xPercent: 62 },
  { id: "ph-5", xPercent: 80 },
];


// ─── Types ────────────────────────────────────────────────────────────────────

type LegacyMoment = {
  id: string;
  title: string;
  note: string;
  xPercent: number;
};

type LegacyMapState = {
  moments: LegacyMoment[];
  themes: string;
  surprises: string;
  valuesToPassOn: string;
  legacyProjects: string;
  updatedAt: string | null;
};

type DraftMoment = {
  id: string | null;
  title: string;
  note: string;
  xPercent: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "nightside-legacy-map-v4";
const ENTRY_ID_KEY = "nightside-legacy-map-entry-id";
const LABEL_OFFSET = 34;       // px from circle center to label edge
const LABEL_TRUNCATE = 20;     // truncate labels longer than this on map
const CLOSE_THRESHOLD = 13;    // xPercent difference below which labels may collide

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `moment-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function truncateLabel(title: string): string {
  return title.length > LABEL_TRUNCATE ? `${title.slice(0, LABEL_TRUNCATE)}…` : title;
}

function computeLabelSides(moments: LegacyMoment[]): Map<string, boolean> {
  const sorted = [...moments].sort((a, b) => a.xPercent - b.xPercent);
  const result = new Map<string, boolean>();

  sorted.forEach((m, i) => {
    const pt = getPathPoint(m.xPercent);
    let above = pt.y > PATH_MID_Y;

    if (i > 0) {
      const prev = sorted[i - 1];
      const prevAbove = result.get(prev.id) ?? true;
      const xDiff = m.xPercent - prev.xPercent;
      if (xDiff < CLOSE_THRESHOLD && prevAbove === above) {
        above = !above;
      }
    }

    result.set(m.id, above);
  });

  return result;
}

function getNextMomentX(moments: LegacyMoment[]): number {
  const sorted = [...moments].sort((a, b) => a.xPercent - b.xPercent);
  const positions = [5, ...sorted.map((m) => m.xPercent), 95];
  let maxGap = 0;
  let midpoint = 50;
  for (let i = 0; i < positions.length - 1; i++) {
    const gap = positions[i + 1] - positions[i];
    if (gap > maxGap) {
      maxGap = gap;
      midpoint = (positions[i] + positions[i + 1]) / 2;
    }
  }
  return clamp(midpoint, 5, 95);
}

const DEFAULT_STATE: LegacyMapState = {
  moments: [],
  themes: "",
  surprises: "",
  valuesToPassOn: "",
  legacyProjects: "",
  updatedAt: null,
};

const hv = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ─── Component ────────────────────────────────────────────────────────────────

export default function LegacyMapPage() {
  const [state, setState] = useState<LegacyMapState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto-save (for drag/moment position changes)
  const [dirtyCount, setDirtyCount] = useState(0);
  const [savedVisible, setSavedVisible] = useState(false);
  const stateRef = useRef<LegacyMapState>(DEFAULT_STATE);
  const saveClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  stateRef.current = state;

  // Interaction
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftMoment, setDraftMoment] = useState<DraftMoment | null>(null);
  const [momentSaveError, setMomentSaveError] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const pathContainerRef = useRef<HTMLDivElement | null>(null);
  const didDragRef = useRef(false);

  // Tooltip
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const touchModeRef = useRef(false);

  // Supabase entry ID
  const [supabaseEntryId, setSupabaseEntryId] = useState<string | null>(null);
  const supabaseEntryIdRef = useRef<string | null>(null);
  supabaseEntryIdRef.current = supabaseEntryId;

  // Placeholder tracking
  const [hiddenPlaceholderIds, setHiddenPlaceholderIds] = useState<Set<string>>(new Set());
  const openedFromPlaceholderIdRef = useRef<string | null>(null);

  // Reflection gate
  const [reflectionMounted, setReflectionMounted] = useState(false);
  const [reflectionVisible, setReflectionVisible] = useState(false);

  // Reflection save status
  const [reflectionSaveStatus, setReflectionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [reflectionLastSaved, setReflectionLastSaved] = useState<Date | null>(null);
  const [reflectionStatusNow, setReflectionStatusNow] = useState(Date.now());
  const reflectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const realMoments = useMemo(() => state.moments, [state.moments]);
  const labelSides = useMemo(() => computeLabelSides(realMoments), [realMoments]);

  // ── Load from localStorage + resolve Supabase entry ID ─────────────────────

  useEffect(() => {
    async function init() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<LegacyMapState>;
          const nextState: LegacyMapState = {
            moments: Array.isArray(parsed.moments)
              ? parsed.moments
                  .filter((m) => !String(m.title || "").startsWith("Example:"))
                  .map((m) => ({
                    id: m.id || createId(),
                    title: m.title || "",
                    note: m.note || "",
                    xPercent: typeof m.xPercent === "number" ? clamp(m.xPercent, 5, 95) : 50,
                  }))
              : [],
            themes: parsed.themes || "",
            surprises: parsed.surprises || "",
            valuesToPassOn: parsed.valuesToPassOn || "",
            legacyProjects: parsed.legacyProjects || "",
            updatedAt: parsed.updatedAt || null,
          };
          setState(nextState);
          stateRef.current = nextState;
        }
      } catch {
        // silently ignore
      }

      try {
        const stored = window.localStorage.getItem(ENTRY_ID_KEY);
        if (stored) {
          setSupabaseEntryId(stored);
          supabaseEntryIdRef.current = stored;
        } else {
          const supabase = createSupabaseBrowserClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from("entries")
              .select("id")
              .eq("user_id", user.id)
              .eq("activity", "legacy_map")
              .order("created_at", { ascending: false })
              .limit(1);
            if (data?.[0]?.id) {
              window.localStorage.setItem(ENTRY_ID_KEY, data[0].id);
              setSupabaseEntryId(data[0].id);
              supabaseEntryIdRef.current = data[0].id;
            }
          }
        }
      } catch {
        // silently ignore
      }

      setIsLoaded(true);
    }
    init();
  }, []);

  // ── Auto-save (drag / position changes only) ─────────────────────────────────

  useEffect(() => {
    if (dirtyCount === 0 || !isLoaded) return;
    const timer = setTimeout(async () => {
      const toSave = { ...stateRef.current, updatedAt: new Date().toISOString() };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        setState(toSave);
        stateRef.current = toSave;
        setSavedVisible(true);
        if (saveClearRef.current) clearTimeout(saveClearRef.current);
        saveClearRef.current = setTimeout(() => setSavedVisible(false), 2200);
      } catch {
        // ignore storage errors
      }
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const content = {
            moments: toSave.moments,
            themes: toSave.themes,
            surprises: toSave.surprises,
            valuesToPassOn: toSave.valuesToPassOn,
            legacyProjects: toSave.legacyProjects,
            updatedAt: toSave.updatedAt,
          };
          if (supabaseEntryIdRef.current) {
            await supabase.from("entries")
              .update({ content, title: "Legacy Map" })
              .eq("id", supabaseEntryIdRef.current);
          } else {
            const { data: created } = await supabase.from("entries")
              .insert({ user_id: user.id, title: "Legacy Map", section: "explore", activity: "legacy_map", content })
              .select("id")
              .single();
            if (created?.id) {
              window.localStorage.setItem(ENTRY_ID_KEY, created.id);
              setSupabaseEntryId(created.id);
              supabaseEntryIdRef.current = created.id;
            }
          }
        }
      } catch {
        // silently ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [dirtyCount, isLoaded]);

  // ── Reflection gate ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (realMoments.length >= 3 && !reflectionMounted) {
      setReflectionMounted(true);
      setTimeout(() => setReflectionVisible(true), 80);
    }
  }, [realMoments.length, reflectionMounted]);

  // ── Reflection status clock ─────────────────────────────────────────────────

  useEffect(() => {
    if (!reflectionLastSaved) return;
    const interval = setInterval(() => setReflectionStatusNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [reflectionLastSaved]);

  // ── Drag cleanup ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!draggingId) return;
    function handlePointerUp() { setDraggingId(null); }
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [draggingId]);

  // ── State helpers ───────────────────────────────────────────────────────────

  function markChanged(
    next: LegacyMapState | ((current: LegacyMapState) => LegacyMapState)
  ) {
    setState((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      return { ...resolved, updatedAt: current.updatedAt };
    });
    setDirtyCount((c) => c + 1);
  }

  // ── Supabase persistence helpers ────────────────────────────────────────────

  async function persistStateToSupabase(stateToSave: LegacyMapState) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const content = {
        moments: stateToSave.moments,
        themes: stateToSave.themes,
        surprises: stateToSave.surprises,
        valuesToPassOn: stateToSave.valuesToPassOn,
        legacyProjects: stateToSave.legacyProjects,
        updatedAt: stateToSave.updatedAt,
      };

      if (supabaseEntryIdRef.current) {
        await supabase.from("entries")
          .update({ content, title: "Legacy Map" })
          .eq("id", supabaseEntryIdRef.current);
      } else {
        const { data: created } = await supabase.from("entries")
          .insert({ user_id: user.id, title: "Legacy Map", section: "explore", activity: "legacy_map", content })
          .select("id").single();
        if (created?.id) {
          window.localStorage.setItem(ENTRY_ID_KEY, created.id);
          setSupabaseEntryId(created.id);
          supabaseEntryIdRef.current = created.id;
        }
      }
    } catch {
      // silently ignore
    }
  }

  async function saveReflectionToSupabase() {
    const current = stateRef.current;
    const toSave = { ...current, updatedAt: new Date().toISOString() };

    // Update localStorage
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setState(toSave);
      stateRef.current = toSave;
    } catch { /* ignore */ }

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setReflectionSaveStatus('error'); return; }

      const content = {
        moments: toSave.moments,
        themes: toSave.themes,
        surprises: toSave.surprises,
        valuesToPassOn: toSave.valuesToPassOn,
        legacyProjects: toSave.legacyProjects,
        updatedAt: toSave.updatedAt,
      };

      if (supabaseEntryIdRef.current) {
        await supabase.from("entries")
          .update({ content, title: "Legacy Map" })
          .eq("id", supabaseEntryIdRef.current);
      } else {
        const { data: created } = await supabase.from("entries")
          .insert({ user_id: user.id, title: "Legacy Map", section: "explore", activity: "legacy_map", content })
          .select("id").single();
        if (created?.id) {
          window.localStorage.setItem(ENTRY_ID_KEY, created.id);
          setSupabaseEntryId(created.id);
          supabaseEntryIdRef.current = created.id;
        }
      }

      const savedAt = new Date();
      setReflectionLastSaved(savedAt);
      setReflectionStatusNow(savedAt.getTime());
      setReflectionSaveStatus('saved');
    } catch {
      setReflectionSaveStatus('error');
    }
  }

  // ── Reflection field handlers ───────────────────────────────────────────────

  function handleReflectionChange(
    field: keyof Pick<LegacyMapState, 'themes' | 'surprises' | 'valuesToPassOn' | 'legacyProjects'>,
    value: string
  ) {
    const next = { ...stateRef.current, [field]: value };
    setState(next);
    stateRef.current = next;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }

    setReflectionSaveStatus('saving');
    if (reflectionDebounceRef.current) clearTimeout(reflectionDebounceRef.current);
    reflectionDebounceRef.current = setTimeout(() => saveReflectionToSupabase(), 1500);
  }

  function handleReflectionBlur() {
    if (reflectionDebounceRef.current) {
      clearTimeout(reflectionDebounceRef.current);
      reflectionDebounceRef.current = null;
    }
    if (reflectionSaveStatus === 'saving') {
      saveReflectionToSupabase();
    }
  }

  function getReflectionStatusText(): string {
    if (reflectionSaveStatus === 'saving') return 'Saving…';
    if (reflectionSaveStatus === 'error') return "Couldn't save — check your connection";
    if (reflectionSaveStatus === 'saved' && reflectionLastSaved) {
      const diffMs = Math.max(reflectionStatusNow - reflectionLastSaved.getTime(), 0);
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffSeconds < 60) return 'Last saved just now';
      if (diffMinutes < 60) return `Last saved ${diffMinutes} min ago`;
      if (diffHours < 24) return diffHours === 1 ? 'Last saved 1 hour ago' : `Last saved ${diffHours} hours ago`;
      if (diffDays < 7) return diffDays === 1 ? 'Last saved 1 day ago' : `Last saved ${diffDays} days ago`;
      return diffWeeks === 1 ? 'Last saved 1 week ago' : `Last saved ${diffWeeks} weeks ago`;
    }
    return '';
  }

  // ── Modal helpers ───────────────────────────────────────────────────────────

  function openCreateModal(xPercent: number, placeholderId?: string) {
    setSelectedId(null);
    setDraftMoment({ id: null, title: "", note: "", xPercent: clamp(xPercent, 5, 95) });
    openedFromPlaceholderIdRef.current = placeholderId ?? null;
    setMomentSaveError(false);
    setIsModalOpen(true);
  }

  function openEditModal(moment: LegacyMoment) {
    setSelectedId(moment.id);
    setDraftMoment({ id: moment.id, title: moment.title, note: moment.note, xPercent: moment.xPercent });
    openedFromPlaceholderIdRef.current = null;
    setTooltipId(null);
    setMomentSaveError(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setDraftMoment(null);
    setMomentSaveError(false);
    openedFromPlaceholderIdRef.current = null;
  }

  function handleSaveMoment() {
    if (!draftMoment) return;
    const cleanTitle = draftMoment.title.trim();
    if (!cleanTitle) return;

    let nextMoments: LegacyMoment[];
    let nextSelectedId: string | null = selectedId;

    if (draftMoment.id) {
      nextMoments = stateRef.current.moments.map((m) =>
        m.id === draftMoment.id
          ? { ...m, title: cleanTitle, note: draftMoment.note.trim(), xPercent: clamp(draftMoment.xPercent, 5, 95) }
          : m
      );
      nextSelectedId = draftMoment.id;
    } else {
      const nextId = createId();
      nextMoments = [
        ...stateRef.current.moments,
        { id: nextId, title: cleanTitle, note: draftMoment.note.trim(), xPercent: clamp(draftMoment.xPercent, 5, 95) },
      ];
      nextSelectedId = nextId;
      if (openedFromPlaceholderIdRef.current) {
        setHiddenPlaceholderIds((prev) => new Set([...prev, openedFromPlaceholderIdRef.current!]));
      }
    }

    const nextState: LegacyMapState = {
      ...stateRef.current,
      moments: nextMoments,
      updatedAt: new Date().toISOString(),
    };

    // Update local state and localStorage immediately
    setState(nextState);
    stateRef.current = nextState;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)); } catch { /* ignore */ }

    setSelectedId(nextSelectedId);

    // Persist to Supabase immediately (fire-and-forget; errors are silent)
    persistStateToSupabase(nextState);

    closeModal();
  }

  function handleDeleteSelected() {
    if (!draftMoment?.id) return;
    const nextState: LegacyMapState = {
      ...stateRef.current,
      moments: stateRef.current.moments.filter((m) => m.id !== draftMoment.id),
      updatedAt: new Date().toISOString(),
    };
    setState(nextState);
    stateRef.current = nextState;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)); } catch { /* ignore */ }
    setSelectedId((current) => (current === draftMoment.id ? null : current));
    persistStateToSupabase(nextState);
    closeModal();
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  function getXPercentFromClientX(clientX: number) {
    const el = pathContainerRef.current;
    if (!el) return 50;
    const rect = el.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rect.width) * 100, 5, 95);
  }

  function handleDragStart(event: React.PointerEvent<HTMLButtonElement>, momentId: string) {
    event.preventDefault();
    event.stopPropagation();
    touchModeRef.current = event.pointerType === "touch";
    didDragRef.current = false;
    setDraggingId(momentId);
    setSelectedId(momentId);
    setTooltipId(null);
  }

  function handleContainerPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingId) return;
    didDragRef.current = true;
    const xPercent = getXPercentFromClientX(event.clientX);
    markChanged((current) => ({
      ...current,
      moments: current.moments.map((m) =>
        m.id === draggingId ? { ...m, xPercent } : m
      ),
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen px-5 py-6 md:px-8 md:py-8 lg:px-10"
      style={{ backgroundColor: COLORS.midnight, color: "#FFFFFF" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">

        <div style={{ marginBottom: 8 }}>
          <Breadcrumbs
            theme="navy"
            items={[
              { label: 'Explore', href: '/app/explore' },
              { label: 'Legacy Map' },
            ]}
          />
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <section
          className="rounded-[28px] border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:p-8"
          style={{
            background: `linear-gradient(135deg, ${COLORS.night} 0%, ${COLORS.midnight} 100%)`,
            borderColor: "rgba(187,171,244,0.22)",
          }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-medium tracking-[-0.02em] md:text-4xl">
                Legacy Map
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 md:text-base" style={{ color: "rgba(255,255,255,0.78)" }}>
                Think about 5–10 important moments in your life: experiences that shaped you, challenges, or turning points.
                They don't have to be dramatic or significant by anyone else's measure.
              </p>
              <ul className="mt-3 max-w-2xl space-y-1 text-sm" style={{ color: "rgba(255,255,255,0.68)" }}>
                <li>Click any circle to add a moment and optional notes</li>
                <li>Drag moments along the path to reorder them</li>
                <li>Find your map in <Link href="/app/materials" style={{ color: "rgba(255,255,255,0.88)", textDecoration: "underline" }}>Your Plan</Link> to review and revise</li>
              </ul>
            </div>

          </div>
        </section>

        {/* ── Map ────────────────────────────────────────────────────────── */}
        <section
          className="rounded-[28px] border p-4 md:p-6"
          style={{
            backgroundColor: COLORS.light,
            color: COLORS.midnight,
            borderColor: "rgba(44,55,119,0.12)",
          }}
        >
          <div
            ref={pathContainerRef}
            className="relative w-full select-none rounded-[20px] overflow-hidden"
            style={{
              height: "360px",
              background: "linear-gradient(180deg, rgba(187,171,244,0.14) 0%, rgba(248,244,235,1) 100%)",
              border: "1px solid rgba(44,55,119,0.10)",
              cursor: draggingId ? "grabbing" : "default",
            }}
            onPointerMove={handleContainerPointerMove}
            onClick={() => setTooltipId(null)}
          >
            {/* SVG serpentine path */}
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor={COLORS.dusk}    stopOpacity="0.7" />
                  <stop offset="50%"  stopColor={COLORS.sunrise} stopOpacity="0.8" />
                  <stop offset="100%"  stopColor={COLORS.sunset}  stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d={SERPENTINE_D}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* "Birth" label */}
            <div
              className="absolute pointer-events-none select-none"
              style={{
                left: "10px",
                bottom: "44px",
                color: COLORS.night,
                opacity: 0.90,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                backgroundColor: "rgba(44,55,119,0.10)",
                border: "1px solid rgba(44,55,119,0.22)",
                borderRadius: "20px",
                padding: "3px 9px",
              }}
            >
              Birth
            </div>

            {/* "Now" label */}
            <div
              className="absolute pointer-events-none select-none"
              style={{
                right: "10px",
                bottom: "44px",
                color: COLORS.night,
                opacity: 0.90,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                backgroundColor: "rgba(44,55,119,0.10)",
                border: "1px solid rgba(44,55,119,0.22)",
                borderRadius: "20px",
                padding: "3px 9px",
              }}
            >
              Now
            </div>

            {/* Placeholder ghost nodes */}
            {PLACEHOLDER_MOMENTS.filter((ph) => !hiddenPlaceholderIds.has(ph.id)).map((ph) => {
              const pt = getPathPoint(ph.xPercent);
              return (
                <button
                  key={ph.id}
                  type="button"
                  aria-label="Add a moment"
                  onClick={() => openCreateModal(ph.xPercent, ph.id)}
                  className="absolute z-10 rounded-full transition-transform duration-150 hover:scale-110"
                  style={{
                    left: `${(pt.x / VB_W) * 100}%`,
                    top: `${(pt.y / VB_H) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: "28px",
                    height: "28px",
                    backgroundColor: "rgba(248,244,235,0.75)",
                    border: "2.5px dashed rgba(44,55,119,0.70)",
                    opacity: 0.72,
                    cursor: "pointer",
                  }}
                />
              );
            })}

            {/* Real moment nodes */}
            {state.moments.map((moment) => {
              const isSelected = selectedId === moment.id;
              const isDragging = draggingId === moment.id;
              const pt = getPathPoint(moment.xPercent);
              const above = labelSides.get(moment.id) ?? (pt.y > PATH_MID_Y);
              const displayTitle = truncateLabel(moment.title);
              const isTruncated = displayTitle !== moment.title;
              const isTooltipOpen = tooltipId === moment.id && !draggingId;

              const tooltipAbove = (pt.y / VB_H) > 0.38;
              const xFrac = pt.x / VB_W;
              const tooltipHAlign: React.CSSProperties =
                xFrac < 0.28
                  ? { left: "-8px", transform: "none" }
                  : xFrac > 0.72
                  ? { right: "-8px", transform: "none" }
                  : { left: "50%", transform: "translateX(-50%)" };

              return (
                <div
                  key={moment.id}
                  data-moment="true"
                  className="absolute z-20"
                  style={{
                    left: `${(pt.x / VB_W) * 100}%`,
                    top: `${(pt.y / VB_H) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseEnter={() => { if (!draggingId) setTooltipId(moment.id); }}
                  onMouseLeave={() => setTooltipId((prev) => prev === moment.id ? null : prev)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Tooltip card */}
                  {isTooltipOpen && (
                    <button
                      type="button"
                      className="absolute z-40 text-left w-full"
                      style={{
                        ...(tooltipAbove ? { bottom: "46px" } : { top: "46px" }),
                        ...tooltipHAlign,
                        width: "268px",
                        backgroundColor: COLORS.light,
                        borderRadius: "16px",
                        border: "1px solid rgba(44,55,119,0.13)",
                        boxShadow: "0 8px 32px rgba(19,4,38,0.20), 0 2px 8px rgba(19,4,38,0.10)",
                        padding: "14px 16px 14px",
                        cursor: "pointer",
                      }}
                      onClick={(e) => { e.stopPropagation(); openEditModal(moment); }}
                      onMouseEnter={() => setTooltipId(moment.id)}
                      onMouseLeave={() => setTooltipId(null)}
                    >
                      <p style={{ fontWeight: 700, fontSize: "13px", color: COLORS.midnight, marginBottom: moment.note ? "8px" : 0, lineHeight: "1.3" }}>
                        {moment.title}
                      </p>
                      {moment.note && (
                        <div
                          style={{
                            maxHeight: "120px",
                            overflowY: "auto",
                            fontSize: "12px",
                            lineHeight: "1.55",
                            color: "rgba(19,4,38,0.72)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {moment.note}
                        </div>
                      )}
                    </button>
                  )}

                  {/* Label */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{
                      ...(above ? { bottom: `${LABEL_OFFSET}px` } : { top: `${LABEL_OFFSET}px` }),
                      width: "max-content",
                      maxWidth: 180,
                    }}
                  >
                    <button
                      type="button"
                      title={isTruncated ? moment.title : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (touchModeRef.current) {
                          setTooltipId((prev) => prev === moment.id ? null : moment.id);
                        } else {
                          openEditModal(moment);
                        }
                      }}
                      className="rounded-full border px-3 py-1.5 text-sm leading-none shadow-sm transition"
                      style={{
                        backgroundColor: isSelected ? "rgba(242,152,54,0.14)" : "rgba(248,244,235,0.96)",
                        borderColor: isSelected ? "rgba(219,88,53,0.38)" : "rgba(44,55,119,0.16)",
                        color: COLORS.midnight,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayTitle}
                    </button>
                  </div>

                  {/* Connector tick */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-px"
                    style={{
                      ...(above ? { bottom: "22px", height: "12px" } : { top: "22px", height: "12px" }),
                      backgroundColor: "rgba(44,55,119,0.28)",
                    }}
                  />

                  {/* Draggable circle */}
                  <button
                    type="button"
                    data-moment="true"
                    aria-label={`Preview or drag ${moment.title}`}
                    onPointerDown={(e) => handleDragStart(e, moment.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (didDragRef.current) { didDragRef.current = false; return; }
                      if (touchModeRef.current) {
                        setTooltipId((prev) => prev === moment.id ? null : moment.id);
                      } else {
                        openEditModal(moment);
                      }
                    }}
                    className="relative h-7 w-7 rounded-full border-[3px] transition-transform duration-150"
                    style={{
                      backgroundColor: isSelected ? COLORS.sunset : COLORS.light,
                      borderColor: isSelected ? COLORS.sunset : COLORS.night,
                      boxShadow: isDragging
                        ? "0 0 0 12px rgba(219,88,53,0.14)"
                        : isSelected
                        ? "0 0 0 8px rgba(219,88,53,0.12)"
                        : "0 6px 16px rgba(19,4,38,0.14)",
                      transform: isDragging ? "scale(1.1)" : "scale(1)",
                      cursor: isDragging ? "grabbing" : "grab",
                    }}
                  />
                </div>
              );
            })}

            {/* "Add moment" button — canvas bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
              <button
                type="button"
                onClick={() => openCreateModal(getNextMomentX(state.moments))}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform duration-150 hover:-translate-y-[1px]"
                style={{
                  backgroundColor: COLORS.sunrise,
                  color: COLORS.midnight,
                  boxShadow: "0 4px 18px rgba(242,152,54,0.40)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    border: `2px solid ${COLORS.midnight}`,
                    flexShrink: 0,
                  }}
                />
                Add moment
              </button>
            </div>
          </div>
        </section>

        {/* ── Reflection (gated at 3 moments) ────────────────────────────── */}
        {reflectionMounted && (
          <section
            className="rounded-[28px] border p-6 md:p-8"
            style={{
              backgroundColor: COLORS.light,
              color: COLORS.midnight,
              borderColor: "rgba(44,55,119,0.12)",
              opacity: reflectionVisible ? 1 : 0,
              transform: reflectionVisible ? "none" : "translateY(24px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <h2 className="text-xl font-medium tracking-[-0.01em]">
                Now step back and look at the whole picture.
              </h2>
              {getReflectionStatusText() && (
                <p style={{ fontSize: 13, fontFamily: hv, color: "rgba(26,26,26,0.72)", flexShrink: 0, margin: 0 }}>
                  {getReflectionStatusText()}
                </p>
              )}
            </div>
            <p className="max-w-3xl text-sm leading-6" style={{ color: "rgba(19,4,38,0.68)" }}>
              With a few moments on the map, patterns sometimes start to emerge. Take your time with these questions — there are no right answers.
            </p>

            <div className="mt-6 grid gap-5">
              <PromptField
                label="What themes stand out?"
                value={state.themes}
                onChange={(v) => handleReflectionChange('themes', v)}
                onBlur={handleReflectionBlur}
                placeholder="What patterns, repeated concerns, commitments, relationships, or turning points show up?"
              />
              <PromptField
                label="Are there any surprises or realizations?"
                value={state.surprises}
                onChange={(v) => handleReflectionChange('surprises', v)}
                onBlur={handleReflectionBlur}
                placeholder="What became clearer as you looked across these moments?"
              />
              <PromptField
                label="What values or traditions do you want to pass on?"
                value={state.valuesToPassOn}
                onChange={(v) => handleReflectionChange('valuesToPassOn', v)}
                onBlur={handleReflectionBlur}
                placeholder="What lessons, practices, beliefs, or ways of being feel important to carry forward?"
              />
              <PromptField
                label="What kind of legacy project could express these values or lessons?"
                value={state.legacyProjects}
                onChange={(v) => handleReflectionChange('legacyProjects', v)}
                onBlur={handleReflectionBlur}
                placeholder="Examples: a memoir, a video message, a photo book, a letter collection, or a community project."
              />
            </div>
          </section>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {isModalOpen && draftMoment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(19,4,38,0.55)] px-4 py-8">
          <div
            className="w-full max-w-xl rounded-[28px] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:p-8"
            style={{ backgroundColor: COLORS.light, borderColor: "rgba(44,55,119,0.12)", color: COLORS.midnight }}
          >
            <h2 className="text-2xl font-medium tracking-[-0.02em]">
              {draftMoment.id ? "Edit moment" : "Add moment"}
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block" style={{ fontFamily: hv, fontSize: 14, color: "#1A1A1A" }}>Name</label>
                <input
                  autoFocus
                  type="text"
                  value={draftMoment.title}
                  onChange={(e) => setDraftMoment((c) => c ? { ...c, title: e.target.value } : c)}
                  placeholder="e.g. Moved to Toronto"
                  style={{
                    width: "100%",
                    borderRadius: 4,
                    border: "1px solid rgba(26,26,26,0.15)",
                    padding: "10px 14px",
                    fontSize: 16,
                    fontFamily: hv,
                    color: "#1A1A1A",
                    backgroundColor: "#FFFFFF",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label className="mb-2 block" style={{ fontFamily: hv, fontSize: 14, color: "#1A1A1A" }}>Add a note (optional)</label>
                <textarea
                  value={draftMoment.note}
                  onChange={(e) => setDraftMoment((c) => c ? { ...c, note: e.target.value } : c)}
                  placeholder="What did you learn from this? How did this change you?"
                  rows={6}
                  style={{
                    width: "100%",
                    borderRadius: 4,
                    border: "1px solid rgba(26,26,26,0.15)",
                    padding: "10px 14px",
                    fontSize: 16,
                    fontFamily: hv,
                    color: "#1A1A1A",
                    backgroundColor: "#FFFFFF",
                    outline: "none",
                    resize: "none",
                    lineHeight: "1.5",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {momentSaveError && (
                <p style={{ fontFamily: hv, fontSize: 13, color: COLORS.sunset, margin: 0 }}>
                  Couldn't save this moment — try again
                </p>
              )}
            </div>

            <div
              className="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: "rgba(44,55,119,0.1)" }}
            >
              <div>
                {draftMoment.id ? (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    style={{
                      borderRadius: 4,
                      border: "1px solid rgba(219,88,53,0.3)",
                      color: COLORS.sunset,
                      backgroundColor: "rgba(219,88,53,0.06)",
                      fontFamily: hv,
                      fontSize: 14,
                      padding: "8px 16px",
                      cursor: "pointer",
                    }}
                  >
                    Delete moment
                  </button>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontFamily: hv,
                    fontSize: 14,
                    color: "rgba(26,26,26,0.72)",
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(26,26,26,0.72)")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMoment}
                  disabled={!draftMoment.title.trim()}
                  style={{
                    backgroundColor: "#2C3777",
                    color: "#FFFFFF",
                    fontFamily: hv,
                    fontWeight: 500,
                    fontSize: 14,
                    borderRadius: 4,
                    padding: "8px 20px",
                    border: "none",
                    cursor: draftMoment.title.trim() ? "pointer" : "not-allowed",
                    opacity: draftMoment.title.trim() ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => { if (draftMoment?.title.trim()) e.currentTarget.style.backgroundColor = "#243168"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#2C3777"; }}
                  onMouseDown={(e) => { if (draftMoment?.title.trim()) e.currentTarget.style.backgroundColor = "#1a2450"; }}
                  onMouseUp={(e) => { if (draftMoment?.title.trim()) e.currentTarget.style.backgroundColor = "#243168"; }}
                >
                  {draftMoment.id ? "Update moment" : "Add moment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── PromptField ──────────────────────────────────────────────────────────────

type PromptFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
};

function PromptField({ label, value, onChange, onBlur, placeholder }: PromptFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium" style={{ color: "rgba(19,4,38,0.85)" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-[18px] border px-4 py-3 text-sm leading-6 outline-none transition-colors"
        style={{
          backgroundColor: "rgba(248,244,235,0.98)",
          color: COLORS.midnight,
          borderColor: "rgba(44,55,119,0.14)",
        }}
      />
    </div>
  );
}
