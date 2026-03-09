import pool from "./_db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const modelGrid = await pool.query("SELECT * FROM model_grid");
    res.json(modelGrid.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
