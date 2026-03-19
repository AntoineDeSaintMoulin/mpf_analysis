import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = req.query.resource as string;

  if (!["breakdown", "currency", "ratings"].includes(resource)) {
    return res.status(400).json({ error: "resource doit être breakdown, currency ou ratings" });
  }

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      if (resource === "breakdown") {
        const result = await pool.query(`
          SELECT isin, region, weight, updated_at
          FROM instrument_breakdown
          ORDER BY isin, weight DESC
        `);
        const grouped: Record<string, { region: string; weight: number; updated_at: string }[]> = {};
        for (const row of result.rows) {
          if (!grouped[row.isin]) grouped[row.isin] = [];
          grouped[row.isin].push({ region: row.region, weight: row.weight, updated_at: row.updated_at });
        }
        return res.json(grouped);
      }

      if (resource === "currency") {
        const result = await pool.query(`
          SELECT isin, currency, weight, updated_at
          FROM currency_breakdown
          ORDER BY isin, weight DESC
        `);
        const grouped: Record<string, { currency: string; weight: number; updated_at: string }[]> = {};
        for (const row of result.rows) {
          if (!grouped[row.isin]) grouped[row.isin] = [];
          grouped[row.isin].push({ currency: row.currency, weight: row.weight, updated_at: row.updated_at });
        }
        return res.json(grouped);
      }

      if (resource === "ratings") {
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
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const { isin } = req.body as { isin: string };
      if (!isin) return res.status(400).json({ error: "isin requis" });

      if (resource === "breakdown") {
        const { breakdown } = req.body as { breakdown: { region: string; weight: number }[] };
        if (!Array.isArray(breakdown)) return res.status(400).json({ error: "breakdown requis" });
        await pool.query("DELETE FROM instrument_breakdown WHERE isin = $1", [isin]);
        for (const row of breakdown) {
          await pool.query(
            "INSERT INTO instrument_breakdown (isin, region, weight) VALUES ($1, $2, $3)",
            [isin, row.region, row.weight]
          );
        }
        return res.json({ success: true });
      }

      if (resource === "currency") {
        const { breakdown } = req.body as { breakdown: { currency: string; weight: number }[] };
        if (!Array.isArray(breakdown)) return res.status(400).json({ error: "breakdown requis" });
        await pool.query("DELETE FROM currency_breakdown WHERE isin = $1", [isin]);
        for (const row of breakdown) {
          await pool.query(
            "INSERT INTO currency_breakdown (isin, currency, weight) VALUES ($1, $2, $3)",
            [isin, row.currency, row.weight]
          );
        }
        return res.json({ success: true });
      }

      if (resource === "ratings") {
        const { rating } = req.body as { rating: string };
        if (!rating) return res.status(400).json({ error: "rating requis" });
        await pool.query(`
          INSERT INTO instrument_ratings (isin, rating)
          VALUES ($1, $2)
          ON CONFLICT (isin) DO UPDATE SET rating = $2, updated_at = NOW()
        `, [isin, rating]);
        return res.json({ success: true });
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      const { isin } = req.body as { isin: string };
      if (!isin) return res.status(400).json({ error: "isin requis" });

      if (resource === "breakdown") {
        await pool.query("DELETE FROM instrument_breakdown WHERE isin = $1", [isin]);
        return res.json({ success: true });
      }

      if (resource === "currency") {
        await pool.query("DELETE FROM currency_breakdown WHERE isin = $1", [isin]);
        return res.json({ success: true });
      }

      if (resource === "ratings") {
        await pool.query("DELETE FROM instrument_ratings WHERE isin = $1", [isin]);
        return res.json({ success: true });
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
