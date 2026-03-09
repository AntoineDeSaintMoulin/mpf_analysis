import { sql } from "@vercel/postgres";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const portfolios = await sql`SELECT * FROM portfolios`;
    const result = await Promise.all(portfolios.rows.map(async (p) => {
      const holdings = await sql`SELECT * FROM holdings WHERE portfolio_id = ${p.id}`;
      return { ...p, holdings: holdings.rows };
    }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
