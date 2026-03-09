/** Common religions for member form selection */
export const RELIGIONS = [
  "Roman Catholic",
  "Islam",
  "Iglesia ni Cristo",
  "Philippine Independent Church (Aglipayan)",
  "Baptist",
  "Seventh-day Adventist",
  "United Church of Christ in the Philippines",
  "Evangelical",
  "Born Again Christian",
  "Methodist",
  "Assembly of God",
  "Other Protestant",
  "Jehovah's Witness",
  "Church of Christ",
  "None",
  "Other",
] as const

export type ReligionOption = (typeof RELIGIONS)[number]
