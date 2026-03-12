import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  PieChart as PieChartIcon,
  Globe,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Info,
  Sparkles,
  Loader2,
  Table as TableIcon,
  Layers,
  X,
  Coins,
  MapPin,
  Tag,
  ArrowRight,
  Upload,
  FileText,
  CheckCircle2,
  Edit2,
  Trash2,
  Save,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  Search,
} from "lucide-react";
import Papa from "papaparse";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Portfolio, ModelGridItem, AnalysisResult, Holding, ManualOverride } from "./types";
import {
  fetchPortfolios,
  fetchPortfolioDetails,
  fetchModelGrid,
  fetchAllPortfolios,
  fetchManualOverrides,
  saveManualOverride,
  deleteManualOverride,
  fetchBreakdowns,
  saveBreakdown,
  deleteBreakdown,
  type BreakdownMap,
  type BreakdownEntry,
} from "./services/api";
import { analyzePortfolio } from "./services/gemini";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function portfolioLabel(name: string | undefined | null): string {
  if (!name) return "—";
  const parts = name.split(" - ");
  return parts.length >= 2 ? parts[1] : name;
}

function portfolioTypePart(name: string | undefined | null): string {
  if (!name) return "—";
  const parts = name.split(" - ");
  return parts[0] ?? name;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const PORTFOLIO_ORDER = [
  "Sicav - SCV_BDS",
  "Sicav - SCV_LOW",
  "Sicav - SCV_ML",
  "Sicav - SCV_MED",
  "Sicav - SCV_MH",
  "Sicav - SCV_HIGH",
  "Sicav - SCV_VH",
  "Mixed - MIX_BDS",
  "Mixed - MIX_LOW",
  "Mixed - MIX_ML",
  "Mixed - MIX_MED",
  "Mixed - MIX_MH",
  "Mixed - MIX_HIGH",
  "Mixed - MIX_VH",
];

type Tab = "SYNTHESE" | "Sicav" | "Mixed" | "INSTRUMENTS" | "MANUALS" | "TARGET_GRID";

// ─── Target Grid hierarchy ────────────────────────────────────────────────────

const RISK_PROFILES = ["LOW", "MEDLOW", "MEDIUM", "MEDHIGH", "HIGH"] as const;
type RiskProfile = typeof RISK_PROFILES[number];

interface TargetGridRow {
  id: string;
  label: string;
  level: 0 | 1 | 2;
  parent?: string;
  bench?: Record<RiskProfile, number | null>;
  target?: Record<RiskProfile, number | null>;
  active?: Record<RiskProfile, number | null>;
}

const TARGET_GRID_STRUCTURE: { id: string; label: string; level: 0 | 1 | 2; parent?: string }[] = [
  { id: "equities", label: "Equities", level: 0 },
    { id: "eq_europe", label: "Europe", level: 1, parent: "equities" },
    { id: "eq_us", label: "United States", level: 1, parent: "equities" },
    { id: "eq_em", label: "Emerging Markets", level: 1, parent: "equities" },
    { id: "eq_japan", label: "Japan", level: 1, parent: "equities" },
    { id: "eq_other", label: "Other", level: 1, parent: "equities" },
  { id: "alternatives", label: "Alternatives", level: 0 },
    { id: "alt_conv", label: "Convertible Bonds", level: 1, parent: "alternatives" },
    { id: "alt_gold", label: "Gold", level: 1, parent: "alternatives" },
    { id: "alt_other", label: "Other Alternatives", level: 1, parent: "alternatives" },
  { id: "fixed_income", label: "Fixed Income", level: 0 },
    { id: "fi_eur", label: "Bonds EUR Exposure", level: 1, parent: "fixed_income" },
      { id: "fi_eur_gov", label: "EUR Govies", level: 2, parent: "fi_eur" },
      { id: "fi_eur_gov_infl", label: "EUR Govies Inflation Linked", level: 2, parent: "fi_eur" },
      { id: "fi_eur_ig", label: "EUR IG Credit", level: 2, parent: "fi_eur" },
      { id: "fi_eur_hy", label: "EUR High Yield", level: 2, parent: "fi_eur" },
    { id: "fi_usd", label: "Bonds USD Exposure", level: 1, parent: "fixed_income" },
      { id: "fi_usd_gov", label: "USD Govies", level: 2, parent: "fi_usd" },
      { id: "fi_usd_gov_infl", label: "USD Govies Infl Linked", level: 2, parent: "fi_usd" },
      { id: "fi_usd_ig", label: "USD IG Credit", level: 2, parent: "fi_usd" },
      { id: "fi_usd_hy", label: "USD High Yield", level: 2, parent: "fi_usd" },
    { id: "fi_em_local", label: "Emerging Market Debt (Local Currency)", level: 1, parent: "fixed_income" },
    { id: "fi_em_hard", label: "Emerging Market Debt (Hard Currency)", level: 1, parent: "fixed_income" },
    { id: "fi_global", label: "Global Fixed Income", level: 1, parent: "fixed_income" },
  { id: "short_term", label: "Short Term", level: 0 },
    { id: "st_eur", label: "EUR", level: 1, parent: "short_term" },
    { id: "st_usd", label: "USD", level: 1, parent: "short_term" },
    { id: "st_other", label: "Other FX", level: 1, parent: "short_term" },
];

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <div className="p-8">{children}</div>
      </motion.div>
    </div>
  );
}

// ─── Sort icon ───────────────────────────────────────────────────────────────

function SortIcon({ active, direction }: { active: boolean; direction?: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  return direction === "asc" ? <ChevronUp className="h-3 w-3 text-sky-600" /> : <ChevronDown className="h-3 w-3 text-sky-600" />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("INSTRUMENTS");
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [allPortfolios, setAllPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [modelGrid, setModelGrid] = useState<ModelGridItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [drillDownFilter, setDrillDownFilter] = useState<{ type: "category" | "region"; value: string } | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<Holding | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [importLog, setImportLog] = useState<{
    quick_valuation: { filename: string; imported_at: string } | null;
    samdp: { filename: string; imported_at: string }[];
    target_grid: { filename: string; imported_at: string } | null;
    other: { filename: string; imported_at: string } | null;
  }>({ quick_valuation: null, samdp: [], target_grid: null, other: null });
  const [targetGridData, setTargetGridData] = useState<Record<string, { bench: Record<RiskProfile, number | null>; target: Record<RiskProfile, number | null>; active: Record<RiskProfile, number | null> }>>({});
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [holdingsSortConfig, setHoldingsSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [holdingsSearch, setHoldingsSearch] = useState("");
  const [instrumentsSearch, setInstrumentsSearch] = useState("");
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
  const [editingOverride, setEditingOverride] = useState<{
    original_asset_name: string; manual_asset_name: string; manual_isin: string;
    manual_region: string; manual_currency: string; manual_category: string; manual_instrument: string;
  } | null>(null);
  const [breakdowns, setBreakdowns] = useState<BreakdownMap>({});
  const [editingBreakdown, setEditingBreakdown] = useState<{ isin: string; name: string; rows: BreakdownEntry[] } | null>(null);
  const [breakdownSaving, setBreakdownSaving] = useState(false);
  
  // ── Safe fetch ────────────────────────────────────────────────────────────

  async function safeArray<T>(fn: () => Promise<T[]>): Promise<T[]> {
    try {
      const r = await fn();
      return Array.isArray(r) ? r : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  // ── FIX: loadTargetGrid défini AVANT loadBaseData ─────────────────────────

  const loadTargetGrid = async () => {
    try {
      const res = await fetch("/api/target-grid");
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          setTargetGridData(data);
        }
      }
    } catch (e) {
      console.warn("Could not load target grid", e);
    }
  };

  const loadBaseData = async () => {
    const [pList, mGrid, allP, overrides] = await Promise.all([
      safeArray(fetchPortfolios),
      safeArray(fetchModelGrid),
      safeArray(fetchAllPortfolios),
      safeArray(fetchManualOverrides),
    ]);
    setPortfolios(pList);
    setModelGrid(mGrid);
    setAllPortfolios(allP);
    setManualOverrides(overrides);
    return pList;
  };

// ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const pList = await loadBaseData();
        const scv = pList.filter((p) => p?.type === "Sicav");
        if (scv.length > 0 && scv[0]?.id != null) setSelectedId(scv[0].id);

        // Load last import log
        try {
          const logRes = await fetch("/api/import-log");
          if (logRes.ok) {
            const log = await logRes.json();
            if (log) setImportLog(log);
          }
        } catch (e) {
          console.warn("Could not load import log", e);
        }

        // Load breakdowns
        try {
          const bd = await fetchBreakdowns();
          setBreakdowns(bd);
        } catch (e) {
          console.warn("Could not load breakdowns", e);
        }

        // Load target grid
        await loadTargetGrid();

      } catch (e) {
        console.error("Init failed", e);
        setErrorMsg("Erreur lors du chargement initial.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load detail ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedId == null) return;
    (async () => {
      setDetailLoading(true);
      setAnalysis(null);
      setDrillDownFilter(null);
      setHoldingsSearch("");
      setHoldingsSortConfig(null);
      try {
        const details = await fetchPortfolioDetails(selectedId);
        if (details && typeof details === "object" && (details as any).name) {
          setCurrentPortfolio(details);
        } else {
          const fallback =
            portfolios.find((p) => p.id === selectedId) ??
            allPortfolios.find((p) => p.id === selectedId) ??
            null;
          setCurrentPortfolio(fallback);
          if (!fallback) setErrorMsg(`Impossible de charger le portefeuille (id=${selectedId}).`);
        }
      } catch (e) {
        console.error("Failed to load portfolio details", e);
        const fallback = portfolios.find((p) => p.id === selectedId) ?? allPortfolios.find((p) => p.id === selectedId) ?? null;
        setCurrentPortfolio(fallback);
        setErrorMsg("Erreur de chargement du portefeuille.");
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selectedId]);

  // ── Auto-select on tab change ─────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== "Sicav" && activeTab !== "Mixed") return;
    const filtered = portfolios.filter((p) => p?.type === activeTab);
    if (filtered.length > 0 && !filtered.some((p) => p.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [activeTab, portfolios]);

  // ── Refresh ───────────────────────────────────────────────────────────────

  const refreshData = async () => {
    try {
      await loadBaseData();
      if (selectedId != null) {
        const d = await fetchPortfolioDetails(selectedId);
        if (d && (d as any).name) setCurrentPortfolio(d);
      }
    } catch (e) {
      console.error("Refresh failed", e);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!currentPortfolio || analyzing) return;
    setAnalyzing(true);
    try {
      const result = await analyzePortfolio(currentPortfolio, modelGrid);
      setAnalysis(result);
    } catch (e) {
      setErrorMsg("Erreur lors de l'analyse IA.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!editingOverride) return;
    try {
      await saveManualOverride(editingOverride);
      setEditingOverride(null);
      await refreshData();
    } catch (e) {
      setErrorMsg("Erreur lors de la sauvegarde.");
    }
  };

  const handleDeleteOverride = async (id: number) => {
    try {
      await deleteManualOverride(id);
      await refreshData();
    } catch (e) {
      setErrorMsg("Erreur lors de la suppression.");
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const handleHoldingsSort = (key: string) => {
    setHoldingsSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const saveImportLog = async (filename: string) => {
    try {
      await fetch("/api/import-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const logCheck = await fetch("/api/import-log");
      if (logCheck.ok) {
        const log = await logCheck.json();
        if (log) setImportLog(log);
      }
    } catch (e) {
      console.warn("Could not save import log", e);
    }
  };

  const isTargetGridFile = (filename: string) =>
    filename.toLowerCase().startsWith("fullgrid") || filename.toLowerCase().startsWith("target grid");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadSuccess(false);

    try {
      if (isTargetGridFile(file.name)) {
        // ── XLSX Target Grid import ──
        const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs" as any);
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

        const PROFILE_COLS: Record<string, [number, number, number]> = {
          LOW:     [2, 4, 6],
          MEDLOW:  [9, 11, 13],
          MEDIUM:  [17, 19, 21],
          MEDHIGH: [24, 26, 28],
          HIGH:    [31, 33, 35],
        };
        const ROW_MAP: Record<number, string> = {
          8: "equities", 9: "eq_europe", 10: "eq_us", 11: "eq_em", 12: "eq_japan", 13: "eq_other",
          14: "alternatives", 15: "alt_conv", 16: "alt_gold", 17: "alt_other",
          18: "fixed_income", 19: "fi_eur", 20: "fi_eur_gov", 21: "fi_eur_gov_infl", 22: "fi_eur_ig", 23: "fi_eur_hy",
          24: "fi_usd", 25: "fi_usd_gov", 26: "fi_usd_gov_infl", 27: "fi_usd_ig", 28: "fi_usd_hy",
          29: "fi_em_local", 30: "fi_em_hard", 31: "fi_global",
          32: "short_term", 33: "st_eur", 34: "st_usd", 35: "st_other",
        };

        const rows: { grid_id: string; profile: string; bench: number | null; target: number | null; active: number | null }[] = [];
        for (const [rowIdx, gridId] of Object.entries(ROW_MAP)) {
          const r = raw[Number(rowIdx)];
          if (!r) continue;
          for (const [profile, [b, t, a]] of Object.entries(PROFILE_COLS)) {
            const round2 = (v: any) => v != null && typeof v === "number" ? Math.round(v * 10000) / 100 : null;
            rows.push({ grid_id: gridId, profile, bench: round2(r[b]), target: round2(r[t]), active: round2(r[a]) });
          }
        }

        const res = await fetch("/api/target-grid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        if (res.ok) {
          setUploadSuccess(true);
          await saveImportLog(file.name);
          await loadTargetGrid();
          setActiveTab("TARGET_GRID");
          setTimeout(() => setUploadSuccess(false), 3000);
        } else {
          setErrorMsg(`Erreur upload Target Grid: ${await res.text()}`);
        }
      } else {
        // ── CSV Quick Valuation / other import ──
        Papa.parse(file, {
          header: false,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              const map = new Map<string, any>();
              (results.data as string[][]).forEach((row, idx) => {
                if (idx < 4) return;
                const rawName = row[1]?.trim() ?? "";
                if (!rawName) return;
                const code = rawName.replace("TECHNICAL.MPF.", "").trim();
                const type = code.startsWith("MIX") ? "Mixed" : "Sicav";
                const name = `${type} - ${code}`;
                const raw = row[4]?.trim() ?? "";
                const asset = raw.length > 20 ? raw.slice(0, -20).trim() : raw;
                if (!asset) return;
                if (!map.has(name)) map.set(name, { name, type, description: "", holdings: [] });
                map.get(name).holdings.push({
                  asset_name: asset,
                  isin: row[20]?.trim() || "",
                  category: row[23]?.trim() || "Unknown",
                  region: row[26]?.trim() || "Global",
                  instrument: row[21]?.trim() || "Other",
                  weight: parseFloat((row[12] ?? "0").replace(",", ".")) || 0,
                  currency: row[11]?.trim() || "EUR",
                });
              });
              const res = await fetch("/api/upload-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ portfolios: Array.from(map.values()) }),
              });
              if (res.ok) {
                setUploadSuccess(true);
                await saveImportLog(file.name);
                await refreshData();
                setTimeout(() => setUploadSuccess(false), 3000);
              } else {
                setErrorMsg(`Erreur upload: ${await res.text()}`);
              }
            } catch (e) {
              setErrorMsg("Erreur lors du traitement du CSV.");
            } finally {
              setUploading(false);
            }
          },
        });
        return;
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Erreur lors du traitement du fichier.");
    } finally {
      setUploading(false);
    }
  };

  // ── Region normalizer ─────────────────────────────────────────────────────
function normalizeRegion(region: string): string {
    const r = region?.trim() ?? "Other";
    if (["Europe", "Europe ex-Euroland", "Euroland"].includes(r)) return "Europe";
    if (["US", "North America"].includes(r)) return "US";
    if (["Emerging and Frontier Markets", "Emerging Markets"].includes(r)) return "EM";
    return r;
  }
  
  // ── Look-through helper ───────────────────────────────────────────────────

  function applyLookThrough(holdings: Holding[]): { region: string; weight: number }[] {
    const result: { region: string; weight: number }[] = [];
    for (const h of holdings) {
      if (!h) continue;
      const bd = h.isin ? breakdowns[h.isin] : null;
      if (bd && bd.length > 0) {
        for (const entry of bd) {
          result.push({ region: normalizeRegion(entry.region), weight: (h.weight ?? 0) * entry.weight / 100 });
        }
      } else {
        result.push({ region: normalizeRegion(h.region ?? "Other"), weight: h.weight ?? 0 });
      }
    }
    return result;
  }
  
  // ── Derived data ──────────────────────────────────────────────────────────

  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    (currentPortfolio?.holdings ?? []).forEach((h) => {
      if (!h?.category) return;
      m.set(h.category, (m.get(h.category) ?? 0) + (h.weight ?? 0));
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value: +value.toFixed(1) }));
  }, [currentPortfolio]);
  
const regionData = useMemo(() => {
    const m = new Map<string, number>();
    const equityHoldings = (currentPortfolio?.holdings ?? []).filter(h => h?.category === "Equities");
    applyLookThrough(equityHoldings).forEach(({ region, weight }) => {
      if (region === "Cash") return; // exclure le cash look-through
      m.set(region, (m.get(region) ?? 0) + weight);
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value: +value.toFixed(1) }));
  }, [currentPortfolio, breakdowns]);

  const instrumentsSynthesis = useMemo(() => {
    const im = new Map<string, { name: string; isin: string; weights: Record<string, number>; details: Partial<Holding> }>();
    const names = allPortfolios.map((p) => p?.name).filter(Boolean) as string[];
    allPortfolios.forEach((p) => {
      if (!p?.name) return;
      (p.holdings ?? []).forEach((h) => {
        if (!h?.asset_name) return;
        if (!im.has(h.asset_name)) {
          const w: Record<string, number> = {};
          names.forEach((n) => (w[n] = 0));
          im.set(h.asset_name, { name: h.asset_name, isin: h.isin ?? "", weights: w, details: h });
        }
        const e = im.get(h.asset_name)!;
        e.weights[p.name] = h.weight ?? 0;
        if (h.isin && !e.isin) e.isin = h.isin;
      });
    });
    return Array.from(im.values());
  }, [allPortfolios]);

  const sortedPortfolios = useMemo(() =>
    [...allPortfolios].filter((p) => p?.name).sort((a, b) => {
      const ai = PORTFOLIO_ORDER.indexOf(a.name);
      const bi = PORTFOLIO_ORDER.indexOf(b.name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }), [allPortfolios]);

const synthesisRegions = useMemo(() =>
    Array.from(new Set(sortedPortfolios.flatMap((p) =>
      applyLookThrough(p.holdings ?? []).map(({ region }) => region).filter(Boolean)
    ))), [sortedPortfolios, breakdowns]);

const synthesisData = useMemo(() =>
    sortedPortfolios.map((p) => {
      const rw: Record<string, number> = {};
      synthesisRegions.forEach((r) => (rw[r] = 0));
      applyLookThrough(p.holdings ?? []).forEach(({ region, weight }) => {
        rw[region] = (rw[region] ?? 0) + weight;
      });
      return { name: p.name ?? "—", type: p.type ?? "—", ...rw };
    }), [sortedPortfolios, synthesisRegions, breakdowns]);
  const sortedInstruments = useMemo(() => {
    if (!sortConfig) return instrumentsSynthesis;
    return [...instrumentsSynthesis].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      if (sortConfig.key === "name") return (a.name ?? "").localeCompare(b.name ?? "") * dir;
      return ((a.weights[sortConfig.key] ?? 0) - (b.weights[sortConfig.key] ?? 0)) * dir;
    });
  }, [instrumentsSynthesis, sortConfig]);

  const filteredPortfolios = useMemo(() =>
    portfolios
      .filter((p) => p?.type === activeTab)
      .sort((a, b) => {
        const ai = PORTFOLIO_ORDER.indexOf(a.name);
        const bi = PORTFOLIO_ORDER.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }),
    [portfolios, activeTab]);

const drillDownHoldings = useMemo(() => {
    if (!drillDownFilter) return [];
    const holdings = currentPortfolio?.holdings ?? [];

    if (drillDownFilter.type === "category") {
      return holdings.filter(h => h?.category === drillDownFilter.value);
    }

    // Région : filtrer uniquement les Equities + look-through + normalizeRegion
    return holdings
      .filter(h => {
        if (!h) return false;
        if (h.category !== "Equities") return false;
        const bd = h.isin ? breakdowns[h.isin] : null;
        if (bd && bd.length > 0) {
          return bd.some(e => normalizeRegion(e.region) === drillDownFilter.value);
        }
        return normalizeRegion(h.region ?? "Other") === drillDownFilter.value;
      })
      .map(h => {
        const bd = h.isin ? breakdowns[h.isin] : null;
        if (bd && bd.length > 0) {
          const entry = bd.find(e => normalizeRegion(e.region) === drillDownFilter.value);
          if (entry) return { ...h, weight: (h.weight ?? 0) * entry.weight / 100 };
        }
        return h;
      });
  }, [currentPortfolio, drillDownFilter, breakdowns]);

  const sortedFilteredHoldings = useMemo(() => {
    let list = (currentPortfolio?.holdings ?? []).filter((h) => {
      if (!h) return false;
      if (!holdingsSearch) return true;
      const q = holdingsSearch.toLowerCase();
      return (
        (h.asset_name ?? "").toLowerCase().includes(q) ||
        (h.isin ?? "").toLowerCase().includes(q) ||
        (h.category ?? "").toLowerCase().includes(q) ||
        (h.region ?? "").toLowerCase().includes(q) ||
        (h.currency ?? "").toLowerCase().includes(q)
      );
    });
    if (holdingsSortConfig) {
      const { key, direction } = holdingsSortConfig;
      const dir = direction === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        if (key === "weight") return ((a.weight ?? 0) - (b.weight ?? 0)) * dir;
        const av = (a[key as keyof Holding] ?? "") as string;
        const bv = (b[key as keyof Holding] ?? "") as string;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return list;
  }, [currentPortfolio, holdingsSearch, holdingsSortConfig]);

  const filteredInstruments = useMemo(() => {
    if (!instrumentsSearch) return sortedInstruments;
    const q = instrumentsSearch.toLowerCase();
    return sortedInstruments.filter((row) =>
      (row.name ?? "").toLowerCase().includes(q) ||
      (row.isin ?? "").toLowerCase().includes(q)
    );
  }, [sortedInstruments, instrumentsSearch]);

  // ── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-sky-600" />
          <p className="text-slate-400 text-sm">Chargement des données…</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">

      {/* Error toast */}
      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3 rounded-2xl shadow-lg max-w-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 p-1 hover:bg-rose-100 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-1.5 rounded-lg"><TrendingUp className="text-white h-4 w-4" /></div>
          <h1 className="text-lg font-bold tracking-tight">Portfolio Insight</h1>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(["SYNTHESE", "INSTRUMENTS", "TARGET_GRID", "Sicav", "Mixed", "MANUALS"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = { SYNTHESE: "Synthèse Géo", INSTRUMENTS: "Synthèse Instruments", TARGET_GRID: "Target Grid", Sicav: "Sicav", Mixed: "Mixed", MANUALS: "Manuals" };
            const showDate = ["SYNTHESE", "Sicav", "Mixed", "TARGET_GRID"].includes(tab);
            const latestDate = (() => {
              if (!showDate) return null;
              if (tab === "TARGET_GRID") {
                return importLog.target_grid ? new Date(importLog.target_grid.imported_at) : null;
              }
              const all = [importLog.quick_valuation, ...importLog.samdp, importLog.target_grid, importLog.other]
                .filter(Boolean).map(e => new Date(e!.imported_at).getTime());
              return all.length > 0 ? new Date(Math.max(...all)) : null;
            })();
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex flex-col items-center", activeTab === tab ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <span>{labels[tab]}</span>
                {showDate && latestDate && (
                  <span className="text-[9px] italic font-normal opacity-60 leading-none">
                    {latestDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="w-32" />
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        {(activeTab === "Sicav" || activeTab === "Mixed") && (
          <aside className="w-72 border-r border-slate-200 bg-white p-6 flex flex-col overflow-y-auto">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Profils {activeTab}</p>
            {filteredPortfolios.length === 0
              ? <p className="text-slate-400 text-sm px-2 italic">Aucun portefeuille.</p>
              : filteredPortfolios.map((p) => (
                <button key={p.id} onClick={() => setSelectedId(p.id)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group mb-1",
                    selectedId === p.id ? "bg-sky-50 text-sky-700 font-medium shadow-sm ring-1 ring-sky-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
                  <Briefcase className={cn("h-4 w-4", selectedId === p.id ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className="truncate">{portfolioLabel(p.name)}</span>
                  {selectedId === p.id && <ChevronRight className="ml-auto h-4 w-4" />}
                </button>
              ))
            }
          </aside>
        )}

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <AnimatePresence mode="wait">

            {/* ── SYNTHESE GEO ── */}
            {activeTab === "SYNTHESE" && (
              <motion.div key="synthese" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Synthèse Géographique</h2>
                    <p className="text-slate-500">Vue d'ensemble de l'exposition régionale pour tous les portefeuilles modèles.</p>
                  </div>
                  <div className="bg-sky-100 p-3 rounded-2xl"><Globe className="h-6 w-6 text-sky-600" /></div>
                </div>
                {sortedPortfolios.length === 0
                  ? <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">Aucune donnée. Importez un CSV.</div>
                  : (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 flex flex-col-reverse">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-[180px]">Portefeuille</th>
                              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                              {synthesisRegions.map((r) => (
                                <th key={r} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">{r}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {synthesisData.map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-5 font-bold text-slate-900 sticky left-0 bg-white">{row.name}</td>
                                <td className="px-8 py-5">
                                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    row.type === "Sicav" ? "bg-purple-50 text-purple-700" : "bg-amber-50 text-amber-700")}>
                                    {row.type}
                                  </span>
                                </td>
                                {synthesisRegions.map((r) => {
                                  const w = Number(row[r] ?? 0);
                                  return (
                                    <td key={r} className="px-6 py-5 text-right font-medium text-slate-600">
                                      <div className="flex flex-col items-end gap-1">
                                        <span>{w > 0 ? `${w.toFixed(1)}%` : "—"}</span>
                                        {w > 0 && <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-sky-500" style={{ width: `${Math.min(100, w)}%` }} /></div>}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </motion.div>
            )}

            {/* ── INSTRUMENTS ── */}
            {activeTab === "INSTRUMENTS" && (
              <motion.div key="instruments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Synthèse des Instruments</h2>
                    <p className="text-slate-500">Détail de chaque instrument et son poids au sein de tous les portefeuilles.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="bg-emerald-50 p-2 rounded-lg"><TableIcon className="h-5 w-5 text-emerald-600" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instruments</p>
                        <p className="text-xl font-bold text-slate-900 leading-none">{instrumentsSynthesis.length}</p>
                      </div>
                    </div>
                    <div className="bg-emerald-100 p-3 rounded-2xl"><Layers className="h-6 w-6 text-emerald-600" /></div>
                  </div>
                </div>

                {/* Upload + Import log cards */}
                <div className="flex gap-3 items-stretch">
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-52 shrink-0">
                    <label className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-4 hover:border-sky-400 transition-all group cursor-pointer h-full gap-2">
                      <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="hidden" />
                      <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-sky-50 transition-colors">
                        <Upload className="h-5 w-5 text-slate-400 group-hover:text-sky-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-900 leading-tight">Importer CSV</p>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Remplace les données</p>
                      </div>
                      {uploading
                        ? <div className="flex items-center gap-1.5 bg-sky-50 px-2.5 py-1 rounded-lg"><Loader2 className="h-3.5 w-3.5 text-sky-600 animate-spin" /><span className="text-xs font-bold text-sky-700">Import…</span></div>
                        : uploadSuccess
                          ? <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-bold text-emerald-700">Succès !</span></div>
                          : <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2.5 py-1 rounded-lg"><FileText className="h-3 w-3" />CSV</div>
                      }
                    </label>
                  </div>

                  {([
                    { key: "quick_valuation", label: "Quick Valuation", color: "sky", entries: importLog.quick_valuation ? [importLog.quick_valuation] : [] },
                    { key: "samdp", label: "SAMDP", color: "violet", entries: importLog.samdp },
                    { key: "target_grid", label: "Target Grid", color: "emerald", entries: importLog.target_grid ? [importLog.target_grid] : [] },
                    { key: "other", label: "Autres", color: "amber", entries: importLog.other ? [importLog.other] : [] },
                  ] as const).map(({ key, label, color, entries }) => (
                    <div key={key} className={cn(
                      "flex-1 bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-2",
                      entries.length > 0 ? "border-slate-100" : "border-slate-100 opacity-70"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", {
                          "bg-sky-400": color === "sky",
                          "bg-violet-400": color === "violet",
                          "bg-emerald-400": color === "emerald",
                          "bg-amber-400": color === "amber",
                        })} />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                      </div>
                      {entries.length === 0
                        ? <p className="text-xs text-slate-300 italic">Aucun import</p>
                        : entries.map((e, i) => (
                          <div key={i} className={cn("flex flex-col", i > 0 && "border-t border-slate-50 pt-2")}>
                            <p className="text-xs font-bold text-slate-800 truncate leading-tight" title={e.filename}>{e.filename}</p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                              {new Date(e.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                              {" "}
                              {new Date(e.imported_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        ))
                      }
                    </div>
                  ))}
                </div>

                {sortedInstruments.length === 0
                  ? <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">Aucun instrument. Importez un CSV.</div>
                  : (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-8 py-4 border-b border-slate-50 flex items-center gap-3">
                        <Search className="h-4 w-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={instrumentsSearch}
                          onChange={(e) => setInstrumentsSearch(e.target.value)}
                          placeholder="Rechercher un instrument ou ISIN…"
                          className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                        />
                        {instrumentsSearch && (
                          <button onClick={() => setInstrumentsSearch("")} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="h-3.5 w-3.5 text-slate-400" />
                          </button>
                        )}
                        <span className="text-xs text-slate-400 shrink-0">{filteredInstruments.length} résultat{filteredInstruments.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-[200px]">
                                <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                                  Instrument
                                  <SortIcon active={sortConfig?.key === "name"} direction={sortConfig?.key === "name" ? sortConfig.direction : undefined} />
                                </button>
                              </th>
                              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">ISIN</th>
                              {sortedPortfolios.map((p) => {
                                const isActive = sortConfig?.key === p.name;
                                return (
                                  <th key={p.id} className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right min-w-[90px]" title={p.name}>
                                    <button onClick={() => handleSort(p.name)} className="flex flex-col items-end w-full hover:text-slate-900 transition-colors">
                                      <span className="opacity-60 leading-tight">{portfolioTypePart(p.name)}</span>
                                      <span className={cn("leading-tight flex items-center gap-1", isActive ? "text-sky-600" : "text-slate-900")}>
                                        {portfolioLabel(p.name)}
                                        <SortIcon active={isActive} direction={isActive ? sortConfig!.direction : undefined} />
                                      </span>
                                    </button>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredInstruments.map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-4 sticky left-0 bg-white group-hover:bg-slate-50">
                                  <button onClick={() => setSelectedInstrument(row.details as Holding)} className="flex items-center gap-2 text-sky-600 font-bold hover:underline text-left">
                                    {row.name}
                                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                </td>
                                <td className="px-8 py-4 text-xs font-mono text-slate-400">{row.isin || "—"}</td>
                                {sortedPortfolios.map((p) => {
                                  const w = row.weights[p.name] ?? 0;
                                  return <td key={p.id} className="px-4 py-4 text-right font-medium text-slate-600 text-sm">{w > 0 ? `${w.toFixed(1)}%` : "—"}</td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </motion.div>
            )}

           {/* ── MANUALS ── */}
  {activeTab === "MANUALS" && (
    <motion.div key="manuals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Changements Manuels</h2>
          <p className="text-slate-500">Ces données sont prioritaires sur les imports CSV.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="bg-amber-50 p-2 rounded-lg"><Edit2 className="h-5 w-5 text-amber-600" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modifications</p>
            <p className="text-xl font-bold text-slate-900 leading-none">{manualOverrides.length}</p>
          </div>
        </div>
      </div>

      {/* Overrides table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                {["Nom Original", "Nouveau Nom", "ISIN", "Région", "Devise", "Catégorie", "Type", "Date", "Actions"].map((h) => (
                  <th key={h} className={cn("px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider", h === "Actions" && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {manualOverrides.length === 0
                ? <tr><td colSpan={9} className="px-8 py-12 text-center text-slate-400 italic">Aucun changement manuel.</td></tr>
                : manualOverrides.map((ov) => (
                  <tr key={ov.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium">{ov.original_asset_name ?? "—"}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{ov.manual_asset_name || "—"}</td>
                    <td className="px-6 py-4 text-xs font-mono text-sky-600 font-bold">{ov.manual_isin || "—"}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{ov.manual_region || "—"}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{ov.manual_currency || "—"}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{ov.manual_category || "—"}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{ov.manual_instrument || "—"}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{ov.updated_at ? new Date(ov.updated_at).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingOverride({ original_asset_name: ov.original_asset_name ?? "", manual_asset_name: ov.manual_asset_name ?? "", manual_isin: ov.manual_isin ?? "", manual_region: ov.manual_region ?? "", manual_currency: ov.manual_currency ?? "", manual_category: ov.manual_category ?? "", manual_instrument: ov.manual_instrument ?? "" })}
                          className="p-2 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteOverride(ov.id)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Look-through section ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Look-through géographique</h3>
          <p className="text-slate-500 text-sm mt-1">Décomposition régionale des instruments multi-zones.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="bg-violet-50 p-2 rounded-lg"><Globe className="h-5 w-5 text-violet-600" /></div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instruments</p>
            <p className="text-xl font-bold text-slate-900 leading-none">{Object.keys(breakdowns).length}</p>
          </div>
        </div>
      </div>

      {/* Look-through table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header avec bouton Ajouter */}
        <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500">
            {Object.keys(breakdowns).length === 0 ? "Aucun breakdown enregistré." : `${Object.keys(breakdowns).length} instrument${Object.keys(breakdowns).length > 1 ? "s" : ""} configuré${Object.keys(breakdowns).length > 1 ? "s" : ""}`}
          </p>
          <button
            onClick={() => setEditingBreakdown({ isin: "", name: "", rows: [{ region: "", weight: 0 }] })}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-violet-700 transition-all"
          >
            <span>+</span> Ajouter
          </button>
        </div>

        {Object.keys(breakdowns).length === 0 ? (
          <div className="px-8 py-12 text-center text-slate-400 italic">
            Aucun look-through configuré.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {Object.entries(breakdowns).map(([isin, entries]) => {
              // Trouver le nom de l'instrument depuis allPortfolios
              const holding = allPortfolios
                .flatMap(p => p.holdings ?? [])
                .find(h => h.isin === isin);
              const name = holding?.asset_name ?? isin;
              const total = entries.reduce((s, e) => s + e.weight, 0);
              return (
                <div key={isin} className="px-8 py-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-bold text-slate-900 truncate">{name}</span>
                        <span className="text-xs font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg shrink-0">{isin}</span>
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-lg shrink-0",
                          Math.abs(total - 100) < 0.1 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {total.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entries.map((e, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                            {e.region} <span className="font-bold text-slate-900">{e.weight}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditingBreakdown({ isin, name, rows: [...entries] })}
                        className="p-2 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          await deleteBreakdown(isin);
                          const bd = await fetchBreakdowns();
                          setBreakdowns(bd);
                        }}
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  )}

            {/* ── TARGET GRID ── */}
            {activeTab === "TARGET_GRID" && (
              <motion.div key="target_grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Target Grid</h2>
                    <p className="text-slate-500">Allocation cible vs benchmark par profil de risque.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {importLog.target_grid && (
                      <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm text-xs text-slate-500">
                        <span className="font-bold text-slate-700 block truncate max-w-[220px]">{importLog.target_grid.filename}</span>
                        <span>{new Date(importLog.target_grid.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })} à {new Date(importLog.target_grid.imported_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                    <div className="bg-emerald-100 p-3 rounded-2xl"><TableIcon className="h-6 w-6 text-emerald-600" /></div>
                  </div>
                </div>

                {Object.keys(targetGridData).length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
                    <TableIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Aucune donnée. Importez un fichier Target Grid.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div style={{ transform: 'rotateX(180deg)', overflowX: 'auto' }} className="[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                      <div style={{ transform: 'rotateX(180deg)' }}>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-[280px]">Catégorie</th>
                              {RISK_PROFILES.map((profile) => (
                                <th key={profile} colSpan={3} className="px-2 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-100">
                                  {profile}
                                </th>
                              ))}
                            </tr>
                            {/* ── FIX: colonnes en minuscules pour que les conditions CSS matchent ── */}
                            <tr className="bg-slate-50/30 border-b border-slate-100">
                              <th className="px-6 py-2 sticky left-0 bg-slate-50/30 z-10" />
                              {RISK_PROFILES.map((profile) => (
                                ["bench", "target", "active"].map((col) => (
                                  <th key={`${profile}-${col}`} className={cn(
                                    "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-center min-w-[72px]",
                                    col === "bench" && "border-l border-slate-100",
                                    col === "target" && "bg-emerald-50/40",
                                    col === "active" ? "text-violet-500" : col === "target" ? "text-emerald-600" : "text-slate-400"
                                  )}>
                                    {col.charAt(0).toUpperCase() + col.slice(1)}
                                  </th>
                                ))
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {TARGET_GRID_STRUCTURE.map((row) => {
                              if (row.parent && collapsedRows.has(row.parent)) return null;
                              if (row.level === 2 && row.parent) {
                                const grandParent = TARGET_GRID_STRUCTURE.find(r => r.id === row.parent)?.parent;
                                if (grandParent && collapsedRows.has(grandParent)) return null;
                              }
                              const isCollapsed = collapsedRows.has(row.id);
                              const hasChildren = TARGET_GRID_STRUCTURE.some(r => r.parent === row.id);
                              const data = targetGridData[row.id];
                              const bgColor = row.level === 0 ? "bg-slate-800" : row.level === 1 ? "bg-slate-50/80" : "bg-white";
                              const textColor = row.level === 0 ? "text-white" : "text-slate-900";
                              const indent = row.level === 1 ? "pl-10" : row.level === 2 ? "pl-16" : "pl-6";
                              return (
                                <tr key={row.id} className={cn("transition-colors", row.level === 0 ? bgColor : "hover:bg-slate-50/50")}>
                                  <td className={cn("px-6 py-3 sticky left-0 z-10 font-medium", bgColor, textColor, indent)}>
                                    <div className="flex items-center gap-2">
                                      {hasChildren && (
                                        <button
                                          onClick={() => setCollapsedRows(prev => {
                                            const next = new Set(prev);
                                            next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                                            return next;
                                          })}
                                          className={cn("p-0.5 rounded transition-colors", row.level === 0 ? "hover:bg-white/20" : "hover:bg-slate-200")}
                                        >
                                          {isCollapsed
                                            ? <ChevronRight className={cn("h-3.5 w-3.5", row.level === 0 ? "text-white/70" : "text-slate-400")} />
                                            : <ChevronDown className={cn("h-3.5 w-3.5", row.level === 0 ? "text-white/70" : "text-slate-400")} />
                                          }
                                        </button>
                                      )}
                                      <span className={cn(
                                        row.level === 0 ? "text-sm font-bold tracking-wide uppercase" : row.level === 1 ? "text-sm font-semibold" : "text-xs text-slate-600"
                                      )}>{row.label}</span>
                                    </div>
                                  </td>
                                  {RISK_PROFILES.map((profile) => (
                                    ["bench", "target", "active"].map((col) => {
                                      const val = data?.[profile as RiskProfile]?.[col as "bench" | "target" | "active"];
                                      const isActive = col === "active";
                                      const isPos = (val ?? 0) > 0;
                                      const isNeg = (val ?? 0) < 0;
                                      return (
                                        <td key={`${profile}-${col}`} className={cn(
                                          "px-3 py-3 text-right text-xs font-medium min-w-[72px]",
                                          col === "bench" && "border-l border-slate-100",
                                          col === "target" && "bg-emerald-50/40",
                                          row.level === 0 ? "text-white/80" : isActive ? (isPos ? "text-emerald-600 font-bold" : isNeg ? "text-rose-600 font-bold" : "text-slate-400") : "text-slate-600"
                                        )}>
                                          {val != null ? `${val.toFixed(1)}%` : "—"}
                                        </td>
                                      );
                                    })
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SICAV / MIXED ── */}
            {(activeTab === "Sicav" || activeTab === "Mixed") && (
              <motion.div key={`detail-${selectedId ?? "none"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-6xl mx-auto space-y-8">

                {detailLoading && (
                  <div className="flex items-center justify-center py-32">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                  </div>
                )}

                {!detailLoading && !currentPortfolio && (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
                    <Briefcase className="h-12 w-12 opacity-30" />
                    <p className="text-lg">Sélectionnez un portefeuille.</p>
                  </div>
                )}

                {!detailLoading && currentPortfolio && (
                  <>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                            currentPortfolio.type === "Sicav" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700")}>
                            {currentPortfolio.type ?? "—"}
                          </span>
                          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{portfolioLabel(currentPortfolio.name)}</h2>
                        </div>
                        <p className="text-slate-500 max-w-2xl">{currentPortfolio.description ?? ""}</p>
                      </div>
                      <button onClick={handleAnalyze} disabled={analyzing}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50">
                        {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Analyse IA
                      </button>
                    </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4"><div className="bg-sky-100 p-2 rounded-xl"><LayoutDashboard className="h-5 w-5 text-sky-600" /></div><span className="text-sm font-semibold text-slate-500">Actifs</span></div>
                        <div className="text-3xl font-bold text-slate-900">{currentPortfolio.holdings?.length ?? 0}</div>
                        <div className="text-xs text-slate-400 mt-1">Instruments individuels</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4"><div className="bg-emerald-100 p-2 rounded-xl"><PieChartIcon className="h-5 w-5 text-emerald-600" /></div><span className="text-sm font-semibold text-slate-500">Catégorie Principale</span></div>
                        <div className="text-3xl font-bold text-slate-900 truncate">{[...categoryData].sort((a, b) => b.value - a.value)[0]?.name ?? "N/A"}</div>
                        <div className="text-xs text-slate-400 mt-1">Plus grande exposition</div>
                      </div>
                    </div>

                    {(currentPortfolio.holdings?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                          <h3 className="text-lg font-bold mb-8 flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-sky-600" />Allocation par Catégorie</h3>
                          <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                                  onClick={(d) => setDrillDownFilter({ type: "category", value: d.name })} className="cursor-pointer">
                                  {categoryData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                  <LabelList dataKey="value" position="outside" formatter={(v: number) => `${v}%`} fill="#64748b" fontSize={11} />
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: "16px", border: "none" }} formatter={(v: number) => `${v}%`} />
                                <Legend verticalAlign="bottom" height={36} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-center text-xs text-slate-400 mt-2 italic">Cliquez pour filtrer</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                          <h3 className="text-lg font-bold mb-8 flex items-center gap-2"><Globe className="h-5 w-5 text-amber-600" />Exposition Régionale</h3>
                          <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} onClick={(d: any) => d?.activeLabel && setDrillDownFilter({ type: "region", value: d.activeLabel })}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "16px", border: "none" }} formatter={(v: number) => `${v}%`} />
                                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} className="cursor-pointer">
                                  <LabelList dataKey="value" position="top" formatter={(v: number) => `${v}%`} fill="#64748b" fontSize={11} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-center text-xs text-slate-400 mt-2 italic">Cliquez pour filtrer</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-400">Aucune position pour ce portefeuille.</div>
                    )}

                    <AnimatePresence>
                      {drillDownFilter && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-sky-50 p-8 rounded-3xl border border-sky-100">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-sky-900">
                              Détail {drillDownFilter.type === "category" ? "Catégorie" : "Région"} : {drillDownFilter.value}
                            </h3>
                            <button onClick={() => setDrillDownFilter(null)} className="text-sky-600 hover:text-sky-800 text-sm font-medium flex items-center gap-1">Fermer <X className="h-4 w-4" /></button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...drillDownHoldings]
                              .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
                              .map((h, i) => (
                                <button key={i} onClick={() => setSelectedInstrument(h)}
                                  className="bg-white p-4 rounded-2xl shadow-sm border border-sky-100 flex justify-between items-center hover:border-sky-300 hover:shadow-md transition-all text-left group">
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-900 group-hover:text-sky-700 transition-colors truncate">{h.asset_name ?? "—"}</div>
                                    <div className="text-xs text-slate-500">{h.instrument ?? "—"} • {h.currency ?? "—"}</div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <span className="text-lg font-bold text-sky-600">{Number(h.weight ?? 0).toFixed(2)}%</span>
                                    <ArrowRight className="h-3.5 w-3.5 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {analysis && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Sparkles className="h-32 w-32" /></div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="bg-white/10 p-2 rounded-xl"><Sparkles className="h-5 w-5 text-sky-400" /></div>
                              <h3 className="text-xl font-bold">Analyse IA Insight</h3>
                            </div>
                            <p className="text-slate-300 leading-relaxed text-lg mb-8">{analysis.commentary}</p>
                            {(analysis.differences?.length ?? 0) > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {analysis.differences.map((diff, i) => (
                                  <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{diff.category} • {diff.region}</div>
                                    <div className="flex items-end justify-between">
                                      <div className="text-xl font-bold">{diff.current}% <span className="text-xs font-normal text-slate-400">vs {diff.target}%</span></div>
                                      <div className={cn("text-sm font-medium px-2 py-0.5 rounded-lg", diff.diff > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                                        {diff.diff > 0 ? "+" : ""}{diff.diff}%
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {(currentPortfolio.holdings?.length ?? 0) > 0 && (
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-5 flex items-center justify-between gap-4 border-b border-slate-50">
                          <h3 className="text-lg font-bold shrink-0">Détails des Positions</h3>
                          <div className="flex items-center gap-2 flex-1 max-w-sm bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                            <Search className="h-4 w-4 text-slate-400 shrink-0" />
                            <input type="text" value={holdingsSearch} onChange={(e) => setHoldingsSearch(e.target.value)}
                              placeholder="Rechercher…" className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                            {holdingsSearch && (
                              <button onClick={() => setHoldingsSearch("")} className="p-0.5 hover:bg-slate-200 rounded transition-colors">
                                <X className="h-3.5 w-3.5 text-slate-400" />
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full shrink-0 border border-slate-100">
                            {sortedFilteredHoldings.length} / {currentPortfolio.holdings?.length ?? 0}
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50">
                                {([
                                  { key: "asset_name", label: "Instrument", align: "left" },
                                  { key: "isin", label: "ISIN", align: "left" },
                                  { key: "category", label: "Catégorie", align: "left" },
                                  { key: "region", label: "Région", align: "left" },
                                  { key: "currency", label: "Devise", align: "left" },
                                  { key: "weight", label: "Poids", align: "right" },
                                ] as const).map(({ key, label, align }) => (
                                  <th key={key} className={cn("px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider", align === "right" && "text-right")}>
                                    <button onClick={() => handleHoldingsSort(key)} className={cn("flex items-center gap-1 hover:text-slate-900 transition-colors", align === "right" && "ml-auto")}>
                                      {label}
                                      <SortIcon active={holdingsSortConfig?.key === key} direction={holdingsSortConfig?.key === key ? holdingsSortConfig.direction : undefined} />
                                    </button>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {sortedFilteredHoldings.length === 0 ? (
                                <tr><td colSpan={6} className="px-8 py-10 text-center text-slate-400 italic">Aucun résultat pour "{holdingsSearch}"</td></tr>
                              ) : (
                                sortedFilteredHoldings.map((h, idx) => (
                                  <tr key={h?.id ?? idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-4">
                                      <button onClick={() => setSelectedInstrument(h)} className="font-medium text-slate-900 hover:text-sky-600 hover:underline text-left">{h?.asset_name ?? "—"}</button>
                                    </td>
                                    <td className="px-8 py-4 text-xs font-mono text-slate-400">{h?.isin || "—"}</td>
                                    <td className="px-8 py-4">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">{h?.category ?? "—"}</span>
                                    </td>
                                    <td className="px-8 py-4 text-slate-600">{h?.region ?? "—"}</td>
                                    <td className="px-8 py-4 text-slate-500 text-sm">{h?.currency ?? "—"}</td>
                                    <td className="px-8 py-4 text-right font-bold text-slate-900">{Number(h?.weight ?? 0).toFixed(2)}%</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* ── Instrument modal ── */}
      <Modal isOpen={!!selectedInstrument} onClose={() => setSelectedInstrument(null)} title="Fiche Instrument">
        {selectedInstrument && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-sky-600 p-3 rounded-xl"><TrendingUp className="text-white h-6 w-6" /></div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedInstrument.asset_name ?? "—"}</h4>
                  <p className="text-sm text-slate-500">{selectedInstrument.instrument ?? "—"}</p>
                </div>
              </div>
              <button onClick={() => { setEditingOverride({ original_asset_name: selectedInstrument.original_asset_name ?? selectedInstrument.asset_name ?? "", manual_asset_name: selectedInstrument.asset_name ?? "", manual_isin: selectedInstrument.isin ?? "", manual_region: selectedInstrument.region ?? "", manual_currency: selectedInstrument.currency ?? "", manual_category: selectedInstrument.category ?? "", manual_instrument: selectedInstrument.instrument ?? "" }); setSelectedInstrument(null); }}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-sky-50 text-sky-600 border border-sky-100 rounded-xl transition-colors font-bold text-sm">
                <Edit2 className="h-4 w-4" /> Modifier
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([{ icon: Info, label: "ISIN", value: selectedInstrument.isin }, { icon: MapPin, label: "Région", value: selectedInstrument.region }, { icon: Coins, label: "Devise", value: selectedInstrument.currency }, { icon: Tag, label: "Catégorie", value: selectedInstrument.category }, { icon: Info, label: "Type", value: selectedInstrument.instrument }] as const).map(({ icon: Icon, label, value }) => (
                <div key={label} className="p-4 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-400 mb-1"><Icon className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">{label}</span></div>
                  <div className="font-bold text-slate-900">{value || "—"}</div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100">
              <p className="text-sm text-sky-800 leading-relaxed">Exposition à <strong>{selectedInstrument.category ?? "—"}</strong> dans la zone <strong>{selectedInstrument.region ?? "—"}</strong>.</p>
            </div>
          </div>
        )}
      </Modal>

{/* ── Edit override modal ── */}
      <Modal isOpen={!!editingOverride} onClose={() => setEditingOverride(null)} title="Modifier l'instrument">
        {editingOverride && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instrument Original</p>
              <p className="text-slate-900 font-bold">{editingOverride.original_asset_name}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { field: "manual_asset_name" as const, label: "Nouveau Nom", placeholder: "Nom de l'instrument" },
                { field: "manual_isin" as const, label: "Nouvel ISIN", placeholder: "Ex: LU0123456789", mono: true },
                { field: "manual_region" as const, label: "Région", placeholder: "Ex: Europe, US, Global" },
                { field: "manual_currency" as const, label: "Devise", placeholder: "Ex: EUR, USD, CHF" },
                { field: "manual_category" as const, label: "Catégorie", placeholder: "Ex: Equity, Fixed Income" },
                { field: "manual_instrument" as const, label: "Type d'Instrument", placeholder: "Ex: ETF, Fund, Bond" },
              ]).map(({ field, label, placeholder, mono }) => (
                <div key={field}>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
                  <input type="text" value={editingOverride[field]} onChange={(e) => setEditingOverride({ ...editingOverride, [field]: e.target.value })}
                    className={cn("w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all", mono && "font-mono")}
                    placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setEditingOverride(null)} className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">Annuler</button>
              <button onClick={handleSaveOverride} className="flex-1 flex items-center justify-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-sky-700 transition-all">
                <Save className="h-4 w-4" /> Sauvegarder
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center italic">Ce changement est conservé même après un import CSV.</p>
          </div>
        )}
      </Modal>

      {/* ── Breakdown modal ── */}
      <Modal isOpen={!!editingBreakdown} onClose={() => setEditingBreakdown(null)} title="Look-through géographique">
        {editingBreakdown && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ISIN</label>
              <input
                type="text"
                value={editingBreakdown.isin}
                onChange={(e) => setEditingBreakdown({ ...editingBreakdown, isin: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none font-mono"
                placeholder="Ex: BE6299468940"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">Décomposition régionale</label>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-lg",
                  Math.abs(editingBreakdown.rows.reduce((s, r) => s + (Number(r.weight) || 0), 0) - 100) < 0.1
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                )}>
                  Total : {editingBreakdown.rows.reduce((s, r) => s + (Number(r.weight) || 0), 0).toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2">
                {editingBreakdown.rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.region}
                      onChange={(e) => {
                        const rows = [...editingBreakdown.rows];
                        rows[i] = { ...rows[i], region: e.target.value };
                        setEditingBreakdown({ ...editingBreakdown, rows });
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                      placeholder="Région (ex: US, Europe…)"
                    />
                    <input
                      type="number"
                      value={row.weight}
                      onChange={(e) => {
                        const rows = [...editingBreakdown.rows];
                        rows[i] = { ...rows[i], weight: Number(e.target.value) };
                        setEditingBreakdown({ ...editingBreakdown, rows });
                      }}
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none text-sm text-right"
                      placeholder="%"
                      min={0} max={100} step={0.1}
                    />
                    <button
                      onClick={() => setEditingBreakdown({ ...editingBreakdown, rows: editingBreakdown.rows.filter((_, j) => j !== i) })}
                      className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setEditingBreakdown({ ...editingBreakdown, rows: [...editingBreakdown.rows, { region: "", weight: 0 }] })}
                className="mt-3 text-sm text-violet-600 hover:text-violet-800 font-bold flex items-center gap-1"
              >
                + Ajouter une région
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingBreakdown(null)} className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                Annuler
              </button>
              <button
                disabled={breakdownSaving || !editingBreakdown.isin}
                onClick={async () => {
                  setBreakdownSaving(true);
                  try {
                    await saveBreakdown(editingBreakdown.isin, editingBreakdown.rows.filter(r => r.region && r.weight > 0));
                    const bd = await fetchBreakdowns();
                    setBreakdowns(bd);
                    setEditingBreakdown(null);
                  } finally {
                    setBreakdownSaving(false);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-violet-700 transition-all disabled:opacity-50"
              >
                {breakdownSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
