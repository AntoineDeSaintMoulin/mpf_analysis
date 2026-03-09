import pool from "./_db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT
      )
    `);

    await pool.query(`
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
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS model_grid (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        region TEXT NOT NULL,
        target_weight REAL NOT NULL
      )
    `);

    await pool.query(`
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
    `);

    const existing = await pool.query("SELECT COUNT(*) FROM model_grid");
    if (Number(existing.rows[0].count) === 0) {
      await pool.query("INSERT INTO model_grid (category, region, target_weight) VALUES ($1, $2, $3)", ["Equity", "US", 40]);
      await pool.query("INSERT INTO model_grid (category, region, target_weight) VALUES ($1, $2, $3)", ["Equity", "Europe", 15]);
      await pool.query("INSERT INTO model_grid (category, region, target_weight) VALUES ($1, $2, $3)", ["Equity", "Emerging Markets", 10]);
      await pool.query("INSERT INTO model_grid (category, region, target_weight) VALUES ($1, $2, $3)", ["Fixed Income", "US", 30]);
      await pool.query("INSERT INTO model_grid (category, region, target_weight) VALUES ($1, $2, $3)", ["Cash", "Global", 5]);
    }

    res.json({ success: true, message: "Base de données initialisée avec succès" });
  } catch (error) {
    console.error("Init DB error:", error);
    res.status(500).json({ error: String(error) });
  }
}
