import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const client = await pool.connect();
    try {
      const portfolio = await client.query("SELECT * FROM portfolios WHERE id = $1", [id]);
      if (!portfolio.rows[0]) {
        client.release();
        return res.status(404).json({ error: "Not found" });
      }
      const holdings = await client.query("SELECT * FROM holdings WHERE portfolio_id = $1", [id]);
      client.release();
      res.json({ ...portfolio.rows[0], holdings: holdings.rows });
    } catch (e) {
      client.release();
      throw e;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
