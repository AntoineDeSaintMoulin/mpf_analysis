import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getCategory(filename: string): string {
  const name = filename.toLowerCase();
  if (name.startsWith("quick valuation")) return "quick_valuation";
  if (name.startsWith("samdp")) return "samdp";
  if (name.startsWith("target grid")) return "target_grid";
  return "other";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS import_log (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'other',
        imported_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add category column if it doesn't exist (migration safety)
    await pool.query(`
      ALTER TABLE import_log ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
    `);

    if (req.method === "GET") {
      // Return last entry per category + last 2 for samdp
      const qv = await pool.query(
        "SELECT filename, imported_at, category FROM import_log WHERE category = 'quick_valuation' ORDER BY imported_at DESC LIMIT 1"
      );
      const samdp = await pool.query(
        "SELECT filename, imported_at, category FROM import_log WHERE category = 'samdp' ORDER BY imported_at DESC LIMIT 2"
      );
      const tg = await pool.query(
        "SELECT filename, imported_at, category FROM import_log WHERE category = 'target_grid' ORDER BY imported_at DESC LIMIT 1"
      );
      const other = await pool.query(
        "SELECT filename, imported_at, category FROM import_log WHERE category = 'other' ORDER BY imported_at DESC LIMIT 1"
      );

      return res.json({
        quick_valuation: qv.rows[0] ?? null,
        samdp: samdp.rows,
        target_grid: tg.rows[0] ?? null,
        other: other.rows[0] ?? null,
      });
    }

    if (req.method === "POST") {
      const { filename } = req.body;
      if (!filename) return res.status(400).json({ error: "Missing filename" });
      const category = getCategory(filename);
      await pool.query(
        "INSERT INTO import_log (filename, category, imported_at) VALUES ($1, $2, NOW())",
        [filename, category]
      );
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
