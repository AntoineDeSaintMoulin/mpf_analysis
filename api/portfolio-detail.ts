import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.type, p.description,
        h.id as holding_id, h.asset_name, h.original_asset_name,
        h.isin, h.category, h.region, h.instrument, h.weight, h.currency
      FROM portfolios p
      LEFT JOIN holdings h ON h.portfolio_id = p.id
      WHERE p.id = $1
      ORDER BY h.id
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const p = result.rows[0];
    const portfolio = {
      id: p.id, name: p.name, type: p.type,
      description: p.description,
      holdings: result.rows
        .filter((row: any) => row.holding_id)
        .map((row: any) => ({
          id: row.holding_id, asset_name: row.asset_name,
          original_asset_name: row.original_asset_name,
          isin: row.isin, category: row.category, region: row.region,
          instrument: row.instrument, weight: row.weight, currency: row.currency
        }))
    };

    res.json(portfolio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
