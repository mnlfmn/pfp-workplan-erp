"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  RotateCcw,
  Users,
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

export type QuarterlyReportingQuarter = "Q1" | "Q2" | "Q3" | "Q4";

export type QuarterlyReportingUpdate = {
  activityKey: string;
  status: string;
  progress: number;
  note: string;
  supportNeeded: string;
  owner: string;
  updatedAt: string;
  updatedBy: string;
};

export type QuarterlyReportingSubactivity = {
  key: string;
  title: string;
  status: string;
  progress: number;
  updatedAt: string;
};

export type QuarterlyReportingActivity = {
  key: string;
  code: string;
  title: string;
  accountableOwner: string;
  supportingOwners: string[];
  status: string;
  progress: number;
  updatedAt: string;
  note: string;
  subactivities: QuarterlyReportingSubactivity[];
};

type Session = {
  email: string;
  isAdmin: boolean;
  memberId: string;
  memberName: string;
} | null;

type Submission = {
  id: string;
  planYear: number;
  quarter: QuarterlyReportingQuarter;
  memberId: string;
  memberName: string;
  status: "submitted" | "returned";
  activityCount: number;
  snapshot: string;
  reviewComment: string;
  submittedAt: string;
  submittedBy: string;
  returnedAt: string;
  returnedBy: string;
  updatedAt: string;
};

type Props = {
  year: number;
  activities: QuarterlyReportingActivity[];
  teamMembers: TeamMember[];
  session: Session;
  statusOptions: Array<{ value: string; label: string }>;
  onUpdateSaved: (update: QuarterlyReportingUpdate) => void;
};

type DraftUpdate = { status: string; progress: number };

const quarters: QuarterlyReportingQuarter[] = ["Q1", "Q2", "Q3", "Q4"];

function currentQuarter(): QuarterlyReportingQuarter {
  const month = Number(
    new Intl.DateTimeFormat("en", { month: "numeric", timeZone: "Asia/Ulaanbaatar" }).format(new Date()),
  );
  return `Q${Math.ceil(month / 3)}` as QuarterlyReportingQuarter;
}

function notesForYear(raw: string, year: number) {
  const empty = { version: 1 as const, year, quarters: { Q1: "", Q2: "", Q3: "", Q4: "" }, legacy: "" };
  if (!raw.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as { version?: number; year?: number; quarters?: Partial<Record<QuarterlyReportingQuarter, string>>; legacy?: string };
    if (parsed.version === 1 && parsed.quarters) {
      return {
        version: 1 as const,
        year,
        quarters: {
          Q1: String(parsed.quarters.Q1 ?? ""),
          Q2: String(parsed.quarters.Q2 ?? ""),
          Q3: String(parsed.quarters.Q3 ?? ""),
          Q4: String(parsed.quarters.Q4 ?? ""),
        },
        legacy: String(parsed.legacy ?? ""),
      };
    }
  } catch {
    return { ...empty, legacy: raw };
  }
  return empty;
}

function noteWithQuarter(raw: string, year: number, quarter: QuarterlyReportingQuarter, value: string) {
  const notes = notesForYear(raw, year);
  notes.quarters[quarter] = value;
  return JSON.stringify(notes);
}

function isUpdatedInQuarter(value: string, year: number, quarter: QuarterlyReportingQuarter) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== year) return false;
  return Math.ceil((date.getUTCMonth() + 1) / 3) === Number(quarter.slice(1));
}

function activityReady(activity: QuarterlyReportingActivity, year: number, quarter: QuarterlyReportingQuarter) {
  const progressReady = activity.subactivities.length
    ? activity.subactivities.every((item) => isUpdatedInQuarter(item.updatedAt, year, quarter))
    : isUpdatedInQuarter(activity.updatedAt, year, quarter);
  const noteReady = Boolean(notesForYear(activity.note, year).quarters[quarter].trim());
  return { progressReady, noteReady, ready: progressReady && noteReady };
}

function derivedMainStatus(items: DraftUpdate[], fallback: string) {
  if (!items.length) return fallback;
  const statuses = items.map((item) => item.status);
  if (statuses.every((item) => item === statuses[0])) return statuses[0];
  if (statuses.includes("delayed")) return "delayed";
  if (statuses.includes("delayed_externally")) return "delayed_externally";
  if (statuses.includes("on_hold")) return "on_hold";
  if (statuses.some((item) => item === "in_progress" || item === "completed")) return "in_progress";
  if (statuses.includes("not_started")) return "not_started";
  return fallback;
}

function formatDateTime(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(value));
}

function latestByMember(submissions: Submission[]) {
  const map = new Map<string, Submission>();
  for (const submission of submissions) {
    if (!map.has(submission.memberId)) map.set(submission.memberId, submission);
  }
  return map;
}

export function QuarterlyReportingModule({
  year,
  activities,
  teamMembers,
  session,
  statusOptions,
  onUpdateSaved,
}: Props) {
  const [quarter, setQuarter] = useState<QuarterlyReportingQuarter>(currentQuarter());
  const [view, setView] = useState<"mine" | "team">("mine");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingKey, setEditingKey] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DraftUpdate>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [returning, setReturning] = useState<Submission | null>(null);
  const [returnComment, setReturnComment] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/quarterly-reports?year=${year}&quarter=${quarter}`)
      .then(async (response) => {
        const payload = (await response.json()) as { submissions?: Submission[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Quarterly submissions could not be loaded.");
        if (active) setSubmissions(payload.submissions ?? []);
      })
      .catch((error) => {
        if (active) {
          setSubmissions([]);
          toast.error(error instanceof Error ? error.message : "Quarterly submissions could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [quarter, year]);

  const supervisedMembers = useMemo(
    () => teamMembers.filter((member) => session?.isAdmin || member.kpiReviewerId === session?.memberId),
    [session, teamMembers],
  );
  const canViewTeam = Boolean(session?.isAdmin || supervisedMembers.length);
  const myActivities = useMemo(
    () => activities.filter((activity) => activity.accountableOwner === session?.memberName),
    [activities, session?.memberName],
  );
  const readiness = useMemo(
    () => myActivities.map((activity) => ({ activity, ...activityReady(activity, year, quarter) })),
    [myActivities, quarter, year],
  );
  const readyCount = readiness.filter((item) => item.ready).length;
  const completionPercent = readiness.length ? Math.round((readyCount / readiness.length) * 100) : 0;
  const latestSubmissions = useMemo(() => latestByMember(submissions), [submissions]);
  const ownSubmission = session ? latestSubmissions.get(session.memberId) : undefined;
  const ownIsSubmitted = ownSubmission?.status === "submitted";

  const editingActivity = activities.find((activity) => activity.key === editingKey) ?? null;

  function openActivity(activity: QuarterlyReportingActivity) {
    const records = activity.subactivities.length
      ? activity.subactivities
      : [{ key: activity.key, status: activity.status, progress: activity.progress }];
    setDrafts(
      Object.fromEntries(records.map((item) => [item.key, { status: item.status, progress: item.progress }])),
    );
    setNoteDraft(notesForYear(activity.note, year).quarters[quarter]);
    setEditingKey(activity.key);
  }

  async function putUpdate(payload: {
    activityKey: string;
    status: string;
    progress: number;
    note?: string;
  }) {
    const response = await fetch("/api/updates", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { update?: QuarterlyReportingUpdate; error?: string };
    if (!response.ok || !result.update) throw new Error(result.error || "The reporting update could not be saved.");
    onUpdateSaved(result.update);
    return result.update;
  }

  async function saveActivityUpdate() {
    if (!editingActivity || !noteDraft.trim()) {
      toast.error("Add the quarterly progress note before saving.");
      return;
    }
    setSaving(true);
    try {
      const childDrafts = editingActivity.subactivities.length
        ? editingActivity.subactivities.map((item) => ({ key: item.key, ...drafts[item.key] }))
        : [{ key: editingActivity.key, ...drafts[editingActivity.key] }];
      for (const item of childDrafts) {
        if (!item.status || !Number.isInteger(item.progress)) throw new Error("Complete every status and progress value.");
        if (editingActivity.subactivities.length) {
          await putUpdate({ activityKey: item.key, status: item.status, progress: item.progress });
        }
      }
      const values = childDrafts.map(({ status, progress }) => ({ status, progress }));
      const mainProgress = editingActivity.subactivities.length
        ? Math.round(values.reduce((total, item) => total + item.progress, 0) / values.length)
        : values[0]?.progress ?? editingActivity.progress;
      const mainStatus = editingActivity.subactivities.length
        ? derivedMainStatus(values, editingActivity.status)
        : values[0]?.status ?? editingActivity.status;
      await putUpdate({
        activityKey: editingActivity.key,
        status: mainStatus,
        progress: mainProgress,
        note: noteWithQuarter(editingActivity.note, year, quarter, noteDraft.trim()),
      });
      toast.success(`${editingActivity.code} reporting update saved`);
      setEditingKey("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reporting update could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function submitQuarterlyReport() {
    if (!session || !readiness.length || readyCount !== readiness.length) return;
    setSubmitting(true);
    try {
      const items = readiness.map(({ activity }) => ({
        activityKey: activity.key,
        code: activity.code,
        title: activity.title,
        note: notesForYear(activity.note, year).quarters[quarter].trim(),
        status: activity.status,
        progress: activity.progress,
      }));
      const response = await fetch("/api/quarterly-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planYear: year,
          quarter,
          memberId: session.memberId,
          memberName: session.memberName,
          items,
        }),
      });
      const payload = (await response.json()) as { submission?: Submission; error?: string };
      if (!response.ok || !payload.submission) throw new Error(payload.error || "Quarterly report could not be submitted.");
      setSubmissions((current) => [payload.submission!, ...current]);
      setConfirmSubmit(false);
      toast.success(`${quarter} quarterly updates submitted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quarterly report could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  async function returnSubmission() {
    if (!returning || !returnComment.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/quarterly-reports", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: returning.id, action: "return", reviewComment: returnComment.trim() }),
      });
      const payload = (await response.json()) as { submission?: Submission; error?: string };
      if (!response.ok || !payload.submission) throw new Error(payload.error || "The submission could not be returned.");
      setSubmissions((current) => current.map((item) => (item.id === payload.submission!.id ? payload.submission! : item)));
      setReturning(null);
      setReturnComment("");
      toast.success("Quarterly report returned to the officer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The submission could not be returned.");
    } finally {
      setSaving(false);
    }
  }

  if (!session) {
    return <div className="rounded-2xl border border-dashed border-[#cbd6cc] bg-white px-6 py-12 text-center text-sm text-[#718178]">Sign in to use Quarterly Reporting.</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5f7568]">Guided reporting</p>
            <h2 className="mt-1 text-xl font-black">{year} quarterly reporting</h2>
            <p className="mt-1 text-sm text-[#718178]">Update assigned work, complete the checklist, then submit the quarter once.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect value={quarter} onChange={(event) => { setLoading(true); setQuarter(event.target.value as QuarterlyReportingQuarter); }} className="h-10 w-28 border-[#cbd6cc] bg-white">
              {quarters.map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}
            </NativeSelect>
            <div className="inline-flex rounded-xl border border-[#cfdacf] bg-[#f8faf7] p-1">
              <button type="button" onClick={() => setView("mine")} className={`rounded-lg px-3 py-2 text-sm font-bold ${view === "mine" ? "bg-[#0c3b2d] text-white" : "text-[#53685c]"}`}>My reporting</button>
              {canViewTeam && <button type="button" onClick={() => setView("team")} className={`rounded-lg px-3 py-2 text-sm font-bold ${view === "team" ? "bg-[#0c3b2d] text-white" : "text-[#53685c]"}`}>Team oversight</button>}
            </div>
          </div>
        </div>
      </section>

      {view === "mine" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#0c3b2d] p-4 text-white"><p className="text-xs font-bold text-white/70">Required activities</p><p className="mt-2 text-3xl font-black">{readiness.length}</p></div>
            <div className="rounded-2xl border border-[#d7ded5] bg-white p-4"><p className="text-xs font-bold text-[#718178]">Ready to submit</p><p className="mt-2 text-3xl font-black text-[#245f47]">{readyCount}</p></div>
            <div className={`rounded-2xl border p-4 ${ownSubmission?.status === "submitted" ? "border-emerald-200 bg-emerald-50" : ownSubmission?.status === "returned" ? "border-amber-200 bg-amber-50" : "border-[#d7ded5] bg-white"}`}><p className="text-xs font-bold text-[#718178]">Submission status</p><p className="mt-2 text-lg font-black capitalize">{loading ? "Loading…" : ownSubmission?.status ?? (readyCount === readiness.length && readiness.length ? "Ready" : "Missing")}</p></div>
          </section>

          {ownSubmission?.status === "returned" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black">Returned by supervisor</p><p className="mt-1 whitespace-pre-wrap">{ownSubmission.reviewComment}</p></div>
          )}

          <section className="rounded-2xl border border-[#d7ded5] bg-white shadow-sm">
            <div className="border-b border-[#e1e7df] p-4 sm:flex sm:items-center sm:justify-between">
              <div><h3 className="font-black">{quarter} completion checklist</h3><p className="mt-1 text-xs text-[#718178]">Sub-activities need current-quarter status and progress; main activities need one quarterly note.</p></div>
              <div className="mt-3 min-w-48 sm:mt-0"><div className="mb-1 flex justify-between text-xs font-bold"><span>{readyCount} of {readiness.length} ready</span><span>{completionPercent}%</span></div><Progress value={completionPercent} className="h-2 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]" /></div>
            </div>
            <div className="divide-y divide-[#e5eae4]">
              {readiness.map(({ activity, progressReady, noteReady, ready }) => (
                <article key={activity.key} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-[#2f634c]">{activity.code}</span><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${ready ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{ready ? "Ready" : "Action required"}</span></div><p className="mt-1 truncate font-black text-[#183529]">{activity.title}</p><div className="mt-2 flex flex-wrap gap-2 text-xs"><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${progressReady ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{progressReady ? <Check className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />} Status & progress</span><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${noteReady ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{noteReady ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} Quarterly note</span><span className="rounded-lg bg-[#f3f7f1] px-2 py-1 text-[#53685c]">{activity.progress}% progress</span></div></div>
                  <Button variant={ready ? "outline" : "default"} size="sm" onClick={() => openActivity(activity)} disabled={ownIsSubmitted} className={ready ? "" : "bg-[#0c3b2d] text-white hover:bg-[#174d3a]"}>{ready ? "Review update" : "Update now"}<ChevronRight className="h-4 w-4" /></Button>
                </article>
              ))}
              {!readiness.length && <div className="px-6 py-12 text-center text-sm text-[#718178]">No accountable activities are assigned to your team member record.</div>}
            </div>
            <div className="flex flex-col gap-3 border-t border-[#e1e7df] bg-[#f8faf7] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#718178]">Supporting owners can view workplan records, but the accountable owner submits the quarterly report.</p><Button onClick={() => setConfirmSubmit(true)} disabled={submitting || ownIsSubmitted || !readiness.length || readyCount !== readiness.length} className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"><ClipboardCheck className="h-4 w-4" />{ownIsSubmitted ? `${quarter} submitted` : "Submit quarterly updates"}</Button></div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-[#d7ded5] bg-white shadow-sm">
          <div className="border-b border-[#e1e7df] p-4"><h3 className="flex items-center gap-2 font-black"><Users className="h-5 w-5 text-[#2f634c]" />Team reporting overview</h3><p className="mt-1 text-xs text-[#718178]">See who has missing, ready, submitted, or returned quarterly reporting.</p></div>
          <div className="divide-y divide-[#e5eae4]">
            {supervisedMembers.map((member) => {
              const assigned = activities.filter((activity) => activity.accountableOwner === member.name);
              const ready = assigned.filter((activity) => activityReady(activity, year, quarter).ready).length;
              const submission = latestSubmissions.get(member.id);
              const state = submission?.status ?? (!assigned.length ? "not required" : ready === assigned.length ? "ready" : "missing");
              return <article key={member.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_repeat(3,100px)_auto] md:items-center"><div><p className="font-black text-[#183529]">{member.name}</p><p className="text-xs text-[#718178]">{member.role || "Team member"}</p></div><div><p className="text-[11px] font-bold text-[#718178]">Required</p><p className="font-black">{assigned.length}</p></div><div><p className="text-[11px] font-bold text-[#718178]">Ready</p><p className="font-black">{ready}</p></div><div><p className="text-[11px] font-bold text-[#718178]">Status</p><p className={`font-black capitalize ${state === "submitted" ? "text-emerald-700" : state === "returned" ? "text-amber-700" : state === "missing" ? "text-rose-700" : "text-blue-700"}`}>{state}</p></div><div className="flex items-center justify-end gap-2">{submission?.status === "submitted" && <Button variant="outline" size="sm" onClick={() => { setReturning(submission); setReturnComment(""); }}><RotateCcw className="h-4 w-4" />Return</Button>}{submission?.submittedAt && <span className="hidden text-[11px] text-[#718178] xl:inline">{formatDateTime(submission.submittedAt)}</span>}</div></article>;
            })}
            {!supervisedMembers.length && <div className="px-6 py-12 text-center text-sm text-[#718178]">No supervised team members are assigned.</div>}
          </div>
        </section>
      )}

      <Dialog open={Boolean(editingActivity)} onOpenChange={(open) => { if (!open && !saving) setEditingKey(""); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-3xl">
          {editingActivity && <><DialogHeader><DialogTitle>{editingActivity.code} quarterly update</DialogTitle><DialogDescription>Update status and progress, then add one main-activity note for {quarter}.</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-xl bg-[#f3f7f1] p-3"><p className="font-black">{editingActivity.title}</p><p className="mt-1 text-xs text-[#718178]">Accountable owner: {editingActivity.accountableOwner}</p></div><div className="space-y-2">{(editingActivity.subactivities.length ? editingActivity.subactivities : [{ key: editingActivity.key, title: editingActivity.title }]).map((item, index) => { const draft = drafts[item.key] ?? { status: editingActivity.status, progress: editingActivity.progress }; return <div key={item.key} className="grid gap-3 rounded-xl border border-[#dce4da] p-3 sm:grid-cols-[minmax(0,1fr)_180px_110px] sm:items-end"><div><p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#718178]">{editingActivity.subactivities.length ? `Sub-activity ${index + 1}` : "Main activity"}</p><p className="mt-1 text-sm font-bold">{item.title}</p></div><label className="block"><span className="mb-1 block text-xs font-bold">Status</span><NativeSelect value={draft.status} onChange={(event) => setDrafts((current) => ({ ...current, [item.key]: { ...draft, status: event.target.value } }))} className="h-10 w-full border-[#cbd6cc] bg-white">{statusOptions.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}</NativeSelect></label><label className="block"><span className="mb-1 block text-xs font-bold">Progress</span><div className="flex items-center gap-1"><Input type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDrafts((current) => ({ ...current, [item.key]: { ...draft, progress: Math.max(0, Math.min(100, Number(event.target.value) || 0)) } }))} className="h-10 border-[#cbd6cc] bg-white text-right font-black" /><span className="text-sm font-bold">%</span></div></label></div>; })}</div><label className="block"><span className="mb-1.5 block text-sm font-black">{quarter} main activity progress note *</span><Textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="What changed this quarter, what was achieved, any challenge, and what comes next?" className="min-h-32 border-[#cbd6cc] bg-white" /></label></div><DialogFooter><Button variant="outline" onClick={() => setEditingKey("")} disabled={saving}>Cancel</Button><Button onClick={() => void saveActivityUpdate()} disabled={saving || !noteDraft.trim()} className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]">{saving ? "Saving…" : "Save reporting update"}</Button></DialogFooter></>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent className="bg-white text-[#14241b]"><AlertDialogHeader><AlertDialogTitle>Submit {quarter} quarterly updates?</AlertDialogTitle><AlertDialogDescription>This will preserve a reporting snapshot for {readiness.length} accountable activities. A supervisor can return it if corrections are needed.</AlertDialogDescription></AlertDialogHeader><div className="rounded-xl bg-[#f3f7f1] p-3 text-sm"><p className="font-black">Submission summary</p><p className="mt-1 text-[#53685c]">{session.memberName} · {year} {quarter} · {readiness.length} activities</p></div><AlertDialogFooter><AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void submitQuarterlyReport()} disabled={submitting} className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]">{submitting ? "Submitting…" : "Confirm submission"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(returning)} onOpenChange={(open) => { if (!open && !saving) setReturning(null); }}>
        <DialogContent className="bg-white text-[#14241b] sm:max-w-lg"><DialogHeader><DialogTitle>Return quarterly report</DialogTitle><DialogDescription>Explain what the officer needs to correct before resubmitting.</DialogDescription></DialogHeader><Textarea value={returnComment} onChange={(event) => setReturnComment(event.target.value)} placeholder="Required correction or clarification…" className="min-h-28" /><DialogFooter><Button variant="outline" onClick={() => setReturning(null)} disabled={saving}>Cancel</Button><Button onClick={() => void returnSubmission()} disabled={saving || !returnComment.trim()} className="bg-amber-700 text-white hover:bg-amber-800">{saving ? "Returning…" : "Return to officer"}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
