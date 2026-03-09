import pool from "./_db";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
    const { id } = req.query;
    await pool.query("DELETE FROM manual_overrides WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
