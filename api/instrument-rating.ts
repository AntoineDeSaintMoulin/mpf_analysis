
import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // GET — retourne tous les ratings { isin: { rating, updated_at } }
  if (req.method === "GET") {
    try {
      const result = await pool.query(`
        SELECT isin, rating, updated_at
        FROM instrument_ratings
        ORDER BY isin
      `);
      const map: Record<string, { rating: string; updated_at: string }> = {};
      for (const row of result.rows) {
        map[row.isin] = { rating: row.rating, updated_at: row.updated_at };
      }
      return res.json(map);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  // POST — upsert le rating d'un ISIN
  if (req.method === "POST") {
    const { isin, rating } = req.body as { isin: string; rating: string };
    if (!isin || !rating) {
      return res.status(400).json({ error: "isin et rating requis" });
    }
    try {
      await pool.query(`
        INSERT INTO instrument_ratings (isin, rating)
        VALUES ($1, $2)
        ON CONFLICT (isin) DO UPDATE SET rating = $2, updated_at = NOW()
      `, [isin, rating]);
      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  // DELETE — supprime le rating d'un ISIN
  if (req.method === "DELETE") {
    const { isin } = req.body as { isin: string };
    if (!isin) return res.status(400).json({ error: "isin requis" });
    try {
      await pool.query("DELETE FROM instrument_ratings WHERE isin = $1", [isin]);
      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
