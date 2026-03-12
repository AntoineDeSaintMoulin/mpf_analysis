import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const PROFILES = ["LOW", "MEDLOW", "MEDIUM", "MEDHIGH", "HIGH"] as const;
const PROFILE_COLS: Record<string, [number, number, number]> = {
  LOW:     [2, 4, 6],
  MEDLOW:  [9, 11, 13],
  MEDIUM:  [17, 19, 21],
  MEDHIGH: [24, 26, 28],
  HIGH:    [31, 33, 35],
};

const ROW_MAP: Record<number, string> = {
  8:  "equities",
  9:  "eq_europe",
  10: "eq_us",
  11: "eq_em",
  12: "eq_japan",
  13: "eq_other",
  14: "alternatives",
  15: "alt_conv",
  16: "alt_gold",
  17: "alt_other",
  18: "fixed_income",
  19: "fi_eur",
  20: "fi_eur_gov",
  21: "fi_eur_gov_infl",
  22: "fi_eur_ig",
  23: "fi_eur_hy",
  24: "fi_usd",
  25: "fi_usd_gov",
  26: "fi_usd_gov_infl",
  27: "fi_usd_ig",
  28: "fi_usd_hy",
  29: "fi_em_local",
  30: "fi_em_hard",
  31: "fi_global",
  32: "short_term",
  33: "st_eur",
  34: "st_usd",
  35: "st_other",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS target_grid (
        id SERIAL PRIMARY KEY,
        grid_id TEXT NOT NULL,
        profile TEXT NOT NULL,
        bench REAL,
        target REAL,
        active REAL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (req.method === "GET") {
      const result = await pool.query("SELECT grid_id, profile, bench, target, active FROM target_grid");
      const data: Record<string, any> = {};
      for (const row of result.rows) {
        if (!data[row.grid_id]) data[row.grid_id] = {};
        data[row.grid_id][row.profile] = {
          bench: row.bench,
          target: row.target,
          active: row.active,
        };
      }
      return res.json(data);
    }

    if (req.method === "POST") {
      const { rows } = req.body as { rows: { grid_id: string; profile: string; bench: number | null; target: number | null; active: number | null }[] };
      if (!rows?.length) return res.status(400).json({ error: "No data" });

      // Delete all existing and replace
      await pool.query("DELETE FROM target_grid");
      for (const r of rows) {
        await pool.query(
          "INSERT INTO target_grid (grid_id, profile, bench, target, active, updated_at) VALUES ($1, $2, $3, $4, $5, NOW())",
          [r.grid_id, r.profile, r.bench ?? null, r.target ?? null, r.active ?? null]
        );
      }
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
