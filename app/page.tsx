"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CircleCheck,
  Clock3,
  Cloud,
  CloudOff,
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
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  baseSupport: string;
};

type Draft = {
  status: StatusKey;
  progress: number;
  owner: string;
  note: string;
  supportNeeded: string;
};

type FinanceEntry = {
  id: number;
  budgetKey: string;
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
  entryType: "commitment" | "expenditure";
  amountMillion: string;
  entryDate: string;
  description: string;
  vendor: string;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
  group: "PCU" | "Workplan";
  aliases: string[];
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

const allActivities = workplan.activities as Activity[];
const allBudgetLines = workplan.budgetLines as BudgetLine[];

const teamMembers: TeamMember[] = [
  {
    id: "tuvshinjargal-p",
    name: "Tuvshinjargal.P",
    role: "Coordinator",
    group: "PCU",
    aliases: ["Tuvshinjargal", "Түвшинжаргал"],
  },
  {
    id: "ochirkhuyag-j",
    name: "Ochirkhuyag.J",
    role: "PA Management senior officer",
    group: "PCU",
    aliases: ["Ochirkhuyag", "Ж.Очирхуяг", "Очирхуяг"],
  },
  {
    id: "namuunaa-m",
    name: "Namuunaa.M",
    role: "PA expansion officer",
    group: "PCU",
    aliases: ["Namuunaa", "М.Намуунаа", "Намуунаа"],
  },
  {
    id: "khulan-s",
    name: "Khulan.S",
    role: "Project and partnership officer",
    group: "PCU",
    aliases: ["Khulan", "С.Хулан", "Ш.Хулан", "Хулан"],
  },
  {
    id: "enkhsaikhan-u",
    name: "Enkhsaikhan.U",
    role: "Sustainable finance officer",
    group: "PCU",
    aliases: ["Enkhsaikhan", "Энхсайхан"],
  },
  {
    id: "amartuvshin-s",
    name: "Amartuvshin.S",
    role: "PCU workplan member",
    group: "PCU",
    aliases: ["Amartuvshin", "С.Амартүвшин", "Амартүвшин"],
  },
  {
    id: "bolormaa",
    name: "Bolormaa",
    role: "PCU workplan member",
    group: "PCU",
    aliases: ["Bolormaa", "Болормаа"],
  },
  {
    id: "tsenguun",
    name: "Tsenguun",
    role: "PCU workplan member",
    group: "PCU",
    aliases: ["Tsenguun", "Цэнгүүн"],
  },
  {
    id: "namjilmaa-ch",
    name: "Namjilmaa.Ch",
    role: "Additional workplan member",
    group: "Workplan",
    aliases: ["Namjilmaa", "Ч.Намжилмаа", "Намжилмаа"],
  },
  {
    id: "munkhjin-ts",
    name: "Munkhjin.Ts",
    role: "Additional workplan member",
    group: "Workplan",
    aliases: ["Munkhjin", "Ц.Мөнхжин", "Мөнхжин"],
  },
  {
    id: "tugsbuyan-m",
    name: "Tugsbuyan.M",
    role: "Additional workplan member",
    group: "Workplan",
    aliases: ["Tugsbuyan", "М.Төгсбуян", "Төгсбуян"],
  },
  {
    id: "battogtokh-n",
    name: "Battogtokh.N",
    role: "Additional workplan member",
    group: "Workplan",
    aliases: ["Battogtokh", "Н.Баттогтох", "Баттогтох"],
  },
];

function todayForInput() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatMntMillion(amountMnt: number) {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amountMnt / 1_000_000);
}

function formatBudgetMillion(value: number) {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
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

function targetForActivity(activity: Activity): EditableTarget {
  return {
    key: activity.id,
    label: `${activity.code || activity.uid} · Main activity`,
    kind: "activity",
    baseStatus: activity.status as StatusKey,
    baseProgress: activity.progress,
    baseOwner: activity.technicalLead || activity.lead,
    baseNote: "",
    baseSupport: "",
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
    baseSupport: subactivity.ministrySupport,
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
  if (updates[activity.id]) return updates[activity.id].status;
  if (!activity.subactivities.some((item) => updates[item.id])) {
    return activity.status as StatusKey;
  }
  const statuses = activity.subactivities.map((item) =>
    recordStatus(item.id, item.status as StatusKey, updates),
  );
  if (statuses.includes("delayed")) return "delayed";
  if (statuses.every((item) => item === "completed")) return "completed";
  if (statuses.some((item) => item === "in_progress" || item === "completed")) {
    return "in_progress";
  }
  if (statuses.includes("on_hold")) return "on_hold";
  if (statuses.includes("not_started")) return "not_started";
  return "not_reported";
}

function deriveActivityProgress(
  activity: Activity,
  updates: Record<string, UpdateRecord>,
) {
  if (updates[activity.id]) return updates[activity.id].progress;
  if (!activity.subactivities.length) return activity.progress;
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
    activity.lead,
    activity.technicalLead,
    activity.support,
    updates[activity.id]?.owner,
    ...activity.subactivities.flatMap((item) => [
      item.owner,
      item.executor,
      updates[item.id]?.owner,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function isAssignedToMember(
  activity: Activity,
  memberId: string,
  updates: Record<string, UpdateRecord>,
) {
  if (memberId === "all") return true;
  const member = teamMembers.find((item) => item.id === memberId);
  if (!member) return false;
  const assignmentText = activityAssignmentText(activity, updates);
  return member.aliases.some((alias) =>
    assignmentText.includes(alias.toLocaleLowerCase()),
  );
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

function budgetKeysForActivities(activities: Activity[]) {
  return new Set(
    allBudgetLines
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
  const [activeView, setActiveView] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [goal, setGoal] = useState("all");
  const [member, setMember] = useState("all");
  const [status, setStatus] = useState("all");
  const [workstream, setWorkstream] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Record<string, UpdateRecord>>({});
  const [syncState, setSyncState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [editKey, setEditKey] = useState("");
  const [draft, setDraft] = useState<Draft>({
    status: "not_reported",
    progress: 0,
    owner: "",
    note: "",
    supportNeeded: "",
  });
  const [saving, setSaving] = useState(false);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [financeState, setFinanceState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [financeSaving, setFinanceSaving] = useState(false);
  const [financeDraft, setFinanceDraft] = useState<FinanceDraft>({
    budgetKey: allBudgetLines[0]?.id ?? "",
    entryType: "commitment",
    amountMillion: "",
    entryDate: todayForInput(),
    description: "",
    vendor: "",
  });

  const selected = useMemo(
    () => allActivities.find((item) => item.id === selectedId) ?? null,
    [selectedId],
  );

  const selectableTargets = useMemo(() => {
    if (!selected) return [];
    return [
      targetForActivity(selected),
      ...selected.subactivities.map(targetForSubactivity),
    ];
  }, [selected]);

  const activeTarget = useMemo(
    () => selectableTargets.find((item) => item.key === editKey) ?? null,
    [editKey, selectableTargets],
  );

  const loadTarget = useCallback(
    (target: EditableTarget) => {
      const saved = updates[target.key];
      setEditKey(target.key);
      setDraft({
        status: saved?.status ?? target.baseStatus,
        progress: saved?.progress ?? target.baseProgress,
        owner: saved?.owner || target.baseOwner,
        note: saved?.note ?? target.baseNote,
        supportNeeded: saved?.supportNeeded || target.baseSupport,
      });
    },
    [updates],
  );

  const openActivity = useCallback(
    (activity: Activity) => {
      setSelectedId(activity.id);
      loadTarget(targetForActivity(activity));
    },
    [loadTarget],
  );

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
    setSaving(true);
    try {
      const update = await persistUpdate({
        activityKey: activeTarget.key,
        ...draft,
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

  const openFinanceDialog = useCallback((budgetKey?: string) => {
    setFinanceDraft({
      budgetKey: budgetKey ?? allBudgetLines[0]?.id ?? "",
      entryType: "commitment",
      amountMillion: "",
      entryDate: todayForInput(),
      description: "",
      vendor: "",
    });
    setFinanceDialogOpen(true);
  }, []);

  const persistFinanceEntry = useCallback(
    async (payload: {
      budgetKey: string;
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
    const amountMillion = Number(financeDraft.amountMillion);
    if (!Number.isFinite(amountMillion) || amountMillion <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    setFinanceSaving(true);
    try {
      const entry = await persistFinanceEntry({
        budgetKey: financeDraft.budgetKey,
        entryType: financeDraft.entryType,
        amountMnt: Math.round(amountMillion * 1_000_000),
        entryDate: financeDraft.entryDate,
        description: financeDraft.description,
        vendor: financeDraft.vendor,
      });
      setFinanceDialogOpen(false);
      toast.success(
        financeDraft.entryType === "commitment"
          ? "Commitment added"
          : "Expenditure added",
        { description: `${formatMntMillion(entry.amountMnt)} mln MNT` },
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
              "Find PFP 2026 workplan activities by code, title, workstream, lead, or status.",
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
                supportNeeded: { type: "string" },
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
                supportNeeded: String(input.supportNeeded ?? ""),
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
              "Record a commitment or expenditure against an approved PFP 2026 budget line.",
            inputSchema: {
              type: "object",
              properties: {
                budgetKey: {
                  type: "string",
                  enum: allBudgetLines.map((line) => line.id),
                },
                entryType: {
                  type: "string",
                  enum: ["commitment", "expenditure"],
                },
                amountMntMillion: { type: "number", exclusiveMinimum: 0 },
                entryDate: { type: "string", format: "date" },
                description: { type: "string" },
                vendor: { type: "string" },
              },
              required: [
                "budgetKey",
                "entryType",
                "amountMntMillion",
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
              const entryType = String(input.entryType ?? "") as FinanceDraft["entryType"];
              const amountMntMillion = Number(input.amountMntMillion);
              const entryDate = String(input.entryDate ?? "");
              if (
                !allBudgetLines.some((line) => line.id === budgetKey) ||
                !["commitment", "expenditure"].includes(entryType) ||
                !Number.isFinite(amountMntMillion) ||
                amountMntMillion <= 0 ||
                !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)
              ) {
                throw new Error("Invalid finance entry.");
              }
              return persistFinanceEntry({
                budgetKey,
                entryType,
                amountMnt: Math.round(amountMntMillion * 1_000_000),
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
  }, [persistFinanceEntry, persistUpdate]);

  const workstreams = useMemo(
    () =>
      Array.from(
        new Set(allActivities.map((item) => item.workstream).filter(Boolean)),
      ).sort(),
    [],
  );

  const goals = useMemo(
    () =>
      Array.from(new Set(allActivities.map((item) => item.goal).filter(Boolean))).sort(),
    [],
  );

  const memberActivities = useMemo(
    () =>
      allActivities.filter((item) => isAssignedToMember(item, member, updates)),
    [member, updates],
  );

  const memberBudgetKeys = useMemo(
    () => (member === "all" ? null : budgetKeysForActivities(memberActivities)),
    [member, memberActivities],
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
      const matchesMember = isAssignedToMember(item, member, updates);
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
  }, [goal, member, query, section, status, workstream, updates]);

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
  }, [goal, member, memberBudgetKeys, query, section]);

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

  const financeStats = useMemo(() => {
    return summarizeFinance(filteredBudgetLines, financeEntries);
  }, [filteredBudgetLines, financeEntries]);

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
    const support = allSubs.filter(
      (item) => updates[item.id]?.supportNeeded || item.ministrySupport,
    ).length;
    const overall = Math.round(
      filtered.reduce(
        (total, item) => total + deriveActivityProgress(item, updates),
        0,
      ) / Math.max(filtered.length, 1),
    );
    return { completed, attention, support, overall };
  }, [filtered, updates]);

  const dashboardActivities = useMemo(
    () =>
      allActivities.filter(
        (item) =>
          (section === "all" || item.section === section) &&
          (goal === "all" || item.goal === goal) &&
          isAssignedToMember(item, member, updates),
      ),
    [goal, member, section, updates],
  );

  const dashboardBudgetLines = useMemo(
    () =>
      allBudgetLines.filter(
        (line) =>
          (section === "all" || line.section === section) &&
          (goal === "all" || line.goal === goal) &&
          (member === "all" || Boolean(memberBudgetKeys?.has(line.id))),
      ),
    [goal, member, memberBudgetKeys, section],
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
    const reportingDate = new Date(`${workplan.meta.reportingDate}T00:00:00Z`);
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
          isAssignedToMember(item, member, updates),
      );
      const activityBudgetKeys =
        member === "all" ? null : budgetKeysForActivities(activities);
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
  }, [financeEntries, goal, goals, member, section, updates]);

  const teamSummaries = useMemo(
    () =>
      teamMembers.map((teamMember) => {
        const activities = allActivities.filter(
          (item) =>
            (section === "all" || item.section === section) &&
            (goal === "all" || item.goal === goal) &&
            isAssignedToMember(item, teamMember.id, updates),
        );
        const budgetKeys = budgetKeysForActivities(activities);
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
    [financeEntries, goal, section, updates],
  );

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
              Reporting date: 30 June 2026
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
        <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5d7467]">
              2026 workplan
            </p>
            <h1 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              Progress monitoring
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#5d7467]">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Source updated through June 2026
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
                  Goal delivery and financial position as of 30 June 2026
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
                  value: formatMntMillion(dashboardFinance.budgetMnt),
                  detail: "million MNT in selected scope",
                  icon: WalletCards,
                  accent: "bg-[#0c3b2d] text-white",
                },
                {
                  label: "Commitments",
                  value: formatMntMillion(dashboardFinance.commitmentMnt),
                  detail: `${dashboardFinance.commitmentPercent}% of budget committed`,
                  icon: HandCoins,
                  accent: "bg-white",
                },
                {
                  label: "Expenditure",
                  value: formatMntMillion(dashboardFinance.expenditureMnt),
                  detail: `${dashboardFinance.spentPercent}% of budget spent`,
                  icon: ReceiptText,
                  accent: "bg-white",
                },
                {
                  label: "Remaining",
                  value: formatMntMillion(dashboardFinance.remainingMnt),
                  detail: "budget less expenditure, million MNT",
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
                          {formatMntMillion(row.budgetMnt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <p className="font-bold">{formatMntMillion(row.commitmentMnt)}</p>
                          <p className="text-xs text-[#718178]">{row.commitmentPercent}%</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <p className="font-bold">{formatMntMillion(row.expenditureMnt)}</p>
                          <p className="text-xs text-[#718178]">{row.spentPercent}%</p>
                        </TableCell>
                        <TableCell
                          className={`text-right font-black tabular-nums ${row.remainingMnt < 0 ? "text-rose-700" : "text-[#245f47]"}`}
                        >
                          {formatMntMillion(row.remainingMnt)}
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
              detail: `of ${workplan.meta.activityCount} activities in scope`,
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
              detail: `${stats.support} request ministry support`,
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
                {filtered.length} of {workplan.meta.activityCount} activities
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
              </NativeSelect>
            </div>
          </div>

          <div className="hidden grid-cols-[110px_minmax(340px,1.5fr)_minmax(190px,.7fr)_120px_120px_42px] gap-4 border-b border-[#e2e7e0] bg-[#f7f9f5] px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#718178] lg:grid">
            <span>Code</span>
            <span>Activity</span>
            <span>Workstream</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Update</span>
          </div>
          <div className="max-h-[720px] divide-y divide-[#e8ece6] overflow-y-auto">
            {filtered.map((item) => {
              const currentStatus = deriveActivityStatus(item, updates);
              const currentProgress = deriveActivityProgress(item, updates);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openActivity(item)}
                  className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-[#f7faf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2b7357] lg:grid-cols-[110px_minmax(340px,1.5fr)_minmax(190px,.7fr)_120px_120px_42px] lg:items-center lg:gap-4 lg:px-5"
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
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-[#53685c]">
                    {item.workstream || "Programme management"}
                  </p>
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
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="px-6 py-16 text-center">
              <SlidersHorizontal className="mx-auto mb-3 h-6 w-6 text-[#779083]" />
              <p className="font-bold">No activities match these filters</p>
              <p className="mt-1 text-sm text-[#718178]">
                Try a different status or search term.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setSection("all");
                  setGoal("all");
                  setStatus("all");
                  setWorkstream("all");
                  setMember("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </section>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "2026 budget",
                  value: formatMntMillion(financeStats.budgetMnt),
                  detail: "million MNT",
                  icon: WalletCards,
                  accent: "bg-[#0c3b2d] text-white",
                },
                {
                  label: "Commitments",
                  value: formatMntMillion(financeStats.commitmentMnt),
                  detail: `${formatMntMillion(financeStats.uncommittedMnt)} mln MNT uncommitted`,
                  icon: HandCoins,
                  accent: "bg-white",
                },
                {
                  label: "Expenditure",
                  value: formatMntMillion(financeStats.expenditureMnt),
                  detail: `${financeStats.spentPercent}% of filtered budget`,
                  icon: ReceiptText,
                  accent: "bg-white",
                },
                {
                  label: "Budget remaining",
                  value: formatMntMillion(financeStats.remainingMnt),
                  detail: "Budget less expenditure, million MNT",
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
              <div className="border-b border-[#e2e7e0] p-4 lg:flex lg:items-end lg:justify-between lg:p-5">
                <div className="mb-4 lg:mb-0">
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
                <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-row">
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
                  <Button
                    onClick={() => openFinanceDialog()}
                    className="h-10 bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                  >
                    <Plus className="h-4 w-4" />
                    Add finance entry
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[44%] pl-5">Budget line</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Committed</TableHead>
                      <TableHead className="text-right">Expenditure</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="w-24 pr-5 text-right">Entry</TableHead>
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
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="pl-5 align-top">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 rounded-md bg-[#e9f0e6] px-2 py-1 font-mono text-xs font-black text-[#2f634c]">
                                {line.code}
                              </span>
                              <div>
                                <p className="font-bold leading-5 text-[#183529]">
                                  {line.title}
                                </p>
                                <p className="mt-1 text-xs text-[#718178]">
                                  Section {line.section} · {line.goal || "No goal"} · {line.workstream || line.level}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {formatBudgetMillion(Number(line.budgetMntMillion))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMntMillion(totals.commitment)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMntMillion(totals.expenditure)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-black tabular-nums ${remainingMnt < 0 ? "text-rose-700" : "text-[#245f47]"}`}
                          >
                            {formatMntMillion(remainingMnt)}
                          </TableCell>
                          <TableCell className="pr-5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openFinanceDialog(line.id)}
                              aria-label={`Add finance entry for ${line.code}`}
                            >
                              <Plus className="h-4 w-4" />
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredBudgetLines.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <SlidersHorizontal className="mx-auto mb-3 h-6 w-6 text-[#779083]" />
                  <p className="font-bold">No budget lines match these filters</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setQuery("");
                      setSection("all");
                      setGoal("all");
                      setMember("all");
                    }}
                  >
                    Clear filters
                  </Button>
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
                      <TableHead className="pr-5 text-right">Amount (mln MNT)</TableHead>
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
                            {formatMntMillion(entry.amountMnt)}
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
                    Add the first commitment or expenditure to start tracking the balance.
                  </p>
                  <Button
                    onClick={() => openFinanceDialog()}
                    className="mt-4 bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                  >
                    <Plus className="h-4 w-4" />
                    Add finance entry
                  </Button>
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
              <div className="grid gap-2 sm:grid-cols-2 lg:flex">
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
              </div>
            </section>

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
                <Table className="min-w-[1180px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[270px] pl-5">Team member</TableHead>
                      <TableHead className="w-[190px]">Activity progress</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Commitment</TableHead>
                      <TableHead className="text-right">Expenditure</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="w-24 pr-5 text-right">Report</TableHead>
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
                          {formatMntMillion(item.budgetMnt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMntMillion(item.commitmentMnt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMntMillion(item.expenditureMnt)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-black tabular-nums ${item.remainingMnt < 0 ? "text-rose-700" : "text-[#245f47]"}`}
                        >
                          {formatMntMillion(item.remainingMnt)}
                        </TableCell>
                        <TableCell className="pr-5 text-right">
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

      <Dialog open={financeDialogOpen} onOpenChange={setFinanceDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add finance entry</DialogTitle>
            <DialogDescription>
              Record a commitment or expenditure against one approved 2026 budget line.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Budget line</span>
              <NativeSelect
                value={financeDraft.budgetKey}
                onChange={(event) =>
                  setFinanceDraft((current) => ({
                    ...current,
                    budgetKey: event.target.value,
                  }))
                }
                className="h-11 w-full border-[#cbd6cc] bg-white"
              >
                {allBudgetLines.map((line) => (
                  <NativeSelectOption key={line.id} value={line.id}>
                    {line.code} · {line.title}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
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
              <span className="mb-1.5 block text-sm font-bold">Amount (million MNT)</span>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                inputMode="decimal"
                value={financeDraft.amountMillion}
                onChange={(event) =>
                  setFinanceDraft((current) => ({
                    ...current,
                    amountMillion: event.target.value,
                  }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
                placeholder="For example, 25.5"
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

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent
          className="w-full gap-0 overflow-y-auto bg-white p-0 text-[#14241b] sm:max-w-2xl"
          side="right"
        >
          {selected && activeTarget && (
            <>
              <SheetHeader className="sticky top-0 z-10 border-b border-[#dce3da] bg-white/95 px-6 py-5 pr-14 backdrop-blur">
                <p className="font-mono text-sm font-black text-[#2f634c]">
                  {selected.code || selected.uid}
                </p>
                <SheetTitle className="text-xl font-black leading-tight tracking-[-0.025em]">
                  {selected.title}
                </SheetTitle>
                <SheetDescription className="text-[#718178]">
                  {selected.workstream || "Programme management"}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f3f7f1] p-4 text-sm sm:grid-cols-4">
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
                </div>

                <section className="rounded-2xl border border-[#d8e0d6] bg-[#fbfcfa] p-5">
                  <div className="mb-4">
                    <h3 className="font-black">Update progress</h3>
                    <p className="mt-1 text-sm text-[#718178]">
                      Choose the main activity or one of its sub-activities.
                    </p>
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
                        <Input
                          list="pcu-team-member-options"
                          value={draft.owner}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              owner: event.target.value,
                            }))
                          }
                          className="h-11 border-[#cbd6cc] bg-white"
                          placeholder="Responsible person"
                        />
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

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-bold">
                        Support needed
                      </span>
                      <Textarea
                        value={draft.supportNeeded}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            supportNeeded: event.target.value,
                          }))
                        }
                        className="min-h-20 border-[#cbd6cc] bg-white"
                        placeholder="Decision, coordination, or ministry support required"
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
                  </div>
                  <div className="divide-y divide-[#e4e9e2] rounded-2xl border border-[#dbe3d9]">
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
                      return (
                        <button
                          type="button"
                          key={sub.id}
                          onClick={() => loadTarget(targetForSubactivity(sub))}
                          className={`block w-full p-4 text-left transition-colors hover:bg-[#f6f9f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2b7357] ${editKey === sub.id ? "bg-[#f0f6ed]" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-bold leading-5">
                              {sub.title}
                            </p>
                            <div className="flex items-center gap-2">
                              <StatusPill status={currentStatus} />
                              <span className="hidden text-xs font-bold text-[#416552] sm:inline">
                                Edit
                              </span>
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
                          <p className="mt-2 text-xs text-[#718178]">
                            {saved?.owner || sub.owner || "Owner not recorded"}
                          </p>
                          {(saved?.note || sub.progressSummary) && (
                            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#53685c]">
                              {saved?.note || sub.progressSummary}
                            </p>
                          )}
                        </button>
                      );
                    })}
                    {selected.subactivities.length === 0 && (
                      <p className="p-4 text-sm text-[#718178]">
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
                      <dt className="text-[#718178]">2026 target</dt>
                      <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                        {selected.target || "—"}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <datalist id="pcu-team-member-options">
        {teamMembers.map((item) => (
          <option key={item.id} value={item.name}>
            {item.role}
          </option>
        ))}
      </datalist>
    </main>
  );
}
