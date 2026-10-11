"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  History,
  Link2,
  PencilLine,
  Search,
  Target,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

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
import type { TeamMember } from "@/lib/team-members";

type KpiActivity = {
  id: string;
  code: string;
  title: string;
  subactivities: Array<{ id: string; title: string }>;
};

type KpiSession = {
  memberId: string;
  isAdmin: boolean;
};

type KpiReview = {
  id: string;
  memberId: string;
  planYear: number;
  period: KpiPeriod;
  linkedActivityKeys: string;
  achievementNote: string;
  selfPerformanceScore: number;
  selfAttendanceScore: number;
  selfDevelopmentScore: number;
  reviewPerformanceScore: number | null;
  reviewAttendanceScore: number | null;
  reviewDevelopmentScore: number | null;
  cultureBonus: number;
  reviewComment: string;
  workflowStatus: KpiStatus;
  updatedAt: string;
  updatedBy: string;
};

type KpiHistory = {
  id: string;
  changedAt: string;
  changedBy: string;
  snapshot: KpiReview | null;
};

type KpiPeriod = "Q1" | "Q2" | "Q3" | "Q4" | "Annual";
type KpiStatus = "draft" | "submitted" | "reviewed" | "approved";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

type KpiDraft = {
  period: KpiPeriod;
  linkedActivityKeys: string[];
  achievementNote: string;
  selfPerformanceScore: string;
  selfAttendanceScore: string;
  selfDevelopmentScore: string;
  reviewPerformanceScore: string;
  reviewAttendanceScore: string;
  reviewDevelopmentScore: string;
  cultureBonus: string;
  reviewComment: string;
  workflowStatus: KpiStatus;
};

const periods: KpiPeriod[] = ["Q1", "Q2", "Q3", "Q4", "Annual"];
const statusMeta: Record<KpiStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "border-slate-200 bg-slate-50 text-slate-700" },
  submitted: { label: "Submitted", tone: "border-blue-200 bg-blue-50 text-blue-700" },
  reviewed: { label: "Reviewed", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  approved: { label: "Approved", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
};

function parseKeys(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function emptyDraft(period: KpiPeriod): KpiDraft {
  return {
    period,
    linkedActivityKeys: [],
    achievementNote: "",
    selfPerformanceScore: "0",
    selfAttendanceScore: "0",
    selfDevelopmentScore: "0",
    reviewPerformanceScore: "",
    reviewAttendanceScore: "",
    reviewDevelopmentScore: "",
    cultureBonus: "0",
    reviewComment: "",
    workflowStatus: "draft",
  };
}

function reviewDraft(review: KpiReview): KpiDraft {
  return {
    period: review.period,
    linkedActivityKeys: parseKeys(review.linkedActivityKeys),
    achievementNote: review.achievementNote,
    selfPerformanceScore: String(review.selfPerformanceScore),
    selfAttendanceScore: String(review.selfAttendanceScore),
    selfDevelopmentScore: String(review.selfDevelopmentScore),
    reviewPerformanceScore: review.reviewPerformanceScore === null ? "" : String(review.reviewPerformanceScore),
    reviewAttendanceScore: review.reviewAttendanceScore === null ? "" : String(review.reviewAttendanceScore),
    reviewDevelopmentScore: review.reviewDevelopmentScore === null ? "" : String(review.reviewDevelopmentScore),
    cultureBonus: String(review.cultureBonus),
    reviewComment: review.reviewComment,
    workflowStatus: review.workflowStatus,
  };
}

function numeric(value: string) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function weightedTotal(values: {
  performance: number;
  attendance: number;
  development: number;
  bonus: number;
}) {
  return Math.round((values.performance * 0.75 + values.attendance * 0.15 + values.development * 0.1 + values.bonus) * 10) / 10;
}

function finalScore(review: KpiReview) {
  return weightedTotal({
    performance: review.reviewPerformanceScore ?? review.selfPerformanceScore,
    attendance: review.reviewAttendanceScore ?? review.selfAttendanceScore,
    development: review.reviewDevelopmentScore ?? review.selfDevelopmentScore,
    bonus: review.cultureBonus,
  });
}

function scoreTone(value: number) {
  if (value >= 90) return "text-emerald-700";
  if (value >= 75) return "text-[#245f47]";
  if (value >= 60) return "text-amber-700";
  return "text-rose-700";
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function StaffKpiModule({
  year,
  activities,
  teamMembers,
  session,
  assignedActivityKeysByMember,
  activityQuarterNotes,
}: {
  year: number;
  activities: KpiActivity[];
  teamMembers: TeamMember[];
  session: KpiSession | null;
  assignedActivityKeysByMember: Record<string, string[]>;
  activityQuarterNotes: Record<string, Record<Quarter, string>>;
}) {
  const accessibleMembers = useMemo(
    () => session?.isAdmin
      ? teamMembers
      : teamMembers.filter(
          (member) =>
            member.id === session?.memberId ||
            member.kpiReviewerId === session?.memberId ||
            member.kpiApproverId === session?.memberId,
        ),
    [session, teamMembers],
  );
  const [memberId, setMemberId] = useState("");
  const [reviews, setReviews] = useState<KpiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [step, setStep] = useState(0);
  const [activityQuery, setActivityQuery] = useState("");
  const [draft, setDraft] = useState<KpiDraft>(() => emptyDraft("Q1"));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<KpiHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const activeMemberId = accessibleMembers.some((member) => member.id === memberId)
    ? memberId
    : accessibleMembers.some((member) => member.id === session?.memberId)
      ? session?.memberId ?? ""
      : accessibleMembers[0]?.id ?? "";

  useEffect(() => {
    if (!activeMemberId) return;
    let active = true;
    fetch(`/api/kpi?year=${year}&memberId=${encodeURIComponent(activeMemberId)}`)
      .then(async (response) => {
        const result = (await response.json()) as { reviews?: KpiReview[]; error?: string };
        if (!response.ok || !result.reviews) throw new Error(result.error || "KPI reviews could not be loaded.");
        return result.reviews;
      })
      .then((items) => { if (active) setReviews(items); })
      .catch((error) => {
        if (active) {
          setReviews([]);
          toast.error(error instanceof Error ? error.message : "KPI reviews could not be loaded.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeMemberId, year]);

  const selectedMember = accessibleMembers.find((member) => member.id === activeMemberId) ?? null;
  const isOwnReview = activeMemberId === session?.memberId;
  const canEditSelf = Boolean(session?.isAdmin || isOwnReview);
  const canReview = Boolean(
    session?.isAdmin || selectedMember?.kpiReviewerId === session?.memberId,
  );
  const canApprove = Boolean(
    session?.isAdmin || selectedMember?.kpiApproverId === session?.memberId,
  );
  const reviewerName = teamMembers.find(
    (member) => member.id === selectedMember?.kpiReviewerId,
  )?.name;
  const approverName = teamMembers.find(
    (member) => member.id === selectedMember?.kpiApproverId,
  )?.name;
  const assignedActivityKeys = useMemo(
    () => assignedActivityKeysByMember[activeMemberId] ?? [],
    [activeMemberId, assignedActivityKeysByMember],
  );
  const assignedActivityKeySet = useMemo(
    () => new Set(assignedActivityKeys),
    [assignedActivityKeys],
  );
  const reviewByPeriod = useMemo(() => new Map(reviews.map((review) => [review.period, review])), [reviews]);
  const approvedCount = reviews.filter((review) => review.workflowStatus === "approved").length;
  const pendingCount = reviews.filter((review) => review.workflowStatus === "submitted").length;
  const averageScore = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + finalScore(review), 0) / reviews.length) * 10) / 10
    : 0;
  const linkedCount = new Set(reviews.flatMap((review) => parseKeys(review.linkedActivityKeys))).size;
  const selectableActivities = useMemo(() => {
    const query = activityQuery.trim().toLocaleLowerCase();
    return activities.filter((activity) => !query || `${activity.code} ${activity.title}`.toLocaleLowerCase().includes(query));
  }, [activities, activityQuery]);
  const linkedActivities = useMemo(
    () => activities.filter((activity) => draft.linkedActivityKeys.includes(activity.id)),
    [activities, draft.linkedActivityKeys],
  );
  const availableStatuses = useMemo(() => {
    const allowed: KpiStatus[] = session?.isAdmin
      ? ["draft", "submitted", "reviewed", "approved"]
      : isOwnReview
        ? ["draft", "submitted"]
        : canReview
          ? ["submitted", "reviewed"]
          : ["reviewed", "approved"];
    return allowed.includes(draft.workflowStatus)
      ? allowed
      : [draft.workflowStatus, ...allowed];
  }, [canReview, draft.workflowStatus, isOwnReview, session?.isAdmin]);
  const draftTotal = weightedTotal({
    performance: numeric(draft.reviewPerformanceScore || draft.selfPerformanceScore),
    attendance: numeric(draft.reviewAttendanceScore || draft.selfAttendanceScore),
    development: numeric(draft.reviewDevelopmentScore || draft.selfDevelopmentScore),
    bonus: numeric(draft.cultureBonus),
  });

  function openReview(period: KpiPeriod) {
    const review = reviewByPeriod.get(period);
    setEditingId(review?.id ?? "");
    setDraft(
      review
        ? reviewDraft(review)
        : { ...emptyDraft(period), linkedActivityKeys: assignedActivityKeys },
    );
    setStep(0);
    setActivityQuery("");
    setDialogOpen(true);
  }

  async function saveReview() {
    if (!activeMemberId) return;
    setSaving(true);
    try {
      const response = await fetch("/api/kpi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          memberId: activeMemberId,
          planYear: year,
          ...draft,
          selfPerformanceScore: numeric(draft.selfPerformanceScore),
          selfAttendanceScore: numeric(draft.selfAttendanceScore),
          selfDevelopmentScore: numeric(draft.selfDevelopmentScore),
          reviewPerformanceScore: draft.reviewPerformanceScore === "" ? null : numeric(draft.reviewPerformanceScore),
          reviewAttendanceScore: draft.reviewAttendanceScore === "" ? null : numeric(draft.reviewAttendanceScore),
          reviewDevelopmentScore: draft.reviewDevelopmentScore === "" ? null : numeric(draft.reviewDevelopmentScore),
          cultureBonus: numeric(draft.cultureBonus),
        }),
      });
      const result = (await response.json()) as { review?: KpiReview; error?: string };
      if (!response.ok || !result.review) throw new Error(result.error || "KPI review could not be saved.");
      setReviews((current) => [...current.filter((item) => item.id !== result.review?.id), result.review as KpiReview]);
      setDialogOpen(false);
      toast.success(`${draft.period} KPI review saved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "KPI review could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function openHistory(review: KpiReview) {
    setHistoryOpen(true);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/kpi?reviewId=${encodeURIComponent(review.id)}`);
      const result = (await response.json()) as { history?: KpiHistory[]; error?: string };
      if (!response.ok || !result.history) throw new Error(result.error || "KPI history could not be loaded.");
      setHistory(result.history);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "KPI history could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }

  if (!session || !accessibleMembers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#cbd6cc] bg-white px-6 py-12 text-center text-sm text-[#718178]">
        Your account must be linked to a team member before a Staff KPI can be created.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5f7568]">Quarterly and annual evaluation</p>
            <h2 className="mt-1 text-xl font-black">Staff KPI</h2>
            <p className="mt-1 text-sm text-[#718178]">Plan, self-assess, review and approve staff performance without monthly reporting.</p>
          </div>
          {accessibleMembers.length > 1 && (
            <label className="min-w-64 text-xs font-bold text-[#53685c]">
              Staff member
              <NativeSelect value={activeMemberId} onChange={(event) => setMemberId(event.target.value)} className="mt-1 h-10 border-[#ced8cf] bg-[#f8faf7]">
                {accessibleMembers.map((member) => <NativeSelectOption key={member.id} value={member.id}>{member.name} · {member.role}</NativeSelectOption>)}
              </NativeSelect>
            </label>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Approved periods", value: `${approvedCount}/5`, icon: CheckCircle2 },
          { label: "Average score", value: `${averageScore}%`, icon: Target },
          { label: "Pending review", value: pendingCount, icon: UserRoundCheck },
          { label: "Linked activities", value: linkedCount, icon: Link2 },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_22px_rgba(20,36,27,0.04)]">
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#718178]">{label}</p><Icon className="h-4 w-4 text-[#2f634c]" /></div>
            <p className="mt-2 text-2xl font-black tabular-nums text-[#183529]">{value}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#cfdacf] bg-white shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
        <div className="flex flex-col gap-2 border-b border-[#dce4da] bg-[#f5f8f3] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#183529]">{selectedMember?.name}</h3><span className="rounded-full bg-[#e3eee1] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#315845]">{session.isAdmin ? "Administrator" : isOwnReview ? "Your KPI" : canReview ? "Reviewer" : "Approver"}</span></div><p className="text-xs text-[#718178]">{selectedMember?.role} · {year} KPI cycle</p><p className="mt-1 text-[11px] text-[#718178]">Reviewer: {reviewerName ?? "Not assigned"} · Approver: {approverName ?? "Not assigned"}</p></div>
          <p className="text-xs font-semibold text-[#53685c]">Weights: performance 75% · attendance 15% · development 10% · bonus up to 5</p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
          {periods.map((period) => {
            const review = reviewByPeriod.get(period);
            const score = review ? finalScore(review) : 0;
            return (
              <article key={period} className={`rounded-xl border p-4 ${period === "Annual" ? "border-[#8cae9a] bg-[#edf5ea]" : "border-[#d7ded5] bg-white"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-xs font-black uppercase tracking-[0.1em] text-[#5f7568]">{period}</p><p className={`mt-2 text-3xl font-black tabular-nums ${review ? scoreTone(score) : "text-[#a2ada6]"}`}>{review ? `${score}%` : "—"}</p></div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${review ? statusMeta[review.workflowStatus].tone : statusMeta.draft.tone}`}>{review ? statusMeta[review.workflowStatus].label : "Not started"}</span>
                </div>
                <Progress value={score} className="mt-3 h-1.5 bg-[#e1e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]" />
                <p className="mt-3 min-h-8 text-xs leading-4 text-[#718178]">{review ? `${parseKeys(review.linkedActivityKeys).length} linked activities · updated ${formatDate(review.updatedAt)}` : "Create this period's KPI review."}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => openReview(period)} className="h-8 flex-1 bg-[#0c3b2d] px-2 text-xs text-white hover:bg-[#174d3a]"><PencilLine className="h-3.5 w-3.5" /> {review ? "Open" : "Create"}</Button>
                  {review && <Button size="sm" variant="outline" onClick={() => void openHistory(review)} className="h-8 px-2 text-xs"><History className="h-3.5 w-3.5" /><span className="sr-only">History</span></Button>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {loading && <div className="rounded-xl border border-[#d7ded5] bg-white px-4 py-3 text-sm text-[#718178]">Loading Staff KPI records…</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{draft.period} Staff KPI · {selectedMember?.name}</DialogTitle><DialogDescription>Complete the three short steps. Step headings can be selected directly.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#edf3ec] p-1">
            {["Work & achievements", "Self-assessment", canReview || canApprove ? "Review & approval" : "Summary & submit"].map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-lg px-2 py-2 text-xs font-black transition ${step === index ? "bg-[#0c3b2d] text-white shadow-sm" : "text-[#53685c] hover:bg-white"}`}>{index + 1}. {label}</button>)}
          </div>

          {step === 0 && (
            <div className="space-y-4 py-2">
              <label className="block text-sm font-bold">Review period<NativeSelect value={draft.period} onChange={(event) => setDraft((current) => ({ ...current, period: event.target.value as KpiPeriod }))} disabled={Boolean(editingId) || !canEditSelf} className="mt-1"><NativeSelectOption value="Q1">Q1</NativeSelectOption><NativeSelectOption value="Q2">Q2</NativeSelectOption><NativeSelectOption value="Q3">Q3</NativeSelectOption><NativeSelectOption value="Q4">Q4</NativeSelectOption><NativeSelectOption value="Annual">Annual</NativeSelectOption></NativeSelect></label>
              <div>
                <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold">Linked workplan activities</p><p className="text-xs text-[#718178]">Responsible activities are selected automatically. Activity notes below come directly from the Work Plan.</p></div><div className="flex items-center gap-2">{canEditSelf && <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, linkedActivityKeys: assignedActivityKeys }))} className="h-8 px-2 text-xs">Use assigned activities</Button>}<span className="text-xs font-black text-[#2f634c]">{draft.linkedActivityKeys.length} selected</span></div></div>
                <label className="relative mt-2 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" /><Input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Search code or activity" className="pl-9" /></label>
                <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#d7ded5] p-2">
                  {selectableActivities.map((activity) => {
                    const checked = draft.linkedActivityKeys.includes(activity.id);
                    return <label key={activity.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-[#f3f7f1]"><Checkbox checked={checked} disabled={!canEditSelf} onCheckedChange={(value) => setDraft((current) => ({ ...current, linkedActivityKeys: value ? Array.from(new Set([...current.linkedActivityKeys, activity.id])) : current.linkedActivityKeys.filter((key) => key !== activity.id) }))} /><span className="min-w-0 flex-1 text-xs leading-4"><strong className="text-[#315845]">{activity.code}</strong> · {activity.title}</span>{assignedActivityKeySet.has(activity.id) && <span className="shrink-0 rounded-full bg-[#e6f0e4] px-2 py-0.5 text-[10px] font-bold text-[#315845]">Assigned</span>}</label>;
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-[#d7ded5] bg-[#f8faf7] p-3">
                <p className="text-sm font-black text-[#183529]">Reused Work Plan quarterly notes</p>
                <p className="mt-1 text-xs text-[#718178]">These notes are read-only here. Update them from each activity in the Work Plan.</p>
                <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
                  {linkedActivities.map((activity) => {
                    const notes = activityQuarterNotes[activity.id];
                    const entries = draft.period === "Annual"
                      ? (["Q1", "Q2", "Q3", "Q4"] as Quarter[]).map((quarter) => [quarter, notes?.[quarter] ?? ""] as const).filter(([, note]) => note.trim())
                      : [[draft.period, notes?.[draft.period as Quarter] ?? ""] as const];
                    return <details key={activity.id} className="rounded-lg border border-[#dce4da] bg-white px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-[#315845]">{activity.code} · {activity.title}</summary><div className="mt-2 space-y-2">{entries.length ? entries.map(([quarter, note]) => <div key={quarter} className="rounded-md bg-[#f3f7f1] px-2 py-1.5 text-xs leading-5 text-[#53685c]"><strong>{quarter}</strong> · {note || "No Work Plan quarterly note yet."}</div>) : <p className="text-xs text-[#718178]">No Work Plan quarterly note yet.</p>}</div></details>;
                  })}
                  {!linkedActivities.length && <p className="py-3 text-center text-xs text-[#718178]">Select at least one linked activity to see its Work Plan notes.</p>}
                </div>
              </div>
              <label className="block text-sm font-bold">{draft.period === "Annual" ? "Overall annual KPI note" : "Overall quarterly KPI note"}<Textarea value={draft.achievementNote} disabled={!canEditSelf} onChange={(event) => setDraft((current) => ({ ...current, achievementNote: event.target.value }))} placeholder="Add an overall reflection, cross-activity result, challenge or priority." className="mt-1 min-h-28" /></label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-[#d9e3d5] bg-[#f5f8f3] p-4"><p className="text-sm font-black">Self-assessment</p><p className="mt-1 text-xs text-[#718178]">Score each area from 0 to 100. The final weighting follows the KPI workbook.</p></div>
              {[
                ["Work performance", "75%", "selfPerformanceScore"],
                ["Attendance and participation", "15%", "selfAttendanceScore"],
                ["Personal development", "10%", "selfDevelopmentScore"],
              ].map(([label, weight, key]) => <label key={key} className="grid items-center gap-2 rounded-xl border border-[#d7ded5] p-3 sm:grid-cols-[1fr_72px_120px]"><span className="text-sm font-bold">{label}</span><span className="text-xs font-black text-[#5f7568]">Weight {weight}</span><Input type="number" min="0" max="100" step="0.1" disabled={!canEditSelf} value={draft[key as keyof KpiDraft] as string} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} className="text-right font-black" /></label>)}
              <div className="rounded-xl bg-[#0c3b2d] p-4 text-white"><p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-100/75">Current weighted score</p><p className="mt-1 text-3xl font-black">{weightedTotal({ performance: numeric(draft.selfPerformanceScore), attendance: numeric(draft.selfAttendanceScore), development: numeric(draft.selfDevelopmentScore), bonus: 0 })}%</p></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-2">
              {canReview || canApprove ? (
                <>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">Reviewer scores are optional. If left empty, the staff member&apos;s self-assessment is used.</div>
                  {[
                    ["Reviewed work performance", "reviewPerformanceScore"],
                    ["Reviewed attendance and participation", "reviewAttendanceScore"],
                    ["Reviewed personal development", "reviewDevelopmentScore"],
                  ].map(([label, key]) => <label key={key} className="grid items-center gap-2 rounded-xl border border-[#d7ded5] p-3 sm:grid-cols-[1fr_120px]"><span className="text-sm font-bold">{label}</span><Input type="number" min="0" max="100" step="0.1" disabled={!canReview} placeholder="Use self score" value={draft[key as keyof KpiDraft] as string} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} className="text-right font-black" /></label>)}
                  <label className="block text-sm font-bold">Team-culture bonus (0–5)<Input type="number" min="0" max="5" step="0.1" disabled={!canReview} value={draft.cultureBonus} onChange={(event) => setDraft((current) => ({ ...current, cultureBonus: event.target.value }))} className="mt-1" /></label>
                  <label className="block text-sm font-bold">Reviewer or approval comment<Textarea value={draft.reviewComment} onChange={(event) => setDraft((current) => ({ ...current, reviewComment: event.target.value }))} className="mt-1 min-h-24" placeholder="Record feedback, required follow-up or approval rationale." /></label>
                </>
              ) : <div className="rounded-xl border border-[#d9e3d5] bg-[#f5f8f3] p-4 text-sm text-[#315845]">Review the linked activities, overall KPI note and self-assessment before submitting this KPI to your assigned reviewer.</div>}
              <div className="grid gap-3 rounded-xl border border-[#cfdacf] bg-white p-4 sm:grid-cols-[1fr_180px] sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#718178]">Final weighted score</p><p className={`mt-1 text-4xl font-black ${scoreTone(draftTotal)}`}>{draftTotal}%</p></div><label className="text-sm font-bold">Workflow status<NativeSelect value={draft.workflowStatus} onChange={(event) => setDraft((current) => ({ ...current, workflowStatus: event.target.value as KpiStatus }))} className="mt-1">{availableStatuses.map((status) => <NativeSelectOption key={status} value={status} disabled={status === draft.workflowStatus && !((session.isAdmin) || (isOwnReview && ["draft", "submitted"].includes(status)) || (canReview && ["submitted", "reviewed"].includes(status)) || (canApprove && ["reviewed", "approved"].includes(status)))}>{statusMeta[status].label}</NativeSelectOption>)}</NativeSelect></label></div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <div className="flex gap-2"><Button variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>{step < 2 ? <Button onClick={() => setStep((current) => Math.min(2, current + 1))} className="bg-[#0c3b2d] text-white">Continue</Button> : <Button onClick={() => void saveReview()} disabled={saving} className="bg-[#0c3b2d] text-white">{saving ? "Saving…" : "Save KPI review"}</Button>}</div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>KPI change history</DialogTitle><DialogDescription>Every saved version is retained with the editor and time.</DialogDescription></DialogHeader>{historyLoading ? <p className="py-8 text-center text-sm text-[#718178]">Loading history…</p> : <div className="space-y-2">{history.map((item, index) => <article key={item.id} className="rounded-xl border border-[#d7ded5] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black">Version {history.length - index}</p><span className="text-xs text-[#718178]">{formatDate(item.changedAt)}</span></div><p className="mt-1 text-xs text-[#718178]">Changed by {item.changedBy}</p>{item.snapshot && <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#edf3ec] px-2 py-1">{item.snapshot.workflowStatus}</span><span className="rounded-full bg-[#edf3ec] px-2 py-1">Score {finalScore(item.snapshot)}%</span><span className="rounded-full bg-[#edf3ec] px-2 py-1">{parseKeys(item.snapshot.linkedActivityKeys).length} activities</span></div>}</article>)}{!history.length && <p className="py-8 text-center text-sm text-[#718178]">No saved history yet.</p>}</div>}</DialogContent>
      </Dialog>
    </div>
  );
}
