"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CircleCheck,
  FileSpreadsheet,
  Gauge,
  History,
  PencilLine,
  Plus,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { indicatorActivityKeys } from "@/lib/mel-links";
import type { TeamMember } from "@/lib/team-members";

export type MelIndicator = {
  id: string;
  planYear: number;
  code: string;
  name: string;
  definition: string;
  unit: string;
  level: "output" | "outcome" | "impact";
  reportingFrequency: "quarterly" | "annual";
  dataSource: string;
  responsibleMemberId: string;
  goal: string;
  activityKey: string;
  active: number;
  baselineValue: number | null;
  baselineYear: number | null;
  annualTarget: number | null;
  q1Target: number | null;
  q2Target: number | null;
  q3Target: number | null;
  q4Target: number | null;
  endTarget: number | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type MelResult = {
  id: string;
  indicatorId: string;
  planYear: number;
  period: "Q1" | "Q2" | "Q3" | "Q4" | "Annual";
  actualValue: number;
  note: string;
  evidenceReference: string;
  workflowStatus: "draft" | "submitted" | "reviewed" | "approved";
  reviewComment: string;
  enteredAt: string;
  enteredBy: string;
  updatedAt: string;
  updatedBy: string;
  submittedAt: string;
  submittedBy: string;
  reviewedAt: string;
  reviewedBy: string;
  approvedAt: string;
  approvedBy: string;
};

type Session = { email: string; isAdmin: boolean; memberId: string; memberName: string } | null;
type ActivityOption = { id: string; code?: string; uid?: string; title: string; goal?: string };

type Props = {
  year: number;
  activities: ActivityOption[];
  teamMembers: TeamMember[];
  session: Session;
};

type IndicatorDraft = {
  id: string;
  code: string;
  name: string;
  definition: string;
  unit: string;
  level: MelIndicator["level"];
  reportingFrequency: MelIndicator["reportingFrequency"];
  dataSource: string;
  responsibleMemberId: string;
  goal: string;
  activityKeys: string[];
  active: boolean;
  baselineValue: string;
  baselineYear: string;
  annualTarget: string;
  endTarget: string;
};

type ResultDraft = {
  id: string;
  indicatorId: string;
  period: MelResult["period"];
  actualValue: string;
  note: string;
  evidenceReference: string;
  reviewComment: string;
};

const periods: MelResult["period"][] = ["Q1", "Q2", "Q3", "Q4", "Annual"];
const periodOrder = Object.fromEntries(periods.map((period, index) => [period, index]));

const workflowTone: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  submitted: "border-blue-200 bg-blue-50 text-blue-800",
  reviewed: "border-violet-200 bg-violet-50 text-violet-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  not_reported: "border-amber-200 bg-amber-50 text-amber-900",
};

function numberText(value: number | null) {
  return value === null ? "" : String(value);
}

function emptyIndicator(): IndicatorDraft {
  return {
    id: "",
    code: "",
    name: "",
    definition: "",
    unit: "",
    level: "output",
    reportingFrequency: "quarterly",
    dataSource: "",
    responsibleMemberId: "",
    goal: "",
    activityKeys: [],
    active: true,
    baselineValue: "",
    baselineYear: "",
    annualTarget: "",
    endTarget: "",
  };
}

function indicatorDraft(item: MelIndicator): IndicatorDraft {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    definition: item.definition,
    unit: item.unit,
    level: item.level,
    reportingFrequency: item.reportingFrequency,
    dataSource: item.dataSource,
    responsibleMemberId: item.responsibleMemberId,
    goal: item.goal,
    activityKeys: indicatorActivityKeys(item.activityKey),
    active: Boolean(item.active),
    baselineValue: numberText(item.baselineValue),
    baselineYear: numberText(item.baselineYear),
    annualTarget: numberText(item.annualTarget),
    endTarget: numberText(item.endTarget),
  };
}

function currentQuarter() {
  return `Q${Math.ceil((new Date().getMonth() + 1) / 3)}` as MelResult["period"];
}

function targetFor(indicator: MelIndicator, period: MelResult["period"]) {
  void period;
  return indicator.annualTarget;
}

function deliveryStatus(actual: number | null, target: number | null) {
  if (actual === null) return "not_reported";
  if (target === null || target === 0) return "on_track";
  const percentage = (actual / target) * 100;
  if (percentage >= 90) return "on_track";
  if (percentage >= 70) return "needs_attention";
  return "off_track";
}

const deliveryMeta: Record<string, { label: string; tone: string }> = {
  on_track: { label: "On track", tone: "bg-emerald-50 text-emerald-800" },
  needs_attention: { label: "Needs attention", tone: "bg-amber-50 text-amber-900" },
  off_track: { label: "Off track", tone: "bg-rose-50 text-rose-800" },
  not_reported: { label: "Not reported", tone: "bg-slate-100 text-slate-700" },
};

function formatValue(value: number | null, unit: string) {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  return `${formatted}${unit === "%" ? "%" : ` ${unit}`}`;
}

function formatMoment(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function MelModule({ year, activities, teamMembers, session }: Props) {
  const [indicators, setIndicators] = useState<MelIndicator[]>([]);
  const [results, setResults] = useState<MelResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<MelResult["period"]>(currentQuarter());
  const [goal, setGoal] = useState("all");
  const [level, setLevel] = useState("all");
  const [owner, setOwner] = useState("all");
  const [reportingStatus, setReportingStatus] = useState("all");
  const [indicatorDialogOpen, setIndicatorDialogOpen] = useState(false);
  const [indicatorForm, setIndicatorForm] = useState<IndicatorDraft>(emptyIndicator());
  const [activityLinkQuery, setActivityLinkQuery] = useState("");
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultIndicator, setResultIndicator] = useState<MelIndicator | null>(null);
  const [resultForm, setResultForm] = useState<ResultDraft>({ id: "", indicatorId: "", period: currentQuarter(), actualValue: "", note: "", evidenceReference: "", reviewComment: "" });
  const [historyIndicator, setHistoryIndicator] = useState<MelIndicator | null>(null);
  const [deleteIndicator, setDeleteIndicator] = useState<MelIndicator | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/mel?year=${year}`)
      .then(async (response) => {
        const payload = (await response.json()) as { indicators?: MelIndicator[]; results?: MelResult[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "MEL indicators could not be loaded.");
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setIndicators(payload.indicators ?? []);
        setResults(payload.results ?? []);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "MEL indicators could not be loaded.");
        setIndicators([]);
        setResults([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [year]);

  const goals = useMemo(
    () => [...new Set(activities.map((item) => item.goal).filter(Boolean) as string[])].sort(),
    [activities],
  );
  const resultByIndicatorPeriod = useMemo(
    () => new Map(results.map((item) => [`${item.indicatorId}:${item.period}`, item])),
    [results],
  );

  const visibleIndicators = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return indicators.filter((item) => {
      const result = resultByIndicatorPeriod.get(`${item.id}:${period}`);
      const status = result?.workflowStatus ?? "not_reported";
      return (
        (!needle || `${item.code} ${item.name} ${item.definition}`.toLowerCase().includes(needle)) &&
        (goal === "all" || item.goal === goal) &&
        (level === "all" || item.level === level) &&
        (owner === "all" || item.responsibleMemberId === owner) &&
        (reportingStatus === "all" || status === reportingStatus)
      );
    });
  }, [goal, indicators, level, owner, period, query, reportingStatus, resultByIndicatorPeriod]);

  const summary = useMemo(() => {
    const active = indicators.filter((item) => item.active);
    const periodResults = active.map((item) => resultByIndicatorPeriod.get(`${item.id}:${period}`) ?? null);
    const reported = periodResults.filter(Boolean) as MelResult[];
    const approved = reported.filter((item) => item.workflowStatus === "approved").length;
    const percentages = active
      .map((item) => {
        const actual = resultByIndicatorPeriod.get(`${item.id}:${period}`)?.actualValue ?? null;
        const target = targetFor(item, period);
        return actual !== null && target !== null && target !== 0 ? Math.max(0, (actual / target) * 100) : null;
      })
      .filter((value): value is number => value !== null);
    return {
      active: active.length,
      reported: reported.length,
      approved,
      missing: active.length - reported.length,
      average: percentages.length ? Math.round(percentages.reduce((total, value) => total + value, 0) / percentages.length) : 0,
    };
  }, [indicators, period, resultByIndicatorPeriod]);

  const statusCounts = useMemo(() => {
    const counts = { on_track: 0, needs_attention: 0, off_track: 0, not_reported: 0 };
    indicators.filter((item) => item.active).forEach((item) => {
      const result = resultByIndicatorPeriod.get(`${item.id}:${period}`);
      counts[deliveryStatus(result?.actualValue ?? null, targetFor(item, period)) as keyof typeof counts] += 1;
    });
    return counts;
  }, [indicators, period, resultByIndicatorPeriod]);

  const levelDashboard = useMemo(
    () =>
      (["output", "outcome", "impact"] as const).map((indicatorLevel) => {
        const items = indicators.filter(
          (item) => item.active && item.level === indicatorLevel,
        );
        const reported = items.filter((item) =>
          resultByIndicatorPeriod.has(`${item.id}:${period}`),
        ).length;
        const percentages = items
          .map((item) => {
            const actual = resultByIndicatorPeriod.get(`${item.id}:${period}`)?.actualValue;
            const target = targetFor(item, period);
            return actual !== undefined && target !== null && target !== 0
              ? Math.max(0, Math.round((actual / target) * 100))
              : null;
          })
          .filter((value): value is number => value !== null);
        return {
          level: indicatorLevel,
          items,
          reported,
          average: percentages.length
            ? Math.round(
                percentages.reduce((total, value) => total + value, 0) /
                  percentages.length,
              )
            : 0,
        };
      }),
    [indicators, period, resultByIndicatorPeriod],
  );

  function openIndicator(item?: MelIndicator) {
    setIndicatorForm(item ? indicatorDraft(item) : emptyIndicator());
    setActivityLinkQuery("");
    setIndicatorDialogOpen(true);
  }

  async function saveIndicator() {
    setSaving(true);
    try {
      const response = await fetch("/api/mel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entity: "indicator",
          planYear: year,
          ...indicatorForm,
          activityKey: JSON.stringify(indicatorForm.activityKeys),
        }),
      });
      const payload = (await response.json()) as { indicator?: MelIndicator; error?: string };
      if (!response.ok || !payload.indicator) throw new Error(payload.error || "Indicator could not be saved.");
      setIndicators((items) => [...items.filter((item) => item.id !== payload.indicator!.id), payload.indicator!].sort((a, b) => a.code.localeCompare(b.code)));
      setIndicatorDialogOpen(false);
      toast.success(indicatorForm.id ? "Indicator updated" : "Indicator added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Indicator could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function openResult(item: MelIndicator, selectedPeriod: MelResult["period"] = period) {
    const existing = resultByIndicatorPeriod.get(`${item.id}:${selectedPeriod}`);
    setResultIndicator(item);
    setResultForm({
      id: existing?.id ?? "",
      indicatorId: item.id,
      period: selectedPeriod,
      actualValue: existing ? String(existing.actualValue) : "",
      note: existing?.note ?? "",
      evidenceReference: existing?.evidenceReference ?? "",
      reviewComment: existing?.reviewComment ?? "",
    });
    setResultDialogOpen(true);
  }

  function changeResultPeriod(next: MelResult["period"]) {
    if (!resultIndicator) return;
    const existing = resultByIndicatorPeriod.get(`${resultIndicator.id}:${next}`);
    setResultForm({
      id: existing?.id ?? "",
      indicatorId: resultIndicator.id,
      period: next,
      actualValue: existing ? String(existing.actualValue) : "",
      note: existing?.note ?? "",
      evidenceReference: existing?.evidenceReference ?? "",
      reviewComment: existing?.reviewComment ?? "",
    });
  }

  async function saveResult(action: "save" | "submit" | "review" | "approve" | "return") {
    setSaving(true);
    try {
      const response = await fetch("/api/mel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity: "result", action, ...resultForm }),
      });
      const payload = (await response.json()) as { result?: MelResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Indicator result could not be saved.");
      setResults((items) => [payload.result!, ...items.filter((item) => item.id !== payload.result!.id)]);
      setResultDialogOpen(false);
      toast.success(action === "approve" ? "Result approved" : action === "review" ? "Result reviewed" : action === "submit" ? "Result submitted" : action === "return" ? "Result returned to draft" : "Draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Indicator result could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function removeIndicator() {
    if (!deleteIndicator) return;
    setSaving(true);
    try {
      const response = await fetch("/api/mel", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity: "indicator", id: deleteIndicator.id }),
      });
      const payload = (await response.json()) as { deleted?: boolean; error?: string };
      if (!response.ok || !payload.deleted) throw new Error(payload.error || "Indicator could not be removed.");
      setIndicators((items) => items.filter((item) => item.id !== deleteIndicator.id));
      setResults((items) => items.filter((item) => item.indicatorId !== deleteIndicator.id));
      setDeleteIndicator(null);
      toast.success("Indicator removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Indicator could not be removed.");
    } finally {
      setSaving(false);
    }
  }

  async function exportExcel() {
    try {
      const { downloadMelExcel } = await import("@/lib/mel-excel");
      downloadMelExcel({
        year,
        period,
        indicators: visibleIndicators,
        results: results.filter((item) => visibleIndicators.some((indicator) => indicator.id === item.indicatorId)),
        teamMembers,
        activities,
      });
      toast.success("MEL Excel prepared");
    } catch {
      toast.error("MEL Excel could not be prepared.");
    }
  }

  const currentResult = resultIndicator ? resultByIndicatorPeriod.get(`${resultIndicator.id}:${resultForm.period}`) : undefined;
  const historyResults = historyIndicator
    ? results.filter((item) => item.indicatorId === historyIndicator.id).sort((a, b) => (periodOrder[a.period] ?? 99) - (periodOrder[b.period] ?? 99))
    : [];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-[#cad8ce] bg-gradient-to-br from-[#0c3b2d] to-[#245f47] text-white shadow-[0_12px_30px_rgba(12,59,45,0.16)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#dbf081]">
              <Target className="h-4 w-4" /> Indicator management
            </div>
            <h2 className="mt-2 text-2xl font-black">MEL indicator dashboard</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              Maintain indicator definitions and targets, enter periodic results, review submissions, and track reporting completeness for {year}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {session?.isAdmin && (
                <Button onClick={() => openIndicator()} className="bg-[#dbf081] text-[#153829] hover:bg-[#e7f5a9]">
                  <Plus className="h-4 w-4" /> Add indicator
                </Button>
              )}
              <Button variant="outline" onClick={() => void exportExcel()} disabled={!visibleIndicators.length} className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <FileSpreadsheet className="h-4 w-4" /> Export filtered Excel
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 self-end">
            {[
              ["Active indicators", summary.active],
              [`${period} reported`, summary.reported],
              ["Approved", summary.approved],
              ["Average achieved", `${summary.average}%`],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs font-semibold text-white/65">{label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {summary.missing > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div><p className="font-black text-amber-950">{summary.missing} indicator reports are missing for {period}</p><p className="mt-0.5 text-sm text-amber-800">Filter by Not reported to identify the responsible indicators.</p></div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReportingStatus("not_reported")} className="border-amber-300 bg-white text-amber-900">Show missing reports</Button>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Indicators by results level</h3>
            <p className="mt-0.5 text-sm text-[#718178]">
              Output, outcome, and impact indicators shown in parallel for {period}.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {levelDashboard.map((column, index) => (
            <article
              key={column.level}
              className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_22px_rgba(20,36,27,0.04)] ${
                index === 0
                  ? "border-emerald-200"
                  : index === 1
                    ? "border-blue-200"
                    : "border-violet-200"
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 py-3 ${
                  index === 0
                    ? "bg-emerald-50"
                    : index === 1
                      ? "bg-blue-50"
                      : "bg-violet-50"
                }`}
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#53685c]">
                    Level {index + 1}
                  </p>
                  <h4 className="mt-0.5 text-lg font-black capitalize">{column.level}</h4>
                </div>
                <span className="text-3xl font-black tabular-nums text-[#183529]">
                  {column.items.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-[#e5eae4] p-3">
                <div className="rounded-xl bg-[#f7f9f5] p-2.5">
                  <p className="text-[11px] font-semibold text-[#718178]">Reported</p>
                  <p className="mt-0.5 font-black">{column.reported}/{column.items.length}</p>
                </div>
                <div className="rounded-xl bg-[#f7f9f5] p-2.5">
                  <p className="text-[11px] font-semibold text-[#718178]">Average achieved</p>
                  <p className="mt-0.5 font-black">{column.average}%</p>
                </div>
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto p-3">
                {column.items.map((item) => {
                  const actual = resultByIndicatorPeriod.get(`${item.id}:${period}`)?.actualValue ?? null;
                  const target = targetFor(item, period);
                  const achieved =
                    actual !== null && target !== null && target !== 0
                      ? Math.max(0, Math.round((actual / target) * 100))
                      : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openResult(item)}
                      className="w-full rounded-xl border border-[#e2e8df] p-2.5 text-left transition hover:border-[#9eb7a5] hover:bg-[#f7faf5]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-[#245f47]">{item.code}</span>
                        <span className="text-xs font-black">{achieved === null ? "—" : `${achieved}%`}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-[#294438]">{item.name}</p>
                    </button>
                  );
                })}
                {!column.items.length && (
                  <p className="py-6 text-center text-xs text-[#718178]">No active {column.level} indicators.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
        <article className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_24px_rgba(20,36,27,0.04)]">
          <div className="flex items-center justify-between"><div><h3 className="font-black">Delivery status</h3><p className="text-xs text-[#718178]">Target achievement for {period}</p></div><Gauge className="h-5 w-5 text-[#2f634c]" /></div>
          <div className="mt-4 space-y-3">
            {Object.entries(statusCounts).map(([key, count]) => {
              const meta = deliveryMeta[key];
              const width = summary.active ? Math.round((count / summary.active) * 100) : 0;
              return <div key={key}><div className="mb-1 flex items-center justify-between text-xs font-bold"><span>{meta.label}</span><span>{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf1eb]"><div className={`h-full rounded-full ${key === "on_track" ? "bg-emerald-600" : key === "needs_attention" ? "bg-amber-500" : key === "off_track" ? "bg-rose-600" : "bg-slate-400"}`} style={{ width: `${width}%` }} /></div></div>;
            })}
          </div>
        </article>
        <article className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_24px_rgba(20,36,27,0.04)]">
          <div className="flex items-center justify-between"><div><h3 className="font-black">Target versus actual</h3><p className="text-xs text-[#718178]">Highest-priority gaps in the selected period</p></div><BarChart3 className="h-5 w-5 text-[#2f634c]" /></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {indicators.filter((item) => item.active).map((item) => {
              const actual = resultByIndicatorPeriod.get(`${item.id}:${period}`)?.actualValue ?? null;
              const target = targetFor(item, period);
              const pct = actual !== null && target !== null && target !== 0 ? Math.max(0, Math.min(100, Math.round((actual / target) * 100))) : 0;
              return { item, actual, target, pct };
            }).sort((a, b) => a.pct - b.pct).slice(0, 4).map(({ item, actual, target, pct }) => (
              <button key={item.id} type="button" onClick={() => openResult(item)} className="rounded-xl bg-[#f5f8f3] p-3 text-left transition hover:bg-[#edf4ea]">
                <div className="flex justify-between gap-2"><span className="truncate text-xs font-black">{item.code} · {item.name}</span><span className="text-xs font-black">{actual === null ? "—" : `${pct}%`}</span></div>
                <Progress value={pct} className="mt-2 h-1.5 bg-[#dde6dc] [&_[data-slot=progress-indicator]]:bg-[#2c795a]" />
                <p className="mt-1.5 text-[11px] text-[#718178]">{formatValue(actual, item.unit)} of {formatValue(target, item.unit)}</p>
              </button>
            ))}
            {!indicators.length && <p className="col-span-2 py-6 text-center text-sm text-[#718178]">Add indicators to begin tracking targets and actual results.</p>}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-[#d7ded5] bg-white shadow-[0_8px_26px_rgba(20,36,27,0.05)]">
        <div className="border-b border-[#e1e7df] p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search indicator code, name, or definition" className="h-10 bg-[#f8faf7] pl-9" /></label>
            <div className="grid gap-2 sm:grid-cols-3 xl:flex">
              <NativeSelect value={period} onChange={(event) => setPeriod(event.target.value as MelResult["period"])} className="h-10 xl:w-28">{periods.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect>
              <NativeSelect value={goal} onChange={(event) => setGoal(event.target.value)} className="h-10 xl:w-36"><NativeSelectOption value="all">All goals</NativeSelectOption>{goals.map((item) => <NativeSelectOption key={item} value={item}>{item === "All goals" ? "Cross-goal" : item}</NativeSelectOption>)}</NativeSelect>
              <NativeSelect value={level} onChange={(event) => setLevel(event.target.value)} className="h-10 xl:w-36"><NativeSelectOption value="all">All levels</NativeSelectOption><NativeSelectOption value="output">Output</NativeSelectOption><NativeSelectOption value="outcome">Outcome</NativeSelectOption><NativeSelectOption value="impact">Impact</NativeSelectOption></NativeSelect>
              <NativeSelect value={owner} onChange={(event) => setOwner(event.target.value)} className="h-10 xl:w-44"><NativeSelectOption value="all">All responsible people</NativeSelectOption>{teamMembers.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect>
              <NativeSelect value={reportingStatus} onChange={(event) => setReportingStatus(event.target.value)} className="h-10 xl:w-40"><NativeSelectOption value="all">All reporting statuses</NativeSelectOption><NativeSelectOption value="not_reported">Not reported</NativeSelectOption><NativeSelectOption value="draft">Draft</NativeSelectOption><NativeSelectOption value="submitted">Submitted</NativeSelectOption><NativeSelectOption value="reviewed">Reviewed</NativeSelectOption><NativeSelectOption value="approved">Approved</NativeSelectOption></NativeSelect>
            </div>
          </div>
          <p className="mt-2 text-xs text-[#718178]">{visibleIndicators.length} of {indicators.length} indicators shown</p>
        </div>

        <div className="divide-y divide-[#e4e9e2]">
          {visibleIndicators.map((item) => {
            const selectedResult = resultByIndicatorPeriod.get(`${item.id}:${period}`);
            const target = targetFor(item, period);
            const actual = selectedResult?.actualValue ?? null;
            const pct = actual !== null && target !== null && target !== 0 ? Math.round((actual / target) * 100) : null;
            const delivery = deliveryMeta[deliveryStatus(actual, target)];
            const member = teamMembers.find((memberItem) => memberItem.id === item.responsibleMemberId);
            const linkedActivities = indicatorActivityKeys(item.activityKey)
              .map((key) => activities.find((activityItem) => activityItem.id === key))
              .filter((activityItem): activityItem is ActivityOption => Boolean(activityItem));
            return (
              <article key={item.id} className="grid gap-4 p-4 transition hover:bg-[#fbfcfa] lg:grid-cols-[minmax(0,1.45fr)_0.75fr_0.8fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#e9f1e7] px-2 py-1 text-xs font-black text-[#245f47]">{item.code}</span><span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#718178]">{item.level}</span>{!item.active && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Inactive</span>}</div>
                  <h3 className="mt-2 text-sm font-black leading-5 text-[#183529]">{item.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#718178]">{item.definition || "No definition entered"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#65766d]"><span>{item.goal === "All goals" ? "Cross-goal" : item.goal || "No goal"}</span><span>{linkedActivities.length ? `${linkedActivities.length} linked ${linkedActivities.length === 1 ? "activity" : "activities"}: ${linkedActivities.map((activity) => activity.code || activity.uid).join(", ")}` : "No linked activity"}</span><span>{member?.name || "No responsible person"}</span></div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#718178]">{period} target / actual</p>
                  <p className="mt-1 text-sm font-black">{formatValue(target, item.unit)} <span className="font-normal text-[#718178]">/</span> {formatValue(actual, item.unit)}</p>
                  <Progress value={pct === null ? 0 : Math.min(100, Math.max(0, pct))} className="mt-2 h-1.5 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]" />
                  <p className="mt-1 text-[11px] text-[#718178]">{pct === null ? "No comparable result" : `${pct}% achieved · ${formatValue(Math.max(0, (target ?? 0) - (actual ?? 0)), item.unit)} remaining`}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:block lg:space-y-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${delivery.tone}`}>{delivery.label}</span><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${workflowTone[selectedResult?.workflowStatus ?? "not_reported"]}`}>{selectedResult ? selectedResult.workflowStatus.replace(/^./, (value) => value.toUpperCase()) : "Not reported"}</span>{selectedResult && <p className="text-[11px] text-[#718178]">Updated {formatMoment(selectedResult.updatedAt)}</p>}</div>
                <div className="flex flex-wrap justify-start gap-1.5 lg:max-w-[230px] lg:justify-end"><Button size="sm" onClick={() => openResult(item)} className="h-8 bg-[#0c3b2d] px-2.5 text-xs text-white hover:bg-[#174d3a]">{selectedResult ? "Update result" : "Enter result"}</Button><Button variant="outline" size="sm" onClick={() => setHistoryIndicator(item)} className="h-8 px-2.5 text-xs"><History className="h-3.5 w-3.5" /> History</Button>{session?.isAdmin && <Button variant="outline" size="sm" onClick={() => openIndicator(item)} className="h-8 px-2.5 text-xs"><PencilLine className="h-3.5 w-3.5" /> Edit</Button>}</div>
              </article>
            );
          })}
          {!loading && !visibleIndicators.length && <div className="px-6 py-14 text-center"><Target className="mx-auto h-7 w-7 text-[#8a9b91]" /><p className="mt-3 font-black">No indicators match these filters</p><p className="mt-1 text-sm text-[#718178]">Clear a filter or add the first indicator for {year}.</p></div>}
          {loading && <div className="px-6 py-14 text-center text-sm text-[#718178]">Loading MEL indicators…</div>}
        </div>
      </section>

      <Dialog open={indicatorDialogOpen} onOpenChange={setIndicatorDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>{indicatorForm.id ? "Edit indicator" : "Add indicator"}</DialogTitle><DialogDescription>Define the indicator, responsibility, links, baseline, and reporting targets.</DialogDescription></DialogHeader>
          <div className="grid gap-5 py-2 lg:grid-cols-2">
            <section className="space-y-3 rounded-2xl bg-[#f5f8f3] p-4"><div><p className="font-black">1. Indicator definition</p><p className="text-xs text-[#718178]">Required identification and measurement rules.</p></div><div className="grid gap-3 sm:grid-cols-[150px_1fr]"><label className="space-y-1"><span className="text-xs font-bold">Indicator code *</span><Input value={indicatorForm.code} onChange={(event) => setIndicatorForm((form) => ({ ...form, code: event.target.value }))} placeholder="IND-01" /></label><label className="space-y-1"><span className="text-xs font-bold">Indicator name *</span><Input value={indicatorForm.name} onChange={(event) => setIndicatorForm((form) => ({ ...form, name: event.target.value }))} /></label></div><label className="block space-y-1"><span className="text-xs font-bold">Definition</span><Textarea value={indicatorForm.definition} onChange={(event) => setIndicatorForm((form) => ({ ...form, definition: event.target.value }))} className="min-h-24" /></label><div className="grid gap-3 sm:grid-cols-3"><label className="space-y-1"><span className="text-xs font-bold">Unit *</span><Input value={indicatorForm.unit} onChange={(event) => setIndicatorForm((form) => ({ ...form, unit: event.target.value }))} placeholder="%, people, hectares" /></label><label className="space-y-1"><span className="text-xs font-bold">Level *</span><NativeSelect value={indicatorForm.level} onChange={(event) => setIndicatorForm((form) => ({ ...form, level: event.target.value as MelIndicator["level"] }))}><NativeSelectOption value="output">Output</NativeSelectOption><NativeSelectOption value="outcome">Outcome</NativeSelectOption><NativeSelectOption value="impact">Impact</NativeSelectOption></NativeSelect></label><label className="space-y-1"><span className="text-xs font-bold">Frequency *</span><NativeSelect value={indicatorForm.reportingFrequency} onChange={(event) => setIndicatorForm((form) => ({ ...form, reportingFrequency: event.target.value as MelIndicator["reportingFrequency"] }))}><NativeSelectOption value="quarterly">Quarterly</NativeSelectOption><NativeSelectOption value="annual">Annual</NativeSelectOption></NativeSelect></label></div><label className="block space-y-1"><span className="text-xs font-bold">Data source</span><Input value={indicatorForm.dataSource} onChange={(event) => setIndicatorForm((form) => ({ ...form, dataSource: event.target.value }))} placeholder="Survey, administrative record, report…" /></label></section>
            <section className="space-y-3 rounded-2xl bg-[#f5f8f3] p-4">
              <div><p className="font-black">2. Responsibility and workplan links</p><p className="text-xs text-[#718178]">Connect one indicator to any number of main activity lines.</p></div>
              <label className="block space-y-1"><span className="text-xs font-bold">Responsible person</span><NativeSelect value={indicatorForm.responsibleMemberId} onChange={(event) => setIndicatorForm((form) => ({ ...form, responsibleMemberId: event.target.value }))}><NativeSelectOption value="">Not assigned</NativeSelectOption>{teamMembers.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}</NativeSelect></label>
              <label className="block space-y-1"><span className="text-xs font-bold">Goal</span><NativeSelect value={indicatorForm.goal} onChange={(event) => setIndicatorForm((form) => ({ ...form, goal: event.target.value }))}><NativeSelectOption value="">Not linked</NativeSelectOption>{goals.map((item) => <NativeSelectOption key={item} value={item}>{item === "All goals" ? "Cross-goal" : item}</NativeSelectOption>)}</NativeSelect></label>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">Linked main activities</span><span className="text-[11px] font-semibold text-[#5f7568]">{indicatorForm.activityKeys.length} selected</span></div>
                <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#718178]" /><Input value={activityLinkQuery} onChange={(event) => setActivityLinkQuery(event.target.value)} placeholder="Search code or activity" className="h-9 bg-white pl-8 text-xs" /></label>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#d9e1d8] bg-white p-2">
                  {activities.filter((item) => `${item.code || item.uid} ${item.title}`.toLocaleLowerCase().includes(activityLinkQuery.trim().toLocaleLowerCase())).map((item) => {
                    const checked = indicatorForm.activityKeys.includes(item.id);
                    return <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-xs hover:bg-[#f3f7f1]"><Checkbox checked={checked} onCheckedChange={(nextChecked) => setIndicatorForm((form) => ({ ...form, activityKeys: nextChecked === true ? [...form.activityKeys, item.id] : form.activityKeys.filter((key) => key !== item.id) }))} /><span><strong className="font-mono text-[#245f47]">{item.code || item.uid}</strong><span className="ml-2 font-semibold text-[#294438]">{item.title}</span></span></label>;
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-[#d9e1d8] bg-white p-3 text-sm font-semibold"><Checkbox checked={indicatorForm.active} onCheckedChange={(checked) => setIndicatorForm((form) => ({ ...form, active: checked === true }))} /> Active indicator</label>
            </section>
            <section className="space-y-3 rounded-2xl bg-[#f5f8f3] p-4 lg:col-span-2">
              <div><p className="font-black">3. Baseline and annual target</p><p className="text-xs text-[#718178]">Quarterly results are measured against the annual target.</p></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="space-y-1"><span className="text-xs font-bold">Baseline value</span><Input type="number" step="any" value={indicatorForm.baselineValue} onChange={(event) => setIndicatorForm((form) => ({ ...form, baselineValue: event.target.value }))} /></label><label className="space-y-1"><span className="text-xs font-bold">Baseline year</span><Input type="number" value={indicatorForm.baselineYear} onChange={(event) => setIndicatorForm((form) => ({ ...form, baselineYear: event.target.value }))} /></label><label className="space-y-1"><span className="text-xs font-bold">Annual target</span><Input type="number" step="any" value={indicatorForm.annualTarget} onChange={(event) => setIndicatorForm((form) => ({ ...form, annualTarget: event.target.value }))} /></label><label className="space-y-1"><span className="text-xs font-bold">End target</span><Input type="number" step="any" value={indicatorForm.endTarget} onChange={(event) => setIndicatorForm((form) => ({ ...form, endTarget: event.target.value }))} /></label></div>
            </section>
          </div>
          <DialogFooter className="sm:justify-between">{indicatorForm.id && <Button variant="outline" onClick={() => { setIndicatorDialogOpen(false); setDeleteIndicator(indicators.find((item) => item.id === indicatorForm.id) ?? null); }} className="border-rose-200 text-rose-700"><Trash2 className="h-4 w-4" /> Remove</Button>}<div className="flex gap-2"><Button variant="outline" onClick={() => setIndicatorDialogOpen(false)}>Cancel</Button><Button onClick={() => void saveIndicator()} disabled={saving} className="bg-[#0c3b2d] text-white">{saving ? "Saving…" : "Save indicator"}</Button></div></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{resultIndicator?.code} · Record indicator result</DialogTitle><DialogDescription>{resultIndicator?.name}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2"><label className="space-y-1"><span className="text-xs font-bold">Reporting period *</span><NativeSelect value={resultForm.period} onChange={(event) => changeResultPeriod(event.target.value as MelResult["period"])}>{(resultIndicator?.reportingFrequency === "annual" ? ["Annual"] : periods).map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label><label className="space-y-1"><span className="text-xs font-bold">Actual result *</span><div className="flex items-center gap-2"><Input type="number" step="any" value={resultForm.actualValue} onChange={(event) => setResultForm((form) => ({ ...form, actualValue: event.target.value }))} /><span className="shrink-0 text-sm font-bold text-[#65766d]">{resultIndicator?.unit}</span></div></label><div className="rounded-xl bg-[#eef4eb] p-3 sm:col-span-2"><div className="flex flex-wrap justify-between gap-2 text-sm"><span>Target for {resultForm.period}</span><strong>{resultIndicator ? formatValue(targetFor(resultIndicator, resultForm.period), resultIndicator.unit) : "—"}</strong></div></div><label className="space-y-1 sm:col-span-2"><span className="text-xs font-bold">Progress explanation</span><Textarea value={resultForm.note} onChange={(event) => setResultForm((form) => ({ ...form, note: event.target.value }))} className="min-h-24" placeholder="Explain the result, important changes, and any variance from target." /></label><label className="space-y-1 sm:col-span-2"><span className="text-xs font-bold">Evidence reference</span><Input value={resultForm.evidenceReference} onChange={(event) => setResultForm((form) => ({ ...form, evidenceReference: event.target.value }))} placeholder="Report title, SharePoint link, survey reference, or file location" /></label>{session?.isAdmin && currentResult && <label className="space-y-1 sm:col-span-2"><span className="text-xs font-bold">Review comment</span><Textarea value={resultForm.reviewComment} onChange={(event) => setResultForm((form) => ({ ...form, reviewComment: event.target.value }))} placeholder="Feedback or approval note" /></label>}</div>
          {currentResult && <div className="rounded-xl border border-[#dce4da] bg-[#f8faf7] p-3 text-xs text-[#65766d]"><p><strong>Current status:</strong> {currentResult.workflowStatus}</p><p className="mt-1"><strong>Last updated:</strong> {formatMoment(currentResult.updatedAt)} by {currentResult.updatedBy}</p></div>}
          <DialogFooter className="flex-wrap sm:justify-between"><div>{session?.isAdmin && currentResult && ["submitted", "reviewed", "approved"].includes(currentResult.workflowStatus) && <Button variant="outline" onClick={() => void saveResult("return")} disabled={saving}>Return to draft</Button>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setResultDialogOpen(false)}>Cancel</Button><Button variant="outline" onClick={() => void saveResult("save")} disabled={saving || resultForm.actualValue === ""}>Save draft</Button>{(!currentResult || currentResult.workflowStatus === "draft") && <Button onClick={() => void saveResult("submit")} disabled={saving || resultForm.actualValue === ""} className="bg-[#0c3b2d] text-white">Submit</Button>}{session?.isAdmin && currentResult?.workflowStatus === "submitted" && <Button onClick={() => void saveResult("review")} disabled={saving} className="bg-violet-700 text-white"><CircleCheck className="h-4 w-4" /> Mark reviewed</Button>}{session?.isAdmin && currentResult?.workflowStatus === "reviewed" && <Button onClick={() => void saveResult("approve")} disabled={saving} className="bg-emerald-700 text-white"><CircleCheck className="h-4 w-4" /> Approve</Button>}</div></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyIndicator)} onOpenChange={(open) => !open && setHistoryIndicator(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{historyIndicator?.code} · Result history</DialogTitle><DialogDescription>Separate reporting-period records and their submission, review, and approval history.</DialogDescription></DialogHeader><div className="space-y-2">{historyResults.map((item) => <article key={item.id} className="rounded-xl border border-[#dce4da] bg-[#f8faf7] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black">{item.period} · {formatValue(item.actualValue, historyIndicator?.unit ?? "")}</p><p className="mt-1 text-xs text-[#718178]">Entered {formatMoment(item.enteredAt)} by {item.enteredBy}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${workflowTone[item.workflowStatus]}`}>{item.workflowStatus}</span></div>{item.note && <p className="mt-3 text-sm leading-6">{item.note}</p>}{item.evidenceReference && <p className="mt-2 text-xs text-[#315845]"><strong>Evidence:</strong> {item.evidenceReference}</p>}<div className="mt-3 grid gap-1 border-t border-[#dde4dc] pt-3 text-xs text-[#65766d] sm:grid-cols-3"><span>Submitted: {item.submittedAt ? `${formatMoment(item.submittedAt)} · ${item.submittedBy}` : "—"}</span><span>Reviewed: {item.reviewedAt ? `${formatMoment(item.reviewedAt)} · ${item.reviewedBy}` : "—"}</span><span>Approved: {item.approvedAt ? `${formatMoment(item.approvedAt)} · ${item.approvedBy}` : "—"}</span></div>{item.reviewComment && <p className="mt-2 rounded-lg bg-white p-2 text-xs"><strong>Review comment:</strong> {item.reviewComment}</p>}</article>)}{!historyResults.length && <p className="py-10 text-center text-sm text-[#718178]">No results have been entered for this indicator.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setHistoryIndicator(null)}>Close</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteIndicator)} onOpenChange={(open) => !open && setDeleteIndicator(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this indicator?</AlertDialogTitle><AlertDialogDescription>This removes {deleteIndicator?.code} and all of its saved reporting results. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void removeIndicator()} disabled={saving} className="bg-rose-700 text-white hover:bg-rose-800">Remove indicator</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
