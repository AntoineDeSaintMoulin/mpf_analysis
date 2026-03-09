import pool from "./_db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const overrides = await sql`SELECT * FROM manual_overrides ORDER BY updated_at DESC`;
      return res.json(overrides.rows);
    }

    if (req.method === "POST") {
      const { original_asset_name, manual_asset_name, manual_isin, manual_region, manual_currency, manual_category, manual_instrument } = req.body;
      if (!original_asset_name) return res.status(400).json({ error: "original_asset_name is required" });
      
      await sql`
        INSERT INTO manual_overrides (original_asset_name, manual_asset_name, manual_isin, manual_region, manual_currency, manual_category, manual_instrument, updated_at)
        VALUES (${original_asset_name}, ${manual_asset_name}, ${manual_isin}, ${manual_region}, ${manual_currency}, ${manual_category}, ${manual_instrument}, NOW())
        ON CONFLICT(original_asset_name) DO UPDATE SET
          manual_asset_name = EXCLUDED.manual_asset_name,
          manual_isin = EXCLUDED.manual_isin,
          manual_region = EXCLUDED.manual_region,
          manual_currency = EXCLUDED.manual_currency,
          manual_category = EXCLUDED.manual_category,
          manual_instrument = EXCLUDED.manual_instrument,
          updated_at = NOW()
      `;

      await sql`
        UPDATE holdings SET
          asset_name = COALESCE(${manual_asset_name}, asset_name),
          isin = COALESCE(${manual_isin}, isin),
          region = COALESCE(${manual_region}, region),
          currency = COALESCE(${manual_currency}, currency),
          category = COALESCE(${manual_category}, category),
          instrument = COALESCE(${manual_instrument}, instrument)
        WHERE original_asset_name = ${original_asset_name}
      `;

      return res.json({ success: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
