import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      // Create table if not exists (safety)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS import_log (
          id SERIAL PRIMARY KEY,
          filename TEXT NOT NULL,
          imported_at TIMESTAMP DEFAULT NOW()
        )
      `);
      const result = await pool.query(
        "SELECT filename, imported_at FROM import_log ORDER BY imported_at DESC LIMIT 1"
      );
      if (result.rows.length === 0) return res.json(null);
      return res.json(result.rows[0]);
    }

    if (req.method === "POST") {
      const { filename } = req.body;
      if (!filename) return res.status(400).json({ error: "Missing filename" });
      await pool.query(
        "INSERT INTO import_log (filename, imported_at) VALUES ($1, NOW())",
        [filename]
      );
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
}
