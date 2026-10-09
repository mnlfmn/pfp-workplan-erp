"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Banknote,
  Bell,
  ChevronRight,
  CircleCheck,
  CopyPlus,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  Gauge,
  HandCoins,
  History,
  LayoutDashboard,
  ListChecks,
  Mail,
  Maximize2,
  Minimize2,
  PencilLine,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
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
import {
  translateUiText,
  type UiLanguage,
} from "@/lib/ui-language";
import {
  defaultMetadata,
  metadataCategories,
  metadataCategoryLabels,
  type MetadataCategory,
  type MetadataOption,
} from "@/lib/system-metadata";
import workplan from "@/lib/workplan-data.json";

type BaseActivity = (typeof workplan.activities)[number];
type ProcurementType = string;
type Subactivity = BaseActivity["subactivities"][number] & {
  procurementType?: ProcurementType;
};
type Activity = Omit<BaseActivity, "subactivities"> & {
  subactivities: Subactivity[];
  responsibilityOwner?: string;
};
type BudgetLine = (typeof workplan.budgetLines)[number] & {
  linkedActivityKeys?: string[];
};
type StatusKey = string;

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

type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4";

type QuarterlyProgressNotes = {
  version: 1;
  year: number;
  quarters: Record<QuarterKey, string>;
  legacy: string;
};

type QuarterlyUpdate = {
  id: string;
  activityKey: string;
  planYear: number;
  quarter: QuarterKey;
  note: string;
  status: StatusKey;
  progress: number;
  submittedAt: string;
  submittedBy: string;
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
  createdByName?: string;
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
  group: string;
  aliasesText: string;
  email: string;
  accessRole: "admin" | "member";
};

type AppSession = {
  userId: string;
  email: string;
  displayName: string;
  memberId: string;
  memberName: string;
  accessRole: "admin" | "member";
  isAdmin: boolean;
};

type WorkplanYear = {
  year: number;
  title: string;
  status: string;
  reportingDate: string;
  isEmpty?: boolean;
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
  support: string;
  owner: string;
  actionPlan: string;
  baseline: string;
  target: string;
};

type SubactivityPlanDraft = {
  title: string;
  owner: string;
  procurementType: ProcurementType;
  startDate: string;
  endDate: string;
  status: StatusKey;
  progressSummary: string;
};

type WorkplanPreview = {
  activityId: string;
  subactivityId?: string;
};

type BudgetLineDraft = {
  code: string;
  title: string;
  section: string;
  goal: string;
  workstream: string;
  level: string;
  amountMnt: string;
  linkedActivityKeys: string[];
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

type ContractPayment = {
  id: string;
  contractId: string;
  sequence: number;
  label: string;
  dueDate: string;
  deliverable: string;
  percentage: number;
  amountMnt: number;
  foreignAmountMinor: number;
  paid: number;
  paidAt: string;
  updatedAt: string;
};

type ContractRecord = {
  id: string;
  planYear: number;
  contractNumber: string;
  status: "draft" | "active" | "completed" | "closed";
  budgetKey: string;
  activityKey: string;
  torName: string;
  serviceProviderName: string;
  serviceProviderType: string;
  startDate: string;
  endDate: string;
  amountMnt: number;
  currency: "MNT" | "USD";
  foreignAmountMinor: number;
  exchangeRateMnt: number;
  transferredFromYear: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  payments: ContractPayment[];
};

type ContractPaymentDraft = {
  id: string;
  label: string;
  dueDate: string;
  deliverable: string;
  percentage: string;
  amountMnt: string;
  foreignAmount: string;
  paid: boolean;
  paidAt: string;
};

type ContractDraft = {
  contractNumber: string;
  status: ContractRecord["status"];
  budgetKey: string;
  activityKey: string;
  torName: string;
  serviceProviderName: string;
  serviceProviderType: string;
  startDate: string;
  endDate: string;
  amountMnt: string;
  currency: "MNT" | "USD";
  foreignAmount: string;
  exchangeRateMnt: string;
  payments: ContractPaymentDraft[];
};

type PaymentDocument = {
  id: string;
  contractId: string;
  paymentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
};

type BackupSnapshot = {
  id: string;
  createdAt: string;
  createdBy: string;
  source: string;
  recordCount: number;
};

type AuditSnapshotView = {
  resource: "activity_update" | "workplan_record" | "finance_entry" | "contract" | "team_member";
  data: unknown;
};

type AuditEntry = {
  id: string;
  entityType: "activity" | "finance" | "contract" | "team";
  entityKey: string;
  action: string;
  previousValue: AuditSnapshotView | null;
  newValue: AuditSnapshotView | null;
  changedAt: string;
  changedBy: string;
};

type AuditTarget = {
  entityType: AuditEntry["entityType"];
  entityKey: string;
  label: string;
};

const statusMeta: Record<
  string,
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
  delayed_externally: {
    label: "Delayed externally",
    tone: "bg-violet-50 text-violet-800 border-violet-200",
    dot: "bg-violet-600",
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

const statusChartColors: Record<string, string> = {
  completed: "#16825d",
  in_progress: "#2878c8",
  delayed: "#c44757",
  delayed_externally: "#7c3aed",
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
  support: "",
  owner: "",
  actionPlan: "",
  baseline: "",
  target: "",
};

const emptySubactivityDraft: SubactivityPlanDraft = {
  title: "",
  owner: "",
  procurementType: "Not applicable",
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
  linkedActivityKeys: [],
};

const defaultProviderTypes = [
  "Individual consultant",
  "Consulting firm",
  "Supplier",
  "Contractor",
  "NGO / CSO",
  "Government entity",
  "Other",
];

const contractStatusMeta: Record<
  ContractRecord["status"],
  { label: string; tone: string }
> = {
  draft: { label: "Draft", tone: "bg-slate-100 text-slate-700" },
  active: { label: "Active", tone: "bg-blue-50 text-blue-800" },
  completed: { label: "Completed", tone: "bg-emerald-50 text-emerald-800" },
  closed: { label: "Closed", tone: "bg-amber-50 text-amber-900" },
};

function ordinalPayment(value: number) {
  const remainder = value % 100;
  const suffix =
    remainder >= 11 && remainder <= 13
      ? "th"
      : value % 10 === 1
        ? "st"
        : value % 10 === 2
          ? "nd"
          : value % 10 === 3
            ? "rd"
            : "th";
  return `${value}${suffix} payment`;
}

function emptyContractDraft(year: number): ContractDraft {
  return {
    contractNumber: "",
    status: "active",
    budgetKey: "",
    activityKey: "",
    torName: "",
    serviceProviderName: "",
    serviceProviderType: defaultProviderTypes[0],
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    amountMnt: "",
    currency: "MNT",
    foreignAmount: "",
    exchangeRateMnt: "",
    payments: [
      {
        id: "",
        label: "1st payment",
        dueDate: `${year}-01-01`,
        deliverable: "",
        percentage: "100",
        amountMnt: "",
        foreignAmount: "",
        paid: false,
        paidAt: "",
      },
    ],
  };
}

function todayForInput() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const quarterKeys: QuarterKey[] = ["Q1", "Q2", "Q3", "Q4"];

function quarterForDate(value: string): QuarterKey {
  const month = Number(value.split("-")[1] ?? 1);
  return `Q${Math.min(4, Math.max(1, Math.ceil(month / 3)))}` as QuarterKey;
}

function emptyQuarterlyNotes(year: number): QuarterlyProgressNotes {
  return {
    version: 1,
    year,
    quarters: { Q1: "", Q2: "", Q3: "", Q4: "" },
    legacy: "",
  };
}

function parseQuarterlyNotes(raw: string, year: number): QuarterlyProgressNotes {
  if (!raw.trim()) return emptyQuarterlyNotes(year);
  try {
    const parsed = JSON.parse(raw) as Partial<QuarterlyProgressNotes>;
    if (parsed.version === 1 && parsed.quarters) {
      return {
        version: 1,
        year: Number(parsed.year) || year,
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
    // Existing plain-text notes are retained as legacy notes.
  }
  return { ...emptyQuarterlyNotes(year), legacy: raw };
}

function updateQuarterlyNote(
  raw: string,
  year: number,
  quarter: QuarterKey,
  value: string,
) {
  const notes = parseQuarterlyNotes(raw, year);
  notes.year = year;
  notes.quarters[quarter] = value;
  return JSON.stringify(notes);
}

function quarterlyUpdatesForExport(
  activityKey: string,
  raw: string,
  fallback: string,
  year: number,
  history: QuarterlyUpdate[],
) {
  const saved = parseQuarterlyNotes(raw, year);
  const quarters = { ...saved.quarters };

  history
    .filter(
      (entry) =>
        entry.activityKey === activityKey && entry.planYear === year,
    )
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))
    .forEach((entry) => {
      quarters[entry.quarter] = entry.note.trim();
    });

  if (!quarterKeys.some((quarter) => quarters[quarter].trim())) {
    const legacy = saved.legacy.trim() || fallback.trim();
    const sourceDate = String(workplan.meta.reportingDate ?? "");
    const sourceYear = Number(sourceDate.slice(0, 4));
    if (legacy && sourceYear === year) {
      quarters[quarterForDate(sourceDate)] = legacy;
    }
  }

  return quarters;
}

function quarterlyNoteCount(raw: string, year: number) {
  const notes = parseQuarterlyNotes(raw, year);
  return quarterKeys.filter((quarter) => notes.quarters[quarter].trim()).length;
}

function formatMnt(amountMnt: number) {
  return `₮${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(amountMnt))}`;
}

function formatUsd(amountMinor: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatDecimalInput(value: string | number) {
  const normalized = String(value).replace(/[^\d.]/g, "");
  const [whole = "", decimals = ""] = normalized.split(".");
  const grouped = whole ? new Intl.NumberFormat("en-US").format(Number(whole)) : "";
  return normalized.includes(".") ? `${grouped}.${decimals.slice(0, 2)}` : grouped;
}

function dollarsToMinor(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function formatNumberInput(value: string | number) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? new Intl.NumberFormat("en-US").format(Number(digits)) : "";
}

function formatDate(value: string, language: UiLanguage = "en") {
  if (!value) return language === "mn" ? "Огноогүй" : "No date";
  return new Intl.DateTimeFormat(language === "mn" ? "mn-MN" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatUpdatedAt(value: string, language: UiLanguage = "en") {
  if (!value) return "";
  return new Intl.DateTimeFormat(language === "mn" ? "mn-MN" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusPill({ status, label }: { status: StatusKey; label?: string }) {
  const meta = statusMetaFor(status);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {label ?? meta.label}
    </span>
  );
}

function statusMetaFor(status: StatusKey) {
  return (
    statusMeta[status] ?? {
      label: status
        .replaceAll("_", " ")
        .replace(/^./, (letter) => letter.toUpperCase()),
      tone: "bg-slate-50 text-slate-700 border-slate-200",
      dot: "bg-slate-500",
      weight: 0,
    }
  );
}

function statusChartColor(status: StatusKey) {
  return statusChartColors[status] ?? "#829089";
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
    baseOwner: activityOwner(activity, updates),
    baseNote: "",
  };
}

function targetForSubactivity(subactivity: Subactivity): EditableTarget {
  return {
    key: subactivity.id,
    label: subactivity.title,
    kind: "subactivity",
    baseStatus: subactivity.status as StatusKey,
    baseProgress: statusMetaFor(subactivity.status as StatusKey).weight,
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
  if (statuses.length && statuses.every((item) => item === statuses[0])) {
    return statuses[0];
  }
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
  return (
    activity.responsibilityOwner ||
    updates[activity.id]?.owner ||
    activity.technicalLead ||
    ""
  );
}

function supportPartnersForActivity(activity: Activity) {
  return Array.from(
    new Set(
      [activity.support, activity.partners]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  ).join("\n");
}

function procurementTypeForSubactivity(
  subactivity: Subactivity,
): ProcurementType {
  return String(subactivity.procurementType ?? "").trim() || "Not applicable";
}

function subactivityOwner(
  subactivity: Subactivity,
  updates: Record<string, UpdateRecord>,
) {
  return subactivity.owner || updates[subactivity.id]?.owner || "";
}

function canonicalOwnerName(value: string, members: TeamMember[]) {
  return ownerNames(value, members).join(" | ");
}

function ownerNames(value: string, members: TeamMember[]) {
  const normalized = value.trim().toLocaleLowerCase();
  if (!normalized) return [];
  const segments = value
    .split(/\s*\|\s*|\s*,\s*|[\r\n]+/)
    .map((item) => item.trim().toLocaleLowerCase())
    .filter(Boolean);
  const ordered = segments.flatMap((segment) => {
    const match = members.find((member) =>
      [member.name, ...member.aliases].some((alias) =>
        segment.includes(alias.toLocaleLowerCase()),
      ),
    );
    return match ? [match.name] : [];
  });
  if (!ordered.length) {
    return members
      .flatMap((member) => {
        const positions = [member.name, ...member.aliases]
          .map((alias) => normalized.indexOf(alias.toLocaleLowerCase()))
          .filter((position) => position >= 0);
        return positions.length ? [{ name: member.name, position: Math.min(...positions) }] : [];
      })
      .sort((a, b) => a.position - b.position)
      .map((item) => item.name)
      .slice(0, 3);
  }
  return Array.from(new Set(ordered)).slice(0, 3);
}

function responsibilityParts(value: string, members: TeamMember[]) {
  const names = ownerNames(value, members);
  return { accountable: names[0] ?? "", supporting: names.slice(1, 3) };
}

function auditData(snapshotValue: AuditSnapshotView | null) {
  if (!snapshotValue) return null;
  const raw = snapshotValue.data as Record<string, unknown> | null;
  if (!raw) return null;
  if (snapshotValue.resource === "workplan_record") {
    try {
      return {
        ...(JSON.parse(String(raw.payload ?? "{}")) as Record<string, unknown>),
        removed: Boolean(raw.isDeleted),
      };
    } catch {
      return raw;
    }
  }
  if (snapshotValue.resource === "contract") {
    const contract = (raw.contract ?? {}) as Record<string, unknown>;
    const payments = Array.isArray(raw.payments) ? raw.payments : [];
    return { ...contract, payments };
  }
  return raw;
}

const hiddenAuditFields = new Set([
  "id",
  "activityKey",
  "contractId",
  "createdAt",
  "updatedAt",
  "updatedBy",
  "createdBy",
  "planYear",
]);

function auditChanges(entry: AuditEntry) {
  const before = auditData(entry.previousValue);
  const after = auditData(entry.newValue);
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  return keys
    .filter((key) => !hiddenAuditFields.has(key))
    .filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))
    .slice(0, 12)
    .map((key) => ({ field: key, before: before?.[key], after: after?.[key] }));
}

function auditFieldLabel(value: string) {
  return value
    .replace(/Mnt$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatAuditValue(field: string, value: unknown) {
  if (value === undefined || value === null || value === "") return "—";
  if (/Mnt$/.test(field) && typeof value === "number") return formatMnt(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (field === "payments") {
      return `${value.length} payment${value.length === 1 ? "" : "s"}`;
    }
    return value.map(String).join(", ") || "—";
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replace(/_/g, " ");
}

function setOwnerSlot(
  value: string,
  index: number,
  nextOwner: string,
  members: TeamMember[],
) {
  const current = ownerNames(value, members);
  current[index] = nextOwner;
  return Array.from(new Set(current.filter(Boolean))).slice(0, 3).join(" | ");
}

function financeEntryCreatorName(entry: FinanceEntry, members: TeamMember[]) {
  const email = entry.createdBy.trim().toLocaleLowerCase();
  return (
    entry.createdByName ||
    members.find((member) => member.email.toLocaleLowerCase() === email)?.name ||
    entry.createdBy ||
    "Unknown user"
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
          statusMetaFor(item.status as StatusKey).weight,
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
    .filter((activity) => activityMatchesBudgetLine(activity, line))
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

function localizedTargetLabel(
  target: BudgetTarget,
  activities: Activity[],
  language: UiLanguage,
) {
  if (language === "en" || target.kind === "subactivity") return target.label;
  const activity = activities.find((item) => item.id === target.activityId);
  return activity?.titleMn?.trim() || target.label;
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

function activityMatchesBudgetLine(activity: Activity, line: BudgetLine) {
  if (Array.isArray(line.linkedActivityKeys)) {
    return line.linkedActivityKeys.includes(activity.id);
  }
  return (
    activity.section === line.section &&
    codesShareBudgetLine(activity.code, line.code)
  );
}

function linkedActivityKeysForEditor(line: BudgetLine, activities: Activity[]) {
  if (Array.isArray(line.linkedActivityKeys)) return line.linkedActivityKeys;
  return activities
    .filter(
      (activity) =>
        activity.section === line.section &&
        codesShareBudgetLine(activity.code, line.code),
    )
    .map((activity) => activity.id);
}

function budgetKeysForActivities(
  activities: Activity[],
  budgetLines: BudgetLine[],
) {
  return new Set(
    budgetLines
      .filter((line) =>
        activities.some((activity) => activityMatchesBudgetLine(activity, line)),
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

function contractPaidMnt(contract: ContractRecord) {
  return contract.payments
    .filter((payment) => Boolean(payment.paid))
    .reduce((total, payment) => total + payment.amountMnt, 0);
}

function contractCommitmentMnt(contract: ContractRecord) {
  if (contract.status === "closed") return 0;
  return Math.max(contract.amountMnt - contractPaidMnt(contract), 0);
}

function summarizeFinance(
  lines: BudgetLine[],
  entries: FinanceEntry[],
  contracts: ContractRecord[],
) {
  const keys = new Set(lines.map((line) => line.id));
  const budgetMnt = lines.reduce(
    (total, line) => total + Number(line.budgetMntMillion) * 1_000_000,
    0,
  );
  const relevantEntries = entries.filter((entry) => keys.has(entry.budgetKey));
  const relevantContracts = contracts.filter((contract) =>
    keys.has(contract.budgetKey),
  );
  const manualCommitmentMnt = relevantEntries
    .filter((entry) => entry.entryType === "commitment")
    .reduce((total, entry) => total + entry.amountMnt, 0);
  const manualExpenditureMnt = relevantEntries
    .filter((entry) => entry.entryType === "expenditure")
    .reduce((total, entry) => total + entry.amountMnt, 0);
  const commitmentMnt =
    manualCommitmentMnt +
    relevantContracts.reduce(
      (total, contract) => total + contractCommitmentMnt(contract),
      0,
    );
  const expenditureMnt =
    manualExpenditureMnt +
    relevantContracts.reduce(
      (total, contract) => total + contractPaidMnt(contract),
      0,
    );
  const linesWithEntries = new Set([
    ...relevantEntries.map((entry) => entry.budgetKey),
    ...relevantContracts.map((contract) => contract.budgetKey),
  ]);
  const remainingMnt = budgetMnt - commitmentMnt - expenditureMnt;
  return {
    budgetMnt,
    commitmentMnt,
    expenditureMnt,
    uncommittedMnt: remainingMnt,
    remainingMnt,
    commitmentPercent:
      budgetMnt > 0 ? Math.round((commitmentMnt / budgetMnt) * 100) : 0,
    spentPercent:
      budgetMnt > 0 ? Math.round((expenditureMnt / budgetMnt) * 100) : 0,
    financeCoveragePercent:
      lines.length > 0 ? Math.round((linesWithEntries.size / lines.length) * 100) : 0,
    relevantEntries,
    relevantContracts,
  };
}

export default function Home() {
  const [language, setLanguage] = useState<UiLanguage>("en");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const appRootRef = useRef<HTMLElement | null>(null);
  const textSourcesRef = useRef(new WeakMap<Text, string>());
  const attributeSourcesRef = useRef(
    new WeakMap<Element, Map<string, string>>(),
  );
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
  const [workplanExporting, setWorkplanExporting] = useState(false);
  const [contractExporting, setContractExporting] = useState(false);
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [yearDeleteOpen, setYearDeleteOpen] = useState(false);
  const [newYear, setNewYear] = useState(2027);
  const [copyCurrentYear, setCopyCurrentYear] = useState(false);
  const [yearSaving, setYearSaving] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [goal, setGoal] = useState("all");
  const [member, setMember] = useState("all");
  const [status, setStatus] = useState("all");
  const [workstream, setWorkstream] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workplanPreview, setWorkplanPreview] =
    useState<WorkplanPreview | null>(null);
  const [expandedWorkplanIds, setExpandedWorkplanIds] =
    useState<Set<string>>(new Set());
  const [workplanDensity, setWorkplanDensity] = useState<
    "compact" | "comfortable"
  >("compact");
  const [updates, setUpdates] = useState<Record<string, UpdateRecord>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    defaultTeamMembers,
  );
  const [metadata, setMetadata] = useState<
    Record<MetadataCategory, MetadataOption[]>
  >(defaultMetadata);
  const [metadataDrafts, setMetadataDrafts] = useState<
    Record<MetadataCategory, MetadataOption[]>
  >(defaultMetadata);
  const [metadataState, setMetadataState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [metadataSavingCategory, setMetadataSavingCategory] =
    useState<MetadataCategory | null>(null);
  const [selectedMetadataCategory, setSelectedMetadataCategory] =
    useState<MetadataCategory>("workstream");
  const [adminControlSection, setAdminControlSection] = useState<
    "users" | "metadata"
  >("users");
  const [teamDirectoryQuery, setTeamDirectoryQuery] = useState("");
  const [teamDirectoryMember, setTeamDirectoryMember] = useState("all");
  const [currentSession, setCurrentSession] = useState<AppSession | null>(null);
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
    email: "",
    accessRole: "member",
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
  const [noteQuarter, setNoteQuarter] = useState<QuarterKey>(() =>
    quarterForDate(todayForInput()),
  );
  const [saving, setSaving] = useState(false);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
  const [financeState, setFinanceState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [financeSaving, setFinanceSaving] = useState(false);
  const [editingFinanceId, setEditingFinanceId] = useState<number | null>(null);
  const [financeDeleteEntry, setFinanceDeleteEntry] =
    useState<FinanceEntry | null>(null);
  const [financeCreatorFilter, setFinanceCreatorFilter] = useState("all");
  const [financeDateFrom, setFinanceDateFrom] = useState("");
  const [financeDateTo, setFinanceDateTo] = useState("");
  const [financeDraft, setFinanceDraft] = useState<FinanceDraft>({
    budgetKey: baseBudgetLines[0]?.id ?? "",
    activityKey: "",
    entryType: "commitment",
    amountMnt: "",
    entryDate: todayForInput(),
    description: "",
    vendor: "",
  });
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [contractState, setContractState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [contractSaving, setContractSaving] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [contractToClose, setContractToClose] =
    useState<ContractRecord | null>(null);
  const [contractToDelete, setContractToDelete] =
    useState<ContractRecord | null>(null);
  const [paymentTransferDates, setPaymentTransferDates] = useState<Record<string, string>>({});
  const [contractQuery, setContractQuery] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState("all");
  const [expandedContractIds, setExpandedContractIds] =
    useState<Set<string>>(new Set());
  const [contractDraft, setContractDraft] = useState<ContractDraft>(() =>
    emptyContractDraft(2026),
  );
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
  const [planFormStep, setPlanFormStep] = useState(0);
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
  const [expandedFinanceActivityKeys, setExpandedFinanceActivityKeys] =
    useState<Set<string>>(new Set());
  const [expandedFinanceRecordKeys, setExpandedFinanceRecordKeys] =
    useState<Set<string>>(new Set());
  const [auditTarget, setAuditTarget] = useState<AuditTarget | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRestoreEntry, setAuditRestoreEntry] =
    useState<AuditEntry | null>(null);
  const [auditRestoring, setAuditRestoring] = useState(false);
  const [quarterlyHistory, setQuarterlyHistory] = useState<QuarterlyUpdate[]>([]);
  const [paymentDocuments, setPaymentDocuments] = useState<PaymentDocument[]>([]);
  const [documentUploadingId, setDocumentUploadingId] = useState("");
  const [backups, setBackups] = useState<BackupSnapshot[]>([]);
  const [backupSaving, setBackupSaving] = useState(false);
  const [backupPreview, setBackupPreview] = useState<{
    backup: BackupSnapshot;
    counts: Record<string, number>;
  } | null>(null);
  const [transferPreviewVisible, setTransferPreviewVisible] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [compareYear, setCompareYear] = useState(2026);
  const [comparePlan, setComparePlan] = useState<{
    year: number;
    activities: Activity[];
    budgetLines: BudgetLine[];
  } | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("pfp-interface-language");
    if (saved !== "mn" && saved !== "en") return;
    const timer = window.setTimeout(() => setLanguage(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!appRootRef.current) return;
    const root = document.body;
    document.documentElement.lang = language === "mn" ? "mn" : "en";
    document.title =
      language === "mn"
        ? "PFP Ажлын төлөвлөгөөний ERP систем"
        : "PFP Workplan ERP System";

    const processText = (node: Text) => {
      const parent = node.parentElement;
      if (
        !parent ||
        ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName) ||
        parent.closest("[data-no-translate]")
      ) {
        return;
      }
      const current = node.data;
      let source = textSourcesRef.current.get(node);
      if (
        source === undefined ||
        (current !== source && current !== translateUiText(source, "mn"))
      ) {
        source = current;
        textSourcesRef.current.set(node, source);
      }
      const next = translateUiText(source, language);
      if (current !== next) node.data = next;
    };

    const processElement = (element: Element) => {
      const attributeNames = ["placeholder", "aria-label", "title"];
      let sources = attributeSourcesRef.current.get(element);
      if (!sources) {
        sources = new Map<string, string>();
        attributeSourcesRef.current.set(element, sources);
      }
      for (const name of attributeNames) {
        const current = element.getAttribute(name);
        if (current === null) continue;
        let source = sources.get(name);
        if (
          source === undefined ||
          (current !== source && current !== translateUiText(source, "mn"))
        ) {
          source = current;
          sources.set(name, source);
        }
        const next = translateUiText(source, language);
        if (current !== next) element.setAttribute(name, next);
      }
    };

    const processTree = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) processText(node as Text);
      if (node.nodeType === Node.ELEMENT_NODE) {
        processElement(node as Element);
      }
      const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let current = walker.nextNode();
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) processText(current as Text);
        else processElement(current as Element);
        current = walker.nextNode();
      }
    };

    processTree(root);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") processText(record.target as Text);
        if (record.type === "attributes") processElement(record.target as Element);
        for (const node of record.addedNodes) processTree(node);
      }
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title"],
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [language]);

  function changeLanguage(next: UiLanguage) {
    setLanguage(next);
    window.localStorage.setItem("pfp-interface-language", next);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.error("Full screen could not be opened.", {
        description: "Open the ERP system directly in Chrome and try again.",
      });
    }
  }

  async function openAuditHistory(target: AuditTarget) {
    setAuditTarget(target);
    setAuditHistory([]);
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({
        entityType: target.entityType,
        entityKey: target.entityKey,
      });
      const response = await fetch(`/api/audit?${params.toString()}`);
      const result = (await response.json()) as {
        history?: AuditEntry[];
        error?: string;
      };
      if (!response.ok || !result.history) {
        throw new Error(result.error || "Change history could not be loaded.");
      }
      setAuditHistory(result.history);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Change history could not be loaded.",
      );
    } finally {
      setAuditLoading(false);
    }
  }

  async function restoreAuditVersion() {
    if (!auditRestoreEntry || !currentSession?.isAdmin) return;
    setAuditRestoring(true);
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: auditRestoreEntry.id }),
      });
      const result = (await response.json()) as { restored?: boolean; error?: string };
      if (!response.ok || !result.restored) {
        throw new Error(result.error || "The earlier value could not be restored.");
      }
      toast.success("Earlier value restored");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The earlier value could not be restored.",
      );
      setAuditRestoring(false);
      setAuditRestoreEntry(null);
    }
  }

  const selected = useMemo(
    () => allActivities.find((item) => item.id === selectedId) ?? null,
    [allActivities, selectedId],
  );

  const workplanPreviewActivity = useMemo(
    () =>
      allActivities.find(
        (item) => item.id === workplanPreview?.activityId,
      ) ?? null,
    [allActivities, workplanPreview],
  );

  const workplanPreviewSubactivity = useMemo(
    () =>
      workplanPreviewActivity?.subactivities.find(
        (item) => item.id === workplanPreview?.subactivityId,
      ) ?? null,
    [workplanPreview, workplanPreviewActivity],
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

  const activeQuarterlyNotes = useMemo(
    () => parseQuarterlyNotes(draft.note, selectedYear),
    [draft.note, selectedYear],
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

  const openUpdateEditor = useCallback(
    (target: EditableTarget) => {
      loadTarget(target);
      setFormDirty(true);
    },
    [loadTarget],
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
    fetch("/api/session")
      .then(async (response) => {
        const result = (await response.json()) as {
          session?: AppSession;
          error?: string;
        };
        if (!response.ok || !result.session) {
          throw new Error(result.error || "Account information is unavailable");
        }
        return result.session;
      })
      .then((session) => {
        if (active) setCurrentSession(session);
      })
      .catch(() => {
        if (active) setCurrentSession(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
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
    fetch(`/api/contracts?year=${selectedYear}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          contracts?: ContractRecord[];
          error?: string;
        };
        if (!response.ok || !result.contracts) {
          throw new Error(result.error || "Contracts unavailable");
        }
        return result.contracts;
      })
      .then((items) => {
        if (!active) return;
        setContracts(items);
        setContractState("ready");
      })
      .catch(() => {
        if (!active) return;
        setContracts([]);
        setContractState("unavailable");
      });
    return () => {
      active = false;
    };
  }, [selectedYear]);

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

  useEffect(() => {
    let active = true;
    fetch("/api/metadata")
      .then(async (response) => {
        const result = (await response.json()) as {
          metadata?: Record<MetadataCategory, MetadataOption[]>;
        };
        if (!response.ok || !result.metadata) {
          throw new Error("Metadata unavailable");
        }
        return result.metadata;
      })
      .then((items) => {
        if (!active) return;
        setMetadata(items);
        setMetadataDrafts(items);
        setMetadataState("ready");
      })
      .catch(() => {
        if (!active) return;
        setMetadata(defaultMetadata);
        setMetadataDrafts(defaultMetadata);
        setMetadataState("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/quarterly-updates?year=${selectedYear}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          history?: QuarterlyUpdate[];
        };
        if (!response.ok) throw new Error("Quarterly history unavailable");
        return result.history ?? [];
      })
      .then((history) => {
        if (active) setQuarterlyHistory(history);
      })
      .catch(() => {
        if (active) setQuarterlyHistory([]);
      });
    return () => {
      active = false;
    };
  }, [selectedYear]);

  useEffect(() => {
    if (!currentSession?.isAdmin) return;
    let active = true;
    fetch("/api/backups")
      .then(async (response) => {
        const result = (await response.json()) as { backups?: BackupSnapshot[] };
        if (!response.ok) throw new Error("Backups unavailable");
        return result.backups ?? [];
      })
      .then((items) => {
        if (active) setBackups(items);
      })
      .catch(() => {
        if (active) setBackups([]);
      });
    return () => {
      active = false;
    };
  }, [currentSession?.isAdmin]);

  useEffect(() => {
    const saved = window.localStorage.getItem("pfp-erp-filters");
    if (!saved) return;
    const timer = window.setTimeout(() => {
      try {
        const filters = JSON.parse(saved) as Record<string, string>;
        setQuery(filters.query ?? "");
        setSection(filters.section ?? "all");
        setGoal(filters.goal ?? "all");
        setMember(filters.member ?? "all");
        setStatus(filters.status ?? "all");
        setWorkstream(filters.workstream ?? "all");
        setFinanceCreatorFilter(filters.financeCreatorFilter ?? "all");
        setFinanceDateFrom(filters.financeDateFrom ?? "");
        setFinanceDateTo(filters.financeDateTo ?? "");
        setContractQuery(filters.contractQuery ?? "");
        setContractStatusFilter(filters.contractStatusFilter ?? "all");
      } catch {
        window.localStorage.removeItem("pfp-erp-filters");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "pfp-erp-filters",
      JSON.stringify({
        query,
        section,
        goal,
        member,
        status,
        workstream,
        financeCreatorFilter,
        financeDateFrom,
        financeDateTo,
        contractQuery,
        contractStatusFilter,
      }),
    );
  }, [
    contractQuery,
    contractStatusFilter,
    financeCreatorFilter,
    financeDateFrom,
    financeDateTo,
    goal,
    member,
    query,
    section,
    status,
    workstream,
  ]);

  useEffect(() => {
    if (!formDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [formDirty]);

  function changeFormDialog(
    open: boolean,
    setOpen: (value: boolean) => void,
  ) {
    if (
      !open &&
      formDirty &&
      !window.confirm("You have unsaved changes. Leave this form without saving?")
    ) {
      return false;
    }
    setOpen(open);
    if (!open) setFormDirty(false);
    return true;
  }

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
        note: draft.note,
        supportNeeded: updates[activeTarget.key]?.supportNeeded ?? "",
      });
      const quarterlyNote = parseQuarterlyNotes(
        draft.note,
        selectedYear,
      ).quarters[noteQuarter].trim();
      const latestForQuarter = quarterlyHistory.find(
        (item) =>
          item.activityKey === activeTarget.key &&
          item.planYear === selectedYear &&
          item.quarter === noteQuarter,
      );
      if (quarterlyNote && latestForQuarter?.note !== quarterlyNote) {
        const historyResponse = await fetch("/api/quarterly-updates", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            activityKey: activeTarget.key,
            planYear: selectedYear,
            quarter: noteQuarter,
            note: quarterlyNote,
            status: update.status,
            progress: update.progress,
          }),
        });
        const historyResult = (await historyResponse.json()) as {
          entry?: QuarterlyUpdate;
          error?: string;
        };
        if (!historyResponse.ok || !historyResult.entry) {
          throw new Error(historyResult.error || "Quarterly history could not be saved.");
        }
        setQuarterlyHistory((current) => [historyResult.entry!, ...current]);
      }
      setFormDirty(false);
      toast.success("Workplan update saved", {
        description: `${metadataLabel("status", update.status)} · ${update.progress}%`,
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

  const openFinanceDialog = useCallback(
    (budgetKey: string, activityKey: string, entry?: FinanceEntry) => {
      setEditingFinanceId(entry?.id ?? null);
      setFinanceDraft({
        budgetKey,
        activityKey,
        entryType: entry?.entryType ?? "commitment",
        amountMnt: entry ? formatNumberInput(entry.amountMnt) : "",
        entryDate: entry?.entryDate ?? todayForInput(),
        description: entry?.description ?? "",
        vendor: entry?.vendor ?? "",
      });
      setFormDirty(true);
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
    }, id?: number) => {
      const response = await fetch("/api/finance", {
        method: id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(id ? { ...payload, id } : payload),
      });
      const result = (await response.json()) as {
        entry?: FinanceEntry;
        error?: string;
      };
      if (!response.ok || !result.entry) {
        throw new Error(result.error || "The finance entry could not be saved.");
      }
      setFinanceEntries((current) =>
        id
          ? current.map((entry) =>
              entry.id === result.entry!.id ? result.entry! : entry,
            )
          : [result.entry!, ...current],
      );
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
      const entry = await persistFinanceEntry(
        {
          budgetKey: financeDraft.budgetKey,
          activityKey: financeDraft.activityKey,
          entryType: financeDraft.entryType,
          amountMnt,
          entryDate: financeDraft.entryDate,
          description: financeDraft.description,
          vendor: financeDraft.vendor,
        },
        editingFinanceId ?? undefined,
      );
      setFinanceDialogOpen(false);
      setEditingFinanceId(null);
      setFormDirty(false);
      toast.success(
        editingFinanceId
          ? "Finance entry updated"
          : financeDraft.entryType === "commitment"
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

  async function removeFinanceEntry() {
    if (!financeDeleteEntry) return;
    setFinanceSaving(true);
    try {
      const response = await fetch("/api/finance", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: financeDeleteEntry.id }),
      });
      const result = (await response.json()) as {
        deletedId?: number;
        error?: string;
      };
      if (!response.ok || !result.deletedId) {
        throw new Error(result.error || "The finance entry could not be removed.");
      }
      setFinanceEntries((current) =>
        current.filter((entry) => entry.id !== result.deletedId),
      );
      setFinanceDeleteEntry(null);
      if (editingFinanceId === result.deletedId) {
        setFinanceDialogOpen(false);
        setEditingFinanceId(null);
      }
      toast.success("Finance entry removed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The finance entry could not be removed.",
      );
    } finally {
      setFinanceSaving(false);
    }
  }

  function budgetLineForTarget(activityKey: string) {
    const activity = allActivities.find(
      (item) =>
        item.id === activityKey ||
        item.subactivities.some((subactivity) => subactivity.id === activityKey),
    );
    if (!activity) return null;
    return (
      allBudgetLines.find(
        (line) =>
          line.section === activity.section &&
          codesShareBudgetLine(activity.code, line.code),
      ) ?? null
    );
  }

  function openAddContract() {
    setEditingContractId(null);
    setContractDraft({
      ...emptyContractDraft(selectedYear),
      serviceProviderType:
        metadata.service_provider_type[0]?.value ?? defaultProviderTypes[0],
    });
    setFormDirty(true);
    setContractDialogOpen(true);
  }

  function openEditContract(contract: ContractRecord) {
    setEditingContractId(contract.id);
    setContractDraft({
      contractNumber: contract.contractNumber,
      status: contract.status,
      budgetKey: contract.budgetKey,
      activityKey: contract.activityKey,
      torName: contract.torName,
      serviceProviderName: contract.serviceProviderName,
      serviceProviderType: contract.serviceProviderType,
      startDate: contract.startDate,
      endDate: contract.endDate,
      amountMnt: formatNumberInput(contract.amountMnt),
      currency: contract.currency || "MNT",
      foreignAmount:
        contract.currency === "USD"
          ? formatDecimalInput((contract.foreignAmountMinor || 0) / 100)
          : "",
      exchangeRateMnt:
        contract.currency === "USD"
          ? formatNumberInput(contract.exchangeRateMnt || 0)
          : "",
      payments: contract.payments.map((payment) => ({
        id: payment.id,
        label: payment.label,
        dueDate: payment.dueDate,
        deliverable: payment.deliverable,
        percentage: String(payment.percentage),
        amountMnt: formatNumberInput(payment.amountMnt),
        foreignAmount:
          contract.currency === "USD"
            ? formatDecimalInput((payment.foreignAmountMinor || 0) / 100)
            : "",
        paid: Boolean(payment.paid),
        paidAt: payment.paidAt,
      })),
    });
    setFormDirty(true);
    setContractDialogOpen(true);
  }

  function selectContractTarget(activityKey: string) {
    const line = budgetLineForTarget(activityKey);
    setContractDraft((current) => ({
      ...current,
      activityKey,
      budgetKey: line?.id ?? "",
    }));
  }

  function updateContractTotal(value: string) {
    const formatted = formatNumberInput(value);
    const total = Number(formatted.replace(/,/g, ""));
    setContractDraft((current) => ({
      ...current,
      amountMnt: formatted,
      payments: current.payments.map((payment, index) => {
        const percentage = Number(payment.percentage);
        const amount =
          Number.isSafeInteger(total) && total > 0 && percentage > 0
            ? index === current.payments.length - 1 &&
              current.payments.reduce(
                (sum, item) => sum + Number(item.percentage || 0),
                0,
              ) === 100
              ? total -
                current.payments
                  .slice(0, -1)
                  .reduce(
                    (sum, item) =>
                      sum + Math.round((total * Number(item.percentage || 0)) / 100),
                    0,
                  )
              : Math.round((total * percentage) / 100)
            : 0;
        return {
          ...payment,
          amountMnt: amount > 0 ? formatNumberInput(amount) : "",
        };
      }),
    }));
  }

  function updateContractForeignTotal(value: string) {
    const formatted = formatDecimalInput(value);
    const totalMinor = dollarsToMinor(formatted);
    setContractDraft((current) => {
      const rate = Number(current.exchangeRateMnt.replace(/,/g, ""));
      const amountMnt = Math.round((totalMinor / 100) * (rate || 0));
      let assignedMinor = 0;
      let assignedMnt = 0;
      const payments = current.payments.map((payment, index) => {
        const percentage = Number(payment.percentage || 0);
        const last = index === current.payments.length - 1;
        const foreignMinor = last
          ? Math.max(totalMinor - assignedMinor, 0)
          : Math.round((totalMinor * percentage) / 100);
        const paymentMnt = last
          ? Math.max(amountMnt - assignedMnt, 0)
          : Math.round((foreignMinor / 100) * (rate || 0));
        assignedMinor += foreignMinor;
        assignedMnt += paymentMnt;
        return {
          ...payment,
          foreignAmount: foreignMinor ? formatDecimalInput(foreignMinor / 100) : "",
          amountMnt: paymentMnt ? formatNumberInput(paymentMnt) : "",
        };
      });
      return {
        ...current,
        foreignAmount: formatted,
        amountMnt: amountMnt ? formatNumberInput(amountMnt) : "",
        payments,
      };
    });
  }

  function updateContractExchangeRate(value: string) {
    const formatted = formatNumberInput(value);
    setContractDraft((current) => {
      const rate = Number(formatted.replace(/,/g, ""));
      const totalMinor = dollarsToMinor(current.foreignAmount);
      const amountMnt = Math.round((totalMinor / 100) * (rate || 0));
      let assignedMnt = 0;
      const payments = current.payments.map((payment, index) => {
        const foreignMinor = dollarsToMinor(payment.foreignAmount);
        const last = index === current.payments.length - 1;
        const paymentMnt = last
          ? Math.max(amountMnt - assignedMnt, 0)
          : Math.round((foreignMinor / 100) * (rate || 0));
        assignedMnt += paymentMnt;
        return { ...payment, amountMnt: paymentMnt ? formatNumberInput(paymentMnt) : "" };
      });
      return {
        ...current,
        exchangeRateMnt: formatted,
        amountMnt: amountMnt ? formatNumberInput(amountMnt) : "",
        payments,
      };
    });
  }

  function updateContractPayment(
    index: number,
    field: keyof ContractPaymentDraft,
    value: string,
  ) {
    setContractDraft((current) => {
      const payments = current.payments.map((payment, paymentIndex) => {
        if (paymentIndex !== index) return payment;
        const next = { ...payment, [field]: value };
        if (field === "percentage") {
          const total = Number(current.amountMnt.replace(/,/g, ""));
          const percentage = Number(value);
          if (current.currency === "USD") {
            const totalMinor = dollarsToMinor(current.foreignAmount);
            const foreignMinor = Math.round((totalMinor * percentage) / 100);
            const rate = Number(current.exchangeRateMnt.replace(/,/g, ""));
            next.foreignAmount = foreignMinor
              ? formatDecimalInput(foreignMinor / 100)
              : "";
            next.amountMnt = foreignMinor && rate
              ? formatNumberInput(Math.round((foreignMinor / 100) * rate))
              : "";
          } else {
            next.amountMnt =
              total > 0 && percentage > 0
                ? formatNumberInput(Math.round((total * percentage) / 100))
                : "";
          }
        }
        if (field === "amountMnt") next.amountMnt = formatNumberInput(value);
        if (field === "foreignAmount") {
          next.foreignAmount = formatDecimalInput(value);
          const rate = Number(current.exchangeRateMnt.replace(/,/g, ""));
          next.amountMnt = rate
            ? formatNumberInput(Math.round((dollarsToMinor(next.foreignAmount) / 100) * rate))
            : "";
        }
        return next;
      });
      return { ...current, payments };
    });
  }

  function addContractPayment() {
    setContractDraft((current) => ({
      ...current,
      payments: [
        ...current.payments,
        {
          id: "",
          label: ordinalPayment(current.payments.length + 1),
          dueDate: current.endDate,
          deliverable: "",
          percentage: "",
          amountMnt: "",
          foreignAmount: "",
          paid: false,
          paidAt: "",
        },
      ],
    }));
  }

  function removeContractPayment(index: number) {
    setContractDraft((current) => ({
      ...current,
      payments: current.payments.filter((_, paymentIndex) => paymentIndex !== index),
    }));
  }

  async function saveContract() {
    const amountMnt = Number(contractDraft.amountMnt.replace(/[\s,]/g, ""));
    const foreignAmountMinor = dollarsToMinor(contractDraft.foreignAmount);
    const exchangeRateMnt = Number(
      contractDraft.exchangeRateMnt.replace(/[\s,]/g, ""),
    );
    let payments = contractDraft.payments.map((payment) => ({
      ...payment,
      percentage: Number(payment.percentage),
      amountMnt: Number(payment.amountMnt.replace(/[\s,]/g, "")),
      foreignAmountMinor:
        contractDraft.currency === "USD"
          ? dollarsToMinor(payment.foreignAmount)
          : 0,
    }));
    if (!contractDraft.activityKey || !contractDraft.budgetKey) {
      toast.error("Choose a workplan activity or sub-activity.");
      return;
    }
    if (!Number.isSafeInteger(amountMnt) || amountMnt <= 0) {
      toast.error("Enter a whole tugrik contract amount greater than zero.");
      return;
    }
    if (
      contractDraft.currency === "USD" &&
      (!foreignAmountMinor ||
        !Number.isSafeInteger(exchangeRateMnt) ||
        exchangeRateMnt <= 0)
    ) {
      toast.error("Enter the USD amount and signed exchange rate.");
      return;
    }
    if (contractDraft.currency === "USD" && payments.length) {
      let allocatedMnt = 0;
      payments = payments.map((payment, index) => {
        const paymentAmount =
          index === payments.length - 1
            ? amountMnt - allocatedMnt
            : Math.round((payment.foreignAmountMinor / 100) * exchangeRateMnt);
        allocatedMnt += paymentAmount;
        return { ...payment, amountMnt: paymentAmount };
      });
    }
    const paymentAmountTotal = payments.reduce(
      (total, payment) => total + payment.amountMnt,
      0,
    );
    const percentageTotal = payments.reduce(
      (total, payment) => total + payment.percentage,
      0,
    );
    if (paymentAmountTotal !== amountMnt || percentageTotal !== 100) {
      toast.error("Payments must total the contract amount and 100%.");
      return;
    }
    setContractSaving(true);
    try {
      const response = await fetch("/api/contracts", {
        method: editingContractId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(editingContractId ? { id: editingContractId } : {}),
          ...contractDraft,
          planYear: selectedYear,
          amountMnt,
          foreignAmountMinor,
          exchangeRateMnt,
          payments,
        }),
      });
      const result = (await response.json()) as {
        contract?: ContractRecord;
        error?: string;
      };
      if (!response.ok || !result.contract) {
        throw new Error(result.error || "The contract could not be saved.");
      }
      setContracts((current) =>
        editingContractId
          ? current.map((contract) =>
              contract.id === result.contract!.id ? result.contract! : contract,
            )
          : [result.contract!, ...current],
      );
      setContractDialogOpen(false);
      setEditingContractId(null);
      setFormDirty(false);
      setContractState("ready");
      toast.success(editingContractId ? "Contract updated" : "Contract added", {
        description: `${result.contract.contractNumber} · ${formatMnt(result.contract.amountMnt)}`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The contract could not be saved.",
      );
    } finally {
      setContractSaving(false);
    }
  }

  async function setPaymentPaid(
    contract: ContractRecord,
    payment: ContractPayment,
    paid: boolean,
  ) {
    const transferDate = paymentTransferDates[payment.id] || payment.paidAt;
    if (paid && !/^\d{4}-\d{2}-\d{2}$/.test(transferDate)) {
      toast.error("Choose the exact payment transfer date first.");
      return;
    }
    setContractSaving(true);
    try {
      const response = await fetch("/api/contracts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "set_payment_paid",
          paymentId: payment.id,
          paid,
          paidAt: paid ? transferDate : "",
        }),
      });
      const result = (await response.json()) as {
        contract?: ContractRecord;
        error?: string;
      };
      if (!response.ok || !result.contract) {
        throw new Error(result.error || "Payment status could not be changed.");
      }
      setContracts((current) =>
        current.map((item) =>
          item.id === contract.id ? result.contract! : item,
        ),
      );
      setPaymentTransferDates((current) => ({
        ...current,
        [payment.id]: paid ? transferDate : "",
      }));
      toast.success(paid ? "Payment marked as paid" : "Payment marked as unpaid", {
        description: formatMnt(payment.amountMnt),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Payment status could not be changed.",
      );
    } finally {
      setContractSaving(false);
    }
  }

  async function deleteContract() {
    if (!contractToDelete) return;
    setContractSaving(true);
    try {
      const response = await fetch("/api/contracts", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: contractToDelete.id }),
      });
      const result = (await response.json()) as { deletedId?: string; error?: string };
      if (!response.ok || !result.deletedId) {
        throw new Error(result.error || "The contract could not be deleted.");
      }
      setContracts((current) => current.filter((item) => item.id !== result.deletedId));
      setPaymentDocuments((current) =>
        current.filter((document) => document.contractId !== result.deletedId),
      );
      setContractToDelete(null);
      toast.success("Contract deleted", {
        description: "Its unpaid commitment, payments, and attachments were removed.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The contract could not be deleted.");
    } finally {
      setContractSaving(false);
    }
  }

  async function closeContract() {
    if (!contractToClose) return;
    setContractSaving(true);
    try {
      const response = await fetch("/api/contracts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "close_contract",
          id: contractToClose.id,
        }),
      });
      const result = (await response.json()) as {
        contract?: ContractRecord;
        error?: string;
      };
      if (!response.ok || !result.contract) {
        throw new Error(result.error || "The contract could not be closed.");
      }
      setContracts((current) =>
        current.map((item) =>
          item.id === result.contract!.id ? result.contract! : item,
        ),
      );
      setContractToClose(null);
      toast.success("Contract closed", {
        description: "Any unpaid balance was released from commitments.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The contract could not be closed.",
      );
    } finally {
      setContractSaving(false);
    }
  }

  async function loadContractDocuments(contractId: string) {
    try {
      const response = await fetch(
        `/api/documents?contractId=${encodeURIComponent(contractId)}`,
      );
      const result = (await response.json()) as {
        documents?: PaymentDocument[];
      };
      if (!response.ok) throw new Error("Documents unavailable");
      setPaymentDocuments((current) => [
        ...current.filter((item) => item.contractId !== contractId),
        ...(result.documents ?? []),
      ]);
    } catch {
      toast.error("Payment documents could not be loaded.");
    }
  }

  async function uploadPaymentDocument(
    contract: ContractRecord,
    payment: ContractPayment,
    file: File | undefined,
  ) {
    if (!file) return;
    setDocumentUploadingId(payment.id);
    try {
      const form = new FormData();
      form.set("contractId", contract.id);
      form.set("paymentId", payment.id);
      form.set("file", file);
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const result = (await response.json()) as {
        document?: PaymentDocument;
        error?: string;
      };
      if (!response.ok || !result.document) {
        throw new Error(result.error || "Document upload failed.");
      }
      setPaymentDocuments((current) => [...current, result.document!]);
      toast.success("Payment document uploaded", {
        description: result.document.fileName,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Document upload failed.",
      );
    } finally {
      setDocumentUploadingId("");
    }
  }

  async function createBackup() {
    setBackupSaving(true);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", source: "manual" }),
      });
      const result = (await response.json()) as {
        backup?: BackupSnapshot;
        error?: string;
      };
      if (!response.ok || !result.backup) {
        throw new Error(result.error || "Backup could not be created.");
      }
      setBackups((current) => [result.backup!, ...current]);
      toast.success("Backup created", {
        description: `${result.backup.recordCount} records saved`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backup failed.");
    } finally {
      setBackupSaving(false);
    }
  }

  async function previewBackup(backup: BackupSnapshot) {
    setBackupSaving(true);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "preview", id: backup.id }),
      });
      const result = (await response.json()) as {
        backup?: BackupSnapshot;
        counts?: Record<string, number>;
        error?: string;
      };
      if (!response.ok || !result.backup || !result.counts) {
        throw new Error(result.error || "Backup preview failed.");
      }
      setBackupPreview({ backup: result.backup, counts: result.counts });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backup preview failed.");
    } finally {
      setBackupSaving(false);
    }
  }

  async function restoreBackup() {
    if (!backupPreview) return;
    setBackupSaving(true);
    try {
      const response = await fetch("/api/backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          id: backupPreview.backup.id,
          confirmId: backupPreview.backup.id,
        }),
      });
      const result = (await response.json()) as {
        restored?: boolean;
        error?: string;
      };
      if (!response.ok || !result.restored) {
        throw new Error(result.error || "Backup could not be restored.");
      }
      setBackupPreview(null);
      toast.success("Backup restored", {
        description: "Reloading the restored ERP data.",
      });
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setBackupSaving(false);
    }
  }

  function addMetadataOption(category: MetadataCategory) {
    const value = `custom_${crypto.randomUUID().slice(0, 8)}`;
    setMetadataDrafts((current) => ({
      ...current,
      [category]: [
        ...current[category],
        {
          id: `${category}:${value}`,
          category,
          value,
          label: "New option",
          sortOrder: current[category].length,
        },
      ],
    }));
  }

  function updateMetadataOption(
    category: MetadataCategory,
    value: string,
    label: string,
  ) {
    setMetadataDrafts((current) => ({
      ...current,
      [category]: current[category].map((item) =>
        item.value === value ? { ...item, label } : item,
      ),
    }));
  }

  function removeMetadataOption(category: MetadataCategory, value: string) {
    setMetadataDrafts((current) => {
      if (current[category].length <= 1) return current;
      return {
        ...current,
        [category]: current[category]
          .filter((item) => item.value !== value)
          .map((item, index) => ({ ...item, sortOrder: index })),
      };
    });
  }

  function moveMetadataOption(
    category: MetadataCategory,
    value: string,
    direction: -1 | 1,
  ) {
    setMetadataDrafts((current) => {
      const items = [...current[category]];
      const index = items.findIndex((item) => item.value === value);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return current;
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      return {
        ...current,
        [category]: items.map((item, sortOrder) => ({ ...item, sortOrder })),
      };
    });
  }

  async function saveMetadataCategory(category: MetadataCategory) {
    if (!currentSession?.isAdmin) return;
    const options = metadataDrafts[category].map((item) => ({
      value: item.value,
      label: item.label.trim(),
    }));
    if (options.some((item) => !item.label)) {
      toast.error("Every option needs a visible name.");
      return;
    }
    setMetadataSavingCategory(category);
    try {
      const response = await fetch("/api/metadata", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, options }),
      });
      const result = (await response.json()) as {
        metadata?: Record<MetadataCategory, MetadataOption[]>;
        error?: string;
      };
      if (!response.ok || !result.metadata) {
        throw new Error(result.error || "Metadata could not be saved.");
      }
      setMetadata(result.metadata);
      setMetadataDrafts(result.metadata);
      setMetadataState("ready");
      toast.success(`${metadataCategoryLabels[category]} updated`, {
        description: "The option names are now used throughout the system.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Metadata could not be saved.");
    } finally {
      setMetadataSavingCategory(null);
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
    const emptyDraft = workplanYears.find(
      (item) =>
        item.year > selectedYear && item.status === "draft" && item.isEmpty,
    );
    const latest = Math.max(...workplanYears.map((item) => item.year), selectedYear);
    setNewYear(emptyDraft?.year ?? latest + 1);
    setCopyCurrentYear(false);
    setTransferPreviewVisible(false);
    setYearDialogOpen(true);
  }

  async function createWorkplanYear() {
    if (!Number.isInteger(newYear) || newYear <= selectedYear || newYear > 2100) {
      toast.error("Choose a future year after the currently selected workplan.");
      return;
    }
    if (!transferPreviewVisible) {
      setTransferPreviewVisible(true);
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
        transferSummary?: {
          activities: number;
          subactivities: number;
          budgetLines: number;
          contracts: number;
        };
        repaired?: boolean;
        error?: string;
      };
      if (!response.ok || !result.activities || !result.budgetLines) {
        throw new Error(result.error || "The new workplan could not be created.");
      }
      applyPlanResult(result);
      setPlanState("loading");
      setAllocationState("loading");
      setContractState("loading");
      setSelectedYear(newYear);
      setYearDialogOpen(false);
      setActiveView("workplan");
      toast.success(`${newYear} workplan ${result.repaired ? "repaired" : "created"}`, {
        description: result.transferSummary
          ? `${result.transferSummary.activities} main activities, ${result.transferSummary.subactivities} sub-activities, and ${result.transferSummary.contracts} open contracts were carried forward.`
          : copyCurrentYear
            ? "The full structure was copied, and open contract obligations were carried forward."
            : "Unfinished activities and open contract obligations were carried forward automatically.",
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

  async function removeWorkplanYear() {
    if (!currentSession?.isAdmin || selectedYear <= 2026) return;
    setYearSaving(true);
    try {
      const response = await fetch("/api/workplan", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "delete_year",
          year: selectedYear,
        }),
      });
      const result = (await response.json()) as {
        deletedYear?: number;
        years?: WorkplanYear[];
        error?: string;
      };
      if (!response.ok || result.deletedYear !== selectedYear || !result.years) {
        throw new Error(result.error || "The workplan year could not be removed.");
      }
      const deletedYear = selectedYear;
      setWorkplanYears(result.years);
      setYearDeleteOpen(false);
      setPlanState("loading");
      setAllocationState("loading");
      setContractState("loading");
      setSelectedYear(2026);
      toast.success(`${deletedYear} workplan removed`, {
        description: "Its activities, budgets, finance entries, contracts, and updates were removed. The 2026 workplan was not changed.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The workplan year could not be removed.",
      );
    } finally {
      setYearSaving(false);
    }
  }

  function openAddActivity() {
    setPlanFormStep(0);
    setPlanRecordType("activity");
    setEditingPlanKey(null);
    setEditingPlanParentKey("");
    setActivityPlanDraft({
      ...emptyActivityDraft,
      section: metadata.section[0]?.value ?? "A",
      goal:
        metadata.goal.find((item) => item.value !== "All goals")?.value ??
        metadata.goal[0]?.value ??
        "",
      workstream: metadata.workstream[0]?.value ?? "",
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
    });
    setFormDirty(true);
    setPlanDialogOpen(true);
  }

  function openEditActivity(activity: Activity) {
    setPlanFormStep(0);
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
      support: supportPartnersForActivity(activity),
      owner: activityOwner(activity, updates),
      actionPlan: String(activity.actionPlan ?? ""),
      baseline: activity.baseline,
      target: activity.target,
    });
    setFormDirty(true);
    setPlanDialogOpen(true);
  }

  function openAddSubactivity(activity: Activity) {
    setPlanFormStep(0);
    setPlanRecordType("subactivity");
    setEditingPlanKey(null);
    setEditingPlanParentKey(activity.id);
    setSubactivityPlanDraft({
      ...emptySubactivityDraft,
      procurementType: metadata.procurement_type[0]?.value ?? "Not applicable",
      status: metadata.initial_status[0]?.value ?? "not_started",
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-12-31`,
    });
    setFormDirty(true);
    setPlanDialogOpen(true);
  }

  function openEditSubactivity(activity: Activity, subactivity: Subactivity) {
    setPlanFormStep(0);
    setPlanRecordType("subactivity");
    setEditingPlanKey(subactivity.id);
    setEditingPlanParentKey(activity.id);
    setSubactivityPlanDraft({
      title: subactivity.title,
      owner: subactivityOwner(subactivity, updates),
      procurementType: procurementTypeForSubactivity(subactivity),
      startDate: subactivity.startDate,
      endDate: subactivity.endDate,
      status: subactivity.status as StatusKey,
      progressSummary: subactivity.progressSummary,
    });
    setFormDirty(true);
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
    if (!isActivity && !ownerNames(subactivityPlanDraft.owner, teamMembers).length) {
      toast.error("Choose an accountable owner before saving.");
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
      ? (() => {
          const { owner, ...planningFields } = activityPlanDraft;
          return {
          ...(currentActivity ?? {}),
          ...planningFields,
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
          technicalLead: currentActivity?.technicalLead ?? "",
          responsibilityOwner: canonicalOwnerName(owner, teamMembers),
          partners: "",
          description: currentActivity?.description ?? "",
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
        };
        })()
      : {
          ...(currentSubactivity ?? {}),
          ...subactivityPlanDraft,
          executor: currentSubactivity?.executor ?? "",
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
      setFormDirty(false);
      setWorkplanPreview(
        isActivity
          ? { activityId: key }
          : { activityId: editingPlanParentKey, subactivityId: key },
      );
      if (isActivity && selectedId) setSelectedId(key);
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
      if (planRecordType === "activity") {
        setSelectedId(null);
        if (workplanPreview?.activityId === editingPlanKey) {
          setWorkplanPreview(null);
        }
      } else if (workplanPreview?.subactivityId === editingPlanKey) {
        setWorkplanPreview(
          workplanPreview?.activityId
            ? { activityId: workplanPreview.activityId }
            : null,
        );
      }
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
    setFormDirty(true);
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
      linkedActivityKeys: linkedActivityKeysForEditor(line, allActivities),
    });
    setFormDirty(true);
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
      linkedActivityKeys: budgetLineDraft.linkedActivityKeys,
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
      setFormDirty(false);
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
    if (!currentSession?.isAdmin) return;
    setEditingTeamId(null);
    setTeamDraft({
      name: "",
      role: "",
      group:
        metadata.member_type.find((item) => item.value === "PCU")?.value ??
        metadata.member_type[0]?.value ??
        "PCU",
      aliasesText: "",
      email: "",
      accessRole: "member",
    });
    setFormDirty(true);
    setTeamDialogOpen(true);
  }

  function openEditTeamMember(teamMember: TeamMember) {
    if (!currentSession?.isAdmin) return;
    setEditingTeamId(teamMember.id);
    setTeamDraft({
      name: teamMember.name,
      role: teamMember.role,
      group: teamMember.group,
      aliasesText: teamMember.aliases.join(", "),
      email: teamMember.email,
      accessRole: teamMember.accessRole,
    });
    setFormDirty(true);
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
          email: teamDraft.email,
          accessRole: teamDraft.accessRole,
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
      setFormDirty(false);
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

  async function prepareTeamInvite(teamMember: TeamMember) {
    if (!currentSession?.isAdmin || !teamMember.email) return;
    try {
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: teamMember.id }),
      });
      const result = (await response.json()) as {
        member?: TeamMember;
        error?: string;
      };
      if (!response.ok || !result.member) {
        throw new Error(result.error || "The invitation could not be prepared.");
      }
      setTeamMembers((current) =>
        current.map((item) =>
          item.id === result.member!.id ? result.member! : item,
        ),
      );
      const subject = "Invitation to the PFP Workplan Monitor";
      const body = [
        `Hello ${teamMember.name},`,
        "",
        "You have been invited to the PFP Workplan Monitor.",
        `Open ${window.location.origin} and sign in with ${teamMember.email}.`,
        "",
        `Access level: ${teamMember.accessRole === "admin" ? "Administrator" : "Team member"}`,
      ].join("\n");
      const inviteUrl = `mailto:${encodeURIComponent(teamMember.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const inviteLink = document.createElement("a");
      inviteLink.href = inviteUrl;
      inviteLink.click();
      toast.success("Invitation email prepared", {
        description: "Review and send it from your email application.",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The invitation could not be prepared.",
      );
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
      const remainingMembers = teamMembers.filter(
        (item) => item.id !== result.deletedId,
      );
      const ownerlessItems = (result.clearedUpdates ?? []).filter(
        (update) => !canonicalOwnerName(update.owner, remainingMembers),
      ).length;
      setTeamState("ready");
      setTeamDeleteOpen(false);
      setTeamDialogOpen(false);
      toast.success("Team member removed", {
        description: ownerlessItems
          ? `${ownerlessItems} workplan items now need an owner.`
          : result.clearedUpdates?.length
            ? "The removed person was cleared while the other assigned owners were kept."
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
                  enum: metadata.status.map((item) => item.value),
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
                  enum: metadata.status.map((item) => item.value),
                },
                progress: {
                  type: "integer",
                  minimum: 0,
                  maximum: 100,
                },
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
                !metadata.status.some((item) => item.value === status) ||
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
  }, [
    allActivities,
    allBudgetLines,
    persistFinanceEntry,
    persistUpdate,
    metadata.status,
    selectedYear,
    updates,
  ]);

  const metadataLabel = useCallback(
    (category: MetadataCategory, value: string) =>
      metadata[category].find((item) => item.value === value)?.label || value,
    [metadata],
  );

  const workstreams = useMemo(
    () =>
      Array.from(
        new Set([
          ...metadata.workstream.map((item) => item.value),
          ...allActivities.map((item) => item.workstream).filter(Boolean),
        ]),
      ),
    [allActivities, metadata.workstream],
  );

  const goals = useMemo(
    () =>
      Array.from(
        new Set([
          ...metadata.goal.map((item) => item.value),
          ...allActivities.map((item) => item.goal).filter(Boolean),
        ]),
      ),
    [allActivities, metadata.goal],
  );

  const sectionOptions = metadata.section;
  const statusOptions = metadata.status;
  const initialStatusOptions = metadata.initial_status;
  const procurementTypeOptions = metadata.procurement_type;
  const serviceProviderTypeOptions = metadata.service_provider_type;
  const statusKeys = useMemo(
    () =>
      Array.from(
        new Set([
          ...metadata.status.map((item) => item.value),
          ...allActivities.map((activity) => deriveActivityStatus(activity, updates)),
          ...allActivities.flatMap((activity) =>
            activity.subactivities.map((subactivity) =>
              recordStatus(
                subactivity.id,
                subactivity.status as StatusKey,
                updates,
              ),
            ),
          ),
        ]),
      ),
    [allActivities, metadata.status, updates],
  );

  const actionPlanReferences = useMemo(
    () =>
      Array.from(
        new Set(allActivities.map((item) => String(item.actionPlan || "")).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
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
        ...item.subactivities.flatMap((subactivity) => [
          subactivity.title,
          subactivityOwner(subactivity, updates),
          subactivity.progressSummary,
        ]),
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
    for (const contract of contracts) {
      const current = totals.get(contract.budgetKey) ?? {
        commitment: 0,
        expenditure: 0,
      };
      current.commitment += contractCommitmentMnt(contract);
      current.expenditure += contractPaidMnt(contract);
      totals.set(contract.budgetKey, current);
    }
    return totals;
  }, [contracts, financeEntries]);

  const allocationByBudgetKey = useMemo(() => {
    const totals = new Map<string, number>();
    for (const line of allBudgetLines) {
      const targets = targetsForBudgetLine(line, allActivities);
      const mainTargets = targets.filter((target) => target.kind === "activity");
      const total = mainTargets.reduce((sum, target) => {
        const mainAllocation = allocations.find(
          (allocation) =>
            allocation.budgetKey === line.id &&
            allocation.activityKey === target.key,
        );
        if (mainAllocation) return sum + mainAllocation.amountMnt;
        return (
          sum +
          allocations
            .filter(
              (allocation) =>
                allocation.budgetKey === line.id &&
                targets.some(
                  (item) =>
                    item.kind === "subactivity" &&
                    item.activityId === target.activityId &&
                    item.key === allocation.activityKey,
                ),
            )
            .reduce((childSum, allocation) => childSum + allocation.amountMnt, 0)
        );
      }, 0);
      totals.set(line.id, total);
    }
    return totals;
  }, [allActivities, allBudgetLines, allocations]);

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

  function openFinanceBudgetLine(budgetKey: string) {
    setExpandedFinanceActivityKeys(new Set());
    setExpandedFinanceRecordKeys(new Set());
    setSelectedBudgetKey(budgetKey);
  }

  function toggleFinanceActivity(activityKey: string) {
    setExpandedFinanceActivityKeys((current) => {
      const next = new Set(current);
      if (next.has(activityKey)) next.delete(activityKey);
      else next.add(activityKey);
      return next;
    });
  }

  function toggleFinanceRecords(targetKey: string) {
    setExpandedFinanceRecordKeys((current) => {
      const next = new Set(current);
      if (next.has(targetKey)) next.delete(targetKey);
      else next.add(targetKey);
      return next;
    });
  }

  const contractTargets = useMemo(
    () => {
      const unique = new Map<string, BudgetTarget>();
      for (const line of allBudgetLines) {
        for (const target of targetsForBudgetLine(line, allActivities)) {
          if (!unique.has(target.key)) unique.set(target.key, target);
        }
      }
      return [...unique.values()];
    },
    [allActivities, allBudgetLines],
  );

  const filteredContracts = useMemo(() => {
    const normalized = contractQuery.trim().toLocaleLowerCase();
    return contracts.filter((contract) => {
      const target = contractTargets.find((item) => item.key === contract.activityKey);
      const line = allBudgetLines.find((item) => item.id === contract.budgetKey);
      const haystack = [
        contract.contractNumber,
        contract.torName,
        contract.serviceProviderName,
        contract.serviceProviderType,
        target?.code,
        target?.label,
        line?.title,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (contractStatusFilter === "all" || contract.status === contractStatusFilter) &&
        haystack.includes(normalized)
      );
    });
  }, [allBudgetLines, contractQuery, contractStatusFilter, contractTargets, contracts]);

  const contractStats = useMemo(
    () => ({
      totalValue: contracts.reduce((total, contract) => total + contract.amountMnt, 0),
      outstanding: contracts.reduce(
        (total, contract) => total + contractCommitmentMnt(contract),
        0,
      ),
      paid: contracts.reduce((total, contract) => total + contractPaidMnt(contract), 0),
      active: contracts.filter((contract) => contract.status === "active").length,
    }),
    [contracts],
  );

  const financeStats = useMemo(() => {
    return summarizeFinance(filteredBudgetLines, financeEntries, contracts);
  }, [contracts, filteredBudgetLines, financeEntries]);

  const financeCreatorOptions = useMemo(() => {
    const values = new Map<string, string>();
    for (const entry of financeEntries) {
      if (entry.createdBy) {
        values.set(
          entry.createdBy,
          financeEntryCreatorName(entry, teamMembers),
        );
      }
    }
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [financeEntries, teamMembers]);

  const financeEntryMatchesFilters = useCallback(
    (entry: FinanceEntry) =>
      (financeCreatorFilter === "all" ||
        entry.createdBy === financeCreatorFilter) &&
      (!financeDateFrom || entry.entryDate >= financeDateFrom) &&
      (!financeDateTo || entry.entryDate <= financeDateTo),
    [financeCreatorFilter, financeDateFrom, financeDateTo],
  );

  const visibleFinanceEntries = useMemo(
    () => financeStats.relevantEntries.filter(financeEntryMatchesFilters),
    [financeEntryMatchesFilters, financeStats.relevantEntries],
  );

  const visibleAllocations = useMemo(() => {
    const keys = new Set(filteredBudgetLines.map((line) => line.id));
    return allocations.filter((allocation) => keys.has(allocation.budgetKey));
  }, [allocations, filteredBudgetLines]);

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
    () => summarizeFinance(dashboardBudgetLines, financeEntries, contracts),
    [contracts, dashboardBudgetLines, financeEntries],
  );

  const dashboardFinanceBars = useMemo(() => {
    const rows = [
      { label: "Budget", value: dashboardFinance.budgetMnt, color: "#0c3b2d" },
      { label: "Commitment", value: dashboardFinance.commitmentMnt, color: "#2878c8" },
      { label: "Expenditure", value: dashboardFinance.expenditureMnt, color: "#16825d" },
      {
        label: "Remaining",
        value: dashboardFinance.remainingMnt,
        color: dashboardFinance.remainingMnt < 0 ? "#c44757" : "#9cad45",
      },
    ];
    const scale = Math.max(...rows.map((item) => Math.abs(item.value)), 1);
    return rows.map((item) => ({
      ...item,
      width: Math.max(item.value ? 3 : 0, (Math.abs(item.value) / scale) * 100),
    }));
  }, [dashboardFinance]);

  const dashboardContractStats = useMemo(() => {
    const keys = new Set(dashboardBudgetLines.map((line) => line.id));
    const scoped = contracts.filter((contract) => keys.has(contract.budgetKey));
    const counts = {
      draft: scoped.filter((contract) => contract.status === "draft").length,
      active: scoped.filter((contract) => contract.status === "active").length,
      completed: scoped.filter((contract) => contract.status === "completed").length,
      closed: scoped.filter((contract) => contract.status === "closed").length,
    };
    const totalValue = scoped.reduce(
      (total, contract) => total + contract.amountMnt,
      0,
    );
    const paidValue = scoped.reduce(
      (total, contract) => total + contractPaidMnt(contract),
      0,
    );
    return {
      total: scoped.length,
      counts,
      paidValue,
      totalValue,
      progress: totalValue
        ? Math.min(100, Math.round((paidValue / totalValue) * 100))
        : 0,
    };
  }, [contracts, dashboardBudgetLines]);

  const deliveryIndicators = useMemo(() => {
    const completed = dashboardActivities.filter(
      (item) => deriveActivityStatus(item, updates) === "completed",
    ).length;
    const atRisk = dashboardActivities.filter((item) =>
      ["delayed", "delayed_externally", "on_hold"].includes(deriveActivityStatus(item, updates)),
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

  const automaticAlerts = useMemo(() => {
    const today = todayForInput();
    const inThirtyDays = new Date(`${today}T00:00:00Z`);
    inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30);
    const cutoff = inThirtyDays.toISOString().slice(0, 10);
    const workplanItems = allActivities.flatMap((activity) => [
      {
        key: activity.id,
        label: `${activity.code || activity.uid} · ${activity.title}`,
        endDate: activity.endDate,
        status: deriveActivityStatus(activity, updates),
        owner: activityOwner(activity, updates),
      },
      ...activity.subactivities.map((subactivity) => ({
        key: subactivity.id,
        label: `${activity.code || activity.uid} · ${subactivity.title}`,
        endDate: subactivity.endDate,
        status: recordStatus(
          subactivity.id,
          subactivity.status as StatusKey,
          updates,
        ),
        owner: subactivityOwner(subactivity, updates),
      })),
    ]);
    const overdue = workplanItems.filter(
      (item) => item.endDate && item.endDate < today && item.status !== "completed",
    );
    const ownerless = workplanItems.filter(
      (item) => !canonicalOwnerName(item.owner, teamMembers),
    );
    const upcomingPayments = contracts.flatMap((contract) =>
      contract.payments
        .filter(
          (payment) =>
            !payment.paid && payment.dueDate >= today && payment.dueDate <= cutoff,
        )
        .map((payment) => ({ contract, payment })),
    );
    const endingContracts = contracts.filter(
      (contract) =>
        !["completed", "closed"].includes(contract.status) &&
        contract.endDate >= today &&
        contract.endDate <= cutoff,
    );
    return [
      {
        id: "overdue",
        label: "Overdue activities",
        count: overdue.length,
        detail: overdue[0]?.label || "No overdue activities",
        view: "workplan",
        tone: "rose",
      },
      {
        id: "payments",
        label: "Payments due in 30 days",
        count: upcomingPayments.length,
        detail: upcomingPayments[0]
          ? `${upcomingPayments[0].contract.contractNumber} · ${upcomingPayments[0].payment.label}`
          : "No upcoming payments",
        view: "contracts",
        tone: "amber",
      },
      {
        id: "contracts",
        label: "Contracts ending in 30 days",
        count: endingContracts.length,
        detail: endingContracts[0]?.contractNumber || "No contracts nearing end",
        view: "contracts",
        tone: "amber",
      },
      {
        id: "owners",
        label: "Activities without owners",
        count: ownerless.length,
        detail: ownerless[0]?.label || "All activities have owners",
        view: "workplan",
        tone: "rose",
      },
    ];
  }, [allActivities, contracts, teamMembers, updates]);

  const expenditureForecast = useMemo(() => {
    const quarters: Record<QuarterKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    for (const contract of contracts) {
      for (const payment of contract.payments) {
        if (!payment.paid) quarters[quarterForDate(payment.dueDate)] += payment.amountMnt;
      }
    }
    return quarterKeys.map((quarter) => ({ quarter, amountMnt: quarters[quarter] }));
  }, [contracts]);

  const dataCompleteness = useMemo(() => {
    const currentQuarter = quarterForDate(todayForInput());
    const items = allActivities.flatMap((activity) => [
      {
        key: activity.id,
        owner: activityOwner(activity, updates),
        startDate: activity.startDate,
        endDate: activity.endDate,
        note: updates[activity.id]?.note ?? activity.progressSummary ?? "",
      },
      ...activity.subactivities.map((subactivity) => ({
        key: subactivity.id,
        owner: subactivityOwner(subactivity, updates),
        startDate: subactivity.startDate,
        endDate: subactivity.endDate,
        note:
          updates[subactivity.id]?.note ?? subactivity.progressSummary ?? "",
      })),
    ]);
    const subactivities = allActivities.flatMap(
      (activity) => activity.subactivities,
    );
    const missingOwner = items.filter(
      (item) => !canonicalOwnerName(item.owner, teamMembers),
    ).length;
    const missingDates = items.filter(
      (item) => !item.startDate || !item.endDate,
    ).length;
    const missingStructure = allActivities.filter(
      (activity) =>
        !activity.section || !activity.goal || !activity.workstream,
    ).length;
    const missingProcurementType = subactivities.filter(
      (subactivity) => !String(subactivity.procurementType ?? "").trim(),
    ).length;
    const missingQuarterlyUpdate = items.filter((item) => {
      if (
        quarterlyHistory.some(
          (entry) =>
            entry.activityKey === item.key &&
            entry.planYear === selectedYear &&
            entry.quarter === currentQuarter &&
            entry.note.trim(),
        )
      ) {
        return false;
      }
      return !parseQuarterlyNotes(item.note, selectedYear).quarters[
        currentQuarter
      ].trim();
    }).length;
    const unlinkedBudgetLines = allBudgetLines.filter(
      (line) =>
        !allActivities.some((activity) =>
          activityMatchesBudgetLine(activity, line),
        ),
    ).length;
    const incompleteContracts = contracts.filter(
      (contract) =>
        !contract.torName.trim() ||
        !contract.serviceProviderName.trim() ||
        !contract.serviceProviderType.trim() ||
        !contract.startDate ||
        !contract.endDate ||
        !contract.payments.length ||
        contract.payments.some((payment) => !payment.deliverable.trim()),
    ).length;
    const incompleteFinanceEntries = financeEntries.filter(
      (entry) =>
        !entry.activityKey ||
        !entry.entryDate ||
        !entry.description.trim() ||
        !entry.vendor.trim(),
    ).length;
    const applicableChecks =
      items.length * 3 +
      allActivities.length +
      subactivities.length +
      allBudgetLines.length +
      contracts.length +
      financeEntries.length;
    const issueCount =
      missingOwner +
      missingDates +
      missingQuarterlyUpdate +
      missingStructure +
      missingProcurementType +
      unlinkedBudgetLines +
      incompleteContracts +
      incompleteFinanceEntries;
    return {
      total: items.length,
      missingOwner,
      missingDates,
      missingStructure,
      missingProcurementType,
      missingQuarterlyUpdate,
      currentQuarter,
      unlinkedBudgetLines,
      incompleteContracts,
      incompleteFinanceEntries,
      completePercent: applicableChecks
        ? Math.max(0, Math.round(((applicableChecks - issueCount) / applicableChecks) * 100))
        : 100,
    };
  }, [
    allActivities,
    allBudgetLines,
    contracts,
    financeEntries,
    quarterlyHistory,
    selectedYear,
    teamMembers,
    updates,
  ]);

  const transferPreview = useMemo(() => {
    const openContractKeys = new Set(
      contracts
        .filter((contract) => ["draft", "active"].includes(contract.status))
        .map((contract) => contract.activityKey),
    );
    const activities = allActivities.filter((activity) => {
      if (copyCurrentYear) return true;
      if (openContractKeys.has(activity.id)) return true;
      if (!activity.subactivities.length) {
        return deriveActivityStatus(activity, updates) !== "completed";
      }
      return activity.subactivities.some(
        (subactivity) =>
          recordStatus(
            subactivity.id,
            subactivity.status as StatusKey,
            updates,
          ) !== "completed" || openContractKeys.has(subactivity.id),
      );
    });
    const subactivities = activities.reduce(
      (total, activity) =>
        total +
        activity.subactivities.filter(
          (subactivity) =>
            copyCurrentYear ||
            recordStatus(
              subactivity.id,
              subactivity.status as StatusKey,
              updates,
            ) !== "completed" ||
            openContractKeys.has(subactivity.id),
        ).length,
      0,
    );
    return {
      activities,
      subactivities,
      contracts: contracts.filter((contract) =>
        ["draft", "active"].includes(contract.status),
      ),
      remainingBudgetMnt: Math.max(
        0,
        summarizeFinance(allBudgetLines, financeEntries, contracts).remainingMnt,
      ),
    };
  }, [allActivities, allBudgetLines, contracts, copyCurrentYear, financeEntries, updates]);

  const overallStatusSummary = useMemo(() => {
    const counts = Object.fromEntries(
      statusKeys.map((key) => [key, 0]),
    ) as Record<StatusKey, number>;
    for (const activity of dashboardActivities) {
      const key = deriveActivityStatus(activity, updates);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const total = dashboardActivities.length;
    let cursor = 0;
    const segments = statusKeys.flatMap((key) => {
      const start = cursor;
      cursor += total ? (counts[key] / total) * 100 : 0;
      return counts[key]
        ? [`${statusChartColor(key)} ${start}% ${cursor}%`]
        : [];
    });
    return {
      counts,
      total,
      background: total
        ? `conic-gradient(${segments.join(", ")})`
        : "conic-gradient(#e1e6e2 0 100%)",
    };
  }, [dashboardActivities, statusKeys, updates]);

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
      const finance = summarizeFinance(lines, financeEntries, contracts);
      const completed = activities.filter(
        (item) => deriveActivityStatus(item, updates) === "completed",
      ).length;
      const atRisk = activities.filter((item) =>
        ["delayed", "delayed_externally", "on_hold"].includes(deriveActivityStatus(item, updates)),
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
    contracts,
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
        const scopedActivities = allActivities;
        const mainAssignments = scopedActivities.filter((activity) => {
          const roles = responsibilityParts(activityOwner(activity, updates), teamMembers);
          return roles.accountable === teamMember.name || roles.supporting.includes(teamMember.name);
        });
        const subAssignments = scopedActivities.flatMap((activity) =>
          activity.subactivities
            .filter((subactivity) => {
              const roles = responsibilityParts(subactivityOwner(subactivity, updates), teamMembers);
              return roles.accountable === teamMember.name || roles.supporting.includes(teamMember.name);
            })
            .map((subactivity) => ({ activity, subactivity })),
        );
        const activities = scopedActivities.filter(
          (activity) =>
            mainAssignments.some((assigned) => assigned.id === activity.id) ||
            subAssignments.some((assigned) => assigned.activity.id === activity.id),
        );
        const budgetKeys = budgetKeysForActivities(activities, allBudgetLines);
        const lines = allBudgetLines.filter(
          (line) =>
            budgetKeys.has(line.id),
        );
        const finance = summarizeFinance(lines, financeEntries, contracts);
        const assignedRecords = [
          ...mainAssignments.map((activity) => ({
            status: deriveActivityStatus(activity, updates),
            progress: deriveActivityProgress(activity, updates),
          })),
          ...subAssignments.map(({ subactivity }) => ({
            status: recordStatus(subactivity.id, subactivity.status as StatusKey, updates),
            progress: recordProgress(
              subactivity.id,
              statusMetaFor(subactivity.status as StatusKey).weight,
              updates,
            ),
          })),
        ];
        const statusCounts = Object.fromEntries(
          statusKeys.map((key) => [
            key,
            assignedRecords.filter((record) => record.status === key).length,
          ]),
        ) as Record<StatusKey, number>;
        const accountableMainCount = mainAssignments.filter(
          (activity) =>
            responsibilityParts(activityOwner(activity, updates), teamMembers).accountable === teamMember.name,
        ).length;
        const supportingMainCount = mainAssignments.length - accountableMainCount;
        const accountableSubactivityCount = subAssignments.filter(
          ({ subactivity }) =>
            responsibilityParts(subactivityOwner(subactivity, updates), teamMembers).accountable === teamMember.name,
        ).length;
        const supportingSubactivityCount = subAssignments.length - accountableSubactivityCount;
        return {
          ...teamMember,
          activityCount: mainAssignments.length,
          accountableMainCount,
          supportingMainCount,
          subactivityCount: subAssignments.length,
          accountableSubactivityCount,
          supportingSubactivityCount,
          statusCounts,
          progress: assignedRecords.length
            ? Math.round(
                assignedRecords.reduce((total, record) => total + record.progress, 0) /
                  assignedRecords.length,
              )
            : 0,
          ...finance,
        };
      }),
    [
      allActivities,
      allBudgetLines,
      contracts,
      financeEntries,
      statusKeys,
      teamMembers,
      updates,
    ],
  );

  const accessMembers = useMemo(
    () =>
      currentSession?.isAdmin
        ? teamMembers
        : teamMembers.filter((item) => item.id === currentSession?.memberId),
    [currentSession, teamMembers],
  );

  const visibleTeamSummaries = useMemo(
    () => {
      const own = currentSession?.isAdmin
        ? teamSummaries
        : teamSummaries.filter((item) => item.id === currentSession?.memberId);
      const normalized = teamDirectoryQuery.trim().toLocaleLowerCase();
      return own.filter(
        (item) =>
          (teamDirectoryMember === "all" || item.id === teamDirectoryMember) &&
          [item.name, item.role, item.group, item.email]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalized),
      );
    },
    [
      currentSession?.isAdmin,
      currentSession?.memberId,
      teamDirectoryMember,
      teamDirectoryQuery,
      teamSummaries,
    ],
  );

  const buildWorkplanExportItems = useCallback(
    () =>
      allActivities.flatMap((activity) => {
        const activityCode = activity.code || activity.uid;
        const mainResponsibility = responsibilityParts(
          activityOwner(activity, updates),
          teamMembers,
        );
        const sharedPlanningFields = {
          section: metadataLabel("section", activity.section),
          priority: activity.priority,
          goal: metadataLabel("goal", activity.goal),
          workstream: metadataLabel("workstream", activity.workstream),
          actionPlan: String(activity.actionPlan ?? ""),
          meccLead: activity.lead ?? "",
          supportPartners: supportPartnersForActivity(activity),
        };

        return [
          {
            activityKey: activity.id,
            kind: "activity" as const,
            code: activityCode,
            parentCode: "",
            title: activity.title,
            titleMn: activity.titleMn ?? "",
            ...sharedPlanningFields,
            accountableOwner: mainResponsibility.accountable,
            supportingOwners: mainResponsibility.supporting.join(", "),
            procurementType: "",
            baseline: activity.baseline ?? "",
            target: activity.target ?? "",
            startDate: activity.startDate,
            endDate: activity.endDate,
            status: metadataLabel("status", deriveActivityStatus(activity, updates)),
            progress: deriveActivityProgress(activity, updates),
            quarterlyUpdates: quarterlyUpdatesForExport(
              activity.id,
              updates[activity.id]?.note ?? "",
              activity.progressSummary ?? "",
              selectedYear,
              quarterlyHistory,
            ),
          },
          ...activity.subactivities.map((subactivity) => {
            const responsibility = responsibilityParts(
              subactivityOwner(subactivity, updates),
              teamMembers,
            );
            return {
              activityKey: subactivity.id,
              kind: "subactivity" as const,
              code: "",
              parentCode: activityCode,
              title: subactivity.title,
              titleMn: "",
              ...sharedPlanningFields,
              accountableOwner: responsibility.accountable,
              supportingOwners: responsibility.supporting.join(", "),
              procurementType: metadataLabel(
                "procurement_type",
                procurementTypeForSubactivity(subactivity),
              ),
              baseline: "",
              target: "",
              startDate: subactivity.startDate ?? "",
              endDate: subactivity.endDate ?? "",
              status: metadataLabel(
                "status",
                recordStatus(
                  subactivity.id,
                  subactivity.status as StatusKey,
                  updates,
                ),
              ),
              progress: recordProgress(
                subactivity.id,
                statusMetaFor(subactivity.status as StatusKey).weight,
                updates,
              ),
              quarterlyUpdates: quarterlyUpdatesForExport(
                subactivity.id,
                updates[subactivity.id]?.note ?? "",
                subactivity.progressSummary ?? "",
                selectedYear,
                quarterlyHistory,
              ),
            };
          }),
        ];
      }),
    [allActivities, metadataLabel, quarterlyHistory, selectedYear, teamMembers, updates],
  );

  const exportWorkplan = useCallback(async () => {
    if (!allActivities.length) {
      toast.error("There are no workplan activities to export.");
      return;
    }
    setWorkplanExporting(true);
    try {
      const { downloadWorkplanExcel } = await import("@/lib/workplan-excel");
      downloadWorkplanExcel({
        year: selectedYear,
        items: buildWorkplanExportItems(),
      });
      toast.success("Workplan Excel export is ready", {
        description: `${allActivities.length} main activities and their sub-activities were included.`,
      });
    } catch (error) {
      toast.error("The Excel export could not be created", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setWorkplanExporting(false);
    }
  }, [allActivities, buildWorkplanExportItems, selectedYear]);

  const exportContracts = useCallback(async () => {
    if (!filteredContracts.length) {
      toast.error("There are no contracts matching the current filters.");
      return;
    }
    setContractExporting(true);
    try {
      const { downloadContractsExcel } = await import("@/lib/contracts-excel");
      downloadContractsExcel({
        year: selectedYear,
        contracts: filteredContracts.map((contract) => {
          const line = allBudgetLines.find((item) => item.id === contract.budgetKey);
          const target = contractTargets.find((item) => item.key === contract.activityKey);
          return {
            contractNumber: contract.contractNumber,
            status: contractStatusMeta[contract.status].label,
            budgetLine: line ? `${line.code} · ${line.title}` : "Removed budget line",
            activityCode: target?.code ?? "",
            activityTitle: target?.label ?? "Removed workplan item",
            activityLevel: target?.kind === "subactivity" ? "Sub-activity" : "Main activity",
            torName: contract.torName,
            providerName: contract.serviceProviderName,
            providerType: contract.serviceProviderType,
            startDate: contract.startDate,
            endDate: contract.endDate,
            currency: contract.currency,
            foreignAmountMinor: contract.foreignAmountMinor,
            exchangeRateMnt: contract.exchangeRateMnt,
            amountMnt: contract.amountMnt,
            paidMnt: contractPaidMnt(contract),
            commitmentMnt: contractCommitmentMnt(contract),
            updatedAt: contract.updatedAt,
            updatedBy: contract.updatedBy,
            transferredFromYear: contract.transferredFromYear,
            payments: contract.payments.map((payment) => ({
              sequence: payment.sequence,
              label: payment.label,
              dueDate: payment.dueDate,
              transferDate: payment.paidAt,
              deliverable: payment.deliverable,
              percentage: payment.percentage,
              amountMnt: payment.amountMnt,
              foreignAmountMinor: payment.foreignAmountMinor,
              paid: Boolean(payment.paid),
            })),
          };
        }),
      });
      toast.success("Contract Excel export is ready", {
        description: `${filteredContracts.length} contract${filteredContracts.length === 1 ? "" : "s"} and their latest payment records were included.`,
      });
    } catch (error) {
      toast.error("The contract export could not be created", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setContractExporting(false);
    }
  }, [allBudgetLines, contractTargets, filteredContracts, selectedYear]);

  const exportQuarterlyReport = useCallback(async (quarter: QuarterKey) => {
    if (!allActivities.length) return;
    setWorkplanExporting(true);
    try {
      const { downloadWorkplanExcel } = await import("@/lib/workplan-excel");
      downloadWorkplanExcel({
        year: selectedYear,
        items: buildWorkplanExportItems().map((item) => {
          const savedQuarter = quarterlyHistory.find(
            (entry) =>
              entry.activityKey === item.activityKey &&
              entry.planYear === selectedYear &&
              entry.quarter === quarter,
          );
          return savedQuarter
            ? {
                ...item,
                status: metadataLabel("status", savedQuarter.status),
                progress: savedQuarter.progress,
                quarterlyUpdates: {
                  ...item.quarterlyUpdates,
                  [quarter]: savedQuarter.note,
                },
              }
            : item;
        }),
        quarter,
      });
      toast.success(`${quarter} Excel report is ready`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Quarterly report failed.",
      );
    } finally {
      setWorkplanExporting(false);
    }
  }, [allActivities, buildWorkplanExportItems, metadataLabel, quarterlyHistory, selectedYear]);

  async function loadComparison(year: number) {
    setCompareYear(year);
    try {
      const response = await fetch(`/api/workplan?year=${year}`);
      const result = (await response.json()) as {
        activities?: Activity[];
        budgetLines?: BudgetLine[];
        error?: string;
      };
      if (!response.ok || !result.activities || !result.budgetLines) {
        throw new Error(result.error || "Comparison year unavailable.");
      }
      setComparePlan({ year, activities: result.activities, budgetLines: result.budgetLines });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comparison failed.");
    }
  }

  const selectedAllocatedMnt = selected
    ? allocationByActivityKey.get(selected.id) ??
      selected.subactivities.reduce(
        (total, item) => total + (allocationByActivityKey.get(item.id) ?? 0),
        0,
      )
    : 0;

  function renderInlineUpdateEditor(
    target: EditableTarget,
    compact = false,
  ) {
    if (activeTarget?.key !== target.key) return null;
    const mainProgressIsAutomatic =
      target.kind === "activity" && Boolean(selected?.subactivities.length);

    return (
      <div className="mt-4 rounded-2xl border border-[#a9bfae] bg-[#f8fbf7] p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#173f31]">
              {target.kind === "activity"
                ? "Update main activity"
                : "Update this sub-activity"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#6b7c72]">
              Changes are saved to this item only.
            </p>
          </div>
          <span className="rounded-full bg-[#e2eee2] px-2.5 py-1 text-xs font-bold text-[#315845]">
            {target.kind === "activity" ? "Main" : "Sub-activity"}
          </span>
        </div>

        {mainProgressIsAutomatic && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm leading-5 text-blue-900">
            Main progress is calculated automatically from the average of its sub-activities.
          </div>
        )}

        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Status</span>
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
              {statusOptions.map((item) => (
                <NativeSelectOption key={item.value} value={item.value}>
                  {item.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">Progress</span>
            {mainProgressIsAutomatic ? (
              <span className="rounded-full bg-[#e6efe2] px-2.5 py-1 text-sm font-black text-[#315845]">
                {draft.progress}% · calculated
              </span>
            ) : (
              <label className="flex items-center gap-1.5 text-sm font-bold text-[#315845]">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={draft.progress}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      progress: Math.min(
                        100,
                        Math.max(0, Number(event.target.value) || 0),
                      ),
                    }))
                  }
                  className="h-9 w-20 border-[#b9cabb] bg-white text-right font-black"
                  aria-label="Progress percentage value"
                />
                %
              </label>
            )}
          </div>
          <Slider
            value={[draft.progress]}
            disabled={mainProgressIsAutomatic}
            min={0}
            max={100}
            step={1}
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

        <details className="group mt-4 rounded-xl border border-[#d7e0d5] bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-bold marker:hidden">
            <span className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-[#2f634c]" />
              Quarterly progress notes
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[#5d7467]">
              {quarterlyNoteCount(draft.note, selectedYear)}/4
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            </span>
          </summary>
          <div className="border-t border-[#e2e7e0] p-3">
            <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-[120px_1fr]"}`}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Quarter</span>
                <NativeSelect
                  value={noteQuarter}
                  onChange={(event) =>
                    setNoteQuarter(event.target.value as QuarterKey)
                  }
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  {quarterKeys.map((quarter) => (
                    <NativeSelectOption key={quarter} value={quarter}>
                      {quarter} · {activeQuarterlyNotes.quarters[quarter].trim()
                        ? "Updated"
                        : "Not updated"}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  {noteQuarter} progress update
                </span>
                <Textarea
                  value={activeQuarterlyNotes.quarters[noteQuarter]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      note: updateQuarterlyNote(
                        current.note,
                        selectedYear,
                        noteQuarter,
                        event.target.value,
                      ),
                    }))
                  }
                  className="min-h-24 border-[#cbd6cc] bg-white"
                  placeholder="What changed this quarter, what was completed, and what comes next?"
                />
              </label>
            </div>
            <div className="mt-4 border-t border-[#e4e9e2] pt-3">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#6b7c72]">
                Saved history
              </p>
              <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">
                {quarterlyHistory
                  .filter(
                    (item) =>
                      item.activityKey === target.key &&
                      item.planYear === selectedYear,
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[#e1e7df] bg-[#f8faf7] p-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-black text-[#315845]">
                          {item.quarter} · {item.progress}% · {metadataLabel("status", item.status)}
                        </span>
                        <span className="text-[#718178]">
                          {formatUpdatedAt(item.submittedAt, language)} · {item.submittedBy}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-[#405a4d]">
                        {item.note}
                      </p>
                    </div>
                  ))}
                {!quarterlyHistory.some(
                  (item) =>
                    item.activityKey === target.key &&
                    item.planYear === selectedYear,
                ) && (
                  <p className="rounded-lg bg-[#f8faf7] px-3 py-2 text-xs text-[#718178]">
                    No historical quarterly submissions yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </details>

        <div className="mt-4 flex flex-col gap-2 border-t border-[#e2e7e0] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#718178]">
            {updates[target.key]
              ? `Last saved ${formatUpdatedAt(updates[target.key].updatedAt, language)}`
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
    );
  }

  return (
    <main ref={appRootRef} className="min-h-screen bg-[#f3f6f1] text-[#14241b]">
      <Toaster position="top-right" richColors />
      <Tabs
        value={activeView}
        className="block"
        onValueChange={setActiveView}
      >
      <header className="border-b border-[#d7ded5] bg-[#0c3b2d] text-white">
        <div className="flex w-full flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbf081] text-sm font-black tracking-tight text-[#153829]">
              PFP
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">Eternal Mongolia</p>
              <p className="text-xs text-emerald-100/70">ERP System</p>
            </div>
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto pb-1 lg:border-l lg:border-white/15 lg:pl-5 lg:pb-0">
            <TabsList className="flex h-auto min-w-max items-center gap-1 bg-transparent p-0">
              <TabsTrigger
                value="dashboard"
                className="h-10 flex-none rounded-lg border-0! px-3.5 text-sm font-bold text-white/65 shadow-none! hover:bg-white/10 hover:text-white data-[state=active]:bg-[#dbf081]! data-[state=active]:text-[#153829]! data-[state=active]:shadow-[0_5px_14px_rgba(4,28,20,0.2)]! xl:px-4"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="workplan"
                className="h-10 flex-none rounded-lg border-0! px-3.5 text-sm font-bold text-white/65 shadow-none! hover:bg-white/10 hover:text-white data-[state=active]:bg-[#dbf081]! data-[state=active]:text-[#153829]! data-[state=active]:shadow-[0_5px_14px_rgba(4,28,20,0.2)]! xl:px-4"
              >
                <ListChecks className="h-4 w-4" />
                Workplan
              </TabsTrigger>
              <TabsTrigger
                value="finance"
                className="h-10 flex-none rounded-lg border-0! px-3.5 text-sm font-bold text-white/65 shadow-none! hover:bg-white/10 hover:text-white data-[state=active]:bg-[#dbf081]! data-[state=active]:text-[#153829]! data-[state=active]:shadow-[0_5px_14px_rgba(4,28,20,0.2)]! xl:px-4"
              >
                <Banknote className="h-4 w-4" />
                Finance
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="h-10 flex-none rounded-lg border-0! px-3.5 text-sm font-bold text-white/65 shadow-none! hover:bg-white/10 hover:text-white data-[state=active]:bg-[#dbf081]! data-[state=active]:text-[#153829]! data-[state=active]:shadow-[0_5px_14px_rgba(4,28,20,0.2)]! xl:px-4"
              >
                <ReceiptText className="h-4 w-4" />
                Contracts
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="h-10 flex-none rounded-lg border-0! px-3.5 text-sm font-bold text-white/65 shadow-none! hover:bg-white/10 hover:text-white data-[state=active]:bg-[#dbf081]! data-[state=active]:text-[#153829]! data-[state=active]:shadow-[0_5px_14px_rgba(4,28,20,0.2)]! xl:px-4"
              >
                <Users className="h-4 w-4" />
                {currentSession?.isAdmin ? "Team Performance" : "My Performance"}
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="h-10 flex-none rounded-lg border-0! px-3.5 text-sm font-bold text-white/65 shadow-none! hover:bg-white/10 hover:text-white data-[state=active]:bg-[#dbf081]! data-[state=active]:text-[#153829]! data-[state=active]:shadow-[0_5px_14px_rgba(4,28,20,0.2)]! xl:px-4"
              >
                <BarChart3 className="h-4 w-4" />
                Monitoring
              </TabsTrigger>
              <TabsTrigger
                value="access"
                className="h-10 flex-none rounded-lg border-0! px-3.5 text-sm font-bold text-white/65 shadow-none! hover:bg-white/10 hover:text-white data-[state=active]:bg-[#dbf081]! data-[state=active]:text-[#153829]! data-[state=active]:shadow-[0_5px_14px_rgba(4,28,20,0.2)]! xl:px-4"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Control
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
              title={isFullscreen ? "Exit full screen" : "Enter full screen"}
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/25 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbf081]"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4.5 w-4.5" />
              ) : (
                <Maximize2 className="h-4.5 w-4.5" />
              )}
            </button>
            <div
              data-no-translate
              className="flex items-center rounded-lg border border-white/25 bg-white/10 p-1"
              aria-label="Interface language"
            >
              <button
                type="button"
                onClick={() => changeLanguage("en")}
                aria-pressed={language === "en"}
                className={`h-8 rounded-md px-3 text-xs font-black transition ${
                  language === "en"
                    ? "bg-[#dbf081] text-[#153829] shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => changeLanguage("mn")}
                aria-pressed={language === "mn"}
                className={`h-8 rounded-md px-3 text-xs font-black transition ${
                  language === "mn"
                    ? "bg-[#dbf081] text-[#153829] shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                МН
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-4 py-7 sm:px-6 lg:px-8">
         <TabsContent value="dashboard" className="space-y-6">
            <section className="rounded-2xl border border-[#d7ded5] bg-gradient-to-r from-white to-[#f1f6ee] p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between lg:p-5">
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
                  <NativeSelectOption value="all">All sections</NativeSelectOption>
                  {sectionOptions.map((item) => (
                    <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>
                  ))}
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
                      {value === "All goals" ? "Cross-goal" : metadataLabel("goal", value)}
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
                      {metadataLabel("member_type", item.group)} · {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </section>

            <section className="rounded-3xl border border-[#cbd8cd] bg-gradient-to-br from-[#eaf2e8] to-[#f5f8f3] p-3 shadow-[0_10px_28px_rgba(20,36,27,0.05)] sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  accent: "bg-[#0c3b2d] text-white",
                },
                {
                  label: "Expenditure",
                  value: formatMnt(dashboardFinance.expenditureMnt),
                  detail: `${dashboardFinance.spentPercent}% of budget spent`,
                  icon: ReceiptText,
                  accent: "bg-[#0c3b2d] text-white",
                },
                {
                  label: "Remaining",
                  value: formatMnt(dashboardFinance.remainingMnt),
                  detail: "Budget less commitments and expenditure",
                  icon: Banknote,
                  accent: "bg-[#0c3b2d] text-white",
                },
                ].map((metric) => (
                  <article
                    key={metric.label}
                    className={`relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-[0_8px_22px_rgba(7,42,31,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(7,42,31,0.18)] ${metric.accent}`}
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
                    <p className="text-[1.65rem] font-black tracking-[-0.04em] xl:text-3xl">
                      {metric.value}
                    </p>
                    <p
                      className={`mt-1 text-sm ${metric.accent.includes("text-white") ? "text-emerald-50/70" : "text-[#718178]"}`}
                    >
                      {metric.detail}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
              <article className="rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Financial position</h2>
                    <p className="mt-1 text-sm text-[#718178]">
                      Budget, commitments, expenditure, and remaining balance in the selected scope.
                    </p>
                  </div>
                  <Banknote className="h-5 w-5 text-[#49705c]" />
                </div>
                <div className="mt-5 space-y-4" role="img" aria-label="Horizontal financial position bar chart">
                  {dashboardFinanceBars.map((row) => (
                    <button
                      type="button"
                      key={row.label}
                      onClick={() => setActiveView("finance")}
                      className="block w-full rounded-lg p-1 text-left transition hover:bg-[#f6f9f4]"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="font-bold text-[#315845]">{row.label}</span>
                        <span className={`font-black tabular-nums ${row.value < 0 ? "text-rose-700" : "text-[#183529]"}`}>
                          {formatMnt(row.value)}
                        </span>
                      </div>
                      <div className="h-4 overflow-hidden rounded-full bg-[#edf1eb]">
                        <div
                          className="h-full rounded-full transition-[width]"
                          style={{ width: `${row.width}%`, backgroundColor: row.color }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Contract status</h2>
                    <p className="mt-1 text-sm text-[#718178]">
                      {dashboardContractStats.total} contracts linked to the selected workplan scope.
                    </p>
                  </div>
                  <ReceiptText className="h-5 w-5 text-[#49705c]" />
                </div>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#718178]">
                      Payment progress
                    </p>
                    <p className="mt-1 text-3xl font-black">{dashboardContractStats.progress}%</p>
                  </div>
                  <p className="text-right text-xs leading-5 text-[#718178]">
                    {formatMnt(dashboardContractStats.paidValue)} paid<br />
                    of {formatMnt(dashboardContractStats.totalValue)}
                  </p>
                </div>
                <Progress
                  value={dashboardContractStats.progress}
                  className="mt-3 h-2.5 bg-[#e2e8df] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                />
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(contractStatusMeta) as ContractRecord["status"][]).map((contractStatus) => (
                    <button
                      type="button"
                      key={contractStatus}
                      onClick={() => {
                        setContractStatusFilter(contractStatus);
                        setActiveView("contracts");
                      }}
                      className="rounded-xl border border-[#e1e7df] bg-[#f8faf7] p-3 text-center transition hover:border-[#9fb3a4] hover:bg-[#f1f6ee]"
                    >
                      <p className="text-2xl font-black">{dashboardContractStats.counts[contractStatus]}</p>
                      <p className="mt-1 text-xs font-bold text-[#5d7467]">
                        {contractStatusMeta[contractStatus].label}
                      </p>
                    </button>
                  ))}
                </div>
              </article>
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
                  className="rounded-2xl border border-[#d7ded5] bg-gradient-to-br from-white to-[#f7faf5] p-4 shadow-[0_5px_18px_rgba(20,36,27,0.035)] transition hover:-translate-y-0.5 hover:border-[#b6c7b8] hover:shadow-sm"
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

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
              <article className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                <div className="border-b border-[#e3e9e1] bg-gradient-to-r from-[#f3f8f0] to-white px-5 py-4">
                  <h2 className="text-lg font-black">Overall activity status</h2>
                  <p className="mt-1 text-sm text-[#718178]">
                    Status distribution for the selected section, goal, and owner filters.
                  </p>
                </div>
                <div className="grid gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
                  <div className="flex justify-center">
                    <div
                      className="relative grid h-44 w-44 place-items-center rounded-full shadow-[0_12px_30px_rgba(20,36,27,0.12)]"
                      style={{ background: overallStatusSummary.background }}
                      role="img"
                      aria-label={`Status chart for ${overallStatusSummary.total} activities`}
                    >
                      <div className="grid h-24 w-24 place-items-center rounded-full border border-[#edf1eb] bg-white text-center shadow-inner">
                        <div>
                          <p className="text-3xl font-black tracking-[-0.04em]">{overallStatusSummary.total}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#718178]">activities</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {statusKeys.map((key) => {
                      const count = overallStatusSummary.counts[key];
                      const percent = overallStatusSummary.total
                        ? Math.round((count / overallStatusSummary.total) * 100)
                        : 0;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => {
                            setStatus(key);
                            setActiveView("workplan");
                          }}
                          className="rounded-xl border border-[#e1e7df] bg-[#f8faf7] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#8eaa98] hover:bg-[#f1f6ee] hover:shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: statusChartColor(key) }}
                              />
                              <span className="truncate text-sm font-bold">{metadataLabel("status", key)}</span>
                            </div>
                            <span className="text-lg font-black">{count}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e3e8e4]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: statusChartColor(key),
                              }}
                            />
                          </div>
                          <p className="mt-1 text-right text-xs font-semibold text-[#718178]">{percent}%</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black">Forecast expenditure</h2>
                    <p className="mt-1 text-sm text-[#718178]">
                      Unpaid contract installments grouped by due quarter.
                    </p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-[#49705c]" />
                </div>
                <div className="mt-6 space-y-5">
                  {expenditureForecast.map((item) => {
                    const maximum = Math.max(...expenditureForecast.map((row) => row.amountMnt), 1);
                    return (
                      <div key={item.quarter}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf4e9] font-black text-[#315845]">{item.quarter}</span>
                          <span className="font-black tabular-nums">{formatMnt(item.amountMnt)}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#e5ebe4]">
                          <div className="h-full rounded-full bg-[#2c795a]" style={{ width: `${(item.amountMnt / maximum) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
              <div className="border-b border-[#e2e7e0] px-5 py-4">
                <h2 className="text-xl font-black">Progress and finance by goal</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  Activity progress is paired with budget, commitments, expenditure, and remaining balance.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[930px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[235px] pl-5">Goal</TableHead>
                      <TableHead className="w-[210px]">Activity progress</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Commitment</TableHead>
                      <TableHead className="text-right">Expenditure</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goalRows.map((row) => (
                      <TableRow key={row.goal}>
                        <TableCell className="pl-5">
                          <p className="font-black">
                            {row.goal === "All goals" ? "Cross-goal" : metadataLabel("goal", row.goal)}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="workplan" className="space-y-6">

        <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
          <div className="sticky top-0 z-30 border-b border-[#dbe3d9] bg-white/95 p-4 backdrop-blur lg:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black">Workplan activities</h2>
                <p className="mt-0.5 text-sm text-[#718178]">
                  {filtered.length} of {allActivities.length} main activities · select a row for quick details
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

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.25fr)_repeat(5,minmax(135px,0.65fr))]">
              <label className="relative block">
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
                className="h-9 w-full border-[#ced8cf] bg-[#f8faf7]"
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
                className="h-9 w-full border-[#ced8cf] bg-[#f8faf7]"
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
                className="h-9 w-full border-[#ced8cf] bg-[#f8faf7]"
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
                className="h-9 w-full border-[#ced8cf] bg-[#f8faf7]"
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
                className="h-9 w-full border-[#ced8cf] bg-[#f8faf7]"
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
          </div>

          <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 xl:border-r xl:border-[#dbe3d9]">
              <div className="overflow-x-auto">
                <div className="min-w-[820px]">
                  <div className="sticky top-0 z-10 grid grid-cols-[90px_minmax(210px,1fr)_115px_105px_90px_115px] gap-3 border-b border-[#dfe6dd] bg-[#f5f8f3] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#718178]">
                    <span>Code</span>
                    <span>Activity</span>
                    <span>Owner</span>
                    <span>Status</span>
                    <span>Progress</span>
                    <span className="text-right">Budget</span>
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
                      const isSelected =
                        workplanPreview?.activityId === item.id &&
                        !workplanPreview?.subactivityId;
                      const allocatedMnt =
                        allocationByActivityKey.get(item.id) ??
                        item.subactivities.reduce(
                          (total, subactivity) =>
                            total +
                            (allocationByActivityKey.get(subactivity.id) ?? 0),
                          0,
                        );
                      const rowSpacing =
                        workplanDensity === "compact" ? "py-2.5" : "py-4";

                      return (
                        <div key={item.id} className="border-b border-[#e4e9e2]">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setWorkplanPreview({ activityId: item.id })
                            }
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setWorkplanPreview({ activityId: item.id });
                              }
                            }}
                            className={[
                              "grid cursor-pointer grid-cols-[90px_minmax(210px,1fr)_115px_105px_90px_115px] items-center gap-3 border-l-4 px-3 text-left transition",
                              rowSpacing,
                              isSelected
                                ? "border-l-[#0c3b2d] bg-[#eaf3e6]"
                                : "border-l-[#7ca08d] bg-[#f5f9f2] hover:bg-[#edf5e9]",
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
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#c4d1c6] bg-white text-[#315845] hover:bg-[#e3eee0]"
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
                              <p
                                className={[
                                  "font-black text-[#173228]",
                                  workplanDensity === "compact"
                                    ? "line-clamp-1 text-sm"
                                    : "line-clamp-2 text-[15px] leading-5",
                                ].join(" ")}
                              >
                                {language === "mn" && item.titleMn?.trim()
                                  ? item.titleMn
                                  : item.title}
                              </p>
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
                              <div className="mb-1 flex items-center justify-between text-[11px] font-black text-[#315845]">
                                <span>{currentProgress}%</span>
                              </div>
                              <Progress
                                value={currentProgress}
                                className="h-1.5 bg-[#dfe7dc] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                              />
                            </div>
                            <p className="text-right text-xs font-black tabular-nums text-[#315845]">
                              {formatMnt(allocatedMnt)}
                            </p>
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
                                const subSelected =
                                  workplanPreview?.subactivityId === subactivity.id;
                                return (
                                  <div
                                    key={subactivity.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      setWorkplanPreview({
                                        activityId: item.id,
                                        subactivityId: subactivity.id,
                                      })
                                    }
                                    onKeyDown={(event) => {
                                      if (event.target !== event.currentTarget) return;
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        setWorkplanPreview({
                                          activityId: item.id,
                                          subactivityId: subactivity.id,
                                        });
                                      }
                                    }}
                                    className={[
                                      "grid cursor-pointer grid-cols-[90px_minmax(210px,1fr)_115px_105px_90px_115px] items-center gap-3 border-t border-[#edf0eb] border-l-4 px-3 text-left transition",
                                      workplanDensity === "compact" ? "py-2" : "py-3.5",
                                      subSelected
                                        ? "border-l-[#2c795a] bg-[#f0f7ed]"
                                        : "border-l-transparent hover:bg-[#f8faf7]",
                                    ].join(" ")}
                                  >
                                    <div className="flex items-center gap-2 pl-9">
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#83a18f]" />
                                      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[#718178]">
                                        Sub {subIndex + 1}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <p
                                        className={[
                                          "font-bold text-[#294438]",
                                          workplanDensity === "compact"
                                            ? "line-clamp-1 text-xs"
                                            : "line-clamp-2 text-sm",
                                        ].join(" ")}
                                      >
                                        {subactivity.title}
                                      </p>
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
                                      <div className="mb-1 text-[11px] font-black text-[#53685c]">
                                        {subProgress}%
                                      </div>
                                      <Progress
                                        value={subProgress}
                                        className="h-1 bg-[#e4eae2] [&_[data-slot=progress-indicator]]:bg-[#5a8d73]"
                                      />
                                    </div>
                                    <p className="text-right text-xs font-bold tabular-nums text-[#53685c]">
                                      {formatMnt(
                                        allocationByActivityKey.get(subactivity.id) ?? 0,
                                      )}
                                    </p>
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

            <aside className="border-t border-[#dbe3d9] bg-[#f7f9f5] p-4 xl:border-t-0">
              <div className="sticky top-4">
                {workplanPreviewActivity ? (
                  (() => {
                    const activity = workplanPreviewActivity;
                    const subactivity = workplanPreviewSubactivity;
                    const previewStatus = subactivity
                      ? recordStatus(
                          subactivity.id,
                          subactivity.status as StatusKey,
                          updates,
                        )
                      : deriveActivityStatus(activity, updates);
                    const previewProgress = subactivity
                      ? recordProgress(
                          subactivity.id,
                          statusMetaFor(subactivity.status as StatusKey).weight,
                          updates,
                        )
                      : deriveActivityProgress(activity, updates);
                    const previewResponsibility = responsibilityParts(
                      subactivity
                        ? subactivityOwner(subactivity, updates)
                        : activityOwner(activity, updates),
                      teamMembers,
                    );
                    const previewAllocation = subactivity
                      ? allocationByActivityKey.get(subactivity.id) ?? 0
                      : allocationByActivityKey.get(activity.id) ??
                        activity.subactivities.reduce(
                          (total, item) =>
                            total + (allocationByActivityKey.get(item.id) ?? 0),
                          0,
                        );

                    return (
                      <div className="overflow-hidden rounded-2xl border border-[#cfdacf] bg-white shadow-sm">
                        <div className="bg-[#0c3b2d] p-4 text-white">
                          <div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/70">
                                {subactivity ? "Sub-activity" : "Main activity"}
                              </p>
                              <p className="mt-1 font-mono text-xs font-black text-[#dbf081]">
                                {activity.code || activity.uid}
                              </p>
                            </div>
                          </div>
                          <h3 className="mt-3 text-base font-black leading-6">
                            {subactivity
                              ? subactivity.title
                              : language === "mn" && activity.titleMn?.trim()
                                ? activity.titleMn
                                : activity.title}
                          </h3>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <StatusPill status={previewStatus} label={metadataLabel("status", previewStatus)} />
                            <span className="text-xl font-black text-[#dbf081]">
                              {previewProgress}%
                            </span>
                          </div>
                          <Progress
                            value={previewProgress}
                            className="mt-2 h-2 bg-white/15 [&_[data-slot=progress-indicator]]:bg-[#dbf081]"
                          />
                        </div>

                        <div className="space-y-4 p-4">
                          <dl className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <dt className="font-bold text-[#819087]">Start</dt>
                              <dd className="mt-1 font-black text-[#294438]">
                                {formatDate(
                                  subactivity?.startDate || activity.startDate,
                                  language,
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-bold text-[#819087]">Due</dt>
                              <dd className="mt-1 font-black text-[#294438]">
                                {formatDate(
                                  subactivity?.endDate || activity.endDate,
                                  language,
                                )}
                              </dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="font-bold text-[#819087]">Accountable owner</dt>
                              <dd
                                className={[
                                  "mt-1 font-black",
                                  previewResponsibility.accountable
                                    ? "text-[#294438]"
                                    : "text-rose-700",
                                ].join(" ")}
                              >
                                {previewResponsibility.accountable || "Owner required"}
                              </dd>
                              {previewResponsibility.supporting.length > 0 && (
                                <div className="mt-2 rounded-lg bg-[#f1f6ee] p-2.5">
                                  <dt className="font-bold text-[#819087]">Supporting owner</dt>
                                  <dd className="mt-1 font-bold text-[#294438]">
                                    {previewResponsibility.supporting.join(", ")}
                                  </dd>
                                </div>
                              )}
                            </div>
                            {!subactivity && (
                              <div className="col-span-2">
                                <dt className="font-bold text-[#819087]">Sub-activities</dt>
                                <dd className="mt-1 text-lg font-black text-[#245f47]">
                                  {activity.subactivities.length}
                                </dd>
                              </div>
                            )}
                            <div className="col-span-2">
                              <dt className="font-bold text-[#819087]">Allocated budget</dt>
                              <dd className="mt-1 text-lg font-black text-[#245f47]">
                                {formatMnt(previewAllocation)}
                              </dd>
                            </div>
                            {subactivity && (
                              <div className="col-span-2">
                                <dt className="font-bold text-[#819087]">Type of procurement</dt>
                                <dd className="mt-1 font-bold text-[#294438]">
                                  {metadataLabel("procurement_type", procurementTypeForSubactivity(subactivity))}
                                </dd>
                              </div>
                            )}
                          </dl>

                          <Button
                            size="sm"
                            onClick={() => openActivity(activity)}
                            className="h-9 w-full bg-[#0c3b2d] text-xs text-white hover:bg-[#174d3a]"
                          >
                            Full view
                          </Button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#bac9bd] bg-white px-5 py-12 text-center">
                    <ListChecks className="mx-auto h-7 w-7 text-[#6f8a7b]" />
                    <h3 className="mt-3 font-black">Quick details</h3>
                    <p className="mt-1 text-xs leading-5 text-[#718178]">
                      Select a main activity or sub-activity to view its owner, status, progress, budget, and available actions.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#5d7467]" aria-label="Finance breadcrumb">
              <button type="button" onClick={() => setSelectedBudgetKey(null)} className="hover:text-[#174734]">Finance</button>
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
                  <span className="text-sm font-semibold text-[#5d7467]">
                    {visibleFinanceEntries.length} of {financeStats.relevantEntries.length} entries
                  </span>
                </div>
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
              </div>
              {financeState === "unavailable" && (
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                  Saved finance entries are temporarily unavailable. The approved budget remains visible.
                </div>
              )}
              <div className="overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
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
                    {visibleFinanceEntries.slice(0, 50).map((entry) => {
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
            </section>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6">
            <nav className="flex items-center gap-2 text-sm font-semibold text-[#5d7467]" aria-label="Contracts breadcrumb">
              <button type="button" onClick={() => setContractStatusFilter("all")} className="hover:text-[#174734]">Contracts</button>
              {contractStatusFilter !== "all" && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[#174734]">{contractStatusMeta[contractStatusFilter as ContractRecord["status"]]?.label}</span>
                </>
              )}
            </nav>
            <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between lg:p-5">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-xl font-black">Contract management</h2>
                <p className="mt-1 max-w-3xl text-sm text-[#718178]">
                  Link contracts and payment deliverables to the workplan. Unpaid contract value is commitment; paid installments become expenditure.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void exportContracts()}
                  disabled={contractExporting || !filteredContracts.length}
                  className="border-[#b9cabb] bg-white"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {contractExporting ? "Preparing…" : "Export Excel"}
                </Button>
                <Button
                  onClick={openAddContract}
                  className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                  disabled={!contractTargets.length}
                >
                  <Plus className="h-4 w-4" />
                  Add contract
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#b9cabb] bg-[#e9f1e6] p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2 px-1">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#0c3b2d] text-white">
                  <ReceiptText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black">Contract financial position</h3>
                  <p className="text-xs text-[#5d7467]">Current {selectedYear} register</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["Active contracts", String(contractStats.active)],
                  ["Total contract value", formatMnt(contractStats.totalValue)],
                  ["Outstanding commitment", formatMnt(contractStats.outstanding)],
                  ["Paid expenditure", formatMnt(contractStats.paid)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/80 bg-white p-4 shadow-sm">
                    <dt className="text-xs font-semibold text-[#718178]">{label}</dt>
                    <dd className="mt-1 whitespace-nowrap text-lg font-black tabular-nums text-[#183529]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#e2e7e0] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="relative min-w-0 flex-1 sm:max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8c81]" />
                  <Input
                    value={contractQuery}
                    onChange={(event) => setContractQuery(event.target.value)}
                    placeholder="Search contract, ToR, provider or workplan code"
                    className="h-10 border-[#ced8cf] bg-[#f8faf7] pl-9"
                  />
                </div>
                <NativeSelect
                  value={contractStatusFilter}
                  onChange={(event) => setContractStatusFilter(event.target.value)}
                  className="h-10 min-w-[165px] border-[#ced8cf] bg-[#f8faf7]"
                  aria-label="Filter contracts by status"
                >
                  <NativeSelectOption value="all">All statuses</NativeSelectOption>
                  {Object.entries(contractStatusMeta).map(([value, meta]) => (
                    <NativeSelectOption key={value} value={value}>
                      {meta.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              {contractState === "unavailable" && (
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                  Saved contracts are temporarily unavailable.
                </div>
              )}

              <div className="space-y-4 bg-[#f7f9f5] p-4 sm:p-5">
                {filteredContracts.map((contract) => {
                  const target = contractTargets.find(
                    (item) => item.key === contract.activityKey,
                  );
                  const line = allBudgetLines.find(
                    (item) => item.id === contract.budgetKey,
                  );
                  const paidMnt = contractPaidMnt(contract);
                  const commitmentMnt = contractCommitmentMnt(contract);
                  const expanded = expandedContractIds.has(contract.id);
                  const statusInfo = contractStatusMeta[contract.status];
                  return (
                    <article
                      key={contract.id}
                      className="overflow-hidden rounded-2xl border border-[#d5dfd3] bg-white shadow-[0_5px_16px_rgba(20,36,27,0.04)]"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-[#e9f0e6] px-2 py-1 font-mono text-xs font-black text-[#2f634c]">
                                {contract.contractNumber}
                              </span>
                              {contract.transferredFromYear > 0 && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                                  Transferred from {contract.transferredFromYear}
                                </span>
                              )}
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusInfo.tone}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <h3 className="mt-3 break-words text-lg font-black leading-6 text-[#183529]">
                              {contract.torName}
                            </h3>
                            <p className="mt-1 text-sm font-semibold text-[#53685c]">
                              {contract.serviceProviderName} · {contract.serviceProviderType}
                            </p>
                            <p className="mt-2 break-words text-xs leading-5 text-[#718178]">
                              {line?.code ?? "Budget"} · {target?.code ?? "Workplan"} · {target?.kind === "subactivity" ? "Sub-activity · " : ""}{target ? localizedTargetLabel(target, allActivities, language) : "Removed workplan item"}
                            </p>
                            <p className="mt-1 text-xs text-[#718178]">
                              {formatDate(contract.startDate, language)} – {formatDate(contract.endDate, language)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openAuditHistory({ entityType: "contract", entityKey: contract.id, label: contract.contractNumber })}
                            >
                              <History className="h-4 w-4" />
                              Amendments
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditContract(contract)}>
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Button>
                            {currentSession?.isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setContractToDelete(contract)}
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            )}
                            {contract.status !== "closed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setContractToClose(contract)}
                                className="border-amber-300 text-amber-900 hover:bg-amber-50"
                              >
                                Close contract
                              </Button>
                            )}
                          </div>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {[
                            [
                              "Contract amount",
                              contract.currency === "USD"
                                ? `${formatUsd(contract.foreignAmountMinor)} · ${formatMnt(contract.amountMnt)}`
                                : formatMnt(contract.amountMnt),
                            ],
                            ["Outstanding commitment", formatMnt(commitmentMnt)],
                            ["Paid expenditure", formatMnt(paidMnt)],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-xl bg-[#f3f7f1] p-3">
                              <dt className="text-xs font-semibold text-[#718178]">{label}</dt>
                              <dd className="mt-1 whitespace-nowrap text-sm font-black tabular-nums">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedContractIds((current) => {
                              const next = new Set(current);
                              if (next.has(contract.id)) next.delete(contract.id);
                              else {
                                next.add(contract.id);
                                void loadContractDocuments(contract.id);
                              }
                              return next;
                            })
                          }
                          className="mt-4"
                          aria-expanded={expanded}
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
                          {expanded ? "Hide payment structure" : `Payment structure (${contract.payments.length})`}
                        </Button>
                      </div>

                      {expanded && (
                        <div className="border-t border-[#dfe7dc] bg-[#fbfcfa] p-4 sm:p-5">
                          <div className="space-y-3">
                            {contract.payments.map((payment) => (
                              <div
                                key={payment.id}
                                className="grid gap-3 rounded-xl border border-[#dfe7dc] bg-white p-4 lg:grid-cols-[minmax(100px,0.7fr)_minmax(120px,0.8fr)_minmax(190px,1.8fr)_70px_140px_150px_105px] lg:items-center"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-[#718178]">Payment</p>
                                  <p className="mt-1 font-bold">{payment.label}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#718178]">Due date</p>
                                  <p className="mt-1 text-sm font-semibold">{formatDate(payment.dueDate, language)}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[#718178]">Deliverable</p>
                                  <p className="mt-1 break-words text-sm font-semibold">{payment.deliverable}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#718178]">Share</p>
                                  <p className="mt-1 font-black tabular-nums">{payment.percentage}%</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#718178]">Amount</p>
                                  <p className="mt-1 whitespace-nowrap font-black tabular-nums">
                                    {contract.currency === "USD" && payment.foreignAmountMinor
                                      ? `${formatUsd(payment.foreignAmountMinor)} · `
                                      : ""}
                                    {formatMnt(payment.amountMnt)}
                                  </p>
                                </div>
                                <label className="block">
                                  <span className="text-xs font-semibold text-[#718178]">
                                    Transfer date
                                  </span>
                                  <Input
                                    type="date"
                                    value={paymentTransferDates[payment.id] ?? payment.paidAt ?? ""}
                                    onChange={(event) =>
                                      setPaymentTransferDates((current) => ({
                                        ...current,
                                        [payment.id]: event.target.value,
                                      }))
                                    }
                                    disabled={Boolean(payment.paid) || contract.status === "closed"}
                                    className="mt-1 h-8 border-[#cbd6cc] bg-white px-2 text-xs"
                                  />
                                </label>
                                <Button
                                  size="sm"
                                  variant={payment.paid ? "outline" : "default"}
                                  disabled={contractSaving || contract.status === "closed"}
                                  onClick={() => setPaymentPaid(contract, payment, !payment.paid)}
                                  className={`h-8 px-2.5 text-xs ${payment.paid ? "border-emerald-300 text-emerald-800" : "bg-[#0c3b2d] text-white hover:bg-[#174d3a]"}`}
                                >
                                  {payment.paid ? (
                                    <>
                                      <CircleCheck className="h-4 w-4" /> Paid
                                    </>
                                  ) : (
                                    "Mark paid"
                                  )}
                                </Button>
                                {payment.paid && payment.paidAt && (
                                  <p className="text-xs text-emerald-800 lg:col-start-6">
                                    Paid {formatDate(payment.paidAt, language)}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 border-t border-[#e5eae4] pt-3 lg:col-span-7">
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#c7d2c7] bg-white px-3 py-2 text-xs font-bold text-[#315845] hover:bg-[#f3f7f1]">
                                    <FileUp className="h-4 w-4" />
                                    {documentUploadingId === payment.id ? "Uploading…" : "Upload payment document"}
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.xlsx"
                                      className="sr-only"
                                      disabled={documentUploadingId === payment.id}
                                      onChange={(event) => {
                                        void uploadPaymentDocument(
                                          contract,
                                          payment,
                                          event.target.files?.[0],
                                        );
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                  </label>
                                  {paymentDocuments
                                    .filter((document) => document.paymentId === payment.id)
                                    .map((document) => (
                                      <a
                                        key={document.id}
                                        href={`/api/documents?id=${encodeURIComponent(document.id)}&download=1`}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf3ec] px-3 py-2 text-xs font-bold text-[#315845] hover:bg-[#e2ece0]"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        {document.fileName}
                                      </a>
                                    ))}
                                  {!paymentDocuments.some((document) => document.paymentId === payment.id) && (
                                    <span className="text-xs text-[#718178]">No documents attached</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}

                {contractState === "ready" && filteredContracts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#bfcbbf] bg-white px-6 py-14 text-center">
                    <ReceiptText className="mx-auto h-7 w-7 text-[#779083]" />
                    <p className="mt-3 font-black">
                      {contracts.length ? "No contracts match these filters" : "No contracts yet"}
                    </p>
                    <p className="mt-1 text-sm text-[#718178]">
                      {contracts.length
                        ? "Try another status or search term."
                        : "Add the first contract and split its value into payment deliverables."}
                    </p>
                    {!contracts.length && (
                      <Button className="mt-4 bg-[#0c3b2d] text-white" onClick={openAddContract}>
                        <Plus className="h-4 w-4" /> Add contract
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
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
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            ["Accountable", item.accountableMainCount],
                            ["Supporting main", item.supportingMainCount],
                            ["Sub-activities", item.subactivityCount],
                            ["Supporting subs", item.supportingSubactivityCount],
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
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <section className="rounded-2xl border border-[#d7ded5] bg-white p-5 shadow-[0_8px_26px_rgba(20,36,27,0.05)] sm:flex sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Monitoring and year comparison</h2>
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
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            <section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between lg:p-5">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-xl font-black">Admin control</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  Manage users, workplan years, and the shared dropdown options used across the ERP system.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {currentSession && (
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-[#ced8cf] bg-[#f8faf7] px-3 text-sm font-semibold text-[#315845]">
                    {currentSession.isAdmin && <ShieldCheck className="h-4 w-4" />}
                    {currentSession.memberName} · {currentSession.isAdmin ? "Admin" : "Member"}
                  </div>
                )}
                <a
                  href="/signout-with-chatgpt?return_to=%2F"
                  target="_top"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#ced8cf] bg-white px-3 text-sm font-bold text-[#315845] hover:bg-[#f5f8f4]"
                >
                  Sign out
                </a>
                {currentSession?.isAdmin && adminControlSection === "users" && (
                  <Button
                    onClick={openAddTeamMember}
                    className="h-10 bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add member
                  </Button>
                )}
              </div>
            </section>

            {currentSession?.isAdmin && (
              <div className="inline-flex rounded-xl border border-[#cfdacf] bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAdminControlSection("users")}
                  className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    adminControlSection === "users"
                      ? "bg-[#0c3b2d] text-white"
                      : "text-[#53685c] hover:bg-[#f0f5ee]"
                  }`}
                >
                  <Users className="h-4 w-4" /> User directory
                </button>
                <button
                  type="button"
                  onClick={() => setAdminControlSection("metadata")}
                  className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    adminControlSection === "metadata"
                      ? "bg-[#0c3b2d] text-white"
                      : "text-[#53685c] hover:bg-[#f0f5ee]"
                  }`}
                >
                  <Settings2 className="h-4 w-4" /> Meta data control
                </button>
              </div>
            )}

            {adminControlSection === "users" && teamState === "unavailable" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                User registration information is temporarily unavailable.
              </div>
            )}

            {currentSession?.isAdmin && adminControlSection === "metadata" && (
              <div className="space-y-5">
                <section className="rounded-2xl border border-[#cfdacf] bg-white p-5 shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5f7568]">Workplan administration</p>
                      <h3 className="mt-1 text-lg font-black">Year and planning controls</h3>
                      <p className="mt-1 text-sm text-[#718178]">
                        Select the active planning year here. Year controls are restricted to administrators.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <NativeSelect
                        value={String(selectedYear)}
                        onChange={(event) => setSelectedYear(Number(event.target.value))}
                        className="h-10 min-w-40 border-[#cbd6cc] bg-white font-bold"
                        aria-label="Select workplan year"
                      >
                        {workplanYears.map((item) => (
                          <NativeSelectOption key={item.year} value={String(item.year)}>
                            {item.year} workplan · {item.status}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="h-10 bg-[#0c3b2d] text-white hover:bg-[#174d3a]">
                            <Settings2 className="h-4 w-4" /> Planning
                            <ChevronRight className="h-4 w-4 rotate-90" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuItem onClick={openYearDialog}>
                            <CopyPlus className="h-4 w-4" /> Create next year draft
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={openAddActivity}>
                            <Plus className="h-4 w-4" /> Add activity to {selectedYear}
                          </DropdownMenuItem>
                          {selectedYear > 2026 && (
                            <DropdownMenuItem
                              onClick={() => setYearDeleteOpen(true)}
                              className="text-rose-700 focus:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" /> Delete entire {selectedYear} year
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#cfdacf] bg-white shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                  <div className="border-b border-[#e2e7e0] p-5">
                    <h3 className="text-lg font-black">System dropdown options</h3>
                    <p className="mt-1 text-sm text-[#718178]">
                      Rename, reorder, add, or remove options. Saved changes apply throughout Workplan, Finance, Dashboard, Monitoring, and Contracts.
                    </p>
                  </div>
                  <div className="grid min-h-[420px] md:grid-cols-[230px_minmax(0,1fr)]">
                    <nav className="border-b border-[#e2e7e0] bg-[#f5f8f3] p-3 md:border-b-0 md:border-r" aria-label="Metadata categories">
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                        {metadataCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setSelectedMetadataCategory(category)}
                            className={`rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                              selectedMetadataCategory === category
                                ? "bg-[#0c3b2d] text-white shadow-sm"
                                : "text-[#456052] hover:bg-white"
                            }`}
                          >
                            {metadataCategoryLabels[category]}
                          </button>
                        ))}
                      </div>
                    </nav>
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-black">{metadataCategoryLabels[selectedMetadataCategory]}</h4>
                          <p className="mt-1 text-xs leading-5 text-[#718178]">
                            The internal key remains stable so existing records keep working when you rename an option.
                          </p>
                        </div>
                        <span className="rounded-full bg-[#e8f0e4] px-2.5 py-1 text-xs font-bold text-[#315845]">
                          {metadataDrafts[selectedMetadataCategory].length} options
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {metadataDrafts[selectedMetadataCategory].map((item, index) => (
                          <div key={item.value} className="grid gap-2 rounded-xl border border-[#dce4da] bg-[#fafcf9] p-3 sm:grid-cols-[minmax(0,1fr)_170px_auto] sm:items-center">
                            <Input
                              value={item.label}
                              onChange={(event) =>
                                updateMetadataOption(
                                  selectedMetadataCategory,
                                  item.value,
                                  event.target.value,
                                )
                              }
                              className="h-9 border-[#cbd6cc] bg-white font-semibold"
                              aria-label={`Visible name for ${item.value}`}
                            />
                            <code className="truncate rounded-lg bg-[#edf2eb] px-2.5 py-2 text-xs text-[#53685c]">{item.value}</code>
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === 0}
                                onClick={() => moveMetadataOption(selectedMetadataCategory, item.value, -1)}
                                aria-label="Move option up"
                              >
                                <ChevronRight className="h-4 w-4 -rotate-90" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === metadataDrafts[selectedMetadataCategory].length - 1}
                                onClick={() => moveMetadataOption(selectedMetadataCategory, item.value, 1)}
                                aria-label="Move option down"
                              >
                                <ChevronRight className="h-4 w-4 rotate-90" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-rose-700"
                                disabled={metadataDrafts[selectedMetadataCategory].length <= 1}
                                onClick={() => removeMetadataOption(selectedMetadataCategory, item.value)}
                                aria-label="Remove option"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-[#e2e7e0] pt-4">
                        <Button type="button" variant="outline" onClick={() => addMetadataOption(selectedMetadataCategory)}>
                          <Plus className="h-4 w-4" /> Add option
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void saveMetadataCategory(selectedMetadataCategory)}
                          disabled={metadataSavingCategory === selectedMetadataCategory || metadataState === "loading"}
                          className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                        >
                          {metadataSavingCategory === selectedMetadataCategory ? "Saving…" : "Save category"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            <section className={`${adminControlSection === "users" ? "" : "hidden"} overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]`}>
              <div className="flex flex-col gap-2 border-b border-[#e2e7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">
                    {currentSession?.isAdmin ? "User directory" : "Your account"}
                  </h2>
                  <p className="mt-1 text-sm text-[#718178]">
                    {currentSession?.isAdmin
                      ? "Administrators can register users, update profiles, prepare invitations, and grant administrator access."
                      : "Your sign-in and registration information is managed by a workplan administrator."}
                  </p>
                </div>
                {currentSession?.isAdmin && (
                  <span className="text-sm font-semibold text-[#5d7467]">
                    {teamMembers.length} registered team records
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[280px] pl-5">Team member</TableHead>
                      <TableHead className="w-[260px]">Sign-in email</TableHead>
                      <TableHead className="w-[140px]">Access level</TableHead>
                      <TableHead className="w-[230px]">Registration</TableHead>
                      <TableHead className="w-[240px] pr-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessMembers.map((item) => (
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
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.group === "PCU" ? "bg-[#dcefd6] text-[#285a43]" : item.group === "MNLF" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}
                                >
                                  {metadataLabel("member_type", item.group)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[#718178]">{item.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.email ? (
                            <p className="break-all font-semibold text-[#315845]">{item.email}</p>
                          ) : (
                            <span className="text-sm font-semibold text-amber-700">Email required</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${item.accessRole === "admin" ? "bg-[#dcefd6] text-[#285a43]" : "bg-slate-100 text-slate-700"}`}
                          >
                            {item.accessRole === "admin" && <ShieldCheck className="h-3.5 w-3.5" />}
                            {item.accessRole === "admin" ? "Administrator" : "Member"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span
                              className={`h-2 w-2 rounded-full ${item.inviteStatus === "active" ? "bg-emerald-600" : item.inviteStatus === "invited" ? "bg-blue-600" : item.email ? "bg-amber-500" : "bg-rose-500"}`}
                            />
                            {item.inviteStatus === "active"
                              ? "Signed in"
                              : item.inviteStatus === "invited"
                                ? "Invitation prepared"
                                : item.email
                                  ? "Ready to invite"
                                  : "Registration incomplete"}
                          </div>
                          {item.lastSignedInAt && (
                            <p className="mt-1 text-xs text-[#718178]">
                              Last sign-in {formatUpdatedAt(item.lastSignedInAt, language)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex justify-end gap-2">
                            {currentSession?.isAdmin ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => void openAuditHistory({ entityType: "team", entityKey: item.id, label: item.name })}
                                  aria-label="View team member history"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                {item.email && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void prepareTeamInvite(item)}
                                  >
                                    <Mail className="h-4 w-4" />
                                    {item.inviteStatus === "active" ? "Send again" : "Invite"}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditTeamMember(item)}
                                >
                                  <PencilLine className="h-4 w-4" />
                                  Edit
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-[#718178]">Managed by administrator</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!accessMembers.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-[#718178]">
                          Loading account information…
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-[#e2e7e0] bg-[#f8faf7] px-5 py-3 text-xs leading-5 text-[#718178]">
                A user must sign in with the exact email saved here. Invitations open as a prepared email for the administrator to review and send.
              </div>
            </section>
            {currentSession?.isAdmin && adminControlSection === "users" && (
              <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white">
                <div className="flex flex-col gap-3 border-b border-[#e2e7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black">Backups and restore</h2>
                    <p className="mt-1 text-sm text-[#718178]">
                      Database snapshots are retained for 30 days. Preview is required before restore.
                    </p>
                  </div>
                  <Button onClick={() => void createBackup()} disabled={backupSaving} className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]">
                    <ShieldCheck className="h-4 w-4" /> {backupSaving ? "Working…" : "Create backup now"}
                  </Button>
                </div>
                <div className="divide-y divide-[#e8ece6]">
                  {backups.slice(0, 12).map((backup) => (
                    <div key={backup.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold">{formatUpdatedAt(backup.createdAt, language)}</p>
                        <p className="mt-1 text-xs text-[#718178]">{backup.recordCount} records · {backup.source} · {backup.createdBy}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void previewBackup(backup)} disabled={backupSaving}>
                        Preview restore
                      </Button>
                    </div>
                  ))}
                  {!backups.length && (
                    <p className="px-5 py-8 text-center text-sm text-[#718178]">No backup snapshots yet.</p>
                  )}
                </div>
              </section>
            )}
          </TabsContent>
      </div>
      </Tabs>

      <Dialog
        open={Boolean(auditTarget)}
        onOpenChange={(open) => {
          if (!open) setAuditTarget(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-3xl!">
          <DialogHeader>
            <DialogTitle>Change history</DialogTitle>
            <DialogDescription>
              {auditTarget?.label} · every saved change shows its previous and new value.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {auditLoading && (
              <div className="rounded-xl border border-[#d7ded5] bg-[#f7faf5] px-4 py-8 text-center text-sm text-[#718178]">
                Loading change history…
              </div>
            )}
            {!auditLoading && auditHistory.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#cbd6cc] bg-[#f8faf7] px-4 py-8 text-center">
                <History className="mx-auto h-6 w-6 text-[#718178]" />
                <p className="mt-2 font-bold">No saved changes yet</p>
                <p className="mt-1 text-sm text-[#718178]">
                  New changes will appear here after this update is published.
                </p>
              </div>
            )}
            {auditHistory.map((entry) => {
              const changes = auditChanges(entry);
              return (
                <article key={entry.id} className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black capitalize text-[#183529]">{entry.action}</p>
                      <p className="mt-1 text-xs text-[#718178]">
                        {formatUpdatedAt(entry.changedAt, language)} · {entry.changedBy || "Unknown user"}
                      </p>
                    </div>
                    {currentSession?.isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditRestoreEntry(entry)}
                        className="border-[#b9cabb]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore previous
                      </Button>
                    )}
                  </div>
                  {changes.length > 0 ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[#e0e6de]">
                      <div className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] bg-[#f5f8f3] px-3 py-2 text-xs font-black uppercase tracking-[0.06em] text-[#617568]">
                        <span>Field</span><span>Previous</span><span>New</span>
                      </div>
                      {changes.map((change) => (
                        <div key={change.field} className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-t border-[#e6ebe4] px-3 py-2.5 text-sm">
                          <span className="font-bold text-[#315845]">{auditFieldLabel(change.field)}</span>
                          <span className="break-words text-[#718178]">{formatAuditValue(change.field, change.before)}</span>
                          <span className="break-words font-semibold text-[#183529]">{formatAuditValue(change.field, change.after)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#718178]">Record state was restored without field-level differences.</p>
                  )}
                </article>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(auditRestoreEntry)}
        onOpenChange={(open) => {
          if (!open && !auditRestoring) setAuditRestoreEntry(null);
        }}
      >
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore the previous value?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the record&apos;s current value with the version shown in the Previous column. The restore itself will also be recorded in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={auditRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void restoreAuditVersion()}
              disabled={auditRestoring}
              className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
            >
              {auditRestoring ? "Restoring…" : "Restore previous value"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(backupPreview)}
        onOpenChange={(open) => {
          if (!open && !backupSaving) setBackupPreview(null);
        }}
      >
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Preview backup restore</AlertDialogTitle>
            <AlertDialogDescription>
              Restoring will replace the current database records with this snapshot. Payment document files already stored in the system are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {backupPreview && (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-[#d7ded5] bg-[#f7faf5] p-3">
              <p className="mb-2 text-sm font-black">
                {formatUpdatedAt(backupPreview.backup.createdAt, language)} · {backupPreview.backup.recordCount} records
              </p>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(backupPreview.counts).map(([table, count]) => (
                  <div key={table} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2">
                    <dt>{auditFieldLabel(table)}</dt><dd className="font-black">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={backupSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void restoreBackup()} disabled={backupSaving} className="bg-rose-700 text-white hover:bg-rose-800">
              {backupSaving ? "Restoring…" : "Restore this snapshot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
        <DialogContent className="bg-white text-[#14241b] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create the next workplan</DialogTitle>
            <DialogDescription>
              Unfinished activities and open contract obligations are always carried forward. You can also copy the complete structure as a planning template.
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
                onChange={(event) => {
                  setNewYear(Number(event.target.value));
                  setTransferPreviewVisible(false);
                }}
                className="h-11 border-[#cbd6cc] bg-white"
              />
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-[#d8e0d6] bg-[#f7faf5] p-4">
              <Checkbox
                checked={copyCurrentYear}
                onCheckedChange={(checked) => {
                  setCopyCurrentYear(Boolean(checked));
                  setTransferPreviewVisible(false);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-bold">Copy the {selectedYear} structure</span>
                <span className="mt-1 block text-sm leading-5 text-[#718178]">
                  Include completed activities too. If left off, only unfinished activities, their required budget lines, and open contracts transfer to the new draft.
                </span>
              </span>
            </label>
            {transferPreviewVisible && (
              <section className="rounded-xl border border-[#b9cabb] bg-[#eef4eb] p-4">
                <h3 className="font-black">Transfer preview</h3>
                <p className="mt-1 text-sm text-[#5d7467]">
                  The following records will be highlighted as transferred in the {newYear} draft. Only the remaining budget after commitments and expenditure is carried forward.
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-3">
                    <dt className="text-xs text-[#718178]">Activities</dt>
                    <dd className="mt-1 text-xl font-black">{transferPreview.activities.length}</dd>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <dt className="text-xs text-[#718178]">Sub-activities</dt>
                    <dd className="mt-1 text-xl font-black">{transferPreview.subactivities}</dd>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <dt className="text-xs text-[#718178]">Contracts</dt>
                    <dd className="mt-1 text-xl font-black">{transferPreview.contracts.length}</dd>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <dt className="text-xs text-[#718178]">Remaining budget</dt>
                    <dd className="mt-1 text-sm font-black tabular-nums">{formatMnt(transferPreview.remainingBudgetMnt)}</dd>
                  </div>
                </dl>
                <div className="mt-3 max-h-28 overflow-y-auto text-xs text-[#405a4d]">
                  {transferPreview.activities.slice(0, 8).map((activity) => (
                    <p key={activity.id} className="py-1">
                      <strong>{activity.code || activity.uid}</strong> · {activity.title}
                    </p>
                  ))}
                  {transferPreview.activities.length > 8 && (
                    <p className="py-1 font-bold">
                      + {transferPreview.activities.length - 8} more activities
                    </p>
                  )}
                </div>
              </section>
            )}
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
              {yearSaving
                ? "Creating…"
                : transferPreviewVisible
                  ? `Confirm and create ${newYear}`
                  : "Preview transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={yearDeleteOpen} onOpenChange={setYearDeleteOpen}>
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the entire {selectedYear} workplan?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected draft year, including its activities, budgets, allocations, finance entries, contracts, payment records, and quarterly updates. The 2026 workplan will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={yearSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeWorkplanYear}
              disabled={yearSaving}
              className="bg-rose-700 text-white hover:bg-rose-800"
            >
              {yearSaving ? "Deleting…" : `Delete ${selectedYear} workplan`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={planDialogOpen} onOpenChange={(open) => changeFormDialog(open, setPlanDialogOpen)}>
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

          <div className="rounded-2xl border border-[#dbe3d9] bg-[#f7f9f5] p-3">
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(" + (planRecordType === "activity" ? 3 : 2) + ", minmax(0, 1fr))" }}>
              {(planRecordType === "activity"
                ? ["Basics", "Schedule & responsibility", "Results"]
                : ["Details", "Responsibility"]
              ).map((label, index) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => setPlanFormStep(index)}
                  className={[
                    "rounded-xl border px-3 py-2 text-left transition",
                    index === planFormStep
                      ? "border-[#0c3b2d] bg-[#0c3b2d] text-white"
                      : "border-[#cbd6cc] bg-white text-[#486255] hover:border-[#73927f] hover:bg-[#f2f7ef]",
                  ].join(" ")}
                  aria-current={index === planFormStep ? "step" : undefined}
                >
                  <span className="block text-[10px] font-black uppercase tracking-[0.08em] opacity-70">
                    Step {index + 1}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-black">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {planRecordType === "activity" ? (
            <>
              {planFormStep === 0 && (
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <h3 className="font-black">Activity basics</h3>
                    <p className="mt-1 text-xs text-[#718178]">
                      Identify the activity and place it in the workplan structure.
                    </p>
                  </div>
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
                    <NativeSelect
                      value={activityPlanDraft.workstream}
                      onChange={(event) =>
                        setActivityPlanDraft((current) => ({ ...current, workstream: event.target.value }))
                      }
                      className="h-11 w-full border-[#cbd6cc] bg-white"
                    >
                      <NativeSelectOption value="">Choose workstream</NativeSelectOption>
                      {activityPlanDraft.workstream && !workstreams.includes(activityPlanDraft.workstream) && (
                        <NativeSelectOption value={activityPlanDraft.workstream}>{activityPlanDraft.workstream}</NativeSelectOption>
                      )}
                      {workstreams.map((value) => (
                        <NativeSelectOption key={value} value={value}>{metadataLabel("workstream", value)}</NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                      {sectionOptions.map((item) => (
                        <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold">Goal</span>
                    <NativeSelect
                      value={activityPlanDraft.goal}
                      onChange={(event) =>
                        setActivityPlanDraft((current) => ({ ...current, goal: event.target.value }))
                      }
                      className="h-11 w-full border-[#cbd6cc] bg-white"
                    >
                      <NativeSelectOption value="">Choose goal</NativeSelectOption>
                      {activityPlanDraft.goal && !goals.includes(activityPlanDraft.goal) && (
                        <NativeSelectOption value={activityPlanDraft.goal}>{activityPlanDraft.goal}</NativeSelectOption>
                      )}
                      {goals.map((value) => (
                        <NativeSelectOption key={value} value={value}>{metadataLabel("goal", value)}</NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                    <NativeSelect
                      value={activityPlanDraft.actionPlan}
                      onChange={(event) =>
                        setActivityPlanDraft((current) => ({ ...current, actionPlan: event.target.value }))
                      }
                      className="h-11 w-full border-[#cbd6cc] bg-white"
                    >
                      <NativeSelectOption value="">Choose reference</NativeSelectOption>
                      {activityPlanDraft.actionPlan && !actionPlanReferences.includes(activityPlanDraft.actionPlan) && (
                        <NativeSelectOption value={activityPlanDraft.actionPlan}>{activityPlanDraft.actionPlan}</NativeSelectOption>
                      )}
                      {actionPlanReferences.map((value) => (
                        <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </label>
                </div>
              )}

              {planFormStep === 1 && (
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <h3 className="font-black">Schedule and responsibility</h3>
                    <p className="mt-1 text-xs text-[#718178]">
                      Add delivery dates, the MECC lead, and organizations providing support.
                    </p>
                  </div>
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
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-bold">MECC lead</span>
                    <Input
                      value={activityPlanDraft.lead}
                      onChange={(event) =>
                        setActivityPlanDraft((current) => ({
                          ...current,
                          lead: event.target.value,
                        }))
                      }
                      placeholder="Write name(s)"
                      className="h-11 border-[#cbd6cc] bg-white"
                    />
                  </label>
                  <fieldset className="sm:col-span-2">
                    <legend className="mb-1.5 text-sm font-black">
                      Responsibility assignment
                    </legend>
                    <p className="mb-3 text-xs text-[#718178]">
                      Choose one accountable owner and up to two supporting owners.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[0, 1, 2].map((ownerIndex) => {
                        const selectedOwners = ownerNames(
                          activityPlanDraft.owner,
                          teamMembers,
                        );
                        return (
                          <label key={ownerIndex} className="block">
                            <span className="mb-1.5 block text-xs font-bold text-[#53685c]">
                              {ownerIndex === 0
                                ? "Accountable owner"
                                : `Supporting owner ${ownerIndex}`}
                            </span>
                            <NativeSelect
                              value={selectedOwners[ownerIndex] ?? ""}
                              onChange={(event) =>
                                setActivityPlanDraft((current) => ({
                                  ...current,
                                  owner: setOwnerSlot(
                                    current.owner,
                                    ownerIndex,
                                    event.target.value,
                                    teamMembers,
                                  ),
                                }))
                              }
                              className="h-11 w-full border-[#cbd6cc] bg-white"
                            >
                              <NativeSelectOption value="">
                                {ownerIndex === 0
                                  ? "Accountable owner"
                                  : "Optional"}
                              </NativeSelectOption>
                              {teamMembers.map((item) => (
                                <NativeSelectOption
                                  key={item.id}
                                  value={item.name}
                                  disabled={selectedOwners.some(
                                    (owner, index) =>
                                      index !== ownerIndex && owner === item.name,
                                  )}
                                >
                                  {item.name} · {item.role}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-bold">Support/Partners</span>
                    <Textarea
                      value={activityPlanDraft.support}
                      onChange={(event) =>
                        setActivityPlanDraft((current) => ({
                          ...current,
                          support: event.target.value,
                        }))
                      }
                      className="min-h-28 border-[#cbd6cc] bg-white"
                    />
                  </label>
                </div>
              )}

              {planFormStep === 2 && (
                <div className="grid gap-4 py-2">
                  <div>
                    <h3 className="font-black">Results framework</h3>
                    <p className="mt-1 text-xs text-[#718178]">
                      Define the starting point and the result expected by the end of {selectedYear}.
                    </p>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold">Baseline</span>
                    <Textarea
                      value={activityPlanDraft.baseline}
                      onChange={(event) =>
                        setActivityPlanDraft((current) => ({
                          ...current,
                          baseline: event.target.value,
                        }))
                      }
                      className="min-h-32 border-[#cbd6cc] bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold">{selectedYear} target</span>
                    <Textarea
                      value={activityPlanDraft.target}
                      onChange={(event) =>
                        setActivityPlanDraft((current) => ({
                          ...current,
                          target: event.target.value,
                        }))
                      }
                      className="min-h-32 border-[#cbd6cc] bg-white"
                    />
                  </label>
                </div>
              )}
            </>
          ) : (
            <>
              {planFormStep === 0 && (
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <h3 className="font-black">Sub-activity details</h3>
                    <p className="mt-1 text-xs text-[#718178]">
                      Only fields relevant to this delivery step are shown.
                    </p>
                  </div>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-bold">Sub-activity title</span>
                    <Textarea
                      value={subactivityPlanDraft.title}
                      onChange={(event) =>
                        setSubactivityPlanDraft((current) => ({ ...current, title: event.target.value }))
                      }
                      className="min-h-24 border-[#cbd6cc] bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold">Type of procurement</span>
                    <NativeSelect
                      value={subactivityPlanDraft.procurementType}
                      onChange={(event) =>
                        setSubactivityPlanDraft((current) => ({
                          ...current,
                          procurementType: event.target.value as ProcurementType,
                        }))
                      }
                      className="h-11 w-full border-[#cbd6cc] bg-white"
                    >
                      {procurementTypeOptions.map((item) => (
                        <NativeSelectOption key={item.value} value={item.value}>
                          {item.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                      {initialStatusOptions.map((item) => (
                        <NativeSelectOption key={item.value} value={item.value}>
                          {item.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                </div>
              )}

              {planFormStep === 1 && (
                <div className="py-2">
                  <div>
                    <h3 className="font-black">Responsibility assignment</h3>
                    <p className="mt-1 text-xs text-[#718178]">
                      Choose one accountable owner and up to two supporting owners.
                    </p>
                  </div>
                  <fieldset className="mt-4">
                    <legend className="sr-only">Responsibility assignment</legend>
                    <div className="space-y-3">
                      {[0, 1, 2].map((ownerIndex) => {
                        const selectedOwners = ownerNames(
                          subactivityPlanDraft.owner,
                          teamMembers,
                        );
                        return (
                          <label key={ownerIndex} className="block">
                            <span className="mb-1.5 block text-sm font-bold">
                              {ownerIndex === 0
                                ? "Accountable owner"
                                : "Supporting owner " + ownerIndex}
                            </span>
                            <NativeSelect
                              value={selectedOwners[ownerIndex] ?? ""}
                              onChange={(event) =>
                                setSubactivityPlanDraft((current) => ({
                                  ...current,
                                  owner: setOwnerSlot(
                                    current.owner,
                                    ownerIndex,
                                    event.target.value,
                                    teamMembers,
                                  ),
                                }))
                              }
                              className={[
                                "h-11 w-full bg-white",
                                ownerIndex === 0 && !selectedOwners.length
                                  ? "border-rose-300"
                                  : "border-[#cbd6cc]",
                              ].join(" ")}
                              aria-label={
                                ownerIndex === 0
                                  ? "Sub-activity accountable owner"
                                  : "Sub-activity supporting owner " + ownerIndex
                              }
                            >
                              <NativeSelectOption value="">
                                {ownerIndex === 0
                                  ? "Accountable owner required"
                                  : "Supporting owner " + ownerIndex + " (optional)"}
                              </NativeSelectOption>
                              {teamMembers.map((item) => (
                                <NativeSelectOption
                                  key={item.id}
                                  value={item.name}
                                  disabled={selectedOwners.some(
                                    (owner, index) =>
                                      index !== ownerIndex && owner === item.name,
                                  )}
                                >
                                  {item.name} · {item.role}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              )}
            </>
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
              {planFormStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setPlanFormStep((current) => current - 1)}
                >
                  Back
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => changeFormDialog(false, setPlanDialogOpen)}
              >
                Cancel
              </Button>
              {planFormStep < (planRecordType === "activity" ? 2 : 1) ? (
                <Button
                  onClick={() => {
                    if (
                      planFormStep === 0 &&
                      planRecordType === "activity" &&
                      (!activityPlanDraft.code.trim() ||
                        !activityPlanDraft.title.trim())
                    ) {
                      toast.error("Enter the activity code and title before continuing.");
                      return;
                    }
                    if (
                      planFormStep === 0 &&
                      planRecordType === "subactivity" &&
                      !subactivityPlanDraft.title.trim()
                    ) {
                      toast.error("Enter the sub-activity title before continuing.");
                      return;
                    }
                    setPlanFormStep((current) => current + 1);
                  }}
                  className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={savePlanRecord}
                  disabled={planSaving}
                  className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                >
                  {planSaving ? "Saving…" : "Save workplan item"}
                </Button>
              )}
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

      <Dialog open={budgetLineDialogOpen} onOpenChange={(open) => changeFormDialog(open, setBudgetLineDialogOpen)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-3xl">
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
                {sectionOptions.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>{item.label}</NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Goal</span>
              <NativeSelect
                value={budgetLineDraft.goal}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({ ...current, goal: event.target.value }))
                }
                className="h-11 w-full border-[#cbd6cc] bg-white"
              >
                <NativeSelectOption value="">Choose goal</NativeSelectOption>
                {budgetLineDraft.goal && !goals.includes(budgetLineDraft.goal) && (
                  <NativeSelectOption value={budgetLineDraft.goal}>{budgetLineDraft.goal}</NativeSelectOption>
                )}
                {goals.map((value) => (
                  <NativeSelectOption key={value} value={value}>{metadataLabel("goal", value)}</NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Workstream</span>
              <NativeSelect
                value={budgetLineDraft.workstream}
                onChange={(event) =>
                  setBudgetLineDraft((current) => ({ ...current, workstream: event.target.value }))
                }
                className="h-11 w-full border-[#cbd6cc] bg-white"
              >
                <NativeSelectOption value="">Choose workstream</NativeSelectOption>
                {budgetLineDraft.workstream && !workstreams.includes(budgetLineDraft.workstream) && (
                  <NativeSelectOption value={budgetLineDraft.workstream}>{budgetLineDraft.workstream}</NativeSelectOption>
                )}
                {workstreams.map((value) => (
                  <NativeSelectOption key={value} value={value}>{metadataLabel("workstream", value)}</NativeSelectOption>
                ))}
              </NativeSelect>
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
            <div className="sm:col-span-2">
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold">Linked workplan activities</p>
                  <p className="text-xs leading-5 text-[#718178]">
                    Select the main activities funded by this budget line. Their sub-activities are included automatically.
                  </p>
                </div>
                <p className="shrink-0 text-xs font-bold text-[#315845]">
                  {budgetLineDraft.linkedActivityKeys.length} selected
                </p>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-[#cbd6cc] bg-[#f8faf7] p-3">
                {allActivities.map((activity) => {
                  const checked = budgetLineDraft.linkedActivityKeys.includes(
                    activity.id,
                  );
                  return (
                    <label
                      key={activity.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-[#76a38d] bg-[#eaf3e8]" : "border-[#dde5dc] bg-white hover:border-[#b8c8bb]"}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          setBudgetLineDraft((current) => ({
                            ...current,
                            linkedActivityKeys: nextChecked
                              ? Array.from(
                                  new Set([
                                    ...current.linkedActivityKeys,
                                    activity.id,
                                  ]),
                                )
                              : current.linkedActivityKeys.filter(
                                  (key) => key !== activity.id,
                                ),
                          }))
                        }
                        aria-label={`Link activity ${activity.code}`}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-black text-[#2f634c]">
                          {activity.code}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold leading-5 text-[#183529]">
                          {activity.title}
                        </span>
                        <span className="mt-1 block text-xs text-[#718178]">
                          Section {activity.section} · {activity.goal || "No goal"} · {activity.subactivities.length} sub-activities
                        </span>
                      </span>
                    </label>
                  );
                })}
                {!allActivities.length && (
                  <p className="px-2 py-6 text-center text-sm text-[#718178]">
                    Add workplan activities before linking this budget line.
                  </p>
                )}
              </div>
            </div>
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
              <Button
                variant="outline"
                onClick={() => changeFormDialog(false, setBudgetLineDialogOpen)}
              >
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
          if (!open) {
            setSelectedBudgetKey(null);
            setExpandedFinanceActivityKeys(new Set());
            setExpandedFinanceRecordKeys(new Set());
          }
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
                      Main activities are shown first. Open one to view its sub-activities, allocations, and finance records.
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
                        [
                          "Remaining",
                          formatMnt(
                            budgetMnt - totals.commitment - totals.expenditure,
                          ),
                        ],
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

              <div className="rounded-xl border border-[#dce4da] bg-[#f7faf5] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[#496458]">
                    Finance record filters
                  </p>
                  {(financeCreatorFilter !== "all" || financeDateFrom || financeDateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFinanceCreatorFilter("all");
                        setFinanceDateFrom("");
                        setFinanceDateTo("");
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <NativeSelect
                    value={financeCreatorFilter}
                    onChange={(event) => setFinanceCreatorFilter(event.target.value)}
                    className="h-9 border-[#ced8cf] bg-white text-sm"
                    aria-label="Filter budget-line records by person"
                  >
                    <NativeSelectOption value="all">All people</NativeSelectOption>
                    {financeCreatorOptions.map(([email, name]) => (
                      <NativeSelectOption key={email} value={email}>
                        {name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Input
                    type="date"
                    value={financeDateFrom}
                    onChange={(event) => setFinanceDateFrom(event.target.value)}
                    className="h-9 border-[#ced8cf] bg-white"
                    aria-label="Filter budget-line records from date"
                  />
                  <Input
                    type="date"
                    value={financeDateTo}
                    onChange={(event) => setFinanceDateTo(event.target.value)}
                    className="h-9 border-[#ced8cf] bg-white"
                    aria-label="Filter budget-line records to date"
                  />
                </div>
                <p className="mt-2 text-xs text-[#718178]">
                  Filters change the record lists only; financial totals always include every saved record.
                </p>
              </div>

              <div className="space-y-3">
                {selectedBudgetTargets
                  .filter(
                    (target) =>
                      target.kind === "activity" ||
                      expandedFinanceActivityKeys.has(target.activityId),
                  )
                  .map((target) => {
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
                  const rollupKeys = new Set(
                    target.kind === "activity" && activity
                      ? [target.key, ...activity.subactivities.map((item) => item.id)]
                      : [target.key],
                  );
                  const targetEntries = financeEntries.filter(
                    (entry) =>
                      entry.budgetKey === selectedBudgetLine.id &&
                      rollupKeys.has(entry.activityKey),
                  );
                  const visibleTargetEntries = targetEntries.filter(
                    financeEntryMatchesFilters,
                  );
                  const targetContracts = contracts.filter(
                    (contract) =>
                      contract.budgetKey === selectedBudgetLine.id &&
                      rollupKeys.has(contract.activityKey),
                  );
                  const targetFinance = targetEntries.reduce(
                    (totals, entry) => ({
                      ...totals,
                      [entry.entryType]: totals[entry.entryType] + entry.amountMnt,
                    }),
                    { commitment: 0, expenditure: 0 },
                  );
                  targetFinance.commitment += targetContracts.reduce(
                    (total, contract) => total + contractCommitmentMnt(contract),
                    0,
                  );
                  targetFinance.expenditure += targetContracts.reduce(
                    (total, contract) => total + contractPaidMnt(contract),
                    0,
                  );
                  const childAllocatedMnt =
                    target.kind === "activity" && activity
                      ? activity.subactivities.reduce(
                          (total, item) =>
                            total + (allocationByActivityKey.get(item.id) ?? 0),
                          0,
                        )
                      : 0;
                  const allocatedMnt =
                    allocation?.amountMnt ??
                    (target.kind === "activity" ? childAllocatedMnt : 0);
                  const commitmentEntryCount =
                    targetEntries.filter((entry) => entry.entryType === "commitment")
                      .length +
                    targetContracts.filter(
                      (contract) => contractCommitmentMnt(contract) > 0,
                    ).length;
                  const expenditureEntryCount =
                    targetEntries.filter((entry) => entry.entryType === "expenditure")
                      .length +
                    targetContracts.reduce(
                      (total, contract) =>
                        total +
                        contract.payments.filter((payment) => Boolean(payment.paid))
                          .length,
                      0,
                    );
                  const subactivityCount = selectedBudgetTargets.filter(
                    (item) =>
                      item.activityId === target.activityId &&
                      item.kind === "subactivity",
                  ).length;
                  const activityExpanded = expandedFinanceActivityKeys.has(
                    target.activityId,
                  );
                  const recordsExpanded = expandedFinanceRecordKeys.has(target.key);
                  return (
                    <article
                      key={target.key}
                      className={`rounded-2xl border p-4 ${target.kind === "subactivity" ? "ml-3 border-[#dfe7dc] bg-[#fbfcfa] sm:ml-8" : "border-2 border-[#6f9a7f] bg-[#e7f1e5] shadow-[0_6px_18px_rgba(20,65,47,0.12)]"}`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${target.kind === "activity" ? "bg-[#236447] text-white shadow-sm" : "bg-[#eef3ec] text-[#597066]"}`}>
                            <ListChecks className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold uppercase tracking-[0.08em] ${target.kind === "activity" ? "text-[#1f6046]" : "text-[#718178]"}`}>
                              {target.kind === "activity" ? "Main activity" : "Sub-activity"}
                            </p>
                            <h3 className={`mt-1 text-sm font-black leading-6 ${target.kind === "activity" ? "text-[#143d2e]" : ""}`}>
                              {target.kind === "activity" ? `${target.code} · ` : ""}
                              {localizedTargetLabel(target, allActivities, language)}
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
                            variant="outline"
                            size="sm"
                            onClick={() => toggleFinanceRecords(target.key)}
                            aria-expanded={recordsExpanded}
                          >
                            <ReceiptText className="h-4 w-4" />
                            {recordsExpanded ? "Hide finance records" : "See finance records"}
                            {visibleTargetEntries.length + targetContracts.length > 0 && (
                              <span className="rounded-full bg-[#e8f0e8] px-1.5 py-0.5 text-[11px] font-black text-[#285d45]">
                                {visibleTargetEntries.length + targetContracts.length}
                              </span>
                            )}
                          </Button>
                          {target.kind === "activity" && subactivityCount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleFinanceActivity(target.activityId)}
                              aria-expanded={activityExpanded}
                              className="border-[#8cad96] bg-white text-[#245f47] hover:bg-[#f2f7f1] hover:text-[#174d3a]"
                            >
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${activityExpanded ? "rotate-90" : ""}`}
                              />
                              {activityExpanded
                                ? "Hide sub-activities"
                                : `View sub-activities (${subactivityCount})`}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <button
                          type="button"
                          onClick={() =>
                            openAllocationDialog(
                              selectedBudgetLine.id,
                              target.key,
                              allocation,
                            )
                          }
                          className="rounded-xl border border-transparent bg-[#f3f7f1] px-3 py-2.5 text-left transition hover:border-[#86aa91] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236447]"
                        >
                          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[#718178]">
                            Allocated
                            <PencilLine className="h-3.5 w-3.5" />
                          </span>
                          <span className="mt-1 block text-sm font-black tabular-nums">
                            {formatMnt(allocatedMnt)}
                          </span>
                          <span className="mt-1 block text-[11px] font-bold text-[#2f634c]">
                            {allocation ? "Edit or remove" : "Add allocation"}
                          </span>
                        </button>
                        <div className="rounded-xl bg-[#f3f7f1] px-3 py-2.5">
                          <p className="text-xs font-semibold text-[#718178]">Committed</p>
                          <p className="mt-1 text-sm font-black tabular-nums">
                            {formatMnt(targetFinance.commitment)}
                          </p>
                          <span className="mt-1 block text-[11px] font-semibold text-[#718178]">
                            {commitmentEntryCount} {commitmentEntryCount === 1 ? "record" : "records"}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#f3f7f1] px-3 py-2.5">
                          <p className="text-xs font-semibold text-[#718178]">Expenditure</p>
                          <p className="mt-1 text-sm font-black tabular-nums">
                            {formatMnt(targetFinance.expenditure)}
                          </p>
                          <span className="mt-1 block text-[11px] font-semibold text-[#718178]">
                            {expenditureEntryCount} {expenditureEntryCount === 1 ? "record" : "records"}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#f3f7f1] px-3 py-2.5">
                          <p className="text-xs font-semibold text-[#718178]">Available</p>
                          <p className="mt-1 text-sm font-black tabular-nums">
                            {formatMnt(
                              allocatedMnt -
                                targetFinance.commitment -
                                targetFinance.expenditure,
                            )}
                          </p>
                          <span className="mt-1 block text-[11px] font-semibold text-[#718178]">
                            Calculated automatically
                          </span>
                        </div>
                      </div>
                      {recordsExpanded && (
                      <div className="mt-3 rounded-xl border border-[#dfe7dc] bg-white/80 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-[#496458]">
                              Finance records
                            </p>
                            <p className="mt-0.5 text-xs text-[#718178]">
                              {visibleTargetEntries.length + targetContracts.length
                                ? `${visibleTargetEntries.length} matching manual ${visibleTargetEntries.length === 1 ? "entry" : "entries"} · ${targetContracts.length} ${targetContracts.length === 1 ? "contract" : "contracts"}`
                                : "No finance entries or contracts yet"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openFinanceDialog(selectedBudgetLine.id, target.key)
                            }
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </div>
                        {visibleTargetEntries.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {visibleTargetEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex flex-col gap-3 rounded-lg border border-[#e2e7e0] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${entry.entryType === "commitment" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800"}`}
                                    >
                                      {entry.entryType === "commitment"
                                        ? "Commitment"
                                        : "Expenditure"}
                                    </span>
                                    <span className="text-xs font-semibold text-[#718178]">
                                      {formatDate(entry.entryDate, language)}
                                    </span>
                                  </div>
                                  <p className="mt-1 break-words text-sm font-semibold">
                                    {entry.description || entry.vendor || "No description"}
                                  </p>
                                  {entry.vendor && entry.description && (
                                    <p className="mt-0.5 break-words text-xs text-[#718178]">
                                      {entry.vendor}
                                    </p>
                                  )}
                                  <p className="mt-1 text-xs font-semibold text-[#4f695b]">
                                    Entered by {financeEntryCreatorName(entry, teamMembers)}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                                  <p className="mr-1 text-sm font-black tabular-nums">
                                    {formatMnt(entry.amountMnt)}
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                      openFinanceDialog(
                                        selectedBudgetLine.id,
                                        target.key,
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
                              </div>
                            ))}
                          </div>
                        )}
                        {targetContracts.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-[#e2e7e0] pt-3">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-[#496458]">
                              Contract commitments
                            </p>
                            {targetContracts.map((contract) => (
                              <div
                                key={contract.id}
                                className="flex flex-col gap-3 rounded-lg border border-[#d8e2d6] bg-[#f8faf7] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                                      {contract.contractNumber}
                                    </span>
                                    <span className="text-xs font-semibold text-[#718178]">
                                      {contract.serviceProviderName}
                                    </span>
                                  </div>
                                  <p className="mt-1 break-words text-sm font-semibold">
                                    {contract.torName}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-4 text-right">
                                  <div>
                                    <p className="text-[11px] font-semibold text-[#718178]">Committed</p>
                                    <p className="text-sm font-black tabular-nums">
                                      {formatMnt(contractCommitmentMnt(contract))}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold text-[#718178]">Paid</p>
                                    <p className="text-sm font-black tabular-nums text-emerald-800">
                                      {formatMnt(contractPaidMnt(contract))}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBudgetKey(null);
                                      setActiveView("contracts");
                                      setContractQuery(contract.contractNumber);
                                    }}
                                  >
                                    Open contract
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      )}
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

      <Dialog open={financeDialogOpen} onOpenChange={(open) => changeFormDialog(open, setFinanceDialogOpen)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingFinanceId ? "Edit finance entry" : "Add finance entry"}
            </DialogTitle>
            <DialogDescription>
              {editingFinanceId
                ? "Update or remove this commitment or expenditure record."
                : "Record a commitment or expenditure for the selected workplan item."}
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
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editingFinanceId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const entry = financeEntries.find(
                      (item) => item.id === editingFinanceId,
                    );
                    if (entry) setFinanceDeleteEntry(entry);
                  }}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => changeFormDialog(false, setFinanceDialogOpen)}
              >
                Cancel
              </Button>
              <Button
                onClick={saveFinanceEntry}
                disabled={financeSaving || financeState === "loading"}
                className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
              >
                {financeSaving
                  ? "Saving…"
                  : editingFinanceId
                    ? "Save changes"
                    : "Save entry"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(financeDeleteEntry)}
        onOpenChange={(open) => {
          if (!open) setFinanceDeleteEntry(null);
        }}
      >
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this finance entry?</AlertDialogTitle>
            <AlertDialogDescription>
              The {financeDeleteEntry?.entryType ?? "finance"} record for {financeDeleteEntry ? formatMnt(financeDeleteEntry.amountMnt) : "this amount"} will be deleted and the totals will update automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={financeSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeFinanceEntry}
              disabled={financeSaving}
              className="bg-rose-700 text-white hover:bg-rose-800"
            >
              {financeSaving ? "Removing…" : "Remove entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={contractDialogOpen}
        onOpenChange={(open) => {
          if (
            !open &&
            formDirty &&
            !window.confirm("You have unsaved changes. Leave this form without saving?")
          ) return;
          setContractDialogOpen(open);
          if (!open) {
            setEditingContractId(null);
            setFormDirty(false);
          }
        }}
      >
        <DialogContent className="max-h-[94vh] w-[96vw] overflow-y-auto bg-white text-[#14241b] sm:max-w-5xl!">
          <DialogHeader>
            <DialogTitle>
              {editingContractId ? "Edit contract" : "Add contract"}
            </DialogTitle>
            <DialogDescription>
              The total contract value is committed immediately. Each paid deliverable moves its amount from commitment to expenditure.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <section className="grid gap-4 rounded-2xl border border-[#d8e0d6] bg-[#fbfcfa] p-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Contract number</span>
                <Input
                  value={contractDraft.contractNumber}
                  onChange={(event) =>
                    setContractDraft((current) => ({
                      ...current,
                      contractNumber: event.target.value,
                    }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                  placeholder="PFP-2026-001"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Contract status</span>
                <NativeSelect
                  value={contractDraft.status}
                  onChange={(event) =>
                    setContractDraft((current) => ({
                      ...current,
                      status: event.target.value as ContractRecord["status"],
                    }))
                  }
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  {Object.entries(contractStatusMeta).map(([value, meta]) => (
                    <NativeSelectOption key={value} value={value}>
                      {meta.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold">
                  Workplan activity or sub-activity
                </span>
                <NativeSelect
                  value={contractDraft.activityKey}
                  onChange={(event) => selectContractTarget(event.target.value)}
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  <NativeSelectOption value="">Choose workplan item</NativeSelectOption>
                  {contractTargets.map((target) => (
                    <NativeSelectOption key={target.key} value={target.key}>
                      {target.code} · {target.kind === "subactivity" ? "Sub-activity · " : ""}{localizedTargetLabel(target, allActivities, language)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {contractDraft.budgetKey && (
                  <span className="mt-1.5 block text-xs font-semibold text-[#2f634c]">
                    Budget line: {allBudgetLines.find((line) => line.id === contractDraft.budgetKey)?.code ?? "—"}
                  </span>
                )}
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-bold">
                  Terms of Reference (ToR) name
                </span>
                <Textarea
                  value={contractDraft.torName}
                  onChange={(event) =>
                    setContractDraft((current) => ({
                      ...current,
                      torName: event.target.value,
                    }))
                  }
                  className="min-h-20 border-[#cbd6cc] bg-white"
                  placeholder="Name of assignment or procurement"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Service provider name</span>
                <Input
                  value={contractDraft.serviceProviderName}
                  onChange={(event) =>
                    setContractDraft((current) => ({
                      ...current,
                      serviceProviderName: event.target.value,
                    }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Service provider type</span>
                <NativeSelect
                  value={contractDraft.serviceProviderType}
                  onChange={(event) =>
                    setContractDraft((current) => ({
                      ...current,
                      serviceProviderType: event.target.value,
                    }))
                  }
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  {contractDraft.serviceProviderType &&
                    !serviceProviderTypeOptions.some(
                      (item) => item.value === contractDraft.serviceProviderType,
                    ) && (
                      <NativeSelectOption value={contractDraft.serviceProviderType}>
                        {contractDraft.serviceProviderType}
                      </NativeSelectOption>
                    )}
                  {serviceProviderTypeOptions.map((item) => (
                    <NativeSelectOption key={item.value} value={item.value}>
                      {item.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Start date</span>
                <Input
                  type="date"
                  value={contractDraft.startDate}
                  onChange={(event) =>
                    setContractDraft((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">End date</span>
                <Input
                  type="date"
                  value={contractDraft.endDate}
                  onChange={(event) =>
                    setContractDraft((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="h-11 border-[#cbd6cc] bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">Contract currency</span>
                <NativeSelect
                  value={contractDraft.currency}
                  disabled={contractDraft.payments.some((payment) => payment.paid)}
                  onChange={(event) => {
                    const currency = event.target.value as "MNT" | "USD";
                    setContractDraft((current) => ({
                      ...current,
                      currency,
                      amountMnt: "",
                      foreignAmount: "",
                      exchangeRateMnt: "",
                      payments: current.payments.map((payment) => ({
                        ...payment,
                        amountMnt: "",
                        foreignAmount: "",
                      })),
                    }));
                  }}
                  className="h-11 w-full border-[#cbd6cc] bg-white"
                >
                  <NativeSelectOption value="MNT">MNT · Mongolian tugrik</NativeSelectOption>
                  <NativeSelectOption value="USD">USD · US dollar</NativeSelectOption>
                </NativeSelect>
              </label>
              {contractDraft.currency === "USD" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold">Signed exchange rate (MNT per USD)</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={contractDraft.exchangeRateMnt}
                    onChange={(event) => updateContractExchangeRate(event.target.value)}
                    disabled={contractDraft.payments.some((payment) => payment.paid)}
                    className="h-11 border-[#cbd6cc] bg-white"
                    placeholder="3,450"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">
                  Total contract amount ({contractDraft.currency})
                </span>
                <Input
                  type="text"
                  inputMode={contractDraft.currency === "USD" ? "decimal" : "numeric"}
                  value={
                    contractDraft.currency === "USD"
                      ? contractDraft.foreignAmount
                      : contractDraft.amountMnt
                  }
                  onChange={(event) =>
                    contractDraft.currency === "USD"
                      ? updateContractForeignTotal(event.target.value)
                      : updateContractTotal(event.target.value)
                  }
                  disabled={contractDraft.payments.some((payment) => payment.paid)}
                  className="h-11 border-[#cbd6cc] bg-white"
                  placeholder={contractDraft.currency === "USD" ? "100,000.00" : "100,000,000"}
                />
              </label>
              <div className="rounded-xl border border-[#d8e0d6] bg-[#f2f6f0] p-3">
                <p className="text-xs font-semibold text-[#718178]">Committed amount in MNT</p>
                <p className="mt-1 text-lg font-black">
                  {formatMnt(Number(contractDraft.amountMnt.replace(/,/g, "")) || 0)}
                </p>
                <p className="mt-1 text-xs text-[#718178]">
                  The signed exchange rate is locked once a payment is paid.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#cbd8c9] bg-[#eef4eb] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-black">Payment structure</h3>
                  <p className="mt-1 text-sm text-[#718178]">
                    Split the total into any number of dated deliverables.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={addContractPayment}>
                  <Plus className="h-4 w-4" /> Add payment
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {contractDraft.payments.map((payment, index) => (
                  <div
                    key={payment.id || `new-payment-${index}`}
                    className="rounded-xl border border-[#d7e0d5] bg-white p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-black">Payment {index + 1}</p>
                      <div className="flex items-center gap-2">
                        {payment.paid && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            Paid {payment.paidAt ? formatDate(payment.paidAt, language) : ""}
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeContractPayment(index)}
                          disabled={contractDraft.payments.length === 1 || payment.paid}
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          aria-label={`Remove payment ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_150px_1.5fr_110px_170px]">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-[#53685c]">Payment label</span>
                        <Input
                          value={payment.label}
                          onChange={(event) => updateContractPayment(index, "label", event.target.value)}
                          disabled={payment.paid}
                          className="h-10 border-[#cbd6cc] bg-white"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-[#53685c]">Date</span>
                        <Input
                          type="date"
                          value={payment.dueDate}
                          onChange={(event) => updateContractPayment(index, "dueDate", event.target.value)}
                          disabled={payment.paid}
                          className="h-10 border-[#cbd6cc] bg-white"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-[#53685c]">Deliverable</span>
                        <Input
                          value={payment.deliverable}
                          onChange={(event) => updateContractPayment(index, "deliverable", event.target.value)}
                          disabled={payment.paid}
                          placeholder="e.g. Inception report"
                          className="h-10 border-[#cbd6cc] bg-white"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-[#53685c]">Amount %</span>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={payment.percentage}
                          onChange={(event) => updateContractPayment(index, "percentage", event.target.value)}
                          disabled={payment.paid}
                          className="h-10 border-[#cbd6cc] bg-white"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-[#53685c]">
                          Amount ({contractDraft.currency})
                        </span>
                        <Input
                          type="text"
                          inputMode={contractDraft.currency === "USD" ? "decimal" : "numeric"}
                          value={
                            contractDraft.currency === "USD"
                              ? payment.foreignAmount
                              : payment.amountMnt
                          }
                          onChange={(event) =>
                            updateContractPayment(
                              index,
                              contractDraft.currency === "USD"
                                ? "foreignAmount"
                                : "amountMnt",
                              event.target.value,
                            )
                          }
                          disabled={payment.paid}
                          className="h-10 border-[#cbd6cc] bg-white"
                        />
                        {contractDraft.currency === "USD" && (
                          <span className="mt-1 block text-[11px] text-[#718178]">
                            {formatMnt(Number(payment.amountMnt.replace(/,/g, "")) || 0)}
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3">
                  <dt className="text-xs font-semibold text-[#718178]">Contract total</dt>
                  <dd className="mt-1 font-black tabular-nums">
                    {formatMnt(Number(contractDraft.amountMnt.replace(/,/g, "")) || 0)}
                  </dd>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <dt className="text-xs font-semibold text-[#718178]">Payment total</dt>
                  <dd className="mt-1 font-black tabular-nums">
                    {formatMnt(
                      contractDraft.payments.reduce(
                        (total, payment) =>
                          total + Number(payment.amountMnt.replace(/,/g, "") || 0),
                        0,
                      ),
                    )}
                  </dd>
                </div>
                <div className="col-span-2 rounded-xl bg-white p-3 sm:col-span-1">
                  <dt className="text-xs font-semibold text-[#718178]">Percentage total</dt>
                  <dd className="mt-1 font-black tabular-nums">
                    {contractDraft.payments.reduce(
                      (total, payment) => total + Number(payment.percentage || 0),
                      0,
                    )}%
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (changeFormDialog(false, setContractDialogOpen)) {
                  setEditingContractId(null);
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveContract}
              disabled={contractSaving}
              className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
            >
              {contractSaving ? "Saving…" : editingContractId ? "Save changes" : "Save contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(contractToClose)}
        onOpenChange={(open) => {
          if (!open) setContractToClose(null);
        }}
      >
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Close this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              {contractToClose
                ? `${contractToClose.contractNumber} has ${formatMnt(contractCommitmentMnt(contractToClose))} outstanding. Closing it releases that unpaid amount from commitments; paid expenditure remains unchanged.`
                : "The unpaid contract balance will be released from commitments."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={contractSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={closeContract}
              disabled={contractSaving}
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              {contractSaving ? "Closing…" : "Close contract"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(contractToDelete)}
        onOpenChange={(open) => {
          if (!open) setContractToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-white text-[#14241b]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contract?</AlertDialogTitle>
            <AlertDialogDescription>
              {contractToDelete
                ? `${contractToDelete.contractNumber}, its payment schedule, and attached payment documents will be removed. The audit history will keep a record of what was deleted.`
                : "The contract and its related records will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={contractSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteContract}
              disabled={contractSaving}
              className="bg-rose-700 text-white hover:bg-rose-800"
            >
              {contractSaving ? "Deleting…" : "Delete contract"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={teamDialogOpen} onOpenChange={(open) => changeFormDialog(open, setTeamDialogOpen)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-[#14241b] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingTeamId ? "Edit team member" : "Add team member"}
            </DialogTitle>
            <DialogDescription>
              Add the email they will use to sign in. Only administrators can manage team access.
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
              <span className="mb-1.5 block text-sm font-bold">Sign-in email</span>
              <Input
                type="email"
                value={teamDraft.email}
                onChange={(event) =>
                  setTeamDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="h-11 border-[#cbd6cc] bg-white"
                placeholder="name@example.org"
              />
              <span className="mt-1.5 block text-xs leading-5 text-[#718178]">
                The invitation must be opened using this exact email address.
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Access level</span>
              <NativeSelect
                value={teamDraft.accessRole}
                onChange={(event) =>
                  setTeamDraft((current) => ({
                    ...current,
                    accessRole: event.target.value as TeamDraft["accessRole"],
                  }))
                }
                className="h-11 w-full border-[#cbd6cc] bg-white"
              >
                <NativeSelectOption value="member">Team member</NativeSelectOption>
                <NativeSelectOption value="admin">Administrator</NativeSelectOption>
              </NativeSelect>
              <span className="mt-1.5 block text-xs leading-5 text-[#718178]">
                Administrators can add people, prepare invitations, and grant administrator access.
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Member type</span>
              <NativeSelect
                value={teamDraft.group}
                onChange={(event) =>
                  setTeamDraft((current) => ({
                    ...current,
                    group: event.target.value,
                  }))
                }
                className="h-11 w-full border-[#cbd6cc] bg-white"
              >
                {teamDraft.group &&
                  !metadata.member_type.some((item) => item.value === teamDraft.group) && (
                    <NativeSelectOption value={teamDraft.group}>
                      {teamDraft.group} (current)
                    </NativeSelectOption>
                  )}
                {metadata.member_type.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>
                    {item.label}
                  </NativeSelectOption>
                ))}
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
              <Button
                variant="outline"
                onClick={() => changeFormDialog(false, setTeamDialogOpen)}
              >
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
              The member will disappear from team reports and filters. They will be removed from every assigned owner list; other co-owners stay assigned, and items with no owner left will show a red warning. Notes and finance records remain unchanged.
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
          if (!open && changeFormDialog(false, () => setSelectedId(null))) {
            setEditKey("");
          }
        }}
      >
        <DialogContent className="flex h-[94vh] max-h-[94vh] w-[98vw] max-w-none! flex-col gap-0 overflow-hidden bg-white p-0 text-[#14241b] sm:max-w-[96vw]! 2xl:max-w-[1640px]!">
          {selected && (
            <>
              <DialogHeader className="shrink-0 border-b border-[#dce3da] bg-white px-5 py-4 pr-14 text-left sm:px-6">
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-sm font-black text-[#2f634c]">
                    {selected.code || selected.uid}
                  </p>
                  <DialogTitle className="text-xl font-black leading-tight tracking-[-0.025em] sm:text-2xl">
                    {language === "mn" && selected.titleMn?.trim()
                      ? selected.titleMn
                      : selected.title}
                  </DialogTitle>
                  <DialogDescription className="text-[#718178]">
                    {metadataLabel("workstream", selected.workstream) || "Programme management"}
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.7fr)] lg:overflow-hidden">
                <aside className="border-b border-[#dbe3d9] bg-[#eef4eb] p-5 lg:overflow-y-auto lg:border-r lg:border-b-0">
                  <section className="rounded-3xl border-2 border-[#082d22] bg-[#0d4635] p-5 text-white shadow-[0_14px_34px_rgba(12,59,45,0.22)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100/70">
                          Main activity
                        </p>
                        <p className="mt-2 text-base font-black leading-6">
                          {selected.code || selected.uid}
                        </p>
                      </div>
                      <StatusPill status={deriveActivityStatus(selected, updates)} label={metadataLabel("status", deriveActivityStatus(selected, updates))} />
                    </div>

                    <div className="mt-5">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-emerald-100/70">Overall progress</p>
                          <p className="mt-1 text-3xl font-black">
                            {deriveActivityProgress(selected, updates)}%
                          </p>
                        </div>
                        <p className="text-right text-xs leading-5 text-emerald-100/75">
                          Average of<br />sub-activities
                        </p>
                      </div>
                      <Progress
                        value={deriveActivityProgress(selected, updates)}
                        className="mt-3 h-2 bg-white/15 [&_[data-slot=progress-indicator]]:bg-[#dbf081]"
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
                      <div>
                        <p className="text-emerald-100/65">Start</p>
                        <p className="mt-1 font-bold">{formatDate(selected.startDate, language)}</p>
                      </div>
                      <div>
                        <p className="text-emerald-100/65">Due</p>
                        <p className="mt-1 font-bold">{formatDate(selected.endDate, language)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-emerald-100/65">Accountable owner</p>
                        <p className={responsibilityParts(activityOwner(selected, updates), teamMembers).accountable ? "mt-1 font-bold" : "mt-1 font-bold text-rose-200"}>
                          {responsibilityParts(activityOwner(selected, updates), teamMembers).accountable || "Owner required"}
                        </p>
                        {responsibilityParts(activityOwner(selected, updates), teamMembers).supporting.length > 0 && (
                          <p className="mt-1 text-xs text-emerald-100/75">
                            Supporting: {responsibilityParts(activityOwner(selected, updates), teamMembers).supporting.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-emerald-100/65">Allocated budget</p>
                        <p className="mt-1 text-lg font-black text-[#dbf081]">
                          {formatMnt(selectedAllocatedMnt)}
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <Button
                      size="sm"
                      onClick={() =>
                        openUpdateEditor(targetForActivity(selected, updates))
                      }
                      className="h-8 rounded-lg bg-[#0c3b2d] px-2.5 text-xs text-white hover:bg-[#174d3a]"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Update activity
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditActivity(selected)}
                      className="h-8 rounded-lg border-[#b9cabb] bg-white px-2.5 text-xs"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Edit details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void openAuditHistory({ entityType: "activity", entityKey: selected.id, label: selected.code || selected.title })}
                      className="h-8 rounded-lg border-[#b9cabb] bg-white px-2.5 text-xs"
                    >
                      <History className="h-3.5 w-3.5" />
                      History
                    </Button>
                  </div>

                  {renderInlineUpdateEditor(
                    targetForActivity(selected, updates),
                    true,
                  )}

                  <details className="group mt-4 rounded-2xl border border-[#ced9ce] bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-black marker:hidden">
                      <span>Workplan details</span>
                      <ChevronRight className="h-4 w-4 text-[#5d7467] transition-transform group-open:rotate-90" />
                    </summary>
                    <dl className="grid gap-4 border-t border-[#e0e6de] p-4 text-sm">
                      <div>
                        <dt className="text-[#718178]">Goal</dt>
                        <dd className="mt-1 font-bold">{selected.goal || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[#718178]">Priority</dt>
                        <dd className="mt-1 font-bold">{selected.priority || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[#718178]">MECC lead</dt>
                        <dd className="mt-1 font-bold">{selected.lead || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-[#718178]">{selectedYear} target</dt>
                        <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                          {selected.target || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#718178]">Baseline</dt>
                        <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                          {selected.baseline || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#718178]">Support/Partners</dt>
                        <dd className="mt-1 whitespace-pre-line font-medium leading-6">
                          {supportPartnersForActivity(selected) || "—"}
                        </dd>
                      </div>
                    </dl>
                  </details>
                </aside>

                <section className="bg-white p-4 lg:overflow-y-auto sm:p-5">
                  <div className="mb-3 flex flex-col gap-2 border-b border-[#e0e6de] pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black">Sub-activities</h3>
                      <p className="mt-0.5 text-xs text-[#718178]">
                        Edit each sub-activity directly inside its own card.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddSubactivity(selected)}
                      className="border-[#b9cabb] bg-white"
                    >
                      <Plus className="h-4 w-4" />
                      Add sub-activity
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {selected.subactivities.map((sub, index) => {
                      const currentStatus = recordStatus(
                        sub.id,
                        sub.status as StatusKey,
                        updates,
                      );
                      const currentProgress = recordProgress(
                        sub.id,
                        statusMetaFor(sub.status as StatusKey).weight,
                        updates,
                      );
                      const currentResponsibility = responsibilityParts(
                        subactivityOwner(sub, updates),
                        teamMembers,
                      );
                      const currentOwner = currentResponsibility.accountable;
                      const isEditing = activeTarget?.key === sub.id;

                      return (
                        <article
                          key={sub.id}
                          className={
                            isEditing
                              ? "rounded-xl border-2 border-[#4c8166] bg-[#f1f7ee] p-3.5 shadow-[0_8px_22px_rgba(35,91,67,0.1)] sm:p-4"
                              : "rounded-xl border border-[#dbe3d9] bg-white p-3.5 sm:p-4"
                          }
                        >
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <span className="rounded-lg bg-[#e8f1e6] p-2 text-[#2c795a]">
                                <ListChecks className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6b7c72]">
                                  Sub-activity {index + 1}
                                </p>
                                <p className="mt-0.5 text-sm font-black leading-5">
                                  {sub.title}
                                </p>
                              </div>
                            </div>
                            <StatusPill status={currentStatus} label={metadataLabel("status", currentStatus)} />
                          </div>

                          <div className="mt-3 flex items-center gap-2.5">
                            <Progress
                              value={currentProgress}
                              className="h-1.5 flex-1 bg-[#e1e8de] [&_[data-slot=progress-indicator]]:bg-[#2c795a]"
                            />
                            <span className="w-10 text-right text-xs font-black text-[#315845]">
                              {currentProgress}%
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2.5 border-t border-[#e4e9e2] pt-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <div className="min-w-0">
                              <p
                                className={
                                  currentOwner
                                    ? "flex min-w-0 items-center gap-2 text-sm font-semibold text-[#315845]"
                                    : "flex min-w-0 items-center gap-2 text-sm font-semibold text-rose-700"
                                }
                              >
                                <span
                                  className={
                                    currentOwner
                                      ? "h-2 w-2 shrink-0 rounded-full bg-emerald-600"
                                      : "h-2 w-2 shrink-0 rounded-full bg-rose-600"
                                  }
                                />
                                {currentOwner || "Owner required"}
                              </p>
                              <p className="mt-1 text-xs text-[#718178]">
                                Type of procurement: {procurementTypeForSubactivity(sub)}
                              </p>
                            </div>
                            <div className="sm:text-right">
                              {currentResponsibility.supporting.length > 0 && (
                                <p className="text-xs text-[#718178]">
                                  Supporting: {currentResponsibility.supporting.join(", ")}
                                </p>
                              )}
                              <p className="mt-1 text-sm font-bold text-[#315845]">
                                Allocated {formatMnt(allocationByActivityKey.get(sub.id) ?? 0)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void openAuditHistory({ entityType: "activity", entityKey: sub.id, label: `Sub-activity ${index + 1}` })}
                              className="h-8 rounded-lg border-[#c7d2c7] bg-white px-2.5 text-xs"
                            >
                              <History className="h-3.5 w-3.5" />
                              History
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditSubactivity(selected, sub)}
                              className="h-8 rounded-lg border-[#c7d2c7] bg-white px-2.5 text-xs"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              Edit details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                openUpdateEditor(targetForSubactivity(sub))
                              }
                              className="h-8 rounded-lg bg-[#0c3b2d] px-2.5 text-xs text-white hover:bg-[#174d3a]"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              {isEditing ? "Editing update" : "Edit update"}
                            </Button>
                          </div>

                          {renderInlineUpdateEditor(targetForSubactivity(sub))}
                        </article>
                      );
                    })}

                    {selected.subactivities.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-[#cbd6cc] bg-[#f8faf7] p-8 text-center">
                        <ListChecks className="mx-auto h-7 w-7 text-[#6b7c72]" />
                        <p className="mt-3 font-bold">No sub-activities yet</p>
                        <p className="mt-1 text-sm text-[#718178]">
                          Add the first sub-activity for this main activity.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
