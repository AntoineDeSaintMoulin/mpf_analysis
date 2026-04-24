import type { VercelRequest, VercelResponse } from "@vercel/node";
import pool from "./_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {

  const section = req.query.section as string | undefined;

  // ════════════════════════════════════════════════════════════════════════
  // SECTION SAMDP
  // ════════════════════════════════════════════════════════════════════════
  if (section === "samdp") {

    if (req.method === "GET") {
      try {
        const logRes = await pool.query(`SELECT * FROM samdp_import_log ORDER BY imported_at DESC LIMIT 1`);
        if (logRes.rows.length === 0) return res.json({ instruments: [], importLog: null });
        const importId = logRes.rows[0].id;
        const instruments = await pool.query(
          `SELECT * FROM samdp_instruments WHERE import_id=$1 ORDER BY wght_pct DESC`,
          [importId]
        );
        return res.json({ instruments: instruments.rows, importLog: logRes.rows[0] });
      } catch (e: any) {
        return res.status(500).json({ error: e.message });
      }
    }

    if (req.method === "POST") {
      const { filename, instruments } = req.body;
      if (!filename || !instruments) return res.status(400).json({ error: "Missing fields" });
      try {
        const old = await pool.query(`SELECT id FROM samdp_import_log`);
        for (const row of old.rows) {
          await pool.query(`DELETE FROM samdp_import_log WHERE id=$1`, [row.id]);
        }
        const logRes = await pool.query(
          `INSERT INTO samdp_import_log (filename) VALUES ($1) RETURNING id`,
          [filename]
        );
        const importId = logRes.rows[0].id;
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
// GET SAMDP DEBT
if (section === "samdp_debt") {
  if (req.method === "GET") {
    try {
      const logRes = await pool.query(`SELECT * FROM samdp_debt_import_log ORDER BY imported_at DESC LIMIT 1`);
      if (logRes.rows.length === 0) return res.json({ instruments: [], importLog: null });
      const importId = logRes.rows[0].id;
      const instruments = await pool.query(
        `SELECT * FROM samdp_debt_instruments WHERE import_id=$1 ORDER BY wght_pct DESC`,
        [importId]
      );
      return res.json({ instruments: instruments.rows, importLog: logRes.rows[0] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
 
  if (req.method === "POST") {
    const { filename, instruments } = req.body;
    if (!filename || !instruments) return res.status(400).json({ error: "Missing fields" });
    try {
      const old = await pool.query(`SELECT id FROM samdp_debt_import_log`);
      for (const row of old.rows) {
        await pool.query(`DELETE FROM samdp_debt_import_log WHERE id=$1`, [row.id]);
      }
      const logRes = await pool.query(
        `INSERT INTO samdp_debt_import_log (filename) VALUES ($1) RETURNING id`,
        [filename]
      );
      const importId = logRes.rows[0].id;
      for (const inst of instruments) {
        await pool.query(`
          INSERT INTO samdp_debt_instruments (
            import_id, name, isin, instrument_type, issuer, coupon_rate, maturity_date,
            currency, seniority, quote, quote_date, accrued_int, quantity, nominal,
            mtm_ptf, wght_pct, expo_pct, ytw, ytm, modified_duration, gov_spread,
            bics_sector_1, bics_sector_2, issuer_country, dom_country, geo_area,
            rating_moodys, rating_sp, rating_fitch, rating_cai, ig_hy,
            esg_score, mat_y, bondsegment
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
            $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34
          )
        `, [
          importId, inst.name, inst.isin, inst.instrument_type, inst.issuer,
          inst.coupon_rate, inst.maturity_date, inst.currency, inst.seniority,
          inst.quote, inst.quote_date, inst.accrued_int, inst.quantity, inst.nominal,
          inst.mtm_ptf, inst.wght_pct, inst.expo_pct, inst.ytw, inst.ytm,
          inst.modified_duration, inst.gov_spread, inst.bics_sector_1, inst.bics_sector_2,
          inst.issuer_country, inst.dom_country, inst.geo_area,
          inst.rating_moodys, inst.rating_sp, inst.rating_fitch, inst.rating_cai,
          inst.ig_hy, inst.esg_score, inst.mat_y, inst.bondsegment
        ]);
      }
      return res.json({ ok: true, importId, count: instruments.length });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
 
  // ════════════════════════════════════════════════════════════════════════
  // SECTION DPAM (comportement original)
  // ════════════════════════════════════════════════════════════════════════

  if (req.method === "GET") {
    try {
      const logRes = await pool.query(`SELECT * FROM dpam_import_log ORDER BY imported_at DESC`);
      const lastBonds = logRes.rows.find((r) => r.type === "bonds");
      const lastEquity = logRes.rows.find((r) => r.type === "equity");

      let bondsData = null;
      if (lastBonds) {
        const importId = lastBonds.id;
        const [instruments, globals, ratings, currencies, countries, sectors] = await Promise.all([
          pool.query(`SELECT * FROM dpam_bonds_instruments WHERE import_id=$1 ORDER BY col_index`, [importId]),
          pool.query(`SELECT * FROM dpam_bonds_globals WHERE import_id=$1`, [importId]),
          pool.query(`SELECT * FROM dpam_bonds_ratings WHERE import_id=$1`, [importId]),
          pool.query(`SELECT * FROM dpam_bonds_currencies WHERE import_id=$1`, [importId]),
          pool.query(`SELECT * FROM dpam_bonds_countries WHERE import_id=$1`, [importId]),
          pool.query(`SELECT * FROM dpam_bonds_sectors WHERE import_id=$1`, [importId]),
        ]);
        bondsData = {
          importLog: lastBonds,
          instruments: instruments.rows,
          globals: globals.rows,
          ratings: ratings.rows,
          currencies: currencies.rows,
          countries: countries.rows,
          sectors: sectors.rows,
        };
      }

      let equityData = null;
      if (lastEquity) {
        const importId = lastEquity.id;
        const [instruments, globals, sectors, countries, currencies] = await Promise.all([
          pool.query(`SELECT * FROM dpam_equity_instruments WHERE import_id=$1 ORDER BY col_index`, [importId]),
          pool.query(`SELECT * FROM dpam_equity_globals WHERE import_id=$1`, [importId]),
          pool.query(`SELECT * FROM dpam_equity_sectors WHERE import_id=$1`, [importId]),
          pool.query(`SELECT * FROM dpam_equity_countries WHERE import_id=$1`, [importId]),
          pool.query(`SELECT * FROM dpam_equity_currencies WHERE import_id=$1`, [importId]),
        ]);
        equityData = {
          importLog: lastEquity,
          instruments: instruments.rows,
          globals: globals.rows,
          sectors: sectors.rows,
          countries: countries.rows,
          currencies: currencies.rows,
        };
      }

      const mappings = await pool.query(`SELECT * FROM dpam_isin_mapping ORDER BY updated_at DESC`);
      return res.json({ bonds: bondsData, equity: equityData, mappings: mappings.rows });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "DELETE") {
    const { isin } = req.body;
    if (!isin) return res.status(400).json({ error: "Missing isin" });
    try {
      await pool.query(`DELETE FROM dpam_isin_mapping WHERE isin=$1`, [isin]);
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const { type, filename, parsed } = req.body;
    if (!type || !filename || !parsed)
      return res.status(400).json({ error: "Missing fields" });

    try {
      if (type === "mapping") {
        const { isin, dpam_type, col_index, instrument_name } = parsed;
        await pool.query(`
          INSERT INTO dpam_isin_mapping (isin, dpam_type, col_index, instrument_name, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT(isin) DO UPDATE SET
            dpam_type = EXCLUDED.dpam_type,
            col_index = EXCLUDED.col_index,
            instrument_name = EXCLUDED.instrument_name,
            updated_at = NOW()
        `, [isin, dpam_type, col_index, instrument_name]);
        return res.json({ ok: true });
      }

      const oldLogs = await pool.query(`SELECT id FROM dpam_import_log WHERE type=$1`, [type]);
      for (const row of oldLogs.rows) {
        await pool.query(`DELETE FROM dpam_import_log WHERE id=$1`, [row.id]);
      }

      const logRes = await pool.query(
        `INSERT INTO dpam_import_log (type, filename) VALUES ($1,$2) RETURNING id`,
        [type, filename]
      );
      const importId = logRes.rows[0].id;

      if (type === "bonds") {
        const { instruments, globals, ratings, currencies, countries, sectors } = parsed;
        for (const inst of instruments) {
          await pool.query(
            `INSERT INTO dpam_bonds_instruments (import_id, col_index, name, category, currency, is_hedged) VALUES ($1,$2,$3,$4,$5,$6)`,
            [importId, inst.colIndex, inst.name, inst.category, inst.currency, inst.isHedged]
          );
        }
        for (const g of globals) {
          await pool.query(
            `INSERT INTO dpam_bonds_globals (import_id, instrument_col, market_value, nb_holdings, maturity, ytw, ytw_duration_weighted, modified_duration, duration, average_rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [importId, g.colIndex, g.marketValue, g.nbHoldings, g.maturity, g.ytw, g.ytwDurationWeighted, g.modifiedDuration, g.duration, g.averageRating]
          );
        }
        for (const r of ratings) {
          await pool.query(
            `INSERT INTO dpam_bonds_ratings (import_id, instrument_col, ig, hy, others) VALUES ($1,$2,$3,$4,$5)`,
            [importId, r.colIndex, r.ig, r.hy, r.others]
          );
        }
        for (const c of currencies) {
          await pool.query(
            `INSERT INTO dpam_bonds_currencies (import_id, instrument_col, eur, usd, jpy, other) VALUES ($1,$2,$3,$4,$5,$6)`,
            [importId, c.colIndex, c.eur, c.usd, c.jpy, c.other]
          );
        }
        for (const c of countries) {
          if ((c.weight ?? 0) > 0.001) {
            await pool.query(
              `INSERT INTO dpam_bonds_countries (import_id, instrument_col, country, weight) VALUES ($1,$2,$3,$4)`,
              [importId, c.colIndex, c.country, c.weight]
            );
          }
        }
        for (const s of sectors) {
          if ((s.weight ?? 0) > 0.001) {
            await pool.query(
              `INSERT INTO dpam_bonds_sectors (import_id, instrument_col, sector, weight) VALUES ($1,$2,$3,$4)`,
              [importId, s.colIndex, s.sector, s.weight]
            );
          }
        }
      }

      if (type === "equity") {
        const { instruments, globals, sectors, countries, currencies } = parsed;
        for (const inst of instruments) {
          await pool.query(
            `INSERT INTO dpam_equity_instruments (import_id, col_index, name, portfolio_code) VALUES ($1,$2,$3,$4)`,
            [importId, inst.colIndex, inst.name, inst.portfolioCode]
          );
        }
        for (const g of globals) {
          await pool.query(
            `INSERT INTO dpam_equity_globals (import_id, instrument_col, market_value, nb_holdings, dividend_yield) VALUES ($1,$2,$3,$4,$5)`,
            [importId, g.colIndex, g.marketValue, g.nbHoldings, g.dividendYield]
          );
        }
        for (const s of sectors) {
          if ((s.weight ?? 0) > 0.001) {
            await pool.query(
              `INSERT INTO dpam_equity_sectors (import_id, instrument_col, sector, weight) VALUES ($1,$2,$3,$4)`,
              [importId, s.colIndex, s.sector, s.weight]
            );
          }
        }
        for (const c of countries) {
          if ((c.weight ?? 0) > 0.001) {
            await pool.query(
              `INSERT INTO dpam_equity_countries (import_id, instrument_col, country, weight) VALUES ($1,$2,$3,$4)`,
              [importId, c.colIndex, c.country, c.weight]
            );
          }
        }
        for (const c of currencies) {
          await pool.query(
            `INSERT INTO dpam_equity_currencies (import_id, instrument_col, eur, usd, jpy, other) VALUES ($1,$2,$3,$4,$5,$6)`,
            [importId, c.colIndex, c.eur, c.usd, c.jpy, c.other]
          );
        }
      }

      return res.json({ ok: true, importId });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
