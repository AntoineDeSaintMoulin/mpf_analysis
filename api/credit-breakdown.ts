import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // GET — retourne tous les credit breakdowns groupés par ISIN
  if (req.method === "GET") {
    try {
      const result = await pool.query(`
        SELECT isin, credit_type, currency, weight, updated_at
        FROM credit_breakdown
        ORDER BY isin, credit_type, currency
      `);
      const grouped: Record<string, { credit_type: string; currency: string; weight: number; updated_at: string }[]> = {};
      for (const row of result.rows) {
        if (!grouped[row.isin]) grouped[row.isin] = [];
        grouped[row.isin].push({
          credit_type: row.credit_type,
          currency: row.currency,
          weight: row.weight,
          updated_at: row.updated_at,
        });
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
      breakdown: { credit_type: string; currency: string; weight: number }[];
    };
    if (!isin || !Array.isArray(breakdown)) {
      return res.status(400).json({ error: "isin et breakdown requis" });
    }
    try {
      await pool.query("DELETE FROM credit_breakdown WHERE isin = $1", [isin]);
      for (const row of breakdown) {
        if (row.weight > 0) {
          await pool.query(
            "INSERT INTO credit_breakdown (isin, credit_type, currency, weight) VALUES ($1, $2, $3, $4)",
            [isin, row.credit_type, row.currency, row.weight]
          );
        }
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
      await pool.query("DELETE FROM credit_breakdown WHERE isin = $1", [isin]);
      return res.json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
