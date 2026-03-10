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

type Tab = "SYNTHESE" | "Sicav" | "Mixed" | "INSTRUMENTS" | "MANUALS";

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
  const [activeTab, setActiveTab] = useState<Tab>("Sicav");
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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
  const [editingOverride, setEditingOverride] = useState<{
    original_asset_name: string; manual_asset_name: string; manual_isin: string;
    manual_region: string; manual_currency: string; manual_category: string; manual_instrument: string;
  } | null>(null);

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
      try {
        const details = await fetchPortfolioDetails(selectedId);
        if (details && typeof details === "object" && (details as any).name) {
          setCurrentPortfolio(details);
        } else {
          // Fallback to list data (without holdings)
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadSuccess(false);
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
  };

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
    (currentPortfolio?.holdings ?? []).forEach((h) => {
      if (!h?.region) return;
      m.set(h.region, (m.get(h.region) ?? 0) + (h.weight ?? 0));
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value: +value.toFixed(1) }));
  }, [currentPortfolio]);

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
      (p.holdings ?? []).map((h) => h?.region).filter(Boolean) as string[]
    ))), [sortedPortfolios]);

  const synthesisData = useMemo(() =>
    sortedPortfolios.map((p) => {
      const rw: Record<string, number> = {};
      synthesisRegions.forEach((r) => (rw[r] = 0));
      (p.holdings ?? []).forEach((h) => { if (h?.region) rw[h.region] = (rw[h.region] ?? 0) + (h.weight ?? 0); });
      return { name: p.name ?? "—", type: p.type ?? "—", ...rw };
    }), [sortedPortfolios, synthesisRegions]);

  const sortedInstruments = useMemo(() => {
    if (!sortConfig) return instrumentsSynthesis;
    return [...instrumentsSynthesis].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      if (sortConfig.key === "name") return (a.name ?? "").localeCompare(b.name ?? "") * dir;
      return ((a.weights[sortConfig.key] ?? 0) - (b.weights[sortConfig.key] ?? 0)) * dir;
    });
  }, [instrumentsSynthesis, sortConfig]);

  const filteredPortfolios = useMemo(() => portfolios.filter((p) => p?.type === activeTab), [portfolios, activeTab]);

  const drillDownHoldings = useMemo(() =>
    (currentPortfolio?.holdings ?? []).filter((h) => {
      if (!h || !drillDownFilter) return false;
      return drillDownFilter.type === "category" ? h.category === drillDownFilter.value : h.region === drillDownFilter.value;
    }), [currentPortfolio, drillDownFilter]);

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
          {(["SYNTHESE", "INSTRUMENTS", "Sicav", "Mixed", "MANUALS"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = { SYNTHESE: "Synthèse Géo", INSTRUMENTS: "Synthèse Instruments", Sicav: "Sicav", Mixed: "Mixed", MANUALS: "Manuals" };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", activeTab === tab ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                {labels[tab]}
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
                      <div className="overflow-x-auto">
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

                {/* Upload */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <label className="flex items-center justify-between border border-dashed border-slate-200 rounded-xl p-3 hover:border-sky-400 transition-all group cursor-pointer">
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-sky-50 transition-colors">
                        <Upload className="h-5 w-5 text-slate-400 group-hover:text-sky-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">Importer CSV</h3>
                        <p className="text-[11px] text-slate-500 leading-tight">Remplace toutes les données</p>
                      </div>
                    </div>
                    {uploading
                      ? <div className="flex items-center gap-2 bg-sky-50 px-3 py-1.5 rounded-lg"><Loader2 className="h-4 w-4 text-sky-600 animate-spin" /><span className="text-xs font-bold text-sky-700">Importation…</span></div>
                      : uploadSuccess
                        ? <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="text-xs font-bold text-emerald-700">Succès !</span></div>
                        : <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-lg"><FileText className="h-3 w-3" />CSV</div>
                    }
                  </label>
                </div>

                {sortedInstruments.length === 0
                  ? <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">Aucun instrument. Importez un CSV.</div>
                  : (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
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
                            {sortedInstruments.map((row, i) => (
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
                    {/* Header */}
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

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4"><div className="bg-amber-100 p-2 rounded-xl"><Globe className="h-5 w-5 text-amber-600" /></div><span className="text-sm font-semibold text-slate-500">Région Principale</span></div>
                        <div className="text-3xl font-bold text-slate-900 truncate">{[...regionData].sort((a, b) => b.value - a.value)[0]?.name ?? "N/A"}</div>
                        <div className="text-xs text-slate-400 mt-1">Concentration géographique</div>
                      </div>
                    </div>

                    {/* Charts */}
                    {(currentPortfolio.holdings?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                          <h3 className="text-lg font-bold mb-8 flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-sky-600" />Allocation par Catégorie</h3>
                          <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
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
                            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
                              <BarChart data={regionData} onClick={(d: any) => d?.activeLabel && setDrillDownFilter({ type: "region", value: d.activeLabel })}>
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

                    {/* Drill-down */}
                    <AnimatePresence>
                      {drillDownFilter && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-sky-50 p-8 rounded-3xl border border-sky-100">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-sky-900">Détail {drillDownFilter.type === "category" ? "Catégorie" : "Région"} : {drillDownFilter.value}</h3>
                            <button onClick={() => setDrillDownFilter(null)} className="text-sky-600 hover:text-sky-800 text-sm font-medium flex items-center gap-1">Fermer <X className="h-4 w-4" /></button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {drillDownHoldings.map((h, i) => (
                              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-sky-100 flex justify-between items-center">
                                <div>
                                  <div className="font-bold text-slate-900">{h.asset_name ?? "—"}</div>
                                  <div className="text-xs text-slate-500">{h.instrument ?? "—"} • {h.currency ?? "—"}</div>
                                </div>
                                <div className="text-lg font-bold text-sky-600">{h.weight ?? 0}%</div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* AI Analysis */}
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

                    {/* Holdings table */}
                    {(currentPortfolio.holdings?.length ?? 0) > 0 && (
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 flex items-center justify-between">
                          <h3 className="text-lg font-bold">Détails des Positions</h3>
                          <div className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full">{currentPortfolio.holdings?.length ?? 0} positions</div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50">
                                {["Instrument", "ISIN", "Catégorie", "Région", "Devise", "Poids"].map((h) => (
                                  <th key={h} className={cn("px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider", h === "Poids" && "text-right")}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(currentPortfolio.holdings ?? []).map((h, idx) => (
                                <tr key={h?.id ?? idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-8 py-5">
                                    <button onClick={() => setSelectedInstrument(h)} className="font-medium text-slate-900 hover:text-sky-600 hover:underline text-left">{h?.asset_name ?? "—"}</button>
                                  </td>
                                  <td className="px-8 py-5 text-xs font-mono text-slate-400">{h?.isin || "—"}</td>
                                  <td className="px-8 py-5">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">{h?.category ?? "—"}</span>
                                  </td>
                                  <td className="px-8 py-5 text-slate-600">{h?.region ?? "—"}</td>
                                  <td className="px-8 py-5 text-slate-500 text-sm">{h?.currency ?? "—"}</td>
                                  <td className="px-8 py-5 text-right font-bold text-slate-900">{h?.weight ?? 0}%</td>
                                </tr>
                              ))}
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
    </div>
  );
}
