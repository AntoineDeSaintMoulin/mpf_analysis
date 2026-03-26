import pool from "./_db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const [
      portfoliosRes,
      overridesRes,
      breakdownRes,
      currencyRes,
      creditRes,
      importLogRes,
      targetGridRes,
      durationRes,
    ] = await Promise.all([
      pool.query(`
        SELECT p.id, p.name, p.type, p.description,
          json_agg(
            json_build_object(
              'id', h.id,
              'asset_name', COALESCE(ov.manual_asset_name, h.asset_name),
              'original_asset_name', h.asset_name,
              'isin', COALESCE(ov.manual_isin, h.isin),
              'category', COALESCE(ov.manual_category, h.category),
              'region', COALESCE(ov.manual_region, h.region),
              'instrument', COALESCE(ov.manual_instrument, h.instrument),
              'weight', h.weight,
              'currency', COALESCE(ov.manual_currency, h.currency)
            ) ORDER BY h.weight DESC
          ) FILTER (WHERE h.id IS NOT NULL) AS holdings
        FROM portfolios p
        LEFT JOIN holdings h ON h.portfolio_id = p.id
        LEFT JOIN manual_overrides ov ON ov.original_asset_name = h.asset_name
        GROUP BY p.id, p.name, p.type, p.description
        ORDER BY p.name
      `),
      pool.query(`SELECT * FROM manual_overrides ORDER BY updated_at DESC`),
      pool.query(`SELECT isin, region, weight, updated_at FROM instrument_breakdown ORDER BY isin, weight DESC`),
      pool.query(`SELECT isin, currency, weight, updated_at FROM currency_breakdown ORDER BY isin, weight DESC`),
      pool.query(`SELECT isin, credit_type, currency, weight, updated_at FROM credit_breakdown ORDER BY isin, credit_type, currency`),
      pool.query(`SELECT filename, imported_at FROM import_log ORDER BY imported_at DESC LIMIT 20`),
      pool.query(`SELECT grid_id, profile, bench, target, active FROM target_grid`),
      pool.query(`SELECT isin, duration, updated_at FROM instrument_duration ORDER BY isin`),
    ]);

    // Group geo breakdowns by isin
    const breakdowns: Record<string, { region: string; weight: number; updated_at: string }[]> = {};
    for (const row of breakdownRes.rows) {
      if (!breakdowns[row.isin]) breakdowns[row.isin] = [];
      breakdowns[row.isin].push({ region: row.region, weight: row.weight, updated_at: row.updated_at });
    }

    // Group currency breakdowns by isin
    const currencyBreakdowns: Record<string, { currency: string; weight: number; updated_at: string }[]> = {};
    for (const row of currencyRes.rows) {
      if (!currencyBreakdowns[row.isin]) currencyBreakdowns[row.isin] = [];
      currencyBreakdowns[row.isin].push({ currency: row.currency, weight: row.weight, updated_at: row.updated_at });
    }

    // Group credit breakdowns by isin
    const creditBreakdowns: Record<string, { credit_type: string; currency: string; weight: number; updated_at: string }[]> = {};
    for (const row of creditRes.rows) {
      if (!creditBreakdowns[row.isin]) creditBreakdowns[row.isin] = [];
      creditBreakdowns[row.isin].push({
        credit_type: row.credit_type,
        currency: row.currency,
        weight: row.weight,
        updated_at: row.updated_at,
      });
    }

    // Durations map
    const durations: Record<string, { duration: number; updated_at: string }> = {};
    for (const row of durationRes.rows) {
      durations[row.isin] = { duration: row.duration, updated_at: row.updated_at };
    }

    // Import log
    const importLog = { quick_valuation: null as any, samdp: [] as any[], target_grid: null as any, other: null as any };
    for (const row of importLogRes.rows) {
      const f = row.filename?.toLowerCase() ?? "";
      if (f.startsWith("fullgrid") || f.startsWith("target grid")) {
        if (!importLog.target_grid) importLog.target_grid = row;
      } else if (f.includes("samdp")) {
        importLog.samdp.push(row);
      } else if (f.includes("quick") || f.endsWith(".csv")) {
        if (!importLog.quick_valuation) importLog.quick_valuation = row;
      } else {
        if (!importLog.other) importLog.other = row;
      }
    }

    // Target grid
    const targetGrid: Record<string, any> = {};
    for (const row of targetGridRes.rows) {
      if (!targetGrid[row.grid_id]) targetGrid[row.grid_id] = {};
      targetGrid[row.grid_id][row.profile] = { bench: row.bench, target: row.target, active: row.active };
    }

    res.setHeader("Cache-Control", "no-store");
    return res.json({
      portfolios: portfoliosRes.rows,
      overrides: overridesRes.rows,
      breakdowns,
      currencyBreakdowns,
      creditBreakdowns,
      durations,
      importLog,
      targetGrid,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e) });
  }
}
