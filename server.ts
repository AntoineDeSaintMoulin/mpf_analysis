import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("portfolio.db");

// Initialize database
db.exec(`
  DROP TABLE IF EXISTS holdings;
  DROP TABLE IF EXISTS portfolios;
  DROP TABLE IF EXISTS model_grid;

  CREATE TABLE portfolios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER,
    asset_name TEXT NOT NULL,
    original_asset_name TEXT NOT NULL,
    category TEXT NOT NULL,
    region TEXT NOT NULL,
    instrument TEXT NOT NULL,
    weight REAL NOT NULL,
    currency TEXT NOT NULL,
    isin TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
  );

  CREATE TABLE model_grid (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    region TEXT NOT NULL,
    target_weight REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS manual_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_asset_name TEXT UNIQUE NOT NULL,
    manual_asset_name TEXT,
    manual_isin TEXT,
    manual_region TEXT,
    manual_currency TEXT,
    manual_category TEXT,
    manual_instrument TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial data
const insertPortfolio = db.prepare("INSERT INTO portfolios (name, type, description) VALUES (?, ?, ?)");
const insertHolding = db.prepare("INSERT INTO holdings (portfolio_id, asset_name, original_asset_name, category, region, instrument, weight, currency, isin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

const profiles = [
  { name: "Bonds (BDS)", equity: 0, fixed: 90, cash: 10 },
  { name: "Low", equity: 20, fixed: 70, cash: 10 },
  { name: "MedLow (ML)", equity: 40, fixed: 50, cash: 10 },
  { name: "Medium (Med)", equity: 50, fixed: 45, cash: 5 },
  { name: "MedHigh (MH)", equity: 70, fixed: 25, cash: 5 },
  { name: "High", equity: 90, fixed: 5, cash: 5 },
  { name: "Very High (VH)", equity: 100, fixed: 0, cash: 0 },
];

const instruments = {
  Equity: [
    { name: "MSCI World Index Fund", isin: "LU0123456789", region: "Global", type: "ETF", currency: "USD" },
    { name: "S&P 500 Core ETF", isin: "IE00B5BMR087", region: "US", type: "ETF", currency: "USD" },
    { name: "Euro Stoxx 50 Index", isin: "LU0380865021", region: "Europe", type: "Index", currency: "EUR" },
    { name: "Emerging Markets Equity Fund", isin: "LU0210531801", region: "Emerging Markets", type: "Fund", currency: "USD" },
    { name: "Nasdaq 100 Tech ETF", isin: "US4642874402", region: "US", type: "ETF", currency: "USD" },
    { name: "Japan Equity Growth", isin: "JP3027650005", region: "Asia", type: "Fund", currency: "JPY" },
    { name: "UK FTSE 100 Tracker", isin: "GB0001383545", region: "Europe", type: "Index", currency: "GBP" },
    { name: "China A-Shares Fund", isin: "HK0000123456", region: "Emerging Markets", type: "Fund", currency: "CNY" },
    { name: "Global Clean Energy ETF", isin: "IE00B1XNHC34", region: "Global", type: "ETF", currency: "USD" },
    { name: "Swiss Market Index Fund", isin: "CH0009691605", region: "Europe", type: "Fund", currency: "CHF" },
    { name: "Apple Inc. Common Stock", isin: "US0378331005", region: "US", type: "Stock", currency: "USD" },
    { name: "Microsoft Corp.", isin: "US5949181045", region: "US", type: "Stock", currency: "USD" },
    { name: "Alphabet Inc. Cl A", isin: "US02079K1079", region: "US", type: "Stock", currency: "USD" },
    { name: "Amazon.com Inc.", isin: "US0231351067", region: "US", type: "Stock", currency: "USD" },
    { name: "NVIDIA Corporation", isin: "US67066G1040", region: "US", type: "Stock", currency: "USD" },
    { name: "Meta Platforms Inc.", isin: "US30303M1027", region: "US", type: "Stock", currency: "USD" },
    { name: "Tesla Inc.", isin: "US88160R1014", region: "US", type: "Stock", currency: "USD" },
    { name: "ASML Holding NV", isin: "NL0010273215", region: "Europe", type: "Stock", currency: "EUR" },
    { name: "LVMH Moet Hennessy", isin: "FR0000121014", region: "Europe", type: "Stock", currency: "EUR" },
    { name: "SAP SE", isin: "DE0007164600", region: "Europe", type: "Stock", currency: "EUR" },
    { name: "Samsung Electronics", isin: "KR7005930003", region: "Asia", type: "Stock", currency: "KRW" },
    { name: "TSMC Ltd.", isin: "TW0002330008", region: "Asia", type: "Stock", currency: "TWD" },
    { name: "Tencent Holdings", isin: "KYG875721634", region: "Emerging Markets", type: "Stock", currency: "HKD" },
    { name: "Alibaba Group", isin: "US01609W1027", region: "Emerging Markets", type: "Stock", currency: "USD" },
    { name: "Nestle SA", isin: "CH0038863350", region: "Europe", type: "Stock", currency: "CHF" },
    { name: "Roche Holding AG", isin: "CH0012032048", region: "Europe", type: "Stock", currency: "CHF" },
    { name: "Novartis AG", isin: "CH0012005267", region: "Europe", type: "Stock", currency: "CHF" },
    { name: "AstraZeneca PLC", isin: "GB0009895292", region: "Europe", type: "Stock", currency: "GBP" },
    { name: "Shell PLC", isin: "GB00BP6MXD84", region: "Europe", type: "Stock", currency: "GBP" },
    { name: "HSBC Holdings", isin: "GB0005405286", region: "Europe", type: "Stock", currency: "GBP" },
    { name: "Toyota Motor Corp.", isin: "JP3633400001", region: "Asia", type: "Stock", currency: "JPY" },
    { name: "Sony Group Corp.", isin: "JP3435000009", region: "Asia", type: "Stock", currency: "JPY" },
    { name: "Reliance Industries", isin: "INE002A01018", region: "Emerging Markets", type: "Stock", currency: "INR" },
    { name: "Petrobras SA", isin: "BRPETRACNPR6", region: "Emerging Markets", type: "Stock", currency: "BRL" },
    { name: "Vale SA", isin: "BRVALEACNOR0", region: "Emerging Markets", type: "Stock", currency: "BRL" },
    { name: "Infosys Ltd.", isin: "INE009A01021", region: "Emerging Markets", type: "Stock", currency: "INR" },
    { name: "HDFC Bank Ltd.", isin: "INE040A01034", region: "Emerging Markets", type: "Stock", currency: "INR" },
    { name: "BHP Group Ltd.", isin: "AU000000BHP4", region: "Asia", type: "Stock", currency: "AUD" },
    { name: "Commonwealth Bank", isin: "AU000000CBA7", region: "Asia", type: "Stock", currency: "AUD" },
    { name: "Rio Tinto PLC", isin: "GB0007188757", region: "Europe", type: "Stock", currency: "GBP" },
  ],
  FixedIncome: [
    { name: "US Treasury Bonds 10Y", isin: "US912828L797", region: "US", type: "Bond", currency: "USD" },
    { name: "Euro Corporate Bonds ESG", isin: "LU1681039647", region: "Europe", type: "Bond", currency: "EUR" },
    { name: "Global High Yield Bond", isin: "IE00B74DQ490", region: "Global", type: "Bond", currency: "USD" },
    { name: "Emerging Markets Debt", isin: "LU0323239441", region: "Emerging Markets", type: "Bond", currency: "USD" },
    { name: "Inflation Linked Bonds", isin: "FR0010174292", region: "Europe", type: "Bond", currency: "EUR" },
    { name: "Green Bonds Global", isin: "LU1563454310", region: "Global", type: "Bond", currency: "EUR" },
    { name: "UK Gilt 2030", isin: "GB00BL68HJ26", region: "Europe", type: "Bond", currency: "GBP" },
    { name: "Bund 10Y Germany", isin: "DE0001102507", region: "Europe", type: "Bond", currency: "EUR" },
    { name: "OAT 10Y France", isin: "FR0014007TY9", region: "Europe", type: "Bond", currency: "EUR" },
    { name: "JGB 10Y Japan", isin: "JP1103621M41", region: "Asia", type: "Bond", currency: "JPY" },
    { name: "Australian Gov Bond", isin: "AU3TB0000168", region: "Asia", type: "Bond", currency: "AUD" },
    { name: "Canada Gov Bond 5Y", isin: "CA135087L518", region: "US", type: "Bond", currency: "CAD" },
    { name: "Corporate Bond US IG", isin: "US023135AM06", region: "US", type: "Bond", currency: "USD" },
    { name: "Asian Development Bank", isin: "US045167CT58", region: "Asia", type: "Bond", currency: "USD" },
    { name: "World Bank Bond", isin: "US459058GC40", region: "Global", type: "Bond", currency: "USD" },
    { name: "EIB Green Bond", isin: "XS1107718279", region: "Europe", type: "Bond", currency: "EUR" },
    { name: "Nordic Investment Bank", isin: "US65562QBM70", region: "Europe", type: "Bond", currency: "USD" },
    { name: "KFW Bond 2028", isin: "DE000A2GSNR0", region: "Europe", type: "Bond", currency: "EUR" },
    { name: "Mexico Gov Bond", isin: "US91087BAA89", region: "Emerging Markets", type: "Bond", currency: "USD" },
    { name: "Brazil Gov Bond", isin: "US105756BV13", region: "Emerging Markets", type: "Bond", currency: "USD" },
    { name: "South Africa Bond", isin: "ZAG000106998", region: "Emerging Markets", type: "Bond", currency: "ZAR" },
  ],
  Cash: [
    { name: "Cash Account EUR", isin: "CASH-EUR-001", region: "Global", type: "Cash", currency: "EUR" },
    { name: "Money Market USD", isin: "CASH-USD-001", region: "Global", type: "Cash", currency: "USD" },
    { name: "Short Term Liquidity", isin: "CASH-GBP-001", region: "Global", type: "Cash", currency: "GBP" },
    { name: "Swiss Cash Account", isin: "CASH-CHF-001", region: "Global", type: "Cash", currency: "CHF" },
    { name: "Yen Liquidity Fund", isin: "CASH-JPY-001", region: "Global", type: "Cash", currency: "JPY" },
    { name: "AUD Cash Reserve", isin: "CASH-AUD-001", region: "Global", type: "Cash", currency: "AUD" },
    { name: "CAD Money Market", isin: "CASH-CAD-001", region: "Global", type: "Cash", currency: "CAD" },
  ]
};

const types = ["Sicav", "Mixed"] as const;

let instrumentIndex = 0;

types.forEach(type => {
  profiles.forEach((profile, pIdx) => {
    const pId = insertPortfolio.run(`${type} - ${profile.name}`, type, `Profil ${profile.name} pour la catégorie ${type}`).lastInsertRowid;
    
        if (profile.equity > 0) {
          const equityInsts = instruments.Equity;
          // Distribute equity across 8 instruments to use more of them
          const count = 8;
          const weightPerInst = profile.equity / count;
          for (let i = 0; i < count; i++) {
            // Use a rotating index to ensure all instruments are used across portfolios
            const inst = equityInsts[(pIdx * count + i) % equityInsts.length];
            insertHolding.run(pId, inst.name, inst.name, "Equity", inst.region, inst.type, weightPerInst, inst.currency, inst.isin);
          }
        }
        if (profile.fixed > 0) {
          const fixedInsts = instruments.FixedIncome;
          const count = 6;
          const weightPerInst = profile.fixed / count;
          for (let i = 0; i < count; i++) {
            const inst = fixedInsts[(pIdx * count + i) % fixedInsts.length];
            insertHolding.run(pId, inst.name, inst.name, "Fixed Income", inst.region, inst.type, weightPerInst, inst.currency, inst.isin);
          }
        }
        if (profile.cash > 0) {
          const cashInsts = instruments.Cash;
          const inst = cashInsts[pIdx % cashInsts.length];
          insertHolding.run(pId, inst.name, inst.name, "Cash", inst.region, inst.type, profile.cash, inst.currency, inst.isin);
        }
  });
});

const insertModel = db.prepare("INSERT INTO model_grid (category, region, target_weight) VALUES (?, ?, ?)");
insertModel.run("Equity", "US", 40);
insertModel.run("Equity", "Europe", 15);
insertModel.run("Equity", "Emerging Markets", 10);
insertModel.run("Fixed Income", "US", 30);
insertModel.run("Cash", "Global", 5);


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/manual-overrides", (req, res) => {
    const overrides = db.prepare("SELECT * FROM manual_overrides ORDER BY updated_at DESC").all();
    res.json(overrides);
  });

  app.post("/api/manual-overrides", (req, res) => {
    const { 
      original_asset_name, 
      manual_asset_name, 
      manual_isin,
      manual_region,
      manual_currency,
      manual_category,
      manual_instrument
    } = req.body;
    
    if (!original_asset_name) {
      return res.status(400).json({ error: "original_asset_name is required" });
    }

    try {
      const upsert = db.prepare(`
        INSERT INTO manual_overrides (
          original_asset_name, 
          manual_asset_name, 
          manual_isin, 
          manual_region,
          manual_currency,
          manual_category,
          manual_instrument,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(original_asset_name) DO UPDATE SET
          manual_asset_name = excluded.manual_asset_name,
          manual_isin = excluded.manual_isin,
          manual_region = excluded.manual_region,
          manual_currency = excluded.manual_currency,
          manual_category = excluded.manual_category,
          manual_instrument = excluded.manual_instrument,
          updated_at = CURRENT_TIMESTAMP
      `);
      upsert.run(
        original_asset_name, 
        manual_asset_name, 
        manual_isin,
        manual_region,
        manual_currency,
        manual_category,
        manual_instrument
      );
      
      // Also update existing holdings with this override
      const updateHoldings = db.prepare(`
        UPDATE holdings 
        SET asset_name = COALESCE(?, asset_name), 
            isin = COALESCE(?, isin),
            region = COALESCE(?, region),
            currency = COALESCE(?, currency),
            category = COALESCE(?, category),
            instrument = COALESCE(?, instrument)
        WHERE original_asset_name = ?
      `);
      updateHoldings.run(
        manual_asset_name, 
        manual_isin, 
        manual_region,
        manual_currency,
        manual_category,
        manual_instrument,
        original_asset_name
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Override error:", error);
      res.status(500).json({ error: "Failed to save override" });
    }
  });

  app.delete("/api/manual-overrides/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM manual_overrides WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete override" });
    }
  });

  app.get("/api/portfolios/all", (req, res) => {
    const portfolios = db.prepare("SELECT * FROM portfolios").all() as any[];
    const allPortfolios = portfolios.map(p => {
      const holdings = db.prepare("SELECT * FROM holdings WHERE portfolio_id = ?").all(p.id);
      return { ...p, holdings };
    });
    res.json(allPortfolios);
  });

  app.get("/api/portfolios", (req, res) => {
    const portfolios = db.prepare("SELECT * FROM portfolios").all();
    res.json(portfolios);
  });

  app.get("/api/portfolios/:id", (req, res) => {
    const portfolio = db.prepare("SELECT * FROM portfolios WHERE id = ?").get(req.params.id);
    if (!portfolio) return res.status(404).json({ error: "Portfolio not found" });
    
    const holdings = db.prepare("SELECT * FROM holdings WHERE portfolio_id = ?").all(req.params.id);
    res.json({ ...portfolio, holdings });
  });

  app.get("/api/model-grid", (req, res) => {
    const modelGrid = db.prepare("SELECT * FROM model_grid").all();
    res.json(modelGrid);
  });

  app.post("/api/upload-data", (req, res) => {
    const { portfolios } = req.body;
    if (!portfolios || !Array.isArray(portfolios)) {
      return res.status(400).json({ error: "Invalid data format" });
    }

    try {
      const overrides = db.prepare("SELECT * FROM manual_overrides").all() as any[];
      const overrideMap = new Map(overrides.map(o => [o.original_asset_name, o]));

      const transaction = db.transaction(() => {
        db.prepare("DELETE FROM holdings").run();
        db.prepare("DELETE FROM portfolios").run();

        for (const p of portfolios) {
          const pId = insertPortfolio.run(p.name, p.type, p.description || "").lastInsertRowid;
          if (p.holdings && Array.isArray(p.holdings)) {
            for (const h of p.holdings) {
              const override = overrideMap.get(h.asset_name);
              const assetName = override?.manual_asset_name || h.asset_name;
              const isin = override?.manual_isin || h.isin || "";
              const region = override?.manual_region || h.region || "Global";
              const currency = override?.manual_currency || h.currency || "USD";
              const category = override?.manual_category || h.category || "Unknown";
              const instrument = override?.manual_instrument || h.instrument || "Other";

              insertHolding.run(
                pId,
                assetName,
                h.asset_name, // original_asset_name from CSV
                category,
                region,
                instrument,
                h.weight || 0,
                currency,
                isin
              );
            }
          }
        }
      });
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
