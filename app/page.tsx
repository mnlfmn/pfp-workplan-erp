"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  Cloud,
  CloudOff,
  CopyPlus,
  Gauge,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  PencilLine,
  Plus,
  ReceiptText,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultTeamMembers,
  type TeamMember,
} from "@/lib/team-members";
import workplan from "@/lib/workplan-data.json";

type Activity = (typeof workplan.activities)[number];
type Subactivity = Activity["subactivities"][number];
type BudgetLine = (typeof workplan.budgetLines)[number];
type StatusKey =
  | "completed"
  | "in_progress"
  | "delayed"
  | "on_hold"
  | "not_started"
  | "not_reported";

type UpdateRecord = {
  activityKey: string;
  status: StatusKey;
  progress: number;
  note: string;
  supportNeeded: string;
  owner: string;
  updatedAt: string;
  updatedBy: string;
};

type EditableTarget = {
  key: string;
  label: string;
  kind: "activity" | "subactivity";
  baseStatus: StatusKey;
  baseProgress: number;
  baseOwner: string;
  baseNote: string;
};

type Draft = {
  status: StatusKey;
  progress: number;
  owner: string;
  note: string;
};

type FinanceEntry = {
  id: number;
  budgetKey: string;
  activityKey: string;
  entryType: "commitment" | "expenditure";
  amountMnt: number;
  entryDate: string;
  description: string;
  vendor: string;
  createdAt: string;
  createdBy: string;
};

type FinanceDraft = {
  budgetKey: string;
  activityKey: string;
  entryType: "commitment" | "expenditure";
  amountMnt: string;
  entryDate: string;
  description: string;
  vendor: string;
};

type TeamDraft = {
  name: string;
  role: string;
  group: "PCU" | "Workplan";
  aliasesText: string;
};

type WorkplanYear = {
  year: number;
  title: string;
  status: string;
  reportingDate: string;
};

type BudgetAllocation = {
  id: string;
  planYear: number;
  budgetKey: string;
  activityKey: string;
  amountMnt: number;
  note: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

type ActivityPlanDraft = {
  code: string;
  title: string;
  titleMn: string;
  section: string;
  goal: string;
  priority: string;
  workstream: string;
  startDate: string;
  endDate: string;
  lead: string;
  technicalLead: string;
  support: string;
  partners: string;
  actionPlan: string;
  description: string;
  baseline: string;
  target: string;
};

type SubactivityPlanDraft = {
  title: string;
  owner: string;
  executor: string;
  startDate: string;
  endDate: string;
  status: StatusKey;
  progressSummary: string;
};

type BudgetLineDraft = {
  code: string;
  title: string;
  section: string;
  goal: string;
  workstream: string;
  level: string;
  amountMnt: string;
};

type AllocationDraft = {
  id: string;
  budgetKey: string;
  activityKey: string;
  amountMnt: string;
  note: string;
};

type BudgetTarget = {
  key: string;
  activityId: string;
  code: string;
  label: string;
  kind: "activity" | "subactivity";
};

const statusMeta: Record<
  StatusKey,
  { label: string; tone: string; dot: string; weight: number }
> = {
  completed: {
    label: "Completed",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-600",
    weight: 100,
  },
  in_progress: {
    label: "In progress",
    tone: "bg-blue-50 text-blue-800 border-blue-200",
    dot: "bg-blue-600",
    weight: 55,
  },
  delayed: {
    label: "Delayed",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-600",
    weight: 35,
  },
  on_hold: {
    label: "On hold",
    tone: "bg-amber-50 text-amber-900 border-amber-200",
    dot: "bg-amber-600",
    weight: 20,
  },
  not_started: {
    label: "Not started",
    tone: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
    weight: 0,
  },
  not_reported: {
    label: "Not reported",
    tone: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-300",
    weight: 0,
  },
};

const statusChartColors: Record<StatusKey, string> = {
  completed: "#16825d",
  in_progress: "#2878c8",
  delayed: "#c44757",
  on_hold: "#d39222",
  not_started: "#829089",
  not_reported: "#c4ccc7",
};

const baseActivities = workplan.activities as Activity[];
const baseBudgetLines = workplan.budgetLines as BudgetLine[];

const emptyActivityDraft: ActivityPlanDraft = {
  code: "",
  title: "",
  titleMn: "",
  section: "A",
  goal: "Goal 1",
  priority: "Medium",
  workstream: "",
  startDate: "",
  endDate: "",
  lead: "",
  technicalLead: "",
  support: "",
  partners: "",
  actionPlan: "",
  description: "",
  baseline: "",
  target: "",
};

const emptySubactivityDraft: SubactivityPlanDraft = {
  title: "",
  owner: "",
  executor: "",
  startDate: "",
  endDate: "",
  status: "not_started",
  progressSummary: "",
};

const emptyBudgetLineDraft: BudgetLineDraft = {
  code: "",
  title: "",
  section: "A",
  goal: "Goal 1",
  workstream: "",
  level: "Activity",
  amountMnt: "",
};

function todayForInput() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatMnt(amountMnt: number) {
  return `₮${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(amountMnt))}`;
}

function formatNumberInput(value: string | number) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? new Intl.NumberFormat("en-US").format(Number(digits)) : "";
}

function formatDate(value: string) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatUpdatedAt(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: StatusKey }) {
  const meta = statusMeta[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function targetForActivity(
  activity: Activity,
  updates: Record<string, UpdateRecord>,
): EditableTarget {
  return {
    key: activity.id,
    label: `${activity.code || activity.uid} · Main activity`,
    kind: "activity",
    baseStatus: deriveActivityStatus(activity, updates),
    baseProgress: deriveActivityProgress(activity, updates),
    baseOwner: activity.technicalLead || activity.lead,
    baseNote: "",
  };
}

function targetForSubactivity(subactivity: Subactivity): EditableTarget {
  return {
    key: subactivity.id,
    label: subactivity.title,
    kind: "subactivity",
    baseStatus: subactivity.status as StatusKey,
    baseProgress: statusMeta[subactivity.status as StatusKey].weight,
    baseOwner: subactivity.owner,
    baseNote: "",
  };
}

function recordProgress(
  key: string,
  fallback: number,
  updates: Record<string, UpdateRecord>,
) {
  return updates[key]?.progress ?? fallback;
}

function recordStatus(
  key: string,
  fallback: StatusKey,
  updates: Record<string, UpdateRecord>,
) {
  return updates[key]?.status ?? fallback;
}

function deriveActivityStatus(
  activity: Activity,
  updates: Record<string, UpdateRecord>,
) {
  if (!activity.subactivities.length) {
    return updates[activity.id]?.status ?? (activity.status as StatusKey);
  }
  const statuses = activity.subactivities.map((item) =>
    recordStatus(item.id, item.status as StatusKey, updates),
  );
  if (statuses.every((item) => item === "completed")) return "completed";
  if (updates[activity.id]) return updates[activity.id].status;
  if (statuses.includes("delayed")) return "delayed";
  if (statuses.some((item) => item === "in_progress" || item === "completed")) {
    return "in_progress";
  }
  if (statuses.includes("on_hold")) return "on_hold";
  if (statuses.includes("not_started")) return "not_started";
  return "not_reported";
}

function activityOwner(
  activity: Activity,
  updates: Record<string, UpdateRecord>,
) {
  return updates[activity.id]
    ? updates[activity.id].owner
    : activity.technicalLead || activity.lead || "";
}

function subactivityOwner(
  subactivity: Subactivity,
  updates: Record<string, UpdateRecord>,
) {
  return updates[subactivity.id]
    ? updates[subactivity.id].owner
    : subactivity.owner || "";
}

function canonicalOwnerName(value: string, members: TeamMember[]) {
  const normalized = value.trim().toLocaleLowerCase();
  if (!normalized) return "";
  return (
    members.find((member) =>
      [member.name, ...member.aliases].some((alias) =>
        normalized.includes(alias.toLocaleLowerCase()),
      ),
    )?.name ?? ""
  );
}

function deriveActivityProgress(
  activity: Activity,
  updates: Record<string, UpdateRecord>,
) {
  if (!activity.subactivities.length) {
    return updates[activity.id]?.progress ?? activity.progress;
  }
  return Math.round(
    activity.subactivities.reduce(
      (total, item) =>
        total +
        recordProgress(
          item.id,
          statusMeta[item.status as StatusKey].weight,
          updates,
        ),
      0,
    ) / activity.subactivities.length,
  );
}

function activityAssignmentText(
  activity: Activity,
  updates: Record<string, UpdateRecord>,
) {
  return [
    activityOwner(activity, updates),
    ...activity.subactivities.map((item) => subactivityOwner(item, updates)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function isAssignedToMember(
  activity: Activity,
  memberId: string,
  updates: Record<string, UpdateRecord>,
  members: TeamMember[],
) {
  if (memberId === "all") return true;
  if (memberId === "no_owner") {
    return (
      !canonicalOwnerName(activityOwner(activity, updates), members) ||
      activity.subactivities.some(
        (item) => !canonicalOwnerName(subactivityOwner(item, updates), members),
      )
    );
  }
  const member = members.find((item) => item.id === memberId);
  if (!member) return false;
  const assignmentText = activityAssignmentText(activity, updates);
  return [member.name, ...member.aliases].some((alias) =>
    assignmentText.includes(alias.toLocaleLowerCase()),
  );
}

function targetsForBudgetLine(
  line: BudgetLine | undefined,
  activities: Activity[],
): BudgetTarget[] {
  if (!line) return [];
  return activities
    .filter(
      (activity) =>
        activity.section === line.section &&
        codesShareBudgetLine(activity.code, line.code),
    )
    .flatMap((activity) => [
      {
        key: activity.id,
        activityId: activity.id,
        code: activity.code || activity.uid,
        label: activity.title,
        kind: "activity" as const,
      },
      ...activity.subactivities.map((subactivity) => ({
        key: subactivity.id,
        activityId: activity.id,
        code: activity.code || activity.uid,
        label: subactivity.title,
        kind: "subactivity" as const,
      })),
    ]);
}

function codesShareBudgetLine(activityCode: string, budgetCode: string) {
  const normalize = (value: string) =>
    value.replace(/\s/g, "").replace(/\.+$/, "");
  const activity = normalize(activityCode);
  const budget = normalize(budgetCode);
  return (
    activity === budget ||
    activity.startsWith(`${budget}.`) ||
    budget.startsWith(`${activity}.`)
  );
}

function budgetKeysForActivities(
  activities: Activity[],
  budgetLines: BudgetLine[],
) {
  return new Set(
    budgetLines
      .filter((line) =>
        activities.some(
          (activity) =>
            activity.section === line.section &&
            codesShareBudgetLine(activity.code, line.code),
        ),
      )
      .map((line) => line.id),
  );
}

function averageActivityProgress(
  activities: Activity[],
  updates: Record<string, UpdateRecord>,
) {
  if (!activities.length) return 0;
  return Math.round(
    activities.reduce(
      (total, activity) => total + deriveActivityProgress(activity, updates),
      0,
    ) / activities.length,
  );
}

function summarizeFinance(lines: BudgetLine[], entries: FinanceEntry[]) {
  const keys = new Set(lines.map((line) => line.id));
  const budgetMnt = lines.reduce(
    (total, line) => total + Number(line.budgetMntMillion) * 1_000_000,
    0,
  );
  const relevantEntries = entries.filter((entry) => keys.has(entry.budgetKey));
  const commitmentMnt = relevantEntries
    .filter((entry) => entry.entryType === "commitment")
    .reduce((total, entry) => total + entry.amountMnt, 0);
  const expenditureMnt = relevantEntries
    .filter((entry) => entry.entryType === "expenditure")
    .reduce((total, entry) => total + entry.amountMnt, 0);
  const linesWithEntries = new Set(relevantEntries.map((entry) => entry.budgetKey));
  return {
    budgetMnt,
    commitmentMnt,
    expenditureMnt,
    uncommittedMnt: budgetMnt - commitmentMnt,
    remainingMnt: budgetMnt - expenditureMnt,
    commitmentPercent:
      budgetMnt > 0 ? Math.round((commitmentMnt / budgetMnt) * 100) : 0,
    spentPercent:
      budgetMnt > 0 ? Math.round((expenditureMnt / budgetMnt) * 100) : 0,
    financeCoveragePercent:
      lines.length > 0 ? Math.round((linesWithEntries.size / lines.length) * 100) : 0,
    relevantEntries,
  };
}

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [workplanYears, setWorkplanYears] = useState<WorkplanYear[]>([
    {
      year: 2026,
      title: "2026 workplan",
      status: "active",
      reportingDate: workplan.meta.reportingDate,
    },
  ]);
  const [allActivities, setAllActivities] = useState<Activity[]>(baseActivities);
  const [allBudgetLines, setAllBudgetLines] = useState<BudgetLine[]>(baseBudgetLines);
  const [planState, setPlanState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState(2027);
  const [copyCurrentYear, setCopyCurrentYear] = useState(true);
  const [yearSaving, setYearSaving] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [goal, setGoal] = useState("all");
  const [member, setMember] = useState("all");
  const [status, setStatus] = useState("all");
  const [workstream, setWorkstream] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Record<string, UpdateRecord>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    defaultTeamMembers,
  );
  const [teamState, setTeamState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamDeleteOpen, setTeamDeleteOpen] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamDraft, setTeamDraft] = useState<TeamDraft>({
    name: "",
    role: "",
    group: "PCU",
    aliasesText: "",
  });
  const [syncState, setSyncState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [editKey, setEditKey] = useState("");
  const [draft, setDraft] = useState<Draft>({
    status: "not_reported",
    progress: 0,
    owner: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [financeState, setFinanceState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [financeSaving, setFinanceSaving] = useState(false);
  const [financeDraft, setFinanceDraft] = useState<FinanceDraft>({
    budgetKey: baseBudgetLines[0]?.id ?? "",
    activityKey: "",
    entryType: "commitment",
    amountMnt: "",
    entryDate: todayForInput(),
    description: "",
    vendor: "",
  });
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [allocationState, setAllocationState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [allocationSaving, setAllocationSaving] = useState(false);
  const [allocationDeleteOpen, setAllocationDeleteOpen] = useState(false);
  const [allocationDraft, setAllocationDraft] = useState<AllocationDraft>({
    id: "",
    budgetKey: baseBudgetLines[0]?.id ?? "",
    activityKey: baseActivities[0]?.id ?? "",
    amountMnt: "",
    note: "",
  });
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planRecordType, setPlanRecordType] = useState<
    "activity" | "subactivity"
  >("activity");
  const [editingPlanKey, setEditingPlanKey] = useState<string | null>(null);
  const [editingPlanParentKey, setEditingPlanParentKey] = useState("");
  const [activityPlanDraft, setActivityPlanDraft] = useState<ActivityPlanDraft>(
    emptyActivityDraft,
  );
  const [subactivityPlanDraft, setSubactivityPlanDraft] =
    useState<SubactivityPlanDraft>(emptySubactivityDraft);
  const [planSaving, setPlanSaving] = useState(false);
  const [planDeleteOpen, setPlanDeleteOpen] = useState(false);
  const [budgetLineDialogOpen, setBudgetLineDialogOpen] = useState(false);
  const [editingBudgetKey, setEditingBudgetKey] = useState<string | null>(null);
  const [budgetLineDraft, setBudgetLineDraft] =
    useState<BudgetLineDraft>(emptyBudgetLineDraft);
  const [budgetLineSaving, setBudgetLineSaving] = useState(false);
  const [budgetLineDeleteOpen, setBudgetLineDeleteOpen] = useState(false);
  const [selectedBudgetKey, setSelectedBudgetKey] = useState<string | null>(null);

  const selected = useMemo(
    () => allActivities.find((item) => item.id === selectedId) ?? null,
    [allActivities, selectedId],
  );

  const selectableTargets = useMemo(() => {
    if (!selected) return [];
    return [
      targetForActivity(selected, updates),
      ...selected.subactivities.map(targetForSubactivity),
    ];
  }, [selected, updates]);

  const activeTarget = useMemo(
    () => selectableTargets.find((item) => item.key === editKey) ?? null,
    [editKey, selectableTargets],
  );

  const activeMainProgressAuto = Boolean(
    selected &&
      activeTarget?.kind === "activity" &&
      selected.subactivities.length,
  );

  const loadTarget = useCallback(
    (target: EditableTarget) => {
      const saved = updates[target.key];
      const calculatedMain =
        target.kind === "activity" &&
        Boolean(
          allActivities.find((activity) => activity.id === target.key)
            ?.subactivities.length,
        );
      setEditKey(target.key);
      setDraft({
        status: calculatedMain ? target.baseStatus : saved?.status ?? target.baseStatus,
        progress: calculatedMain
          ? target.baseProgress
          : saved?.progress ?? target.baseProgress,
        owner: saved ? saved.owner : target.baseOwner,
        note: saved?.note ?? target.baseNote,
      });
    },
    [allActivities, updates],
  );

  const openActivity = useCallback(
    (activity: Activity) => {
      setSelectedId(activity.id);
      loadTarget(targetForActivity(activity, updates));
    },
    [loadTarget, updates],
  );

  useEffect(() => {
    let active = true;
    setPlanState("loading");
    fetch(`/api/workplan?year=${selectedYear}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          activities?: Activity[];
          budgetLines?: BudgetLine[];
          years?: WorkplanYear[];
          error?: string;
        };
        if (!response.ok || !result.activities || !result.budgetLines) {
          throw new Error(result.error || "Workplan unavailable");
        }
        return result;
      })
      .then((result) => {
        if (!active) return;
        setAllActivities(result.activities ?? []);
        setAllBudgetLines(result.budgetLines ?? []);
        if (result.years) setWorkplanYears(result.years);
        setSelectedId(null);
        setPlanState("ready");
      })
      .catch(() => {
        if (!active) return;
        if (selectedYear === 2026) {
          setAllActivities(baseActivities);
          setAllBudgetLines(baseBudgetLines);
        } else {
          setAllActivities([]);
          setAllBudgetLines([]);
        }
        setPlanState("unavailable");
      });
    return () => {
      active = false;
    };
  }, [selectedYear]);

  useEffect(() => {
    let active = true;
    setAllocationState("loading");
    fetch(`/api/allocations?year=${selectedYear}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          allocations?: BudgetAllocation[];
          error?: string;
        };
        if (!response.ok || !result.allocations) {
          throw new Error(result.error || "Allocations unavailable");
        }
        return result.allocations;
      })
      .then((items) => {
        if (!active) return;
        setAllocations(items);
        setAllocationState("ready");
      })
      .catch(() => {
        if (!active) return;
        setAllocations([]);
        setAllocationState("unavailable");
      });
    return () => {
      active = false;
    };
  }, [selectedYear]);

  useEffect(() => {
    let active = true;
    fetch("/api/updates")
      .then(async (response) => {
        if (!response.ok) throw new Error("Update store unavailable");
        return (await response.json()) as { updates: UpdateRecord[] };
      })
      .then((payload) => {
        if (!active) return;
        setUpdates(
          Object.fromEntries(payload.updates.map((item) => [item.activityKey, item])),
        );
        setSyncState("ready");
      })
      .catch(() => {
        if (active) setSyncState("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/finance")
      .then(async (response) => {
        if (!response.ok) throw new Error("Finance store unavailable");
        return (await response.json()) as { entries: FinanceEntry[] };
      })
      .then((payload) => {
        if (!active) return;
        setFinanceEntries(payload.entries);
        setFinanceState("ready");
      })
      .catch(() => {
        if (active) setFinanceState("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/team")
      .then(async (response) => {
        if (!response.ok) throw new Error("Team store unavailable");
        return (await response.json()) as { members: TeamMember[] };
      })
      .then((payload) => {
        if (!active) return;
        setTeamMembers(payload.members);
        setTeamState("ready");
      })
      .catch(() => {
        if (active) setTeamState("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  const persistUpdate = useCallback(
    async (payload: {
      activityKey: string;
      status: StatusKey;
      progress: number;
      owner?: string;
      note?: string;
      supportNeeded?: string;
    }) => {
      const response = await fetch("/api/updates", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        update?: UpdateRecord;
        error?: string;
      };
      if (!response.ok || !result.update) {
        throw new Error(result.error || "The update could not be saved.");
      }
      setUpdates((current) => ({
        ...current,
        [result.update!.activityKey]: result.update!,
      }));
      setSyncState("ready");
      return result.update;
    },
    [],
  );

  async function saveDraft() {
    if (!activeTarget) return;
    const autoCalculatedMainProgress =
      activeTarget.kind === "activity" && Boolean(selected?.subactivities.length);
    const progressToSave =
      autoCalculatedMainProgress && selected
        ? deriveActivityProgress(selected, updates)
        : draft.progress;
    setSaving(true);
    try {
      const update = await persistUpdate({
        activityKey: activeTarget.key,
        status: draft.status,
        progress: progressToSave,
        owner: draft.owner,
        note: draft.note,
        supportNeeded: updates[activeTarget.key]?.supportNeeded ?? "",
      });
      toast.success("Workplan update saved", {
        description: `${statusMeta[update.status].label} · ${update.progress}%`,
      });
    } catch (error) {
      setSyncState("unavailable");
      toast.error(
        error instanceof Error ? error.message : "The update could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveOwnerForTarget(
    target: { key: string; status: StatusKey; progress: number; note: string },
    owner: string,
  ) {
    try {
      await persistUpdate({
        activityKey: target.key,
        status: target.status,
        progress: target.progress,
        owner,
        note: target.note,
        supportNeeded: updates[target.key]?.supportNeeded ?? "",
      });
      if (editKey === target.key) {
        setDraft((current) => ({ ...current, owner }));
      }
      toast.success(owner ? `Owner changed to ${owner}` : "Owner cleared");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The owner could not be changed.",
      );
    }
  }

  const openFinanceDialog = useCallback(
    (budgetKey: string, activityKey: string) => {
      setFinanceDraft({
        budgetKey,
        activityKey,
        entryType: "commitment",
        amountMnt: "",
        entryDate: todayForInput(),
        description: "",
        vendor: "",
      });
      setFinanceDialogOpen(true);
    },
    [],
  );

  const persistFinanceEntry = useCallback(
    async (payload: {
      budgetKey: string;
      activityKey: string;
      entryType: FinanceDraft["entryType"];
      amountMnt: number;
      entryDate: string;
      description?: string;
      vendor?: string;
    }) => {
      const response = await fetch("/api/finance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        entry?: FinanceEntry;
        error?: string;
      };
      if (!response.ok || !result.entry) {
        throw new Error(result.error || "The finance entry could not be saved.");
      }
      setFinanceEntries((current) => [result.entry!, ...current]);
      setFinanceState("ready");
      return result.entry;
    },
    [],
  );

  async function saveFinanceEntry() {
    const amountMnt = Number(financeDraft.amountMnt.replace(/[,\s]/g, ""));
    if (!Number.isSafeInteger(amountMnt) || amountMnt <= 0) {
      toast.error("Enter a whole tugrik amount greater than zero.");
      return;
    }
    setFinanceSaving(true);
    try {
      const entry = await persistFinanceEntry({
        budgetKey: financeDraft.budgetKey,
        activityKey: financeDraft.activityKey,
        entryType: financeDraft.entryType,
        amountMnt,
        entryDate: financeDraft.entryDate,
        description: financeDraft.description,
        vendor: financeDraft.vendor,
      });
      setFinanceDialogOpen(false);
      toast.success(
        financeDraft.entryType === "commitment"
          ? "Commitment added"
          : "Expenditure added",
        { description: formatMnt(entry.amountMnt) },
      );
    } catch (error) {
      setFinanceState("unavailable");
      toast.error(
        error instanceof Error
          ? error.message
          : "The finance entry could not be saved.",
      );
    } finally {
      setFinanceSaving(false);
    }
  }

  function applyPlanResult(result: {
    activities?: Activity[];
    budgetLines?: BudgetLine[];
    years?: WorkplanYear[];
  }) {
    if (result.activities) setAllActivities(result.activities);
    if (result.budgetLines) setAllBudgetLines(result.budgetLines);
    if (result.years) setWorkplanYears(result.years);
    setPlanState("ready");
  }

  function openYearDialog() {
    const latest = Math.max(...workplanYears.map((item) => item.year), selectedYear);
    setNewYear(latest + 1);
    setCopyCurrentYear(true);
    setYearDialogOpen(true);
  }

  async function createWorkplanYear() {
    if (!Number.isInteger(newYear) || newYear <= selectedYear || newYear > 2100) {
      toast.error("Choose a future year after the currently selected workplan.");
      return;
    }
    setYearSaving(true);
    try {
      const response = await fetch("/api/workplan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_year",
          fromYear: selectedYear,
          toYear: newYear,
          copyCurrent: copyCurrentYear,
          title: `${newYear} workplan`,
        }),
      });
      const result = (await response.json()) as {
        activities?: Activity[];
        budgetLines?: BudgetLine[];
        years?: WorkplanYear[];
        error?: string;
      };
      if (!response.ok || !result.activities || !result.budgetLines) {
        throw new Error(result.error || "The new workplan could not be created.");
      }
      applyPlanResult(result);
      setSelectedYear(newYear);
      setYearDialogOpen(false);
      setActiveView("workplan");
      toast.success(`${newYear} workplan created`, {
        description: copyCurrentYear
          ? "Activities and budget lines were copied as a new draft."
          : "A blank draft is ready for planning.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The new workplan could not be created.",
      );
    } finally {
      setYearSaving(false);
    }
  }

  function openAddActivity() {
    setPlanRecordType("activity");
    setEditingPlanKey(null);
    setEditingPlanParentKey("");
    setActivityPlanDraft({
      ...emptyActivityDraft,
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
    });
    setPlanDialogOpen(true);
  }

  function openEditActivity(activity: Activity) {
    setPlanRecordType("activity");
    setEditingPlanKey(activity.id);
    setEditingPlanParentKey("");
    setActivityPlanDraft({
      code: activity.code,
      title: activity.title,
      titleMn: activity.titleMn,
      section: activity.section,
      goal: activity.goal,
      priority: activity.priority,
      workstream: activity.workstream,
      startDate: activity.startDate,
      endDate: activity.endDate,
      lead: activity.lead,
      technicalLead: activity.technicalLead,
      support: activity.support,
      partners: activity.partners,
      actionPlan: activity.actionPlan,
      description: activity.description,
      baseline: activity.baseline,
      target: activity.target,
    });
    setPlanDialogOpen(true);
  }

  function openAddSubactivity(activity: Activity) {
    setPlanRecordType("subactivity");
    setEditingPlanKey(null);
    setEditingPlanParentKey(activity.id);
    setSubactivityPlanDraft({
      ...emptySubactivityDraft,
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
    });
    setPlanDialogOpen(true);
  }

  function openEditSubactivity(activity: Activity, subactivity: Subactivity) {
    setPlanRecordType("subactivity");
    setEditingPlanKey(subactivity.id);
    setEditingPlanParentKey(activity.id);
    setSubactivityPlanDraft({
      title: subactivity.title,
      owner: subactivity.owner,
      executor: subactivity.executor,
      startDate: subactivity.startDate,
      endDate: subactivity.endDate,
      status: subactivity.status as StatusKey,
      progressSummary: subactivity.progressSummary,
    });
    setPlanDialogOpen(true);
  }

  async function savePlanRecord() {
    const isActivity = planRecordType === "activity";
    const title = isActivity
      ? activityPlanDraft.title.trim()
      : subactivityPlanDraft.title.trim();
    if (!title) {
      toast.error("Enter a title for this workplan item.");
      return;
    }
    if (isActivity && !activityPlanDraft.code.trim()) {
      toast.error("Enter an activity code.");
      return;
    }
    const key =
      editingPlanKey ??
      `${selectedYear}:${isActivity ? "activity" : "subactivity"}-${crypto.randomUUID()}`;
    const currentActivity = isActivity
      ? allActivities.find((item) => item.id === editingPlanKey)
      : null;
    const currentSubactivity = !isActivity
      ? allActivities
          .flatMap((item) => item.subactivities)
          .find((item) => item.id === editingPlanKey)
      : null;
    const record = isActivity
      ? {
          ...(currentActivity ?? {}),
          ...activityPlanDraft,
          id: key,
          uid: currentActivity?.uid ?? key,
          level: currentActivity?.level ?? "Main Activity",
          parentUid: currentActivity?.parentUid ?? "",
          planCode: activityPlanDraft.code,
          rawStatus: currentActivity?.rawStatus ?? "Not started",
          budgetMntMillion: currentActivity?.budgetMntMillion ?? "",
          sourceRow: currentActivity?.sourceRow ?? 0,
          status: currentActivity?.status ?? "not_started",
          progressSummary: currentActivity?.progressSummary ?? "",
          ministrySupport: currentActivity?.ministrySupport ?? "",
          progressStartDate: activityPlanDraft.startDate,
          progressEndDate: activityPlanDraft.endDate,
          progress: currentActivity?.progress ?? 0,
          objective: currentActivity?.objective ?? {
            id: "",
            code: activityPlanDraft.code.split(".").slice(0, 3).join("."),
            title: "",
          },
          strategicArea: currentActivity?.strategicArea ?? {
            id: "",
            code: "",
            title: "",
          },
          portfolio: currentActivity?.portfolio ?? {
            id: "",
            code: activityPlanDraft.section,
            title: "",
          },
          subactivities: undefined,
        }
      : {
          ...(currentSubactivity ?? {}),
          ...subactivityPlanDraft,
          id: key,
          activityId: editingPlanParentKey,
          rawStatus: currentSubactivity?.rawStatus ?? "Not started",
          sourceRow: currentSubactivity?.sourceRow ?? 0,
        };
    setPlanSaving(true);
    try {
      const response = await fetch("/api/workplan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          recordType: planRecordType,
          recordKey: key,
          parentKey: isActivity ? "" : editingPlanParentKey,
          record,
        }),
      });
      const result = (await response.json()) as {
        activities?: Activity[];
        budgetLines?: BudgetLine[];
        error?: string;
      };
      if (!response.ok || !result.activities || !result.budgetLines) {
        throw new Error(result.error || "The workplan item could not be saved.");
      }
      applyPlanResult(result);
      setPlanDialogOpen(false);
      if (isActivity) setSelectedId(key);
      toast.success(editingPlanKey ? "Workplan item updated" : "Workplan item added");
    } catch (error) {
      setPlanState("unavailable");
      toast.error(
        error instanceof Error ? error.message : "The workplan item could not be saved.",
      );
    } finally {
      setPlanSaving(false);
    }
  }

  async function removePlanRecord() {
    if (!editingPlanKey) return;
    setPlanSaving(true);
    try {
      const response = await fetch("/api/workplan", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          recordType: planRecordType,
          recordKey: editingPlanKey,
          parentKey: editingPlanParentKey,
        }),
      });
      const result = (await response.json()) as {
        activities?: Activity[];
        budgetLines?: BudgetLine[];
        error?: string;
      };
      if (!response.ok || !result.activities || !result.budgetLines) {
        throw new Error(result.error || "The workplan item could not be removed.");
      }
      applyPlanResult(result);
      if (planRecordType === "activity") setSelectedId(null);
      setPlanDeleteOpen(false);
      setPlanDialogOpen(false);
      toast.success("Workplan item removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The workplan item could not be removed.",
      );
    } finally {
      setPlanSaving(false);
    }
  }

  function openAddBudgetLine() {
    setEditingBudgetKey(null);
    setBudgetLineDraft(emptyBudgetLineDraft);
    setBudgetLineDialogOpen(true);
  }

  function openEditBudgetLine(line: BudgetLine) {
    setEditingBudgetKey(line.id);
    setBudgetLineDraft({
      code: line.code,
      title: line.title,
      section: line.section,
      goal: line.goal,
      workstream: line.workstream,
      level: line.level,
      amountMnt: formatNumberInput(
        Math.round(Number(line.budgetMntMillion) * 1_000_000),
      ),
    });
    setBudgetLineDialogOpen(true);
  }

  async function saveBudgetLine() {
    const amountMnt = Number(budgetLineDraft.amountMnt.replace(/[,\s]/g, ""));
    if (!budgetLineDraft.code.trim() || !budgetLineDraft.title.trim()) {
      toast.error("Enter a budget code and title.");
      return;
    }
    if (!Number.isSafeInteger(amountMnt) || amountMnt < 0) {
      toast.error("Enter a valid whole tugrik budget amount.");
      return;
    }
    const key = editingBudgetKey ?? `${selectedYear}:budget-${crypto.randomUUID()}`;
    const current = allBudgetLines.find((item) => item.id === editingBudgetKey);
    const record = {
      ...(current ?? {}),
      id: key,
      sourceRow: current?.sourceRow ?? 0,
      code: budgetLineDraft.code,
      title: budgetLineDraft.title,
      section: budgetLineDraft.section,
      goal: budgetLineDraft.goal,
      workstream: budgetLineDraft.workstream,
      level: budgetLineDraft.level,
      budgetMntMillion: amountMnt / 1_000_000,
    };
    setBudgetLineSaving(true);
    try {
      const response = await fetch("/api/workplan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          recordType: "budget",
          recordKey: key,
          parentKey: "",
          record,
        }),
      });
      const result = (await response.json()) as {
        activities?: Activity[];
        budgetLines?: BudgetLine[];
        error?: string;
      };
      if (!response.ok || !result.activities || !result.budgetLines) {
        throw new Error(result.error || "The budget line could not be saved.");
      }
      applyPlanResult(result);
      setBudgetLineDialogOpen(false);
      toast.success(editingBudgetKey ? "Budget line updated" : "Budget line added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The budget line could not be saved.",
      );
    } finally {
      setBudgetLineSaving(false);
    }
  }

  async function removeBudgetLine() {
    if (!editingBudgetKey) return;
    setBudgetLineSaving(true);
    try {
      const response = await fetch("/api/workplan", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          recordType: "budget",
          recordKey: editingBudgetKey,
        }),
      });
      const result = (await response.json()) as {
        activities?: Activity[];
        budgetLines?: BudgetLine[];
        error?: string;
      };
      if (!response.ok || !result.activities || !result.budgetLines) {
        throw new Error(result.error || "The budget line could not be removed.");
      }
      applyPlanResult(result);
      setBudgetLineDeleteOpen(false);
      setBudgetLineDialogOpen(false);
      toast.success("Budget line removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The budget line could not be removed.",
      );
    } finally {
      setBudgetLineSaving(false);
    }
  }

  const allocationTargets = useMemo(() => {
    const line = allBudgetLines.find(
      (item) => item.id === allocationDraft.budgetKey,
    );
    return targetsForBudgetLine(line, allActivities);
  }, [allActivities, allBudgetLines, allocationDraft.budgetKey]);

  const allocationBudgetLine = useMemo(
    () =>
      allBudgetLines.find((item) => item.id === allocationDraft.budgetKey) ??
      null,
    [allBudgetLines, allocationDraft.budgetKey],
  );

  const financeBudgetLine = useMemo(
    () =>
      allBudgetLines.find((item) => item.id === financeDraft.budgetKey) ?? null,
    [allBudgetLines, financeDraft.budgetKey],
  );

  const financeTarget = useMemo(
    () =>
      targetsForBudgetLine(financeBudgetLine ?? undefined, allActivities).find(
        (item) => item.key === financeDraft.activityKey,
      ) ?? null,
    [allActivities, financeBudgetLine, financeDraft.activityKey],
  );

  function openAllocationDialog(
    budgetKey?: string,
    activityKey?: string,
    allocation?: BudgetAllocation,
  ) {
    const nextBudgetKey =
      allocation?.budgetKey ?? budgetKey ?? selectedBudgetKey ?? "";
    const scopedTargets = targetsForBudgetLine(
      allBudgetLines.find((item) => item.id === nextBudgetKey),
      allActivities,
    );
    setAllocationDraft({
      id: allocation?.id ?? "",
      budgetKey: nextBudgetKey,
      activityKey:
        allocation?.activityKey ?? activityKey ?? scopedTargets[0]?.key ?? "",
      amountMnt: allocation ? formatNumberInput(allocation.amountMnt) : "",
      note: allocation?.note ?? "",
    });
    setAllocationDialogOpen(true);
  }

  async function saveAllocation() {
    const amountMnt = Number(allocationDraft.amountMnt.replace(/[,\s]/g, ""));
    if (
      !allocationDraft.budgetKey ||
      !allocationDraft.activityKey ||
      !Number.isSafeInteger(amountMnt) ||
      amountMnt <= 0
    ) {
      toast.error("Choose a budget line, workplan item, and whole tugrik amount.");
      return;
    }
    setAllocationSaving(true);
    try {
      const response = await fetch("/api/allocations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planYear: selectedYear,
          budgetKey: allocationDraft.budgetKey,
          activityKey: allocationDraft.activityKey,
          amountMnt,
          note: allocationDraft.note,
        }),
      });
      const result = (await response.json()) as {
        allocation?: BudgetAllocation;
        error?: string;
      };
      if (!response.ok || !result.allocation) {
        throw new Error(result.error || "The allocation could not be saved.");
      }
      setAllocations((current) => [
        ...current.filter((item) => item.id !== result.allocation!.id),
        result.allocation!,
      ]);
      setAllocationState("ready");
      setAllocationDialogOpen(false);
      toast.success("Budget allocated", {
        description: formatMnt(result.allocation.amountMnt),
      });
    } catch (error) {
      setAllocationState("unavailable");
      toast.error(
        error instanceof Error ? error.message : "The allocation could not be saved.",
      );
    } finally {
      setAllocationSaving(false);
    }
  }

  async function removeAllocation() {
    if (!allocationDraft.id) return;
    setAllocationSaving(true);
    try {
      const response = await fetch("/api/allocations", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: allocationDraft.id }),
      });
      const result = (await response.json()) as {
        deletedId?: string;
        error?: string;
      };
      if (!response.ok || !result.deletedId) {
        throw new Error(result.error || "The allocation could not be removed.");
      }
      setAllocations((current) =>
        current.filter((item) => item.id !== result.deletedId),
      );
      setAllocationDeleteOpen(false);
      setAllocationDialogOpen(false);
      toast.success("Budget allocation removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The allocation could not be removed.",
      );
    } finally {
      setAllocationSaving(false);
    }
  }

  function openAddTeamMember() {
    setEditingTeamId(null);
    setTeamDraft({
      name: "",
      role: "",
      group: "PCU",
      aliasesText: "",
    });
    setTeamDialogOpen(true);
  }

  function openEditTeamMember(teamMember: TeamMember) {
    setEditingTeamId(teamMember.id);
    setTeamDraft({
      name: teamMember.name,
      role: teamMember.role,
      group: teamMember.group,
      aliasesText: teamMember.aliases.join(", "),
    });
    setTeamDialogOpen(true);
  }

  async function saveTeamMember() {
    const name = teamDraft.name.trim();
    if (!name) {
      toast.error("Enter the team member's name.");
      return;
    }
    const aliases = teamDraft.aliasesText
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    setTeamSaving(true);
    try {
      const response = await fetch("/api/team", {
        method: editingTeamId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingTeamId ?? undefined,
          name,
          role: teamDraft.role,
          group: teamDraft.group,
          aliases,
        }),
      });
      const result = (await response.json()) as {
        member?: TeamMember;
        error?: string;
      };
      if (!response.ok || !result.member) {
        throw new Error(result.error || "The team member could not be saved.");
      }
      setTeamMembers((current) =>
        [...current.filter((item) => item.id !== result.member!.id), result.member!].sort(
          (a, b) =>
            a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
        ),
      );
      setTeamState("ready");
      setTeamDialogOpen(false);
      toast.success(editingTeamId ? "Team member updated" : "Team member added");
    } catch (error) {
      setTeamState("unavailable");
      toast.error(
        error instanceof Error
          ? error.message
          : "The team member could not be saved.",
      );
    } finally {
      setTeamSaving(false);
    }
  }

  async function removeTeamMember() {
    if (!editingTeamId) return;
    setTeamSaving(true);
    try {
      const response = await fetch("/api/team", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingTeamId }),
      });
      const result = (await response.json()) as {
        deletedId?: string;
        clearedUpdates?: UpdateRecord[];
        error?: string;
      };
      if (!response.ok || !result.deletedId) {
        throw new Error(result.error || "The team member could not be removed.");
      }
      setTeamMembers((current) =>
        current.filter((item) => item.id !== result.deletedId),
      );
      if (result.clearedUpdates?.length) {
        setUpdates((current) => ({
          ...current,
          ...Object.fromEntries(
            result.clearedUpdates!.map((update) => [update.activityKey, update]),
          ),
        }));
      }
      if (member === result.deletedId) setMember("all");
      setTeamState("ready");
      setTeamDeleteOpen(false);
      setTeamDialogOpen(false);
      toast.success("Team member removed", {
        description: result.clearedUpdates?.length
          ? `${result.clearedUpdates.length} owned workplan items now need an owner.`
          : "No owned workplan items needed reassignment.",
      });
    } catch (error) {
      setTeamState("unavailable");
      toast.error(
        error instanceof Error
          ? error.message
          : "The team member could not be removed.",
      );
    } finally {
      setTeamSaving(false);
    }
  }

  useEffect(() => {
    const modelContext = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              title: string;
              description: string;
              inputSchema: object;
              annotations: {
                readOnlyHint: boolean;
                untrustedContentHint: boolean;
              };
              execute: (input: Record<string, unknown>) => unknown;
            },
            options?: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        modelContext.registerTool(
          {
            name: "search_workplan_activities",
            title: "Search workplan activities",
            description:
              `Find PFP ${selectedYear} workplan activities by code, title, workstream, lead, or status.`,
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string" },
                status: {
                  type: "string",
                  enum: Object.keys(statusMeta),
                },
              },
              additionalProperties: false,
            },
            annotations: {
              readOnlyHint: true,
              untrustedContentHint: false,
            },
            execute(input) {
              const search = String(input.query ?? "").toLocaleLowerCase();
              const wantedStatus = String(input.status ?? "");
              return {
                activities: allActivities
                  .filter((item) => {
                    const haystack = [
                      item.code,
                      item.title,
                      item.workstream,
                      item.technicalLead,
                    ]
                      .join(" ")
                      .toLocaleLowerCase();
                    return (
                      haystack.includes(search) &&
                      (!wantedStatus || item.status === wantedStatus)
                    );
                  })
                  .slice(0, 25)
                  .map((item) => ({
                    id: item.id,
                    code: item.code,
                    title: item.title,
                    status: item.status,
                    progress: item.progress,
                  })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => undefined);
      void Promise.resolve(
        modelContext.registerTool(
          {
            name: "update_workplan_progress",
            title: "Update workplan progress",
            description:
              "Save a status and progress update for an existing activity or sub-activity key.",
            inputSchema: {
              type: "object",
              properties: {
                activityKey: { type: "string" },
                status: {
                  type: "string",
                  enum: Object.keys(statusMeta),
                },
                progress: {
                  type: "integer",
                  minimum: 0,
                  maximum: 100,
                },
                owner: { type: "string" },
                note: { type: "string" },
              },
              required: ["activityKey", "status", "progress"],
              additionalProperties: false,
            },
            annotations: {
              readOnlyHint: false,
              untrustedContentHint: false,
            },
            async execute(input) {
              const activityKey = String(input.activityKey ?? "");
              const status = String(input.status ?? "") as StatusKey;
              const progress = Number(input.progress);
              const validKey =
                allActivities.some((item) => item.id === activityKey) ||
                allActivities.some((item) =>
                  item.subactivities.some((sub) => sub.id === activityKey),
                );
              if (
                !validKey ||
                !(status in statusMeta) ||
                !Number.isInteger(progress) ||
                progress < 0 ||
                progress > 100
              ) {
                throw new Error("Invalid workplan update.");
              }
              return persistUpdate({
                activityKey,
                status,
                progress,
                owner: String(input.owner ?? ""),
                note: String(input.note ?? ""),
                supportNeeded: updates[activityKey]?.supportNeeded ?? "",
              });
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => undefined);
      void Promise.resolve(
        modelContext.registerTool(
          {
            name: "add_finance_entry",
            title: "Add finance entry",
            description:
              `Record a commitment or expenditure against a PFP ${selectedYear} budget line.`,
            inputSchema: {
              type: "object",
              properties: {
                budgetKey: {
                  type: "string",
                  enum: allBudgetLines.map((line) => line.id),
                },
                activityKey: { type: "string" },
                entryType: {
                  type: "string",
                  enum: ["commitment", "expenditure"],
                },
                amountMnt: {
                  type: "integer",
                  exclusiveMinimum: 0,
                  description: "Whole tugrik amount, for example 450000000.",
                },
                entryDate: { type: "string", format: "date" },
                description: { type: "string" },
                vendor: { type: "string" },
              },
              required: [
                "budgetKey",
                "activityKey",
                "entryType",
                "amountMnt",
                "entryDate",
              ],
              additionalProperties: false,
            },
            annotations: {
              readOnlyHint: false,
              untrustedContentHint: false,
            },
            async execute(input) {
              const budgetKey = String(input.budgetKey ?? "");
              const activityKey = String(input.activityKey ?? "");
              const entryType = String(input.entryType ?? "") as FinanceDraft["entryType"];
              const amountMnt = Number(input.amountMnt);
              const entryDate = String(input.entryDate ?? "");
              if (
                !allBudgetLines.some((line) => line.id === budgetKey) ||
                !targetsForBudgetLine(
                  allBudgetLines.find((line) => line.id === budgetKey),
                  allActivities,
                ).some((target) => target.key === activityKey) ||
                !["commitment", "expenditure"].includes(entryType) ||
                !Number.isSafeInteger(amountMnt) ||
                amountMnt <= 0 ||
                !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)
              ) {
                throw new Error("Invalid finance entry.");
              }
              return persistFinanceEntry({
                budgetKey,
                activityKey,
                entryType,
                amountMnt,
                entryDate,
                description: String(input.description ?? ""),
                vendor: String(input.vendor ?? ""),
              });
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => undefined);
    } catch {
      // WebMCP support is optional; the visible interface remains fully usable.
    }
    return () => lifecycle.abort();
  }, [allActivities, allBudgetLines, persistFinanceEntry, persistUpdate, selectedYear]);

  const workstreams = useMemo(
    () =>
      Array.from(
        new Set(allActivities.map((item) => item.workstream).filter(Boolean)),
      ).sort(),
    [allActivities],
  );

  const goals = useMemo(
    () =>
      Array.from(new Set(allActivities.map((item) => item.goal).filter(Boolean))).sort(),
    [allActivities],
  );

  const memberActivities = useMemo(
    () =>
      allActivities.filter((item) =>
        isAssignedToMember(item, member, updates, teamMembers),
      ),
    [allActivities, member, teamMembers, updates],
  );

  const memberBudgetKeys = useMemo(
    () =>
      member === "all"
        ? null
        : budgetKeysForActivities(memberActivities, allBudgetLines),
    [allBudgetLines, member, memberActivities],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allActivities.filter((item) => {
      const currentStatus = deriveActivityStatus(item, updates);
      const matchesSection = section === "all" || item.section === section;
      const matchesGoal = goal === "all" || item.goal === goal;
      const matchesStatus = status === "all" || currentStatus === status;
      const matchesWorkstream =
        workstream === "all" || item.workstream === workstream;
      const matchesMember = isAssignedToMember(
        item,
        member,
        updates,
        teamMembers,
      );
      const haystack = [
        item.code,
        item.title,
        item.titleMn,
        item.workstream,
        item.technicalLead,
        item.lead,
        activityAssignmentText(item, updates),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        matchesSection &&
        matchesGoal &&
        matchesStatus &&
        matchesWorkstream &&
        matchesMember &&
        haystack.includes(normalized)
      );
    });
  }, [
    allActivities,
    goal,
    member,
    query,
    section,
    status,
    teamMembers,
    workstream,
    updates,
  ]);

  const filteredBudgetLines = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allBudgetLines.filter((line) => {
      const matchesSection = section === "all" || line.section === section;
      const matchesGoal = goal === "all" || line.goal === goal;
      const matchesMember =
        member === "all" || Boolean(memberBudgetKeys?.has(line.id));
      const haystack = [line.code, line.title, line.workstream, line.goal]
        .join(" ")
        .toLocaleLowerCase();
      return (
        matchesSection &&
        matchesGoal &&
        matchesMember &&
        haystack.includes(normalized)
      );
    });
  }, [allBudgetLines, goal, member, memberBudgetKeys, query, section]);

  const financeByBudgetKey = useMemo(() => {
    const totals = new Map<string, { commitment: number; expenditure: number }>();
    for (const entry of financeEntries) {
      const current = totals.get(entry.budgetKey) ?? {
        commitment: 0,
        expenditure: 0,
      };
      current[entry.entryType] += entry.amountMnt;
      totals.set(entry.budgetKey, current);
    }
    return totals;
  }, [financeEntries]);

  const financeByActivityKey = useMemo(() => {
    const totals = new Map<string, { commitment: number; expenditure: number }>();
    for (const entry of financeEntries) {
      if (!entry.activityKey) continue;
      const current = totals.get(entry.activityKey) ?? {
        commitment: 0,
        expenditure: 0,
      };
      current[entry.entryType] += entry.amountMnt;
      totals.set(entry.activityKey, current);
    }
    return totals;
  }, [financeEntries]);

  const allocationByBudgetKey = useMemo(() => {
    const totals = new Map<string, number>();
    for (const allocation of allocations) {
      totals.set(
        allocation.budgetKey,
        (totals.get(allocation.budgetKey) ?? 0) + allocation.amountMnt,
      );
    }
    return totals;
  }, [allocations]);

  const allocationByActivityKey = useMemo(() => {
    const totals = new Map<string, number>();
    for (const allocation of allocations) {
      totals.set(
        allocation.activityKey,
        (totals.get(allocation.activityKey) ?? 0) + allocation.amountMnt,
      );
    }
    return totals;
  }, [allocations]);

  const selectedBudgetLine = useMemo(
    () => allBudgetLines.find((line) => line.id === selectedBudgetKey) ?? null,
    [allBudgetLines, selectedBudgetKey],
  );

  const selectedBudgetTargets = useMemo(
    () => targetsForBudgetLine(selectedBudgetLine ?? undefined, allActivities),
    [allActivities, selectedBudgetLine],
  );

  const financeStats = useMemo(() => {
    return summarizeFinance(filteredBudgetLines, financeEntries);
  }, [filteredBudgetLines, financeEntries]);

  const visibleAllocations = useMemo(() => {
    const keys = new Set(filteredBudgetLines.map((line) => line.id));
    return allocations.filter((allocation) => keys.has(allocation.budgetKey));
  }, [allocations, filteredBudgetLines]);

  const stats = useMemo(() => {
    const allSubs = filtered.flatMap((item) => item.subactivities);
    const completed = allSubs.filter(
      (item) =>
        recordStatus(item.id, item.status as StatusKey, updates) === "completed",
    ).length;
    const attention = allSubs.filter((item) => {
      const current = recordStatus(item.id, item.status as StatusKey, updates);
      return current === "delayed" || current === "on_hold";
    }).length;
    const overall = Math.round(
      filtered.reduce(
        (total, item) => total + deriveActivityProgress(item, updates),
        0,
      ) / Math.max(filtered.length, 1),
    );
    return { completed, attention, overall };
  }, [filtered, updates]);

  const dashboardActivities = useMemo(
    () =>
      allActivities.filter(
        (item) =>
          (section === "all" || item.section === section) &&
          (goal === "all" || item.goal === goal) &&
          isAssignedToMember(item, member, updates, teamMembers),
      ),
    [allActivities, goal, member, section, teamMembers, updates],
  );

  const dashboardBudgetLines = useMemo(
    () =>
      allBudgetLines.filter(
        (line) =>
          (section === "all" || line.section === section) &&
          (goal === "all" || line.goal === goal) &&
          (member === "all" || Boolean(memberBudgetKeys?.has(line.id))),
      ),
    [allBudgetLines, goal, member, memberBudgetKeys, section],
  );

  const dashboardFinance = useMemo(
    () => summarizeFinance(dashboardBudgetLines, financeEntries),
    [dashboardBudgetLines, financeEntries],
  );

  const deliveryIndicators = useMemo(() => {
    const completed = dashboardActivities.filter(
      (item) => deriveActivityStatus(item, updates) === "completed",
    ).length;
    const atRisk = dashboardActivities.filter((item) =>
      ["delayed", "on_hold"].includes(deriveActivityStatus(item, updates)),
    ).length;
    const reported = dashboardActivities.filter(
      (item) => deriveActivityStatus(item, updates) !== "not_reported",
    ).length;
    const reportingDateValue =
      workplanYears.find((item) => item.year === selectedYear)?.reportingDate ||
      `${selectedYear}-12-31`;
    const reportingDate = new Date(`${reportingDateValue}T00:00:00Z`);
    const overdue = dashboardActivities.filter((item) => {
      if (!item.endDate || deriveActivityStatus(item, updates) === "completed") {
        return false;
      }
      return new Date(`${item.endDate}T00:00:00Z`) < reportingDate;
    }).length;
    return {
      activityProgress: averageActivityProgress(dashboardActivities, updates),
      completionPercent: dashboardActivities.length
        ? Math.round((completed / dashboardActivities.length) * 100)
        : 0,
      reportingPercent: dashboardActivities.length
        ? Math.round((reported / dashboardActivities.length) * 100)
        : 0,
      completed,
      atRisk,
      overdue,
    };
  }, [dashboardActivities, selectedYear, updates, workplanYears]);

  const overallStatusSummary = useMemo(() => {
    const counts = Object.fromEntries(
      Object.keys(statusMeta).map((key) => [key, 0]),
    ) as Record<StatusKey, number>;
    for (const activity of dashboardActivities) {
      counts[deriveActivityStatus(activity, updates)] += 1;
    }
    const total = dashboardActivities.length;
    let cursor = 0;
    const segments = (Object.keys(statusMeta) as StatusKey[]).flatMap((key) => {
      const start = cursor;
      cursor += total ? (counts[key] / total) * 100 : 0;
      return counts[key]
        ? [`${statusChartColors[key]} ${start}% ${cursor}%`]
        : [];
    });
    return {
      counts,
      total,
      background: total
        ? `conic-gradient(${segments.join(", ")})`
        : "conic-gradient(#e1e6e2 0 100%)",
    };
  }, [dashboardActivities, updates]);

  const goalRows = useMemo(() => {
    const orderedGoals = [...goals].sort((a, b) => {
      if (a === "All goals") return 1;
      if (b === "All goals") return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
    const visibleGoals = goal === "all" ? orderedGoals : [goal];
    return visibleGoals.map((goalValue) => {
      const activities = allActivities.filter(
        (item) =>
          item.goal === goalValue &&
          (section === "all" || item.section === section) &&
          isAssignedToMember(item, member, updates, teamMembers),
      );
      const activityBudgetKeys =
        member === "all"
          ? null
          : budgetKeysForActivities(activities, allBudgetLines);
      const lines = allBudgetLines.filter(
        (line) =>
          line.goal === goalValue &&
          (section === "all" || line.section === section) &&
          (member === "all" || Boolean(activityBudgetKeys?.has(line.id))),
      );
      const finance = summarizeFinance(lines, financeEntries);
      const completed = activities.filter(
        (item) => deriveActivityStatus(item, updates) === "completed",
      ).length;
      const atRisk = activities.filter((item) =>
        ["delayed", "on_hold"].includes(deriveActivityStatus(item, updates)),
      ).length;
      return {
        goal: goalValue,
        activities: activities.length,
        completed,
        atRisk,
        progress: averageActivityProgress(activities, updates),
        ...finance,
      };
    });
  }, [
    allActivities,
    allBudgetLines,
    financeEntries,
    goal,
    goals,
    member,
    section,
    teamMembers,
    updates,
  ]);

  const teamSummaries = useMemo(
    () =>
      teamMembers.map((teamMember) => {
        const activities = allActivities.filter(
          (item) =>
            (section === "all" || item.section === section) &&
            (goal === "all" || item.goal === goal) &&
            isAssignedToMember(item, teamMember.id, updates, teamMembers),
        );
        const budgetKeys = budgetKeysForActivities(activities, allBudgetLines);
        const lines = allBudgetLines.filter(
          (line) =>
            (section === "all" || line.section === section) &&
            (goal === "all" || line.goal === goal) &&
            budgetKeys.has(line.id),
        );
        const finance = summarizeFinance(lines, financeEntries);
        return {
          ...teamMember,
          activityCount: activities.length,
          progress: averageActivityProgress(activities, updates),
          ...finance,
        };
      }),
    [
      allActivities,
      allBudgetLines,
      financeEntries,
      goal,
      section,
      teamMembers,
      updates,
    ],
  );

  const currentYearMeta =
    workplanYears.find((item) => item.year === selectedYear) ?? workplanYears[0];
  const currentReportingDate =
    currentYearMeta?.reportingDate || `${selectedYear}-12-31`;
  const selectedAllocatedMnt = selected
    ? (allocationByActivityKey.get(selected.id) ?? 0) +
      selected.subactivities.reduce(
        (total, item) => total + (allocationByActivityKey.get(item.id) ?? 0),
        0,
      )
    : 0;

  return (
    <main className="min-h-screen bg-[#f3f6f1] text-[#14241b]">
      <Toaster position="top-right" richColors />
      <header className="border-b border-[#d7ded5] bg-[#0c3b2d] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbf081] text-sm font-black tracking-tight text-[#153829]">
              PFP
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">Eternal Mongolia</p>
              <p className="text-xs text-emerald-100/70">Programme workplan</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm">
              <CalendarDays className="h-4 w-4 text-[#dbf081]" />
              Reporting date: {formatDate(currentReportingDate)}
            </div>
            <div
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs"
              title={
                syncState === "ready"
                  ? "Updates are saved in the shared workplan store"
                  : "Source data is available; saved updates are temporarily unavailable"
              }
            >
              {syncState === "ready" ? (
                <Cloud className="h-3.5 w-3.5 text-[#dbf081]" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 text-amber-200" />
              )}
              {syncState === "loading"
                ? "Connecting"
                : syncState === "ready"
                  ? "Shared updates"
                  : "Source view"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5d7467]">
              {selectedYear} workplan · {currentYearMeta?.status || "draft"}
            </p>
            <h1 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              Progress monitoring
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <NativeSelect
              value={String(selectedYear)}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="h-10 min-w-[155px] border-[#ced8cf] bg-white font-bold"
              aria-label="Select workplan year"
            >
              {workplanYears.map((item) => (
                <NativeSelectOption key={item.year} value={String(item.year)}>
                  {item.year} workplan
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 border-[#bfcbbf] bg-white"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Planning
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={openYearDialog}>
                  <CopyPlus className="h-4 w-4" />
                  Create next year&apos;s workplan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveView("workplan")}>
                  <PencilLine className="h-4 w-4" />
                  Edit current workplan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-2 px-1 text-sm text-[#5d7467]">
              <span
                className={`h-2 w-2 rounded-full ${planState === "ready" ? "bg-emerald-600" : "bg-amber-500"}`}
              />
              {planState === "loading"
                ? "Loading workplan"
                : planState === "ready"
                  ? `${allActivities.length} activities`
                  : "Source view"}
            </div>
          </div>
        </section>

        <Tabs
          value={activeView}
          className="gap-5"
          onValueChange={(value) => {
            setActiveView(value);
            setQuery("");
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-[#d7ded5] bg-white p-1 sm:flex sm:w-auto">
            <TabsTrigger
              value="dashboard"
              className="h-10 min-w-36 px-5 text-sm font-bold data-[state=active]:bg-[#0c3b2d]! data-[state=active]:text-white!"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="workplan"
              className="h-10 min-w-36 px-5 text-sm font-bold data-[state=active]:bg-[#0c3b2d]! data-[state=active]:text-white!"
            >
              <ListChecks className="h-4 w-4" />
              Workplan
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="h-10 min-w-36 px-5 text-sm font-bold data-[state=active]:bg-[#0c3b2d]! data-[state=active]:text-white!"
            >
              <Banknote className="h-4 w-4" />
              Finance
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="h-10 min-w-36 px-5 text-sm font-bold data-[state=active]:bg-[#0c3b2d]! data-[state=active]:text-white!"
            >
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between lg:p-5">
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
                  <NativeSelectOption value="all">Sections A and B</NativeSelectOption>
                  <NativeSelectOption value="A">Section A</NativeSelectOption>
                  <NativeSelectOption value="B">Section B</NativeSelectOption>
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
                      {value === "All goals" ? "Cross-goal" : value}
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
                      {item.group === "PCU" ? "PCU" : "Workplan"} · {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  accent: "bg-white",
                },
                {
                  label: "Expenditure",
                  value: formatMnt(dashboardFinance.expenditureMnt),
                  detail: `${dashboardFinance.spentPercent}% of budget spent`,
                  icon: ReceiptText,
                  accent: "bg-white",
                },
                {
                  label: "Remaining",
                  value: formatMnt(dashboardFinance.remainingMnt),
                  detail: "Budget less expenditure",
                  icon: Banknote,
                  accent:
                    dashboardFinance.remainingMnt < 0
                      ? "bg-[#fff0f1] text-[#8f1d2c]"
                      : "bg-[#edf6e8]",
                },
              ].map((metric) => (
                <article
                  key={metric.label}
                  className={`rounded-2xl border border-[#d7ded5] p-5 shadow-[0_6px_22px_rgba(20,36,27,0.04)] ${metric.accent}`}
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
                  <p className="text-3xl font-black tracking-[-0.03em]">
                    {metric.value}
                  </p>
                  <p
                    className={`mt-1 text-sm ${metric.accent.includes("text-white") ? "text-emerald-50/70" : "text-[#718178]"}`}
                  >
                    {metric.detail}
                  </p>
                </article>
              ))}
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
                  className="rounded-2xl border border-[#d7ded5] bg-white p-4"
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

            <section className="grid gap-5 rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_12px_32px_rgba(20,36,27,0.05)] lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
              <div>
                <h2 className="text-xl font-black">Overall activity status</h2>
                <p className="mt-1 text-sm leading-6 text-[#718178]">
                  Status distribution for the selected Section A, Section B, goal, and owner filters.
                </p>
                <div className="mt-5 flex justify-center">
                  <div
                    className="relative grid h-48 w-48 place-items-center rounded-full"
                    style={{ background: overallStatusSummary.background }}
                    role="img"
                    aria-label={`Status chart for ${overallStatusSummary.total} activities`}
                  >
                    <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
                      <div>
                        <p className="text-3xl font-black">{overallStatusSummary.total}</p>
                        <p className="text-xs font-semibold text-[#718178]">activities</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(statusMeta) as StatusKey[]).map((key) => {
                  const count = overallStatusSummary.counts[key];
                  const percent = overallStatusSummary.total
                    ? Math.round((count / overallStatusSummary.total) * 100)
                    : 0;
                  return (
                    <div key={key} className="rounded-xl border border-[#e1e7df] bg-[#f8faf7] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: statusChartColors[key] }}
                          />
                          <span className="text-sm font-bold">{statusMeta[key].label}</span>
                        </div>
                        <span className="text-lg font-black">{count}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e3e8e4]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: statusChartColors[key],
                          }}
                        />
                      </div>
                      <p className="mt-1 text-right text-xs font-semibold text-[#718178]">{percent}%</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
              <div className="border-b border-[#e2e7e0] px-5 py-4">
                <h2 className="text-xl font-black">Progress and finance by goal</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  Activity progress is paired with budget, commitments, expenditure, and remaining balance.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[1050px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[235px] pl-5">Goal</TableHead>
                      <TableHead className="w-[210px]">Activity progress</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Commitment</TableHead>
                      <TableHead className="text-right">Expenditure</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="pr-5 text-right">At risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goalRows.map((row) => (
                      <TableRow key={row.goal}>
                        <TableCell className="pl-5">
                          <p className="font-black">
                            {row.goal === "All goals" ? "Cross-goal" : row.goal}
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
                        <TableCell className="pr-5 text-right">
                          <span
                            className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-black ${row.atRisk ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}
                          >
                            {row.atRisk}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="workplan" className="space-y-6">

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Overall progress",
              value: `${stats.overall}%`,
              detail: "Based on reported status and saved updates",
              icon: Target,
              accent: "bg-[#0c3b2d] text-white",
            },
            {
              label: "Main activities",
              value: filtered.length,
              detail: `of ${allActivities.length} activities in scope`,
              icon: Clock3,
              accent: "bg-white",
            },
            {
              label: "Sub-activities completed",
              value: stats.completed,
              detail: `of ${filtered.reduce((total, item) => total + item.subactivities.length, 0)} in scope`,
              icon: CircleCheck,
              accent: "bg-white",
            },
            {
              label: "Need attention",
              value: stats.attention,
              detail: "Sub-activities delayed or on hold",
              icon: AlertTriangle,
              accent: "bg-[#fff7e7]",
            },
          ].map((metric) => (
            <article
              key={metric.label}
              className={`rounded-2xl border border-[#d7ded5] p-5 shadow-[0_6px_22px_rgba(20,36,27,0.04)] ${metric.accent}`}
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
              <p className="text-3xl font-black tracking-[-0.03em]">
                {metric.value}
              </p>
              <p
                className={`mt-1 text-sm ${metric.accent.includes("text-white") ? "text-emerald-50/70" : "text-[#718178]"}`}
              >
                {metric.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
          <div className="border-b border-[#e2e7e0] p-4 lg:flex lg:items-center lg:justify-between lg:p-5">
            <div className="mb-4 lg:mb-0">
              <h2 className="text-xl font-bold">Workplan activities</h2>
              <p className="text-sm text-[#718178]">
                {filtered.length} of {allActivities.length} activities
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-row">
              <label className="relative block min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718178]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-10 border-[#ced8cf] bg-[#f8faf7] pl-9 text-base md:text-sm"
                  placeholder="Search code, activity or lead"
                  aria-label="Search workplan activities"
                />
              </label>
              <NativeSelect
                value={section}
                onChange={(event) => setSection(event.target.value)}
                className="h-10 min-w-[145px] border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter by workplan section"
              >
                <NativeSelectOption value="all">Sections A and B</NativeSelectOption>
                <NativeSelectOption value="A">Section A</NativeSelectOption>
                <NativeSelectOption value="B">Section B</NativeSelectOption>
              </NativeSelect>
              <NativeSelect
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="h-10 min-w-[145px] border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter by goal"
              >
                <NativeSelectOption value="all">Every goal</NativeSelectOption>
                {goals.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {value === "All goals" ? "Cross-goal" : value}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 min-w-[150px] border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter by status"
              >
                <NativeSelectOption value="all">All statuses</NativeSelectOption>
                {Object.entries(statusMeta).map(([value, meta]) => (
                  <NativeSelectOption key={value} value={value}>
                    {meta.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                value={workstream}
                onChange={(event) => setWorkstream(event.target.value)}
                className="h-10 min-w-[210px] border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter by workstream"
              >
                <NativeSelectOption value="all">All workstreams</NativeSelectOption>
                {workstreams.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {value}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                value={member}
                onChange={(event) => setMember(event.target.value)}
                className="h-10 min-w-[220px] border-[#ced8cf] bg-[#f8faf7]"
                aria-label="Filter workplan by team member"
              >
                <NativeSelectOption value="all">All team members</NativeSelectOption>
                {teamMembers.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item.group === "PCU" ? "PCU" : "Workplan"} · {item.name}
                  </NativeSelectOption>
                ))}
                <NativeSelectOption value="no_owner">No owner</NativeSelectOption>
              </NativeSelect>
              <Button
                onClick={openAddActivity}
                className="h-10 bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
              >
                <Plus className="h-4 w-4" />
                Add activity
              </Button>
            </div>
          </div>

          <div className="hidden grid-cols-[100px_minmax(300px,1.4fr)_minmax(150px,.6fr)_180px_120px_120px_42px] gap-4 border-b border-[#e2e7e0] bg-[#f7f9f5] px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#718178] lg:grid">
            <span>Code</span>
            <span>Activity</span>
            <span>Workstream</span>
            <span>Owner</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Update</span>
          </div>
          <div className="max-h-[720px] divide-y divide-[#e8ece6] overflow-y-auto">
            {filtered.map((item) => {
              const currentStatus = deriveActivityStatus(item, updates);
              const currentProgress = deriveActivityProgress(item, updates);
              const currentOwner = canonicalOwnerName(
                activityOwner(item, updates),
                teamMembers,
              );
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openActivity(item)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openActivity(item);
                    }
                  }}
                  className="grid w-full cursor-pointer gap-3 px-4 py-4 text-left transition-colors hover:bg-[#f7faf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2b7357] lg:grid-cols-[100px_minmax(300px,1.4fr)_minmax(150px,.6fr)_180px_120px_120px_42px] lg:items-center lg:gap-4 lg:px-5"
                >
                  <div className="flex items-center justify-between lg:block">
                    <span className="font-mono text-sm font-black text-[#2f634c]">
                      {item.code || item.uid}
                    </span>
                    <span className="text-xs text-[#7a8a81] lg:hidden">
                      {item.subactivities.length} sub-activities
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[15px] font-bold leading-5 text-[#183529]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-[#718178]">
                      {item.subactivities.length} sub-activities · due{" "}
                      {formatDate(item.endDate)}
                    </p>
                    {!currentOwner && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-rose-700">
                        <span className="h-2 w-2 rounded-full bg-rose-600" />
                        Owner required
                      </p>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-[#53685c]">
                    {item.workstream || "Programme management"}
                  </p>
                  <div onClick={(event) => event.stopPropagation()}>
                    <NativeSelect
                      value={currentOwner}
                      onChange={(event) =>
                        void saveOwnerForTarget(
                          {
                            key: item.id,
                            status: currentStatus,
                            progress: currentProgress,
                            note: updates[item.id]?.note ?? "",
                          },
                          event.target.value,
                        )
                      }
                      className={`h-9 w-full bg-white text-sm ${currentOwner ? "border-[#ced8cf]" : "border-rose-300 text-rose-700"}`}
                      aria-label={`Change owner for ${item.code || item.uid}`}
                    >
                      <NativeSelectOption value="">No owner</NativeSelectOption>
                      {teamMembers.map((teamMember) => (
                        <NativeSelectOption key={teamMember.id} value={teamMember.name}>
                          {teamMember.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <StatusPill status={currentStatus} />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#53685c]">
                      <span>{currentProgress}%</span>
                      <span className="lg:hidden">progress</span>
                    </div>
                    <Progress
                      value={currentProgress}
                      className="h-1.5 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                    />
                  </div>
                  <PencilLine className="hidden h-5 w-5 text-[#4f725f] lg:block" />
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="px-6 py-16 text-center">
              <SlidersHorizontal className="mx-auto mb-3 h-6 w-6 text-[#779083]" />
              <p className="font-bold">
                {allActivities.length
                  ? "No activities match these filters"
                  : `No activities in the ${selectedYear} draft yet`}
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
                  setQuery("");
                  setSection("all");
                  setGoal("all");
                  setStatus("all");
                  setWorkstream("all");
                  setMember("all");
                }}
              >
                {allActivities.length ? "Clear filters" : "Add first activity"}
              </Button>
            </div>
          )}
        </section>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: `${selectedYear} budget`,
                  value: formatMnt(financeStats.budgetMnt),
                  detail: "Approved budget",
                  icon: WalletCards,
                  accent: "bg-[#0c3b2d] text-white",
                },
                {
                  label: "Commitments",
                  value: formatMnt(financeStats.commitmentMnt),
                  detail: `${formatMnt(financeStats.uncommittedMnt)} uncommitted`,
                  icon: HandCoins,
                  accent: "bg-white",
                },
                {
                  label: "Expenditure",
                  value: formatMnt(financeStats.expenditureMnt),
                  detail: `${financeStats.spentPercent}% of filtered budget`,
                  icon: ReceiptText,
                  accent: "bg-white",
                },
                {
                  label: "Budget remaining",
                  value: formatMnt(financeStats.remainingMnt),
                  detail: "Budget less expenditure",
                  icon: Banknote,
                  accent:
                    financeStats.remainingMnt < 0
                      ? "bg-[#fff0f1] text-[#8f1d2c]"
                      : "bg-[#edf6e8]",
                },
              ].map((metric) => (
                <article
                  key={metric.label}
                  className={`rounded-2xl border border-[#d7ded5] p-5 shadow-[0_6px_22px_rgba(20,36,27,0.04)] ${metric.accent}`}
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
                  <p className="text-3xl font-black tracking-[-0.03em]">
                    {metric.value}
                  </p>
                  <p
                    className={`mt-1 text-sm ${metric.accent.includes("text-white") ? "text-emerald-50/70" : "text-[#718178]"}`}
                  >
                    {metric.detail}
                  </p>
                </article>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
              <div className="border-b border-[#e2e7e0] p-4 lg:p-5">
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
                    <NativeSelectOption value="all">Sections A and B</NativeSelectOption>
                    <NativeSelectOption value="A">Section A</NativeSelectOption>
                    <NativeSelectOption value="B">Section B</NativeSelectOption>
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
                        {value === "All goals" ? "Cross-goal" : value}
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
                        {item.group === "PCU" ? "PCU" : "Workplan"} · {item.name}
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
                      const remainingMnt = budgetMnt - totals.expenditure;
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
                                  onClick={() => setSelectedBudgetKey(line.id)}
                                  className="whitespace-normal break-words text-left font-bold leading-5 text-[#183529] underline-offset-4 hover:text-[#277255] hover:underline"
                                >
                                  {line.title}
                                </button>
                                <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-[#718178]">
                                  Section {line.section} · {line.goal || "No goal"} · {line.workstream || line.level}
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
                              onClick={() => setSelectedBudgetKey(line.id)}
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
                  const remainingMnt = budgetMnt - totals.expenditure;
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
                            onClick={() => setSelectedBudgetKey(line.id)}
                            className="mt-2 whitespace-normal break-words text-left font-bold leading-6 text-[#183529] underline-offset-4 hover:text-[#277255] hover:underline"
                          >
                            {line.title}
                          </button>
                          <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-[#718178]">
                            Section {line.section} · {line.goal || "No goal"} · {line.workstream || line.level}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBudgetKey(line.id)}
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
                          {target?.label ?? "Removed workplan item"}
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
              <div className="flex flex-col gap-2 border-b border-[#e2e7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Finance entries</h2>
                  <p className="text-sm text-[#718178]">
                    Most recent commitments and expenditure for the selected filters
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#5d7467]">
                  {financeStats.relevantEntries.length} entries
                </span>
              </div>
              {financeState === "unavailable" && (
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                  Saved finance entries are temporarily unavailable. The approved budget remains visible.
                </div>
              )}
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="pl-5">Date</TableHead>
                      <TableHead>Budget line</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="pr-5 text-right">Amount (MNT)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financeStats.relevantEntries.slice(0, 20).map((entry) => {
                      const line = allBudgetLines.find(
                        (item) => item.id === entry.budgetKey,
                      );
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="pl-5 whitespace-nowrap">
                            {formatDate(entry.entryDate)}
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
                          <TableCell className="pr-5 text-right font-black tabular-nums">
                            {formatMnt(entry.amountMnt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {financeState === "ready" && financeStats.relevantEntries.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <ReceiptText className="mx-auto mb-3 h-7 w-7 text-[#779083]" />
                  <p className="font-bold">No finance entries yet</p>
                  <p className="mt-1 text-sm text-[#718178]">
                    Open a budget line, then choose an activity to add a commitment or expenditure.
                  </p>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between lg:p-5">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-xl font-black">PCU team performance</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  The five confirmed PCU roles are included with additional names found in the workplan.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:flex">
                <NativeSelect
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  className="h-10 min-w-[155px] border-[#ced8cf] bg-[#f8faf7]"
                  aria-label="Filter team report by workplan section"
                >
                  <NativeSelectOption value="all">Sections A and B</NativeSelectOption>
                  <NativeSelectOption value="A">Section A</NativeSelectOption>
                  <NativeSelectOption value="B">Section B</NativeSelectOption>
                </NativeSelect>
                <NativeSelect
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="h-10 min-w-[145px] border-[#ced8cf] bg-[#f8faf7]"
                  aria-label="Filter team report by goal"
                >
                  <NativeSelectOption value="all">Every goal</NativeSelectOption>
                  {goals.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {value === "All goals" ? "Cross-goal" : value}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button
                  onClick={openAddTeamMember}
                  className="h-10 bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                >
                  <UserPlus className="h-4 w-4" />
                  Add member
                </Button>
              </div>
            </section>

            {teamState === "unavailable" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Saved roster changes are temporarily unavailable. The default team list remains visible.
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
              <div className="flex flex-col gap-2 border-b border-[#e2e7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">Team activity and finance report</h2>
                  <p className="mt-1 text-sm text-[#718178]">
                    Financial values use the budget lines linked to each member&apos;s assigned activities.
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#5d7467]">
                  {teamMembers.filter((item) => item.group === "PCU").length} PCU members · {teamMembers.filter((item) => item.group === "Workplan").length} additional members
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[1320px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[270px] pl-5">Team member</TableHead>
                      <TableHead className="w-[190px]">Activity progress</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Commitment</TableHead>
                      <TableHead className="text-right">Expenditure</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="w-44 pr-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamSummaries.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-5">
                          <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e7efe3] text-sm font-black text-[#275b45]">
                              {item.name
                                .split(/[.\s]/)
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join("")}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black">{item.name}</p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.group === "PCU" ? "bg-[#dcefd6] text-[#285a43]" : "bg-slate-100 text-slate-600"}`}
                                >
                                  {item.group}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[#718178]">{item.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="mb-2 flex items-center justify-between text-sm font-bold">
                            <span>{item.progress}%</span>
                            <span className="text-xs text-[#718178]">
                              {item.activityCount} activities
                            </span>
                          </div>
                          <Progress
                            value={item.progress}
                            className="h-2 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold tabular-nums">
                          {formatMnt(item.budgetMnt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMnt(item.commitmentMnt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMnt(item.expenditureMnt)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-black tabular-nums ${item.remainingMnt < 0 ? "text-rose-700" : "text-[#245f47]"}`}
                        >
                          {formatMnt(item.remainingMnt)}
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditTeamMember(item)}
                            >
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMember(item.id);
                                setActiveView("dashboard");
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-[#e2e7e0] bg-[#f8faf7] px-5 py-3 text-xs leading-5 text-[#718178]">
                Shared objective-level budget lines can be linked to more than one team member. Team rows should not be added together as a programme total.
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
        <DialogContent className="bg-white text-[#14241b] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create the next workplan</DialogTitle>
            <DialogDescription>
              Create a draft year, then edit its activities, sub-activities, and budget lines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Workplan year</span>
              <Input
                type="number"
                min={selectedYear + 1}
                max="2100"
                step="1"
                value={newYear}
                onChange={(event) => setNewYear(Number(event.target.value))}
                className="h-11 border-[#cbd6cc] bg-white"
              />
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-[#d8e0d6] bg-[#f7faf5] p-4">
              <Checkbox
                checked={copyCurrentYear}
                onCheckedChange={(checked) => setCopyCurrentYear(Boolean(checked))}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-bold">Copy the {selectedYear} structure</span>
                <span className="mt-1 block text-sm leading-5 text-[#718178]">
                  Copy activities, sub-activities, and budget lines. Progress starts at not started, while planning details and budget amounts remain editable.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYearDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createWorkplanYear}
              disabled={yearSaving}
              className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
            >
              {yearSaving ? "Creating…" : `Create ${newYear} workplan`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-4xl!">
          <DialogHeader>
            <DialogTitle>
              {editingPlanKey ? "Edit" : "Add"}{" "}
              {planRecordType === "activity" ? "activity" : "sub-activity"}
            </DialogTitle>
            <DialogDescription>
              These planning fields update the shared {selectedYear} workplan.
            </DialogDescription>
          </DialogHeader>

          {planRecordType === "activity" ? (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Activity code</span>
                <Input
                  value={activityPlanDraft.code}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, code: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                  placeholder="A.1.1.1"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Workstream</span>
                <Input
                  value={activityPlanDraft.workstream}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, workstream: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold">Activity title</span>
                <Textarea
                  value={activityPlanDraft.title}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  className="min-h-20 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold">Mongolian title</span>
                <Textarea
                  value={activityPlanDraft.titleMn}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, titleMn: event.target.value }))
                  }
                  className="min-h-20 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Section</span>
                <NativeSelect
                  value={activityPlanDraft.section}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, section: event.target.value }))
                  }
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  <NativeSelectOption value="A">Section A</NativeSelectOption>
                  <NativeSelectOption value="B">Section B</NativeSelectOption>
                </NativeSelect>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Goal</span>
                <Input
                  value={activityPlanDraft.goal}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, goal: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                  placeholder="Goal 1"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Priority</span>
                <NativeSelect
                  value={activityPlanDraft.priority}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, priority: event.target.value }))
                  }
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  <NativeSelectOption value="High">High</NativeSelectOption>
                  <NativeSelectOption value="Medium">Medium</NativeSelectOption>
                  <NativeSelectOption value="Low">Low</NativeSelectOption>
                </NativeSelect>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Action plan reference</span>
                <Input
                  value={activityPlanDraft.actionPlan}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, actionPlan: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Start date</span>
                <Input
                  type="date"
                  value={activityPlanDraft.startDate}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, startDate: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Due date</span>
                <Input
                  type="date"
                  value={activityPlanDraft.endDate}
                  onChange={(event) =>
                    setActivityPlanDraft((current) => ({ ...current, endDate: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              {[
                ["Lead", "lead"],
                ["Technical lead", "technicalLead"],
                ["Support", "support"],
                ["Partners", "partners"],
              ].map(([label, field]) => (
                <label key={field} className="block">
                  <span className="mb-1.5 block text-sm font-bold">{label}</span>
                  <Textarea
                    value={activityPlanDraft[field as keyof ActivityPlanDraft]}
                    onChange={(event) =>
                      setActivityPlanDraft((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    className="min-h-20 border-[#cbd6cc] bg-white"
                  />
                </label>
              ))}
              {[
                ["Description", "description"],
                ["Baseline", "baseline"],
                [`${selectedYear} target`, "target"],
              ].map(([label, field]) => (
                <label key={field} className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-bold">{label}</span>
                  <Textarea
                    value={activityPlanDraft[field as keyof ActivityPlanDraft]}
                    onChange={(event) =>
                      setActivityPlanDraft((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    className="min-h-24 border-[#cbd6cc] bg-white"
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold">Sub-activity title</span>
                <Textarea
                  value={subactivityPlanDraft.title}
                  onChange={(event) =>
                    setSubactivityPlanDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  className="min-h-20 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Owner</span>
                <NativeSelect
                  value={canonicalOwnerName(subactivityPlanDraft.owner, teamMembers)}
                  onChange={(event) =>
                    setSubactivityPlanDraft((current) => ({ ...current, owner: event.target.value }))
                  }
                  className={`h-11 w-full bg-white ${
                    canonicalOwnerName(subactivityPlanDraft.owner, teamMembers)
                      ? "border-[#cbd6cc]"
                      : "border-rose-300"
                  }`}
                >
                  <NativeSelectOption value="">No owner</NativeSelectOption>
                  {teamMembers.map((item) => (
                    <NativeSelectOption key={item.id} value={item.name}>
                      {item.name} · {item.role}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Executor</span>
                <Input
                  value={subactivityPlanDraft.executor}
                  onChange={(event) =>
                    setSubactivityPlanDraft((current) => ({ ...current, executor: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Start date</span>
                <Input
                  type="date"
                  value={subactivityPlanDraft.startDate}
                  onChange={(event) =>
                    setSubactivityPlanDraft((current) => ({ ...current, startDate: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Due date</span>
                <Input
                  type="date"
                  value={subactivityPlanDraft.endDate}
                  onChange={(event) =>
                    setSubactivityPlanDraft((current) => ({ ...current, endDate: event.target.value }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Initial status</span>
                <NativeSelect
                  value={subactivityPlanDraft.status}
                  onChange={(event) =>
                    setSubactivityPlanDraft((current) => ({
                      ...current,
                      status: event.target.value as StatusKey,
                    }))
                  }
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  {Object.entries(statusMeta).map(([value, meta]) => (
                    <NativeSelectOption key={value} value={value}>
                      {meta.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <div />
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold">Progress summary</span>
                <Textarea
                  value={subactivityPlanDraft.progressSummary}
                  onChange={(event) =>
                    setSubactivityPlanDraft((current) => ({
                      ...current,
                      progressSummary: event.target.value,
                    }))
                  }
                  className="min-h-24 border-[#cbd6cc] bg-white"
                />
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editingPlanKey && (
                <Button
                  variant="outline"
                  onClick={() => setPlanDeleteOpen(true)}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={savePlanRecord}
                disabled={planSaving}
                className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
              >
                {planSaving ? "Saving…" : "Save workplan item"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={planDeleteOpen} onOpenChange={setPlanDeleteOpen}>
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this workplan item?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be hidden from the {selectedYear} workplan. Progress history and finance records are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={planSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removePlanRecord}
              disabled={planSaving}
              className="bg-rose-700 text-white hover:bg-rose-800"
            >
              {planSaving ? "Removing…" : "Remove item"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={budgetLineDialogOpen} onOpenChange={setBudgetLineDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBudgetKey ? "Edit" : "Add"} budget line</DialogTitle>
            <DialogDescription>
              Budget amounts are entered as whole Mongolian tugrik.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Budget code</span>
              <Input
                value={budgetLineDraft.code}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({ ...current, code: event.target.value }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Amount (MNT)</span>
              <Input
                type="text"
                inputMode="numeric"
                value={budgetLineDraft.amountMnt}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({
                    ...current,
                    amountMnt: formatNumberInput(event.target.value),
                  }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
                placeholder="450,000,000"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-bold">Budget line title</span>
              <Textarea
                value={budgetLineDraft.title}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({ ...current, title: event.target.value }))
                }
                className="min-h-20 border-[#cbd6cc] bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Section</span>
              <NativeSelect
                value={budgetLineDraft.section}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({ ...current, section: event.target.value }))
                }
                className="h-11 w-full border-[#cbd6cc] bg-white"
              >
                <NativeSelectOption value="A">Section A</NativeSelectOption>
                <NativeSelectOption value="B">Section B</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Goal</span>
              <Input
                value={budgetLineDraft.goal}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({ ...current, goal: event.target.value }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Workstream</span>
              <Input
                value={budgetLineDraft.workstream}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({ ...current, workstream: event.target.value }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Budget level</span>
              <Input
                value={budgetLineDraft.level}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({ ...current, level: event.target.value }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
              />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editingBudgetKey && (
                <Button
                  variant="outline"
                  onClick={() => setBudgetLineDeleteOpen(true)}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBudgetLineDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={saveBudgetLine}
                disabled={budgetLineSaving}
                className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
              >
                {budgetLineSaving ? "Saving…" : "Save budget line"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={budgetLineDeleteOpen} onOpenChange={setBudgetLineDeleteOpen}>
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this budget line?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be hidden from this workplan. Existing finance entries and allocations are retained for audit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={budgetLineSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeBudgetLine}
              disabled={budgetLineSaving}
              className="bg-rose-700 text-white hover:bg-rose-800"
            >
              {budgetLineSaving ? "Removing…" : "Remove budget line"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(selectedBudgetLine)}
        onOpenChange={(open) => {
          if (!open) setSelectedBudgetKey(null);
        }}
      >
        <DialogContent className="max-h-[92vh] w-[96vw] overflow-y-auto bg-white text-[#14241b] sm:max-w-5xl!">
          {selectedBudgetLine && (
            <>
              <DialogHeader className="text-left">
                <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-sm font-black text-[#2f634c]">
                      {selectedBudgetLine.code}
                    </p>
                    <DialogTitle className="mt-1 text-2xl font-black leading-tight">
                      {selectedBudgetLine.title}
                    </DialogTitle>
                    <DialogDescription className="mt-2">
                      Open an activity below to allocate planned budget and record its finance entries.
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditBudgetLine(selectedBudgetLine)}
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit budget line
                  </Button>
                </div>
              </DialogHeader>

              {(() => {
                const totals = financeByBudgetKey.get(selectedBudgetLine.id) ?? {
                  commitment: 0,
                  expenditure: 0,
                };
                const budgetMnt =
                  Number(selectedBudgetLine.budgetMntMillion) * 1_000_000;
                const generalEntries = financeEntries.filter(
                  (entry) =>
                    entry.budgetKey === selectedBudgetLine.id && !entry.activityKey,
                );
                return (
                  <>
                    <dl className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-5">
                      {[
                        ["Budget", formatMnt(budgetMnt)],
                        [
                          "Allocated",
                          formatMnt(allocationByBudgetKey.get(selectedBudgetLine.id) ?? 0),
                        ],
                        ["Committed", formatMnt(totals.commitment)],
                        ["Expenditure", formatMnt(totals.expenditure)],
                        ["Remaining", formatMnt(budgetMnt - totals.expenditure)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-[#f3f7f1] p-3">
                          <dt className="text-xs font-semibold text-[#718178]">{label}</dt>
                          <dd className="mt-1 whitespace-nowrap text-sm font-black tabular-nums">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {generalEntries.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {generalEntries.length} existing budget-level finance {generalEntries.length === 1 ? "entry is" : "entries are"} retained. New entries are recorded under a specific activity.
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="space-y-3">
                {selectedBudgetTargets.map((target) => {
                  const activity = allActivities.find(
                    (item) => item.id === target.activityId,
                  );
                  const subactivity = activity?.subactivities.find(
                    (item) => item.id === target.key,
                  );
                  const ownerValue = subactivity
                    ? subactivityOwner(subactivity, updates)
                    : activity
                      ? activityOwner(activity, updates)
                      : "";
                  const ownerName = canonicalOwnerName(ownerValue, teamMembers);
                  const allocation = allocations.find(
                    (item) =>
                      item.budgetKey === selectedBudgetLine.id &&
                      item.activityKey === target.key,
                  );
                  const targetFinance = financeByActivityKey.get(target.key) ?? {
                    commitment: 0,
                    expenditure: 0,
                  };
                  const allocatedMnt = allocation?.amountMnt ?? 0;
                  return (
                    <article
                      key={target.key}
                      className={`rounded-2xl border p-4 ${target.kind === "subactivity" ? "ml-3 border-[#dfe7dc] bg-[#fbfcfa] sm:ml-8" : "border-[#cad8cd] bg-white shadow-sm"}`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${target.kind === "activity" ? "bg-[#dfeeda] text-[#235f46]" : "bg-[#eef3ec] text-[#597066]"}`}>
                            <ListChecks className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#718178]">
                              {target.kind === "activity" ? "Main activity" : "Sub-activity"}
                            </p>
                            <h3 className="mt-1 text-sm font-black leading-6">
                              {target.kind === "activity" ? `${target.code} · ` : ""}
                              {target.label}
                            </h3>
                            <p className={`mt-2 flex items-center gap-2 text-xs font-semibold ${ownerName ? "text-[#5d7467]" : "text-rose-700"}`}>
                              <span className={`h-2 w-2 rounded-full ${ownerName ? "bg-emerald-600" : "bg-rose-600"}`} />
                              {ownerName || "Owner required"}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openAllocationDialog(
                                selectedBudgetLine.id,
                                target.key,
                                allocation,
                              )
                            }
                          >
                            <WalletCards className="h-4 w-4" />
                            {allocation ? "Edit allocation" : "Allocate"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              openFinanceDialog(selectedBudgetLine.id, target.key)
                            }
                            className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                          >
                            <Plus className="h-4 w-4" />
                            Add finance entry
                          </Button>
                        </div>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          ["Allocated", formatMnt(allocatedMnt)],
                          ["Committed", formatMnt(targetFinance.commitment)],
                          ["Expenditure", formatMnt(targetFinance.expenditure)],
                          ["Available", formatMnt(allocatedMnt - targetFinance.expenditure)],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl bg-[#f3f7f1] px-3 py-2.5">
                            <dt className="text-xs font-semibold text-[#718178]">{label}</dt>
                            <dd className="mt-1 text-sm font-black tabular-nums">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  );
                })}
                {selectedBudgetTargets.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-8 text-center">
                    <AlertTriangle className="mx-auto h-6 w-6 text-amber-700" />
                    <p className="mt-2 font-bold text-amber-950">No matching activities</p>
                    <p className="mt-1 text-sm text-amber-900">
                      Activity codes under this budget line need to begin with {selectedBudgetLine.code}.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={allocationDialogOpen} onOpenChange={setAllocationDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{allocationDraft.id ? "Edit" : "Add"} budget allocation</DialogTitle>
            <DialogDescription>
              Assign a planned amount from one budget line to a main activity or sub-activity.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-xl border border-[#d8e0d6] bg-[#f5f8f3] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#718178]">
                Budget line
              </p>
              <p className="mt-1 font-bold leading-6">
                {allocationBudgetLine
                  ? `${allocationBudgetLine.code} · ${allocationBudgetLine.title}`
                  : "Budget line unavailable"}
              </p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Activity or sub-activity</span>
              <NativeSelect
                value={allocationDraft.activityKey}
                onChange={(event) =>
                  setAllocationDraft((current) => ({ ...current, activityKey: event.target.value }))
                }
                className="h-11 w-full border-[#cbd6cc] bg-white"
              >
                {allocationTargets.map((item) => (
                  <NativeSelectOption key={item.key} value={item.key}>
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Allocated amount (MNT)</span>
              <Input
                type="text"
                inputMode="numeric"
                value={allocationDraft.amountMnt}
                onChange={(event) =>
                  setAllocationDraft((current) => ({
                    ...current,
                    amountMnt: formatNumberInput(event.target.value),
                  }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
                placeholder="150,000,000"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Planning note</span>
              <Textarea
                value={allocationDraft.note}
                onChange={(event) =>
                  setAllocationDraft((current) => ({ ...current, note: event.target.value }))
                }
                className="min-h-24 border-[#cbd6cc] bg-white"
                placeholder="Purpose, assumptions, or expected procurement"
              />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {allocationDraft.id && (
                <Button
                  variant="outline"
                  onClick={() => setAllocationDeleteOpen(true)}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAllocationDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={saveAllocation}
                disabled={allocationSaving}
                className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
              >
                {allocationSaving ? "Saving…" : "Save allocation"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={allocationDeleteOpen} onOpenChange={setAllocationDeleteOpen}>
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this budget allocation?</AlertDialogTitle>
            <AlertDialogDescription>
              The planned amount will no longer be assigned to this workplan item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={allocationSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeAllocation}
              disabled={allocationSaving}
              className="bg-rose-700 text-white hover:bg-rose-800"
            >
              {allocationSaving ? "Removing…" : "Remove allocation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={financeDialogOpen} onOpenChange={setFinanceDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add finance entry</DialogTitle>
            <DialogDescription>
              Record a commitment or expenditure for the selected workplan item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-xl border border-[#d8e0d6] bg-[#f5f8f3] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#718178]">
                Budget line
              </p>
              <p className="mt-1 font-bold leading-6">
                {financeBudgetLine
                  ? `${financeBudgetLine.code} · ${financeBudgetLine.title}`
                  : "Budget line unavailable"}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#718178]">
                Activity or sub-activity
              </p>
              <p className="mt-1 text-sm leading-6">
                {financeTarget
                  ? `${financeTarget.code} · ${financeTarget.label}`
                  : "Workplan item unavailable"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Entry type</span>
                <NativeSelect
                  value={financeDraft.entryType}
                  onChange={(event) =>
                    setFinanceDraft((current) => ({
                      ...current,
                      entryType: event.target.value as FinanceDraft["entryType"],
                    }))
                  }
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  <NativeSelectOption value="commitment">Commitment</NativeSelectOption>
                  <NativeSelectOption value="expenditure">Expenditure</NativeSelectOption>
                </NativeSelect>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Date</span>
                <Input
                  type="date"
                  value={financeDraft.entryDate}
                  onChange={(event) =>
                    setFinanceDraft((current) => ({
                      ...current,
                      entryDate: event.target.value,
                    }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Amount (MNT)</span>
              <Input
                type="text"
                inputMode="numeric"
                value={financeDraft.amountMnt}
                onChange={(event) =>
                  setFinanceDraft((current) => ({
                    ...current,
                    amountMnt: formatNumberInput(event.target.value),
                  }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
                placeholder="450,000,000"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Vendor or payee</span>
              <Input
                value={financeDraft.vendor}
                onChange={(event) =>
                  setFinanceDraft((current) => ({
                    ...current,
                    vendor: event.target.value,
                  }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
                placeholder="Optional"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Description</span>
              <Textarea
                value={financeDraft.description}
                onChange={(event) =>
                  setFinanceDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-24 border-[#cbd6cc] bg-white"
                placeholder="Contract, purchase, invoice, or other reference"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveFinanceEntry}
              disabled={financeSaving || financeState === "loading"}
              className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
            >
              {financeSaving ? "Saving…" : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingTeamId ? "Edit team member" : "Add team member"}
            </DialogTitle>
            <DialogDescription>
              Names and aliases are used to connect the member with workplan assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Name</span>
              <Input
                value={teamDraft.name}
                onChange={(event) =>
                  setTeamDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
                placeholder="For example, Tuvshinjargal.P"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Position or role</span>
              <Input
                value={teamDraft.role}
                onChange={(event) =>
                  setTeamDraft((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
                placeholder="Coordinator, officer, or other role"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Member type</span>
              <NativeSelect
                value={teamDraft.group}
                onChange={(event) =>
                  setTeamDraft((current) => ({
                    ...current,
                    group: event.target.value as TeamDraft["group"],
                  }))
                }
                className="h-11 w-full border-[#cbd6cc] bg-white"
              >
                <NativeSelectOption value="PCU">PCU member</NativeSelectOption>
                <NativeSelectOption value="Workplan">Additional workplan member</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Other recorded names</span>
              <Textarea
                value={teamDraft.aliasesText}
                onChange={(event) =>
                  setTeamDraft((current) => ({
                    ...current,
                    aliasesText: event.target.value,
                  }))
                }
                className="min-h-24 border-[#cbd6cc] bg-white"
                placeholder="Separate English, Mongolian, or abbreviated names with commas"
              />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editingTeamId && (
                <Button
                  variant="outline"
                  onClick={() => setTeamDeleteOpen(true)}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={saveTeamMember}
                disabled={teamSaving || teamState === "loading"}
                className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
              >
                {teamSaving ? "Saving…" : "Save member"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={teamDeleteOpen} onOpenChange={setTeamDeleteOpen}>
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this team member?</AlertDialogTitle>
            <AlertDialogDescription>
              The member will disappear from team reports and filters. Their activities and sub-activities will be cleared and marked with a red owner warning until reassigned. Notes and finance records will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={teamSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeTeamMember}
              disabled={teamSaving}
              className="bg-rose-700 text-white hover:bg-rose-800"
            >
              {teamSaving ? "Removing…" : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-h-[92vh] w-[96vw] gap-0 overflow-y-auto bg-white p-0 text-[#14241b] sm:max-w-5xl!">
          {selected && activeTarget && (
            <>
              <DialogHeader className="sticky top-0 z-10 border-b border-[#dce3da] bg-white/95 px-6 py-5 pr-14 text-left backdrop-blur">
                <p className="font-mono text-sm font-black text-[#2f634c]">
                  {selected.code || selected.uid}
                </p>
                <DialogTitle className="text-xl font-black leading-tight tracking-[-0.025em] sm:text-2xl">
                  {selected.title}
                </DialogTitle>
                <DialogDescription className="text-[#718178]">
                  {selected.workstream || "Programme management"}
                </DialogDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditActivity(selected)}
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit activity
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f3f7f1] p-4 text-sm sm:grid-cols-5">
                  <div>
                    <p className="text-[#718178]">Status</p>
                    <div className="mt-1">
                      <StatusPill
                        status={deriveActivityStatus(selected, updates)}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[#718178]">Progress</p>
                    <p className="mt-1 text-lg font-black">
                      {deriveActivityProgress(selected, updates)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[#718178]">Start</p>
                    <p className="mt-1 font-bold">
                      {formatDate(selected.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#718178]">Due</p>
                    <p className="mt-1 font-bold">
                      {formatDate(selected.endDate)}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[#718178]">Allocated budget</p>
                    <p className="mt-1 whitespace-nowrap text-base font-black text-[#245f47]">
                      {formatMnt(selectedAllocatedMnt)}
                    </p>
                  </div>
                </div>

                <section className="rounded-2xl border border-[#d8e0d6] bg-[#fbfcfa] p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-black">Update progress</h3>
                      <p className="mt-1 text-sm text-[#718178]">
                        Choose the main activity or one of its sub-activities.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (activeTarget.kind === "activity") {
                          openEditActivity(selected);
                          return;
                        }
                        const subactivity = selected.subactivities.find(
                          (item) => item.id === activeTarget.key,
                        );
                        if (subactivity) openEditSubactivity(selected, subactivity);
                      }}
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit selected item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-bold">
                        Workplan item
                      </span>
                      <NativeSelect
                        value={activeTarget.key}
                        onChange={(event) => {
                          const target = selectableTargets.find(
                            (item) => item.key === event.target.value,
                          );
                          if (target) loadTarget(target);
                        }}
                        className="h-11 w-full border-[#cbd6cc] bg-white"
                      >
                        {selectableTargets.map((target) => (
                          <NativeSelectOption key={target.key} value={target.key}>
                            {target.kind === "activity"
                              ? target.label
                              : `Sub-activity · ${target.label}`}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </label>

                    {activeMainProgressAuto && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                        Main activity progress is calculated automatically from its sub-activities. You can still update the main activity status manually.
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">
                          Status
                        </span>
                        <NativeSelect
                          value={draft.status}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              status: event.target.value as StatusKey,
                            }))
                          }
                          className="h-11 w-full border-[#cbd6cc] bg-white"
                        >
                          {Object.entries(statusMeta).map(([value, meta]) => (
                            <NativeSelectOption key={value} value={value}>
                              {meta.label}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-bold">
                          Owner
                        </span>
                        <NativeSelect
                          value={canonicalOwnerName(draft.owner, teamMembers)}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              owner: event.target.value,
                            }))
                          }
                          className={`h-11 w-full bg-white ${
                            canonicalOwnerName(draft.owner, teamMembers)
                              ? "border-[#cbd6cc]"
                              : "border-rose-300"
                          }`}
                        >
                          <NativeSelectOption value="">No owner</NativeSelectOption>
                          {teamMembers.map((item) => (
                            <NativeSelectOption key={item.id} value={item.name}>
                              {item.name} · {item.role}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        {!canonicalOwnerName(draft.owner, teamMembers) && (
                          <span className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-rose-700">
                            <span className="h-2 w-2 rounded-full bg-rose-600" />
                            Owner required
                          </span>
                        )}
                      </label>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-bold">Progress</span>
                        <span className="rounded-full bg-[#e6efe2] px-2.5 py-1 text-sm font-black text-[#315845]">
                          {draft.progress}%
                        </span>
                      </div>
                      <Slider
                        value={[draft.progress]}
                        disabled={activeMainProgressAuto}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            progress: value[0] ?? 0,
                          }))
                        }
                        aria-label="Progress percentage"
                        className="[&_[data-slot=slider-range]]:bg-[#277255] [&_[data-slot=slider-thumb]]:border-[#277255]"
                      />
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-bold">
                        Progress note
                      </span>
                      <Textarea
                        value={draft.note}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            note: event.target.value,
                          }))
                        }
                        className="min-h-24 border-[#cbd6cc] bg-white"
                        placeholder="What changed, what was completed, or what comes next?"
                      />
                    </label>

                    <div className="flex flex-col gap-2 border-t border-[#e2e7e0] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-[#718178]">
                        {updates[activeTarget.key]
                          ? `Last saved ${formatUpdatedAt(updates[activeTarget.key].updatedAt)}`
                          : "No saved update yet"}
                      </p>
                      <Button
                        onClick={saveDraft}
                        disabled={saving || syncState === "loading"}
                        className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                      >
                        {saving ? "Saving…" : "Save update"}
                      </Button>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-black">Sub-activities</h3>
                      <p className="text-sm text-[#718178]">
                        Select an item to change its status and progress
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddSubactivity(selected)}
                    >
                      <Plus className="h-4 w-4" />
                      Add sub-activity
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {selected.subactivities.map((sub) => {
                      const currentStatus = recordStatus(
                        sub.id,
                        sub.status as StatusKey,
                        updates,
                      );
                      const currentProgress = recordProgress(
                        sub.id,
                        statusMeta[sub.status as StatusKey].weight,
                        updates,
                      );
                      const saved = updates[sub.id];
                      const currentOwner = canonicalOwnerName(
                        subactivityOwner(sub, updates),
                        teamMembers,
                      );
                      return (
                        <article
                          key={sub.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => loadTarget(targetForSubactivity(sub))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              loadTarget(targetForSubactivity(sub));
                            }
                          }}
                          className={`rounded-2xl border p-4 text-left transition-colors hover:bg-[#f6f9f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b7357] ${
                            editKey === sub.id
                              ? "border-[#8eaf9a] bg-[#f0f6ed]"
                              : "border-[#dbe3d9] bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="rounded-lg bg-[#e8f1e6] p-2 text-[#2c795a]">
                                <ListChecks className="h-4 w-4" />
                              </span>
                              <p className="pt-1 text-sm font-bold leading-5">
                                {sub.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusPill status={currentStatus} />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <Progress
                              value={currentProgress}
                              className="h-1.5 flex-1 bg-[#e1e8de] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                            />
                            <span className="w-9 text-right text-xs font-bold text-[#53685c]">
                              {currentProgress}%
                            </span>
                          </div>
                          <div className="mt-3 flex flex-col gap-3 border-t border-[#e4e9e2] pt-3 sm:flex-row sm:items-end sm:justify-between">
                            <label
                              className="min-w-0 flex-1"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-[#718178]">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    currentOwner ? "bg-emerald-600" : "bg-rose-600"
                                  }`}
                                />
                                {currentOwner ? "Owner" : "Owner required"}
                              </span>
                              <NativeSelect
                                value={currentOwner}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  void saveOwnerForTarget(
                                    {
                                      key: sub.id,
                                      status: currentStatus,
                                      progress: currentProgress,
                                      note: saved?.note ?? "",
                                    },
                                    event.target.value,
                                  );
                                }}
                                className={`h-9 w-full bg-white text-xs ${
                                  currentOwner ? "border-[#cbd6cc]" : "border-rose-300"
                                }`}
                              >
                                <NativeSelectOption value="">No owner</NativeSelectOption>
                                {teamMembers.map((item) => (
                                  <NativeSelectOption key={item.id} value={item.name}>
                                    {item.name} · {item.role}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                            </label>
                            <p className="font-bold text-[#315845]">
                              Allocated {formatMnt(allocationByActivityKey.get(sub.id) ?? 0)}
                            </p>
                          </div>
                          {(saved?.note || sub.progressSummary) && (
                            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#53685c]">
                              {saved?.note || sub.progressSummary}
                            </p>
                          )}
                        </article>
                      );
                    })}
                    {selected.subactivities.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-[#dbe3d9] p-4 text-sm text-[#718178]">
                        No sub-activities were reported in the June progress sheet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e0e6de] p-5">
                  <h3 className="font-black">Workplan details</h3>
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[#718178]">Goal</dt>
                      <dd className="mt-1 font-bold">{selected.goal || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[#718178]">Priority</dt>
                      <dd className="mt-1 font-bold">
                        {selected.priority || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#718178]">Lead</dt>
                      <dd className="mt-1 font-bold">{selected.lead || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[#718178]">Technical lead</dt>
                      <dd className="mt-1 font-bold">
                        {selected.technicalLead || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[#718178]">{selectedYear} target</dt>
                      <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                        {selected.target || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[#718178]">Description</dt>
                      <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                        {selected.description || "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[#718178]">Baseline</dt>
                      <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                        {selected.baseline || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#718178]">Support</dt>
                      <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                        {selected.support || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#718178]">Partners</dt>
                      <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                        {selected.partners || "—"}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
