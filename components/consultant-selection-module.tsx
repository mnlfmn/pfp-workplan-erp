"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  FileCheck2,
  FileSearch,
  PencilLine,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  UsersRound,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export type ConsultantActivityOption = {
  key: string;
  code: string;
  title: string;
  kind: "activity" | "subactivity";
};

type Session = {
  email: string;
  isAdmin: boolean;
  memberName: string;
} | null;

type Criterion = { id: string; label: string; maxScore: number };
type CommitteeMember = { id: string; name: string; role: string };
type Candidate = {
  id: string;
  name: string;
  financialProposalMnt: number | null;
  scores: Record<string, Record<string, number | null>>;
  note: string;
};
type SupportingDocuments = {
  tor: boolean;
  technicalProposal: boolean;
  financialProposal: boolean;
  cvTeam: boolean;
  previousContract: boolean;
  other: boolean;
};

type EvaluationPayload = {
  projectProgram: string;
  contractType: string;
  requestingUnit: string;
  assignmentName: string;
  briefOfWork: string;
  keyDeliverables: string;
  evaluationDate: string;
  technicalWeight: number;
  financialWeight: number;
  criteria: Criterion[];
  committee: CommitteeMember[];
  candidates: Candidate[];
  recommendedCandidateId: string;
  recommendation: string;
  supportingDocuments: SupportingDocuments;
  otherDocumentNote: string;
};

export type ConsultantEvaluation = {
  id: string;
  planYear: number;
  activityKey: string;
  title: string;
  status: "draft" | "evaluated" | "completed";
  payload: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

type Draft = {
  id: string;
  activityKey: string;
  status: ConsultantEvaluation["status"];
  payload: EvaluationPayload;
  createdBy: string;
};

type Props = {
  year: number;
  activities: ConsultantActivityOption[];
  session: Session;
  language: "en" | "mn";
};

const defaultCriteria: Criterion[] = [
  { id: "relevant-experience", label: "Relevant experience and similar assignments", maxScore: 50 },
  { id: "methodology", label: "Understanding, methodology and work plan", maxScore: 20 },
  { id: "qualification", label: "Qualification and competence", maxScore: 20 },
  { id: "availability", label: "Availability and delivery schedule", maxScore: 10 },
];

const documentOptions: Array<{ key: keyof SupportingDocuments; en: string; mn: string }> = [
  { key: "tor", en: "Terms of Reference", mn: "Ажлын даалгавар" },
  { key: "technicalProposal", en: "Technical proposal", mn: "Техникийн санал" },
  { key: "financialProposal", en: "Financial proposal", mn: "Санхүүгийн санал" },
  { key: "cvTeam", en: "CV / proposed team", mn: "CV / санал болгосон баг" },
  { key: "previousContract", en: "Previous contract or reference", mn: "Өмнөх гэрээ эсвэл лавлагаа" },
  { key: "other", en: "Other supporting document", mn: "Бусад дагалдах баримт" },
];

const steps = [
  { en: "Assignment", mn: "Ажлын мэдээлэл", icon: FileSearch },
  { en: "Criteria & committee", mn: "Шалгуур ба комисс", icon: UsersRound },
  { en: "Candidates & scores", mn: "Оролцогч ба оноо", icon: Calculator },
  { en: "Results", mn: "Үр дүн", icon: Award },
  { en: "Recommendation", mn: "Зөвлөмж", icon: ClipboardCheck },
];

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function emptyPayload(): EvaluationPayload {
  return {
    projectProgram: "Eternal Mongolia",
    contractType: "Individual consultant",
    requestingUnit: "PFP PCU",
    assignmentName: "",
    briefOfWork: "",
    keyDeliverables: "",
    evaluationDate: new Date().toISOString().slice(0, 10),
    technicalWeight: 70,
    financialWeight: 30,
    criteria: defaultCriteria.map((item) => ({ ...item })),
    committee: [
      { id: uid("member"), name: "", role: "Chair" },
      { id: uid("member"), name: "", role: "Member" },
      { id: uid("member"), name: "", role: "Member" },
    ],
    candidates: [{ id: uid("candidate"), name: "", financialProposalMnt: null, scores: {}, note: "" }],
    recommendedCandidateId: "",
    recommendation: "",
    supportingDocuments: {
      tor: false,
      technicalProposal: false,
      financialProposal: false,
      cvTeam: false,
      previousContract: false,
      other: false,
    },
    otherDocumentNote: "",
  };
}

function parsePayload(value: string): EvaluationPayload {
  try {
    const parsed = JSON.parse(value) as Partial<EvaluationPayload>;
    const fallback = emptyPayload();
    return {
      ...fallback,
      ...parsed,
      criteria: Array.isArray(parsed.criteria) && parsed.criteria.length ? parsed.criteria : fallback.criteria,
      committee: Array.isArray(parsed.committee) && parsed.committee.length ? parsed.committee : fallback.committee,
      candidates: Array.isArray(parsed.candidates) && parsed.candidates.length ? parsed.candidates : fallback.candidates,
      supportingDocuments: { ...fallback.supportingDocuments, ...(parsed.supportingDocuments ?? {}) },
    };
  } catch {
    return emptyPayload();
  }
}

function emptyDraft(): Draft {
  return { id: "", activityKey: "", status: "draft", payload: emptyPayload(), createdBy: "" };
}

function formatMnt(value: number | null) {
  if (!value) return "—";
  return `₮${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
}

function scoreValue(candidate: Candidate, memberId: string, criterionId: string) {
  return candidate.scores[memberId]?.[criterionId] ?? null;
}

function candidateTechnical(candidate: Candidate, committee: CommitteeMember[], criteria: Criterion[]) {
  if (!committee.length || !criteria.length) return null;
  const evaluatorTotals = committee.map((member) => {
    const scores = criteria.map((criterion) => scoreValue(candidate, member.id, criterion.id));
    if (scores.some((score) => score === null || score === undefined)) return null;
    return scores.reduce<number>((sum, score) => sum + Number(score), 0);
  });
  if (evaluatorTotals.some((total) => total === null)) return null;
  return evaluatorTotals.reduce<number>((sum, total) => sum + Number(total), 0) / evaluatorTotals.length;
}

function calculateEvaluationResults(payload: EvaluationPayload) {
  const validOffers = payload.candidates
    .map((candidate) => Number(candidate.financialProposalMnt))
    .filter((value) => Number.isFinite(value) && value > 0);
  const lowestOffer = validOffers.length ? Math.min(...validOffers) : null;
  const rows = payload.candidates
    .map((candidate) => {
      const technical = candidateTechnical(candidate, payload.committee, payload.criteria);
      const financial = lowestOffer && candidate.financialProposalMnt && candidate.financialProposalMnt > 0
        ? (lowestOffer / candidate.financialProposalMnt) * 100
        : null;
      const total = technical === null || financial === null
        ? null
        : technical * (payload.technicalWeight / 100) + financial * (payload.financialWeight / 100);
      return { candidate, technical, financial, total };
    })
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
  return { lowestOffer, rows };
}

function statusTone(status: ConsultantEvaluation["status"]) {
  if (status === "completed") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "evaluated") return "bg-blue-50 text-blue-800 border-blue-200";
  return "bg-amber-50 text-amber-900 border-amber-200";
}

export function ConsultantSelectionModule({ year, activities, session, language }: Props) {
  const t = useCallback((en: string, mn: string) => (language === "mn" ? mn : en), [language]);
  const [evaluations, setEvaluations] = useState<ConsultantEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConsultantEvaluation | null>(null);
  const [activeCandidateId, setActiveCandidateId] = useState("");
  const [expandedEvaluationIds, setExpandedEvaluationIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/consultant-selections?year=${year}`);
      const result = (await response.json()) as { evaluations?: ConsultantEvaluation[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load evaluations");
      setEvaluations(result.evaluations ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load evaluations");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return evaluations.filter((item) => {
      const payload = parsePayload(item.payload);
      const activity = activities.find((option) => option.key === item.activityKey);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesQuery = !needle || [item.title, payload.requestingUnit, item.createdBy, activity?.code, activity?.title]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [activities, evaluations, query, statusFilter]);

  const openNew = () => {
    const next = emptyDraft();
    setDraft(next);
    setActiveCandidateId(next.payload.candidates[0]?.id ?? "");
    setStep(0);
    setDialogOpen(true);
  };

  const openExisting = (item: ConsultantEvaluation) => {
    const payload = parsePayload(item.payload);
    setDraft({ id: item.id, activityKey: item.activityKey, status: item.status, payload, createdBy: item.createdBy });
    setActiveCandidateId(payload.candidates[0]?.id ?? "");
    setStep(0);
    setDialogOpen(true);
  };

  const canEdit = !draft.id || Boolean(session?.isAdmin || session?.email === draft.createdBy);
  const selectedActivity = activities.find((option) => option.key === draft.activityKey);
  const criteriaTotal = draft.payload.criteria.reduce((sum, item) => sum + Number(item.maxScore || 0), 0);
  const { lowestOffer, rows: results } = useMemo(
    () => calculateEvaluationResults(draft.payload),
    [draft.payload],
  );

  const setPayload = <K extends keyof EvaluationPayload>(key: K, value: EvaluationPayload[K]) => {
    setDraft((current) => ({ ...current, payload: { ...current.payload, [key]: value } }));
  };

  const updateCandidate = (id: string, values: Partial<Candidate>) => {
    setPayload("candidates", draft.payload.candidates.map((candidate) => candidate.id === id ? { ...candidate, ...values } : candidate));
  };

  const updateScore = (candidateId: string, memberId: string, criterionId: string, value: string) => {
    const criterion = draft.payload.criteria.find((item) => item.id === criterionId);
    const parsed = value === "" ? null : Math.max(0, Math.min(Number(value), criterion?.maxScore ?? 100));
    setPayload("candidates", draft.payload.candidates.map((candidate) => {
      if (candidate.id !== candidateId) return candidate;
      return {
        ...candidate,
        scores: {
          ...candidate.scores,
          [memberId]: { ...(candidate.scores[memberId] ?? {}), [criterionId]: parsed },
        },
      };
    }));
  };

  const validateFor = (status: ConsultantEvaluation["status"]) => {
    if (!draft.activityKey || !draft.payload.assignmentName.trim()) return t("Select an activity and enter the assignment name.", "Үйл ажиллагаа сонгож, ажлын нэрийг оруулна уу.");
    if (status === "draft") return "";
    if (criteriaTotal !== 100) return t("Technical criteria must total 100 points.", "Техникийн шалгуурын нийлбэр 100 оноо байх ёстой.");
    if (draft.payload.technicalWeight + draft.payload.financialWeight !== 100) return t("Technical and financial weights must total 100%.", "Техникийн болон санхүүгийн жингийн нийлбэр 100% байх ёстой.");
    if (!draft.payload.committee.length || draft.payload.committee.some((member) => !member.name.trim())) return t("Complete all committee member names.", "Комиссын бүх гишүүний нэрийг бөглөнө үү.");
    if (!draft.payload.candidates.length || draft.payload.candidates.some((candidate) => !candidate.name.trim())) return t("Complete all candidate names.", "Бүх оролцогчийн нэрийг бөглөнө үү.");
    if (results.some((result) => result.total === null)) return t("Complete every technical score and valid financial proposal.", "Техникийн бүх оноо болон хүчинтэй санхүүгийн саналыг бөглөнө үү.");
    if (status === "completed" && (!draft.payload.recommendedCandidateId || !draft.payload.recommendation.trim())) return t("Select the recommended candidate and enter the recommendation.", "Санал болгох оролцогчийг сонгож, зөвлөмжийг оруулна уу.");
    return "";
  };

  const save = async (status: ConsultantEvaluation["status"]) => {
    const error = validateFor(status);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/consultant-selections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          planYear: year,
          activityKey: draft.activityKey,
          title: draft.payload.assignmentName,
          status,
          payload: draft.payload,
        }),
      });
      const result = (await response.json()) as { evaluation?: ConsultantEvaluation; error?: string };
      if (!response.ok || !result.evaluation) throw new Error(result.error || "Unable to save evaluation");
      setDraft((current) => ({ ...current, id: result.evaluation!.id, status, createdBy: result.evaluation!.createdBy }));
      toast.success(status === "draft" ? t("Draft saved", "Ноорог хадгаллаа") : status === "completed" ? t("Evaluation completed", "Үнэлгээг дуусгалаа") : t("Evaluation saved", "Үнэлгээг хадгаллаа"));
      await load();
      if (status === "completed") setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save evaluation");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch("/api/consultant-selections", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to delete evaluation");
      setDeleteTarget(null);
      toast.success(t("Evaluation deleted", "Үнэлгээг устгалаа"));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete evaluation");
    }
  };

  const activeCandidate = draft.payload.candidates.find((candidate) => candidate.id === activeCandidateId) ?? draft.payload.candidates[0];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_24px_rgba(20,36,27,0.04)] lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6f8377]">{year} · {t("Independent workspace", "Бие даасан хэсэг")}</p>
            <h2 className="mt-1 text-xl font-black text-[#183529]">{t("Consultant Selection", "Зөвлөх сонгон шалгаруулалт")}</h2>
            <p className="mt-1 max-w-3xl text-sm text-[#718178]">{t("Create a complete shortlisting and evaluation record. The selected activity is the only connection to the Work Plan.", "Богино жагсаалт, үнэлгээний мэдээллийг бүрэн хөтөлнө. Сонгосон үйл ажиллагаа нь Work Plan-тай холбогдох цорын ганц холбоос юм.")}</p>
          </div>
          <Button onClick={openNew} className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"><Plus className="h-4 w-4" /> {t("New evaluation", "Шинэ үнэлгээ")}</Button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-xl">
          {[
            [t("Total", "Нийт"), evaluations.length],
            [t("In progress", "Хийгдэж буй"), evaluations.filter((item) => item.status !== "completed").length],
            [t("Completed", "Дууссан"), evaluations.filter((item) => item.status === "completed").length],
          ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#f2f6f0] px-3 py-2"><p className="text-[11px] font-bold text-[#718178]">{label}</p><p className="mt-0.5 text-lg font-black text-[#174734]">{value}</p></div>)}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_8px_24px_rgba(20,36,27,0.04)]">
        <div className="flex flex-col gap-2 border-b border-[#e2e7e0] p-4 sm:flex-row">
          <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search assignment, activity or officer", "Ажил, үйл ажиллагаа эсвэл ажилтнаар хайх")} className="h-9 bg-[#f8faf7] pl-9" /></label>
          <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 sm:w-48"><NativeSelectOption value="all">{t("All statuses", "Бүх төлөв")}</NativeSelectOption><NativeSelectOption value="draft">{t("Draft", "Ноорог")}</NativeSelectOption><NativeSelectOption value="evaluated">{t("Evaluated", "Үнэлсэн")}</NativeSelectOption><NativeSelectOption value="completed">{t("Completed", "Дууссан")}</NativeSelectOption></NativeSelect>
        </div>
        <div className="divide-y divide-[#e7ece5]">
          {loading ? <div className="p-10 text-center text-sm text-[#718178]">{t("Loading evaluations…", "Үнэлгээг ачаалж байна…")}</div> : visible.map((item) => {
            const payload = parsePayload(item.payload);
            const activity = activities.find((option) => option.key === item.activityKey);
            const mayDelete = Boolean(session?.isAdmin || session?.email === item.createdBy);
            const summary = calculateEvaluationResults(payload);
            const officialCandidate = payload.candidates.find((candidate) => candidate.id === payload.recommendedCandidateId);
            const displayedCandidate = officialCandidate ?? summary.rows.find((result) => result.total !== null)?.candidate ?? null;
            const displayedResult = summary.rows.find((result) => result.candidate.id === displayedCandidate?.id);
            const expanded = expandedEvaluationIds.has(item.id);
            return <article key={item.id} className="transition hover:bg-[#f8faf7]">
              <div className="grid gap-3 px-4 py-3.5 lg:grid-cols-[minmax(0,1fr)_90px_180px_160px_auto] lg:items-center">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-black capitalize ${statusTone(item.status)}`}>{item.status}</span><span className="font-mono text-xs font-black text-[#397054]">{activity?.code ?? t("Activity", "Үйл ажиллагаа")}</span></div><h3 className="mt-1 line-clamp-2 font-black text-[#183529]">{item.title}</h3><p className="mt-0.5 line-clamp-1 text-xs text-[#718178]">{activity?.title ?? t("Linked activity unavailable", "Холбосон үйл ажиллагаа олдсонгүй")}</p></div>
                <div><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#819087]">{t("Candidates", "Оролцогч")}</p><p className="mt-1 font-black">{payload.candidates.length}</p></div>
                <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#819087]">{officialCandidate ? t("Recommended", "Санал болгосон") : t("Top result", "Тэргүүлэх үр дүн")}</p><p className={`mt-1 truncate text-sm font-black ${displayedCandidate ? "text-[#174734]" : "text-[#8a9890]"}`}>{displayedCandidate?.name || t("Results incomplete", "Үр дүн дутуу")}</p>{displayedResult?.total !== null && displayedResult?.total !== undefined && <p className="text-[11px] font-bold text-[#718178]">{displayedResult.total.toFixed(2)} / 100</p>}</div>
                <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#819087]">{t("Prepared by", "Бэлтгэсэн")}</p><p className="mt-1 truncate text-sm font-bold">{item.createdBy}</p></div>
                <div className="flex flex-wrap items-center justify-end gap-1.5"><Button variant="ghost" size="sm" onClick={() => setExpandedEvaluationIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} className="text-[#245f47]">{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{expanded ? t("Hide details", "Хураах") : t("See details", "Дэлгэрэнгүй")}</Button><Button variant="outline" size="sm" onClick={() => openExisting(item)}>{mayDelete ? <PencilLine className="h-3.5 w-3.5" /> : <FileSearch className="h-3.5 w-3.5" />}{mayDelete ? t("Open", "Нээх") : t("View", "Харах")}</Button>{mayDelete && <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)} className="h-8 w-8 text-rose-700 hover:bg-rose-50 hover:text-rose-800"><Trash2 className="h-4 w-4" /></Button>}</div>
              </div>
              {expanded && <div className="border-t border-[#e0e7de] bg-[#f5f8f3] px-4 py-4">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-[#dbe4d8] bg-white p-3"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#819087]">{t("Recommended / top candidate", "Санал болгосон / тэргүүлэх оролцогч")}</p><p className="mt-1 font-black text-[#174734]">{displayedCandidate?.name || "—"}</p></div>
                  <div className="rounded-xl border border-[#dbe4d8] bg-white p-3"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#819087]">{t("Combined score", "Нэгдсэн оноо")}</p><p className="mt-1 text-lg font-black text-[#174734]">{displayedResult?.total === null || displayedResult?.total === undefined ? "—" : `${displayedResult.total.toFixed(2)} / 100`}</p></div>
                  <div className="rounded-xl border border-[#dbe4d8] bg-white p-3"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#819087]">{t("Lowest valid offer", "Хамгийн бага хүчинтэй санал")}</p><p className="mt-1 font-black text-[#174734]">{formatMnt(summary.lowestOffer)}</p></div>
                  <div className="rounded-xl border border-[#dbe4d8] bg-white p-3"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#819087]">{t("Evaluation date", "Үнэлгээний огноо")}</p><p className="mt-1 font-black text-[#174734]">{payload.evaluationDate || "—"}</p></div>
                </div>
                <div className="mt-3 overflow-x-auto rounded-xl border border-[#dbe4d8] bg-white"><table className="w-full min-w-[700px] text-sm"><thead><tr className="bg-[#edf3e9] text-left text-[10px] font-black uppercase tracking-[0.07em] text-[#718178]"><th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">{t("Candidate", "Оролцогч")}</th><th className="px-3 py-2.5 text-right">{t("Proposal", "Санал")}</th><th className="px-3 py-2.5 text-right">{t("Technical", "Техник")}</th><th className="px-3 py-2.5 text-right">{t("Financial", "Санхүү")}</th><th className="px-3 py-2.5 text-right">{t("Combined", "Нэгдсэн")}</th></tr></thead><tbody>{summary.rows.map((result, index) => <tr key={result.candidate.id} className={result.candidate.id === displayedCandidate?.id ? "bg-[#f7fae9]" : ""}><td className="border-t border-[#e7ece5] px-3 py-2.5 font-black">{result.total === null ? "—" : index + 1}</td><td className="border-t border-[#e7ece5] px-3 py-2.5 font-black">{result.candidate.name || t("Unnamed candidate", "Нэргүй оролцогч")}</td><td className="border-t border-[#e7ece5] px-3 py-2.5 text-right font-bold">{formatMnt(result.candidate.financialProposalMnt)}</td><td className="border-t border-[#e7ece5] px-3 py-2.5 text-right">{result.technical === null ? "—" : result.technical.toFixed(2)}</td><td className="border-t border-[#e7ece5] px-3 py-2.5 text-right">{result.financial === null ? "—" : result.financial.toFixed(2)}</td><td className="border-t border-[#e7ece5] px-3 py-2.5 text-right font-black text-[#174734]">{result.total === null ? "—" : result.total.toFixed(2)}</td></tr>)}</tbody></table></div>
                {payload.recommendation.trim() && <div className="mt-3 rounded-xl border border-[#dbe4d8] bg-white p-3"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#819087]">{t("Recommendation", "Зөвлөмж")}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#425a4d]">{payload.recommendation}</p></div>}
              </div>}
            </article>;
          })}
          {!loading && !visible.length && <div className="px-6 py-14 text-center"><FileCheck2 className="mx-auto h-8 w-8 text-[#7c9285]" /><p className="mt-3 font-black">{t("No consultant evaluations found", "Зөвлөхийн үнэлгээ олдсонгүй")}</p><p className="mt-1 text-sm text-[#718178]">{t("Create the first evaluation or change the filters.", "Эхний үнэлгээг үүсгэх эсвэл шүүлтүүрээ өөрчилнө үү.")}</p></div>}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="h-[94vh] max-w-[calc(100%-1rem)] gap-0 overflow-hidden p-0 sm:max-w-[1500px]">
          <DialogHeader className="border-b border-[#dce4da] bg-white px-5 py-4 pr-14">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><DialogTitle className="text-xl font-black text-[#183529]">{draft.id ? draft.payload.assignmentName || t("Consultant evaluation", "Зөвлөхийн үнэлгээ") : t("New consultant evaluation", "Шинэ зөвлөхийн үнэлгээ")}</DialogTitle><DialogDescription className="mt-1">{selectedActivity ? `${selectedActivity.code} · ${selectedActivity.title}` : t("Select one Work Plan activity to begin.", "Эхлэхийн тулд Work Plan-аас нэг үйл ажиллагаа сонгоно уу.")}</DialogDescription></div><span className={`rounded-full border px-2.5 py-1 text-xs font-black capitalize ${statusTone(draft.status)}`}>{draft.status}</span></div>
          </DialogHeader>
          <div className="border-b border-[#dce4da] bg-[#f7faf5] px-4 py-2.5">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">{steps.map((item, index) => { const Icon = item.icon; return <button key={item.en} type="button" onClick={() => setStep(index)} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 text-xs font-black transition ${step === index ? "bg-[#0c3b2d] text-white shadow-sm" : index < step ? "bg-[#e8f0e3] text-[#245f47]" : "text-[#718178] hover:bg-white"}`}><Icon className="h-3.5 w-3.5" /><span className="hidden lg:inline">{t(item.en, item.mn)}</span><span className="lg:hidden">{index + 1}</span></button>; })}</div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f7f2] p-4 lg:p-6">
            {step === 0 && <div className="mx-auto max-w-5xl space-y-4">
              <div className="rounded-2xl border border-[#d7ded5] bg-white p-4 lg:p-5"><h3 className="font-black text-[#183529]">{t("Assignment information", "Ажлын мэдээлэл")}</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-bold lg:col-span-2">{t("Linked Work Plan activity", "Холбох Work Plan үйл ажиллагаа")}<NativeSelect disabled={!canEdit} value={draft.activityKey} onChange={(event) => setDraft((current) => ({ ...current, activityKey: event.target.value }))}><NativeSelectOption value="">{t("Choose an activity", "Үйл ажиллагаа сонгох")}</NativeSelectOption>{activities.map((activity) => <NativeSelectOption key={activity.key} value={activity.key}>{activity.kind === "subactivity" ? "↳ " : ""}{activity.code} · {activity.title}</NativeSelectOption>)}</NativeSelect></label>
                <label className="grid gap-1.5 text-sm font-bold lg:col-span-2">{t("Assignment / ToR name", "Ажил / Ажлын даалгаврын нэр")}<Input disabled={!canEdit} value={draft.payload.assignmentName} onChange={(event) => setPayload("assignmentName", event.target.value)} /></label>
                <label className="grid gap-1.5 text-sm font-bold">{t("Project / programme", "Төсөл / хөтөлбөр")}<Input disabled={!canEdit} value={draft.payload.projectProgram} onChange={(event) => setPayload("projectProgram", event.target.value)} /></label>
                <label className="grid gap-1.5 text-sm font-bold">{t("Contract type", "Гэрээний төрөл")}<Input disabled={!canEdit} value={draft.payload.contractType} onChange={(event) => setPayload("contractType", event.target.value)} /></label>
                <label className="grid gap-1.5 text-sm font-bold">{t("Requesting unit", "Хүсэлт гаргасан нэгж")}<Input disabled={!canEdit} value={draft.payload.requestingUnit} onChange={(event) => setPayload("requestingUnit", event.target.value)} /></label>
                <label className="grid gap-1.5 text-sm font-bold">{t("Evaluation date", "Үнэлгээний огноо")}<Input disabled={!canEdit} type="date" value={draft.payload.evaluationDate} onChange={(event) => setPayload("evaluationDate", event.target.value)} /></label>
                <label className="grid gap-1.5 text-sm font-bold lg:col-span-2">{t("Brief of work", "Ажлын товч мэдээлэл")}<Textarea disabled={!canEdit} rows={4} value={draft.payload.briefOfWork} onChange={(event) => setPayload("briefOfWork", event.target.value)} /></label>
                <label className="grid gap-1.5 text-sm font-bold lg:col-span-2">{t("Key deliverables", "Гол үр дүн, бүтээгдэхүүн")}<Textarea disabled={!canEdit} rows={4} value={draft.payload.keyDeliverables} onChange={(event) => setPayload("keyDeliverables", event.target.value)} /></label>
              </div></div>
            </div>}

            {step === 1 && <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 lg:p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-[#183529]">{t("Technical criteria", "Техникийн шалгуур")}</h3><p className="mt-1 text-xs text-[#718178]">{t("Criteria must total 100 points.", "Шалгуурын нийлбэр 100 оноо байна.")}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${criteriaTotal === 100 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{criteriaTotal}/100</span></div><div className="mt-4 space-y-2">{draft.payload.criteria.map((criterion, index) => <div key={criterion.id} className="grid grid-cols-[32px_minmax(0,1fr)_90px_34px] items-center gap-2 rounded-xl bg-[#f5f8f3] p-2"><span className="text-center text-xs font-black text-[#718178]">{index + 1}</span><Input disabled={!canEdit} value={criterion.label} onChange={(event) => setPayload("criteria", draft.payload.criteria.map((item) => item.id === criterion.id ? { ...item, label: event.target.value } : item))} /><Input disabled={!canEdit} type="number" min="0" max="100" value={criterion.maxScore} onChange={(event) => setPayload("criteria", draft.payload.criteria.map((item) => item.id === criterion.id ? { ...item, maxScore: Number(event.target.value) } : item))} />{canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-700" onClick={() => setPayload("criteria", draft.payload.criteria.filter((item) => item.id !== criterion.id))}><Trash2 className="h-4 w-4" /></Button>}</div>)}</div>{canEdit && <Button variant="outline" size="sm" className="mt-3" onClick={() => setPayload("criteria", [...draft.payload.criteria, { id: uid("criterion"), label: "", maxScore: 0 }])}><Plus className="h-3.5 w-3.5" />{t("Add criterion", "Шалгуур нэмэх")}</Button>}
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-[#dce4da] p-3"><label className="grid gap-1 text-xs font-bold">{t("Technical weight", "Техникийн жин")}<Input disabled={!canEdit} type="number" min="0" max="100" value={draft.payload.technicalWeight} onChange={(event) => setPayload("technicalWeight", Number(event.target.value))} /></label><label className="grid gap-1 text-xs font-bold">{t("Financial weight", "Санхүүгийн жин")}<Input disabled={!canEdit} type="number" min="0" max="100" value={draft.payload.financialWeight} onChange={(event) => setPayload("financialWeight", Number(event.target.value))} /></label></div>
              </section>
              <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 lg:p-5"><div><h3 className="font-black text-[#183529]">{t("Evaluation committee", "Үнэлгээний комисс")}</h3><p className="mt-1 text-xs text-[#718178]">{t("One officer enters scores on behalf of every listed evaluator.", "Нэг ажилтан жагсаасан бүх үнэлэгчийн оноог оруулна.")}</p></div><div className="mt-4 space-y-2">{draft.payload.committee.map((member, index) => <div key={member.id} className="grid grid-cols-[32px_minmax(0,1fr)_150px_34px] items-center gap-2 rounded-xl bg-[#f5f8f3] p-2"><span className="text-center text-xs font-black text-[#718178]">{index + 1}</span><Input disabled={!canEdit} value={member.name} placeholder={t("Full name", "Овог нэр")} onChange={(event) => setPayload("committee", draft.payload.committee.map((item) => item.id === member.id ? { ...item, name: event.target.value } : item))} /><Input disabled={!canEdit} value={member.role} placeholder={t("Role", "Үүрэг")} onChange={(event) => setPayload("committee", draft.payload.committee.map((item) => item.id === member.id ? { ...item, role: event.target.value } : item))} />{canEdit && <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-700" onClick={() => setPayload("committee", draft.payload.committee.filter((item) => item.id !== member.id))}><Trash2 className="h-4 w-4" /></Button>}</div>)}</div>{canEdit && <Button variant="outline" size="sm" className="mt-3" onClick={() => setPayload("committee", [...draft.payload.committee, { id: uid("member"), name: "", role: "Member" }])}><Plus className="h-3.5 w-3.5" />{t("Add member", "Гишүүн нэмэх")}</Button>}</section>
            </div>}

            {step === 2 && <div className="mx-auto max-w-7xl space-y-4">
              <section className="rounded-2xl border border-[#d7ded5] bg-white p-3"><div className="flex flex-wrap items-center gap-2">{draft.payload.candidates.map((candidate, index) => <button key={candidate.id} type="button" onClick={() => setActiveCandidateId(candidate.id)} className={`rounded-lg px-3 py-2 text-sm font-black transition ${activeCandidate?.id === candidate.id ? "bg-[#0c3b2d] text-white" : "bg-[#eef3eb] text-[#456153] hover:bg-[#e3ece0]"}`}>{candidate.name || `${t("Candidate", "Оролцогч")} ${index + 1}`}</button>)}{canEdit && <Button variant="outline" size="sm" onClick={() => { const candidate = { id: uid("candidate"), name: "", financialProposalMnt: null, scores: {}, note: "" }; setPayload("candidates", [...draft.payload.candidates, candidate]); setActiveCandidateId(candidate.id); }}><Plus className="h-3.5 w-3.5" />{t("Add candidate", "Оролцогч нэмэх")}</Button>}</div></section>
              {activeCandidate && <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 lg:p-5"><div className="grid gap-3 border-b border-[#e1e7df] pb-4 lg:grid-cols-[minmax(0,1fr)_260px_auto]"><label className="grid gap-1 text-sm font-bold">{t("Candidate / company name", "Оролцогч / компанийн нэр")}<Input disabled={!canEdit} value={activeCandidate.name} onChange={(event) => updateCandidate(activeCandidate.id, { name: event.target.value })} /></label><label className="grid gap-1 text-sm font-bold">{t("Financial proposal (MNT)", "Санхүүгийн санал (₮)")}<Input disabled={!canEdit} type="number" min="0" value={activeCandidate.financialProposalMnt ?? ""} onChange={(event) => updateCandidate(activeCandidate.id, { financialProposalMnt: event.target.value === "" ? null : Number(event.target.value) })} /></label>{canEdit && draft.payload.candidates.length > 1 && <Button variant="outline" className="self-end text-rose-700" onClick={() => { const remaining = draft.payload.candidates.filter((candidate) => candidate.id !== activeCandidate.id); setPayload("candidates", remaining); setActiveCandidateId(remaining[0]?.id ?? ""); }}><Trash2 className="h-4 w-4" />{t("Remove", "Хасах")}</Button>}</div>
                <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm"><thead><tr><th className="border-b border-[#d7ded5] px-3 py-2 text-left">{t("Criterion", "Шалгуур")}</th><th className="w-24 border-b border-[#d7ded5] px-3 py-2 text-center">{t("Maximum", "Дээд оноо")}</th>{draft.payload.committee.map((member) => <th key={member.id} className="min-w-36 border-b border-[#d7ded5] px-3 py-2 text-center"><span className="block font-black">{member.name || t("Unnamed member", "Нэргүй гишүүн")}</span><span className="text-[10px] font-semibold text-[#718178]">{member.role}</span></th>)}</tr></thead><tbody>{draft.payload.criteria.map((criterion) => <tr key={criterion.id}><td className="border-b border-[#e8ece6] px-3 py-2.5 font-bold">{criterion.label}</td><td className="border-b border-[#e8ece6] px-3 py-2.5 text-center font-black">{criterion.maxScore}</td>{draft.payload.committee.map((member) => <td key={member.id} className="border-b border-[#e8ece6] px-3 py-2"><Input disabled={!canEdit} className="mx-auto h-8 w-24 text-center font-black" type="number" min="0" max={criterion.maxScore} value={scoreValue(activeCandidate, member.id, criterion.id) ?? ""} onChange={(event) => updateScore(activeCandidate.id, member.id, criterion.id, event.target.value)} /></td>)}</tr>)}<tr className="bg-[#f3f7f1]"><td className="px-3 py-3 font-black">{t("Technical total", "Техникийн нийт оноо")}</td><td className="px-3 py-3 text-center font-black">{criteriaTotal}</td>{draft.payload.committee.map((member) => { const values = draft.payload.criteria.map((criterion) => scoreValue(activeCandidate, member.id, criterion.id)); const complete = values.every((value) => value !== null && value !== undefined); const total = values.reduce<number>((sum, value) => sum + Number(value ?? 0), 0); return <td key={member.id} className="px-3 py-3 text-center font-black">{complete ? total.toFixed(1) : "—"}</td>; })}</tr></tbody></table></div>
                <label className="mt-4 grid gap-1 text-sm font-bold">{t("Candidate note", "Оролцогчийн тэмдэглэл")}<Textarea disabled={!canEdit} rows={3} value={activeCandidate.note} onChange={(event) => updateCandidate(activeCandidate.id, { note: event.target.value })} /></label>
              </section>}
            </div>}

            {step === 3 && <div className="mx-auto max-w-6xl space-y-4"><section className="rounded-2xl border border-[#d7ded5] bg-white p-4 lg:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-[#183529]">{t("Combined evaluation result", "Нэгдсэн үнэлгээний үр дүн")}</h3><p className="mt-1 text-xs text-[#718178]">{t("Financial score = lowest valid offer ÷ candidate offer × 100.", "Санхүүгийн оноо = хамгийн бага хүчинтэй санал ÷ тухайн санал × 100.")}</p></div><span className="rounded-full bg-[#edf3e9] px-3 py-1 text-xs font-black text-[#245f47]">{t("Lowest valid offer", "Хамгийн бага хүчинтэй санал")}: {formatMnt(lowestOffer)}</span></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-[#f3f6f1] text-left text-xs uppercase tracking-[0.06em] text-[#718178]"><th className="px-3 py-3">#</th><th className="px-3 py-3">{t("Candidate", "Оролцогч")}</th><th className="px-3 py-3 text-right">{t("Proposal", "Санал")}</th><th className="px-3 py-3 text-right">{t("Technical", "Техник")}</th><th className="px-3 py-3 text-right">{t("Financial", "Санхүү")}</th><th className="px-3 py-3 text-right">{t("Combined", "Нэгдсэн")}</th></tr></thead><tbody>{results.map((result, index) => <tr key={result.candidate.id} className="border-b border-[#e6ebe4]"><td className="px-3 py-3 font-black">{result.total === null ? "—" : index + 1}</td><td className="px-3 py-3 font-black">{result.candidate.name || t("Unnamed candidate", "Нэргүй оролцогч")}</td><td className="px-3 py-3 text-right font-bold">{formatMnt(result.candidate.financialProposalMnt)}</td><td className="px-3 py-3 text-right font-bold">{result.technical === null ? t("Incomplete", "Дутуу") : result.technical.toFixed(2)}</td><td className="px-3 py-3 text-right font-bold">{result.financial === null ? t("Incomplete", "Дутуу") : result.financial.toFixed(2)}</td><td className="px-3 py-3 text-right text-lg font-black text-[#174734]">{result.total === null ? "—" : result.total.toFixed(2)}</td></tr>)}</tbody></table></div></section>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><strong>{t("Calculation safeguard:", "Тооцооллын хамгаалалт:")}</strong> {t("all criteria, including the fourth criterion, are included. Blank or zero financial offers are marked incomplete and never receive 100 points.", "дөрөв дэх шалгуурыг багтаасан бүх шалгуур тооцоонд орно. Хоосон эсвэл тэг санхүүгийн саналыг дутуу гэж тэмдэглэх бөгөөд 100 оноо өгөхгүй.")}</div>
            </div>}

            {step === 4 && <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-[1.1fr_0.9fr]"><section className="rounded-2xl border border-[#d7ded5] bg-white p-4 lg:p-5"><h3 className="font-black text-[#183529]">{t("Recommendation", "Зөвлөмж")}</h3><div className="mt-4 space-y-4"><label className="grid gap-1.5 text-sm font-bold">{t("Recommended candidate", "Санал болгож буй оролцогч")}<NativeSelect disabled={!canEdit} value={draft.payload.recommendedCandidateId} onChange={(event) => setPayload("recommendedCandidateId", event.target.value)}><NativeSelectOption value="">{t("Choose candidate", "Оролцогч сонгох")}</NativeSelectOption>{results.map(({ candidate, total }) => <NativeSelectOption key={candidate.id} value={candidate.id}>{candidate.name || t("Unnamed candidate", "Нэргүй оролцогч")}{total === null ? "" : ` · ${total.toFixed(2)}`}</NativeSelectOption>)}</NativeSelect></label><label className="grid gap-1.5 text-sm font-bold">{t("Evaluation conclusion and recommendation", "Үнэлгээний дүгнэлт ба зөвлөмж")}<Textarea disabled={!canEdit} rows={9} value={draft.payload.recommendation} onChange={(event) => setPayload("recommendation", event.target.value)} /></label></div></section>
              <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 lg:p-5"><h3 className="font-black text-[#183529]">{t("Supporting-document checklist", "Дагалдах баримтын жагсаалт")}</h3><p className="mt-1 text-xs text-[#718178]">{t("This checklist records availability only; it does not connect to document storage yet.", "Энэ жагсаалт зөвхөн баримт байгаа эсэхийг тэмдэглэнэ; одоогоор баримтын сантай холбогдохгүй.")}</p><div className="mt-4 space-y-2">{documentOptions.map((option) => <label key={option.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e0e6de] p-3 text-sm font-bold"><Checkbox disabled={!canEdit} checked={draft.payload.supportingDocuments[option.key]} onCheckedChange={(checked) => setPayload("supportingDocuments", { ...draft.payload.supportingDocuments, [option.key]: checked === true })} />{t(option.en, option.mn)}</label>)}</div><label className="mt-4 grid gap-1.5 text-sm font-bold">{t("Other document note", "Бусад баримтын тэмдэглэл")}<Textarea disabled={!canEdit} rows={3} value={draft.payload.otherDocumentNote} onChange={(event) => setPayload("otherDocumentNote", event.target.value)} /></label></section>
            </div>}
          </div>

          <div className="flex flex-col gap-2 border-t border-[#dce4da] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2"><Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ChevronLeft className="h-4 w-4" />{t("Back", "Буцах")}</Button><Button variant="outline" size="sm" disabled={step === steps.length - 1} onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>{t("Continue", "Үргэлжлүүлэх")}<ChevronRight className="h-4 w-4" /></Button></div>
            {canEdit ? <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" size="sm" disabled={saving} onClick={() => void save("draft")}>{t("Save draft", "Ноорог хадгалах")}</Button><Button variant="outline" size="sm" disabled={saving} onClick={() => void save("evaluated")}><UserRoundCheck className="h-4 w-4" />{t("Save evaluation", "Үнэлгээ хадгалах")}</Button><Button size="sm" disabled={saving} onClick={() => void save("completed")} className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"><Check className="h-4 w-4" />{t("Complete", "Дуусгах")}</Button></div> : <p className="text-xs font-bold text-[#718178]">{t("Read-only: only the creator or an administrator can edit this evaluation.", "Зөвхөн үүсгэсэн ажилтан эсвэл админ засварлах эрхтэй.")}</p>}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Delete this evaluation?", "Энэ үнэлгээг устгах уу?")}</AlertDialogTitle><AlertDialogDescription>{t("The complete shortlist, scores and recommendation will be permanently removed.", "Богино жагсаалт, оноо, зөвлөмжийн бүх мэдээлэл бүр мөсөн устна.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Cancel", "Болих")}</AlertDialogCancel><AlertDialogAction onClick={() => void remove()} className="bg-rose-700 text-white hover:bg-rose-800">{t("Delete", "Устгах")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
