import { useEffect, useMemo, useRef, useState } from "react";

type Season = "winter" | "spring" | "summer" | "autumn";

function getSeason(month: number): Season {
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

// Each season: start month, end month, emoji for falling, emoji for ground, gradient
const SEASONS: Record<Season, {
  startMonth: number;
  endMonth: number;
  falling: string[];
  ground: string[];
  groundColor: string;
  skyGradient: string;
  transitionMsg: string;
}> = {
  winter: {
    startMonth: 11, endMonth: 1,
    falling: ["❄", "❅", "❆"],
    ground: ["❄", "❅", "❆", "white"],
    groundColor: "rgba(180,210,240,0.12)",
    skyGradient: "linear-gradient(180deg, rgba(60,100,160,0.08) 0%, transparent 40%)",
    transitionMsg: "❄ Зима наступает...",
  },
  spring: {
    startMonth: 2, endMonth: 4,
    falling: ["🌸", "🍃", "✿"],
    ground: ["🌸", "🍃", "✿", "green"],
    groundColor: "rgba(120,200,80,0.10)",
    skyGradient: "linear-gradient(180deg, rgba(100,200,100,0.07) 0%, transparent 40%)",
    transitionMsg: "🌸 Весна приходит...",
  },
  summer: {
    startMonth: 5, endMonth: 7,
    falling: ["☀", "✦", "✧"],
    ground: ["☀", "✦", "✧", "gold"],
    groundColor: "rgba(255,200,50,0.08)",
    skyGradient: "linear-gradient(180deg, rgba(255,200,50,0.06) 0%, transparent 40%)",
    transitionMsg: "☀ Лето начинается...",
  },
  autumn: {
    startMonth: 8, endMonth: 10,
    falling: ["🍂", "🍁", "🌿"],
    ground: ["🍂", "🍁", "🌿", "brown"],
    groundColor: "rgba(200,100,30,0.10)",
    skyGradient: "linear-gradient(180deg, rgba(200,100,30,0.07) 0%, transparent 40%)",
    transitionMsg: "🍂 Осень приближается...",
  },
};

// How far through the season are we? 0 = Sept 1, 1 = Nov 30 (for autumn)
// Uses the actual season boundaries instead of a fixed 91-day assumption.
function getSeasonProgress(month: number): number {
  const s = getSeason(month);
  const info = SEASONS[s];
  const now = new Date();
  const startMonth = info.startMonth;
  // Total days in the season (3 consecutive months)
  let totalDays = 0;
  for (let i = 0; i < 3; i++) {
    const m = (startMonth + i) % 12;
    totalDays += new Date(now.getFullYear(), m + 1, 0).getDate();
  }
  // Days elapsed since season start
  let elapsed = 0;
  for (let i = 0; i < 3; i++) {
    const m = (startMonth + i) % 12;
    if (m === month) {
      elapsed += now.getDate();
      break;
    }
    elapsed += new Date(now.getFullYear(), m + 1, 0).getDate();
  }
  return Math.min(1, elapsed / totalDays);
}

// Seeded random
function rng(seed: number, i: number): number {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Generate ground elements: leaves pile up from the bottom edge following a
// wavy "hill" profile — some spots are taller, some lower, like real leaf drifts.
interface GroundElement {
  id: number;
  emoji: string;
  left: number;
  bottom: number;
  size: number;
  opacity: number;
  rotate: number;
}

const ROW_HEIGHT_VH = 2;     // nominal layer height in % of screen height

// Leaves per row depends on screen width — dense packing (~13px apart)
function leavesPerRowFor(width: number): number {
  return Math.max(30, Math.round(width / 13));
}

// Rolling-drift terrain profile: 0..1 height per x-position (0=left, 1=right).
// Gentle overlapping waves = soft uneven drifts (no deep dips or bare gaps),
// fixed per season so the shape stays consistent day to day.
function hillHeight(x: number, seed: number): number {
  const p1 = rng(seed, 991) * Math.PI * 2;
  const p2 = rng(seed, 992) * Math.PI * 2;
  const p3 = rng(seed, 995) * Math.PI * 2;
  const f1 = 0.9 + rng(seed, 993) * 0.8;   // one big slow swell
  const f2 = 2.2 + rng(seed, 994) * 1.5;   // a couple of medium drifts
  const f3 = 5 + rng(seed, 996) * 3;       // small ripples on top
  const h = 0.8 + 0.12 * Math.sin(x * Math.PI * 2 * f1 + p1)
              + 0.06 * Math.sin(x * Math.PI * 2 * f2 + p2)
              + 0.03 * Math.sin(x * Math.PI * 2 * f3 + p3);
  return Math.min(1, Math.max(0.45, h));
}

// Solid carpet: place leaves on a dense grid column by column, filling every
// column from the bottom up to its own terrain line — no holes, wavy top edge.
function generateGroundElements(season: Season, perRow: number, seed: number, progress: number): GroundElement[] {
  const emojis = SEASONS[season].ground.filter((e) => e.length <= 2); // exclude color names
  const out: GroundElement[] = [];
  let id = 0;
  for (let c = 0; c < perRow; c++) {
    const x = (c + 0.5) / perRow;
    const topPct = hillHeight(x, seed) * progress * 100;   // pile height at this column, % of screen
    const rowsHere = Math.ceil(topPct / ROW_HEIGHT_VH);
    for (let r = 0; r < rowsHere; r++) {
      const i = id;
      out.push({
        id,
        emoji: emojis[Math.floor(rng(seed, i * 3) * emojis.length)],
        left: x * 100 + (rng(seed, i * 1) - 0.5) * 1.6,     // horizontal jitter, neighbours overlap
        bottom: Math.min(r * ROW_HEIGHT_VH + rng(seed, i * 2) * ROW_HEIGHT_VH, topPct),
        size: 20 + rng(seed, i * 4) * 14,
        opacity: 0.55 + rng(seed, i * 5) * 0.4,
        rotate: rng(seed, i * 6) * 360,
      });
      id++;
    }
    // Sparse fringe above the drift line: a few loose leaves soften the edge
    if (progress > 0.05 && rng(seed, 700 + c) < 0.45) {
      const i = id;
      out.push({
        id,
        emoji: emojis[Math.floor(rng(seed, i * 3) * emojis.length)],
        left: x * 100 + (rng(seed, i * 1) - 0.5) * 2.2,
        bottom: topPct + rng(seed, i * 2) * ROW_HEIGHT_VH * 1.2,
        size: 14 + rng(seed, i * 4) * 10,
        opacity: 0.35 + rng(seed, i * 5) * 0.3,
        rotate: rng(seed, i * 6) * 360,
      });
      id++;
    }
  }
  return out;
}

// Transition overlay
function TransitionFlash({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(10,10,18,0.85)", backdropFilter: "blur(12px)",
      animation: "fadeFlash 3s ease-in-out forwards",
    }}>
      <div style={{
        fontSize: 26, fontWeight: 700, color: "#e8e8f0",
        textShadow: "0 0 20px rgba(108,159,255,0.4)",
        animation: "scaleIn 0.6s ease-out",
      }}>
        {msg}
      </div>
      <style>{`
        @keyframes fadeFlash { 0%{opacity:0} 15%{opacity:1} 75%{opacity:1} 100%{opacity:0;pointer-events:none} }
        @keyframes scaleIn { 0%{transform:scale(0.7);opacity:0} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}

export default function SeasonalBackground() {
  const now = new Date();
  const month = now.getMonth();
  const season = getSeason(month);
  const info = SEASONS[season];
  const progress = getSeasonProgress(month); // 0..1
  // Leaves pile up faster early in the season so day-to-day change is clearly
  // visible: ~35% of the screen by Sept 8, ~42% by Sept 13, full by mid-October
  // (linear progress would give only 9%→14% — imperceptible day to day).
  const groundProgress = Math.pow(progress, 0.45);

  // Track screen size so leaf density adapts (tight rows on any device)
  const [screen, setScreen] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setScreen({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const perRow = leavesPerRowFor(screen.w);
  const seed = now.getFullYear() * 12 + month;

  const groundElements = useMemo(
    () => generateGroundElements(season, perRow, seed, groundProgress),
    [season, perRow, seed, groundProgress]
  );

  // Falling particles: more as season progresses
  const fallingCount = Math.max(4, Math.round(groundProgress * 30));

  const [prevSeason, setPrevSeason] = useState<Season>(season);
  const [showTransition, setShowTransition] = useState(false);

  // Unexpected wind gusts: 6 leaves shoot from a random top corner (left/right)
  // at high speed. Purely visual — does not affect ground accumulation.
  const [gusts, setGusts] = useState<{ id: number; side: 1 | -1; leaves: number[] }[]>([]);
  const gustId = useRef(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      // Next gust in 6–15 s
      timeout = setTimeout(() => {
        const side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const leaves = Array.from({ length: 6 }, () => Math.random() * 10000);
        const id = gustId.current++;
        setGusts((prev) => [...prev.slice(-2), { id, side, leaves }]);
        // Remove the gust after its animation finishes
        setTimeout(() => {
          setGusts((prev) => prev.filter((g) => g.id !== id));
        }, 6000);
        schedule();
      }, 6000 + Math.random() * 9000);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const check = () => {
      const m = new Date().getMonth();
      const s = getSeason(m);
      if (s !== prevSeason) {
        setPrevSeason(s);
        setShowTransition(true);
      }
    };
    const i = setInterval(check, 60_000);
    return () => clearInterval(i);
  }, [prevSeason]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Sky gradient */}
      <div style={{ position: "absolute", inset: 0, background: info.skyGradient }} />

      {/* Falling particles from above */}
      {Array.from({ length: fallingCount }, (_, i) => {
        const e = info.falling[i % info.falling.length];
        const left = rng(seed + 1000, i * 1) * 100;
        const size = 12 + rng(seed + 1000, i * 2) * 18;
        // Wide speed variety: some fall fast (4s), some drift slowly (30s)
        const dur = 4 + Math.pow(rng(seed + 1000, i * 3), 2) * 26;
        const delay = rng(seed + 1000, i * 4) * 14;
        const dx = (rng(seed + 1000, i * 8) - 0.5) * 160; // random drift direction
        return (
          <span key={`f-${i}`} style={{
            position: "absolute", left: `${left}%`, top: -50, fontSize: size,
            ["--dx" as any]: `${dx}px`,
            opacity: 0.15 + rng(seed + 1000, i * 6) * 0.3,
            animation: `pfall ${dur}s linear ${delay}s infinite, psway ${2 + rng(seed + 1000, i * 7) * 4}s ease-in-out ${delay}s infinite, pdrift ${6 + rng(seed + 1000, i * 9) * 10}s ease-in-out ${delay}s infinite`,
          }}>{e}</span>
        );
      })}

      {/* Ground layer — fallen elements accumulating, fills up to 100% of screen */}
      <div style={{
        position: "absolute", inset: 0,
        opacity: Math.min(1, 0.3 + groundProgress * 0.7),
        transition: "opacity 2s ease",
      }}>
        {groundElements.map((el) => (
          <span key={el.id} style={{
            position: "absolute",
            left: `${el.left}%`,
            bottom: `${el.bottom}%`,
            fontSize: el.size,
            opacity: el.opacity,
            transform: `rotate(${el.rotate}deg)`,
          }}>{el.emoji}</span>
        ))}
      </div>

      {/* Foreground layer — falling leaves above the content (visible over posts, esp. mobile) */}
      <div style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: Math.min(12, fallingCount) }, (_, i) => {
          const e = info.falling[(i + 1) % info.falling.length];
          const left = rng(seed + 2000, i * 1) * 100;
          const size = 14 + rng(seed + 2000, i * 2) * 16;
          const dur = 5 + Math.pow(rng(seed + 2000, i * 3), 2) * 22;
          const delay = rng(seed + 2000, i * 4) * 16;
          const dx = (rng(seed + 2000, i * 8) - 0.5) * 140;
          return (
            <span key={`ff-${i}`} style={{
              position: "absolute", left: `${left}%`, top: -50, fontSize: size,
              ["--dx" as any]: `${dx}px`,
              opacity: 0.2 + rng(seed + 2000, i * 6) * 0.25,
              animation: `pfall ${dur}s linear ${delay}s infinite, psway ${2 + rng(seed + 2000, i * 7) * 4}s ease-in-out ${delay}s infinite, pdrift ${6 + rng(seed + 2000, i * 9) * 10}s ease-in-out ${delay}s infinite`,
            }}>{e}</span>
          );
        })}
      </div>

      {/* Transition */}
      {showTransition && (
        <TransitionFlash msg={SEASONS[prevSeason].transitionMsg} onDone={() => setShowTransition(false)} />
      )}

      {/* Wind gusts — 6 fast leaves from a random top corner, over everything */}
      <div style={{ position: "fixed", inset: 0, zIndex: 45, pointerEvents: "none", overflow: "hidden" }}>
        {gusts.map((g) =>
          g.leaves.map((off, i) => {
            const e = info.falling[(i + 1) % info.falling.length];
            const top = 5 + (off % 45); // 5–50% from the top
            const size = 16 + ((off % 100) / 100) * 14;
            const dur = 1.6 + ((off % 37) / 37) * 1.4; // fast: 1.6–3s across the screen
            return (
              <span key={`g-${g.id}-${i}`} style={{
                position: "absolute", top: `${top}%`, fontSize: size,
                [g.side === 1 ? "left" : "right"]: -60,
                opacity: 0.5 + ((off % 53) / 53) * 0.35,
                animation: `gustfly${g.side === 1 ? "R" : "L"} ${dur}s linear forwards, gspin ${0.5 + ((off % 17) / 17) * 0.6}s linear infinite`,
              }}>{e}</span>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes pfall { 0%{transform:translateY(-50px) rotate(0)} 100%{transform:translateY(calc(100vh + 50px)) rotate(360deg)} }
        @keyframes psway { 0%,100%{margin-left:0} 50%{margin-left:var(--sw,30px)} }
        @keyframes pdrift { 0%{translate:0 0} 25%{translate:var(--dx,40px) 0} 50%{translate:calc(var(--dx,40px) * -0.6) 0} 75%{translate:calc(var(--dx,40px) * 0.8) 0} 100%{translate:0 0} }
        @keyframes gustflyR { 0%{transform:translateX(0) translateY(0)} 100%{transform:translateX(calc(100vw + 160px)) translateY(30vh)} }
        @keyframes gustflyL { 0%{transform:translateX(0) translateY(0)} 100%{transform:translateX(calc(-100vw - 160px)) translateY(30vh)} }
        @keyframes gspin { 0%{margin-left:0; margin-top:0} 25%{margin-left:-18px; margin-top:8px} 50%{margin-left:6px; margin-top:-6px} 75%{margin-left:-10px; margin-top:4px} 100%{margin-left:0; margin-top:0} }
      `}</style>
    </div>
  );
}
