import { sql } from "@vercel/postgres";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { portfolios } = req.body;
  if (!portfolios || !Array.isArray(portfolios)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  try {
    const overrides = await sql`SELECT * FROM manual_overrides`;
    const overrideMap = new Map(overrides.rows.map((o: any) => [o.original_asset_name, o]));

    await sql`DELETE FROM holdings`;
    await sql`DELETE FROM portfolios`;

    for (const p of portfolios) {
      const result = await sql`
        INSERT INTO portfolios (name, type, description) 
        VALUES (${p.name}, ${p.type}, ${p.description || ""}) 
        RETURNING id
      `;
      const pId = result.rows[0].id;

      if (p.holdings && Array.isArray(p.holdings)) {
        for (const h of p.holdings) {
          const override = overrideMap.get(h.asset_name) as any;
          const assetName = override?.manual_asset_name || h.asset_name;
          const isin = override?.manual_isin || h.isin || "";
          const region = override?.manual_region || h.region || "Global";
          const currency = override?.manual_currency || h.currency || "USD";
          const category = override?.manual_category || h.category || "Unknown";
          const instrument = override?.manual_instrument || h.instrument || "Other";

          await sql`
            INSERT INTO holdings (portfolio_id, asset_name, original_asset_name, category, region, instrument, weight, currency, isin)
            VALUES (${pId}, ${assetName}, ${h.asset_name}, ${category}, ${region}, ${instrument}, ${h.weight || 0}, ${currency}, ${isin})
          `;
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: String(error) });
  }
}
