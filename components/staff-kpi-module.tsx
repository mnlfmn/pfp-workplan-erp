"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  History,
  Link2,
  PencilLine,
  Plus,
  Search,
  Target,
  Trash2,
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
  assessmentDetails: string;
  achievementNote: string;
  selfPerformanceScore: number;
  selfAttendanceScore: number;
  selfDevelopmentScore: number;
  reviewPerformanceScore: number | null;
  reviewAttendanceScore: number | null;
  reviewDevelopmentScore: number | null;
  cultureBonus: number;
  reviewComment: string;
  approvalComment: string;
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
  assessmentDetails: KpiAssessmentDetails;
  achievementNote: string;
  selfPerformanceScore: string;
  selfAttendanceScore: string;
  selfDevelopmentScore: string;
  reviewPerformanceScore: string;
  reviewAttendanceScore: string;
  reviewDevelopmentScore: string;
  cultureBonus: string;
  reviewComment: string;
  approvalComment: string;
  workflowStatus: KpiStatus;
};

type ActivityAssessment = {
  activityKey: string;
  selfScore: number | null;
};

type AdditionalWork = {
  id: string;
  title: string;
  outcome: string;
  completionDate: string;
  selfScore: number | null;
};

type CompetencyAssessment = {
  key: string;
  note: string;
  selfScore: number | null;
};

type KpiAssessmentDetails = {
  activityScores: ActivityAssessment[];
  additionalWorks: AdditionalWork[];
  competencies: CompetencyAssessment[];
  development: { note: string; selfScore: number | null };
  culture: { note: string; selfScore: number | null };
  staffComment: string;
};

const competencyQuestions = [
  { key: "productive-time", label: "Productive use of working time" },
  { key: "technical-quality", label: "Technical skills and quality of work" },
  { key: "teamwork", label: "Teamwork and relationships within the team" },
  { key: "partner-relations", label: "Relationships with partner organizations" },
  { key: "independence", label: "Independence and responsibility" },
  { key: "initiative", label: "Creativity and initiative" },
] as const;

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

function defaultAssessmentDetails(activityKeys: string[] = []): KpiAssessmentDetails {
  return {
    activityScores: activityKeys.map((activityKey) => ({ activityKey, selfScore: null })),
    additionalWorks: [],
    competencies: competencyQuestions.map(({ key }) => ({ key, note: "", selfScore: null })),
    development: { note: "", selfScore: null },
    culture: { note: "", selfScore: null },
    staffComment: "",
  };
}

function nullableScore(value: unknown, maximum = 100) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(maximum, Math.round(number * 10) / 10));
}

function parseAssessmentDetails(value: string, activityKeys: string[]): KpiAssessmentDetails {
  try {
    const parsed = JSON.parse(value) as Partial<KpiAssessmentDetails>;
    const savedActivityScores = Array.isArray(parsed.activityScores) ? parsed.activityScores : [];
    const savedCompetencies = Array.isArray(parsed.competencies) ? parsed.competencies : [];
    return {
      activityScores: activityKeys.map((activityKey) => {
        const saved = savedActivityScores.find((item) => item?.activityKey === activityKey);
        return { activityKey, selfScore: nullableScore(saved?.selfScore) };
      }),
      additionalWorks: Array.isArray(parsed.additionalWorks)
        ? parsed.additionalWorks.map((item) => ({
            id: String(item?.id || `additional-${crypto.randomUUID()}`),
            title: String(item?.title ?? ""),
            outcome: String(item?.outcome ?? ""),
            completionDate: String(item?.completionDate ?? ""),
            selfScore: nullableScore(item?.selfScore),
          }))
        : [],
      competencies: competencyQuestions.map(({ key }) => {
        const saved = savedCompetencies.find((item) => item?.key === key);
        return { key, note: String(saved?.note ?? ""), selfScore: nullableScore(saved?.selfScore) };
      }),
      development: {
        note: String(parsed.development?.note ?? ""),
        selfScore: nullableScore(parsed.development?.selfScore),
      },
      culture: {
        note: String(parsed.culture?.note ?? ""),
        selfScore: nullableScore(parsed.culture?.selfScore, 5),
      },
      staffComment: String(parsed.staffComment ?? ""),
    };
  } catch {
    return defaultAssessmentDetails(activityKeys);
  }
}

function averageScores(values: Array<number | null>, fallback = 0) {
  const scored = values.filter((value): value is number => value !== null);
  if (!scored.length) return fallback;
  return Math.round((scored.reduce((total, value) => total + value, 0) / scored.length) * 10) / 10;
}

function selfSectionScores(details: KpiAssessmentDetails, fallback: { performance: number; attendance: number; development: number }) {
  return {
    performance: averageScores(
      [...details.activityScores, ...details.additionalWorks].map((item) => item.selfScore),
      fallback.performance,
    ),
    attendance: averageScores(details.competencies.map((item) => item.selfScore), fallback.attendance),
    development: details.development.selfScore ?? fallback.development,
    bonus: details.culture.selfScore ?? 0,
  };
}

function emptyDraft(period: KpiPeriod): KpiDraft {
  return {
    period,
    linkedActivityKeys: [],
    assessmentDetails: defaultAssessmentDetails(),
    achievementNote: "",
    selfPerformanceScore: "0",
    selfAttendanceScore: "0",
    selfDevelopmentScore: "0",
    reviewPerformanceScore: "",
    reviewAttendanceScore: "",
    reviewDevelopmentScore: "",
    cultureBonus: "0",
    reviewComment: "",
    approvalComment: "",
    workflowStatus: "draft",
  };
}

function reviewDraft(review: KpiReview): KpiDraft {
  const linkedActivityKeys = parseKeys(review.linkedActivityKeys);
  return {
    period: review.period,
    linkedActivityKeys,
    assessmentDetails: parseAssessmentDetails(review.assessmentDetails, linkedActivityKeys),
    achievementNote: review.achievementNote,
    selfPerformanceScore: String(review.selfPerformanceScore),
    selfAttendanceScore: String(review.selfAttendanceScore),
    selfDevelopmentScore: String(review.selfDevelopmentScore),
    reviewPerformanceScore: review.reviewPerformanceScore === null ? "" : String(review.reviewPerformanceScore),
    reviewAttendanceScore: review.reviewAttendanceScore === null ? "" : String(review.reviewAttendanceScore),
    reviewDevelopmentScore: review.reviewDevelopmentScore === null ? "" : String(review.reviewDevelopmentScore),
    cultureBonus: String(review.cultureBonus),
    reviewComment: review.reviewComment,
    approvalComment: review.approvalComment,
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
  const details = parseAssessmentDetails(review.assessmentDetails, parseKeys(review.linkedActivityKeys));
  const selfScores = selfSectionScores(details, {
    performance: review.selfPerformanceScore,
    attendance: review.selfAttendanceScore,
    development: review.selfDevelopmentScore,
  });
  return weightedTotal({
    performance: review.reviewPerformanceScore ?? review.selfPerformanceScore,
    attendance: review.reviewAttendanceScore ?? review.selfAttendanceScore,
    development: review.reviewDevelopmentScore ?? review.selfDevelopmentScore,
    bonus: ["reviewed", "approved"].includes(review.workflowStatus)
      ? review.cultureBonus
      : selfScores.bonus,
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
  const draftSelfScores = selfSectionScores(draft.assessmentDetails, {
    performance: numeric(draft.selfPerformanceScore),
    attendance: numeric(draft.selfAttendanceScore),
    development: numeric(draft.selfDevelopmentScore),
  });
  const draftTotal = weightedTotal({
    performance: numeric(draft.reviewPerformanceScore || String(draftSelfScores.performance)),
    attendance: numeric(draft.reviewAttendanceScore || String(draftSelfScores.attendance)),
    development: numeric(draft.reviewDevelopmentScore || String(draftSelfScores.development)),
    bonus: ["reviewed", "approved"].includes(draft.workflowStatus)
      ? numeric(draft.cultureBonus)
      : draftSelfScores.bonus,
  });

  function openReview(period: KpiPeriod) {
    const review = reviewByPeriod.get(period);
    setEditingId(review?.id ?? "");
    setDraft(
      review
        ? reviewDraft(review)
        : {
            ...emptyDraft(period),
            linkedActivityKeys: assignedActivityKeys,
            assessmentDetails: defaultAssessmentDetails(assignedActivityKeys),
          },
    );
    setStep(0);
    setActivityQuery("");
    setDialogOpen(true);
  }

  async function saveReview() {
    if (!activeMemberId) return;
    const computedSelfScores = selfSectionScores(draft.assessmentDetails, {
      performance: numeric(draft.selfPerformanceScore),
      attendance: numeric(draft.selfAttendanceScore),
      development: numeric(draft.selfDevelopmentScore),
    });
    setSaving(true);
    try {
      const response = await fetch("/api/kpi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          memberId: activeMemberId,
          planYear: year,
          ...draft,
          selfPerformanceScore: computedSelfScores.performance,
          selfAttendanceScore: computedSelfScores.attendance,
          selfDevelopmentScore: computedSelfScores.development,
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
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#183529]">{selectedMember?.name}</h3><span className="rounded-full bg-[#e3eee1] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#315845]">{session.isAdmin ? "Administrator" : isOwnReview ? "Your KPI" : canReview ? "Supervisor" : "MNLF CEO"}</span></div><p className="text-xs text-[#718178]">{selectedMember?.role} · {year} KPI cycle</p><p className="mt-1 text-[11px] text-[#718178]">Supervisor: {reviewerName ?? "Not assigned"} · MNLF CEO: {approverName ?? "Not assigned"}</p></div>
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
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>{draft.period} Staff KPI · {selectedMember?.name}</DialogTitle><DialogDescription>Complete the four short sections. Select a section heading to move directly to it.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#edf3ec] p-1 sm:grid-cols-4">
            {["Activities", "Work behavior", "Development", "Review & submit"].map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-lg px-2 py-2 text-xs font-black transition ${step === index ? "bg-[#0c3b2d] text-white shadow-sm" : "text-[#53685c] hover:bg-white"}`}>{index + 1}. {label}</button>)}
          </div>

          {step === 0 && (
            <div className="space-y-4 py-2">
              <label className="block text-sm font-bold">Review period<NativeSelect value={draft.period} onChange={(event) => setDraft((current) => ({ ...current, period: event.target.value as KpiPeriod }))} disabled={Boolean(editingId) || !canEditSelf} className="mt-1"><NativeSelectOption value="Q1">Q1</NativeSelectOption><NativeSelectOption value="Q2">Q2</NativeSelectOption><NativeSelectOption value="Q3">Q3</NativeSelectOption><NativeSelectOption value="Q4">Q4</NativeSelectOption><NativeSelectOption value="Annual">Annual</NativeSelectOption></NativeSelect></label>
              <div>
                <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold">Responsible activities</p><p className="text-xs text-[#718178]">Assigned activities are linked automatically. Give each activity a self-assessment score from 0 to 100.</p></div><span className="text-xs font-black text-[#2f634c]">{draft.linkedActivityKeys.length} activities</span></div>
                {canEditSelf && <details className="mt-2 rounded-xl border border-[#d7ded5] bg-[#f8faf7]"><summary className="cursor-pointer px-3 py-2 text-xs font-black text-[#315845]">Add or remove activity links</summary><div className="border-t border-[#e1e7df] p-2"><div className="mb-2 flex items-center gap-2"><label className="relative block flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" /><Input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Search code or activity" className="h-9 pl-9" /></label><Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, linkedActivityKeys: assignedActivityKeys, assessmentDetails: { ...current.assessmentDetails, activityScores: assignedActivityKeys.map((activityKey) => current.assessmentDetails.activityScores.find((item) => item.activityKey === activityKey) ?? { activityKey, selfScore: null }) } }))} className="h-9 px-2 text-xs">Use assigned</Button></div><div className="max-h-48 space-y-1 overflow-y-auto">{selectableActivities.map((activity) => { const checked = draft.linkedActivityKeys.includes(activity.id); return <label key={activity.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 hover:bg-white"><Checkbox checked={checked} onCheckedChange={(value) => setDraft((current) => { const linkedActivityKeys = value ? Array.from(new Set([...current.linkedActivityKeys, activity.id])) : current.linkedActivityKeys.filter((key) => key !== activity.id); return { ...current, linkedActivityKeys, assessmentDetails: { ...current.assessmentDetails, activityScores: linkedActivityKeys.map((activityKey) => current.assessmentDetails.activityScores.find((item) => item.activityKey === activityKey) ?? { activityKey, selfScore: null }) } }; })} /><span className="min-w-0 flex-1 text-xs leading-4"><strong className="text-[#315845]">{activity.code}</strong> · {activity.title}</span>{assignedActivityKeySet.has(activity.id) && <span className="shrink-0 rounded-full bg-[#e6f0e4] px-2 py-0.5 text-[10px] font-bold text-[#315845]">Assigned</span>}</label>; })}</div></div></details>}
              </div>
              <div className="space-y-2">
                {linkedActivities.map((activity) => { const scoreRow = draft.assessmentDetails.activityScores.find((item) => item.activityKey === activity.id); const notes = activityQuarterNotes[activity.id]; const entries = draft.period === "Annual" ? (["Q1", "Q2", "Q3", "Q4"] as Quarter[]).map((quarter) => [quarter, notes?.[quarter] ?? ""] as const).filter(([, note]) => note.trim()) : [[draft.period, notes?.[draft.period as Quarter] ?? ""] as const]; return <article key={activity.id} className="rounded-xl border border-[#d7ded5] bg-white p-3"><div className="grid gap-3 sm:grid-cols-[1fr_115px] sm:items-start"><div className="min-w-0"><p className="font-mono text-xs font-black text-[#315845]">{activity.code}</p><p className="mt-1 text-sm font-bold leading-5 text-[#183529]">{activity.title}</p></div><label className="text-xs font-bold text-[#53685c]">Self score<Input type="number" min="0" max="100" step="0.1" disabled={!canEditSelf} value={scoreRow?.selfScore ?? ""} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, activityScores: current.assessmentDetails.activityScores.map((item) => item.activityKey === activity.id ? { ...item, selfScore: nullableScore(event.target.value) } : item) } }))} placeholder="0–100" className="mt-1 h-9 text-right font-black" /></label></div><details className="mt-2 rounded-lg bg-[#f3f7f1] px-3 py-2"><summary className="cursor-pointer text-xs font-bold text-[#53685c]">Work Plan progress note</summary><div className="mt-2 space-y-1">{entries.length ? entries.map(([quarter, note]) => <p key={quarter} className="text-xs leading-5 text-[#53685c]"><strong>{quarter}</strong> · {note || "No note submitted."}</p>) : <p className="text-xs text-[#718178]">No Work Plan quarterly note yet.</p>}</div></details></article>; })}
                {!linkedActivities.length && <div className="rounded-xl border border-dashed border-[#cbd6cc] px-4 py-8 text-center text-xs text-[#718178]">No responsible activities are linked.</div>}
              </div>
              <section className="rounded-xl border border-[#cbd8c9] bg-[#eef4eb] p-3">
                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Additional work</p><p className="text-xs text-[#718178]">Add completed work that was not included in the Work Plan.</p></div>{canEditSelf && <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, additionalWorks: [...current.assessmentDetails.additionalWorks, { id: `additional-${crypto.randomUUID()}`, title: "", outcome: "", completionDate: "", selfScore: null }] } }))} className="h-8 px-2.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add work</Button>}</div>
                <div className="mt-3 space-y-2">{draft.assessmentDetails.additionalWorks.map((item, index) => <article key={item.id} className="rounded-lg border border-white bg-white p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-black text-[#315845]">Additional work {index + 1}</p>{canEditSelf && <Button type="button" variant="ghost" size="icon" onClick={() => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, additionalWorks: current.assessmentDetails.additionalWorks.filter((row) => row.id !== item.id) } }))} className="h-7 w-7 text-rose-700"><Trash2 className="h-3.5 w-3.5" /></Button>}</div><div className="grid gap-2 sm:grid-cols-[1.3fr_145px_105px]"><label className="text-xs font-bold">Work title<Input disabled={!canEditSelf} value={item.title} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, additionalWorks: current.assessmentDetails.additionalWorks.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row) } }))} className="mt-1 h-9" /></label><label className="text-xs font-bold">Completion date<Input type="date" disabled={!canEditSelf} value={item.completionDate} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, additionalWorks: current.assessmentDetails.additionalWorks.map((row) => row.id === item.id ? { ...row, completionDate: event.target.value } : row) } }))} className="mt-1 h-9" /></label><label className="text-xs font-bold">Self score<Input type="number" min="0" max="100" step="0.1" disabled={!canEditSelf} value={item.selfScore ?? ""} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, additionalWorks: current.assessmentDetails.additionalWorks.map((row) => row.id === item.id ? { ...row, selfScore: nullableScore(event.target.value) } : row) } }))} placeholder="0–100" className="mt-1 h-9 text-right font-black" /></label></div><label className="mt-2 block text-xs font-bold">Result or evidence<Textarea disabled={!canEditSelf} value={item.outcome} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, additionalWorks: current.assessmentDetails.additionalWorks.map((row) => row.id === item.id ? { ...row, outcome: event.target.value } : row) } }))} className="mt-1 min-h-16" /></label></article>)}{!draft.assessmentDetails.additionalWorks.length && <p className="rounded-lg bg-white px-3 py-4 text-center text-xs text-[#718178]">No additional work added.</p>}</div>
              </section>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-[#d9e3d5] bg-[#f5f8f3] p-4"><p className="text-sm font-black">Work attendance and participation</p><p className="mt-1 text-xs text-[#718178]">These six questions come from the KPI assessment sheet. Add a short example when useful and score each item from 0 to 100.</p></div>
              <div className="grid gap-2 md:grid-cols-2">{competencyQuestions.map((question, index) => { const item = draft.assessmentDetails.competencies.find((row) => row.key === question.key) ?? { key: question.key, note: "", selfScore: null }; return <article key={question.key} className="rounded-xl border border-[#d7ded5] bg-white p-3"><div className="grid gap-2 sm:grid-cols-[1fr_105px]"><div><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#718178]">Question {index + 1}</p><p className="mt-1 text-sm font-bold leading-5">{question.label}</p></div><label className="text-xs font-bold text-[#53685c]">Self score<Input type="number" min="0" max="100" step="0.1" disabled={!canEditSelf} value={item.selfScore ?? ""} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, competencies: current.assessmentDetails.competencies.map((row) => row.key === question.key ? { ...row, selfScore: nullableScore(event.target.value) } : row) } }))} placeholder="0–100" className="mt-1 h-9 text-right font-black" /></label></div><Textarea disabled={!canEditSelf} value={item.note} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, competencies: current.assessmentDetails.competencies.map((row) => row.key === question.key ? { ...row, note: event.target.value } : row) } }))} placeholder="Optional example or evidence" className="mt-2 min-h-16 text-xs" /></article>; })}</div>
              <div className="rounded-xl bg-[#0c3b2d] p-4 text-white"><p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-100/75">Attendance and participation average</p><p className="mt-1 text-3xl font-black">{draftSelfScores.attendance}%</p></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-2">
              <article className="rounded-xl border border-[#d7ded5] bg-white p-4"><div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e6f0e4] text-[#315845]"><BookOpenCheck className="h-4 w-4" /></div><div><p className="font-black">Professional and personal development</p><p className="mt-1 text-xs leading-5 text-[#718178]">Include paid or free training, self-directed courses, professional meetings, reading or other development activities.</p></div></div><Textarea disabled={!canEditSelf} value={draft.assessmentDetails.development.note} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, development: { ...current.assessmentDetails.development, note: event.target.value } } }))} placeholder="Describe training, learning and how it supported your work." className="mt-3 min-h-24" /><label className="mt-3 block text-xs font-bold text-[#53685c]">Self score (0–100)<Input type="number" min="0" max="100" step="0.1" disabled={!canEditSelf} value={draft.assessmentDetails.development.selfScore ?? ""} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, development: { ...current.assessmentDetails.development, selfScore: nullableScore(event.target.value) } } }))} className="mt-1 h-9 max-w-40 text-right font-black" /></label></article>
              <article className="rounded-xl border border-[#cbd8c9] bg-[#eef4eb] p-4"><p className="font-black">Positive contribution to team culture</p><p className="mt-1 text-xs leading-5 text-[#718178]">Optional bonus area from the KPI sheet. Describe a contribution that improved internal operations, productivity, culture, values or team goals.</p><Textarea disabled={!canEditSelf} value={draft.assessmentDetails.culture.note} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, culture: { ...current.assessmentDetails.culture, note: event.target.value } } }))} placeholder="Describe the contribution and result." className="mt-3 min-h-20 bg-white" /><label className="mt-3 block text-xs font-bold text-[#53685c]">Proposed bonus (0–5)<Input type="number" min="0" max="5" step="0.1" disabled={!canEditSelf} value={draft.assessmentDetails.culture.selfScore ?? ""} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, culture: { ...current.assessmentDetails.culture, selfScore: nullableScore(event.target.value, 5) } } }))} className="mt-1 h-9 max-w-40 text-right font-black" /></label></article>
              <div className="grid gap-2 sm:grid-cols-3">{[["Work performance", "75%", draftSelfScores.performance], ["Attendance & participation", "15%", draftSelfScores.attendance], ["Personal development", "10%", draftSelfScores.development]].map(([label, weight, value]) => <div key={String(label)} className="rounded-xl border border-[#d7ded5] bg-white p-3"><p className="text-xs font-semibold text-[#718178]">{label} · {weight}</p><p className="mt-1 text-2xl font-black text-[#183529]">{value}%</p></div>)}</div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-2">
              <label className="block text-sm font-bold">{draft.period === "Annual" ? "Overall annual KPI note" : "Overall quarterly KPI note"}<Textarea value={draft.achievementNote} disabled={!canEditSelf} onChange={(event) => setDraft((current) => ({ ...current, achievementNote: event.target.value }))} placeholder="Add the overall result, key challenge and next priority. Activity notes are reused from the Work Plan." className="mt-1 min-h-24" /></label>
              <label className="block text-sm font-bold">Other issues, suggestions or requests<Textarea value={draft.assessmentDetails.staffComment} disabled={!canEditSelf} onChange={(event) => setDraft((current) => ({ ...current, assessmentDetails: { ...current.assessmentDetails, staffComment: event.target.value } }))} placeholder="Add any issue or suggestion you would like to discuss with your Supervisor or MNLF CEO." className="mt-1 min-h-20" /></label>
              {(canReview || canApprove) ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm font-black text-blue-950">Supervisor assessment</p><p className="mt-1 text-xs text-blue-800">Section scores are optional. Blank fields continue to use the officer&apos;s self-assessment.</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{[["Work performance", "reviewPerformanceScore"], ["Attendance & participation", "reviewAttendanceScore"], ["Personal development", "reviewDevelopmentScore"]].map(([label, key]) => <label key={key} className="text-xs font-bold text-blue-950">{label}<Input type="number" min="0" max="100" step="0.1" disabled={!canReview} placeholder="Use self score" value={draft[key as keyof KpiDraft] as string} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 h-9 bg-white text-right font-black" /></label>)}</div><label className="mt-3 block text-xs font-bold text-blue-950">Team-culture bonus (0–5)<Input type="number" min="0" max="5" step="0.1" disabled={!canReview} value={draft.cultureBonus} onChange={(event) => setDraft((current) => ({ ...current, cultureBonus: event.target.value }))} className="mt-1 h-9 max-w-40 bg-white" /></label><label className="mt-3 block text-xs font-bold text-blue-950">Supervisor comment<Textarea value={draft.reviewComment} disabled={!canReview} onChange={(event) => setDraft((current) => ({ ...current, reviewComment: event.target.value }))} className="mt-1 min-h-20 bg-white" placeholder="Record feedback and follow-up." /></label></div> : <div className="rounded-xl border border-[#d9e3d5] bg-[#f5f8f3] p-4 text-sm text-[#315845]">Review the activities, questionnaire and overall KPI note before submitting to your Supervisor.</div>}
              {(canApprove || session.isAdmin) && <label className="block rounded-xl border border-[#d8cba5] bg-[#fff9e8] p-4 text-sm font-bold text-[#6e5411]">MNLF CEO comment<Textarea value={draft.approvalComment} disabled={!canApprove && !session.isAdmin} onChange={(event) => setDraft((current) => ({ ...current, approvalComment: event.target.value }))} className="mt-2 min-h-20 bg-white text-[#183529]" placeholder="Record the final approval comment." /></label>}
              <div className="grid gap-3 rounded-xl border border-[#cfdacf] bg-white p-4 sm:grid-cols-[1fr_180px] sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#718178]">Final weighted score</p><p className={`mt-1 text-4xl font-black ${scoreTone(draftTotal)}`}>{draftTotal}%</p><p className="mt-1 text-xs text-[#718178]">Performance 75% · attendance 15% · development 10% · bonus up to 5</p></div><label className="text-sm font-bold">Workflow status<NativeSelect value={draft.workflowStatus} onChange={(event) => setDraft((current) => ({ ...current, workflowStatus: event.target.value as KpiStatus }))} className="mt-1">{availableStatuses.map((status) => <NativeSelectOption key={status} value={status} disabled={status === draft.workflowStatus && !((session.isAdmin) || (isOwnReview && ["draft", "submitted"].includes(status)) || (canReview && ["submitted", "reviewed"].includes(status)) || (canApprove && ["reviewed", "approved"].includes(status)))}>{statusMeta[status].label}</NativeSelectOption>)}</NativeSelect></label></div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <div className="flex gap-2"><Button variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>{step < 3 ? <Button onClick={() => setStep((current) => Math.min(3, current + 1))} className="bg-[#0c3b2d] text-white">Continue</Button> : <Button onClick={() => void saveReview()} disabled={saving} className="bg-[#0c3b2d] text-white">{saving ? "Saving…" : "Save KPI review"}</Button>}</div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>KPI change history</DialogTitle><DialogDescription>Every saved version is retained with the editor and time.</DialogDescription></DialogHeader>{historyLoading ? <p className="py-8 text-center text-sm text-[#718178]">Loading history…</p> : <div className="space-y-2">{history.map((item, index) => <article key={item.id} className="rounded-xl border border-[#d7ded5] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black">Version {history.length - index}</p><span className="text-xs text-[#718178]">{formatDate(item.changedAt)}</span></div><p className="mt-1 text-xs text-[#718178]">Changed by {item.changedBy}</p>{item.snapshot && <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#edf3ec] px-2 py-1">{item.snapshot.workflowStatus}</span><span className="rounded-full bg-[#edf3ec] px-2 py-1">Score {finalScore(item.snapshot)}%</span><span className="rounded-full bg-[#edf3ec] px-2 py-1">{parseKeys(item.snapshot.linkedActivityKeys).length} activities</span></div>}</article>)}{!history.length && <p className="py-8 text-center text-sm text-[#718178]">No saved history yet.</p>}</div>}</DialogContent>
      </Dialog>
    </div>
  );
}
