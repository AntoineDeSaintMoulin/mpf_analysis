import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  
  // GET — retourne tous les breakdowns groupés par ISIN
  if (req.method === "GET") {
    try {
      const result = await pool.query(`
        SELECT isin, region, weight, updated_at
        FROM instrument_breakdown
        ORDER BY isin, weight DESC
      `);
      // Grouper par ISIN : { "BE629...": [{ region, weight }, ...] }
      const grouped: Record<string, { region: string; weight: number; updated_at: string }[]> = {};
      for (const row of result.rows) {
        if (!grouped[row.isin]) grouped[row.isin] = [];
        grouped[row.isin].push({ region: row.region, weight: row.weight, updated_at: row.updated_at });
      }
      return res.json(grouped);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  // POST — sauvegarde le breakdown complet d'un ISIN (DELETE + INSERT)
  if (req.method === "POST") {
    const { isin, breakdown } = req.body as {
      isin: string;
      breakdown: { region: string; weight: number }[];
    };
    if (!isin || !Array.isArray(breakdown)) {
      return res.status(400).json({ error: "isin et breakdown requis" });
    }
    try {
      await pool.query("DELETE FROM instrument_breakdown WHERE isin = $1", [isin]);
      for (const row of breakdown) {
        await pool.query(
          "INSERT INTO instrument_breakdown (isin, region, weight) VALUES ($1, $2, $3)",
          [isin, row.region, row.weight]
        );
      }
      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  // DELETE — supprime tout le breakdown d'un ISIN
  if (req.method === "DELETE") {
    const { isin } = req.body as { isin: string };
    if (!isin) return res.status(400).json({ error: "isin requis" });
    try {
      await pool.query("DELETE FROM instrument_breakdown WHERE isin = $1", [isin]);
      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
