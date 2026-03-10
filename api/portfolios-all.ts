import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.type, p.description,
        h.id as holding_id, h.asset_name, h.original_asset_name,
        h.isin, h.category, h.region, h.instrument, h.weight, h.currency
      FROM portfolios p
      LEFT JOIN holdings h ON h.portfolio_id = p.id
      ORDER BY p.id, h.id
    `);

    const portfolioMap = new Map<number, any>();
    result.rows.forEach((row: any) => {
      if (!portfolioMap.has(row.id)) {
        portfolioMap.set(row.id, {
          id: row.id, name: row.name, type: row.type,
          description: row.description, holdings: []
        });
      }
      if (row.holding_id) {
        portfolioMap.get(row.id).holdings.push({
          id: row.holding_id, asset_name: row.asset_name,
          original_asset_name: row.original_asset_name,
          isin: row.isin, category: row.category, region: row.region,
          instrument: row.instrument, weight: row.weight, currency: row.currency
        });
      }
    });

    res.json(Array.from(portfolioMap.values()));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
