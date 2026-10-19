"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BarChart3, Bell, ClipboardCheck, FileSpreadsheet, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MelModule } from "@/components/mel-module";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { QuarterlyReportingModule } from "@/components/quarterly-reporting-module";

export default function MelWorkspaceModule({
  allActivities,
  allBudgetLines,
  automaticAlerts,
  averageActivityProgress,
  comparePlan,
  compareYear,
  currentSession,
  dataCompleteness,
  exportQuarterlyReport,
  formatMnt,
  loadComparison,
  melSection,
  quarterKeys,
  quarterlyReportingActivities,
  selectedYear,
  setActiveView,
  setMelSection,
  setMember,
  setUpdates,
  statusOptions,
  teamMembers,
  updates,
  workplanExporting,
  workplanYears,
}: any) {
  return (
    <>
<section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] sm:p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5f7568]">Monitoring, evaluation and learning</p>
                <h2 className="mt-1 text-xl font-black">MEL workspace</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  Choose the workspace you want to manage. Only the selected area is shown below.
                </p>
              </div>
              <div className="mt-4 inline-flex max-w-full flex-wrap rounded-xl border border-[#cfdacf] bg-[#f8faf7] p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setMelSection("indicators")}
                  className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    melSection === "indicators"
                      ? "bg-[#0c3b2d] text-white shadow-sm"
                      : "text-[#53685c] hover:bg-white"
                  }`}
                >
                  <Target className="h-4 w-4" /> Indicator Management
                </button>
                <button
                  type="button"
                  onClick={() => setMelSection("monitoring")}
                  className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    melSection === "monitoring"
                      ? "bg-[#0c3b2d] text-white shadow-sm"
                      : "text-[#53685c] hover:bg-white"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" /> Programme Monitoring
                </button>
                <button
                  type="button"
                  onClick={() => setMelSection("quarterly")}
                  className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    melSection === "quarterly"
                      ? "bg-[#0c3b2d] text-white shadow-sm"
                      : "text-[#53685c] hover:bg-white"
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" /> Quarterly Reporting
                </button>
              </div>
            </section>

            {melSection === "indicators" ? (
              <MelModule
                year={selectedYear}
                activities={allActivities}
                teamMembers={teamMembers}
                session={currentSession}
              />
            ) : melSection === "quarterly" ? (
              <QuarterlyReportingModule
                year={selectedYear}
                activities={quarterlyReportingActivities}
                teamMembers={teamMembers}
                session={currentSession}
                statusOptions={statusOptions}
                onUpdateSaved={(update) =>
                  setUpdates((current) => ({
                    ...current,
                    [update.activityKey]: update,
                  }))
                }
              />
            ) : (
              <>
            <section className="rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_8px_26px_rgba(20,36,27,0.05)] sm:flex sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Workplan monitoring and year comparison</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  Download each quarter&apos;s saved progress and notes, review data quality, and compare years.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
                {quarterKeys.map((quarter) => (
                  <Button
                    key={quarter}
                    variant="outline"
                    size="sm"
                    onClick={() => void exportQuarterlyReport(quarter)}
                    disabled={workplanExporting}
                  >
                    <FileSpreadsheet className="h-4 w-4" /> {quarter} Excel
                  </Button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black">
                    <Bell className="h-5 w-5 text-[#2f634c]" /> Automatic alerts
                  </h2>
                  <p className="mt-1 text-sm text-[#718178]">
                    Open an alert to review the underlying workplan or contract records.
                  </p>
                </div>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-black text-rose-800">
                  {automaticAlerts.reduce((total, item) => total + item.count, 0)} open
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {automaticAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => {
                      if (alert.id === "owners") setMember("no_owner");
                      setActiveView(alert.view);
                    }}
                    className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                      alert.count
                        ? alert.tone === "rose"
                          ? "border-rose-200 bg-rose-50"
                          : "border-amber-200 bg-amber-50"
                        : "border-[#e1e7df] bg-[#f8faf7]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black">{alert.label}</span>
                      <span className="text-lg font-black">{alert.count}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#65766d]">
                      {alert.detail}
                    </p>
                  </button>
                ))}
              </div>
            </section>
            <section className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-[#d7ded5] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black">Data completeness</h3>
                    <p className="mt-1 text-sm text-[#718178]">Checks the records required for reporting and accountability.</p>
                  </div>
                  <span className="text-3xl font-black text-[#245f47]">{dataCompleteness.completePercent}%</span>
                </div>
                <Progress value={dataCompleteness.completePercent} className="mt-4 h-2.5 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]" />
                <dl className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ["Missing owners", dataCompleteness.missingOwner],
                    ["Missing dates", dataCompleteness.missingDates],
                    ["Missing workplan structure", dataCompleteness.missingStructure],
                    ["Missing procurement type", dataCompleteness.missingProcurementType],
                    [`${dataCompleteness.currentQuarter} updates missing`, dataCompleteness.missingQuarterlyUpdate],
                    ["Budget lines without activities", dataCompleteness.unlinkedBudgetLines],
                    ["Incomplete contracts", dataCompleteness.incompleteContracts],
                    ["Incomplete finance entries", dataCompleteness.incompleteFinanceEntries],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-[#f7f9f5] p-3">
                      <dt className="text-xs text-[#718178]">{label}</dt>
                      <dd className="mt-1 text-xl font-black">{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
              <article className="rounded-2xl border border-[#d7ded5] bg-white p-5">
                <h3 className="text-lg font-black">Year-to-year comparison</h3>
                <p className="mt-1 text-sm text-[#718178]">Compare the selected workplan with another saved year.</p>
                <div className="mt-4 flex gap-2">
                  <NativeSelect
                    value={String(compareYear)}
                    onChange={(event) => void loadComparison(Number(event.target.value))}
                    className="h-10 flex-1 border-[#ced8cf] bg-white"
                  >
                    {workplanYears.map((item) => (
                      <NativeSelectOption key={item.year} value={String(item.year)}>{item.year} workplan</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Button variant="outline" onClick={() => void loadComparison(compareYear)}>Compare</Button>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_100px_100px] gap-2 text-sm">
                  <span className="font-bold text-[#718178]">Metric</span>
                  <span className="text-right font-bold text-[#718178]">{selectedYear}</span>
                  <span className="text-right font-bold text-[#718178]">{comparePlan?.year ?? compareYear}</span>
                  {[
                    ["Activities", allActivities.length, comparePlan?.activities.length ?? "—"],
                    ["Average progress", `${averageActivityProgress(allActivities, updates)}%`, comparePlan ? `${averageActivityProgress(comparePlan.activities, updates)}%` : "—"],
                    ["Budget", formatMnt(allBudgetLines.reduce((total, line) => total + Number(line.budgetMntMillion) * 1_000_000, 0)), comparePlan ? formatMnt(comparePlan.budgetLines.reduce((total, line) => total + Number(line.budgetMntMillion) * 1_000_000, 0)) : "—"],
                  ].map(([label, current, previous]) => (
                    <div key={String(label)} className="contents">
                      <span className="border-t border-[#e5eae4] py-2 font-semibold">{label}</span>
                      <span className="border-t border-[#e5eae4] py-2 text-right font-black">{current}</span>
                      <span className="border-t border-[#e5eae4] py-2 text-right font-black">{previous}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
              </>
            )}
    </>
  );
}
