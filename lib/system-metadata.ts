export const metadataCategories = [
  "procurement_type",
  "service_provider_type",
  "member_type",
  "status",
  "goal",
  "workstream",
  "section",
] as const;

export type MetadataCategory = (typeof metadataCategories)[number];

export type MetadataOption = {
  id: string;
  category: MetadataCategory;
  value: string;
  label: string;
  sortOrder: number;
};

const statusOptions = [
  ["completed", "Completed"],
  ["in_progress", "In progress"],
  ["delayed", "Delayed"],
  ["delayed_externally", "Delayed externally"],
  ["on_hold", "On hold"],
  ["not_started", "Not started"],
  ["not_reported", "Not reported"],
] as const;

function options(
  category: MetadataCategory,
  values: ReadonlyArray<readonly [string, string]>,
): MetadataOption[] {
  return values.map(([value, label], index) => ({
    id: `${category}:${value}`,
    category,
    value,
    label,
    sortOrder: index,
  }));
}

export const defaultMetadata: Record<MetadataCategory, MetadataOption[]> = {
  procurement_type: options("procurement_type", [
    ["Goods and service", "Goods and service"],
    ["Intellectual service", "Intellectual service"],
    ["Not applicable", "Not applicable"],
  ]),
  service_provider_type: options("service_provider_type", [
    ["Individual consultant", "Individual consultant"],
    ["Consulting firm", "Consulting firm"],
    ["Supplier", "Supplier"],
    ["Contractor", "Contractor"],
    ["NGO / CSO", "NGO / CSO"],
    ["Government entity", "Government entity"],
    ["Other", "Other"],
  ]),
  member_type: options("member_type", [
    ["PCU", "PCU member"],
    ["MNLF", "MNLF member"],
    ["Workplan", "Additional workplan member"],
  ]),
  status: options("status", statusOptions),
  goal: options("goal", [
    ["All goals", "Cross-goal"],
    ["Goal 1", "Goal 1"],
    ["Goal 2", "Goal 2"],
    ["Goal 3", "Goal 3"],
    ["Goal 4", "Goal 4"],
  ]),
  workstream: options("workstream", [
    ["CBNRM", "CBNRM"],
    ["Grant Making", "Grant Making"],
    ["MECC, MES", "MECC, MES"],
    ["PA Management Effectiveness", "PA Management Effectiveness"],
    ["PA Network Expansion", "PA Network Expansion"],
    ["PA Policy and Advocacy", "PA Policy and Advocacy"],
    ["Sustainable Finance Mechanisms", "Sustainable Finance Mechanisms"],
    ["Sustainable Tourism Development", "Sustainable Tourism Development"],
  ]),
  section: options("section", [
    ["A", "Section A"],
    ["B", "Section B"],
  ]),
};

export const metadataCategoryLabels: Record<MetadataCategory, string> = {
  procurement_type: "Type of procurement",
  service_provider_type: "Type of service provider",
  member_type: "Member types",
  status: "Status",
  goal: "Goals",
  workstream: "Workstreams",
  section: "Sections",
};
