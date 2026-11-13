import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { UnsubscribeHistoryEntry } from '../extension/types';

interface UnsubscribeHistoryChartProps {
  entries: UnsubscribeHistoryEntry[];
}

type ChartMode = 'cumulative' | 'interval';

interface CumulativePoint {
  date: Date;
  count: number;
  channelName: string;
}

interface BucketBar {
  x0: Date;
  x1: Date;
  count: number;
}

const CHART_WIDTH = 386;
const CHART_HEIGHT = 152;
const MARGIN = { top: 12, right: 12, bottom: 24, left: 30 };
const INNER_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

function formatAxisTick(date: Date, spanMs: number): string {
  if (spanMs <= 1000 * 60 * 60 * 2) {
    return d3.timeFormat('%H:%M:%S')(date);
  }
  if (spanMs <= 1000 * 60 * 60 * 48) {
    return d3.timeFormat('%b %d %H:%M')(date);
  }
  return d3.timeFormat('%b %d')(date);
}

function formatTooltipTime(date: Date, spanMs: number): string {
  if (spanMs <= 1000 * 60 * 60 * 24) {
    return d3.timeFormat('%b %d, %H:%M:%S')(date);
  }
  return d3.timeFormat('%b %d, %Y %H:%M')(date);
}

export const UnsubscribeHistoryChart: React.FC<UnsubscribeHistoryChartProps> = ({
  entries,
}) => {
  const [chartMode, setChartMode] = useState<ChartMode>('cumulative');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.unsubscribedAt - b.unsubscribedAt),
    [entries],
  );

  const chartData = useMemo(() => {
    if (sorted.length === 0) {
      return null;
    }

    const minTs = sorted[0].unsubscribedAt;
    const maxTs = sorted[sorted.length - 1].unsubscribedAt;
    const rawSpan = maxTs - minTs;
    const padMs = rawSpan === 0 ? 30_000 : Math.max(2_000, Math.round(rawSpan * 0.08));
    const domainStart = new Date(minTs - padMs);
    const domainEnd = new Date(maxTs + padMs);
    const spanMs = domainEnd.getTime() - domainStart.getTime();

    const xScale = d3
      .scaleTime()
      .domain([domainStart, domainEnd])
      .range([0, INNER_WIDTH]);

    const cumulativePoints: CumulativePoint[] = sorted.map((item, idx) => ({
      date: new Date(item.unsubscribedAt),
      count: idx + 1,
      channelName: item.name,
    }));

    // Adaptive D3 histogram binning for per-interval counts
    const bucketCount = Math.min(12, Math.max(4, Math.ceil(sorted.length / 1.5)));
    const thresholds = xScale.ticks(bucketCount);
    const binner = d3
      .bin<UnsubscribeHistoryEntry, Date>()
      .value((d) => new Date(d.unsubscribedAt))
      .domain([domainStart, domainEnd])
      .thresholds(thresholds);

    const bins = binner(sorted);
    const bars: BucketBar[] = bins.map((b) => ({
      x0: b.x0 ?? domainStart,
      x1: b.x1 ?? domainEnd,
      count: b.length,
    }));

    const maxBarCount = d3.max(bars, (b) => b.count) ?? 1;
    const maxCumCount = cumulativePoints.length;

    const yMax =
      chartMode === 'cumulative'
        ? Math.max(2, maxCumCount)
        : Math.max(2, maxBarCount);

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([INNER_HEIGHT, 0]);

    const lineGenerator = d3
      .line<CumulativePoint>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    const areaGenerator = d3
      .area<CumulativePoint>()
      .x((d) => xScale(d.date))
      .y0(INNER_HEIGHT)
      .y1((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    const xTicks = xScale.ticks(3);
    const yTicks = yScale.ticks(3).filter((t) => Number.isInteger(t));

    return {
      spanMs,
      xScale,
      yScale,
      cumulativePoints,
      bars,
      linePath: lineGenerator(cumulativePoints) ?? '',
      areaPath: areaGenerator(cumulativePoints) ?? '',
      xTicks,
      yTicks,
    };
  }, [chartMode, sorted]);

  if (!chartData) {
    return null;
  }

  const activePoint =
    chartMode === 'cumulative' && hoveredIdx !== null
      ? chartData.cumulativePoints[hoveredIdx] ?? null
      : null;
  const activeBar =
    chartMode === 'interval' && hoveredIdx !== null
      ? chartData.bars[hoveredIdx] ?? null
      : null;

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-zinc-900">
            Unsubscribes Over Time
          </div>
          <div className="text-[11px] text-zinc-500 truncate tabular-nums">
            {activePoint
              ? `${activePoint.channelName} · #${activePoint.count} · ${formatTooltipTime(
                  activePoint.date,
                  chartData.spanMs,
                )}`
              : activeBar
                ? `${activeBar.count} channel${activeBar.count === 1 ? '' : 's'} · ${formatTooltipTime(
                    activeBar.x0,
                    chartData.spanMs,
                  )}`
                : `${sorted.length} total unsubscribed`}
          </div>
        </div>

        <div className="flex items-center gap-0.5 p-0.5 bg-zinc-100 rounded-md shrink-0">
          {(
            [
              { id: 'cumulative', label: 'Cumulative' },
              { id: 'interval', label: 'Intervals' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setChartMode(mode.id);
                setHoveredIdx(null);
              }}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                chartMode === mode.id
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-auto overflow-visible select-none"
        role="img"
        aria-label="D3 chart showing number of YouTube channels unsubscribed over time"
      >
        <defs>
          <linearGradient id="ytbu-history-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Horizontal gridlines & Y-axis labels */}
          {chartData.yTicks.map((tick) => {
            const y = chartData.yScale(tick);
            return (
              <g key={`y-${tick}`} transform={`translate(0,${y})`}>
                <line
                  x1={0}
                  x2={INNER_WIDTH}
                  y1={0}
                  y2={0}
                  stroke="#e4e4e7"
                  strokeDasharray={tick === 0 ? undefined : '2,2'}
                />
                <text
                  x={-6}
                  y={3}
                  textAnchor="end"
                  className="fill-zinc-400 text-[9px] font-mono tabular-nums"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* X-axis baseline & time ticks */}
          <line
            x1={0}
            x2={INNER_WIDTH}
            y1={INNER_HEIGHT}
            y2={INNER_HEIGHT}
            stroke="#d4d4d8"
          />
          {chartData.xTicks.map((tick, i) => {
            const x = chartData.xScale(tick);
            return (
              <g key={`x-${i}`} transform={`translate(${x},${INNER_HEIGHT})`}>
                <line y1={0} y2={4} stroke="#d4d4d8" />
                <text
                  y={15}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[9px] font-mono tabular-nums"
                >
                  {formatAxisTick(tick, chartData.spanMs)}
                </text>
              </g>
            );
          })}

          {chartMode === 'cumulative' ? (
            <>
              <path d={chartData.areaPath} fill="url(#ytbu-history-fill)" />
              <path
                d={chartData.linePath}
                fill="none"
                stroke="#dc2626"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chartData.cumulativePoints.map((pt, idx) => {
                const cx = chartData.xScale(pt.date);
                const cy = chartData.yScale(pt.count);
                const isHovered = hoveredIdx === idx;
                return (
                  <g key={`pt-${idx}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 4.5 : 2.75}
                      fill={isHovered ? '#dc2626' : '#ffffff'}
                      stroke="#dc2626"
                      strokeWidth={1.75}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={9}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  </g>
                );
              })}
            </>
          ) : (
            chartData.bars.map((bar, idx) => {
              const x0 = chartData.xScale(bar.x0);
              const x1 = chartData.xScale(bar.x1);
              const barWidth = Math.max(4, x1 - x0 - 3);
              const barHeight = Math.max(
                bar.count > 0 ? 2 : 0,
                INNER_HEIGHT - chartData.yScale(bar.count),
              );
              const y = INNER_HEIGHT - barHeight;
              const isHovered = hoveredIdx === idx;

              return (
                <rect
                  key={`bar-${idx}`}
                  x={x0 + 1.5}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  fill={isHovered ? '#b91c1c' : '#dc2626'}
                  opacity={bar.count === 0 ? 0 : isHovered ? 1 : 0.85}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })
          )}
        </g>
      </svg>
    </div>
  );
};
