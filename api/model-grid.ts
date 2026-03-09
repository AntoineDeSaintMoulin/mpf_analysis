import { sql } from "@vercel/postgres";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const modelGrid = await sql`SELECT * FROM model_grid`;
    res.json(modelGrid.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
