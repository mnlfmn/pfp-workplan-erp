export type TeamMember = {
  id: string;
  name: string;
  role: string;
  group: "PCU" | "MNLF" | "Workplan";
  aliases: string[];
};

export const defaultTeamMembers: TeamMember[] = [
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
