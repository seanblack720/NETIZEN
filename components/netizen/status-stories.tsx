"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Plus, X } from "lucide-react";

/* =========================================================
   TYPES
   userId / userName / userImage / createdAt are read from each
   status returned by /api/statuses. If your API names them
   differently, change them in groupStatuses() below.
========================================================== */
export type StatusItem = {
  id?: string;
  _id?: string;
  image?: string;
  title?: string;
  tag?: string;
  userId?: string;
  userName?: string | null;
  userImage?: string | null;
  createdAt?: string | Date;
};

export type StatusGroup = {
  key: string;
  userId?: string;
  name: string;
  image: string | null;
  items: StatusItem[];
};

/* Container look (change this one line to re-colour the whole status card) */
export const STORY_GRADIENT =
  "linear-gradient(135deg,#5b21b6 0%,#7c3aed 45%,#a855f7 100%)";

const STORY_DURATION = 5000; // ms each status stays on screen

function timeOf(value?: string | Date) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function agoLabel(value?: string | Date) {
  const t = timeOf(value);
  if (!t) return "";
  const minutes = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function initialsOf(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* One entry per creator. All of a creator's statuses are grouped together. */
export function groupStatuses(
  statuses: StatusItem[],
  viewerId?: string | null
): StatusGroup[] {
  const map = new Map<string, StatusGroup>();

  for (const s of statuses) {
    if (!s || !s.image) continue;
    const key = String(s.userId ?? s.userName ?? "unknown");
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        userId: s.userId ? String(s.userId) : undefined,
        name: s.userName || "User",
        image: s.userImage || null,
        items: [],
      };
      map.set(key, group);
    }
    if (!group.image && s.userImage) group.image = s.userImage;
    group.items.push(s);
  }

  const groups = Array.from(map.values());

  // inside a group: oldest first, like a real status
  for (const g of groups) {
    g.items.sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt));
  }

  // your own group first, then the most recently updated creators
  const latest = (g: StatusGroup) => timeOf(g.items[g.items.length - 1]?.createdAt);
  groups.sort((a, b) => {
    const aMine = viewerId && a.userId === String(viewerId) ? 1 : 0;
    const bMine = viewerId && b.userId === String(viewerId) ? 1 : 0;
    if (aMine !== bMine) return bMine - aMine;
    return latest(b) - latest(a);
  });

  return groups;
}

/* Round avatar: picture, or initials when there is none */
export function Face({
  src,
  name,
  className,
  textClass = "text-xs",
}: {
  src?: string | null;
  name?: string | null;
  className: string;
  textClass?: string;
}) {
  const [errored, setErrored] = useState(false);
  const ok = !!src && src.trim().length > 0 && !errored;

  useEffect(() => setErrored(false), [src]);

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8efe8] font-semibold text-[#2f6b4f] dark:bg-[#24382f] dark:text-[#7ee0b0] ${className}`}
    >
      {ok ? (
        <img
          src={String(src)}
          alt={name || "User"}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className={`leading-none ${textClass}`}>{initialsOf(name)}</span>
      )}
    </div>
  );
}

/* =========================================================
   STATUS CARD (the gradient container with the story cards)
========================================================== */
/* Green hero colours. The top colour matches the Header on the Feed tab
   (#15803d light / #052e1a dark) so bar and hero look like one surface. */
const HERO_LIGHT = "linear-gradient(180deg,#15803d 0%,#16a34a 55%,#22c55e 100%)";
const HERO_DARK = "linear-gradient(180deg,#052e1a 0%,#064e2b 55%,#0a6b3a 100%)";

const DOTS_LIGHT = "radial-gradient(rgba(220,252,231,0.8) 1.6px, transparent 1.9px)";
const DOTS_DARK = "radial-gradient(rgba(74,222,128,0.6) 1.6px, transparent 1.9px)";

function HeroBackdrop() {
  const dotLayer = (image: string, mask: string, size: number) => ({
    backgroundImage: image,
    backgroundSize: `${size}px ${size}px`,
    WebkitMaskImage: mask,
    maskImage: mask,
  });

  const maskTopRight = "radial-gradient(75% 90% at 92% 0%, #000 0%, transparent 72%)";
  const maskBottomLeft = "radial-gradient(60% 80% at 4% 100%, #000 0%, transparent 70%)";

  return (
    <>
      {/* gradient */}
      <div className="absolute inset-0 dark:hidden" style={{ background: HERO_LIGHT }} />
      <div className="absolute inset-0 hidden dark:block" style={{ background: HERO_DARK }} />

      {/* glow blobs */}
      <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-lime-300/25 blur-3xl dark:bg-emerald-400/20" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-emerald-200/25 blur-3xl dark:bg-lime-400/10" />

      {/* dot grids, fading out so they feel designed instead of stamped on */}
      <div className="pointer-events-none absolute inset-0 dark:hidden" style={dotLayer(DOTS_LIGHT, maskTopRight, 18)} />
      <div className="pointer-events-none absolute inset-0 hidden dark:block" style={dotLayer(DOTS_DARK, maskTopRight, 18)} />
      <div className="pointer-events-none absolute inset-0 opacity-70 dark:hidden" style={dotLayer(DOTS_LIGHT, maskBottomLeft, 14)} />
      <div className="pointer-events-none absolute inset-0 hidden opacity-70 dark:block" style={dotLayer(DOTS_DARK, maskBottomLeft, 14)} />
    </>
  );
}

export function StoryRail({
  groups,
  viewed,
  me,
  loading,
  onAdd,
  onOpen,
}: {
  groups: StatusGroup[];
  viewed: Set<string>;
  me: { name?: string | null; image?: string | null } | null;
  loading?: boolean;
  onAdd: () => void;
  onOpen: (index: number) => void;
}) {
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden rounded-b-[32px] px-4 pb-5 pt-5 sm:left-0 sm:w-full sm:translate-x-0 sm:rounded-[28px]">
      <HeroBackdrop />

      <div className="relative mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight text-white">Status</h2>
        {groups.length > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-white/15 py-1 pl-2.5 pr-1.5 text-[11px] font-semibold text-white/90 backdrop-blur">
            Scroll to see more
            <ChevronRight size={13} />
          </span>
        )}
      </div>

      {/* extra bottom padding + negative margin so card shadows are never cut off */}
      <div className="relative -mx-4 -mb-4 flex snap-x snap-proximity scroll-px-4 gap-3 overflow-x-auto px-4 pb-6 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Your story */}
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add status"
          className="flex h-[145px] w-[112px] shrink-0 snap-start flex-col items-center justify-center gap-2.5 rounded-[22px] border border-white/25 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] backdrop-blur transition active:scale-95 sm:h-[159px] sm:w-[124px]"
          style={{ background: "rgba(255,255,255,0.18)", color: "#ffffff" }}
        >
          <div className="relative">
            <Face
              src={me?.image}
              name={me?.name || "You"}
              className="h-14 w-14 ring-2 ring-white/80"
              textClass="text-base"
            />
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-[2.5px] border-[#16a34a] bg-white text-[#16a34a] dark:border-[#064e2b]">
              <Plus size={13} strokeWidth={3} />
            </span>
          </div>
          <span className="text-[13px] font-extrabold tracking-wide" style={{ color: "#ffffff" }}>
            Your Story
          </span>
        </button>

        {/* loading placeholders */}
        {loading &&
          [0, 1, 2].map((i) => (
            <div
              key={`sk-${i}`}
              className="feed-shimmer-light h-[145px] w-[112px] shrink-0 snap-start rounded-[22px] sm:h-[159px] sm:w-[124px]"
            />
          ))}

        {/* One card per creator */}
        {!loading &&
          groups.map((group, index) => {
            const cover = group.items[group.items.length - 1]?.image;
            const seen = viewed.has(group.key);
            const count = group.items.length;

            return (
              <button
                key={group.key}
                type="button"
                onClick={() => onOpen(index)}
                aria-label={`Open ${group.name}'s status`}
                className="relative h-[145px] w-[112px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-[#0b3d24] text-left shadow-[0_10px_24px_-12px_rgba(0,0,0,0.55)] transition active:scale-95 sm:h-[159px] sm:w-[124px]"
              >
                {cover && (
                  <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/80" />

                {/* creator avatar (picture or letters) with a bright blue ring */}
                <div
                  className="absolute left-2 top-2 rounded-full p-[3px]"
                  style={{
                    background: seen ? "rgba(47,155,255,0.45)" : "#2f9bff",
                    boxShadow: seen ? "none" : "0 0 10px rgba(47,155,255,0.75)",
                  }}
                >
                  <Face
                    src={group.image}
                    name={group.name}
                    className="h-8 w-8 border-2 border-white"
                    textClass="text-[11px]"
                  />
                </div>

                {count > 1 && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                    {count}
                  </span>
                )}

                {/* creator name at the bottom */}
                <span className="absolute inset-x-2.5 bottom-2 truncate text-[13px] font-semibold leading-tight text-white drop-shadow">
                  {group.name}
                </span>
              </button>
            );
          })}

        {!loading && groups.length === 0 && (
          <div className="flex h-[145px] w-[150px] shrink-0 items-center rounded-[22px] bg-white/15 px-4 text-xs font-medium text-white/90 backdrop-blur sm:h-[159px]">
            No statuses yet. Be the first to post one.
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   FULL SCREEN VIEWER
   tap right / left  -> next / previous status
   swipe left / right -> next / previous person
   swipe down         -> close
   press and hold     -> pause
========================================================== */
export function StoryViewer({
  groups,
  startIndex,
  onClose,
  onViewed,
}: {
  groups: StatusGroup[];
  startIndex: number;
  onClose: () => void;
  onViewed?: (key: string) => void;
}) {
  const [pos, setPos] = useState({ g: Math.min(startIndex, groups.length - 1), s: 0 });
  const [restart, setRestart] = useState(0);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });

  const posRef = useRef(pos);
  posRef.current = pos;
  const pausedRef = useRef(false);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const group = groups[pos.g];
  const item = group?.items[pos.s];

  const goNextGroup = useCallback(() => {
    const { g } = posRef.current;
    if (g < groups.length - 1) setPos({ g: g + 1, s: 0 });
    else onClose();
  }, [groups.length, onClose]);

  const goPrevGroup = useCallback(() => {
    const { g } = posRef.current;
    if (g > 0) setPos({ g: g - 1, s: 0 });
    else setRestart((r) => r + 1);
  }, []);

  const goNext = useCallback(() => {
    const { g, s } = posRef.current;
    if (s < groups[g].items.length - 1) setPos({ g, s: s + 1 });
    else goNextGroup();
  }, [groups, goNextGroup]);

  const goPrev = useCallback(() => {
    const { g, s } = posRef.current;
    if (s > 0) setPos({ g, s: s - 1 });
    else goPrevGroup();
  }, [goPrevGroup]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  // auto advance
  useEffect(() => {
    setProgress(0);
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) elapsed += dt;
      const p = Math.min(1, elapsed / STORY_DURATION);
      setProgress(p);
      if (p >= 1) {
        goNextRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pos.g, pos.s, restart]);

  // mark this creator as seen
  useEffect(() => {
    if (group) onViewed?.(group.key);
  }, [group, onViewed]);

  // preload the next image so sliding feels instant
  useEffect(() => {
    const next =
      group?.items[pos.s + 1]?.image ?? groups[pos.g + 1]?.items[0]?.image;
    if (next) {
      const img = new Image();
      img.src = next;
    }
  }, [group, groups, pos.g, pos.s]);

  // lock scroll + keyboard
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNextRef.current();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, goPrev]);

  if (!group || !item) return null;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    pausedRef.current = true;
    setDrag({ x: 0, y: 0, active: true });
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = startRef.current;
    if (!s) return;
    setDrag({ x: e.clientX - s.x, y: e.clientY - s.y, active: true });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const s = startRef.current;
    startRef.current = null;
    pausedRef.current = false;
    setDrag({ x: 0, y: 0, active: false });
    if (!s) return;

    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const elapsed = Date.now() - s.t;

    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNextGroup();
      else goPrevGroup();
    } else if (dy > 110 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
    } else if (Math.hypot(dx, dy) < 12 && elapsed < 350) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientX - rect.left < rect.width * 0.35) goPrev();
      else goNext();
    }
  }

  function onPointerCancel() {
    startRef.current = null;
    pausedRef.current = false;
    setDrag({ x: 0, y: 0, active: false });
  }

  const horizontal = Math.abs(drag.x) > Math.abs(drag.y);
  const tx = horizontal ? drag.x : 0;
  const ty = !horizontal && drag.y > 0 ? drag.y : 0;
  const fade = ty > 0 ? Math.max(0.4, 1 - ty / 500) : 1;

  return (
    <div className="fixed inset-0 z-[90] bg-black" role="dialog" aria-modal="true" aria-label={`${group.name}'s status`}>
      <style>{`@keyframes storyIn{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}`}</style>

      <div
        className="relative mx-auto h-full w-full max-w-[480px] touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          transform: `translate(${tx}px, ${ty}px)`,
          opacity: fade,
          transition: drag.active ? "none" : "transform .2s ease, opacity .2s ease",
        }}
      >
        {/* blurred copy fills the screen behind the real picture */}
        <img
          key={`bg-${pos.g}-${pos.s}`}
          src={item.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
          draggable={false}
        />
        <img
          key={`img-${pos.g}-${pos.s}`}
          src={item.image}
          alt={item.title || `${group.name}'s status`}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ animation: "storyIn .25s ease" }}
          draggable={false}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/80 to-transparent" />

        {/* progress bars: one per status of this person */}
        <div className="absolute inset-x-3 top-3 z-10 flex gap-1.5 pt-[env(safe-area-inset-top)]">
          {group.items.map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: i < pos.s ? "100%" : i === pos.s ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute inset-x-3 top-8 z-10 flex items-center gap-3 pt-[env(safe-area-inset-top)]">
          <Face
            src={group.image}
            name={group.name}
            className="h-10 w-10 border-2 border-white/80"
            textClass="text-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white drop-shadow">{group.name}</p>
            <p className="text-xs text-white/75">
              {agoLabel(item.createdAt) || "Status"}
              {group.items.length > 1 ? ` · ${pos.s + 1}/${group.items.length}` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close status"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* caption */}
        {(item.title || item.tag) && (
          <div className="absolute inset-x-4 bottom-8 z-10 pb-[env(safe-area-inset-bottom)]">
            {item.tag && (
              <span className="mb-2 inline-block rounded-full bg-[#1c9d57] px-2.5 py-1 text-[11px] font-bold text-white">
                {item.tag}
              </span>
            )}
            {item.title && (
              <p className="text-lg font-semibold leading-snug text-white drop-shadow">{item.title}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}