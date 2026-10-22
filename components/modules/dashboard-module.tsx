"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { AlertTriangle, Banknote, CircleCheck, Gauge, HandCoins, Info, ListChecks, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ContractRecord = { status: string };

type FinancialUtilizationPoint = {
  key: string;
  code: string;
  title: string;
  progressPercent: number;
  utilizationPercent: number;
  allocatedMnt: number;
  commitmentMnt: number;
  expenditureMnt: number;
};

function GoalBudgetVariance({ goalRows, metadataLabel }: any) {
  const varianceRows = goalRows.map((row: any) => {
    const hasBudget = row.budgetMnt > 0;
    const utilizationPercent = hasBudget
      ? Math.round(((row.commitmentMnt + row.expenditureMnt) / row.budgetMnt) * 100)
      : 0;
    const variance = utilizationPercent - row.progress;
    const category = !hasBudget
      ? "unavailable"
      : variance < -25
        ? "behind"
        : variance > 25
          ? "ahead"
          : "aligned";
    return { ...row, hasBudget, utilizationPercent, variance, category };
  });

  return (
    <section className="h-full overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_10px_28px_rgba(20,36,27,0.05)]" aria-label="Budget variance by goal">
      <div className="border-b border-[#e3e9e1] bg-gradient-to-r from-[#f3f8f0] to-white px-4 py-3">
        <h3 className="font-black text-[#183529]">Budget variance by goal</h3>
        <p className="mt-0.5 text-xs leading-4 text-[#718178]">
          Financial utilization minus activity progress.
        </p>
      </div>

      <div className="space-y-3.5 p-4">
        {varianceRows.map((row: any) => {
          const clampedVariance = Math.max(-100, Math.min(100, row.variance));
          const left = row.hasBudget
            ? clampedVariance < 0
              ? 50 + clampedVariance / 2
              : 50
            : 50;
          const width = row.hasBudget ? Math.abs(clampedVariance) / 2 : 0;
          const barClass =
            row.category === "behind"
              ? "bg-rose-500"
              : row.category === "ahead"
                ? "bg-amber-500"
                : row.category === "aligned"
                  ? "bg-[#2c795a]"
                  : "bg-[#9ba9a0]";
          const valueClass =
            row.category === "behind"
              ? "text-rose-700"
              : row.category === "ahead"
                ? "text-amber-700"
                : row.category === "aligned"
                  ? "text-[#245f47]"
                  : "text-[#718178]";
          const label = row.goal === "All goals" ? "Cross-goal" : metadataLabel("goal", row.goal);

          return (
            <div key={row.goal}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-[#183529]" title={label}>{label}</p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-[#718178]">
                    {row.progress}% progress · {row.hasBudget ? `${row.utilizationPercent}% utilized` : "No budget"}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-black tabular-nums ${valueClass}`}>
                  {row.hasBudget ? `${row.variance > 0 ? "+" : row.variance < 0 ? "−" : ""}${Math.abs(row.variance)} pp` : "—"}
                </span>
              </div>
              <div
                className="relative mt-1.5 h-5 overflow-hidden rounded-md bg-[linear-gradient(to_right,#fff1f3_0%,#fff1f3_37.5%,#edf6ef_37.5%,#edf6ef_62.5%,#fff6e7_62.5%,#fff6e7_100%)]"
                role="img"
                aria-label={row.hasBudget ? `${label}: financial utilization is ${Math.abs(row.variance)} percentage points ${row.variance < 0 ? "behind" : row.variance > 0 ? "ahead of" : "aligned with"} progress` : `${label}: no budget is recorded`}
              >
                <span className="absolute inset-y-0 left-[37.5%] border-l border-dashed border-[#b9c6bb]" />
                <span className="absolute inset-y-0 left-1/2 border-l-2 border-[#789083]" />
                <span className="absolute inset-y-0 left-[62.5%] border-l border-dashed border-[#b9c6bb]" />
                {row.hasBudget ? (
                  <span
                    className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full ${barClass}`}
                    style={{ left: `${left}%`, width: `${Math.max(width, row.variance === 0 ? 0 : 1)}%` }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
        <div className="grid grid-cols-3 gap-1.5 border-t border-[#dfe7dd] pt-3 text-center text-[9px] font-bold leading-3 text-[#718178]">
          <span className="text-rose-700">Behind<br />&gt;25 pp</span>
          <span className="text-[#245f47]">Aligned<br />±25 pp</span>
          <span className="text-amber-700">Ahead<br />&gt;25 pp</span>
        </div>
      </div>
    </section>
  );
}

function FinancialUtilizationScatter({ data, formatMnt }: any) {
  const points = data.points as FinancialUtilizationPoint[];
  const alignedThreshold = 25;
  const highAttentionThreshold = 50;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const plottedPoints = points.filter((point) => point.utilizationPercent > 0);
  const zeroUtilizationPoints = points.filter((point) => point.utilizationPercent === 0);
  const selectedPoint =
    points.find((point) => point.key === selectedKey) ?? points[0] ?? null;
  const maximumUtilization = Math.max(
    100,
    ...points.map((point) => point.utilizationPercent),
  );
  const yMaximum = Math.max(
    100,
    Math.min(200, Math.ceil(maximumUtilization / 25) * 25),
  );
  const plot = { left: 58, top: 18, width: 552, height: 185 };
  const chartWidth = 650;
  const chartHeight = 250;
  const xFor = (value: number) =>
    plot.left + (Math.min(Math.max(value, 0), 100) / 100) * plot.width;
  const yFor = (value: number) =>
    plot.top +
    plot.height -
    (Math.min(Math.max(value, 0), yMaximum) / yMaximum) * plot.height;
  const xTicks = [0, 25, 50, 75, 100];
  const yTicks = Array.from(
    { length: yMaximum / 25 + 1 },
    (_, index) => index * 25,
  );
  const highUseRiskPolygon =
    yMaximum > 100 + alignedThreshold
      ? `${plot.left},${plot.top} ${plot.left + plot.width},${plot.top} ${plot.left + plot.width},${yFor(100 + alignedThreshold)} ${plot.left},${yFor(alignedThreshold)}`
      : `${plot.left},${plot.top} ${xFor(yMaximum - alignedThreshold)},${plot.top} ${plot.left},${yFor(alignedThreshold)}`;
  const lowUseRiskPolygon = `${xFor(alignedThreshold)},${yFor(0)} ${xFor(100)},${yFor(0)} ${xFor(100)},${yFor(100 - alignedThreshold)}`;
  const alignedUpperX = Math.min(100, yMaximum - alignedThreshold);
  const alignedUpperY = Math.min(yMaximum, 100 + alignedThreshold);
  const alignedPolygon = [
    `${xFor(0)},${yFor(0)}`,
    `${xFor(0)},${yFor(alignedThreshold)}`,
    `${xFor(alignedUpperX)},${yFor(alignedUpperY)}`,
    ...(alignedUpperX < 100 ? [`${xFor(100)},${yFor(yMaximum)}`] : []),
    `${xFor(100)},${yFor(100 - alignedThreshold)}`,
    `${xFor(alignedThreshold)},${yFor(0)}`,
  ].join(" ");
  const selectedGap = selectedPoint
    ? selectedPoint.utilizationPercent - selectedPoint.progressPercent
    : 0;

  function pointSeverity(point: FinancialUtilizationPoint) {
    const gap = point.utilizationPercent - point.progressPercent;
    if (point.utilizationPercent === 0 || point.utilizationPercent > 100 || Math.abs(gap) > highAttentionThreshold) return "critical";
    if (Math.abs(gap) > alignedThreshold) return "review";
    return "aligned";
  }

  function pointColor(point: FinancialUtilizationPoint) {
    const severity = pointSeverity(point);
    if (severity === "critical") return "#cf2f55";
    if (severity === "review") return "#d97706";
    return "#2c795a";
  }

  const selectedSeverity = selectedPoint ? pointSeverity(selectedPoint) : "aligned";
  const selectedMessage = selectedPoint
    ? selectedPoint.utilizationPercent === 0
      ? "No financial utilization is recorded; review this activity."
      : selectedPoint.utilizationPercent > 100
        ? `Financial utilization is ${selectedPoint.utilizationPercent}%; it exceeds the activity allocation.`
        : selectedGap > alignedThreshold
          ? `Financial utilization is ${selectedGap} percentage points ahead of progress.`
          : selectedGap < -alignedThreshold
            ? `Financial utilization is ${Math.abs(selectedGap)} percentage points behind progress.`
            : "Progress and financial utilization are aligned within ±25 percentage points."
    : "";
  const selectedSeverityLabel =
    selectedSeverity === "critical"
      ? "Critical"
      : selectedSeverity === "review"
        ? "Review"
        : "Aligned";
  const selectedSeverityClass =
    selectedSeverity === "critical"
      ? "bg-rose-50 text-rose-700"
      : selectedSeverity === "review"
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e3e9e1] bg-gradient-to-r from-[#f3f8f0] to-white px-4 py-3">
        <div>
          <h2 className="font-black">Progress versus financial utilization</h2>
          <p className="mt-0.5 text-xs text-[#718178]">
            Main activity progress compared with commitments and expenditure as a share of allocation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-[#5d7467]">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#2c795a]" />Aligned (±25 pp)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" />Review (26–50 pp)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#cf2f55]" />Critical variance / no utilization</span>
        </div>
      </div>

      {points.length ? (
        <div>
          <div className="min-w-0">
            <div className="overflow-x-auto px-3 pb-1 pt-2">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="mx-auto min-w-[590px]"
                role="img"
                aria-label={`Scatter chart of ${plottedPoints.length} activities comparing delivery progress with financial utilization`}
              >
                <polygon points={highUseRiskPolygon} fill="#cf2f55" fillOpacity="0.045" />
                <polygon points={lowUseRiskPolygon} fill="#cf2f55" fillOpacity="0.045" />
                <polygon points={alignedPolygon} fill="#2c795a" fillOpacity="0.065" />
                {xTicks.map((tick) => (
                  <g key={`x-${tick}`}>
                    <line
                      x1={xFor(tick)}
                      y1={plot.top}
                      x2={xFor(tick)}
                      y2={plot.top + plot.height}
                      stroke="#dfe6de"
                    />
                    <text
                      x={xFor(tick)}
                      y={plot.top + plot.height + 20}
                      textAnchor="middle"
                      className="fill-[#718178] text-[11px]"
                    >
                      {tick}%
                    </text>
                  </g>
                ))}
                {yTicks.map((tick) => (
                  <g key={`y-${tick}`}>
                    <line
                      x1={plot.left}
                      y1={yFor(tick)}
                      x2={plot.left + plot.width}
                      y2={yFor(tick)}
                      stroke="#dfe6de"
                    />
                    <text
                      x={plot.left - 11}
                      y={yFor(tick) + 4}
                      textAnchor="end"
                      className="fill-[#718178] text-[11px]"
                    >
                      {tick}%
                    </text>
                  </g>
                ))}
                <rect
                  x={plot.left}
                  y={plot.top}
                  width={plot.width}
                  height={plot.height}
                  fill="none"
                  stroke="#cfdacf"
                />
                <line
                  x1={xFor(0)}
                  y1={yFor(0)}
                  x2={xFor(100)}
                  y2={yFor(100)}
                  stroke="#718178"
                  strokeDasharray="6 5"
                  strokeWidth="1.5"
                />
                <text x={xFor(3)} y={yFor(yMaximum - 8)} className="fill-[#a24055] text-[10px] font-bold">
                  Financial use ahead
                </text>
                <text x={xFor(63)} y={yFor(7)} className="fill-[#a24055] text-[10px] font-bold">
                  Financial use behind
                </text>
                <text
                  x={plot.left + plot.width / 2}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  className="fill-[#315845] text-xs font-bold"
                >
                  Activity progress (%)
                </text>
                <text
                  x="18"
                  y={plot.top + plot.height / 2}
                  transform={`rotate(-90 18 ${plot.top + plot.height / 2})`}
                  textAnchor="middle"
                  className="fill-[#315845] text-xs font-bold"
                >
                  Financial utilization (%)
                </text>

                {plottedPoints.map((point) => {
                  const selected = point.key === selectedPoint?.key;
                  const severity = pointSeverity(point);
                  const cx = xFor(point.progressPercent);
                  const cy = yFor(point.utilizationPercent);
                  const radius = severity === "critical" ? 7 : severity === "review" ? 6.5 : 5.5;
                  const opacity = severity === "critical" ? 1 : severity === "review" ? 0.9 : 0.72;
                  return (
                    <g
                      key={point.key}
                      role="button"
                      tabIndex={0}
                      aria-label={`${point.code}: ${point.progressPercent}% progress and ${point.utilizationPercent}% financial utilization`}
                      onClick={() => setSelectedKey(point.key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedKey(point.key);
                        }
                      }}
                      className="cursor-pointer outline-none"
                    >
                      <title>{`${point.code} · ${point.title}\nProgress ${point.progressPercent}% · Financial utilization ${point.utilizationPercent}%`}</title>
                      {selected ? (
                        <circle cx={cx} cy={cy} r="11" fill="none" stroke="#153f30" strokeWidth="2" />
                      ) : null}
                      <circle cx={cx} cy={cy} r={radius} fill={pointColor(point)} fillOpacity={opacity} stroke="white" strokeWidth="2" />
                      <circle cx={cx} cy={cy} r="15" fill="transparent" />
                      {selected ? (
                        <text
                          x={cx > plot.left + plot.width - 72 ? cx - 10 : cx + 10}
                          y={cy - 10}
                          textAnchor={cx > plot.left + plot.width - 72 ? "end" : "start"}
                          className="fill-[#183529] text-[10px] font-black"
                        >
                          {point.code}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>

            {zeroUtilizationPoints.length ? (
              <div className="border-t border-rose-100 bg-rose-50/70 px-3 py-2.5" role="group" aria-label="Activities with no financial utilization">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-black text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {zeroUtilizationPoints.length} {zeroUtilizationPoints.length === 1 ? "activity has" : "activities have"} no financial utilization
                  </span>
                  <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
                    {zeroUtilizationPoints.map((point) => (
                      <button
                        type="button"
                        key={point.key}
                        title={`${point.code} · ${point.title}`}
                        onClick={() => setSelectedKey(point.key)}
                        className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black transition ${point.key === selectedPoint?.key ? "border-rose-600 bg-rose-600 text-white" : "border-rose-200 bg-white text-rose-700 hover:border-rose-400"}`}
                      >
                        {point.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-[#718178]">
          No activities in the selected scope have an allocation available for comparison.
        </div>
      )}

      {selectedPoint ? (
        <div className="grid gap-3 border-t border-[#e3e9e1] bg-[#f8faf7] px-4 py-3 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(90px,auto))] lg:items-center" aria-label={`Selected activity ${selectedPoint.code}`}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#49705c]">{selectedPoint.code}</p>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${selectedSeverityClass}`}>
                {selectedSeverityLabel}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs font-black leading-4 text-[#183529]" title={selectedPoint.title}>{selectedPoint.title}</p>
            <p className={`mt-1 text-[11px] font-bold leading-4 ${selectedSeverity === "critical" ? "text-rose-700" : selectedSeverity === "review" ? "text-amber-700" : "text-[#49705c]"}`}>
              {selectedMessage}
            </p>
          </div>
          {[
            ["Progress", `${selectedPoint.progressPercent}%`],
            ["Utilization", `${selectedPoint.utilizationPercent}%`],
            ["Commitments", formatMnt(selectedPoint.commitmentMnt)],
            ["Expenditure", formatMnt(selectedPoint.expenditureMnt)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-lg border border-[#e0e7de] bg-white px-2.5 py-2">
              <p className="text-[9px] font-semibold text-[#718178]">{label}</p>
              <p className="mt-0.5 break-words text-xs font-black tabular-nums text-[#183529]">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#e3e9e1] px-4 py-2 text-[11px] text-[#718178]">
        <span className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          Utilization = (commitments + expenditure) ÷ allocation
        </span>
        {data.unallocatedCount > 0 ? (
          <span>{data.unallocatedCount} {data.unallocatedCount === 1 ? "activity is" : "activities are"} excluded because no allocation is recorded.</span>
        ) : null}
      </div>
    </section>
  );
}

export default function DashboardModule({
  contractStatusMeta,
  dashboardActivities,
  dashboardContractStats,
  dashboardFinance,
  dashboardFinanceBars,
  dashboardFinancialUtilization,
  deliveryIndicators,
  expenditureForecast,
  formatMnt,
  goal,
  goalRows,
  goals,
  member,
  metadataLabel,
  overallStatusSummary,
  section,
  sectionOptions,
  selectedYear,
  setActiveView,
  setContractStatusFilter,
  setGoal,
  setMember,
  setSection,
  setStatus,
  setWorkplanSection,
  statusChartColor,
  statusKeys,
  teamMembers,
}: any) {
  return (
    <>
<section className="rounded-2xl border border-[#d7ded5] bg-gradient-to-r from-white to-[#f1f6ee] p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between lg:p-5">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-xl font-black">Portfolio dashboard</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  Goal delivery and financial position for {selectedYear}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:flex">
                <NativeSelect
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  className="h-10 min-w-[155px] border-[#ced8cf] bg-[#f8faf7]"
                  aria-label="Filter dashboard by workplan section"
                >
                  <NativeSelectOption value="all">All sections</NativeSelectOption>
                  {sectionOptions.map((item) => (
                    <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="h-10 min-w-[145px] border-[#ced8cf] bg-[#f8faf7]"
                  aria-label="Filter dashboard by goal"
                >
                  <NativeSelectOption value="all">Every goal</NativeSelectOption>
                  {goals.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {value === "All goals" ? "Cross-goal" : metadataLabel("goal", value)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  value={member}
                  onChange={(event) => setMember(event.target.value)}
                  className="h-10 min-w-[230px] border-[#ced8cf] bg-[#f8faf7]"
                  aria-label="Filter dashboard by team member"
                >
                  <NativeSelectOption value="all">All team members</NativeSelectOption>
                  {teamMembers.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {metadataLabel("member_type", item.group)} · {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </section>

            <section className="rounded-3xl border border-[#cbd8cd] bg-gradient-to-br from-[#eaf2e8] to-[#f5f8f3] p-3 shadow-[0_10px_28px_rgba(20,36,27,0.05)] sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                {
                  label: "Budget",
                  value: formatMnt(dashboardFinance.budgetMnt),
                  detail: "Approved budget in selected scope",
                  icon: WalletCards,
                  accent: "bg-[#0c3b2d] text-white",
                },
                {
                  label: "Commitments",
                  value: formatMnt(dashboardFinance.commitmentMnt),
                  detail: `${dashboardFinance.commitmentPercent}% of budget committed`,
                  icon: HandCoins,
                  accent: "bg-[#0c3b2d] text-white",
                },
                {
                  label: "Expenditure",
                  value: formatMnt(dashboardFinance.expenditureMnt),
                  detail: `${dashboardFinance.spentPercent}% of budget spent`,
                  icon: ReceiptText,
                  accent: "bg-[#0c3b2d] text-white",
                },
                {
                  label: "Remaining",
                  value: formatMnt(dashboardFinance.remainingMnt),
                  detail: `${dashboardFinance.remainingPercent}% of budget remaining`,
                  icon: Banknote,
                  accent: "bg-[#0c3b2d] text-white",
                },
                ].map((metric) => (
                  <article
                    key={metric.label}
                    className={`relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-[0_8px_22px_rgba(7,42,31,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(7,42,31,0.18)] ${metric.accent}`}
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <p
                        className={`text-sm font-semibold ${metric.accent.includes("text-white") ? "text-emerald-50/80" : "text-[#5d7467]"}`}
                      >
                        {metric.label}
                      </p>
                      <metric.icon
                        className={`h-5 w-5 ${metric.accent.includes("text-white") ? "text-[#dbf081]" : "text-[#49705c]"}`}
                      />
                    </div>
                    <p className="text-[1.65rem] font-black tracking-[-0.04em] xl:text-3xl">
                      {metric.value}
                    </p>
                    <p
                      className={`mt-1 text-sm ${metric.accent.includes("text-white") ? "text-emerald-50/70" : "text-[#718178]"}`}
                    >
                      {metric.detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
              <article className="rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Financial position</h2>
                    <p className="mt-1 text-sm text-[#718178]">
                      Budget, commitments, expenditure, and remaining balance in the selected scope.
                    </p>
                  </div>
                  <Banknote className="h-5 w-5 text-[#49705c]" />
                </div>
                <div className="mt-5 space-y-4" role="img" aria-label="Horizontal financial position bar chart">
                  {dashboardFinanceBars.map((row) => (
                    <button
                      type="button"
                      key={row.label}
                      onClick={() => {
                        setWorkplanSection("finance");
                        setActiveView("workplan");
                      }}
                      className="block w-full rounded-lg p-1 text-left transition hover:bg-[#f6f9f4]"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="font-bold text-[#315845]">{row.label}</span>
                        <span className={`font-black tabular-nums ${row.value < 0 ? "text-rose-700" : "text-[#183529]"}`}>
                          {formatMnt(row.value)}
                        </span>
                      </div>
                      <div className="h-4 overflow-hidden rounded-full bg-[#edf1eb]">
                        <div
                          className="h-full rounded-full transition-[width]"
                          style={{ width: `${row.width}%`, backgroundColor: row.color }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Contract status</h2>
                    <p className="mt-1 text-sm text-[#718178]">
                      {dashboardContractStats.total} contracts linked to the selected workplan scope.
                    </p>
                  </div>
                  <ReceiptText className="h-5 w-5 text-[#49705c]" />
                </div>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#718178]">
                      Payment progress
                    </p>
                    <p className="mt-1 text-3xl font-black">{dashboardContractStats.progress}%</p>
                  </div>
                  <p className="text-right text-xs leading-5 text-[#718178]">
                    {formatMnt(dashboardContractStats.paidValue)} paid<br />
                    of {formatMnt(dashboardContractStats.totalValue)}
                  </p>
                </div>
                <Progress
                  value={dashboardContractStats.progress}
                  className="mt-3 h-2.5 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                />
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(contractStatusMeta) as ContractRecord["status"][]).map((contractStatus) => (
                    <button
                      type="button"
                      key={contractStatus}
                      onClick={() => {
                        setContractStatusFilter(contractStatus);
                        setActiveView("contracts");
                      }}
                      className="rounded-xl border border-[#e1e7df] bg-[#f8faf7] p-3 text-center transition hover:border-[#9fb3a4] hover:bg-[#f1f6ee]"
                    >
                      <p className="text-2xl font-black">{dashboardContractStats.counts[contractStatus]}</p>
                      <p className="mt-1 text-xs font-bold text-[#5d7467]">
                        {contractStatusMeta[contractStatus].label}
                      </p>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                {
                  label: "Activity progress",
                  value: `${deliveryIndicators.activityProgress}%`,
                  detail: `${dashboardActivities.length} activities`,
                  icon: Gauge,
                },
                {
                  label: "Completion rate",
                  value: `${deliveryIndicators.completionPercent}%`,
                  detail: `${deliveryIndicators.completed} completed`,
                  icon: CircleCheck,
                },
                {
                  label: "Commitment rate",
                  value: `${dashboardFinance.commitmentPercent}%`,
                  detail: "committed ÷ budget",
                  icon: HandCoins,
                },
                {
                  label: "Expenditure rate",
                  value: `${dashboardFinance.spentPercent}%`,
                  detail: "expenditure ÷ budget",
                  icon: TrendingUp,
                },
                {
                  label: "Activities at risk",
                  value: deliveryIndicators.atRisk,
                  detail: `${deliveryIndicators.overdue} overdue at reporting date`,
                  icon: AlertTriangle,
                },
                {
                  label: "Reporting coverage",
                  value: `${deliveryIndicators.reportingPercent}%`,
                  detail: `${dashboardFinance.financeCoveragePercent}% finance-line coverage`,
                  icon: ListChecks,
                },
              ].map((indicator) => (
                <article
                  key={indicator.label}
                  className="rounded-2xl border border-[#d7ded5] bg-gradient-to-br from-white to-[#f7faf5] p-4 shadow-[0_5px_18px_rgba(20,36,27,0.035)] transition hover:-translate-y-0.5 hover:border-[#b6c7b8] hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#5d7467]">
                      {indicator.label}
                    </p>
                    <indicator.icon className="h-4 w-4 text-[#49705c]" />
                  </div>
                  <p className="mt-3 text-2xl font-black">{indicator.value}</p>
                  <p className="mt-1 text-xs leading-5 text-[#718178]">
                    {indicator.detail}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
              <article className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                <div className="border-b border-[#e3e9e1] bg-gradient-to-r from-[#f3f8f0] to-white px-5 py-4">
                  <h2 className="text-lg font-black">Overall activity status</h2>
                  <p className="mt-1 text-sm text-[#718178]">
                    Status distribution for the selected section, goal, and owner filters.
                  </p>
                </div>
                <div className="grid gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                  <div className="flex justify-center">
                    <div
                      className="relative grid h-44 w-44 place-items-center rounded-full shadow-[0_12px_30px_rgba(20,36,27,0.12)]"
                      style={{ background: overallStatusSummary.background }}
                      role="img"
                      aria-label={`Status chart for ${overallStatusSummary.total} activities`}
                    >
                      <div className="grid h-24 w-24 place-items-center rounded-full border border-[#edf1eb] bg-white text-center shadow-inner">
                        <div>
                          <p className="text-3xl font-black tracking-[-0.04em]">{overallStatusSummary.total}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#718178]">activities</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {statusKeys.map((key) => {
                      const count = overallStatusSummary.counts[key];
                      const percent = overallStatusSummary.total
                        ? Math.round((count / overallStatusSummary.total) * 100)
                        : 0;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => {
                            setStatus(key);
                            setActiveView("workplan");
                          }}
                          className="rounded-xl border border-[#e1e7df] bg-[#f8faf7] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#8eaa98] hover:bg-[#f1f6ee] hover:shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: statusChartColor(key) }}
                              />
                              <span className="truncate text-sm font-bold">{metadataLabel("status", key)}</span>
                            </div>
                            <span className="text-lg font-black">{count}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e3e8e4]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: statusChartColor(key),
                              }}
                            />
                          </div>
                          <p className="mt-1 text-right text-xs font-semibold text-[#718178]">{percent}%</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Forecast expenditure</h2>
                    <p className="mt-1 text-sm text-[#718178]">
                      Unpaid contract installments grouped by due quarter.
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-[#49705c]" />
                </div>
                <div className="mt-6 space-y-5">
                  {expenditureForecast.map((item) => {
                    const maximum = Math.max(...expenditureForecast.map((row) => row.amountMnt), 1);
                    return (
                      <div key={item.quarter}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf4e9] font-black text-[#315845]">{item.quarter}</span>
                          <span className="font-black tabular-nums">{formatMnt(item.amountMnt)}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#e5ebe4]">
                          <div className="h-full rounded-full bg-[#2c795a]" style={{ width: `${(item.amountMnt / maximum) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
              <div className="border-b border-[#e2e7e0] px-5 py-4">
                <h2 className="text-xl font-black">Progress and finance by goal</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  Activity progress is paired with budget, commitments, expenditure, and remaining balance.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[930px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[235px] pl-5">Goal</TableHead>
                      <TableHead className="w-[210px]">Activity progress</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Commitment</TableHead>
                      <TableHead className="text-right">Expenditure</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goalRows.map((row) => (
                      <TableRow key={row.goal}>
                        <TableCell className="pl-5">
                          <p className="font-black">
                            {row.goal === "All goals" ? "Cross-goal" : metadataLabel("goal", row.goal)}
                          </p>
                          <p className="mt-1 text-xs text-[#718178]">
                            {row.completed} of {row.activities} activities completed
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="mb-2 flex items-center justify-between text-sm font-bold">
                            <span>{row.progress}%</span>
                            <span className="text-xs text-[#718178]">
                              {row.activities} activities
                            </span>
                          </div>
                          <Progress
                            value={row.progress}
                            className="h-2 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatMnt(row.budgetMnt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <p className="font-bold">{formatMnt(row.commitmentMnt)}</p>
                          <p className="text-xs text-[#718178]">{row.commitmentPercent}%</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <p className="font-bold">{formatMnt(row.expenditureMnt)}</p>
                          <p className="text-xs text-[#718178]">{row.spentPercent}%</p>
                        </TableCell>
                        <TableCell
                          className={`text-right font-black tabular-nums ${row.remainingMnt < 0 ? "text-rose-700" : "text-[#245f47]"}`}
                        >
                          {formatMnt(row.remainingMnt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)] xl:items-stretch">
              <FinancialUtilizationScatter
                data={dashboardFinancialUtilization}
                formatMnt={formatMnt}
              />
              <GoalBudgetVariance
                goalRows={goalRows}
                metadataLabel={metadataLabel}
              />
            </section>
    </>
  );
}
