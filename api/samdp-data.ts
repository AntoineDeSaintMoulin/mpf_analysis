import type { VercelRequest, VercelResponse } from "@vercel/node";
import pool from "./_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // ── GET ──
  if (req.method === "GET") {
    try {
      const logRes = await pool.query(`SELECT * FROM samdp_import_log ORDER BY imported_at DESC LIMIT 1`);
      if (logRes.rows.length === 0) return res.json({ instruments: [], importLog: null });
      const importId = logRes.rows[0].id;
      const instruments = await pool.query(`SELECT * FROM samdp_instruments WHERE import_id=$1 ORDER BY wght_pct DESC`, [importId]);
      return res.json({ instruments: instruments.rows, importLog: logRes.rows[0] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST ──
  if (req.method === "POST") {
    const { filename, instruments } = req.body;
    if (!filename || !instruments) return res.status(400).json({ error: "Missing fields" });
    try {
      // Supprimer les anciens imports
      const old = await pool.query(`SELECT id FROM samdp_import_log`);
      for (const row of old.rows) {
        await pool.query(`DELETE FROM samdp_import_log WHERE id=$1`, [row.id]);
      }
      // Créer nouveau log
      const logRes = await pool.query(
        `INSERT INTO samdp_import_log (filename) VALUES ($1) RETURNING id`,
        [filename]
      );
      const importId = logRes.rows[0].id;
      // Insérer instruments
      for (const inst of instruments) {
        await pool.query(`
          INSERT INTO samdp_instruments (
            import_id, name, isin, instrument_type, msci_sector_1, dom_country,
            msci_sector_2, msci_sector_3, style, secular, mkt_cap,
            pl_ptf, pl_local, currency, quantity, quote, quote_date,
            mtm_local, mtm_ptf, expo_pct, wght_pct
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        `, [
          importId, inst.name, inst.isin, inst.instrument_type,
          inst.msci_sector_1, inst.dom_country, inst.msci_sector_2, inst.msci_sector_3,
          inst.style, inst.secular, inst.mkt_cap, inst.pl_ptf, inst.pl_local,
          inst.currency, inst.quantity, inst.quote, inst.quote_date,
          inst.mtm_local, inst.mtm_ptf, inst.expo_pct, inst.wght_pct
        ]);
      }
      return res.json({ ok: true, importId, count: instruments.length });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
