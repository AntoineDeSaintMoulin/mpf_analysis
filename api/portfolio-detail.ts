import pool from "./_db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    const portfolio = await pool.query("SELECT * FROM portfolios WHERE id = $1", [id]);
    if (!portfolio.rows[0]) return res.status(404).json({ error: "Not found" });
    const holdings = await pool.query("SELECT * FROM holdings WHERE portfolio_id = $1", [id]);
    res.json({ ...portfolio.rows[0], holdings: holdings.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
