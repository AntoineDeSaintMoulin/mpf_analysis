import { sql } from "@vercel/postgres";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Créer les tables
    await sql`
      CREATE TABLE IF NOT EXISTS portfolios (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS holdings (
        id SERIAL PRIMARY KEY,
        portfolio_id INTEGER REFERENCES portfolios(id),
        asset_name TEXT NOT NULL,
        original_asset_name TEXT NOT NULL,
        category TEXT NOT NULL,
        region TEXT NOT NULL,
        instrument TEXT NOT NULL,
        weight REAL NOT NULL,
        currency TEXT NOT NULL,
        isin TEXT NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS model_grid (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        region TEXT NOT NULL,
        target_weight REAL NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS manual_overrides (
        id SERIAL PRIMARY KEY,
        original_asset_name TEXT UNIQUE NOT NULL,
        manual_asset_name TEXT,
        manual_isin TEXT,
        manual_region TEXT,
        manual_currency TEXT,
        manual_category TEXT,
        manual_instrument TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Seed model_grid si vide
    const existing = await sql`SELECT COUNT(*) FROM model_grid`;
    if (Number(existing.rows[0].count) === 0) {
      await sql`INSERT INTO model_grid (category, region, target_weight) VALUES ('Equity', 'US', 40)`;
      await sql`INSERT INTO model_grid (category, region, target_weight) VALUES ('Equity', 'Europe', 15)`;
      await sql`INSERT INTO model_grid (category, region, target_weight) VALUES ('Equity', 'Emerging Markets', 10)`;
      await sql`INSERT INTO model_grid (category, region, target_weight) VALUES ('Fixed Income', 'US', 30)`;
      await sql`INSERT INTO model_grid (category, region, target_weight) VALUES ('Cash', 'Global', 5)`;
    }

    res.json({ success: true, message: "Base de données initialisée avec succès" });
  } catch (error) {
    console.error("Init DB error:", error);
    res.status(500).json({ error: String(error) });
  }
}
