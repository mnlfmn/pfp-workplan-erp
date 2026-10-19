"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { BarChart3, Gauge, HandCoins, ListChecks, Search, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { StaffKpiModule } from "@/components/staff-kpi-module";

export default function KpiModule({
  allActivities,
  currentSession,
  formatMnt,
  kpiActivityQuarterNotes,
  kpiAssignedActivityKeysByMember,
  metadataLabel,
  selectedYear,
  setActiveView,
  setMember,
  setTeamDirectoryMember,
  setTeamDirectoryQuery,
  setTeamPerformanceSection,
  statusKeys,
  statusMetaFor,
  teamDirectoryMember,
  teamDirectoryQuery,
  teamMembers,
  teamPerformanceSection,
  teamState,
  visibleTeamSummaries,
}: any) {
  return (
    <>
<div className="inline-flex max-w-full flex-wrap rounded-xl border border-[#cfdacf] bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setTeamPerformanceSection("workplan")}
                className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                  teamPerformanceSection === "workplan"
                    ? "bg-[#0c3b2d] text-white shadow-sm"
                    : "text-[#53685c] hover:bg-[#f0f5ee]"
                }`}
              >
                <BarChart3 className="h-4 w-4" /> Workplan Performance
              </button>
              <button
                type="button"
                onClick={() => setTeamPerformanceSection("kpi")}
                className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                  teamPerformanceSection === "kpi"
                    ? "bg-[#0c3b2d] text-white shadow-sm"
                    : "text-[#53685c] hover:bg-[#f0f5ee]"
                }`}
              >
                <Target className="h-4 w-4" /> Staff KPI
              </button>
            </div>

            {teamPerformanceSection === "kpi" ? (
              <StaffKpiModule
                year={selectedYear}
                activities={allActivities}
                teamMembers={teamMembers}
                session={currentSession}
                assignedActivityKeysByMember={kpiAssignedActivityKeysByMember}
                activityQuarterNotes={kpiActivityQuarterNotes}
              />
            ) : (
              <>
            <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between lg:p-5">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-xl font-black">
                  {currentSession?.isAdmin ? "Team Performance" : "My Performance"}
                </h2>
                <p className="mt-1 text-sm text-[#718178]">
                  {currentSession?.isAdmin
                    ? "Workplan responsibilities, activity status, delivery progress, and financial position by team member."
                    : "Your workplan responsibilities, activity status, delivery progress, and financial position."}
                </p>
              </div>
              {currentSession?.isAdmin && (
                <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_220px] lg:justify-end">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" />
                    <Input
                      value={teamDirectoryQuery}
                      onChange={(event) => setTeamDirectoryQuery(event.target.value)}
                      className="h-10 border-[#ced8cf] bg-[#f8faf7] pl-9"
                      placeholder="Search staff name"
                      aria-label="Search team performance by staff name"
                    />
                  </label>
                  <NativeSelect
                    value={teamDirectoryMember}
                    onChange={(event) => setTeamDirectoryMember(event.target.value)}
                    className="h-10 border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Select team member performance"
                  >
                    <NativeSelectOption value="all">All staff members</NativeSelectOption>
                    {teamMembers.map((item) => (
                      <NativeSelectOption key={item.id} value={item.id}>
                        {item.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              )}
            </section>

            {teamState === "unavailable" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Saved roster changes are temporarily unavailable. The default team list remains visible.
              </div>
            )}

            {visibleTeamSummaries.length > 0 ? (
              <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    { label: "Team members", value: visibleTeamSummaries.length, icon: Users },
                    { label: "Accountable activities", value: visibleTeamSummaries.reduce((total, item) => total + item.accountableMainCount, 0), icon: Target },
                    { label: "Supporting assignments", value: visibleTeamSummaries.reduce((total, item) => total + item.supportingMainCount + item.supportingSubactivityCount, 0), icon: HandCoins },
                    { label: "Sub-activities", value: visibleTeamSummaries.reduce((total, item) => total + item.subactivityCount, 0), icon: ListChecks },
                    { label: "Average progress", value: `${Math.round(visibleTeamSummaries.reduce((total, item) => total + item.progress, 0) / visibleTeamSummaries.length)}%`, icon: Gauge },
                  ].map(({ label, value, icon: Icon }) => (
                    <article key={label} className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_22px_rgba(20,36,27,0.04)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#718178]">{label}</p>
                        <Icon className="h-4 w-4 text-[#2f634c]" />
                      </div>
                      <p className="mt-2 text-2xl font-black tabular-nums text-[#183529]">{value}</p>
                    </article>
                  ))}
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                  {visibleTeamSummaries.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-[#cfdacf] bg-white shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                      <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#0c3b2d] to-[#245f47] p-4 text-white sm:p-5">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#dbf081] text-sm font-black text-[#173b2d]">
                            {item.name.split(/[.\s]/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-black">{item.name}</h3>
                              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">{metadataLabel("member_type", item.group)}</span>
                            </div>
                            <p className="mt-1 text-xs text-emerald-50/75">{item.role}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMember(item.id);
                            setActiveView("dashboard");
                          }}
                          className="h-8 shrink-0 border-white/30 bg-white/10 px-2.5 text-xs text-white hover:bg-white/20 hover:text-white"
                        >
                          View report
                        </Button>
                      </div>

                      <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                          {[
                            ["Accountable", item.accountableMainCount],
                            ["Supporting main", item.supportingMainCount],
                            ["Sub-activities", item.subactivityCount],
                            ["Supporting subs", item.supportingSubactivityCount],
                            ["Active contracts", item.activeContractCount],
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-xl bg-[#f2f6f0] p-3">
                              <p className="text-[11px] font-semibold text-[#718178]">{label}</p>
                              <p className="mt-1 text-xl font-black tabular-nums text-[#183529]">{value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-sm font-bold">
                            <span>Combined delivery progress</span>
                            <span>{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} className="h-2 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]" />
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {statusKeys.map((key) =>
                              item.statusCounts[key] ? (
                                <span key={key} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusMetaFor(key).tone}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusMetaFor(key).dot}`} />
                                  {metadataLabel("status", key)} {item.statusCounts[key]}
                                </span>
                              ) : null,
                            )}
                          </div>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#e2e7e0] pt-4 text-sm">
                          <div><dt className="text-xs text-[#718178]">Budget</dt><dd className="mt-1 font-black tabular-nums">{formatMnt(item.budgetMnt)}</dd></div>
                          <div><dt className="text-xs text-[#718178]">Commitment</dt><dd className="mt-1 font-black tabular-nums">{formatMnt(item.commitmentMnt)}</dd></div>
                          <div><dt className="text-xs text-[#718178]">Expenditure</dt><dd className="mt-1 font-black tabular-nums">{formatMnt(item.expenditureMnt)}</dd></div>
                          <div><dt className="text-xs text-[#718178]">Remaining</dt><dd className={`mt-1 font-black tabular-nums ${item.remainingMnt < 0 ? "text-rose-700" : "text-[#245f47]"}`}>{formatMnt(item.remainingMnt)}</dd></div>
                        </dl>
                      </div>
                    </article>
                  ))}
                </section>
                <p className="rounded-xl border border-[#d7ded5] bg-[#f8faf7] px-4 py-3 text-xs leading-5 text-[#718178]">
                  Counts distinguish accountable and supporting roles across main activities and sub-activities. Shared budget lines can appear for more than one person, so team financial figures should not be added together.
                </p>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#cbd6cc] bg-white px-6 py-12 text-center text-sm text-[#718178]">
                Your signed-in account is not linked to a team member record yet. Ask an administrator to add your email in Admin Control.
              </div>
            )}
              </>
            )}
    </>
  );
}
