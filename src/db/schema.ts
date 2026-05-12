import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    stage: text("stage").notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    finalized: boolean("finalized").notNull().default(false),
    bettingOpen: boolean("betting_open").notNull().default(false),
  },
  (t) => ({
    kickoffIdx: index("matches_kickoff_idx").on(t.kickoffAt),
  }),
);

export const bets = pgTable(
  "bets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    predHome: integer("pred_home").notNull(),
    predAway: integer("pred_away").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("bets_user_match_unq").on(t.userId, t.matchId),
  }),
);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  viewerPassphraseHash: text("viewer_passphrase_hash").notNull(),
  adminPasswordHash: text("admin_password_hash").notNull(),
});

export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Bet = typeof bets.$inferSelect;
export type Settings = typeof settings.$inferSelect;
