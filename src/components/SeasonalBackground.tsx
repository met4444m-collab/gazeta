import { useMemo } from "react";

type Season = "winter" | "spring" | "summer" | "autumn";

function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

const SEASON_CONFIG: Record<Season, {
  color: string;
  particleColor: string;
  particleCount: number;
  particleSize: [number, number];
  speed: [number, number];
  emoji: string;
}> = {
  winter: {
    color: "rgba(168, 212, 240, 0.08)",
    particleColor: "rgba(200, 220, 255, 0.5)",
    particleCount: 40,
    particleSize: [3, 8],
    speed: [8, 20],
    emoji: "❄️",
  },
  spring: {
    color: "rgba(125, 216, 125, 0.06)",
    particleColor: "rgba(200, 230, 150, 0.4)",
    particleCount: 25,
    particleSize: [4, 10],
    speed: [12, 25],
    emoji: "🌸",
  },
  summer: {
    color: "rgba(255, 215, 0, 0.05)",
    particleColor: "rgba(255, 220, 100, 0.3)",
    particleCount: 15,
    particleSize: [2, 5],
    speed: [15, 30],
    emoji: "☀️",
  },
  autumn: {
    color: "rgba(232, 132, 60, 0.06)",
    particleColor: "rgba(220, 140, 60, 0.4)",
    particleCount: 30,
    particleSize: [5, 12],
    speed: [10, 22],
    emoji: "🍂",
  },
};

export default function SeasonalBackground() {
  const season = useMemo(() => getCurrentSeason(), []);
  const config = SEASON_CONFIG[season];

  const particles = useMemo(() => {
    return Array.from({ length: config.particleCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: config.particleSize[0] + Math.random() * (config.particleSize[1] - config.particleSize[0]),
      speed: config.speed[0] + Math.random() * (config.speed[1] - config.speed[0]),
      delay: Math.random() * config.speed[1],
      opacity: 0.2 + Math.random() * 0.6,
    }));
  }, [config]);

  return (
    <div
      className="season-bg"
      style={{ "--season-color": config.color, "--season-particle": config.particleColor } as React.CSSProperties}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="season-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
