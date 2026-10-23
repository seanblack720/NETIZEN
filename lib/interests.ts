// lib/interests.ts
// Single source of truth for the interests wall. Imported by the register page AND the register API,
// so the ids the server accepts can never drift from the ids the page sends.

export const MIN_INTERESTS = 10;

/** [id, label]. Ids are what get saved on the user, so keep them stable. */
export type Topic = readonly [id: string, label: string];

export const INTEREST_SECTIONS: { id: string; title: string; blurb: string; topics: Topic[] }[] = [
  {
    id: "local",
    title: "Around you",
    blurb: "What is happening in your neighbourhood",
    topics: [
      ["local-news", "Local news"],
      ["community-action", "Community action"],
      ["safety", "Neighbourhood safety"],
      ["local-events", "Local events"],
      ["taxis", "Taxis & transport"],
      ["load-shedding", "Load shedding"],
      ["services", "Water & services"],
      ["petitions", "Petitions"],
      ["volunteering", "Volunteering"],
      ["local-business", "Local shops & markets"],
    ],
  },
  {
    id: "news",
    title: "News & society",
    blurb: "Stay across what matters",
    topics: [
      ["politics", "Politics"],
      ["business", "Business & economy"],
      ["crime", "Crime & justice"],
      ["education", "Education"],
      ["health", "Health & wellness"],
      ["environment", "Environment"],
      ["tech", "Technology"],
      ["science", "Science"],
    ],
  },
  {
    id: "money",
    title: "Money & work",
    blurb: "Get ahead, earn more, spend smart",
    topics: [
      ["jobs", "Jobs & careers"],
      ["entrepreneurship", "Entrepreneurship"],
      ["side-hustles", "Side hustles"],
      ["finance", "Personal finance"],
      ["property", "Property & housing"],
      ["cars", "Cars & bikes"],
    ],
  },
  {
    id: "sport",
    title: "Sport",
    blurb: "Scores, banter and match day",
    topics: [
      ["soccer", "Soccer"],
      ["rugby", "Rugby"],
      ["cricket", "Cricket"],
      ["basketball", "Basketball"],
      ["running", "Running & athletics"],
      ["fitness", "Fitness & gym"],
      ["motorsport", "Motorsport"],
      ["combat", "Boxing & MMA"],
    ],
  },
  {
    id: "entertainment",
    title: "Music & entertainment",
    blurb: "Whatever you are watching, playing or streaming",
    topics: [
      ["music", "Music"],
      ["amapiano", "Amapiano"],
      ["hiphop", "Hip-hop"],
      ["gospel", "Gospel"],
      ["movies", "Movies & TV"],
      ["comedy", "Comedy"],
      ["gaming", "Gaming"],
      ["anime", "Anime & comics"],
      ["memes", "Memes"],
      ["celebrity", "Celebrity news"],
      ["podcasts", "Podcasts"],
    ],
  },
  {
    id: "lifestyle",
    title: "Lifestyle & culture",
    blurb: "The everyday things you love",
    topics: [
      ["food", "Food & cooking"],
      ["travel", "Travel"],
      ["faith", "Faith & spirituality"],
      ["parenting", "Parenting"],
      ["relationships", "Relationships"],
      ["fashion", "Fashion"],
      ["beauty", "Beauty"],
      ["art", "Art & design"],
      ["photography", "Photography"],
      ["pets", "Pets"],
      ["gardening", "Gardening"],
      ["diy", "Home & DIY"],
    ],
  },
];

/** Every valid topic id, for server-side validation. */
export const INTEREST_IDS: ReadonlySet<string> = new Set(
  INTEREST_SECTIONS.flatMap((section) => section.topics.map(([id]) => id)),
);

export const MAX_INTERESTS = INTEREST_IDS.size;
