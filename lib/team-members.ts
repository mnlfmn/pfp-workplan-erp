export type TeamMember = {
  id: string;
  name: string;
  role: string;
  group: string;
  aliases: string[];
  email: string;
  accessRole: "admin" | "member";
  inviteStatus: "not_invited" | "invited" | "active";
  inviteSentAt: string;
  lastSignedInAt: string;
  kpiReviewerId: string;
  kpiApproverId: string;
};

const defaultTeamMemberSeed: Array<
  Omit<TeamMember, "kpiReviewerId" | "kpiApproverId">
> = [
  {
    id: "tuvshinjargal-p",
    name: "Tuvshinjargal.P",
    role: "Coordinator",
    group: "PCU",
    aliases: ["Tuvshinjargal", "Түвшинжаргал"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "ochirkhuyag-j",
    name: "Ochirkhuyag.J",
    role: "PA Management senior officer",
    group: "PCU",
    aliases: ["Ochirkhuyag", "Ж.Очирхуяг", "Очирхуяг"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "namuunaa-m",
    name: "Namuunaa.M",
    role: "PA expansion officer",
    group: "PCU",
    aliases: ["Namuunaa", "М.Намуунаа", "Намуунаа"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "khulan-s",
    name: "Khulan.S",
    role: "Project and partnership officer",
    group: "PCU",
    aliases: ["Khulan", "С.Хулан", "Ш.Хулан", "Хулан"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "enkhsaikhan-u",
    name: "Enkhsaikhan.U",
    role: "Sustainable finance officer",
    group: "PCU",
    aliases: ["Enkhsaikhan", "Энхсайхан"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "amartuvshin-s",
    name: "Amartuvshin.S",
    role: "PCU workplan member",
    group: "PCU",
    aliases: ["Amartuvshin", "С.Амартүвшин", "Амартүвшин"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "bolormaa",
    name: "Bolormaa",
    role: "PCU workplan member",
    group: "PCU",
    aliases: ["Bolormaa", "Болормаа"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "tsenguun",
    name: "Tsenguun",
    role: "PCU workplan member",
    group: "PCU",
    aliases: ["Tsenguun", "Цэнгүүн"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "namjilmaa-ch",
    name: "Namjilmaa.Ch",
    role: "Additional workplan member",
    group: "Workplan",
    aliases: ["Namjilmaa", "Ч.Намжилмаа", "Намжилмаа"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "munkhjin-ts",
    name: "Munkhjin.Ts",
    role: "Additional workplan member",
    group: "Workplan",
    aliases: ["Munkhjin", "Ц.Мөнхжин", "Мөнхжин"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "tugsbuyan-m",
    name: "Tugsbuyan.M",
    role: "Additional workplan member",
    group: "Workplan",
    aliases: ["Tugsbuyan", "М.Төгсбуян", "Төгсбуян"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
  {
    id: "battogtokh-n",
    name: "Battogtokh.N",
    role: "Additional workplan member",
    group: "Workplan",
    aliases: ["Battogtokh", "Н.Баттогтох", "Баттогтох"],
    email: "",
    accessRole: "member",
    inviteStatus: "not_invited",
    inviteSentAt: "",
    lastSignedInAt: "",
  },
];

export const defaultTeamMembers: TeamMember[] = defaultTeamMemberSeed.map(
  (member) => ({
    ...member,
    kpiReviewerId: "",
    kpiApproverId: "",
  }),
);
