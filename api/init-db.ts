import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS holdings (
        id SERIAL PRIMARY KEY,
        portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
        asset_name TEXT,
        original_asset_name TEXT,
        isin TEXT,
        category TEXT,
        region TEXT,
        instrument TEXT,
        weight REAL,
        currency TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS model_grid (
        id SERIAL PRIMARY KEY,
        category TEXT,
        region TEXT,
        target REAL,
        updated_at TIMESTAMP DEFAULT NOW()
      );

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
      );

      CREATE TABLE IF NOT EXISTS import_log (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        imported_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS target_grid (
        id SERIAL PRIMARY KEY,
        grid_id TEXT NOT NULL,
        profile TEXT NOT NULL,
        bench REAL,
        target REAL,
        active REAL,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(grid_id, profile)
      );

      CREATE TABLE IF NOT EXISTS instrument_breakdown (
        id SERIAL PRIMARY KEY,
        isin TEXT NOT NULL,
        region TEXT NOT NULL,
        weight REAL NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS currency_breakdown (
        id SERIAL PRIMARY KEY,
        isin TEXT NOT NULL,
        currency TEXT NOT NULL,
        weight REAL NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    return res.json({ success: true, message: "Tables créées ou déjà existantes." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
}
