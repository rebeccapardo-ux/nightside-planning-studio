"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import VoiceNoteButton from "@/app/components/VoiceNoteButton";
import type { Note } from "@/lib/notes";
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

type Orientation = "horizontal" | "vertical";

// Horizontal (desktop): t advances in x, sine drives y.
// Vertical   (mobile):  t advances in y, sine drives x — same character, axes
// rotated 90° and the sine output negated so the first arc bows left and the
// second bows right (the rotated equivalent of the desktop down-then-up shape).
const VB_W_H = 1000;
const VB_H_H = 380;
const PATH_MID_H = 190;
const PATH_AMP_H = 90;

const VB_W_V = 380;
const VB_H_V = 1000;
const PATH_MID_V = 190;
const PATH_AMP_V = 90;

function viewBox(o: Orientation): { w: number; h: number } {
  return o === "vertical" ? { w: VB_W_V, h: VB_H_V } : { w: VB_W_H, h: VB_H_H };
}

function getPathPoint(percent: number, o: Orientation = "horizontal"): { x: number; y: number } {
  const t = (clamp(percent, 5, 95) - 5) / 90;
  if (o === "vertical") {
    const y = 50 + t * 900;
    const x = PATH_MID_V - PATH_AMP_V * Math.sin(t * 2 * Math.PI);
    return { x, y };
  }
  const x = 50 + t * 900;
  const y = PATH_MID_H + PATH_AMP_H * Math.sin(t * 2 * Math.PI);
  return { x, y };
}

function serpentineD(o: Orientation): string {
  const pts: string[] = [];
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    if (o === "vertical") {
      const y = 50 + t * 900;
      const x = PATH_MID_V - PATH_AMP_V * Math.sin(t * 2 * Math.PI);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    } else {
      const x = 50 + t * 900;
      const y = PATH_MID_H + PATH_AMP_H * Math.sin(t * 2 * Math.PI);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }
  return `M ${pts.join(" L ")}`;
}

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
const LABEL_OFFSET = 34;
const LABEL_TRUNCATE = 20;
const CLOSE_THRESHOLD = 13;

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

// In horizontal: true = label drawn above the marker (used when the curve
// dips down below the midline). In vertical: true = label drawn to the right
// of the marker (used when the curve bows left of the midline). Same flip-on-
// collision logic in both orientations.
function computeLabelSides(moments: LegacyMoment[], o: Orientation = "horizontal"): Map<string, boolean> {
  const sorted = [...moments].sort((a, b) => a.xPercent - b.xPercent);
  const result = new Map<string, boolean>();

  sorted.forEach((m, i) => {
    const pt = getPathPoint(m.xPercent, o);
    let flipped = o === "vertical" ? pt.x < PATH_MID_V : pt.y > PATH_MID_H;

    if (i > 0) {
      const prev = sorted[i - 1];
      const prevFlipped = result.get(prev.id) ?? true;
      const diff = m.xPercent - prev.xPercent;
      if (diff < CLOSE_THRESHOLD && prevFlipped === flipped) {
        flipped = !flipped;
      }
    }

    result.set(m.id, flipped);
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
const apfel = "'Apfel Grotezk', sans-serif";

const TIPS = [
  'Choose moments that feel meaningful to you, even if they would seem small to someone else.',
  'You might include challenges, relationships, places, achievements, losses, changes, or turning points.',
  'As you map, look for patterns: what keeps showing up across different parts of your life?',
  'You can revisit this anytime. Your map doesn\'t need to be finished in one sitting.',
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LegacyMapPage() {
  const router = useRouter();
  const [state, setState] = useState<LegacyMapState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  const [tipsModalOpen, setTipsModalOpen] = useState(false);

  // Auto-save
  const [dirtyCount, setDirtyCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [statusNow, setStatusNow] = useState(() => Date.now());
  const stateRef = useRef<LegacyMapState>(DEFAULT_STATE);
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

  // Mobile vs desktop orientation. SSR + initial client render default to
  // horizontal; the effect upgrades to "vertical" below 768px once mounted.
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const orientationRef = useRef<Orientation>("horizontal");
  orientationRef.current = orientation;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setOrientation(mq.matches ? "vertical" : "horizontal");
    apply();
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  // Reduced-motion preference for tooltip animations.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  // Supabase
  const [supabaseEntryId, setSupabaseEntryId] = useState<string | null>(null);
  const supabaseEntryIdRef = useRef<string | null>(null);
  supabaseEntryIdRef.current = supabaseEntryId;
  const userIdRef = useRef<string | null>(null);

  // Reflection
  const [reflectionMounted, setReflectionMounted] = useState(false);
  const [reflectionVisible, setReflectionVisible] = useState(false);
  const [reflectionSaveStatus, setReflectionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [reflectionSavedShowing, setReflectionSavedShowing] = useState(false);
  const [reflectionSavedFading, setReflectionSavedFading] = useState(false);
  const reflectionFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reflectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const realMoments = useMemo(() => state.moments, [state.moments]);
  const labelSides = useMemo(() => computeLabelSides(realMoments, orientation), [realMoments, orientation]);

  // ── Load from localStorage + resolve Supabase entry ID ─────────────────────

  useEffect(() => {
    async function init() {
      // Fetch user first so all storage operations are user-scoped
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userIdRef.current = user.id;
      const storageKey = user ? `${STORAGE_KEY}:${user.id}` : STORAGE_KEY;
      const entryIdKey = user ? `${ENTRY_ID_KEY}:${user.id}` : ENTRY_ID_KEY;

      try {
        const raw = window.localStorage.getItem(storageKey);
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

      if (user) {
        try {
          const stored = window.localStorage.getItem(entryIdKey);
          if (stored) {
            setSupabaseEntryId(stored);
            supabaseEntryIdRef.current = stored;
            const { data } = await supabase
              .from("entries")
              .select("created_at")
              .eq("id", stored)
              .single();
            const storedSaveTime = window.localStorage.getItem(`nightside.lastSaved.${user.id}.${stored}`);
            if (storedSaveTime) setLastSavedAt(new Date(storedSaveTime));
            else if (data?.created_at) setLastSavedAt(new Date(data.created_at));
            associateEntryWithLegacyDomain(stored);
          } else {
            const { data } = await supabase
              .from("entries")
              .select("id, created_at")
              .eq("user_id", user.id)
              .eq("activity", "legacy_map")
              .order("created_at", { ascending: false })
              .limit(1);
            if (data?.[0]?.id) {
              window.localStorage.setItem(entryIdKey, data[0].id);
              setSupabaseEntryId(data[0].id);
              supabaseEntryIdRef.current = data[0].id;
              const storedSaveTime2 = window.localStorage.getItem(`nightside.lastSaved.${user.id}.${data[0].id}`);
              if (storedSaveTime2) setLastSavedAt(new Date(storedSaveTime2));
              else if (data[0].created_at) setLastSavedAt(new Date(data[0].created_at));
              associateEntryWithLegacyDomain(data[0].id);
            }
          }
        } catch {
          // silently ignore
        }
      }

      setIsLoaded(true);
    }
    init();
  }, []);

  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'activity_opened', metadata: { activity: 'legacy_map' } }),
    }).catch(() => {})
  }, [])

  // ── Auto-save (drag / position changes only) ─────────────────────────────────

  useEffect(() => {
    if (dirtyCount === 0 || !isLoaded) return;
    const timer = setTimeout(async () => {
      const toSave = { ...stateRef.current, updatedAt: new Date().toISOString() };
      const uid = userIdRef.current;
      try {
        const sk = uid ? `${STORAGE_KEY}:${uid}` : STORAGE_KEY;
        window.localStorage.setItem(sk, JSON.stringify(toSave));
        setState(toSave);
        stateRef.current = toSave;
        if (supabaseEntryIdRef.current && uid) window.localStorage.setItem(`nightside.lastSaved.${uid}.${supabaseEntryIdRef.current}`, new Date().toISOString());
        setLastSavedAt(new Date());
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
              window.localStorage.setItem(`${ENTRY_ID_KEY}:${user.id}`, created.id);
              setSupabaseEntryId(created.id);
              supabaseEntryIdRef.current = created.id;
              fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventName: 'activity_contributed', metadata: { activity: 'legacy_map' } }),
              }).catch(() => {});
            }
          }
          if (supabaseEntryIdRef.current) associateEntryWithLegacyDomain(supabaseEntryIdRef.current);
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

  // Refresh timestamp display every 60s
  useEffect(() => {
    if (!lastSavedAt) return;
    const interval = setInterval(() => setStatusNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

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

  // ── Domain association helpers ────────────────────────────────────────────

  async function getLegacyDomainId(): Promise<string | null> {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('containers').select('id').eq('type', 'domain').ilike('title', '%legacy%').limit(1)
      return data?.[0]?.id ?? null
    } catch { return null }
  }

  async function associateEntryWithLegacyDomain(entryId: string) {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const containerId = await getLegacyDomainId()
      if (!containerId) return
      const { error } = await supabase
        .from('container_entries')
        .insert({ user_id: user.id, container_id: containerId, entry_id: entryId })
      if (error && error.code !== '23505') console.error('associateEntryWithLegacyDomain:', error.message)
    } catch (e) { console.error('associateEntryWithLegacyDomain error:', e) }
  }

  async function associateNoteWithLegacyDomain(noteId: string) {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const containerId = await getLegacyDomainId()
      if (!containerId) return
      const { error } = await supabase
        .from('container_notes')
        .insert({ user_id: user.id, container_id: containerId, note_id: noteId })
      if (error && error.code !== '23505') console.error('associateNoteWithLegacyDomain:', error.message)
    } catch (e) { console.error('associateNoteWithLegacyDomain error:', e) }
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
          window.localStorage.setItem(`${ENTRY_ID_KEY}:${user.id}`, created.id);
          setSupabaseEntryId(created.id);
          supabaseEntryIdRef.current = created.id;
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventName: 'activity_contributed', metadata: { activity: 'legacy_map' } }),
          }).catch(() => {});
        }
      }
      if (supabaseEntryIdRef.current) {
        associateEntryWithLegacyDomain(supabaseEntryIdRef.current)
        window.localStorage.setItem(`nightside.lastSaved.${user.id}.${supabaseEntryIdRef.current}`, new Date().toISOString());
      }
      setLastSavedAt(new Date());
    } catch {
      // silently ignore
    }
  }

  async function saveReflectionToSupabase() {
    const current = stateRef.current;
    const toSave = { ...current, updatedAt: new Date().toISOString() };

    try {
      const uid = userIdRef.current;
      const sk = uid ? `${STORAGE_KEY}:${uid}` : STORAGE_KEY;
      window.localStorage.setItem(sk, JSON.stringify(toSave));
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
          window.localStorage.setItem(`${ENTRY_ID_KEY}:${user.id}`, created.id);
          setSupabaseEntryId(created.id);
          supabaseEntryIdRef.current = created.id;
          fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventName: 'activity_contributed', metadata: { activity: 'legacy_map' } }),
          }).catch(() => {});
        }
      }

      setReflectionSaveStatus('saved');
      if (supabaseEntryIdRef.current) {
        associateEntryWithLegacyDomain(supabaseEntryIdRef.current)
        window.localStorage.setItem(`nightside.lastSaved.${user.id}.${supabaseEntryIdRef.current}`, new Date().toISOString());
      }
      setLastSavedAt(new Date());

      // Show fade-out saved indicator
      setReflectionSavedShowing(true);
      setReflectionSavedFading(false);
      if (reflectionFadeTimerRef.current) clearTimeout(reflectionFadeTimerRef.current);
      reflectionFadeTimerRef.current = setTimeout(() => {
        setReflectionSavedFading(true);
        setTimeout(() => setReflectionSavedShowing(false), 400);
      }, 3000);
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
    try { const _uid = userIdRef.current; window.localStorage.setItem(_uid ? `${STORAGE_KEY}:${_uid}` : STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }

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

  async function handlePreviewExport() {
    const id = supabaseEntryIdRef.current;
    if (!id) return;
    router.push(`/app/entries/${id}`);
  }

  // ── Modal helpers ───────────────────────────────────────────────────────────

  function openCreateModal(xPercent: number) {
    setSelectedId(null);
    setDraftMoment({ id: null, title: "", note: "", xPercent: clamp(xPercent, 5, 95) });
    setMomentSaveError(false);
    setIsModalOpen(true);
  }

  function openEditModal(moment: LegacyMoment) {
    setSelectedId(moment.id);
    setDraftMoment({ id: moment.id, title: moment.title, note: moment.note, xPercent: moment.xPercent });
    setTooltipId(null);
    setMomentSaveError(false);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setDraftMoment(null);
    setMomentSaveError(false);
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
    }

    const nextState: LegacyMapState = {
      ...stateRef.current,
      moments: nextMoments,
      updatedAt: new Date().toISOString(),
    };

    setState(nextState);
    stateRef.current = nextState;
    try { const _uid = userIdRef.current; window.localStorage.setItem(_uid ? `${STORAGE_KEY}:${_uid}` : STORAGE_KEY, JSON.stringify(nextState)); } catch { /* ignore */ }

    setSelectedId(nextSelectedId);
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
    try { const _uid = userIdRef.current; window.localStorage.setItem(_uid ? `${STORAGE_KEY}:${_uid}` : STORAGE_KEY, JSON.stringify(nextState)); } catch { /* ignore */ }
    setSelectedId((current) => (current === draftMoment.id ? null : current));
    persistStateToSupabase(nextState);
    closeModal();
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  function getPercentFromClient(clientX: number, clientY: number): number {
    const el = pathContainerRef.current;
    if (!el) return 50;
    const rect = el.getBoundingClientRect();
    if (orientationRef.current === "vertical") {
      return clamp(((clientY - rect.top) / rect.height) * 100, 5, 95);
    }
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
    const xPercent = getPercentFromClient(event.clientX, event.clientY);
    markChanged((current) => ({
      ...current,
      moments: current.moments.map((m) =>
        m.id === draggingId ? { ...m, xPercent } : m
      ),
    }));
  }

  const saveStatusText = lastSavedAt
    ? (() => {
        const diff = Math.floor((statusNow - lastSavedAt.getTime()) / 1000);
        if (diff < 60) return 'Saved just now';
        const mins = Math.floor(diff / 60);
        if (mins < 60) return `Saved ${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Saved ${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `Saved ${days}d ago`;
        return `Saved ${Math.floor(days / 7)}w ago`;
      })()
    : null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#2f3f8f' }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="px-5 md:pl-24 md:pr-[148px] activity-banner-row" style={{ background: '#130426', paddingTop: 64, paddingBottom: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>

        {/* Left: breadcrumbs + title + description + pills */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 24 }}>
            <Breadcrumbs
              theme="navy"
              items={[
                { label: 'Reflect', href: '/app/reflect' },
                { label: 'Legacy Map' },
              ]}
            />
          </div>
          <h1 className="text-[34px] font-semibold leading-[0.98] tracking-[-0.03em] md:text-[42px]" style={{ color: '#ffffff', marginBottom: 0 }}>
            Legacy Map
          </h1>
          <p style={{ fontFamily: hv, fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 520, marginTop: 20, marginBottom: 14, lineHeight: 1.5 }}>
            Life review is the practice of looking back at your life as a whole and noticing what has shaped you. People who engage in structured life review report reduced anxiety and depression, a strengthened sense of identity, and increased life satisfaction.{' '}
            <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2664509/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'underline' }}>(source)</a>
          </p>
          <p style={{ fontFamily: hv, fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 520, marginTop: 0, marginBottom: 0, lineHeight: 1.5 }}>
            The map works alone or as a prompt for conversation. This activity tends to open exchanges that wouldn&apos;t happen otherwise, and helps you identify the lessons and values you most want to pass on.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 28 }}>
            {['Add moments', 'Drag to reposition on timeline'].map((text) => (
              <span
                key={text}
                style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.45)', borderRadius: 20, padding: '4px 12px', fontFamily: hv, fontSize: 14, color: '#ffffff', cursor: 'default' }}
              >
                {text}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setTipsModalOpen(true)}
              style={{ fontFamily: hv, fontSize: 15, color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'none', marginLeft: 12, padding: 0, transition: 'text-decoration 0.15s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              More tips ›
            </button>
          </div>
        </div>

        {/* Right: export + saved status (not sticky) */}
        <div className="activity-banner-aside" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: -44, flexShrink: 0 }}>
          {supabaseEntryId && (
            <button
              type="button"
              onClick={handlePreviewExport}
              className="mobile-sticky-export"
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '10px 20px', fontFamily: hv, fontSize: 14, fontWeight: 600, background: '#F29836', color: '#130426', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e08a25'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F29836'; }}
            >
              <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M6.5 1.5v6M3.5 5.5L6.5 8.5L9.5 5.5" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.5 10.5h10" stroke="#130426" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Export
            </button>
          )}
          {saveStatusText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6" stroke="#ffffff" strokeWidth="1.3" />
                <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: hv, fontSize: 11, color: '#ffffff', whiteSpace: 'nowrap' }}>{saveStatusText}</span>
            </div>
          )}
        </div>

      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1320px] px-6 pb-14 md:px-10">

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        <section
          className="rounded-[28px] border p-4 md:p-6"
          style={{
            backgroundColor: COLORS.light,
            color: COLORS.midnight,
            borderColor: "rgba(44,55,119,0.12)",
            marginTop: 20,
          }}
        >
          {/* Add moment button — inside cream panel, centered above canvas */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => openCreateModal(getNextMomentX(state.moments))}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2C3777', color: '#ffffff', fontFamily: hv, fontSize: 14, fontWeight: 500, borderRadius: 24, padding: '11px 28px', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#130426'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#2C3777'; }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <circle cx="7.5" cy="7.5" r="6.5" stroke="#ffffff" strokeWidth="2" />
                <path d="M7.5 4.5v6M4.5 7.5h6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Add moment
            </button>
          </div>
          <p style={{ fontFamily: hv, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5, color: 'rgba(19,4,38,0.6)', textAlign: 'center', marginTop: 0, marginBottom: 16 }}>
            Your work saves automatically to Your Plan.
          </p>
          <div
            ref={pathContainerRef}
            className="relative w-full select-none rounded-[20px] overflow-hidden"
            style={{
              height: orientation === "vertical" ? 620 : 360,
              background: orientation === "vertical"
                ? "linear-gradient(180deg, rgba(187,171,244,0.14) 0%, rgba(248,244,235,1) 100%)"
                : "linear-gradient(180deg, rgba(187,171,244,0.14) 0%, rgba(248,244,235,1) 100%)",
              border: "1px solid rgba(44,55,119,0.10)",
              cursor: draggingId ? "grabbing" : "default",
              touchAction: draggingId ? "none" : "auto",
            }}
            onPointerMove={handleContainerPointerMove}
            onClick={() => setTooltipId(null)}
          >
            {/* SVG serpentine path */}
            <svg
              viewBox={`0 0 ${viewBox(orientation).w} ${viewBox(orientation).h}`}
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="path-gradient"
                  x1={orientation === "vertical" ? "0%" : "0%"}
                  y1={orientation === "vertical" ? "0%" : "0%"}
                  x2={orientation === "vertical" ? "0%" : "100%"}
                  y2={orientation === "vertical" ? "100%" : "0%"}
                >
                  <stop offset="0%"   stopColor={COLORS.dusk}    stopOpacity="0.7" />
                  <stop offset="50%"  stopColor={COLORS.sunrise} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={COLORS.sunset}  stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path
                d={serpentineD(orientation)}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Birth + Now labels (top/bottom on vertical, left/right on horizontal) */}
            {orientation === "vertical" ? (
              <>
                <div
                  className="absolute pointer-events-none select-none"
                  style={{ left: "50%", top: 12, transform: "translateX(-50%)", fontFamily: hv, fontSize: 11, letterSpacing: '0.08em', color: COLORS.midnight }}
                >
                  Birth
                </div>
                <div
                  className="absolute pointer-events-none select-none"
                  style={{ left: "50%", bottom: 12, transform: "translateX(-50%)", fontFamily: hv, fontSize: 11, letterSpacing: '0.08em', color: COLORS.midnight }}
                >
                  Now
                </div>
              </>
            ) : (
              <>
                <div
                  className="absolute pointer-events-none select-none"
                  style={{ left: 24, bottom: 16, fontFamily: hv, fontSize: 11, letterSpacing: '0.08em', color: COLORS.midnight }}
                >
                  Birth
                </div>
                <div
                  className="absolute pointer-events-none select-none"
                  style={{ right: 24, bottom: 16, fontFamily: hv, fontSize: 11, letterSpacing: '0.08em', color: COLORS.midnight }}
                >
                  Now
                </div>
              </>
            )}

            {/* Real moment nodes */}
            {state.moments.map((moment) => {
              const isSelected = selectedId === moment.id;
              const isDragging = draggingId === moment.id;
              const pt = getPathPoint(moment.xPercent, orientation);
              const vb = viewBox(orientation);
              const flipped = labelSides.get(moment.id) ?? (orientation === "vertical" ? pt.x < PATH_MID_V : pt.y > PATH_MID_H);
              const displayTitle = truncateLabel(moment.title);
              const isTruncated = displayTitle !== moment.title;
              const isTooltipOpen = tooltipId === moment.id && !draggingId;

              const xFrac = pt.x / vb.w;
              const yFrac = pt.y / vb.h;

              // Tooltip positioning differs by orientation:
              //  horizontal: card floats above/below marker, with smart left/center/right alignment.
              //  vertical:   card floats left/right of marker (opposite the bow), with smart top/center/bottom alignment.
              let tooltipPlacementStyle: React.CSSProperties;
              if (orientation === "vertical") {
                // place opposite the curve's bow direction at this point
                const tooltipRight = pt.x < PATH_MID_V; // curve bowed left → tooltip on right
                const tooltipVAlign: React.CSSProperties =
                  yFrac < 0.20
                    ? { top: 0, transform: "none" }
                    : yFrac > 0.80
                    ? { bottom: 0, transform: "none" }
                    : { top: "50%", transform: "translateY(-50%)" };
                tooltipPlacementStyle = {
                  ...(tooltipRight ? { left: "30px" } : { right: "30px" }),
                  ...tooltipVAlign,
                  width: "220px",
                };
              } else {
                const tooltipAbove = (pt.y / vb.h) > 0.38;
                const tooltipHAlign: React.CSSProperties =
                  xFrac < 0.28
                    ? { left: "-8px", transform: "none" }
                    : xFrac > 0.72
                    ? { right: "-8px", transform: "none" }
                    : { left: "50%", transform: "translateX(-50%)" };
                tooltipPlacementStyle = {
                  ...(tooltipAbove ? { bottom: "46px" } : { top: "46px" }),
                  ...tooltipHAlign,
                  width: "268px",
                };
              }

              // Label placement:
              //  horizontal: above/below marker (flipped = above), with smart h-align.
              //  vertical:   left/right of marker (flipped = right), with smart v-align.
              let labelPlacementStyle: React.CSSProperties;
              if (orientation === "vertical") {
                const labelVAlign: React.CSSProperties =
                  yFrac < 0.06
                    ? { top: 0, transform: "none" }
                    : yFrac > 0.94
                    ? { bottom: 0, transform: "none" }
                    : { top: "50%", transform: "translateY(-50%)" };
                labelPlacementStyle = {
                  ...(flipped ? { left: `${LABEL_OFFSET}px` } : { right: `${LABEL_OFFSET}px` }),
                  ...labelVAlign,
                  width: 130,
                };
              } else {
                const labelHAlign: React.CSSProperties =
                  xFrac < 0.20
                    ? { left: 0, transform: "none" }
                    : xFrac > 0.75
                    ? { right: 0, transform: "none" }
                    : { left: "50%", transform: "translateX(-50%)" };
                labelPlacementStyle = {
                  ...(flipped ? { bottom: `${LABEL_OFFSET}px` } : { top: `${LABEL_OFFSET}px` }),
                  ...labelHAlign,
                  width: 160,
                };
              }

              // Connector tick between marker and label.
              const connectorStyle: React.CSSProperties = orientation === "vertical"
                ? {
                    top: "50%",
                    transform: "translateY(-50%)",
                    ...(flipped ? { left: "22px" } : { right: "22px" }),
                    height: "1px",
                    width: "12px",
                    backgroundColor: "rgba(44,55,119,0.28)",
                  }
                : {
                    left: "50%",
                    transform: "translateX(-50%)",
                    ...(flipped ? { bottom: "22px" } : { top: "22px" }),
                    height: "12px",
                    width: "1px",
                    backgroundColor: "rgba(44,55,119,0.28)",
                  };

              const enableHover = orientation !== "vertical";

              return (
                <div
                  key={moment.id}
                  data-moment="true"
                  className={`absolute ${isTooltipOpen ? "z-50" : "z-20"}`}
                  style={{
                    left: `${(pt.x / vb.w) * 100}%`,
                    top: `${(pt.y / vb.h) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseEnter={() => { if (enableHover && !draggingId) setTooltipId(moment.id); }}
                  onMouseLeave={() => { if (enableHover) setTooltipId((prev) => prev === moment.id ? null : prev); }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Tooltip card */}
                  {isTooltipOpen && (
                    <button
                      type="button"
                      className={`absolute z-40 text-left ${reducedMotion ? "" : "legacy-tooltip-card"}`}
                      style={{
                        ...tooltipPlacementStyle,
                        backgroundColor: COLORS.light,
                        borderRadius: "16px",
                        border: "1px solid rgba(44,55,119,0.13)",
                        boxShadow: "0 8px 32px rgba(19,4,38,0.20), 0 2px 8px rgba(19,4,38,0.10)",
                        padding: "14px 16px",
                        cursor: "pointer",
                      }}
                      onClick={(e) => { e.stopPropagation(); openEditModal(moment); }}
                      onMouseEnter={() => { if (enableHover) setTooltipId(moment.id); }}
                      onMouseLeave={() => { if (enableHover) setTooltipId(null); }}
                    >
                      <p style={{ fontWeight: 700, fontSize: "13px", color: COLORS.midnight, marginBottom: moment.note ? "8px" : 0, lineHeight: "1.3", wordBreak: "break-word", overflowWrap: "break-word" }}>
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
                    className="absolute"
                    style={labelPlacementStyle}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (touchModeRef.current) {
                          setTooltipId((prev) => prev === moment.id ? null : moment.id);
                        } else {
                          openEditModal(moment);
                        }
                      }}
                      className="rounded-[14px] border px-3 py-1.5 text-sm leading-snug shadow-sm transition w-full text-left"
                      style={{
                        backgroundColor: isSelected ? "rgba(242,152,54,0.14)" : "rgba(248,244,235,0.96)",
                        borderColor: isSelected ? "rgba(219,88,53,0.38)" : "rgba(44,55,119,0.16)",
                        color: COLORS.midnight,
                        wordBreak: "break-word",
                      }}
                    >
                      {moment.title}
                    </button>
                  </div>

                  {/* Connector tick */}
                  <div
                    className="absolute"
                    style={connectorStyle}
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
          </div>
        </section>

        {/* ── Reflection (gated at 3 moments) ──────────────────────────────── */}
        {reflectionMounted && (
          <section
            className="rounded-[28px] border p-6 md:p-8"
            style={{
              backgroundColor: COLORS.light,
              color: COLORS.midnight,
              borderColor: "rgba(44,55,119,0.12)",
              marginTop: 24,
              opacity: reflectionVisible ? 1 : 0,
              transform: reflectionVisible ? "none" : "translateY(24px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <h2 className="text-xl font-medium tracking-[-0.01em]">
                Now step back and look at the whole picture.
              </h2>
            </div>
            <p className="max-w-3xl text-sm leading-6" style={{ color: "rgba(19,4,38,0.68)" }}>
              Take your time with these questions. There are no right answers.
            </p>

            <div className="mt-6">
              <ol className="mb-5 space-y-2" style={{ paddingLeft: 0, listStyle: 'none' }}>
                {[
                  'What themes stand out?',
                  'Are there any surprises or realizations?',
                  'What values or traditions do you want to pass on?',
                  'What kind of legacy project could express these values or lessons?',
                ].map((q, i) => (
                  <li key={i} className="text-sm font-medium" style={{ color: 'rgba(19,4,38,0.85)', fontFamily: hv }}>
                    {q}
                  </li>
                ))}
              </ol>
              <textarea
                value={state.themes}
                onChange={(e) => handleReflectionChange('themes', e.target.value)}
                onBlur={handleReflectionBlur}
                placeholder="Share your reflections…"
                rows={5}
                className="w-full resize-none outline-none transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: COLORS.midnight,
                  border: '1px solid #2C3777',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  lineHeight: '1.6',
                  boxSizing: 'border-box',
                }}
              />

              {/* Reflection save status — right-aligned */}
              {reflectionSaveStatus === 'saving' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                  <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: '#333333' }}>Saving…</span>
                </div>
              )}
              {reflectionSavedShowing && reflectionSaveStatus !== 'saving' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6, opacity: reflectionSavedFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="6" stroke="#333333" strokeWidth="1.3" />
                    <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="#333333" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontFamily: hv, fontSize: 12, fontWeight: 500, color: '#333333' }}>Saved to Your Plan</span>
                </div>
              )}

              {/* Error state */}
              {reflectionSaveStatus === 'error' && (
                <p style={{ marginTop: 6, fontSize: 13, fontFamily: hv, color: 'rgba(219,88,53,0.85)', minHeight: 18 }}>
                  Couldn't save — check your connection
                </p>
              )}

              <p style={{ fontFamily: hv, fontSize: 14, fontStyle: 'italic', lineHeight: 1.5, color: 'rgba(0,0,0,0.6)', margin: '12px 0 8px 0' }}>
                Notes save automatically to Your Plan.
              </p>
              <div style={{ marginTop: 8 }}>
                <VoiceNoteButton
                  saveMode={{ kind: 'freeform' }}
                  theme="light"
                  onSaved={(note: Note) => { associateNoteWithLegacyDomain(note.id) }}
                />
              </div>
            </div>
          </section>
        )}

      </div>

      {/* ── Tips modal ───────────────────────────────────────────────────────── */}
      {tipsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(19,4,38,0.55)] px-4"
          onClick={() => setTipsModalOpen(false)}
        >
          <div
            style={{ background: '#F8F4EB', borderRadius: 24, padding: '28px 32px', maxWidth: 560, width: '100%', color: '#130426', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h2 style={{ fontFamily: apfel, fontSize: 22, color: '#130426', fontWeight: 400, margin: 0 }}>
                Tips for using this activity
              </h2>
              <button
                type="button"
                onClick={() => setTipsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(19,4,38,0.45)', fontSize: 22, lineHeight: 1, padding: '0 0 0 16px', flexShrink: 0 }}
              >
                ×
              </button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {TIPS.map((item, i) => (
                <li
                  key={i}
                  style={{ fontFamily: hv, fontSize: 14, lineHeight: 1.6, color: 'rgba(19,4,38,0.85)', marginBottom: i < TIPS.length - 1 ? 12 : 0, display: 'flex', gap: 10 }}
                >
                  <span style={{ flexShrink: 0, color: 'rgba(19,4,38,0.3)' }}>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Moment modal ─────────────────────────────────────────────────────── */}
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
                    borderRadius: 12,
                    border: "1px solid #2C3777",
                    padding: "12px",
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
                <p style={{ fontFamily: hv, fontSize: 14, color: "#1A1A1A", margin: '0 0 8px 0' }}>What did you learn from this? How did it change you?</p>
                <textarea
                  value={draftMoment.note}
                  onChange={(e) => setDraftMoment((c) => c ? { ...c, note: e.target.value } : c)}
                  placeholder="Add a note (optional)"
                  rows={6}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #2C3777",
                    padding: "12px",
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
