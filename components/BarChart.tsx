/**
 * Server-rendered bars, one per day, up to four series stacked side by side.
 *
 * SVG with no script, like the history chart: the dashboard is a page, not an
 * app, and a chart that needs hydration to appear is a chart that is blank
 * for the crawler and for anyone on a slow connection.
 */
export type ChartSeries = { key: string; label: string; color: string; values: number[] };

export default function BarChart({ days, series, height = 180 }: { days: string[]; series: ChartSeries[]; height?: number }) {
  const width = 960;
  const padL = 36;
  const padB = 22;
  const padT = 10;
  const innerW = width - padL - 8;
  const innerH = height - padB - padT;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const groupW = innerW / Math.max(1, days.length);
  const barW = Math.max(1, (groupW - 3) / Math.max(1, series.length));
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const labelEvery = days.length > 14 ? Math.ceil(days.length / 10) : 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={series.map((s) => `${s.label}: ${s.values.reduce((a, b) => a + b, 0)}`).join(", ")} style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10 }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={width - 8} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={1} />
          <text x={padL - 6} y={y(t) + 3} textAnchor="end" fill="var(--muted)">
            {t}
          </text>
        </g>
      ))}
      {days.map((day, i) => (
        <g key={day}>
          {series.map((s, j) => {
            const v = s.values[i] ?? 0;
            const x = padL + i * groupW + j * barW + 1.5;
            return v > 0 ? <rect key={s.key} x={x} y={y(v)} width={barW} height={Math.max(1, padT + innerH - y(v))} fill={s.color} rx={1}>
              <title>{`${day} ${s.label}: ${v}`}</title>
            </rect> : null;
          })}
          {i % labelEvery === 0 ? (
            <text x={padL + i * groupW + groupW / 2} y={height - 6} textAnchor="middle" fill="var(--muted)">
              {day.slice(5)}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
