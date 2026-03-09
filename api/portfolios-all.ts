import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const portfolios = await pool.query("SELECT * FROM portfolios");
    const result = await Promise.all(portfolios.rows.map(async (p: any) => {
      const holdings = await pool.query("SELECT * FROM holdings WHERE portfolio_id = $1", [p.id]);
      return { ...p, holdings: holdings.rows };
    }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
