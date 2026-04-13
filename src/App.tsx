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
  fetchBootstrap,
  fetchPortfolioDetails,
  saveManualOverride,
  deleteManualOverride,
  saveBreakdown,
  deleteBreakdown,
  saveCurrencyBreakdown,
  deleteCurrencyBreakdown,
  saveCreditBreakdown,
  deleteCreditBreakdown,
  saveDuration,
  deleteDuration,
  type DurationsMap,
  type BreakdownMap,
  type BreakdownEntry,
  type CurrencyBreakdownMap,
  type CurrencyBreakdownEntry,
  type CreditBreakdownMap,
  type CreditBreakdownEntry,
  type CreditType,
  CREDIT_TYPES,
  CREDIT_CURRENCIES,
  type BootstrapData,
} from "./services/api";
import { analyzePortfolio } from "./services/gemini";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const CURRENCY_COLORS: Record<string, string> = {
  EUR: "#0ea5e9",
  USD: "#10b981",
  JPY: "#f59e0b",
  Other: "#94a3b8",
};

const PORTFOLIO_ORDER = [
  "Sicav - SCV_BDS", "Sicav - SCV_LOW", "Sicav - SCV_ML", "Sicav - SCV_MED",
  "Sicav - SCV_MH", "Sicav - SCV_HIGH", "Sicav - SCV_VH",
  "Mixed - MIX_BDS", "Mixed - MIX_LOW", "Mixed - MIX_ML", "Mixed - MIX_MED",
  "Mixed - MIX_MH", "Mixed - MIX_HIGH", "Mixed - MIX_VH",
];

type Tab = "SYNTHESE" | "Sicav" | "Mixed" | "INSTRUMENTS" | "MANUALS" | "TARGET_GRID" | "DPAM";

const RISK_PROFILES = ["LOW", "MEDLOW", "MEDIUM", "MEDHIGH", "HIGH"] as const;
type RiskProfile = typeof RISK_PROFILES[number];

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

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto max-h-[75vh]">{children}</div>
      </motion.div>
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction?: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  return direction === "asc" ? <ChevronUp className="h-3 w-3 text-sky-600" /> : <ChevronDown className="h-3 w-3 text-sky-600" />;
}
// ── Types locaux ──────────────────────────────────────────────────────────────
type PortfolioType = "Sicav" | "Mixed";

const PROFILE_ORDER_ALL = ["BDS", "LOW", "ML", "MED", "MH", "HIGH", "VH"] as const;
type ProfileKey = typeof PROFILE_ORDER_ALL[number];

// Profils visibles par défaut (sans BDS et VH)
const PROFILE_DEFAULT_VISIBLE: ProfileKey[] = ["LOW", "ML", "MED", "MH", "HIGH"];

// Mapping nom portefeuille → profil
function portfolioToProfile(name: string): ProfileKey | null {
  if (name.includes("_BDS")) return "BDS";
  if (name.includes("_LOW")) return "LOW";
  if (name.includes("_ML")) return "ML";
  if (name.includes("_MED")) return "MED";
  if (name.includes("_MH")) return "MH";
  if (name.includes("_VH")) return "VH";
  if (name.includes("_HIGH")) return "HIGH";
  return null;
}

// Mapping profil portefeuille → profil target grid
const PROFILE_TO_TARGET: Partial<Record<ProfileKey, string>> = {
  LOW: "LOW", ML: "MEDLOW", MED: "MEDIUM", MH: "MEDHIGH", HIGH: "HIGH",
};

// Structure target grid (même que dans App)
const TG_STRUCTURE: { id: string; label: string; level: 0 | 1 | 2; parent?: string }[] = [
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
      { id: "fi_eur_gov_infl", label: "EUR Govies Infl. Linked", level: 2, parent: "fi_eur" },
      { id: "fi_eur_ig", label: "EUR IG Credit", level: 2, parent: "fi_eur" },
      { id: "fi_eur_hy", label: "EUR High Yield", level: 2, parent: "fi_eur" },
    { id: "fi_usd", label: "Bonds USD Exposure", level: 1, parent: "fixed_income" },
      { id: "fi_usd_gov", label: "USD Govies", level: 2, parent: "fi_usd" },
      { id: "fi_usd_gov_infl", label: "USD Govies Infl. Linked", level: 2, parent: "fi_usd" },
      { id: "fi_usd_ig", label: "USD IG Credit", level: 2, parent: "fi_usd" },
      { id: "fi_usd_hy", label: "USD High Yield", level: 2, parent: "fi_usd" },
    { id: "fi_em_local", label: "EM Debt (Local Currency)", level: 1, parent: "fixed_income" },
    { id: "fi_em_hard", label: "EM Debt (Hard Currency)", level: 1, parent: "fixed_income" },
    { id: "fi_global", label: "Global Fixed Income", level: 1, parent: "fixed_income" },
  { id: "short_term", label: "Short Term", level: 0 },
    { id: "st_eur", label: "EUR", level: 1, parent: "short_term" },
    { id: "st_usd", label: "USD", level: 1, parent: "short_term" },
    { id: "st_other", label: "Other FX", level: 1, parent: "short_term" },
];

// Lignes qui ont toujours — (pas de calcul possible)
const ALWAYS_DASH = new Set([
  "alt_conv", "alt_other",
  "fi_eur_gov_infl", "fi_usd_gov_infl",
  "fi_em_hard", "fi_global",
]);

// Calcule le poids d'une ligne du target grid dans un portefeuille donné
function computePtfWeight(
  gridId: string,
  holdings: any[],
  breakdowns: Record<string, any[]>,
  creditBreakdowns: Record<string, any[]>
): number | null {
  if (ALWAYS_DASH.has(gridId)) return null;

  const FI_CATS = ["Fixed Income", "Bonds"];

  const normalizeRegion = (r: string) => {
    if (["Europe", "Europe ex-Euroland", "Euroland"].includes(r)) return "Europe";
    if (["US", "North America"].includes(r)) return "US";
    if (["Emerging and Frontier Markets", "Emerging Markets"].includes(r)) return "EM";
    if (["Other"].includes(r)) return "Others";
    return r;
  };

  switch (gridId) {
    case "equities":
      return holdings.filter(h => h?.category === "Equities").reduce((s, h) => s + (h.weight ?? 0), 0);

    case "eq_europe": case "eq_us": case "eq_em": case "eq_japan": case "eq_other": {
      const regionMap: Record<string, string> = { eq_europe: "Europe", eq_us: "US", eq_em: "EM", eq_japan: "Japan", eq_other: "Others" };
      const targetRegion = regionMap[gridId];
      let total = 0;
      holdings.filter(h => h?.category === "Equities").forEach(h => {
        const bd = h.isin ? breakdowns[h.isin] : null;
        if (bd && bd.length > 0) {
          bd.forEach((e: any) => { if (normalizeRegion(e.region) === targetRegion) total += (h.weight ?? 0) * e.weight / 100; });
        } else {
          if (normalizeRegion(h.region ?? "") === targetRegion) total += h.weight ?? 0;
        }
      });
      return total;
    }

    case "alternatives":
      return holdings.filter(h => h?.category === "Alternatives" || h?.category === "Gold").reduce((s, h) => s + (h.weight ?? 0), 0);

    case "alt_gold":
      return holdings.filter(h => h?.category === "Gold").reduce((s, h) => s + (h.weight ?? 0), 0);

    case "fixed_income":
      return holdings.filter(h => FI_CATS.includes(h?.category ?? "")).reduce((s, h) => s + (h.weight ?? 0), 0);

    case "fi_eur": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.currency === "EUR").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_eur_gov": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.credit_type === "Govies" && e.currency === "EUR").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_eur_ig": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.credit_type === "IG" && e.currency === "EUR").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_eur_hy": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.credit_type === "HY" && e.currency === "EUR").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_usd": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.currency === "USD").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_usd_gov": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.credit_type === "Govies" && e.currency === "USD").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_usd_ig": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.credit_type === "IG" && e.currency === "USD").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_usd_hy": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.credit_type === "HY" && e.currency === "USD").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_em_local": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        if (cbd) cbd.filter((e: any) => e.credit_type === "EM Debt").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

case "short_term":
      return holdings.filter(h => ["Short Term", "Cash", "Liquidities"].includes(h?.category ?? "")).reduce((s, h) => s + (h.weight ?? 0), 0);

    case "st_eur":
      return holdings
        .filter(h => ["Short Term", "Cash", "Liquidities"].includes(h?.category ?? ""))
        .reduce((s, h) => (h.currency ?? "").toUpperCase() === "EUR" ? s + (h.weight ?? 0) : s, 0);

    case "st_usd":
      return holdings
        .filter(h => ["Short Term", "Cash", "Liquidities"].includes(h?.category ?? ""))
        .reduce((s, h) => (h.currency ?? "").toUpperCase() === "USD" ? s + (h.weight ?? 0) : s, 0);

    case "st_other":
      return holdings
        .filter(h => ["Short Term", "Cash", "Liquidities"].includes(h?.category ?? ""))
        .reduce((s, h) => !["EUR", "USD"].includes((h.currency ?? "").toUpperCase()) ? s + (h.weight ?? 0) : s, 0);
    default:
      return null;
  }
}

function BreakdownDeviationTable({
  allPortfolios,
  targetGridData,
  breakdowns,
  creditBreakdowns,
}: {
  allPortfolios: any[];
  targetGridData: Record<string, any>;
  breakdowns: Record<string, any[]>;
  creditBreakdowns: Record<string, any[]>;
}) {
  const [portfolioType, setPortfolioType] = React.useState<PortfolioType>("Sicav");
  const [showBDS, setShowBDS] = React.useState(false);
  const [showVH, setShowVH] = React.useState(false);
  const [collapsedRows, setCollapsedRows] = React.useState<Set<string>>(new Set());

  const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(" ");

  // Portefeuilles filtrés par type, triés par profil
  const portfoliosByProfile = React.useMemo(() => {
    const map: Partial<Record<ProfileKey, any>> = {};
    allPortfolios
      .filter(p => p?.type === portfolioType)
      .forEach(p => {
        const profile = portfolioToProfile(p.name ?? "");
        if (profile) map[profile] = p;
      });
    return map;
  }, [allPortfolios, portfolioType]);

  // Profils visibles selon les toggles
  const visibleProfiles = React.useMemo(() => {
    return PROFILE_ORDER_ALL.filter(p => {
      if (p === "BDS") return showBDS;
      if (p === "VH") return showVH;
      return PROFILE_DEFAULT_VISIBLE.includes(p);
    });
  }, [showBDS, showVH]);

  const fmt = (v: number | null) => v == null ? "—" : v.toFixed(1) + "%";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Dropdown type */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(["Sicav", "Mixed"] as PortfolioType[]).map(t => (
            <button key={t} onClick={() => setPortfolioType(t)}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                portfolioType === t ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {t}
            </button>
          ))}
        </div>

        {/* Toggle BDS */}
        <button onClick={() => setShowBDS(v => !v)}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
            showBDS ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300")}>
          {showBDS ? "← Masquer BDS" : "← Afficher BDS"}
        </button>

        {/* Toggle VH */}
        <button onClick={() => setShowVH(v => !v)}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
            showVH ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300")}>
          {showVH ? "Masquer VH →" : "Afficher VH →"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div style={{ transform: "rotateX(180deg)", overflowX: "auto" }} className="[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
  <div style={{ transform: "rotateX(180deg)" }}>
          <table className="w-full text-left border-collapse">
            <thead>
              {/* Row 1 : profils */}
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-[260px]">Catégorie</th>
                {visibleProfiles.map(profile => (
                  <th key={profile} colSpan={3}
                    className={cn("px-2 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-100",
                      profile === "BDS" ? "bg-slate-50" : "")}>
                    {profile}
                  </th>
                ))}
              </tr>
              {/* Row 2 : Target / Ptf / Active */}
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-6 py-2 sticky left-0 bg-slate-50/30 z-10" />
                {visibleProfiles.map(profile => (
                  ["Target", "Ptf", "Active"].map(col => (
                    <th key={`${profile}-${col}`}
                      className={cn(
                        "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-center min-w-[68px]",
                        col === "Target" && "border-l border-slate-100 text-emerald-600 bg-emerald-50/40",
                        col === "Ptf" && "text-sky-600",
                        col === "Active" && "text-violet-500",
                      )}>
                      {col}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {TG_STRUCTURE.map(row => {
                // Gestion collapse
                if (row.parent && collapsedRows.has(row.parent)) return null;
                if (row.level === 2 && row.parent) {
                  const grandParent = TG_STRUCTURE.find(r => r.id === row.parent)?.parent;
                  if (grandParent && collapsedRows.has(grandParent)) return null;
                }

                const isCollapsed = collapsedRows.has(row.id);
                const hasChildren = TG_STRUCTURE.some(r => r.parent === row.id);
                const bgColor = row.level === 0 ? "bg-slate-800" : row.level === 1 ? "bg-slate-50/80" : "bg-white";
                const textColor = row.level === 0 ? "text-white" : "text-slate-900";
                const indent = row.level === 1 ? "pl-10" : row.level === 2 ? "pl-16" : "pl-6";

                return (
                  <tr key={row.id} className={cn("transition-colors", row.level === 0 ? bgColor : "hover:bg-slate-50/50")}>
                    {/* Label */}
                    <td className={cn("px-6 py-3 sticky left-0 z-10 font-medium", bgColor, textColor, indent)}>
                      <div className="flex items-center gap-2">
                        {hasChildren && (
                          <button
                            onClick={() => setCollapsedRows(prev => {
                              const next = new Set(prev);
                              next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                              return next;
                            })}
                            className={cn("p-0.5 rounded transition-colors", row.level === 0 ? "hover:bg-white/20" : "hover:bg-slate-200")}>
                            {isCollapsed
                              ? <ChevronRight className={cn("h-3.5 w-3.5", row.level === 0 ? "text-white/70" : "text-slate-400")} />
                              : <ChevronDown className={cn("h-3.5 w-3.5", row.level === 0 ? "text-white/70" : "text-slate-400")} />}
                          </button>
                        )}
                        <span className={cn(
                          row.level === 0 ? "text-sm font-bold tracking-wide uppercase" :
                          row.level === 1 ? "text-sm font-semibold" : "text-xs text-slate-600"
                        )}>{row.label}</span>
                      </div>
                    </td>

                    {/* Colonnes par profil */}
                    {visibleProfiles.map(profile => {
                      const ptf = portfoliosByProfile[profile];
                      const targetProfileKey = PROFILE_TO_TARGET[profile];

                      // Target depuis target grid
                      const targetVal = targetProfileKey
                        ? targetGridData[row.id]?.[targetProfileKey]?.target ?? null
                        : null;

                      // Ptf calculé
                      const ptfVal = ptf
                        ? computePtfWeight(row.id, ptf.holdings ?? [], breakdowns, creditBreakdowns)
                        : null;

                      // Active = Ptf - Target
                      const activeVal = ptfVal != null && targetVal != null
                        ? +(ptfVal - targetVal).toFixed(1)
                        : null;

                      const isPos = (activeVal ?? 0) > 0;
                      const isNeg = (activeVal ?? 0) < 0;

                      return ["Target", "Ptf", "Active"].map(col => {
                        let displayVal: number | null = null;
                        if (col === "Target") displayVal = targetVal;
                        if (col === "Ptf") displayVal = ptfVal;
                        if (col === "Active") displayVal = activeVal;

                        return (
                          <td key={`${profile}-${col}`}
                            className={cn(
                              "px-3 py-3 text-right text-xs font-medium min-w-[68px]",
                              col === "Target" && "border-l border-slate-100 bg-emerald-50/40",
                              row.level === 0
                                ? "text-white/80"
                                : col === "Active"
                                  ? (isPos ? "text-emerald-600 font-bold" : isNeg ? "text-rose-600 font-bold" : "text-slate-400")
                                  : col === "Ptf"
                                    ? "text-sky-700 font-medium"
                                    : "text-slate-600"
                            )}>
                            {displayVal != null ? displayVal.toFixed(1) + "%" : "—"}
                          </td>
                        );
                      });
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}
 
type DpamView = "Bonds" | "Equity";
 
const RATING_COLORS: Record<string, string> = {
  IG: "#10b981",
  HY: "#f59e0b",
  Others: "#94a3b8",
};
 
const CUR_COLORS: Record<string, string> = {
  EUR: "#0ea5e9",
  USD: "#10b981",
  JPY: "#f59e0b",
  Other: "#94a3b8",
};
 
function DpamTab({
  bondsData,
  onUpload,
  uploading,
  uploadSuccess,
}: {
  bondsData: any | null;
  onUpload: (file: File) => void;
  uploading: boolean;
  uploadSuccess: boolean;
}) {
  const [view, setView] = React.useState<DpamView>("Bonds");
  const [selectedCol, setSelectedCol] = React.useState<number | null>(null);
 
  // Quand bondsData change, sélectionner le premier instrument par défaut
  React.useEffect(() => {
    if (bondsData?.instruments?.length > 0 && selectedCol === null) {
      const first = bondsData.instruments.find((i: any) => !i.is_hedged);
      if (first) setSelectedCol(first.col_index);
    }
  }, [bondsData]);
 
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };
 
  // Données pour l'instrument sélectionné
  const selGlobal = bondsData?.globals?.find((g: any) => g.instrument_col === selectedCol);
  const selRating = bondsData?.ratings?.find((r: any) => r.instrument_col === selectedCol);
  const selCurrency = bondsData?.currencies?.find((c: any) => c.instrument_col === selectedCol);
  const selCountries = (bondsData?.countries ?? [])
    .filter((c: any) => c.instrument_col === selectedCol && (c.weight ?? 0) > 0.001)
    .sort((a: any, b: any) => (b.weight ?? 0) - (a.weight ?? 0));
  const selSectors = (bondsData?.sectors ?? [])
    .filter((s: any) => s.instrument_col === selectedCol && (s.weight ?? 0) > 0.001)
    .sort((a: any, b: any) => (b.weight ?? 0) - (a.weight ?? 0));
 
  const selInstrument = bondsData?.instruments?.find((i: any) => i.col_index === selectedCol);
 
  const fmtNum = (v: number | null, dec = 2) => v != null ? v.toFixed(dec) : "—";
  const fmtPct = (v: number | null) => v != null ? v.toFixed(1) + "%" : "—";
 
  // Vue résumé multi-colonnes : uniquement les instruments non-hedged
  const mainInstruments = (bondsData?.instruments ?? []).filter((i: any) => !i.is_hedged);
 
  return (
    <div className="space-y-8">
      {/* ── Header + Switch view ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">DPAM Fund Analysis</h2>
          <p className="text-slate-500">Analyse détaillée des fonds DPAM.</p>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(["Bonds", "Equity"] as DpamView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all",
                view === v ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {v}
            </button>
          ))}
        </div>
      </div>
 
      {/* ── 3 cases import (fixes, visibles sur les deux vues) ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Case import */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Importer un fichier</p>
          <label className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-5 hover:border-sky-400 transition-all group cursor-pointer gap-2">
            <input type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
            <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-sky-50 transition-colors">
              <Upload className="h-5 w-5 text-slate-400 group-hover:text-sky-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 text-center leading-tight">Equity / Bonds<br/>Funds Summary</p>
            {uploading
              ? <div className="flex items-center gap-1.5 bg-sky-50 px-2.5 py-1 rounded-lg"><Loader2 className="h-3.5 w-3.5 text-sky-600 animate-spin" /><span className="text-xs font-bold text-sky-700">Import…</span></div>
              : uploadSuccess
                ? <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-bold text-emerald-700">Succès !</span></div>
                : <p className="text-[10px] text-slate-400 uppercase font-bold bg-slate-50 px-2.5 py-1 rounded-lg">XLSX</p>
            }
          </label>
        </div>
 
        {/* Case Equity */}
        <div className={cn("bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-2", false ? "border-slate-100" : "border-slate-100 opacity-60")}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Equity Funds Summary</p>
          </div>
          <p className="text-xs text-slate-300 italic">Aucun import</p>
        </div>
 
        {/* Case Bonds */}
        <div className={cn("bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-2", bondsData ? "border-slate-100" : "border-slate-100 opacity-60")}>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", bondsData ? "bg-emerald-400" : "bg-slate-200")} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bonds Funds Summary</p>
          </div>
          {bondsData ? (
            <>
              <p className="text-xs font-bold text-slate-800 truncate" title={bondsData.importLog.filename}>
                {bondsData.importLog.filename}
              </p>
              <p className="text-[10px] text-slate-400">
                {new Date(bondsData.importLog.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                {" "}{new Date(bondsData.importLog.imported_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-300 italic">Aucun import</p>
          )}
        </div>
      </div>
 
      {/* ── VUE BONDS ── */}
      {view === "Bonds" && (
        <>
          {!bondsData ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
              <TableIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Aucune donnée. Importez un fichier Bonds Funds Summary.</p>
            </div>
          ) : (
            <>
              {/* ── Selector instrument ── */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Fonds</span>
                <div className="flex flex-wrap gap-2 flex-1">
                  {mainInstruments.map((inst: any) => (
                    <button key={inst.col_index}
                      onClick={() => setSelectedCol(inst.col_index)}
                      className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                        selectedCol === inst.col_index
                          ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-sky-300")}>
                      {inst.name.replace("DPAM B BONDS ", "").replace("DPAM L BONDS ", "")}
                    </button>
                  ))}
                </div>
              </div>
 
              {/* ── Fiche détail instrument sélectionné ── */}
              {selectedCol && selInstrument && (
                <div className="space-y-6">
                  {/* Nom + badges */}
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900">{selInstrument.name}</h3>
                    {selInstrument.category && (
                      <span className="bg-sky-100 text-sky-700 text-xs font-bold px-2.5 py-1 rounded-full">{selInstrument.category}</span>
                    )}
                    {selInstrument.currency && (
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{selInstrument.currency}</span>
                    )}
                  </div>
 
                  {/* ── KPI globaux (8 cards) ── */}
                  {selGlobal && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Market Value", value: selGlobal.market_value != null ? fmtNum(selGlobal.market_value, 0) + " M€" : "—" },
                        { label: "Nb Holdings", value: selGlobal.nb_holdings ?? "—" },
                        { label: "Maturity", value: selGlobal.maturity != null ? fmtNum(selGlobal.maturity) + " ans" : "—" },
                        { label: "YTW", value: fmtPct(selGlobal.ytw) },
                        { label: "YTW Duration Weighted", value: fmtPct(selGlobal.ytw_duration_weighted) },
                        { label: "Modified Duration", value: selGlobal.modified_duration != null ? fmtNum(selGlobal.modified_duration) + "%" : "—" },
                        { label: "Duration", value: selGlobal.duration != null ? fmtNum(selGlobal.duration) + " ans" : "—" },
                        { label: "Average Rating", value: selGlobal.average_rating ?? "—" },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                          <p className="text-lg font-bold text-slate-900">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
 
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Ratings ── */}
                    {selRating && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="text-base font-bold text-slate-900 mb-4">Ratings</h4>
                        <div className="space-y-3">
                          {[
                            { label: "Investment Grade", value: selRating.ig, color: RATING_COLORS.IG },
                            { label: "High Yield", value: selRating.hy, color: RATING_COLORS.HY },
                            { label: "Others / Cash", value: selRating.others, color: RATING_COLORS.Others },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="flex items-center gap-3">
                              <span className="text-xs font-bold w-36 shrink-0 text-slate-600">{label}</span>
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, value ?? 0)}%`, backgroundColor: color }} />
                              </div>
                              <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{fmtPct(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
 
                    {/* ── Devises ── */}
                    {selCurrency && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="text-base font-bold text-slate-900 mb-4">Exposition Devises</h4>
                        <div className="space-y-3">
                          {[
                            { label: "EUR", value: selCurrency.eur },
                            { label: "USD", value: selCurrency.usd },
                            { label: "JPY", value: selCurrency.jpy },
                            { label: "Other", value: selCurrency.other },
                          ].filter(({ value }) => (value ?? 0) > 0.05).map(({ label, value }) => (
                            <div key={label} className="flex items-center gap-3">
                              <span className="text-xs font-bold w-10 shrink-0" style={{ color: CUR_COLORS[label] ?? "#94a3b8" }}>{label}</span>
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, value ?? 0)}%`, backgroundColor: CUR_COLORS[label] ?? "#94a3b8" }} />
                              </div>
                              <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{fmtPct(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
 
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Pays ── */}
                    {selCountries.length > 0 && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="text-base font-bold text-slate-900 mb-4">Exposition par Pays</h4>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {selCountries.map(({ country, weight }: any) => (
                            <div key={country} className="flex items-center gap-3">
                              <span className="text-xs text-slate-600 w-36 shrink-0 truncate">{country}</span>
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-sky-400 transition-all"
                                  style={{ width: `${Math.min(100, weight ?? 0)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{fmtPct(weight)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
 
                    {/* ── Secteurs ── */}
                    {selSectors.length > 0 && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="text-base font-bold text-slate-900 mb-4">Exposition par Secteur</h4>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {selSectors.map(({ sector, weight }: any) => (
                            <div key={sector} className="flex items-center gap-3">
                              <span className="text-xs text-slate-600 w-40 shrink-0 truncate">{sector}</span>
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-violet-400 transition-all"
                                  style={{ width: `${Math.min(100, weight ?? 0)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{fmtPct(weight)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
 
              {/* ── Vue résumé multi-colonnes ── */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Vue Résumé — Tous les fonds</h3>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div style={{ transform: "rotateX(180deg)", overflowX: "auto" }}
                    className="[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div style={{ transform: "rotateX(180deg)" }}>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-800">
                            <th className="px-4 py-3 text-xs font-bold text-white/70 uppercase tracking-wider sticky left-0 bg-slate-800 z-10 min-w-[200px]">Métrique</th>
                            {mainInstruments.map((inst: any) => (
                              <th key={inst.col_index}
                                className="px-3 py-3 text-[10px] font-bold text-white/70 uppercase tracking-wider text-center min-w-[120px] cursor-pointer hover:text-white transition-colors"
                                onClick={() => setSelectedCol(inst.col_index)}>
                                {inst.name.replace("DPAM B BONDS ", "").replace("DPAM L BONDS ", "")}
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-slate-700">
                            <td className="px-4 py-1.5 sticky left-0 bg-slate-700 z-10" />
                            {mainInstruments.map((inst: any) => (
                              <td key={inst.col_index} className="px-3 py-1.5 text-center">
                                <span className="text-[9px] font-bold text-slate-300">{inst.category ?? "—"}</span>
                              </td>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {/* KPI rows */}
                          {[
                            { label: "Market Value (M€)", key: "market_value", fmt: (v: number) => fmtNum(v, 0) },
                            { label: "Nb Holdings", key: "nb_holdings", fmt: (v: number) => String(Math.round(v)) },
                            { label: "Maturity (ans)", key: "maturity", fmt: (v: number) => fmtNum(v) },
                            { label: "YTW (%)", key: "ytw", fmt: (v: number) => fmtPct(v) },
                            { label: "YTW Duration Weighted (%)", key: "ytw_duration_weighted", fmt: (v: number) => fmtPct(v) },
                            { label: "Modified Duration (%)", key: "modified_duration", fmt: (v: number) => fmtNum(v) + "%" },
                            { label: "Duration (ans)", key: "duration", fmt: (v: number) => fmtNum(v) },
                            { label: "Average Rating", key: "average_rating", fmt: (v: any) => String(v) },
                          ].map(({ label, key, fmt }) => (
                            <tr key={key} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white hover:bg-slate-50/50 z-10">{label}</td>
                              {mainInstruments.map((inst: any) => {
                                const g = bondsData.globals?.find((g: any) => g.instrument_col === inst.col_index);
                                const val = g?.[key];
                                return (
                                  <td key={inst.col_index} className="px-3 py-2.5 text-center text-slate-600">
                                    {val != null ? fmt(val) : "—"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {/* Separator */}
                          <tr className="bg-slate-100">
                            <td className="px-4 py-1.5 font-bold text-xs text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-100 z-10">Ratings</td>
                            {mainInstruments.map((inst: any) => <td key={inst.col_index} />)}
                          </tr>
                          {[
                            { label: "Investment Grade (%)", key: "ig" },
                            { label: "High Yield (%)", key: "hy" },
                            { label: "Others (%)", key: "others" },
                          ].map(({ label, key }) => (
                            <tr key={key} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white hover:bg-slate-50/50 z-10">{label}</td>
                              {mainInstruments.map((inst: any) => {
                                const r = bondsData.ratings?.find((r: any) => r.instrument_col === inst.col_index);
                                const val = r?.[key];
                                return <td key={inst.col_index} className="px-3 py-2.5 text-center text-slate-600">{val != null ? fmtPct(val) : "—"}</td>;
                              })}
                            </tr>
                          ))}
                          {/* Separator */}
                          <tr className="bg-slate-100">
                            <td className="px-4 py-1.5 font-bold text-xs text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-100 z-10">Devises</td>
                            {mainInstruments.map((inst: any) => <td key={inst.col_index} />)}
                          </tr>
                          {[
                            { label: "EUR (%)", key: "eur" },
                            { label: "USD (%)", key: "usd" },
                            { label: "JPY (%)", key: "jpy" },
                            { label: "Other (%)", key: "other" },
                          ].map(({ label, key }) => (
                            <tr key={key} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white hover:bg-slate-50/50 z-10">{label}</td>
                              {mainInstruments.map((inst: any) => {
                                const c = bondsData.currencies?.find((c: any) => c.instrument_col === inst.col_index);
                                const val = c?.[key];
                                return <td key={inst.col_index} className="px-3 py-2.5 text-center text-slate-600">{val != null ? fmtPct(val) : "—"}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
 
      {/* ── VUE EQUITY ── */}
      {view === "Equity" && (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
          <p className="text-lg">Vue Equity — à venir.</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("SYNTHESE");
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
  const [drillDownFilter, setDrillDownFilter] = useState<{ type: "category" | "region" | "currency"; value: string } | null>(null);
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
  const [holdingsSortConfig, setHoldingsSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: "weight", direction: "desc" });
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
  const [currencyBreakdowns, setCurrencyBreakdowns] = useState<CurrencyBreakdownMap>({});
  const [editingCurrencyBreakdown, setEditingCurrencyBreakdown] = useState<{ isin: string; name: string; rows: CurrencyBreakdownEntry[] } | null>(null);
  const [currencyBreakdownSaving, setCurrencyBreakdownSaving] = useState(false);
  const [creditBreakdowns, setCreditBreakdowns] = useState<CreditBreakdownMap>({});
  const [editingCreditBreakdown, setEditingCreditBreakdown] = useState<{ isin: string; name: string } | null>(null);
  const [creditBreakdownSaving, setCreditBreakdownSaving] = useState(false);
  const [durations, setDurations] = useState<DurationsMap>({});
  const [showDurationDetail, setShowDurationDetail] = useState(false);
  const [showCurrencyDetail, setShowCurrencyDetail] = useState<string | null>(null);
  const [dpamBondsData, setDpamBondsData] = useState<any>(null);
  const [dpamUploading, setDpamUploading] = useState(false);
  const [dpamUploadSuccess, setDpamUploadSuccess] = useState(false);
  
  async function safeArray<T>(fn: () => Promise<T[]>): Promise<T[]> {
    try {
      const r = await fn();
      return Array.isArray(r) ? r : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  const loadTargetGrid = async () => {
    try {
      const res = await fetch("/api/target-grid");
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") setTargetGridData(data);
      }
    } catch (e) { console.warn("Could not load target grid", e); }
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

useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const data = await fetchBootstrap();
      if (!data) throw new Error("Bootstrap failed");

      const allP = data.portfolios ?? [];
      setAllPortfolios(allP);
      setPortfolios(allP);
      setManualOverrides(data.overrides ?? []);
      setBreakdowns(data.breakdowns ?? {});
      setCurrencyBreakdowns(data.currencyBreakdowns ?? {});
      setCreditBreakdowns(data.creditBreakdowns ?? {});
      setDurations(data.durations ?? {});
            try {
        const dpamRes = await fetch("/api/dpam-data");
        if (dpamRes.ok) {
          const dpam = await dpamRes.json();
          if (dpam.bonds) setDpamBondsData(dpam.bonds);
        }
      } catch (e) { console.warn("DPAM load failed", e); }
      setImportLog(data.importLog);
      setTargetGridData(data.targetGrid ?? {});

      const scv = allP
        .filter((p) => p?.type === "Sicav")
        .sort((a, b) => (PORTFOLIO_ORDER.indexOf(a.name) === -1 ? 999 : PORTFOLIO_ORDER.indexOf(a.name)) - (PORTFOLIO_ORDER.indexOf(b.name) === -1 ? 999 : PORTFOLIO_ORDER.indexOf(b.name)));
      const defaultSicav = scv.find((p) => p.name?.includes("_MED")) ?? scv[0];
      if (defaultSicav?.id != null) setSelectedId(defaultSicav.id);
    } catch (e) {
      console.error("Bootstrap failed", e);
      setErrorMsg("Erreur lors du chargement initial.");
    } finally {
      setLoading(false);
    }
  })();
}, []);

useEffect(() => {
  if (selectedId == null) return;
  setAnalysis(null);
  setDrillDownFilter(null);
  setHoldingsSearch("");
  setHoldingsSortConfig({ key: "weight", direction: "desc" });
  const current = allPortfolios.find(p => p.id === selectedId) ?? null;
  setCurrentPortfolio(current);
}, [selectedId, allPortfolios]);

  useEffect(() => {
    if (activeTab !== "Sicav" && activeTab !== "Mixed") return;
    const filtered = portfolios
      .filter((p) => p?.type === activeTab)
      .sort((a, b) => (PORTFOLIO_ORDER.indexOf(a.name) === -1 ? 999 : PORTFOLIO_ORDER.indexOf(a.name)) - (PORTFOLIO_ORDER.indexOf(b.name) === -1 ? 999 : PORTFOLIO_ORDER.indexOf(b.name)));
    if (filtered.length > 0 && !filtered.some((p) => p.id === selectedId)) {
      const defaultP = filtered.find((p) => p.name?.includes("_MED")) ?? filtered[0];
      setSelectedId(defaultP.id);
    }
  }, [activeTab, portfolios]);

const refreshData = async () => {
  try {
    const data = await fetchBootstrap();
    if (!data) return;
    const allP = data.portfolios ?? [];
    setAllPortfolios(allP);
    setPortfolios(allP);
    setManualOverrides(data.overrides ?? []);
    setBreakdowns(data.breakdowns ?? {});
    setCurrencyBreakdowns(data.currencyBreakdowns ?? {});
    setCreditBreakdowns(data.creditBreakdowns ?? {});
    setDurations(data.durations ?? {});
          try {
        const dpamRes = await fetch("/api/dpam-data");
        if (dpamRes.ok) {
          const dpam = await dpamRes.json();
          if (dpam.bonds) setDpamBondsData(dpam.bonds);
        }
      } catch (e) { console.warn("DPAM load failed", e); }
    setImportLog(data.importLog);
    setTargetGridData(data.targetGrid ?? {});
    if (selectedId != null) {
      const current = allP.find(p => p.id === selectedId) ?? null;
      setCurrentPortfolio(current);
    }
  } catch (e) { console.error("Refresh failed", e); }
};

  const handleAnalyze = async () => {
    if (!currentPortfolio || analyzing) return;
    setAnalyzing(true);
    try {
      const result = await analyzePortfolio(currentPortfolio, modelGrid);
      setAnalysis(result);
    } catch (e) { setErrorMsg("Erreur lors de l'analyse IA."); }
    finally { setAnalyzing(false); }
  };

  const handleSaveOverride = async () => {
    if (!editingOverride) return;
    try {
      await saveManualOverride(editingOverride);
      setEditingOverride(null);
      await refreshData();
    } catch (e) { setErrorMsg("Erreur lors de la sauvegarde."); }
  };
  
const handleDpamUpload = async (file: File) => {
    setDpamUploading(true);
    setDpamUploadSuccess(false);
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs" as any);
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      const r = (row: number, col: number) => raw[row - 1]?.[col - 1] ?? null;
      const toNum = (v: any) => (v != null && !isNaN(Number(v)) ? Number(v) : null);

      const isBonds = file.name.toLowerCase().startsWith("bonds funds summary");
      const isEquity = file.name.toLowerCase().startsWith("equity funds summary");

      if (!isBonds && !isEquity) {
        setErrorMsg("Le fichier doit commencer par 'Bonds Funds Summary' ou 'Equity Funds Summary'");
        return;
      }

      if (isBonds) {
        const instruments = [];
        for (let col = 2; col <= 29; col++) {
          const name = r(4, col);
          if (!name) continue;
          const cat5 = r(5, col);
          const isHedged = cat5 === "HEDGED PARTS" || (col >= 26 && !r(5, col));
          instruments.push({
            colIndex: col,
            name: String(name),
            category: isHedged ? null : (cat5 ? String(cat5) : null),
            currency: r(6, col) ? String(r(6, col)) : null,
            isHedged,
          });
        }

        const globals = instruments.map(inst => ({
          colIndex: inst.colIndex,
          marketValue: toNum(r(8, inst.colIndex)),
          nbHoldings: toNum(r(9, inst.colIndex)),
          maturity: toNum(r(10, inst.colIndex)),
          ytw: toNum(r(11, inst.colIndex)),
          ytwDurationWeighted: toNum(r(12, inst.colIndex)),
          modifiedDuration: toNum(r(13, inst.colIndex)),
          duration: toNum(r(14, inst.colIndex)),
          averageRating: r(15, inst.colIndex) ? String(r(15, inst.colIndex)) : null,
        }));

        const ratings = instruments.map(inst => ({
          colIndex: inst.colIndex,
          ig: toNum(r(17, inst.colIndex)),
          hy: toNum(r(28, inst.colIndex)),
          others: toNum(r(38, inst.colIndex)),
        }));

        const currencies = instruments.map(inst => {
          const eur = toNum(r(52, inst.colIndex));
          const usd = toNum(r(58, inst.colIndex));
          const jpy = toNum(r(60, inst.colIndex));
          const other = Math.max(0, 100 - (eur ?? 0) - (usd ?? 0) - (jpy ?? 0));
          return { colIndex: inst.colIndex, eur, usd, jpy, other: +other.toFixed(2) };
        });

        const countries = [];
        for (let row = 91; row <= 145; row++) {
          const country = r(row, 1);
          if (!country) continue;
          for (const inst of instruments) {
            const w = toNum(r(row, inst.colIndex));
            countries.push({ colIndex: inst.colIndex, country: String(country), weight: w });
          }
        }

        const sectors = [];
        for (let row = 147; row <= 178; row++) {
          const sector = r(row, 1);
          if (!sector) continue;
          for (const inst of instruments) {
            const w = toNum(r(row, inst.colIndex));
            sectors.push({ colIndex: inst.colIndex, sector: String(sector), weight: w });
          }
        }

        const res = await fetch("/api/dpam-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "bonds",
            filename: file.name,
            parsed: { instruments, globals, ratings, currencies, countries, sectors },
          }),
        });

        if (res.ok) {
          const fresh = await fetch("/api/dpam-data");
          if (fresh.ok) {
            const dpam = await fresh.json();
            if (dpam.bonds) setDpamBondsData(dpam.bonds);
          }
          setDpamUploadSuccess(true);
          setTimeout(() => setDpamUploadSuccess(false), 3000);
        } else {
          setErrorMsg("Erreur upload DPAM Bonds: " + await res.text());
        }
      }
    } catch (e) {
      setErrorMsg("Erreur lors du traitement du fichier DPAM.");
    } finally {
      setDpamUploading(false);
    }
  };
  const handleDeleteOverride = async (id: number) => {
    try { await deleteManualOverride(id); await refreshData(); }
    catch (e) { setErrorMsg("Erreur lors de la suppression."); }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) { if (prev.direction === "asc") return { key, direction: "desc" }; return null; }
      return { key, direction: "asc" };
    });
  };

  const handleHoldingsSort = (key: string) => {
    setHoldingsSortConfig((prev) => {
      if (prev?.key === key) { if (prev.direction === "asc") return { key, direction: "desc" }; return null; }
      return { key, direction: "asc" };
    });
  };

  const saveImportLog = async (filename: string) => {
    try {
      await fetch("/api/import-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename }) });
      const logCheck = await fetch("/api/import-log");
      if (logCheck.ok) { const log = await logCheck.json(); if (log) setImportLog(log); }
    } catch (e) { console.warn("Could not save import log", e); }
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
        const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs" as any);
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        const PROFILE_COLS: Record<string, [number, number, number]> = {
          LOW: [2, 4, 6], MEDLOW: [9, 11, 13], MEDIUM: [17, 19, 21], MEDHIGH: [24, 26, 28], HIGH: [31, 33, 35],
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
        const res = await fetch("/api/target-grid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
        if (res.ok) {
          setUploadSuccess(true);
          await saveImportLog(file.name);
          await loadTargetGrid();
          setActiveTab("TARGET_GRID");
          setTimeout(() => setUploadSuccess(false), 3000);
        } else {
          setErrorMsg("Erreur upload Target Grid: " + await res.text());
        }
      } else {
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
              const res = await fetch("/api/upload-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portfolios: Array.from(map.values()) }) });
              if (res.ok) {
                setUploadSuccess(true);
                await saveImportLog(file.name);
                await refreshData();
                setTimeout(() => setUploadSuccess(false), 3000);
              } else {
                setErrorMsg("Erreur upload: " + await res.text());
              }
            } catch (e) { setErrorMsg("Erreur lors du traitement du CSV."); }
            finally { setUploading(false); }
          },
        });
        return;
      }
    } catch (e) { setErrorMsg("Erreur lors du traitement du fichier."); }
    finally { setUploading(false); }
  };

  function normalizeRegion(region: string): string {
    const r = region?.trim() ?? "Other";
    if (["Europe", "Europe ex-Euroland", "Euroland"].includes(r)) return "Europe";
    if (["US", "North America"].includes(r)) return "US";
    if (["Emerging and Frontier Markets", "Emerging Markets"].includes(r)) return "EM";
    if (["Other"].includes(r)) return "Others";
    return r;
  }

  function detectRiskProfile(portfolioName: string | null | undefined): RiskProfile | null {
    if (!portfolioName) return null;
    if (portfolioName.includes("_LOW")) return "LOW";
    if (portfolioName.includes("_ML")) return "MEDLOW";
    if (portfolioName.includes("_MED")) return "MEDIUM";
    if (portfolioName.includes("_MH")) return "MEDHIGH";
    if (portfolioName.includes("_HIGH")) return "HIGH";
    return null;
  }

  const REGION_TO_GRID: Record<string, string> = {
    "Europe": "eq_europe", "US": "eq_us", "EM": "eq_em", "Japan": "eq_japan", "Others": "eq_other",
  };

  const CATEGORY_TO_GRID: Record<string, string> = {
    "Equities": "equities",
    "Fixed Income": "fixed_income", "Bonds": "fixed_income",
    "Alternatives": "alternatives", "Gold": "alternatives",
    "Short Term": "short_term", "Cash": "short_term", "Liquidities": "short_term",
  };

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

  function hasManualOverride(h: Holding | null): boolean {
    if (!h) return false;
    return manualOverrides.some(
      (ov) =>
        (ov.manual_isin && ov.manual_isin === h.isin) ||
        (ov.original_asset_name && ov.original_asset_name === (h.original_asset_name ?? h.asset_name))
    );
  }

  function hasLookThrough(h: Holding | null): boolean {
    if (!h?.isin) return false;
    return (breakdowns[h.isin]?.length ?? 0) > 0;
  }

  function hasCurrencyBreakdown(h: Holding | null): boolean {
    if (!h?.isin) return false;
    return (currencyBreakdowns[h.isin]?.length ?? 0) > 0;
  }
  
  function hasCreditBreakdown(h: Holding | null): boolean {
  if (!h?.isin) return false;
  return (creditBreakdowns[h.isin]?.length ?? 0) > 0;
}
  function isHedged(h: Holding | null): boolean {
  if (!h) return false;
  return manualOverrides.some(
    ov => ((ov.manual_isin && ov.manual_isin === h.isin) ||
    (ov.original_asset_name && ov.original_asset_name === (h.original_asset_name ?? h.asset_name)))
    && ov.is_hedged === true
  );
}
  
  // ── Derived data ───────────────────────────────────────────────────────────

  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    (currentPortfolio?.holdings ?? []).forEach((h) => {
      if (!h?.category) return;
      m.set(h.category, (m.get(h.category) ?? 0) + (h.weight ?? 0));
    });
    const profile = detectRiskProfile(currentPortfolio?.name);
    return Array.from(m.entries()).map(([name, value]) => {
      const gridId = CATEGORY_TO_GRID[name];
      const target = profile && gridId ? targetGridData[gridId]?.[profile]?.["target"] ?? null : null;
      return { name, value: +value.toFixed(1), target };
    });
  }, [currentPortfolio, targetGridData]);

  const regionData = useMemo(() => {
    const m = new Map<string, number>();
    const equityHoldings = (currentPortfolio?.holdings ?? []).filter(h => h?.category === "Equities");
    applyLookThrough(equityHoldings).forEach(({ region, weight }) => {
      if (normalizeRegion(region) === "Cash") return;
      m.set(region, (m.get(region) ?? 0) + weight);
    });
    const profile = detectRiskProfile(currentPortfolio?.name);
    return Array.from(m.entries()).map(([name, value]) => {
      const gridId = REGION_TO_GRID[name];
      const target = profile && gridId ? targetGridData[gridId]?.[profile]?.["target"] ?? null : null;
      return { name, value: +value.toFixed(1), target };
    });
  }, [currentPortfolio, breakdowns, targetGridData]);

  const currencyData = useMemo(() => {
    const KEY_CURRENCIES = ["EUR", "USD", "JPY"];
    const m = new Map<string, number>();
    (currentPortfolio?.holdings ?? []).forEach((h) => {
      if (!h) return;
      const cbd = h.isin ? currencyBreakdowns[h.isin] : null;
      if (cbd && cbd.length > 0) {
        for (const entry of cbd) {
          const cur = entry.currency.toUpperCase().trim();
          m.set(cur, (m.get(cur) ?? 0) + (h.weight ?? 0) * entry.weight / 100);
        }
} else {
  const hedged = manualOverrides.some(
    ov => ((ov.manual_isin && ov.manual_isin === h.isin) ||
    (ov.original_asset_name && ov.original_asset_name === (h.original_asset_name ?? h.asset_name)))
    && ov.is_hedged === true
  );
  const cur = hedged ? "EUR" : (h.currency ?? "Other").toUpperCase().trim();
  m.set(cur, (m.get(cur) ?? 0) + (h.weight ?? 0));
}
    });
    const result: { label: string; value: number }[] = [];
    let other = 0;
    m.forEach((weight, cur) => {
      if (KEY_CURRENCIES.includes(cur)) {
        result.push({ label: cur, value: +weight.toFixed(1) });
      } else {
        other += weight;
      }
    });
    if (other > 0.05) result.push({ label: "Other", value: +other.toFixed(1) });
    const order = ["EUR", "USD", "JPY", "Other"];
    return result.sort((a, b) => {
      const ai = order.indexOf(a.label);
      const bi = order.indexOf(b.label);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [currentPortfolio, currencyBreakdowns]);

 // ── Credit exposure — agrégation par credit_type sur tout le portefeuille ──
  const creditData = useMemo(() => {
    const FIXED_INCOME_CATS = ["Fixed Income", "Bonds"];
    const m = new Map<string, number>();
    (currentPortfolio?.holdings ?? []).forEach((h) => {
      if (!h || !FIXED_INCOME_CATS.includes(h.category ?? "")) return;
      const cbd = h.isin ? creditBreakdowns[h.isin] : null;
      if (cbd && cbd.length > 0) {
        for (const entry of cbd) {
          m.set(entry.credit_type, (m.get(entry.credit_type) ?? 0) + (h.weight ?? 0) * entry.weight / 100);
        }
      }
    });
    const order: CreditType[] = ["Govies", "IG", "HY", "NR", "EM Debt"];
    return order
      .filter(ct => (m.get(ct) ?? 0) > 0.01)
      .map(ct => ({ name: ct, value: +((m.get(ct) ?? 0).toFixed(1)) }));
  }, [currentPortfolio, creditBreakdowns]);

const portfolioDuration = useMemo(() => {
  const FIXED_INCOME_CATS = ["Fixed Income", "Bonds", "Liquidities"];
const fiHoldings = (currentPortfolio?.holdings ?? []).filter(h =>
  h && FIXED_INCOME_CATS.includes(h.category ?? "") &&
  (h.isin ? (durations[h.isin] || h.category === "Liquidities") : h.category === "Liquidities")
);
  const totalWeight = fiHoldings.reduce((s, h) => s + (h.weight ?? 0), 0);
  if (totalWeight === 0) return null;
const weightedDuration = fiHoldings.reduce((s, h) => {
  const dur = durations[h.isin!]?.duration ?? 0;
  return s + (h.weight ?? 0) * dur;
}, 0);
  return +(weightedDuration / totalWeight).toFixed(2);
}, [currentPortfolio, durations]);
  
  const CREDIT_COLORS: Record<string, string> = {
    "Govies":  "#0ea5e9",
    "IG":      "#10b981",
    "HY":      "#f59e0b",
    "NR":      "#94a3b8",
    "EM Debt": "#8b5cf6",
  };
  
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
    if (!drillDownFilter || drillDownFilter.type === "currency") return [];
    const holdings = currentPortfolio?.holdings ?? [];
    if (drillDownFilter.type === "category") {
      return holdings.filter(h => h?.category === drillDownFilter.value);
    }
    return holdings
      .filter(h => {
        if (!h) return false;
        if (h.category !== "Equities") return false;
        const bd = h.isin ? breakdowns[h.isin] : null;
        if (bd && bd.length > 0) {
          return bd.some(e => normalizeRegion(e.region) === drillDownFilter.value && normalizeRegion(e.region) !== "Cash");
        }
        return normalizeRegion(h.region ?? "Others") === drillDownFilter.value;
      })
      .map(h => {
        const bd = h.isin ? breakdowns[h.isin] : null;
        if (bd && bd.length > 0) {
          const totalWeight = bd
            .filter(e => normalizeRegion(e.region) === drillDownFilter.value && e.region !== "Cash")
            .reduce((s, e) => s + (h.weight ?? 0) * e.weight / 100, 0);
          return { ...h, weight: totalWeight };
        }
        return h;
      })
      .filter(h => (h.weight ?? 0) > 0);
  }, [currentPortfolio, drillDownFilter, breakdowns]);

  const currencyDrillDownHoldings = useMemo(() => {
    if (!drillDownFilter || drillDownFilter.type !== "currency") return [];
    const targetCur = drillDownFilter.value.toUpperCase();
    return (currentPortfolio?.holdings ?? [])
      .map(h => {
        if (!h) return null;
        const cbd = h.isin ? currencyBreakdowns[h.isin] : null;
        if (cbd && cbd.length > 0) {
          const entry = cbd.find(e => e.currency.toUpperCase() === targetCur);
          if (!entry) return null;
          return { ...h, weight: (h.weight ?? 0) * entry.weight / 100 };
        }
        const cur = (h.currency ?? "").toUpperCase();
        if (cur !== targetCur) return null;
        return h;
      })
      .filter((h): h is Holding => h !== null && (h.weight ?? 0) > 0.001);
  }, [currentPortfolio, drillDownFilter, currencyBreakdowns]);

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

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-5 py-3 rounded-2xl shadow-lg max-w-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 p-1 hover:bg-rose-100 rounded-lg"><X className="h-4 w-4" /></button>
        </div>
      )}

      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-1.5 rounded-lg"><TrendingUp className="text-white h-4 w-4" /></div>
          <h1 className="text-lg font-bold tracking-tight">Portfolio Insight</h1>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(["SYNTHESE", "INSTRUMENTS", "TARGET_GRID", "Sicav", "Mixed", "MANUALS", "DPAM"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = { SYNTHESE: "Breakdown Deviation", INSTRUMENTS: "Synthèse Instruments", TARGET_GRID: "Target Grid", Sicav: "Sicav", Mixed: "Mixed", MANUALS: "Manuals", DPAM: "DPAM" };
            const showDate = ["SYNTHESE", "Sicav", "Mixed", "TARGET_GRID"].includes(tab);
            const latestDate = (() => {
              if (!showDate) return null;
              if (tab === "TARGET_GRID") return importLog.target_grid ? new Date(importLog.target_grid.imported_at) : null;
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

        <main className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <AnimatePresence mode="wait">

                       {/* ── BREAKDOWN DEVIATION ── */}
            {activeTab === "SYNTHESE" && (
              <motion.div key="synthese" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Breakdown Deviation</h2>
                    <p className="text-slate-500">Comparaison allocation portefeuille vs target grid par profil.</p>
                  </div>
                  <div className="bg-sky-100 p-3 rounded-2xl"><Globe className="h-6 w-6 text-sky-600" /></div>
                </div>

                {sortedPortfolios.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">Aucune donnée. Importez un CSV.</div>
                ) : (
                  <BreakdownDeviationTable
                    allPortfolios={allPortfolios}
                    targetGridData={targetGridData}
                    breakdowns={breakdowns}
                    creditBreakdowns={creditBreakdowns}
                  />
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
                    <div key={key} className={cn("flex-1 bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-2", entries.length > 0 ? "border-slate-100" : "border-slate-100 opacity-70")}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", { "bg-sky-400": color === "sky", "bg-violet-400": color === "violet", "bg-emerald-400": color === "emerald", "bg-amber-400": color === "amber" })} />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                      </div>
                      {entries.length === 0
                        ? <p className="text-xs text-slate-300 italic">Aucun import</p>
                        : entries.map((e, i) => (
                          <div key={i} className={cn("flex flex-col", i > 0 && "border-t border-slate-50 pt-2")}>
                            <p className="text-xs font-bold text-slate-800 truncate leading-tight" title={e.filename}>{e.filename}</p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                              {new Date(e.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                              {" "}{new Date(e.imported_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
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
                        <input type="text" value={instrumentsSearch} onChange={(e) => setInstrumentsSearch(e.target.value)} placeholder="Rechercher un instrument ou ISIN…" className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                        {instrumentsSearch && <button onClick={() => setInstrumentsSearch("")} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-3.5 w-3.5 text-slate-400" /></button>}
                        <span className="text-xs text-slate-400 shrink-0">{filteredInstruments.length} résultat{filteredInstruments.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-[200px]">
                                <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                                  Instrument <SortIcon active={sortConfig?.key === "name"} direction={sortConfig?.key === "name" ? sortConfig.direction : undefined} />
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
                                        {portfolioLabel(p.name)} <SortIcon active={isActive} direction={isActive ? sortConfig!.direction : undefined} />
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
                                    {row.name} <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                              <td className="px-6 py-4 text-xs text-slate-400">{formatDate(ov.updated_at)}</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => setEditingOverride({ original_asset_name: ov.original_asset_name ?? "", manual_asset_name: ov.manual_asset_name ?? "", manual_isin: ov.manual_isin ?? "", manual_region: ov.manual_region ?? "", manual_currency: ov.manual_currency ?? "", manual_category: ov.manual_category ?? "", manual_instrument: ov.manual_instrument ?? "", is_hedged: ov.is_hedged ?? false })}
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

                {/* ── Look-through géographique ── */}
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

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-500">
                      {Object.keys(breakdowns).length === 0 ? "Aucun breakdown enregistré." : `${Object.keys(breakdowns).length} instrument${Object.keys(breakdowns).length > 1 ? "s" : ""} configuré${Object.keys(breakdowns).length > 1 ? "s" : ""}`}
                    </p>
                    <button onClick={() => setEditingBreakdown({ isin: "", name: "", rows: [{ region: "", weight: 0 }] })}
                      className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-violet-700 transition-all">
                      <span>+</span> Ajouter
                    </button>
                  </div>
                  {Object.keys(breakdowns).length === 0 ? (
                    <div className="px-8 py-12 text-center text-slate-400 italic">Aucun look-through géographique configuré.</div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {Object.entries(breakdowns).map(([isin, entries]) => {
                        const holding = allPortfolios.flatMap(p => p.holdings ?? []).find(h => h.isin === isin);
                        const name = holding?.asset_name ?? isin;
                        const total = entries.reduce((s, e) => s + e.weight, 0);
                        const updatedAt = entries[0]?.updated_at;
                        return (
                          <div key={isin} className="px-8 py-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="font-bold text-slate-900 truncate">{name}</span>
                                  <span className="text-xs font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg shrink-0">{isin}</span>
                                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg shrink-0", Math.abs(total - 100) < 0.1 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{total.toFixed(1)}%</span>
                                  {updatedAt && <span className="text-[10px] text-slate-400 shrink-0">maj {formatDate(updatedAt)}</span>}
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
                                <button onClick={() => setEditingBreakdown({ isin, name, rows: [...entries] })} className="p-2 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>
                                <button onClick={async () => { await deleteBreakdown(isin); setBreakdowns(await fetchBreakdowns()); }} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Look-through devise ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Look-through devise</h3>
                    <p className="text-slate-500 text-sm mt-1">Exposition multi-devises forcée sur un instrument.</p>
                  </div>
                  <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="bg-emerald-50 p-2 rounded-lg"><Coins className="h-5 w-5 text-emerald-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instruments</p>
                      <p className="text-xl font-bold text-slate-900 leading-none">{Object.keys(currencyBreakdowns).length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-500">
                      {Object.keys(currencyBreakdowns).length === 0 ? "Aucun breakdown enregistré." : `${Object.keys(currencyBreakdowns).length} instrument${Object.keys(currencyBreakdowns).length > 1 ? "s" : ""} configuré${Object.keys(currencyBreakdowns).length > 1 ? "s" : ""}`}
                    </p>
                    <button onClick={() => setEditingCurrencyBreakdown({ isin: "", name: "", rows: [{ currency: "", weight: 0 }] })}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
                      <span>+</span> Ajouter
                    </button>
                  </div>
                  {Object.keys(currencyBreakdowns).length === 0 ? (
                    <div className="px-8 py-12 text-center text-slate-400 italic">Aucun look-through devise configuré.</div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {Object.entries(currencyBreakdowns).map(([isin, entries]) => {
                        const holding = allPortfolios.flatMap(p => p.holdings ?? []).find(h => h.isin === isin);
                        const name = holding?.asset_name ?? isin;
                        const total = entries.reduce((s, e) => s + e.weight, 0);
                        const updatedAt = entries[0]?.updated_at;
                        return (
                          <div key={isin} className="px-8 py-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="font-bold text-slate-900 truncate">{name}</span>
                                  <span className="text-xs font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg shrink-0">{isin}</span>
                                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg shrink-0", Math.abs(total - 100) < 0.1 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>{total.toFixed(1)}%</span>
                                  {updatedAt && <span className="text-[10px] text-slate-400 shrink-0">maj {formatDate(updatedAt)}</span>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {entries.map((e, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-700">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CURRENCY_COLORS[e.currency.toUpperCase()] ?? "#94a3b8" }} />
                                      {e.currency.toUpperCase()} <span className="font-bold text-slate-900">{e.weight}%</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => setEditingCurrencyBreakdown({ isin, name, rows: [...entries] })} className="p-2 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>
                                <button onClick={async () => { await deleteCurrencyBreakdown(isin); setCurrencyBreakdowns(await fetchCurrencyBreakdowns()); }} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
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
                    <div style={{ transform: "rotateX(180deg)", overflowX: "auto" }} className="[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                      <div style={{ transform: "rotateX(180deg)" }}>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 min-w-[280px]">Catégorie</th>
                              {RISK_PROFILES.map((profile) => (
                                <th key={profile} colSpan={3} className="px-2 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-100">{profile}</th>
                              ))}
                            </tr>
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
                                        <button onClick={() => setCollapsedRows(prev => { const next = new Set(prev); next.has(row.id) ? next.delete(row.id) : next.add(row.id); return next; })}
                                          className={cn("p-0.5 rounded transition-colors", row.level === 0 ? "hover:bg-white/20" : "hover:bg-slate-200")}>
                                          {isCollapsed
                                            ? <ChevronRight className={cn("h-3.5 w-3.5", row.level === 0 ? "text-white/70" : "text-slate-400")} />
                                            : <ChevronDown className={cn("h-3.5 w-3.5", row.level === 0 ? "text-white/70" : "text-slate-400")} />}
                                        </button>
                                      )}
                                      <span className={cn(row.level === 0 ? "text-sm font-bold tracking-wide uppercase" : row.level === 1 ? "text-sm font-semibold" : "text-xs text-slate-600")}>{row.label}</span>
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
{/* ── DPAM ── */}
{activeTab === "DPAM" && (
  <motion.div key="dpam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="max-w-7xl mx-auto">
    <DpamTab
      bondsData={dpamBondsData}
      onUpload={handleDpamUpload}
      uploading={dpamUploading}
      uploadSuccess={dpamUploadSuccess}
    />
  </motion.div>
)}
   {/* ── SICAV / MIXED ── */}
            {(activeTab === "Sicav" || activeTab === "Mixed") && (
              <motion.div key={`detail-${selectedId ?? "none"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-6xl mx-auto space-y-8">
                {detailLoading && <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>}
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

                    {/* ── Cards KPI : Actifs + Duration + Credit Quality + Currency ── */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                      {/* Actifs */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-sky-100 p-2 rounded-xl"><LayoutDashboard className="h-5 w-5 text-sky-600" /></div>
                          <span className="text-sm font-semibold text-slate-500">Actifs</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{currentPortfolio.holdings?.length ?? 0}</div>
                        <div className="text-xs text-slate-400 mt-1">Instruments individuels</div>
                      </div>

                      {/* Duration */}
<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:border-sky-200 hover:shadow-md transition-all"
  onClick={() => setShowDurationDetail(true)}>
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-sky-100 p-2 rounded-xl"><TrendingUp className="h-5 w-5 text-sky-600" /></div>
      <span className="text-sm font-semibold text-slate-500">Duration</span>
    </div>
    {portfolioDuration == null ? (
      <div className="text-slate-400 text-sm italic">Aucune donnée</div>
    ) : (
      <>
        <div className="text-3xl font-bold text-slate-900">{portfolioDuration}</div>
        <div className="text-xs text-slate-400 mt-1">années (Fixed Income)</div>
      </>
    )}
  </div>
                      
                      {/* Credit Quality */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-violet-100 p-2 rounded-xl"><TrendingUp className="h-5 w-5 text-violet-600" /></div>
                          <span className="text-sm font-semibold text-slate-500">Credit Quality</span>
                        </div>
                        {creditData.length === 0 ? (
                          <div className="text-slate-400 text-sm italic">Aucune décomposition configurée</div>
                        ) : (
                          <div className="space-y-2.5 mt-1">
                            {creditData.map(({ name, value }) => (
                              <div key={name} className="flex items-center gap-3">
                                <span className="text-xs font-bold w-16 shrink-0" style={{ color: CREDIT_COLORS[name] ?? "#94a3b8" }}>{name}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, value)}%`, backgroundColor: CREDIT_COLORS[name] ?? "#94a3b8" }} />
                                </div>
                                <span className="text-xs font-bold text-slate-700 w-12 text-right shrink-0">{value.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Currency Exposure */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-emerald-100 p-2 rounded-xl"><Coins className="h-5 w-5 text-emerald-600" /></div>
                          <span className="text-sm font-semibold text-slate-500">Currency Exposure</span>
                        </div>
                        {currencyData.length === 0 ? (
                          <div className="text-slate-400 text-sm italic">Aucune donnée</div>
                        ) : (
                          <div className="space-y-2.5 mt-1">
                            {currencyData.map(({ label, value }) => (
                              <div key={label}
                                className="flex items-center gap-3 cursor-pointer group"
                               onClick={() => {
                                setDrillDownFilter({ type: "currency", value: label });
                                setShowCurrencyDetail(label);
                                }}>
                                <span className="text-xs font-bold text-slate-500 w-9 shrink-0 group-hover:text-slate-800 transition-colors">{label}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all group-hover:opacity-75"
                                    style={{ width: `${Math.min(100, value)}%`, backgroundColor: CURRENCY_COLORS[label] ?? "#94a3b8" }} />
                                </div>
                                <span className="text-xs font-bold text-slate-700 w-12 text-right shrink-0">{value.toFixed(1)}%</span>
                                <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                              </div>
                            ))}
                            <p className="text-[10px] text-slate-400 italic pt-1">Cliquez pour filtrer</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {(currentPortfolio.holdings?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-sky-600" />Allocation par Catégorie</h3>
                          <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 60, left: 20, bottom: 0 }}
                                onClick={(d: any) => d?.activeLabel && setDrillDownFilter({ type: "category", value: d.activeLabel })}>
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v + "%"} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} width={90} />
                                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "16px", border: "none" }} formatter={(v: number, name: string) => name === "target" ? ["", ""] : [v + "%", name]} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} className="cursor-pointer">
                                  {categoryData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                                  <LabelList dataKey="value" position="right" formatter={(v: number) => v + "%"} fill="#64748b" fontSize={11} />
                                </Bar>
                                <Bar dataKey="target" fill="#f59e0b" fillOpacity={0.3} radius={[0, 4, 4, 0]} barSize={3}>
                                  <LabelList dataKey="target" position="right" formatter={(v: number) => v != null ? v + "%" : ""} fill="#f59e0b" fontSize={10} fontWeight="bold" />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-center text-xs text-slate-400 mt-2 italic">Cliquez pour filtrer</p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                          <div className="flex items-center justify-between mb-8">
  <h3 className="text-lg font-bold flex items-center gap-2"><Globe className="h-5 w-5 text-amber-600" />Exposition Régionale</h3>
  <span className="text-2xl font-bold text-sky-600">
    {regionData.reduce((s, d) => s + d.value, 0).toFixed(1)}%
  </span>
</div>
                          <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={regionData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} onClick={(d: any) => d?.activeLabel && setDrillDownFilter({ type: "region", value: d.activeLabel })}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "16px", border: "none" }}
                                  formatter={(v: number, name: string) => name === "target" ? ["", ""] : [v + "%", "Actuel"]} />
                                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} className="cursor-pointer">
                                  <LabelList dataKey="value" position="top" formatter={(v: number) => v + "%"} fill="#64748b" fontSize={11} />
                                </Bar>
                                <Bar dataKey="target" fill="#f59e0b" fillOpacity={0.3} radius={[4, 4, 0, 0]} barSize={3}>
                                  <LabelList dataKey="target" position="top" formatter={(v: number) => v != null ? v + "%" : ""} fill="#f59e0b" fontSize={10} fontWeight="bold" />
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

                    {/* ── Drill-down unifié : category / region / currency ── */}
                    <AnimatePresence>
                      {drillDownFilter && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                          className={cn("p-8 rounded-3xl border", drillDownFilter.type === "currency" ? "bg-emerald-50 border-emerald-100" : "bg-sky-50 border-sky-100")}>
                          <div className="flex items-center justify-between mb-6">
                            <h3 className={cn("text-lg font-bold", drillDownFilter.type === "currency" ? "text-emerald-900" : "text-sky-900")}>
                              {drillDownFilter.type === "category" ? "Catégorie" : drillDownFilter.type === "currency" ? "Devise" : "Région"} : {drillDownFilter.value}
                            </h3>
                            <button onClick={() => setDrillDownFilter(null)}
                              className={cn("text-sm font-medium flex items-center gap-1", drillDownFilter.type === "currency" ? "text-emerald-600 hover:text-emerald-800" : "text-sky-600 hover:text-sky-800")}>
                              Fermer <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(drillDownFilter.type === "currency" ? [...currencyDrillDownHoldings] : [...drillDownHoldings])
                              .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
                              .map((h, i) => (
                                <button key={i} onClick={() => setSelectedInstrument(h)}
                                  className={cn("bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center hover:shadow-md transition-all text-left group",
                                    drillDownFilter.type === "currency"
                                      ? "border border-emerald-100 hover:border-emerald-300"
                                      : "border border-sky-100 hover:border-sky-300")}>
                                  <div className="min-w-0">
                                    <div className={cn("font-bold transition-colors truncate",
                                      drillDownFilter.type === "currency" ? "text-slate-900 group-hover:text-emerald-700" : "text-slate-900 group-hover:text-sky-700")}>
                                      {h.asset_name ?? "—"}
                                    </div>
                                    <div className="text-xs text-slate-500">{h.instrument ?? "—"} • {h.currency ?? "—"}</div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <span className={cn("text-lg font-bold", drillDownFilter.type === "currency" ? "text-emerald-600" : "text-sky-600")}>
                                      {Number(h.weight ?? 0).toFixed(2)}%
                                    </span>
                                    <ArrowRight className={cn("h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity",
                                      drillDownFilter.type === "currency" ? "text-emerald-400" : "text-sky-400")} />
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
                            {holdingsSearch && <button onClick={() => setHoldingsSearch("")} className="p-0.5 hover:bg-slate-200 rounded transition-colors"><X className="h-3.5 w-3.5 text-slate-400" /></button>}
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
                                      {label} <SortIcon active={holdingsSortConfig?.key === key} direction={holdingsSortConfig?.key === key ? holdingsSortConfig.direction : undefined} />
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
                                    <td className="px-8 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">{h?.category ?? "—"}</span></td>
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

      {/* ── Instrument modal — badges L, H, M, C ── */}
      <Modal isOpen={!!selectedInstrument} onClose={() => setSelectedInstrument(null)} title="Fiche Instrument">
        {selectedInstrument && (
          <div className="space-y-6">
            <div className="relative flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {hasLookThrough(selectedInstrument) && (
                  <span className="bg-violet-100 text-violet-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest uppercase">L</span>
                )}
{hasCurrencyBreakdown(selectedInstrument) && (
  <span className="bg-emerald-100 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest uppercase">CB</span>
)}
                {hasManualOverride(selectedInstrument) && (
                  <span className="bg-amber-100 text-amber-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest uppercase">M</span>
                )}
                {hasCreditBreakdown(selectedInstrument) && (
                  <span className="bg-violet-100 text-violet-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest uppercase">C</span>
                )}
                {isHedged(selectedInstrument) && (
  <span className="bg-sky-100 text-sky-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-widest uppercase">H</span>
)}
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-sky-600 p-3 rounded-xl"><TrendingUp className="text-white h-6 w-6" /></div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedInstrument.asset_name ?? "—"}</h4>
                  <p className="text-sm text-slate-500">{selectedInstrument.instrument ?? "—"}</p>
                </div>
              </div>
<button onClick={() => {
  setEditingOverride({
    original_asset_name: selectedInstrument.original_asset_name ?? selectedInstrument.asset_name ?? "",
    manual_asset_name: selectedInstrument.asset_name ?? "",
    manual_isin: selectedInstrument.isin ?? "",
    manual_region: selectedInstrument.region ?? "",
    manual_currency: selectedInstrument.currency ?? "",
    manual_category: selectedInstrument.category ?? "",
    manual_instrument: selectedInstrument.instrument ?? "",
    is_hedged: manualOverrides.find(ov =>
      (ov.manual_isin && ov.manual_isin === selectedInstrument.isin) ||
      (ov.original_asset_name && ov.original_asset_name === (selectedInstrument.original_asset_name ?? selectedInstrument.asset_name))
    )?.is_hedged ?? false,
  });
  setSelectedInstrument(null);
}}
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
              {["Fixed Income", "Bonds"].includes(selectedInstrument.category ?? "") && (
                <div className="p-4 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Info className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Duration</span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      placeholder="—"
                      defaultValue={durations[selectedInstrument.isin ?? ""]?.duration ?? ""}
                      onBlur={async (e) => {
                        const val = parseFloat(e.target.value);
                        if (!selectedInstrument.isin) return;
                        if (isNaN(val)) {
                          setDurations(prev => { const n = { ...prev }; delete n[selectedInstrument.isin!]; return n; });
                          await deleteDuration(selectedInstrument.isin);
                        } else {
                          setDurations(prev => ({ ...prev, [selectedInstrument.isin!]: { duration: val, updated_at: new Date().toISOString() } }));
                          await saveDuration(selectedInstrument.isin, val);
                        }
                      }}
                      className="font-bold text-slate-900 bg-transparent outline-none w-20 border-b border-slate-200 focus:border-violet-400 transition-colors text-sm"
                    />
                    {durations[selectedInstrument.isin ?? ""]?.updated_at && (
                      <span className="text-[10px] italic text-slate-400 shrink-0">
                        maj {formatDate(durations[selectedInstrument.isin ?? ""].updated_at)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ← ÉTAPE 4 ICI */}
 {["Fixed Income", "Bonds"].includes(selectedInstrument.category ?? "") && (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
     <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
  <div>
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit Quality Breakdown</p>
    {creditBreakdowns[selectedInstrument.isin ?? ""]?.[0]?.updated_at && (
      <p className="text-[10px] italic text-slate-400 mt-0.5">
        maj {formatDate(creditBreakdowns[selectedInstrument.isin ?? ""][0].updated_at)}
      </p>
    )}
  </div>
  <button
    onClick={() => setEditingCreditBreakdown({ isin: selectedInstrument.isin ?? "", name: selectedInstrument.asset_name ?? "" })}
    className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
    <Edit2 className="h-3 w-3" />
    {creditBreakdowns[selectedInstrument.isin ?? ""] ? "Modifier" : "Configurer"}
  </button>
</div>
      {!creditBreakdowns[selectedInstrument.isin ?? ""] ? (
        <div className="px-4 py-6 text-center text-slate-400 text-sm italic">
          Aucune décomposition configurée
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Type</th>
                {CREDIT_CURRENCIES.map(cur => (
                  <th key={cur} className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">{cur}</th>
                ))}
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {CREDIT_TYPES.map(ct => {
                const entries = (creditBreakdowns[selectedInstrument.isin ?? ""] ?? []).filter(e => e.credit_type === ct);
                if (entries.length === 0) return null;
                const totalCt = entries.reduce((s, e) => s + e.weight, 0);
                return (
                  <tr key={ct} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-bold" style={{ color: CREDIT_COLORS[ct] ?? "#64748b" }}>{ct}</td>
                    {CREDIT_CURRENCIES.map(cur => {
                      const w = entries.find(e => e.currency === cur)?.weight ?? 0;
                      return <td key={cur} className="px-3 py-2 text-right text-slate-600">{w > 0 ? w.toFixed(1) + "%" : "—"}</td>;
                    })}
                    <td className="px-3 py-2 text-right font-bold text-slate-900">{totalCt.toFixed(1)}%</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50/50 font-bold">
                <td className="px-4 py-2 text-slate-700">Total</td>
                {CREDIT_CURRENCIES.map(cur => {
                  const total = (creditBreakdowns[selectedInstrument.isin ?? ""] ?? [])
                    .filter(e => e.currency === cur)
                    .reduce((s, e) => s + e.weight, 0);
                  return <td key={cur} className="px-3 py-2 text-right text-slate-700">{total > 0 ? total.toFixed(1) + "%" : "—"}</td>;
                })}
                <td className="px-3 py-2 text-right text-slate-900">
                  {(creditBreakdowns[selectedInstrument.isin ?? ""] ?? []).reduce((s, e) => s + e.weight, 0).toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}
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
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-slate-700">Instrument hedgé (EUR)</p>
                <p className="text-xs text-slate-400">Force l'exposition à 100% EUR dans le calcul devise</p>
              </div>
              <button
                onClick={() => setEditingOverride({ ...editingOverride, is_hedged: !editingOverride.is_hedged })}
                className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  editingOverride.is_hedged ? "bg-sky-500" : "bg-slate-200")}>
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                  editingOverride.is_hedged ? "translate-x-6" : "translate-x-1")} />
              </button>
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

      {/* ── Geo breakdown modal ── */}
      <Modal isOpen={!!editingBreakdown} onClose={() => setEditingBreakdown(null)} title="Look-through géographique">
        {editingBreakdown && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ISIN</label>
              <input type="text" value={editingBreakdown.isin} onChange={(e) => setEditingBreakdown({ ...editingBreakdown, isin: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none font-mono"
                placeholder="Ex: BE6299468940" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">Décomposition régionale</label>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg",
                  Math.abs(editingBreakdown.rows.reduce((s, r) => s + (Number(r.weight) || 0), 0) - 100) < 0.1 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                  Total : {editingBreakdown.rows.reduce((s, r) => s + (Number(r.weight) || 0), 0).toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2">
                {editingBreakdown.rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={row.region}
                      onChange={(e) => { const rows = [...editingBreakdown.rows]; rows[i] = { ...rows[i], region: e.target.value }; setEditingBreakdown({ ...editingBreakdown, rows }); }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none text-sm" placeholder="Région (ex: US, Europe…)" />
                    <input type="number" value={row.weight}
                      onChange={(e) => { const rows = [...editingBreakdown.rows]; rows[i] = { ...rows[i], weight: Number(e.target.value) }; setEditingBreakdown({ ...editingBreakdown, rows }); }}
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none text-sm text-right"
                      placeholder="%" min={0} max={100} step={0.1} />
                    <button onClick={() => setEditingBreakdown({ ...editingBreakdown, rows: editingBreakdown.rows.filter((_, j) => j !== i) })}
                      className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setEditingBreakdown({ ...editingBreakdown, rows: [...editingBreakdown.rows, { region: "", weight: 0 }] })}
                className="mt-3 text-sm text-violet-600 hover:text-violet-800 font-bold flex items-center gap-1">+ Ajouter une région</button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingBreakdown(null)} className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">Annuler</button>
              <button disabled={breakdownSaving || !editingBreakdown.isin}
                onClick={async () => {
                  setBreakdownSaving(true);
                  try {
                    await saveBreakdown(editingBreakdown.isin, editingBreakdown.rows.filter(r => r.region && r.weight > 0));
                    const fresh = await fetchBootstrap();
                    if (fresh) setBreakdowns(fresh.breakdowns ?? {});
                    setEditingBreakdown(null);
                  } finally { setBreakdownSaving(false); }
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-violet-700 transition-all disabled:opacity-50">
                {breakdownSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Currency breakdown modal ── */}
      <Modal isOpen={!!editingCurrencyBreakdown} onClose={() => setEditingCurrencyBreakdown(null)} title="Look-through devise">
        {editingCurrencyBreakdown && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ISIN</label>
              <input type="text" value={editingCurrencyBreakdown.isin} onChange={(e) => setEditingCurrencyBreakdown({ ...editingCurrencyBreakdown, isin: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                placeholder="Ex: LU0123456789" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">Décomposition devise</label>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg",
                  Math.abs(editingCurrencyBreakdown.rows.reduce((s, r) => s + (Number(r.weight) || 0), 0) - 100) < 0.1 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                  Total : {editingCurrencyBreakdown.rows.reduce((s, r) => s + (Number(r.weight) || 0), 0).toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2">
                {editingCurrencyBreakdown.rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={row.currency}
                      onChange={(e) => { const rows = [...editingCurrencyBreakdown.rows]; rows[i] = { ...rows[i], currency: e.target.value.toUpperCase() }; setEditingCurrencyBreakdown({ ...editingCurrencyBreakdown, rows }); }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono uppercase"
                      placeholder="Devise (ex: EUR, USD, CHF…)" />
                    <input type="number" value={row.weight}
                      onChange={(e) => { const rows = [...editingCurrencyBreakdown.rows]; rows[i] = { ...rows[i], weight: Number(e.target.value) }; setEditingCurrencyBreakdown({ ...editingCurrencyBreakdown, rows }); }}
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-right"
                      placeholder="%" min={0} max={100} step={0.1} />
                    <button onClick={() => setEditingCurrencyBreakdown({ ...editingCurrencyBreakdown, rows: editingCurrencyBreakdown.rows.filter((_, j) => j !== i) })}
                      className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setEditingCurrencyBreakdown({ ...editingCurrencyBreakdown, rows: [...editingCurrencyBreakdown.rows, { currency: "", weight: 0 }] })}
                className="mt-3 text-sm text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1">+ Ajouter une devise</button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingCurrencyBreakdown(null)} className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all">Annuler</button>
              <button disabled={currencyBreakdownSaving || !editingCurrencyBreakdown.isin}
                onClick={async () => {
                  setCurrencyBreakdownSaving(true);
                  try {
                    await saveCurrencyBreakdown(editingCurrencyBreakdown.isin, editingCurrencyBreakdown.rows.filter(r => r.currency && r.weight > 0));
                    const fresh = await fetchBootstrap();
                    if (fresh) setCurrencyBreakdowns(fresh.currencyBreakdowns ?? {});
                    setEditingCurrencyBreakdown(null);
                  } finally { setCurrencyBreakdownSaving(false); }
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50">
                {currencyBreakdownSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Sauvegarder
              </button>
            </div>
          </div>
        )}
      </Modal>

           {/* ── Credit breakdown modal ── */}
      <Modal isOpen={!!editingCreditBreakdown} onClose={() => setEditingCreditBreakdown(null)} title="Credit Quality Breakdown">
        {editingCreditBreakdown && (() => {
          const isin = editingCreditBreakdown.isin;
          const existing = creditBreakdowns[isin] ?? [];
          
          // Build a local grid state: credit_type x currency → weight
          const getWeight = (ct: CreditType, cur: string) =>
            existing.find(e => e.credit_type === ct && e.currency === cur)?.weight ?? 0;
          
          const handleChange = async (ct: CreditType, cur: string, val: number) => {
            // Mise à jour optimiste immédiate
            const updated = existing.filter(e => !(e.credit_type === ct && e.currency === cur));
            if (val > 0) updated.push({ credit_type: ct, currency: cur as CreditBreakdownEntry["currency"], weight: val });
            setCreditBreakdowns(prev => ({ ...prev, [isin]: updated }));
            // Sauvegarde en arrière-plan
            setCreditBreakdownSaving(true);
            try {
              await saveCreditBreakdown(isin, updated);
            } finally {
              setCreditBreakdownSaving(false);
            }
          };
 
          const total = existing.reduce((s, e) => s + e.weight, 0);
 
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 truncate">{editingCreditBreakdown.name}</p>
                  <p className="text-xs font-mono text-sky-600">{isin}</p>
                </div>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg",
                  Math.abs(total - 100) < 0.1 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                  Total : {total.toFixed(1)}%
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Type</th>
                      {CREDIT_CURRENCIES.map(cur => (
                        <th key={cur} className="px-2 py-2 text-center font-bold text-slate-500 uppercase tracking-wider">{cur}</th>
                      ))}
                      <th className="px-2 py-2 text-right font-bold text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {CREDIT_TYPES.map(ct => {
                      const rowTotal = CREDIT_CURRENCIES.reduce((s, cur) => s + getWeight(ct, cur), 0);
                      return (
                        <tr key={ct} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-bold" style={{ color: CREDIT_COLORS[ct] ?? "#64748b" }}>{ct}</td>
                          {CREDIT_CURRENCIES.map(cur => (
                            <td key={cur} className="px-1 py-1">
                              <input
                                type="number"
                                min={0} max={100} step={0.1}
                                defaultValue={getWeight(ct, cur) || ""}
                                placeholder="0"
                                onBlur={(e) => handleChange(ct, cur, parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-right rounded-lg border border-slate-200 focus:ring-2 focus:ring-violet-400 outline-none text-slate-700"
                              />
                            </td>
                          ))}
                          <td className="px-2 py-2 text-right font-bold text-slate-900">
                            {rowTotal > 0 ? rowTotal.toFixed(1) + "%" : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {creditBreakdownSaving && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde…
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    setCreditBreakdowns(prev => { const n = { ...prev }; delete n[isin]; return n; });
                    await deleteCreditBreakdown(isin);
                    setEditingCreditBreakdown(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-rose-500 hover:bg-rose-50 transition-colors text-sm">
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
                <button
                  onClick={() => setEditingCreditBreakdown(null)}
                  className="flex-1 px-6 py-3 rounded-2xl font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all text-sm text-center">
                  Fermer
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center italic">
                Les modifications sont sauvegardées automatiquement à chaque champ.
              </p>
            </div>
          );
        })()}
      </Modal>

        {/* ── Duration detail modal ── */}
    <Modal isOpen={showDurationDetail} onClose={() => setShowDurationDetail(false)} title="Détail Duration">
      {currentPortfolio && (() => {
        const FIXED_INCOME_CATS = ["Fixed Income", "Bonds", "Liquidities"];
const fiHoldings = (currentPortfolio.holdings ?? [])
  .filter(h => h && FIXED_INCOME_CATS.includes(h.category ?? "") &&
    (h.isin ? (durations[h.isin] || h.category === "Liquidities") : h.category === "Liquidities"))
  .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

const allFiHoldings = (currentPortfolio.holdings ?? [])
  .filter(h => h && FIXED_INCOME_CATS.includes(h.category ?? ""))
  .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
        const totalWeight = fiHoldings.reduce((s, h) => s + (h.weight ?? 0), 0);

        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 italic">Duration moyenne pondérée — divisée par le poids total des instruments obligataires avec duration configurée.</p>

            {/* Instruments utilisés dans le calcul */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instruments utilisés ({fiHoldings.length} / {allFiHoldings.length})</p>
              </div>
              <div className="divide-y divide-slate-50 max-h-32 overflow-y-auto">
                {allFiHoldings.map((h, i) => {
                  const hasDur = h.category === "Liquidities" || (h.isin && durations[h.isin]);
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-2">
                      <span className={cn("text-xs truncate max-w-[220px]", hasDur ? "text-slate-700 font-medium" : "text-slate-300 italic")}>
                        {h.asset_name ?? "—"}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn("text-xs", hasDur ? "text-slate-600" : "text-slate-300")}>{(h.weight ?? 0).toFixed(2)}%</span>
                        {hasDur
                          ? <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full">✓</span>
                          : <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tableau de calcul */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Instrument</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Duration</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fiHoldings.map((h, i) => {
const dur = Number((h.isin && durations[h.isin]?.duration) ?? 0);
const contribution = totalWeight > 0 ? (h.weight ?? 0) * dur / totalWeight : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 truncate max-w-[180px]">
                          <button
                            onClick={() => { setShowDurationDetail(false); setSelectedInstrument(h); }}
                            className="text-sky-600 hover:underline font-bold text-left">
                            {h.asset_name ?? "—"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{(h.weight ?? 0).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right text-slate-600">{dur.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-sky-600">{contribution.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-700">Total ({totalWeight.toFixed(1)}%)</td>
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-500 text-xs italic">Σ(poids × duration) / {(totalWeight ?? 0).toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{portfolioDuration != null ? portfolioDuration.toFixed(2) : "—"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 italic text-center">
              Les instruments en grisé n'ont pas de duration configurée et ne sont pas inclus dans le calcul.
            </p>
          </div>
        );
      })()}
    </Modal>

      {/* ── Currency detail modal ── */}
<Modal isOpen={!!showCurrencyDetail} onClose={() => setShowCurrencyDetail(null)} title={`Exposition ${showCurrencyDetail}`}>
  {currentPortfolio && showCurrencyDetail && (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 italic">
        Détail du calcul de l'exposition en {showCurrencyDetail}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Instrument</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids Ptf</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">% {showCurrencyDetail}</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Exposition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(currentPortfolio.holdings ?? [])
              .map(h => {
                if (!h) return null;
                const targetCur = showCurrencyDetail.toUpperCase();
                const cbd = h.isin ? currencyBreakdowns[h.isin] : null;
                let curWeight: number | null = null;
                let exposition = 0;
                if (cbd && cbd.length > 0) {
                  const entry = cbd.find(e => e.currency.toUpperCase() === targetCur);
                  if (!entry) return null;
                  curWeight = entry.weight;
                  exposition = (h.weight ?? 0) * entry.weight / 100;
                } else {
                  if ((h.currency ?? "").toUpperCase() !== targetCur) return null;
                  curWeight = 100;
                  exposition = h.weight ?? 0;
                }
                return { h, curWeight, exposition };
              })
              .filter((x): x is { h: any; curWeight: number; exposition: number } => x !== null && x.exposition > 0.001)
              .sort((a, b) => b.exposition - a.exposition)
              .map(({ h, curWeight, exposition }, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium truncate max-w-[180px]">
  <button onClick={() => { setShowCurrencyDetail(null); setSelectedInstrument(h); }}
    className="text-sky-600 hover:underline font-bold text-left">
    {h.asset_name ?? "—"}
  </button>
</td>
                  <td className="px-4 py-3 text-right text-slate-600">{(h.weight ?? 0).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-slate-500">{curWeight.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{exposition.toFixed(2)}%</td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={3} className="px-4 py-3 font-bold text-slate-700 text-right">Total {showCurrencyDetail}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">
                {currencyData.find(c => c.label === showCurrencyDetail)?.value.toFixed(2) ?? "—"}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 italic text-center">
        Exposition = Poids Ptf × % {showCurrencyDetail} / 100
      </p>
    </div>
  )}
</Modal>
    </div>
  );
}
