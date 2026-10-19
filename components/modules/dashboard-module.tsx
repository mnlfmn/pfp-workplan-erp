"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangle, Banknote, CircleCheck, Gauge, HandCoins, ListChecks, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ContractRecord = { status: string };

export default function DashboardModule({
  contractStatusMeta,
  dashboardActivities,
  dashboardContractStats,
  dashboardFinance,
  dashboardFinanceBars,
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
    </>
  );
}
