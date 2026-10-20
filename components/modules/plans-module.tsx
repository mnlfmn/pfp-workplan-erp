"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Banknote, ChevronRight, Download, FileSearch, History, ListChecks, PencilLine, Plus, ReceiptText, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsultantSelectionModule } from "@/components/consultant-selection-module";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StatusKey = string;

export default function PlansModule({
  StatusPill,
  activityOwner,
  allActivities,
  allBudgetLines,
  allocationByActivityKey,
  allocationByBudgetKey,
  allocationState,
  allocationTargets,
  currentSession,
  deriveActivityProgress,
  deriveActivityStatus,
  expandedWorkplanIds,
  exportWorkplan,
  filtered,
  filteredBudgetLines,
  financeByBudgetKey,
  financeCreatorFilter,
  financeCreatorOptions,
  financeDateFrom,
  financeDateTo,
  financeEntriesExpanded,
  financeEntryCreatorName,
  financeState,
  financeStats,
  formatDate,
  formatMnt,
  goal,
  goals,
  language,
  localizedTargetLabel,
  member,
  metadataLabel,
  openActivity,
  openAddActivity,
  openAddBudgetLine,
  openAllocationDialog,
  openAuditHistory,
  openFinanceBudgetLine,
  openFinanceDialog,
  planState,
  procurementItems,
  procurementQuery,
  procurementTypeFilter,
  procurementTypeForSubactivity,
  procurementTypeOptions,
  query,
  recordProgress,
  recordStatus,
  responsibilityParts,
  section,
  sectionOptions,
  selectedBudgetKey,
  selectedYear,
  setExpandedWorkplanIds,
  setFinanceCreatorFilter,
  setFinanceDateFrom,
  setFinanceDateTo,
  setFinanceDeleteEntry,
  setFinanceEntriesExpanded,
  setGoal,
  setMember,
  setProcurementQuery,
  setProcurementTypeFilter,
  setQuery,
  setSection,
  setSelectedBudgetKey,
  setStatus,
  setWorkplanDensity,
  setWorkplanSection,
  setWorkstream,
  status,
  statusMetaFor,
  statusOptions,
  subactivityOwner,
  teamMembers,
  updates,
  visibleAllocations,
  visibleFinanceEntries,
  visibleProcurementItems,
  workplanDensity,
  workplanExporting,
  workplanSection,
  workstream,
  workstreams,
}: any) {
  const resetWorkplanFilters = () => {
    setQuery("");
    setSection("all");
    setGoal("all");
    setStatus("all");
    setWorkstream("all");
    setMember("all");
  };

  const activeWorkplanFilters = [
    query.trim()
      ? { key: "query", label: `Search: ${query.trim()}`, clear: () => setQuery("") }
      : null,
    section !== "all"
      ? {
          key: "section",
          label:
            sectionOptions.find((item: any) => item.value === section)?.label ??
            section,
          clear: () => setSection("all"),
        }
      : null,
    goal !== "all"
      ? {
          key: "goal",
          label: goal === "All goals" ? "Cross-goal" : metadataLabel("goal", goal),
          clear: () => setGoal("all"),
        }
      : null,
    status !== "all"
      ? {
          key: "status",
          label:
            statusOptions.find((item: any) => item.value === status)?.label ??
            metadataLabel("status", status),
          clear: () => setStatus("all"),
        }
      : null,
    workstream !== "all"
      ? {
          key: "workstream",
          label: metadataLabel("workstream", workstream),
          clear: () => setWorkstream("all"),
        }
      : null,
    member !== "all"
      ? {
          key: "member",
          label:
            member === "no_owner"
              ? "No owner"
              : teamMembers.find((item: any) => item.id === member)?.name ?? member,
          clear: () => setMember("all"),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    clear: () => void;
  }>;

  return (
    <>
<div className="inline-flex max-w-full flex-wrap rounded-xl border border-[#cfdacf] bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setWorkplanSection("finance")} className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${workplanSection === "finance" ? "bg-[#0c3b2d] text-white shadow-sm" : "text-[#53685c] hover:bg-[#f0f5ee]"}`}><Banknote className="h-4 w-4" /> Financial Plan</button>
            <button type="button" onClick={() => setWorkplanSection("activities")} className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${workplanSection === "activities" ? "bg-[#0c3b2d] text-white shadow-sm" : "text-[#53685c] hover:bg-[#f0f5ee]"}`}><ListChecks className="h-4 w-4" /> Work Plan</button>
            <button type="button" onClick={() => setWorkplanSection("procurement")} className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${workplanSection === "procurement" ? "bg-[#0c3b2d] text-white shadow-sm" : "text-[#53685c] hover:bg-[#f0f5ee]"}`}><ReceiptText className="h-4 w-4" /> Procurement Plan</button>
            <button type="button" onClick={() => setWorkplanSection("consultant-selection")} className={`flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${workplanSection === "consultant-selection" ? "bg-[#0c3b2d] text-white shadow-sm" : "text-[#53685c] hover:bg-[#f0f5ee]"}`}><FileSearch className="h-4 w-4" /> Consultant Selection</button>
        </div>

        {workplanSection === "activities" ? (

        <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
          <div className="sticky top-0 z-30 border-b border-[#dbe3d9] bg-white/95 p-4 backdrop-blur lg:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black">Workplan activities</h2>
                <p className="mt-0.5 text-sm text-[#718178]">
                  {filtered.length} of {allActivities.length} main activities
                  {activeWorkplanFilters.length > 0 && (
                    <> · {Math.max(0, allActivities.length - filtered.length)} hidden by filters</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg border border-[#cbd6cc] bg-[#f5f8f3] p-1">
                  {(["compact", "comfortable"] as const).map((density) => (
                    <button
                      type="button"
                      key={density}
                      onClick={() => setWorkplanDensity(density)}
                      className={[
                        "h-7 rounded-md px-2.5 text-xs font-black capitalize transition",
                        workplanDensity === density
                          ? "bg-white text-[#174734] shadow-sm"
                          : "text-[#718178] hover:text-[#174734]",
                      ].join(" ")}
                    >
                      {density}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={openAddActivity}
                  className="h-9 bg-[#0c3b2d] px-3 text-xs text-white hover:bg-[#174d3a]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add activity
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <label className="relative min-w-[260px] flex-[1_1_320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9 border-[#ced8cf] bg-[#f8faf7] pl-9 text-base md:text-sm"
                  placeholder="Search activities, sub-activities or owners"
                  aria-label="Search workplan activities"
                />
              </label>
              <NativeSelect
                value={section}
                onChange={(event) => setSection(event.target.value)}
                className="h-9 w-[140px] shrink-0 border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter by workplan section"
              >
                <NativeSelectOption value="all">All sections</NativeSelectOption>
                {sectionOptions.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="h-9 w-[132px] shrink-0 border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter by goal"
              >
                <NativeSelectOption value="all">Every goal</NativeSelectOption>
                {goals.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {value === "All goals" ? "Cross-goal" : metadataLabel("goal", value)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-9 w-[158px] shrink-0 border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter by status"
              >
                <NativeSelectOption value="all">All statuses</NativeSelectOption>
                {statusOptions.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                value={workstream}
                onChange={(event) => setWorkstream(event.target.value)}
                className="h-9 w-[205px] shrink-0 border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter by workstream"
              >
                <NativeSelectOption value="all">All workstreams</NativeSelectOption>
                {workstreams.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {metadataLabel("workstream", value)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                value={member}
                onChange={(event) => setMember(event.target.value)}
                className="h-9 w-[205px] shrink-0 border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter workplan by team member"
              >
                <NativeSelectOption value="all">All team members</NativeSelectOption>
                {teamMembers.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {metadataLabel("member_type", item.group)} · {item.name}
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value="no_owner">No owner</NativeSelectOption>
              </NativeSelect>
            </div>

            {activeWorkplanFilters.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#edf1eb] pt-2.5">
                <span className="mr-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#819087]">
                  Active filters
                </span>
                {activeWorkplanFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={filter.clear}
                    className="inline-flex max-w-[240px] items-center gap-1 rounded-full border border-[#bfd0c2] bg-[#edf5e9] px-2.5 py-1 text-[11px] font-bold text-[#315845] transition hover:border-[#88a895] hover:bg-[#e3efde]"
                    title={`Remove ${filter.label} filter`}
                  >
                    <span className="truncate">{filter.label}</span>
                    <span aria-hidden="true" className="text-sm leading-none">×</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={resetWorkplanFilters}
                  className="ml-1 text-[11px] font-black text-[#245f47] underline decoration-[#9eb5a6] underline-offset-4 hover:text-[#0c3b2d]"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="min-w-0">
              <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  <div className="sticky top-0 z-10 grid grid-cols-[120px_minmax(320px,1fr)_140px_112px_105px_120px_90px] gap-3 border-b border-[#dfe6dd] bg-[#f5f8f3] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#718178]">
                    <span>Code</span>
                    <span>Activity</span>
                    <span>Owner</span>
                    <span>Status</span>
                    <span>Progress</span>
                    <span className="text-right">Budget</span>
                    <span className="text-right">Action</span>
                  </div>

                  <div className="max-h-[720px] overflow-y-auto">
                    {filtered.map((item) => {
                      const currentStatus = deriveActivityStatus(item, updates);
                      const currentProgress = deriveActivityProgress(item, updates);
                      const currentResponsibility = responsibilityParts(
                        activityOwner(item, updates),
                        teamMembers,
                      );
                      const currentOwner = currentResponsibility.accountable;
                      const normalizedSearch = query.trim().toLocaleLowerCase();
                      const matchingSubactivity = Boolean(
                        normalizedSearch &&
                          item.subactivities.some((subactivity) =>
                            [
                              subactivity.title,
                              subactivityOwner(subactivity, updates),
                              subactivity.progressSummary,
                            ]
                              .join(" ")
                              .toLocaleLowerCase()
                              .includes(normalizedSearch),
                          ),
                      );
                      const isExpanded =
                        expandedWorkplanIds.has(item.id) || matchingSubactivity;
                      const allocatedMnt =
                        allocationByActivityKey.get(item.id) ??
                        item.subactivities.reduce(
                          (total, subactivity) =>
                            total +
                            (allocationByActivityKey.get(subactivity.id) ?? 0),
                          0,
                        );
                      const rowSpacing =
                        workplanDensity === "compact" ? "py-2" : "py-3.5";

                      return (
                        <div key={item.id} className="border-b border-[#e4e9e2]">
                          <div
                            className={[
                              "grid grid-cols-[120px_minmax(320px,1fr)_140px_112px_105px_120px_90px] items-center gap-3 border-l-[3px] border-l-transparent bg-white px-3 text-left transition hover:bg-[#f4f8f1]",
                              rowSpacing,
                            ].join(" ")}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedWorkplanIds((current) => {
                                    const next = new Set(current);
                                    if (next.has(item.id)) next.delete(item.id);
                                    else next.add(item.id);
                                    return next;
                                  });
                                }}
                                aria-label={
                                  isExpanded
                                    ? "Collapse sub-activities"
                                    : "Expand sub-activities"
                                }
                                aria-expanded={isExpanded}
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#c4d1c6] bg-white text-[#315845] outline-none transition hover:bg-[#e3eee0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c795a]"
                              >
                                <ChevronRight
                                  className={[
                                    "h-4 w-4 transition-transform",
                                    isExpanded ? "rotate-90" : "",
                                  ].join(" ")}
                                />
                              </button>
                              <span className="truncate font-mono text-xs font-black text-[#245f47]">
                                {item.code || item.uid}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                <p
                                  className={[
                                    "min-w-0 flex-1 font-black text-[#173228]",
                                    workplanDensity === "compact"
                                      ? "line-clamp-2 text-sm leading-4"
                                      : "line-clamp-2 text-[15px] leading-5",
                                  ].join(" ")}
                                >
                                  {language === "mn" && item.titleMn?.trim()
                                    ? item.titleMn
                                    : item.title}
                                </p>
                              </div>
                              <p className="mt-0.5 truncate text-[11px] font-semibold text-[#718178]">
                                Main activity · {item.subactivities.length} sub-activities
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p
                                className={[
                                  "truncate text-xs font-bold",
                                  currentOwner ? "text-[#315845]" : "text-rose-700",
                                ].join(" ")}
                              >
                                {currentOwner || "Owner required"}
                              </p>
                              {currentResponsibility.supporting.length > 0 && (
                                <p className="mt-0.5 truncate text-[11px] text-[#718178]">
                                  +{currentResponsibility.supporting.length} supporting
                                </p>
                              )}
                            </div>
                            <StatusPill status={currentStatus} label={metadataLabel("status", currentStatus)} />
                            <div>
                              <div className={`mb-1 flex items-center justify-between text-[11px] font-black ${currentProgress === 0 ? "text-[#94a198]" : "text-[#315845]"}`}>
                                <span>{currentProgress}%</span>
                              </div>
                              <Progress
                                value={currentProgress}
                                className="h-1.5 bg-[#dfe7dc] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                              />
                            </div>
                            <p className={`text-right text-xs tabular-nums ${allocatedMnt === 0 ? "font-semibold text-[#9aa79f]" : "font-black text-[#315845]"}`}>
                              {formatMnt(allocatedMnt)}
                            </p>
                            <button
                              type="button"
                              onClick={() => openActivity(item)}
                              className="ml-auto inline-flex h-7 items-center gap-1 rounded-md border border-[#b9c8bc] bg-white px-2.5 text-[11px] font-black text-[#245f47] shadow-sm transition hover:border-[#7f9d89] hover:bg-[#eaf2e7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2c795a]"
                              aria-label={`Open full view for ${item.code || item.uid}`}
                            >
                              Full view
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="bg-white">
                              {item.subactivities.map((subactivity, subIndex) => {
                                const subStatus = recordStatus(
                                  subactivity.id,
                                  subactivity.status as StatusKey,
                                  updates,
                                );
                                const subProgress = recordProgress(
                                  subactivity.id,
                                  statusMetaFor(subactivity.status as StatusKey).weight,
                                  updates,
                                );
                                const subResponsibility = responsibilityParts(
                                  subactivityOwner(subactivity, updates),
                                  teamMembers,
                                );
                                return (
                                  <div
                                    key={subactivity.id}
                                    className={[
                                      "grid grid-cols-[120px_minmax(320px,1fr)_140px_112px_105px_120px_90px] items-center gap-3 border-t border-[#edf0eb] border-l-[3px] border-l-transparent px-3 text-left transition hover:bg-[#f8faf7]",
                                      workplanDensity === "compact" ? "py-1.5" : "py-3",
                                    ].join(" ")}
                                  >
                                    <div className="flex items-center gap-2 pl-9">
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#83a18f]" />
                                      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#718178]">
                                        Sub {subIndex + 1}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <p
                                          className={[
                                            "min-w-0 flex-1 font-bold text-[#294438]",
                                            workplanDensity === "compact"
                                              ? "line-clamp-1 text-xs"
                                              : "line-clamp-2 text-sm",
                                          ].join(" ")}
                                        >
                                          {subactivity.title}
                                        </p>
                                      </div>
                                      <p className="mt-0.5 text-[11px] text-[#819087]">
                                        {metadataLabel("procurement_type", procurementTypeForSubactivity(subactivity))}
                                      </p>
                                    </div>
                                    <div className="min-w-0">
                                      <p
                                        className={[
                                          "truncate text-xs font-semibold",
                                          subResponsibility.accountable
                                            ? "text-[#53685c]"
                                            : "text-rose-700",
                                        ].join(" ")}
                                      >
                                        {subResponsibility.accountable || "Owner required"}
                                      </p>
                                      {subResponsibility.supporting.length > 0 && (
                                        <p className="mt-0.5 truncate text-[11px] text-[#819087]">
                                          +{subResponsibility.supporting.length} supporting
                                        </p>
                                      )}
                                    </div>
                                    <StatusPill status={subStatus} label={metadataLabel("status", subStatus)} />
                                    <div>
                                      <div className={`mb-1 text-[11px] font-black ${subProgress === 0 ? "text-[#94a198]" : "text-[#53685c]"}`}>
                                        {subProgress}%
                                      </div>
                                      <Progress
                                        value={subProgress}
                                        className="h-1 bg-[#e4eae2] [&_[data-slot=progress-indicator]]:bg-[#5a8d73]"
                                      />
                                    </div>
                                    {(() => {
                                      const subAllocation =
                                        allocationByActivityKey.get(subactivity.id) ?? 0;
                                      return (
                                        <p className={`text-right text-xs tabular-nums ${subAllocation === 0 ? "font-semibold text-[#9aa79f]" : "font-bold text-[#53685c]"}`}>
                                          {formatMnt(subAllocation)}
                                        </p>
                                      );
                                    })()}
                                    <span aria-hidden="true" />
                                  </div>
                                );
                              })}
                              {!item.subactivities.length && (
                                <div className="border-t border-[#edf0eb] px-12 py-3 text-xs text-[#718178]">
                                  No sub-activities yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filtered.length === 0 && (
                      <div className="px-6 py-16 text-center">
                        <SlidersHorizontal className="mx-auto mb-3 h-6 w-6 text-[#779083]" />
                        <p className="font-bold">
                          {allActivities.length
                            ? "No activities match these filters"
                            : "No activities in " + selectedYear + " draft yet"}
                        </p>
                        <p className="mt-1 text-sm text-[#718178]">
                          {allActivities.length
                            ? "Try a different status or search term."
                            : "Add the first activity to begin developing this workplan."}
                        </p>
                        <Button
                          variant={allActivities.length ? "outline" : "default"}
                          className="mt-4"
                          onClick={() => {
                            if (!allActivities.length) {
                              openAddActivity();
                              return;
                            }
                            resetWorkplanFilters();
                          }}
                        >
                          {allActivities.length ? "Clear filters" : "Add first activity"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-[#e2e7e0] bg-[#f7f9f5] px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportWorkplan}
                  disabled={workplanExporting || planState === "loading"}
                  className="h-9 border-[#9fb1a5] bg-white text-xs font-bold text-[#174734] hover:bg-[#eef5ed]"
                >
                  <Download className="h-3.5 w-3.5" />
                  {workplanExporting ? "Preparing…" : "Export Excel"}
                </Button>
              </div>
            </div>

          </div>
        </section>
        ) : workplanSection === "procurement" ? (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-[#bfd0c2] bg-gradient-to-br from-[#0c3b2d] to-[#246348] text-white shadow-[0_12px_30px_rgba(12,59,45,0.14)]">
              <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#dbf081]">{selectedYear} procurement plan</p>
                  <h2 className="mt-1 text-2xl font-black">Applicable procurement activities</h2>
                  <p className="mt-1 max-w-2xl text-sm text-white/70">This plan updates automatically whenever the procurement type is changed in a sub-activity. “Not applicable” items are excluded.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Plan items", procurementItems.length],
                    ["In progress", procurementItems.filter((item) => item.status === "in_progress").length],
                    ["Allocated", formatMnt(procurementItems.reduce((total, item) => total + item.allocatedMnt, 0))],
                  ].map(([label, value]) => <div key={String(label)} className="min-w-28 rounded-xl border border-white/15 bg-white/10 p-3"><p className="text-[11px] font-semibold text-white/65">{label}</p><p className="mt-1 text-lg font-black tabular-nums">{value}</p></div>)}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_8px_24px_rgba(20,36,27,0.04)]">
              <div className="flex flex-col gap-2 border-b border-[#e2e7e0] p-4 sm:flex-row sm:items-center">
                <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" /><Input value={procurementQuery} onChange={(event) => setProcurementQuery(event.target.value)} placeholder="Search procurement activity, owner or code" className="h-9 bg-[#f8faf7] pl-9" /></label>
                <NativeSelect value={procurementTypeFilter} onChange={(event) => setProcurementTypeFilter(event.target.value)} className="h-9 sm:w-56"><NativeSelectOption value="all">All procurement types</NativeSelectOption>{procurementTypeOptions.filter((item) => item.value.toLocaleLowerCase() !== "not applicable").map((item) => <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>)}</NativeSelect>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[940px]">
                  <div className="grid grid-cols-[100px_minmax(220px,1.5fr)_170px_135px_130px_100px_130px] gap-3 bg-[#f4f7f2] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#718178]"><span>Code</span><span>Procurement item</span><span>Type</span><span>Owner</span><span>Timeline</span><span>Status</span><span className="text-right">Allocation</span></div>
                  <div className="divide-y divide-[#e5eae4]">
                    {visibleProcurementItems.map((item) => (
                      <button key={item.subactivity.id} type="button" onClick={() => openActivity(item.activity)} className="grid w-full grid-cols-[100px_minmax(220px,1.5fr)_170px_135px_130px_100px_130px] items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f7faf5]">
                        <span className="font-mono text-xs font-black text-[#245f47]">{item.activity.code || item.activity.uid}</span>
                        <span className="min-w-0"><strong className="block line-clamp-2 text-sm text-[#183529]">{item.subactivity.title}</strong><span className="mt-0.5 block truncate text-[11px] text-[#718178]">Under {item.activity.title}</span></span>
                        <span className="rounded-lg bg-[#eef4eb] px-2 py-1.5 text-xs font-bold text-[#315845]">{metadataLabel("procurement_type", item.procurementType)}</span>
                        <span className={`truncate text-xs font-bold ${item.owner ? "text-[#315845]" : "text-rose-700"}`}>{item.owner || "Owner required"}</span>
                        <span className="text-xs text-[#65766d]">{formatDate(item.subactivity.startDate, language)} – {formatDate(item.subactivity.endDate, language)}</span>
                        <span><StatusPill status={item.status} label={metadataLabel("status", item.status)} /></span>
                        <span className="text-right text-xs font-black tabular-nums text-[#245f47]">{formatMnt(item.allocatedMnt)}</span>
                      </button>
                    ))}
                    {!visibleProcurementItems.length && <div className="px-6 py-14 text-center"><ReceiptText className="mx-auto h-7 w-7 text-[#809288]" /><p className="mt-3 font-black">No procurement activities found</p><p className="mt-1 text-sm text-[#718178]">Choose Goods and service or Intellectual service in a sub-activity to include it automatically.</p></div>}
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {workplanSection === "consultant-selection" && (
          <ConsultantSelectionModule
            year={selectedYear}
            activities={allActivities.map((activity) => ({
              key: activity.id,
              code: activity.code || activity.uid,
              title: language === "mn" && activity.titleMn ? activity.titleMn : activity.title,
              kind: "activity" as const,
            }))}
            session={currentSession}
            language={language}
          />
        )}

        {workplanSection === "finance" && (
          <div className="space-y-6">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#5d7467]" aria-label="Finance breadcrumb">
              <button type="button" onClick={() => setWorkplanSection("activities")} className="hover:text-[#174734]">Work Plan</button>
              <ChevronRight className="h-4 w-4" />
              <button type="button" onClick={() => setSelectedBudgetKey(null)} className="hover:text-[#174734]">Financial Plan</button>
              {selectedBudgetKey && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[#174734]">
                    {allBudgetLines.find((line) => line.id === selectedBudgetKey)?.code ?? "Budget line"}
                  </span>
                </>
              )}
            </nav>
            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
              <div className="border-b border-[#e2e7e0] p-4 lg:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Budget monitoring</h2>
                    <p className="text-sm text-[#718178]">
                      {filteredBudgetLines.length} budget lines · commitments and expenditure are tracked separately
                    </p>
                    {member !== "all" && (
                      <p className="mt-1 text-xs text-[#718178]">
                        Team finance uses budget lines linked to assigned activities. Shared lines may appear for more than one member.
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={openAddBudgetLine}
                    className="shrink-0 bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                  >
                    <Plus className="h-4 w-4" />
                    Add budget line
                  </Button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="relative block min-w-[230px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="h-10 border-[#ced8cf] bg-[#f8faf7] pl-9 text-base md:text-sm"
                      placeholder="Search budget line"
                      aria-label="Search budget lines"
                    />
                  </label>
                  <NativeSelect
                    value={section}
                    onChange={(event) => setSection(event.target.value)}
                    className="h-10 min-w-[145px] border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Filter finance by workplan section"
                  >
                    <NativeSelectOption value="all">All sections</NativeSelectOption>
                    {sectionOptions.map((item) => (
                      <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="h-10 min-w-[140px] border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Filter finance by goal"
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
                    className="h-10 min-w-[220px] border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Filter finance by team member"
                  >
                    <NativeSelectOption value="all">All team members</NativeSelectOption>
                    {teamMembers.map((item) => (
                      <NativeSelectOption key={item.id} value={item.id}>
                        {metadataLabel("member_type", item.group)} · {item.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <div className="hidden xl:block">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[28%] pl-5">Budget line</TableHead>
                      <TableHead className="w-[12%] text-right">Budget</TableHead>
                      <TableHead className="w-[12%] text-right">Allocated</TableHead>
                      <TableHead className="w-[12%] text-right">Committed</TableHead>
                      <TableHead className="w-[12%] text-right">Expenditure</TableHead>
                      <TableHead className="w-[12%] text-right">Remaining</TableHead>
                      <TableHead className="w-[12%] pr-5 text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBudgetLines.map((line) => {
                      const totals = financeByBudgetKey.get(line.id) ?? {
                        commitment: 0,
                        expenditure: 0,
                      };
                      const budgetMnt = Number(line.budgetMntMillion) * 1_000_000;
                      const remainingMnt =
                        budgetMnt - totals.commitment - totals.expenditure;
                      const allocatedMnt = allocationByBudgetKey.get(line.id) ?? 0;
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="whitespace-normal pl-5 align-top">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 shrink-0 rounded-md bg-[#e9f0e6] px-2 py-1 font-mono text-xs font-black text-[#2f634c]">
                                {line.code}
                              </span>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openFinanceBudgetLine(line.id)}
                                  className="whitespace-normal break-words text-left font-bold leading-5 text-[#183529] underline-offset-4 hover:text-[#277255] hover:underline"
                                >
                                  {line.title}
                                </button>
                                <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-[#718178]">
                                  {metadataLabel("section", line.section)} · {metadataLabel("goal", line.goal) || "No goal"} · {metadataLabel("workstream", line.workstream) || line.level}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-[13px] font-bold tabular-nums">
                            {formatMnt(Number(line.budgetMntMillion) * 1_000_000)}
                          </TableCell>
                          <TableCell className={`whitespace-nowrap text-right text-[13px] font-bold tabular-nums ${allocatedMnt > budgetMnt ? "text-rose-700" : "text-[#315845]"}`}>
                            {formatMnt(allocatedMnt)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-[13px] tabular-nums">
                            {formatMnt(totals.commitment)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-[13px] tabular-nums">
                            {formatMnt(totals.expenditure)}
                          </TableCell>
                          <TableCell
                            className={`whitespace-nowrap text-right text-[13px] font-black tabular-nums ${remainingMnt < 0 ? "text-rose-700" : "text-[#245f47]"}`}
                          >
                            {formatMnt(remainingMnt)}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openFinanceBudgetLine(line.id)}
                              aria-label={`Open budget line ${line.code}`}
                            >
                              Open
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="divide-y divide-[#e2e7e0] xl:hidden">
                {filteredBudgetLines.map((line) => {
                  const totals = financeByBudgetKey.get(line.id) ?? {
                    commitment: 0,
                    expenditure: 0,
                  };
                  const budgetMnt = Number(line.budgetMntMillion) * 1_000_000;
                  const remainingMnt =
                    budgetMnt - totals.commitment - totals.expenditure;
                  const allocatedMnt = allocationByBudgetKey.get(line.id) ?? 0;
                  return (
                    <article key={line.id} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <span className="inline-flex rounded-md bg-[#e9f0e6] px-2 py-1 font-mono text-xs font-black text-[#2f634c]">
                            {line.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => openFinanceBudgetLine(line.id)}
                            className="mt-2 whitespace-normal break-words text-left font-bold leading-6 text-[#183529] underline-offset-4 hover:text-[#277255] hover:underline"
                          >
                            {line.title}
                          </button>
                          <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-[#718178]">
                            {metadataLabel("section", line.section)} · {metadataLabel("goal", line.goal) || "No goal"} · {metadataLabel("workstream", line.workstream) || line.level}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openFinanceBudgetLine(line.id)}
                          className="shrink-0"
                        >
                          Open line
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {[
                          ["Budget", formatMnt(budgetMnt)],
                          ["Allocated", formatMnt(allocatedMnt)],
                          ["Committed", formatMnt(totals.commitment)],
                          ["Expenditure", formatMnt(totals.expenditure)],
                          ["Remaining", formatMnt(remainingMnt)],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl bg-[#f5f8f3] p-3">
                            <dt className="text-xs font-semibold text-[#718178]">{label}</dt>
                            <dd className="mt-1 whitespace-nowrap text-sm font-black tabular-nums text-[#183529]">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  );
                })}
              </div>

              {filteredBudgetLines.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <SlidersHorizontal className="mx-auto mb-3 h-6 w-6 text-[#779083]" />
                  <p className="font-bold">
                    {allBudgetLines.length
                      ? "No budget lines match these filters"
                      : `No budget lines in the ${selectedYear} draft yet`}
                  </p>
                  <Button
                    variant={allBudgetLines.length ? "outline" : "default"}
                    className="mt-4"
                    onClick={() => {
                      if (!allBudgetLines.length) {
                        openAddBudgetLine();
                        return;
                      }
                      setQuery("");
                      setSection("all");
                      setGoal("all");
                      setMember("all");
                    }}
                  >
                    {allBudgetLines.length ? "Clear filters" : "Add first budget line"}
                  </Button>
                </div>
              )}
            </section>

            <section className="hidden overflow-hidden rounded-2xl border border-[#d7ded5] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#e2e7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Budget allocations</h2>
                  <p className="text-sm text-[#718178]">
                    Planned budget assigned to main activities and sub-activities
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#5d7467]">
                    {visibleAllocations.length} allocations
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAllocationDialog()}
                    disabled={!allBudgetLines.length || !allocationTargets.length}
                  >
                    <Plus className="h-4 w-4" />
                    Allocate
                  </Button>
                </div>
              </div>
              {allocationState === "unavailable" && (
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                  Saved allocations are temporarily unavailable.
                </div>
              )}
              <div className="divide-y divide-[#e4e9e2]">
                {visibleAllocations.map((allocation) => {
                  const line = allBudgetLines.find(
                    (item) => item.id === allocation.budgetKey,
                  );
                  const target = allocationTargets.find(
                    (item) => item.key === allocation.activityKey,
                  );
                  return (
                    <div
                      key={allocation.id}
                      className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_160px_80px] md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-black text-[#2f634c]">
                          {line?.code ?? "Budget line"}
                        </p>
                        <p className="mt-1 whitespace-normal break-words text-sm font-bold leading-5">
                          {line?.title ?? "Removed budget line"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="whitespace-normal break-words text-sm leading-5 text-[#53685c]">
                          {target
                            ? localizedTargetLabel(target, allActivities, language)
                            : "Removed workplan item"}
                        </p>
                        {allocation.note && (
                          <p className="mt-1 whitespace-normal break-words text-xs text-[#718178]">
                            {allocation.note}
                          </p>
                        )}
                      </div>
                      <p className="whitespace-nowrap text-right font-black tabular-nums text-[#245f47] md:text-left">
                        {formatMnt(allocation.amountMnt)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAllocationDialog(undefined, undefined, allocation)}
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  );
                })}
              </div>
              {allocationState === "ready" && visibleAllocations.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <p className="font-bold">No budget allocations yet</p>
                  <p className="mt-1 text-sm text-[#718178]">
                    Assign planned amounts to an activity or sub-activity.
                  </p>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white">
              <div className="border-b border-[#e2e7e0] px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Finance entries</h2>
                    <p className="text-sm text-[#718178]">
                      Every manual entry shows the person who recorded it.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#5d7467]">
                      {visibleFinanceEntries.length} of {financeStats.relevantEntries.length} entries
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFinanceEntriesExpanded((current) => !current)}
                      aria-expanded={financeEntriesExpanded}
                      className="h-8 border-[#b9cabb] bg-white text-xs"
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${financeEntriesExpanded ? "rotate-90" : ""}`} />
                      {financeEntriesExpanded ? "Hide entries" : "View entries"}
                    </Button>
                  </div>
                </div>
                {financeEntriesExpanded && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <NativeSelect
                    value={financeCreatorFilter}
                    onChange={(event) => setFinanceCreatorFilter(event.target.value)}
                    className="h-10 border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Filter finance entries by person"
                  >
                    <NativeSelectOption value="all">All people</NativeSelectOption>
                    {financeCreatorOptions.map(([email, name]) => (
                      <NativeSelectOption key={email} value={email}>
                        {name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <label className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-lg border border-[#ced8cf] bg-[#f8faf7] px-3">
                    <span className="text-xs font-bold text-[#5d7467]">From</span>
                    <Input
                      type="date"
                      value={financeDateFrom}
                      onChange={(event) => setFinanceDateFrom(event.target.value)}
                      className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      aria-label="Filter finance entries from date"
                    />
                  </label>
                  <label className="grid grid-cols-[auto_1fr] items-center gap-2 rounded-lg border border-[#ced8cf] bg-[#f8faf7] px-3">
                    <span className="text-xs font-bold text-[#5d7467]">To</span>
                    <Input
                      type="date"
                      value={financeDateTo}
                      onChange={(event) => setFinanceDateTo(event.target.value)}
                      className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      aria-label="Filter finance entries to date"
                    />
                  </label>
                </div>
                )}
              </div>
              {!financeEntriesExpanded && (
                <button
                  type="button"
                  onClick={() => setFinanceEntriesExpanded(true)}
                  className="flex w-full items-center justify-between gap-4 bg-[#f8faf7] px-5 py-4 text-left text-sm text-[#5d7467] transition-colors hover:bg-[#f1f6ee]"
                >
                  <span>Expand to filter and review the complete finance-entry history.</span>
                  <span className="shrink-0 font-black text-[#285d45]">View full list</span>
                </button>
              )}
              {financeEntriesExpanded && (
              <>
              {financeState === "unavailable" && (
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                  Saved finance entries are temporarily unavailable. The approved budget remains visible.
                </div>
              )}
              <div className="max-h-[480px] overflow-auto">
                <Table className="min-w-[980px]">
                  <TableHeader className="sticky top-0 z-10 bg-[#f7f9f5] shadow-[0_1px_0_#e2e7e0]">
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="pl-5">Date</TableHead>
                      <TableHead>Budget line</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Entered by</TableHead>
                      <TableHead className="pr-5 text-right">Amount (MNT)</TableHead>
                      <TableHead className="pr-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleFinanceEntries.map((entry) => {
                      const line = allBudgetLines.find(
                        (item) => item.id === entry.budgetKey,
                      );
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="pl-5 whitespace-nowrap">
                            {formatDate(entry.entryDate, language)}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-[#2f634c]">
                            {line?.code ?? "—"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${entry.entryType === "commitment" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800"}`}
                            >
                              {entry.entryType === "commitment"
                                ? "Commitment"
                                : "Expenditure"}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[380px]">
                            <p className="truncate font-medium">
                              {entry.description || entry.vendor || "No description"}
                            </p>
                            {entry.vendor && entry.description && (
                              <p className="mt-1 truncate text-xs text-[#718178]">
                                {entry.vendor}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-[#315845]">
                            {financeEntryCreatorName(entry, teamMembers)}
                          </TableCell>
                          <TableCell className="pr-5 text-right font-black tabular-nums">
                            {formatMnt(entry.amountMnt)}
                          </TableCell>
                          <TableCell className="pr-5">
                            {entry.activityKey ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => void openAuditHistory({ entityType: "finance", entityKey: String(entry.id), label: `${entry.entryType === "commitment" ? "Commitment" : "Expenditure"} · ${formatMnt(entry.amountMnt)}` })}
                                  aria-label="View finance entry history"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    openFinanceDialog(
                                      entry.budgetKey,
                                      entry.activityKey,
                                      entry,
                                    )
                                  }
                                  aria-label="Edit finance entry"
                                >
                                  <PencilLine className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setFinanceDeleteEntry(entry)}
                                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                  aria-label="Remove finance entry"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="block text-right text-xs text-[#718178]">
                                Legacy entry
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {financeState === "ready" && visibleFinanceEntries.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <ReceiptText className="mx-auto mb-3 h-7 w-7 text-[#779083]" />
                  <p className="font-bold">
                    {financeStats.relevantEntries.length
                      ? "No finance entries match these filters"
                      : "No finance entries yet"}
                  </p>
                  <p className="mt-1 text-sm text-[#718178]">
                    {financeStats.relevantEntries.length
                      ? "Change or clear the person and date filters to see more records."
                      : "Open a budget line, then choose an activity to add a commitment or expenditure."}
                  </p>
                </div>
              )}
              </>
              )}
            </section>
          </div>
        )}
    </>
  );
}
