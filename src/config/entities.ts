/**
 * Well-known people, clubs, companies, organisations and places that get their
 * own page at /entity/[slug]. A story belongs to an entity when any article's
 * headline or summary contains one of its terms as a phrase (Postgres full-text
 * search, so "Arsenal's" matches "Arsenal"). Names that aren't listed here are
 * still found automatically when several outlets use them (src/lib/names.ts).
 *
 * Terms should be specific: a bare word that is also a common noun ("Shell",
 * "Labour") would pull in unrelated stories.
 */
export type EntityKind = "person" | "club" | "company" | "organisation" | "place";

export interface Entity {
  slug: string;
  name: string;
  kind: EntityKind;
  /** Phrases that mean this entity; the name is always included. */
  terms: string[];
}

export const KIND_LABELS: Record<EntityKind, string> = {
  person: "People",
  club: "Clubs and teams",
  company: "Companies",
  organisation: "Organisations",
  place: "Places",
};

type Seed = [name: string, kind: EntityKind, terms?: string[]];

const SEEDS: Seed[] = [
  // People
  ["Keir Starmer", "person", ["Starmer"]],
  ["Rachel Reeves", "person"],
  ["Kemi Badenoch", "person", ["Badenoch"]],
  ["Nigel Farage", "person", ["Farage"]],
  ["King Charles", "person"],
  ["Donald Trump", "person", ["Trump"]],
  ["JD Vance", "person"],
  ["Vladimir Putin", "person", ["Putin"]],
  ["Volodymyr Zelensky", "person", ["Zelensky", "Zelenskyy"]],
  ["Xi Jinping", "person"],
  ["Benjamin Netanyahu", "person", ["Netanyahu"]],
  ["Emmanuel Macron", "person", ["Macron"]],
  ["Elon Musk", "person"],
  ["Emmerson Mnangagwa", "person", ["Mnangagwa"]],
  ["Nelson Chamisa", "person", ["Chamisa"]],
  ["Cyril Ramaphosa", "person", ["Ramaphosa"]],
  ["Jacob Zuma", "person"],
  ["Bola Tinubu", "person", ["Tinubu"]],
  ["William Ruto", "person", ["Ruto"]],
  ["Yoweri Museveni", "person", ["Museveni"]],
  ["John Mahama", "person", ["Mahama"]],
  ["Samia Suluhu Hassan", "person", ["Samia Suluhu"]],
  ["Paul Kagame", "person", ["Kagame"]],
  ["Mohamed Salah", "person"],
  ["Erling Haaland", "person", ["Haaland"]],
  ["Harry Kane", "person"],
  // Clubs and national teams
  ["Arsenal", "club"],
  ["Aston Villa", "club"],
  ["Bournemouth", "club"],
  ["Brentford", "club"],
  ["Brighton", "club", ["Brighton & Hove Albion"]],
  ["Burnley", "club"],
  ["Chelsea", "club"],
  ["Crystal Palace", "club"],
  ["Everton", "club"],
  ["Fulham", "club"],
  ["Leeds United", "club"],
  ["Liverpool", "club"],
  ["Manchester City", "club", ["Man City"]],
  ["Manchester United", "club", ["Man Utd", "Man United"]],
  ["Newcastle United", "club"],
  ["Nottingham Forest", "club"],
  ["Sunderland", "club"],
  ["Tottenham Hotspur", "club", ["Tottenham", "Spurs"]],
  ["West Ham", "club"],
  ["Wolves", "club", ["Wolverhampton Wanderers"]],
  ["Celtic", "club"],
  ["Real Madrid", "club"],
  ["Bayern Munich", "club"],
  ["Kaizer Chiefs", "club"],
  ["Orlando Pirates", "club"],
  ["Mamelodi Sundowns", "club"],
  ["Dynamos FC", "club", ["Harare Dynamos"]],
  ["CAPS United", "club"],
  ["Bafana Bafana", "club"],
  ["Super Eagles", "club"],
  ["Black Stars", "club"],
  ["Harambee Stars", "club"],
  // Companies
  ["Apple", "company"],
  ["Google", "company", ["Alphabet"]],
  ["Microsoft", "company"],
  ["Amazon", "company"],
  ["Meta", "company", ["Facebook", "Instagram", "WhatsApp"]],
  ["Tesla", "company"],
  ["Nvidia", "company"],
  ["OpenAI", "company", ["ChatGPT"]],
  ["Anthropic", "company"],
  ["TikTok", "company"],
  ["Boeing", "company"],
  ["Airbus", "company"],
  ["BP", "company"],
  ["HSBC", "company"],
  ["Barclays", "company"],
  ["Tesco", "company"],
  ["Thames Water", "company"],
  ["Royal Mail", "company"],
  ["Econet", "company"],
  ["Safaricom", "company"],
  ["MTN", "company"],
  ["Dangote", "company"],
  ["Eskom", "company"],
  // Organisations
  ["NHS", "organisation"],
  ["Bank of England", "organisation"],
  ["Federal Reserve", "organisation"],
  ["United Nations", "organisation", ["UN"]],
  ["Nato", "organisation"],
  ["European Union", "organisation", ["EU"]],
  ["IMF", "organisation", ["International Monetary Fund"]],
  ["World Bank", "organisation"],
  ["African Union", "organisation"],
  ["SADC", "organisation"],
  ["Zanu-PF", "organisation", ["Zanu PF"]],
  ["ANC", "organisation"],
  ["Reform UK", "organisation"],
  ["Conservative Party", "organisation", ["Tories", "Conservatives"]],
  ["Hamas", "organisation"],
  ["Hezbollah", "organisation"],
  ["Fifa", "organisation"],
  ["Uefa", "organisation"],
  ["Premier League", "organisation"],
  // Places
  ["London", "place"],
  ["Harare", "place"],
  ["Bulawayo", "place"],
  ["Johannesburg", "place", ["Joburg"]],
  ["Cape Town", "place"],
  ["Lagos", "place"],
  ["Abuja", "place"],
  ["Nairobi", "place"],
  ["Accra", "place"],
  ["Kampala", "place"],
  ["Gaza", "place"],
  ["Kyiv", "place"],
];

function slugOf(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const ENTITIES: Entity[] = SEEDS.map(([name, kind, terms = []]) => ({
  slug: slugOf(name),
  name,
  kind,
  terms: [name, ...terms],
}));

const bySlug = new Map(ENTITIES.map((e) => [e.slug, e]));

export function findEntity(slug: string): Entity | undefined {
  return bySlug.get(slug);
}

export { slugOf as entitySlug };
