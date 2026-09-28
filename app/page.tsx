"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  Cloud,
  CloudOff,
  Search,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import workplan from "@/lib/workplan-data.json";

type Activity = (typeof workplan.activities)[number];
type Subactivity = Activity["subactivities"][number];
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

export default function Home() {
  const [query, setQuery] = useState("");
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
    } catch {
      // WebMCP support is optional; the visible interface remains fully usable.
    }
    return () => lifecycle.abort();
  }, [persistUpdate]);

  const workstreams = useMemo(
    () =>
      Array.from(
        new Set(allActivities.map((item) => item.workstream).filter(Boolean)),
      ).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return allActivities.filter((item) => {
      const currentStatus = deriveActivityStatus(item, updates);
      const matchesStatus = status === "all" || currentStatus === status;
      const matchesWorkstream =
        workstream === "all" || item.workstream === workstream;
      const haystack = [
        item.code,
        item.title,
        item.titleMn,
        item.workstream,
        item.technicalLead,
        item.lead,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return matchesStatus && matchesWorkstream && haystack.includes(normalized);
    });
  }, [query, status, workstream, updates]);

  const stats = useMemo(() => {
    const allSubs = allActivities.flatMap((item) => item.subactivities);
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
      allActivities.reduce(
        (total, item) => total + deriveActivityProgress(item, updates),
        0,
      ) / allActivities.length,
    );
    return { completed, attention, support, overall };
  }, [updates]);

  const strategicAreas = useMemo(() => {
    const grouped = new Map<
      string,
      { id: string; code: string; title: string; activities: Activity[] }
    >();
    for (const item of allActivities) {
      const area = item.strategicArea;
      const key = area?.id ?? `other-${item.sourceRow}`;
      const existing = grouped.get(key) ?? {
        id: key,
        code: area?.code ?? "Other",
        title: area?.title ?? "Other workplan activities",
        activities: [],
      };
      existing.activities.push(item);
      grouped.set(key, existing);
    }
    return Array.from(grouped.values()).map((area) => ({
      ...area,
      progress: Math.round(
        area.activities.reduce(
          (total, item) => total + deriveActivityProgress(item, updates),
          0,
        ) / area.activities.length,
      ),
    }));
  }, [updates]);

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
              value: workplan.meta.activityCount,
              detail: `${workplan.meta.strategicAreaCount} strategic areas`,
              icon: Clock3,
              accent: "bg-white",
            },
            {
              label: "Sub-activities completed",
              value: stats.completed,
              detail: `of ${workplan.meta.subactivityCount} reported`,
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

        <section className="mb-6 overflow-hidden rounded-2xl border border-[#d7ded5] bg-white">
          <div className="flex items-center justify-between border-b border-[#e2e7e0] px-5 py-4">
            <div>
              <h2 className="text-lg font-bold">Strategic areas</h2>
              <p className="text-sm text-[#718178]">Portfolio progress at a glance</p>
            </div>
            <span className="rounded-full bg-[#edf3e9] px-3 py-1 text-xs font-bold text-[#476255]">
              {strategicAreas.length} lines
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto p-3">
            {strategicAreas.map((area) => (
              <div
                key={area.id}
                className="min-w-[220px] flex-1 rounded-xl border border-[#e1e7de] bg-[#f8faf6] p-4"
              >
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-black text-[#315845]">{area.code}</span>
                  <span className="font-bold">{area.progress}%</span>
                </div>
                <Progress
                  value={area.progress}
                  className="h-1.5 bg-[#dfe8db] [&_[data-slot=progress-indicator]]:bg-[#277255]"
                />
                <p className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#334b3f]">
                  {area.title}
                </p>
                <p className="mt-2 text-xs text-[#718178]">
                  {area.activities.length} activities
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]">
          <div className="border-b border-[#e2e7e0] p-4 lg:flex lg:items-center lg:justify-between lg:p-5">
            <div className="mb-4 lg:mb-0">
              <h2 className="text-xl font-bold">Workplan activities</h2>
              <p className="text-sm text-[#718178]">
                {filtered.length} of {workplan.meta.activityCount} activities
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
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
            </div>
          </div>

          <div className="hidden grid-cols-[110px_minmax(340px,1.5fr)_minmax(190px,.7fr)_120px_120px_42px] gap-4 border-b border-[#e2e7e0] bg-[#f7f9f5] px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#718178] lg:grid">
            <span>Code</span>
            <span>Activity</span>
            <span>Workstream</span>
            <span>Status</span>
            <span>Progress</span>
            <span />
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
                    {item.workstream ||
                      item.strategicArea?.title ||
                      "Programme management"}
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
                  <ChevronRight className="hidden h-5 w-5 text-[#91a098] lg:block" />
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
                  setStatus("all");
                  setWorkstream("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </section>
      </div>

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
                  {selected.workstream ||
                    selected.strategicArea?.title ||
                    "Programme management"}
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
                        {selected.subactivities.length} reported items
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
                            <StatusPill status={currentStatus} />
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
    </main>
  );
}
