import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const overrides = await pool.query("SELECT * FROM manual_overrides ORDER BY updated_at DESC");
      return res.json(overrides.rows);
    }

    if (req.method === "POST") {
      const { original_asset_name, manual_asset_name, manual_isin, manual_region, manual_currency, manual_category, manual_instrument } = req.body;
      if (!original_asset_name) return res.status(400).json({ error: "original_asset_name is required" });

      await pool.query(`
        INSERT INTO manual_overrides (original_asset_name, manual_asset_name, manual_isin, manual_region, manual_currency, manual_category, manual_instrument, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT(original_asset_name) DO UPDATE SET
          manual_asset_name = EXCLUDED.manual_asset_name,
          manual_isin = EXCLUDED.manual_isin,
          manual_region = EXCLUDED.manual_region,
          manual_currency = EXCLUDED.manual_currency,
          manual_category = EXCLUDED.manual_category,
          manual_instrument = EXCLUDED.manual_instrument,
          updated_at = NOW()
      `, [original_asset_name, manual_asset_name, manual_isin, manual_region, manual_currency, manual_category, manual_instrument]);

      await pool.query(`
        UPDATE holdings SET
          asset_name = COALESCE($1, asset_name),
          isin = COALESCE($2, isin),
          region = COALESCE($3, region),
          currency = COALESCE($4, currency),
          category = COALESCE($5, category),
          instrument = COALESCE($6, instrument)
        WHERE original_asset_name = $7
      `, [manual_asset_name, manual_isin, manual_region, manual_currency, manual_category, manual_instrument, original_asset_name]);

      return res.json({ success: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
