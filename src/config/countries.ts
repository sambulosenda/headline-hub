export interface Country {
  /** ISO 3166-1 alpha-2, lower case; used in URLs. */
  code: string;
  name: string;
  /**
   * Lower-case words that tie a headline to the country: its name, demonym,
   * capital and big cities, and names that are unambiguous in the news.
   * Matched as whole words, so keep each one specific to this country.
   */
  terms: string[];
}

/** Countries with their own page. Start with the African countries we have outlets for. */
export const COUNTRIES: Country[] = [
  {
    code: "zw",
    name: "Zimbabwe",
    terms: ["zimbabwe", "zimbabwean", "zimbabweans", "harare", "bulawayo", "mnangagwa", "zanu-pf", "zanu pf", "mutare", "gweru"],
  },
  {
    code: "za",
    name: "South Africa",
    terms: ["south africa", "south african", "south africans", "johannesburg", "cape town", "pretoria", "durban", "soweto", "ramaphosa", "anc", "eskom", "springboks"],
  },
  {
    code: "ng",
    name: "Nigeria",
    terms: ["nigeria", "nigerian", "nigerians", "lagos", "abuja", "kano", "ibadan", "port harcourt", "tinubu", "naira", "super eagles"],
  },
  {
    code: "ke",
    name: "Kenya",
    terms: ["kenya", "kenyan", "kenyans", "nairobi", "mombasa", "kisumu", "ruto", "harambee stars"],
  },
  {
    code: "gh",
    name: "Ghana",
    terms: ["ghana", "ghanaian", "ghanaians", "accra", "kumasi", "black stars", "cedi"],
  },
  {
    code: "ug",
    name: "Uganda",
    terms: ["uganda", "ugandan", "ugandans", "kampala", "museveni", "entebbe"],
  },
  {
    code: "tz",
    name: "Tanzania",
    terms: ["tanzania", "tanzanian", "tanzanians", "dar es salaam", "dodoma", "zanzibar", "samia suluhu"],
  },
  {
    code: "et",
    name: "Ethiopia",
    terms: ["ethiopia", "ethiopian", "ethiopians", "addis ababa", "abiy ahmed", "tigray", "amhara", "oromia"],
  },
  {
    code: "eg",
    name: "Egypt",
    terms: ["egypt", "egyptian", "egyptians", "cairo", "el-sisi", "suez canal", "giza"],
  },
  {
    code: "rw",
    name: "Rwanda",
    terms: ["rwanda", "rwandan", "rwandans", "kigali", "kagame"],
  },
  {
    code: "ma",
    name: "Morocco",
    terms: ["morocco", "moroccan", "moroccans", "rabat", "casablanca", "marrakech", "marrakesh", "tangier", "atlas lions"],
  },
  {
    code: "zm",
    name: "Zambia",
    terms: ["zambia", "zambian", "zambians", "lusaka", "hichilema", "copperbelt", "chipolopolo"],
  },
  {
    code: "bw",
    name: "Botswana",
    terms: ["botswana", "gaborone", "motswana", "batswana", "duma boko"],
  },
  {
    code: "mw",
    name: "Malawi",
    terms: ["malawi", "malawian", "malawians", "lilongwe", "blantyre", "mutharika", "chakwera"],
  },
  {
    code: "mz",
    name: "Mozambique",
    terms: ["mozambique", "mozambican", "mozambicans", "maputo", "cabo delgado", "frelimo"],
  },
  {
    code: "na",
    name: "Namibia",
    terms: ["namibia", "namibian", "namibians", "windhoek", "swapo", "nandi-ndaitwah"],
  },
];

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
