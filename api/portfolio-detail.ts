import { sql } from "@vercel/postgres";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    const portfolio = await sql`SELECT * FROM portfolios WHERE id = ${id as string}`;
    if (!portfolio.rows[0]) return res.status(404).json({ error: "Not found" });
    const holdings = await sql`SELECT * FROM holdings WHERE portfolio_id = ${id as string}`;
    res.json({ ...portfolio.rows[0], holdings: holdings.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
