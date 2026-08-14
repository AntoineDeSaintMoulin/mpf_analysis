import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  PieChart as PieChartIcon,
  Globe,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Info,
  Download,
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
  TrendingUp,
} from "lucide-react";
import Papa from "papaparse";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  saveManagementStyle,
  deleteManagementStyle,
  type ManagementStyleMap,
  fetchPerformanceData,
  savePerformanceData,
  type PerformanceRow,
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
const P30_ISIN = "PP3011111111";
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

type Tab = "SYNTHESE" | "Sicav" | "Mixed" | "INSTRUMENTS" | "MANUALS" | "TARGET_GRID" | "DPAM" | "SIMULATION" | "SAMDP" | "RISK_ANALYSIS" | "PERFORMANCE";

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
  { id: "modified_duration", label: "Modified Duration", level: 0 },
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
  { id: "modified_duration", label: "Modified Duration", level: 0 },
];

type PortfolioFilter = "main" | "sust" | "cv" | "rdt";

const PORTFOLIO_FILTERS: Record<PortfolioFilter, (name: string) => boolean> = {
  main: (name) => !name.includes("_SUST") && !name.includes("_CV_") && !name.includes("_T_"),
  sust: (name) => name.includes("_SUST"),
  cv:   (name) => name.includes("_CV_"),
  rdt:  (name) => name.includes("_T_"),
};

const PORTFOLIO_FILTER_LABELS: Record<PortfolioFilter, string> = {
  main: "Principaux",
  sust: "Sustainable",
  cv:   "Conviction",
  rdt:  "RDT",
};

// Lignes qui ont toujours — (pas de calcul possible)
const ALWAYS_DASH = new Set([
  "alt_conv", "alt_other",
  "fi_eur_gov_infl", "fi_usd_gov_infl",
  "fi_em_hard",
]);

// Calcule le poids d'une ligne du target grid dans un portefeuille donné
function computePtfWeight(
  gridId: string,
  holdings: any[],
  breakdowns: Record<string, any[]>,
  creditBreakdowns: Record<string, any[]>,
  dpamLookup: Record<string, any> = {},
  samdpGeoBreakdown: { region: string; weight: number }[] | null = null,
  samdpDebtCreditBreakdown: { credit_type: string; currency: string; weight: number }[] | null = null,
  samdpEquityCashPct: number = 0,
  samdpDebtCashPct: number = 0
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

const getEquityCashWeight = (h: any): number => {
    const SAMDP_DEBT_ISIN_CASH = "LU1545753169";
    if (h.isin === SAMDP_DEBT_ISIN_CASH) {
      return (h.weight ?? 0) * samdpDebtCashPct / 100;
    }
    if (h?.category !== "Equities") return 0;
    if (h.isin === "LU1795355053") {
      return (h.weight ?? 0) * samdpEquityCashPct;
    }
    const bd = h.isin ? breakdowns[h.isin] : null;
    if (bd && bd.length > 0) {
      return bd.filter((e: any) => e.region === "Cash").reduce((s: number, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
    }
    const dpamGeo = h.isin ? dpamLookup[h.isin]?.geoBreakdown : null;
    if (dpamGeo && dpamGeo.length > 0) {
      return dpamGeo.filter((e: any) => e.region === "Cash").reduce((s: number, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
    }
    return 0;
  };

  switch (gridId) {
case "equities": {
      let total = 0;
      holdings.filter(h => h?.category === "Equities").forEach(h => {
        if (h.isin === "LU1795355053" && samdpGeoBreakdown) {
          samdpGeoBreakdown.filter((e: any) => e.region !== "Cash").forEach(e => { total += (h.weight ?? 0) * e.weight / 100; });
        } else {
          const bd = h.isin ? breakdowns[h.isin] : null;
          if (bd && bd.length > 0) {
            bd.filter((e: any) => e.region !== "Cash").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
          } else {
            const dpamGeo = h.isin ? dpamLookup[h.isin]?.geoBreakdown : null;
            if (dpamGeo && dpamGeo.length > 0) {
              dpamGeo.filter((e: any) => e.region !== "Cash").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
            } else {
              total += h.weight ?? 0;
            }
          }
        }
      });
      return total;
    }
case "eq_europe": case "eq_us": case "eq_em": case "eq_japan": case "eq_other": {
      const regionMap: Record<string, string> = { eq_europe: "Europe", eq_us: "US", eq_em: "EM", eq_japan: "Japan", eq_other: "Others" };
      const targetRegion = regionMap[gridId];
      let total = 0;
      holdings.filter(h => h?.category === "Equities").forEach(h => {
        if (h.isin === "LU1795355053" && samdpGeoBreakdown) {
          samdpGeoBreakdown.forEach(e => { if (normalizeRegion(e.region) === targetRegion) total += (h.weight ?? 0) * e.weight / 100; });
        } else {
          const bd = h.isin ? breakdowns[h.isin] : null;
          if (bd && bd.length > 0) {
            bd.forEach((e: any) => { if (normalizeRegion(e.region) === targetRegion) total += (h.weight ?? 0) * e.weight / 100; });
          } else {
            const dpamGeo = h.isin ? dpamLookup[h.isin]?.geoBreakdown : null;
            if (dpamGeo && dpamGeo.length > 0) {
              dpamGeo.forEach((e: any) => { if (normalizeRegion(e.region) === targetRegion) total += (h.weight ?? 0) * e.weight / 100; });
            } else {
              if (normalizeRegion(h.region ?? "") === targetRegion) total += h.weight ?? 0;
            }
          }
        }
      });
      return total;
    }

    case "alternatives":
      return holdings.filter(h => h?.category === "Alternatives" || h?.category === "Gold").reduce((s, h) => s + (h.weight ?? 0), 0);

    case "alt_gold":
      return holdings.filter(h => h?.category === "Gold").reduce((s, h) => s + (h.weight ?? 0), 0);

case "fixed_income": {
      const subIds = ["fi_eur", "fi_usd", "fi_em_local", "fi_em_hard", "fi_global"];
      const result = subIds.reduce((s, id) => {
const v = computePtfWeight(id, holdings, breakdowns, creditBreakdowns, dpamLookup, samdpGeoBreakdown, samdpDebtCreditBreakdown, samdpEquityCashPct, samdpDebtCashPct);
        console.log("fixed_income sub:", id, "=", v);
        return s + (v ?? 0);
      }, 0);
      console.log("fixed_income total:", result);
      return result;
    }

case "fi_eur": {
      const subIds = ["fi_eur_gov", "fi_eur_ig", "fi_eur_hy"];
      return subIds.reduce((s, id) => {
const v = computePtfWeight(id, holdings, breakdowns, creditBreakdowns, dpamLookup, samdpGeoBreakdown, samdpDebtCreditBreakdown, samdpEquityCashPct, samdpDebtCashPct);
        return s + (v ?? 0);
      }, 0);
    }

    case "fi_eur_gov": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
const SAMDP_DEBT_ISIN = "LU1545753169";
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
        if (entries.length > 0) entries.filter((e: any) => e.credit_type === "Govies" && e.currency === "EUR").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

case "fi_eur_ig": {
      let total = 0;
      const SAMDP_DEBT_ISIN = "LU1545753169";
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
        if (entries.length > 0) entries.filter((e: any) => e.credit_type === "IG" && e.currency === "EUR").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

case "fi_eur_hy": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        const SAMDP_DEBT_ISIN = "LU1545753169";
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
        if (entries.length > 0) entries.filter((e: any) => (e.credit_type === "HY" || e.credit_type === "NR") && e.currency === "EUR").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_usd": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
const SAMDP_DEBT_ISIN = "LU1545753169";
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
        if (entries.length > 0) entries.filter((e: any) => e.currency === "USD").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_usd_gov": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
const SAMDP_DEBT_ISIN = "LU1545753169";
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
        if (entries.length > 0) entries.filter((e: any) => e.credit_type === "Govies" && e.currency === "USD").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

    case "fi_usd_ig": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
const SAMDP_DEBT_ISIN = "LU1545753169";
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
        if (entries.length > 0) entries.filter((e: any) => e.credit_type === "IG" && e.currency === "USD").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

case "fi_usd_hy": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        const SAMDP_DEBT_ISIN = "LU1545753169";
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
        if (entries.length > 0) entries.filter((e: any) => e.credit_type === "HY" && e.currency === "USD").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });   
      });
      return total;
    }

case "fi_em_local": {
      let total = 0;
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
const SAMDP_DEBT_ISIN = "LU1545753169";
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
        if (entries.length > 0) entries.filter((e: any) => e.credit_type === "EM Debt").forEach((e: any) => { total += (h.weight ?? 0) * e.weight / 100; });
      });
      return total;
    }

case "fi_global": {
      let total = 0;
      const KNOWN_TYPES = ["Govies", "IG", "HY", "EM Debt", "NR", "Others"];
      holdings.filter(h => FI_CATS.includes(h?.category ?? "")).forEach(h => {
        const cbd = h.isin ? creditBreakdowns[h.isin] : null;
        const SAMDP_DEBT_ISIN = "LU1545753169";
        const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
        const dpamCredit = h.isin ? dpamLookup[h.isin]?.creditBreakdown : null;
        const entries = cbd ?? samdpDebt ?? dpamCredit ?? [];
        if (entries.length > 0) {
          entries.forEach((e: any) => {
            const currency = (e.currency ?? "").toUpperCase();
            const isEurKnown = currency === "EUR" && ["Govies", "IG", "HY", "NR"].includes(e.credit_type);
            const isUsdCovered = currency === "USD";
            const isEmDebt = e.credit_type === "EM Debt";
            if (!isEurKnown && !isUsdCovered && !isEmDebt) {
              total += (h.weight ?? 0) * e.weight / 100;
            }
          });
        } else {
          total += h.weight ?? 0;
        }
      });
      return total;
    }

case "short_term": {
      const base = holdings
        .filter(h => ["Short Term", "Cash", "Liquidities"].includes(h?.category ?? ""))
        .reduce((s, h) => s + (h.weight ?? 0), 0);
      const equityCash = holdings.reduce((s, h) => s + getEquityCashWeight(h), 0);
      return base + equityCash;
    }

    case "st_eur":
      return holdings
        .filter(h => ["Short Term", "Cash", "Liquidities"].includes(h?.category ?? ""))
        .reduce((s, h) => (h.currency ?? "").toUpperCase() === "EUR" ? s + (h.weight ?? 0) : s, 0);

    case "st_usd":
      return holdings
        .filter(h => ["Short Term", "Cash", "Liquidities"].includes(h?.category ?? ""))
        .reduce((s, h) => (h.currency ?? "").toUpperCase() === "USD" ? s + (h.weight ?? 0) : s, 0);

    case "st_other": {
      const base = holdings
        .filter(h => ["Short Term", "Cash", "Liquidities"].includes(h?.category ?? ""))
        .reduce((s, h) => !["EUR", "USD"].includes((h.currency ?? "").toUpperCase()) ? s + (h.weight ?? 0) : s, 0);
      const equityCash = holdings.reduce((s, h) => s + getEquityCashWeight(h), 0);
      return base + equityCash;
    }
    default:
      return null;
  }
}


function getInstrumentDuration(
  isin: string | null | undefined,
  durations: Record<string, { duration: number; updated_at: string }>,
  dpamLookup: Record<string, any>,
  samdpDebtInstruments: any[]
): number | null {
  if (!isin) return null;
  if (durations[isin]) return durations[isin].duration;
  const SAMDP_DEBT_ISIN = "LU1545753169";
  if (isin === SAMDP_DEBT_ISIN && samdpDebtInstruments.length > 0) {
    const leafRows = samdpDebtInstruments.filter((i: any) => i.level === 2 && i.isin);
    const totalW = leafRows.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
    if (totalW === 0) return null;
    return +(leafRows.reduce((s: number, i: any) => s + Number(i.modified_duration ?? 0) * Number(i.wght_pct ?? 0), 0) / totalW).toFixed(2);
  }
  const dpamDur = dpamLookup[isin]?.duration;
  if (dpamDur != null) return dpamDur;
  return null;
}

function computePtfDuration(
  holdings: any[],
  durations: Record<string, { duration: number; updated_at: string }>,
  dpamLookup: Record<string, any>,
  samdpDebtInstruments: any[]
): number | null {
  const FI_CATS = ["Fixed Income", "Bonds", "Liquidities"];
  const fi = holdings.filter(h => h && FI_CATS.includes(h.category ?? "") &&
    (h.isin ? (getInstrumentDuration(h.isin, durations, dpamLookup, samdpDebtInstruments) != null || h.category === "Liquidities") : h.category === "Liquidities"));
  const total = fi.reduce((s, h) => s + (h.weight ?? 0), 0);
  if (total === 0) return null;
  const weighted = fi.reduce((s, h) => s + (h.weight ?? 0) * (getInstrumentDuration(h.isin, durations, dpamLookup, samdpDebtInstruments) ?? 0), 0);
  return +(weighted / total).toFixed(2);
}

function BreakdownDeviationTable({
  allPortfolios,
  targetGridData,
  breakdowns,
  creditBreakdowns,
  dpamLookup,
  samdpGeoBreakdown,
  samdpDebtCreditBreakdown,
  durations,
  samdpDebtInstruments,
  samdpEquityCashPct,
  samdpDebtCashPct,
}: {
  allPortfolios: any[];
  targetGridData: Record<string, any>;
  breakdowns: Record<string, any[]>;
  creditBreakdowns: Record<string, any[]>;
  dpamLookup: Record<string, any>;
samdpGeoBreakdown: { region: string; weight: number }[] | null;
samdpEquityCashPct: number;
  samdpDebtCashPct: number;
  samdpDebtCreditBreakdown: { credit_type: string; currency: string; weight: number }[] | null;
  durations: Record<string, { duration: number; updated_at: string }>;
  samdpDebtInstruments: any[];
}) {
  
  const [portfolioType, setPortfolioType] = React.useState<PortfolioType>("Sicav");
  const [showBDS, setShowBDS] = React.useState(false);
  const [showVH, setShowVH] = React.useState(false);const [collapsedRows, setCollapsedRows] = React.useState<Set<string>>(new Set(["fi_usd", "alternatives"]));
  const [drillDown, setDrillDown] = React.useState<{ rowId: string; rowLabel: string; profile: ProfileKey; ptf: any } | null>(null);
  const [portfolioFilter, setPortfolioFilter] = React.useState<PortfolioFilter>("main");

  const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(" ");

  // Portefeuilles filtrés par type, triés par profil
const portfoliosByProfile = React.useMemo(() => {
    const map: Partial<Record<ProfileKey, any>> = {};
    const filtered = allPortfolios.filter(p => p?.type === portfolioType);
    const filterFn = PORTFOLIO_FILTERS[portfolioFilter];
    const list = filtered.filter(p => filterFn(p.name ?? ""));
list.forEach(p => {
      const profile = portfolioToProfile(p.name ?? "");
      if (profile) map[profile] = p;
    });
    return map;
  }, [allPortfolios, portfolioType, portfolioFilter]);

  // Profils visibles selon les toggles
  const visibleProfiles = React.useMemo(() => {
    return PROFILE_ORDER_ALL.filter(p => {
      if (p === "BDS") return showBDS;
      if (p === "VH") return showVH;
      return PROFILE_DEFAULT_VISIBLE.includes(p);
    });
  }, [showBDS, showVH]);

const fmt = (v: number | null) => v == null ? "—" : v.toFixed(1) + "%";

  console.log("BDT dpamLookup keys:", Object.keys(dpamLookup));

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

{/* Toggle portefeuilles */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(["main", "sust", "cv", "rdt"] as PortfolioFilter[]).map(f => (
            <button key={f} onClick={() => setPortfolioFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                portfolioFilter === f ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {PORTFOLIO_FILTER_LABELS[f]}
            </button>
          ))}
        </div>
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
                          ? (row.id === "modified_duration"
                              ? computePtfDuration(ptf.holdings ?? [], durations, dpamLookup, samdpDebtInstruments)
                              : computePtfWeight(row.id, ptf.holdings ?? [], breakdowns, creditBreakdowns, dpamLookup, samdpGeoBreakdown, samdpDebtCreditBreakdown, samdpEquityCashPct, samdpDebtCashPct))
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
                              {col === "Ptf" && ptfVal != null && ptf ? (
                              <button onClick={() => setDrillDown({ rowId: row.id, rowLabel: row.label, profile, ptf })}
                                className="hover:underline font-medium text-sky-700">
                                {row.id === "modified_duration" ? ptfVal.toFixed(2) : ptfVal.toFixed(1) + "%"}
                              </button>
                            ) : displayVal != null ? (row.id === "modified_duration" ? displayVal.toFixed(2) : displayVal.toFixed(1) + "%") : "—"}
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

{drillDown && drillDown.rowId === "modified_duration" && (() => {
  const { rowLabel, profile, ptf } = drillDown;
  const FIXED_INCOME_CATS = ["Fixed Income", "Bonds", "Liquidities"];
  const allFiHoldings = (ptf.holdings ?? [])
    .filter((h: any) => h && FIXED_INCOME_CATS.includes(h.category ?? ""))
    .sort((a: any, b: any) => (b.weight ?? 0) - (a.weight ?? 0));
  const fiHoldings = allFiHoldings.filter((h: any) =>
    h.isin ? (getInstrumentDuration(h.isin, durations, dpamLookup, samdpDebtInstruments) != null || h.category === "Liquidities") : h.category === "Liquidities"
  );
  const totalWeight = fiHoldings.reduce((s: number, h: any) => s + (h.weight ?? 0), 0);
  const ptfDuration = computePtfDuration(ptf.holdings ?? [], durations, dpamLookup, samdpDebtInstruments);

  return (
    <Modal isOpen={true} onClose={() => setDrillDown(null)} title={`${rowLabel} — ${profile}`}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 italic">Duration moyenne pondérée pour le portefeuille {ptf.name}.</p>
        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instruments utilisés ({fiHoldings.length} / {allFiHoldings.length})</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-32 overflow-y-auto">
            {allFiHoldings.map((h: any, i: number) => {
              const hasDur = h.category === "Liquidities" || (h.isin && getInstrumentDuration(h.isin, durations, dpamLookup, samdpDebtInstruments) != null);
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
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Instrument</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Poids</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Duration</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Contribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {fiHoldings.map((h: any, i: number) => {
              const dur = Number(getInstrumentDuration(h.isin, durations, dpamLookup, samdpDebtInstruments) ?? 0);
              const contribution = totalWeight > 0 ? (h.weight ?? 0) * dur / totalWeight : 0;
              return (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 truncate max-w-[200px]">
                    <p className="font-medium text-slate-900">{h.asset_name ?? "—"}</p>
                    <p className="text-xs font-mono text-slate-400">{h.isin ?? "—"}</p>
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
              <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-500 text-xs italic">Σ(poids × duration) / {totalWeight.toFixed(1)}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{ptfDuration != null ? ptfDuration.toFixed(2) : "—"}</td>
            </tr>
          </tfoot>
        </table>
        <p className="text-[10px] text-slate-400 italic text-center">
          Les instruments en grisé n'ont pas de duration configurée et ne sont pas inclus dans le calcul.
        </p>
      </div>
    </Modal>
  );
})()}
    {drillDown && drillDown.rowId !== "modified_duration" && (() => {
  const { rowId, rowLabel, profile, ptf } = drillDown;
  const FI_CATS = ["Fixed Income", "Bonds"];
  const holdings = ptf.holdings ?? [];

const getEquityCashWeightModal = (h: any): number => {
    const SAMDP_DEBT_ISIN_CASH = "LU1545753169";
    if (h.isin === SAMDP_DEBT_ISIN_CASH) {
      return (h.weight ?? 0) * samdpDebtCashPct / 100;
    }
    if (h?.category !== "Equities") return 0;
    const bd0 = h.isin ? breakdowns[h.isin] : null;
if (h.isin === "LU1795355053") {
      return (h.weight ?? 0) * samdpEquityCashPct;
    }
    if (bd0 && bd0.length > 0) {
      return bd0.filter((e: any) => e.region === "Cash").reduce((s: number, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
    }
    const dpamGeo0 = h.isin ? dpamLookup[h.isin]?.geoBreakdown : null;
    if (dpamGeo0 && dpamGeo0.length > 0) {
      return dpamGeo0.filter((e: any) => e.region === "Cash").reduce((s: number, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
    }
    return 0;
  };

const rows = holdings.map((h: any) => {
    const cbd = h.isin ? creditBreakdowns[h.isin] : null;
    const SAMDP_DEBT_ISIN = "LU1545753169";
    const samdpDebt = h.isin === SAMDP_DEBT_ISIN ? samdpDebtCreditBreakdown : null;
    const entries = cbd ?? samdpDebt ?? (h.isin ? dpamLookup[h.isin]?.creditBreakdown : null) ?? [];
    const bd = h.isin ? breakdowns[h.isin] : null;
    const dpamGeo = h.isin ? dpamLookup[h.isin]?.geoBreakdown : null;

    let exposition: number | null = null;

if (rowId === "equities") {
      if (h.category !== "Equities") return null;
      if (h.isin === "LU1795355053" && samdpGeoBreakdown) {
        exposition = samdpGeoBreakdown.filter((e: any) => e.region !== "Cash").reduce((s: number, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
      } else if (bd && bd.length > 0) {
        exposition = bd.filter((e: any) => e.region !== "Cash").reduce((s: any, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
      } else if (dpamGeo && dpamGeo.length > 0) {
        exposition = dpamGeo.filter((e: any) => e.region !== "Cash").reduce((s: any, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
      } else {
        exposition = h.weight ?? 0;
      }
    } else if (["eq_europe","eq_us","eq_em","eq_japan","eq_other"].includes(rowId)) {
      if (h.category !== "Equities") return null;
      const regionMap: Record<string, string> = { eq_europe: "Europe", eq_us: "US", eq_em: "EM", eq_japan: "Japan", eq_other: "Others" };
      const targetRegion = regionMap[rowId];
      const normalizeR = (r: string) => {
        if (["Europe","Europe ex-Euroland","Euroland"].includes(r)) return "Europe";
        if (["US","North America"].includes(r)) return "US";
        if (["Emerging and Frontier Markets","Emerging Markets"].includes(r)) return "EM";
        if (["Other"].includes(r)) return "Others";
        return r;
      };
      if (h.isin === "LU1795355053" && samdpGeoBreakdown) {
        exposition = samdpGeoBreakdown.filter((e: any) => normalizeR(e.region) === targetRegion).reduce((s: number, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
      } else if (bd && bd.length > 0) {
        exposition = bd.filter((e: any) => normalizeR(e.region) === targetRegion).reduce((s: any, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
      } else if (dpamGeo && dpamGeo.length > 0) {
        exposition = dpamGeo.filter((e: any) => normalizeR(e.region) === targetRegion).reduce((s: any, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
      } else {
        exposition = normalizeR(h.region ?? "") === targetRegion ? (h.weight ?? 0) : 0;
      }
    } else if (rowId === "fixed_income") {
      if (!FI_CATS.includes(h.category ?? "")) return null;
      exposition = h.weight ?? 0;
    } else if (["fi_eur","fi_eur_gov","fi_eur_ig","fi_eur_hy","fi_usd","fi_usd_gov","fi_usd_ig","fi_usd_hy","fi_em_local","fi_global","fixed_income"].includes(rowId)) {
      if (!FI_CATS.includes(h.category ?? "")) return null;
      // Calcul d'exposition pour un holding individuel en isolant sa contribution
      const holdingOnly = [h];
const val = computePtfWeight(rowId, holdingOnly, breakdowns, creditBreakdowns, dpamLookup, samdpGeoBreakdown, samdpDebtCreditBreakdown, samdpEquityCashPct, samdpDebtCashPct);
      exposition = val ?? 0;
} else if (rowId === "short_term") {
      if (["Short Term","Cash","Liquidities"].includes(h.category ?? "")) {
        exposition = h.weight ?? 0;
      } else if (h.category === "Equities" || FI_CATS.includes(h.category ?? "")) {
        const cashW = getEquityCashWeightModal(h);
        if (cashW <= 0.001) return null;
        exposition = cashW;
      } else return null;
    } else if (["st_eur", "st_usd"].includes(rowId)) {
      if (!["Short Term","Cash","Liquidities"].includes(h.category ?? "")) return null;
      const cur = (h.currency ?? "").toUpperCase();
      if (rowId === "st_eur" && cur !== "EUR") return null;
      if (rowId === "st_usd" && cur !== "USD") return null;
      exposition = h.weight ?? 0;
} else if (rowId === "st_other") {
      if (["Short Term","Cash","Liquidities"].includes(h.category ?? "")) {
        const cur = (h.currency ?? "").toUpperCase();
        if (["EUR", "USD"].includes(cur)) return null;
        exposition = h.weight ?? 0;
      } else if (h.category === "Equities" || FI_CATS.includes(h.category ?? "")) {
        const cashW = getEquityCashWeightModal(h);
        if (cashW <= 0.001) return null;
        exposition = cashW;
      } else return null;
    } else if (rowId === "alternatives") {
      if (!["Alternatives","Gold"].includes(h.category ?? "")) return null;
      exposition = h.weight ?? 0;
    } else if (rowId === "alt_gold") {
      if (h.category !== "Gold") return null;
      exposition = h.weight ?? 0;
    } else {
      return null;
    }

    if (exposition === null || exposition <= 0.001) return null;
    return { name: h.asset_name ?? "—", isin: h.isin ?? "—", weight: h.weight ?? 0, exposition };
  }).filter(Boolean).sort((a: any, b: any) => b.exposition - a.exposition);

  return (
    <Modal isOpen={true} onClose={() => setDrillDown(null)} title={`${rowLabel} — ${profile}`}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 italic">Détail du calcul pour le portefeuille {ptf.name}.</p>
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Instrument</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Poids PTF</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Exposition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 truncate max-w-[260px]">{r.name}</p>
                  <p className="text-xs font-mono text-slate-400">{r.isin}</p>
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{r.weight.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right font-bold text-sky-600">{r.exposition.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={2} className="px-4 py-3 font-bold text-slate-700 text-right">Total</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">
                {rows.reduce((s: number, r: any) => s + r.exposition, 0).toFixed(2)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Modal>
  );
})()}
    </div>
  );
}

const PERF_SECTIONS = [
  {
    title: "PROTECT",
    profiles: [{ key: "BDS", label: "100% Bonds" }, { key: "LOW", label: "Low" }, { key: "MEDLOW", label: "Medium Low" }],
    rowGroups: [
      { label: "MODEL PORTFOLIOS", codes: ["DP_SCV_", "DP_MIX_", "DP_SCV_RESP_", "DP_MIX_RESP_", "DP_SCV_T_", "DP_SCV_CV_", "DP_CONVICTION_"] },
      { label: "CORE", codes: ["DP_PAT_R2_", "DP_PAT_S3_", "DP_PAT_S4_"] },
      { label: "FUNDS", codes: ["GS_", "SUST_"] },
    ],
  },
  {
    title: "GROWTH",
    profiles: [{ key: "MEDIUM", label: "Medium" }, { key: "MEDHIGH", label: "Medium High" }, { key: "HIGH", label: "High" }],
    rowGroups: [
      { label: "MODEL PORTFOLIOS", codes: ["DP_SCV_", "DP_MIX_", "DP_SCV_RESP_", "DP_MIX_RESP_", "DP_SCV_T_", "DP_SCV_CV_", "DP_CONVICTION_"] },
      { label: "CORE +", codes: ["DP_PAT_R2_", "DP_PAT_S3_", "DP_PAT_S4_"] },
      { label: "FUNDS", codes: ["GS_", "SUST_", "SEL_", "FLEX_"] },
    ],
  },
  {
    title: "100% EQUITY",
    profiles: [{ key: "VH", label: "Equity" }],
    rowGroups: [
      { label: "MODEL PORTFOLIOS", codes: ["DP_SCV_", "DP_MIX_", "DP_SCV_T_", "DP_VI_EQ", "DP_VI_VH", "DP_VI_RE"] },
      { label: "", codes: ["DP_CONVICTION_"] },
    ],
  },
];

function PerformanceTab({ performanceData }: { performanceData: PerformanceRow[] }) {
const [drillDown, setDrillDown] = React.useState<{ report_code: string; label: string; profile: string; profileLabel: string } | null>(null);
const [drillMode, setDrillMode] = React.useState<"byProfile" | "byPortfolio">("byProfile");
  const [tableSort, setTableSort] = React.useState<{ key: "label" | "mtd" | "ytd" | "y2025"; dir: 1 | -1 }>({ key: "ytd", dir: -1 });

  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!drillDown) return;
    if (drillMode === "byProfile") setSelectedItems(new Set([drillDown.report_code]));
    else setSelectedItems(new Set([drillDown.profile]));
  }, [drillDown, drillMode]);

  function toggleItem(key: string) {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function SortableTh({ label, sortKey, sortState, setSortState, align }: {
    label: string; sortKey: "label" | "mtd" | "ytd" | "y2025";
    sortState: { key: string; dir: 1 | -1 }; setSortState: (s: { key: "label" | "mtd" | "ytd" | "y2025"; dir: 1 | -1 }) => void;
    align: "left" | "right";
  }) {
    const active = sortState.key === sortKey;
    return (
      <th
        onClick={() => setSortState({ key: sortKey, dir: active ? (sortState.dir === 1 ? -1 : 1) : (sortKey === "label" ? 1 : -1) })}
        className={cn("px-4 py-2 text-xs font-bold uppercase cursor-pointer select-none hover:text-slate-700 transition-colors",
          align === "right" ? "text-right" : "text-left", active ? "text-slate-900" : "text-slate-500")}>
        <span className="inline-flex items-center gap-1">
          {label}
          {active && (sortState.dir === 1 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
        </span>
      </th>
    );
  }

  const latestDate = React.useMemo(() => {
    if (performanceData.length === 0) return null;
    return performanceData.reduce((max, r) => (r.report_date > max ? r.report_date : max), performanceData[0].report_date);
  }, [performanceData]);

  const latestRows = React.useMemo(
    () => performanceData.filter(r => r.report_date === latestDate),
    [performanceData, latestDate]
  );

  const lookup = React.useMemo(() => {
    const m = new Map<string, PerformanceRow>();
    latestRows.forEach(r => m.set(`${r.report_code}__${r.profile}`, r));
    return m;
  }, [latestRows]);

  const cellColor = (v: number | null | undefined) => {
    if (v == null) return "text-slate-300";
    if (v > 0) return "text-emerald-600";
    if (v < 0) return "text-rose-600";
    return "text-slate-500";
  };

const sectionMaxAbs = React.useMemo(() => {
    const m = new Map<string, number>();
    PERF_SECTIONS.forEach(section => {
      section.profiles.forEach(p => {
        (["mtd", "ytd", "y2025"] as const).forEach(metric => {
          let max = 0;
          section.rowGroups.forEach(rg => {
            rg.codes.forEach(code => {
              const row = lookup.get(`${code}__${p.key}`);
              const v = row?.[metric];
              if (v != null) max = Math.max(max, Math.abs(v));
            });
          });
          m.set(`${section.title}__${p.key}__${metric}`, max || 1);
        });
      });
    });
    return m;
  }, [lookup]);

function PerfCell({ value, maxAbs, thickBorder, onClick }: { value: number | null | undefined; maxAbs: number; thickBorder?: boolean; onClick?: () => void }) {
    const borderClass = thickBorder ? "border-l-2 border-slate-300" : "";
    const clickClass = onClick ? "cursor-pointer hover:bg-slate-50" : "";
    if (value == null) return <td onClick={onClick} className={cn("px-2 py-2.5 text-right text-slate-300", borderClass, clickClass)}>—</td>;
    const pct = Math.min(100, (Math.abs(value) / maxAbs) * 100);
    const positive = value >= 0;
    return (
      <td onClick={onClick} className={cn("px-2 py-2.5 text-right relative", borderClass, clickClass)}>
        <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none px-2">
          <div className={cn("h-4 rounded-sm transition-all", positive ? "bg-emerald-100 mr-auto" : "bg-rose-100 ml-auto")}
            style={{ width: `${pct}%` }} />
        </div>
        <span className={cn("relative font-medium", positive ? "text-emerald-700" : "text-rose-700")}>
          {value.toFixed(2)}%
        </span>
      </td>
    );
  }
  
const historyForCode = React.useMemo(() => {
    if (!drillDown) return [];
    return performanceData
      .filter(r => r.report_code === drillDown.report_code)
      .sort((a, b) => a.report_date.localeCompare(b.report_date));
  }, [performanceData, drillDown]);

  const historyForProfile = React.useMemo(() => {
    if (!drillDown) return [];
    return performanceData
      .filter(r => r.profile === drillDown.profile)
      .sort((a, b) => a.report_date.localeCompare(b.report_date));
  }, [performanceData, drillDown]);

  const codeLabels = React.useMemo(() => {
    const m = new Map<string, string>();
    performanceData.forEach(r => m.set(r.report_code, r.label));
    return m;
  }, [performanceData]);

  if (!latestDate) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
        Aucune donnée de performance importée pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-10">


      {PERF_SECTIONS.map(section => (
        <div key={section.title} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-6 py-3">
            <h3 className="text-white font-bold text-sm tracking-wider">{section.title}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50/50"></th>
                  {section.profiles.map(p => (
                    <th key={p.key} colSpan={3} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-center border-l-2 border-slate-300">
                      {p.label}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-50/30">
                  <th className="px-6 py-2 sticky left-0 bg-slate-50/30"></th>
                  {section.profiles.map(p => (
                    <React.Fragment key={p.key}>
                      <th className="px-2 py-1 text-[10px] font-bold text-slate-400 text-right border-l-2 border-slate-300">MTD</th>
                      <th className="px-2 py-1 text-[10px] font-bold text-slate-400 text-right">YTD</th>
                      <th className="px-2 py-1 text-[10px] font-bold text-slate-400 text-right">2025</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {section.rowGroups.map((rg, rgi) => (
                  <React.Fragment key={rgi}>
                    {rg.label && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={1 + section.profiles.length * 3} className="px-6 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {rg.label}
                        </td>
                      </tr>
                    )}
                    {rg.codes.map(code => {
                      const anyRow = section.profiles.map(p => lookup.get(`${code}__${p.key}`)).find(Boolean);
                      if (!anyRow) return null;
                      return (
                          <tr key={code} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-2.5 font-medium text-slate-800 sticky left-0 bg-white whitespace-nowrap">
                            {anyRow.label}
                          </td>
                          {section.profiles.map(p => {
                            const row = lookup.get(`${code}__${p.key}`);
                            const onCellClick = () => {
                              setDrillMode("byProfile");
                              setDrillDown({ report_code: code, label: anyRow.label, profile: p.key, profileLabel: p.label });
                            };
                            return (
                              <React.Fragment key={p.key}>
                                <PerfCell value={row?.mtd} maxAbs={sectionMaxAbs.get(`${section.title}__${p.key}__mtd`) ?? 1} thickBorder onClick={onCellClick} />
                                <PerfCell value={row?.ytd} maxAbs={sectionMaxAbs.get(`${section.title}__${p.key}__ytd`) ?? 1} onClick={onCellClick} />
                                <PerfCell value={row?.y2025} maxAbs={sectionMaxAbs.get(`${section.title}__${p.key}__y2025`) ?? 1} onClick={onCellClick} />
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

     {/* ── Modale historique ── */}
      {/* ── Modale historique ── */}
      <Modal isOpen={!!drillDown} onClose={() => setDrillDown(null)}
        title={drillMode === "byProfile" ? `Profil ${drillDown?.profileLabel ?? ""}` : (drillDown?.label ?? "")}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setDrillMode("byProfile")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  drillMode === "byProfile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                Comparer les portefeuilles ({drillDown?.profileLabel})
              </button>
              <button onClick={() => setDrillMode("byPortfolio")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  drillMode === "byPortfolio" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                Tous les profils ({drillDown?.label})
              </button>
            </div>
            {latestDate && (
              <span className="text-xs text-slate-400">
                Au {new Date(latestDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            )}
          </div>

          {drillMode === "byProfile" ? (
            historyForProfile.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-8">Aucun historique disponible.</p>
            ) : (
              <>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={
                      Array.from(new Set(historyForProfile.map(r => r.report_date))).map(date => {
                        const entry: any = { date };
                        historyForProfile.filter(r => r.report_date === date).forEach(r => {
                          entry[r.report_code] = r.ytd;
                        });
                        return entry;
                      })
                    } margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(d) => new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v.toFixed(1) + "%"} />
                      <Tooltip contentStyle={{ borderRadius: "16px", border: "none" }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                        formatter={(v: number, name: string) => [v.toFixed(2) + "%", codeLabels.get(name) ?? name]} />
                      {Array.from(new Set(historyForProfile.map(r => r.report_code)))
                        .filter(code => selectedItems.has(code))
                        .map((code, i) => (
                        <Line key={code} type="monotone" dataKey={code} name={code}
                          stroke={["#0ea5e9", "#f59e0b", "#8b5cf6", "#10b981", "#ec4899", "#14b8a6", "#ef4444", "#6366f1", "#84cc16", "#f97316"][i % 10]}
                          strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-400 italic text-center">Évolution du YTD par portefeuille, pour le profil {drillDown?.profileLabel}.</p>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2 w-8"></th>
                      <SortableTh label="Portefeuille" sortKey="label" sortState={tableSort} setSortState={setTableSort} align="left" />
                      <SortableTh label="MTD" sortKey="mtd" sortState={tableSort} setSortState={setTableSort} align="right" />
                      <SortableTh label="YTD" sortKey="ytd" sortState={tableSort} setSortState={setTableSort} align="right" />
                      <SortableTh label="2025" sortKey="y2025" sortState={tableSort} setSortState={setTableSort} align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {historyForProfile
                      .filter(r => r.report_date === latestDate)
                      .sort((a, b) => {
                        const { key, dir } = tableSort;
                        if (key === "label") return dir * a.label.localeCompare(b.label);
                        const av = a[key] ?? -Infinity;
                        const bv = b[key] ?? -Infinity;
                        return dir * (bv - av);
                      })
                      .map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2">
                          <input type="checkbox" checked={selectedItems.has(r.report_code)} onChange={() => toggleItem(r.report_code)}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer" />
                        </td>
                        <td className="px-4 py-2 text-slate-600">{r.label}</td>
                        <td className={cn("px-4 py-2 text-right font-medium", cellColor(r.mtd))}>{r.mtd != null ? r.mtd.toFixed(2) + "%" : "—"}</td>
                        <td className={cn("px-4 py-2 text-right font-medium", cellColor(r.ytd))}>{r.ytd != null ? r.ytd.toFixed(2) + "%" : "—"}</td>
                        <td className={cn("px-4 py-2 text-right font-medium", cellColor(r.y2025))}>{r.y2025 != null ? r.y2025.toFixed(2) + "%" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )
          ) : (
            historyForCode.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-8">Aucun historique disponible.</p>
            ) : (
              <>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={
                      Array.from(new Set(historyForCode.map(r => r.report_date))).map(date => {
                        const entry: any = { date };
                        historyForCode.filter(r => r.report_date === date).forEach(r => {
                          entry[r.profile] = r.ytd;
                        });
                        return entry;
                      })
                    } margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(d) => new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => v.toFixed(1) + "%"} />
                      <Tooltip contentStyle={{ borderRadius: "16px", border: "none" }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                        formatter={(v: number, name: string) => [v.toFixed(2) + "%", name]} />
                      {Array.from(new Set(historyForCode.map(r => r.profile)))
                        .filter(profile => selectedItems.has(profile))
                        .map((profile, i) => (
                        <Line key={profile} type="monotone" dataKey={profile} name={profile}
                          stroke={["#0ea5e9", "#f59e0b", "#8b5cf6", "#10b981", "#ec4899", "#14b8a6", "#ef4444"][i % 7]}
                          strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-400 italic text-center">Évolution du YTD par profil de risque, au fil des imports.</p>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2 w-8"></th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Profil</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">MTD</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">YTD</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">2025</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {historyForCode
                      .filter(r => r.report_date === latestDate)
                      .map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2">
                          <input type="checkbox" checked={selectedItems.has(r.profile)} onChange={() => toggleItem(r.profile)}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer" />
                        </td>
                        <td className="px-4 py-2 text-slate-600">{r.profile}</td>
                        <td className={cn("px-4 py-2 text-right font-medium", cellColor(r.mtd))}>{r.mtd != null ? r.mtd.toFixed(2) + "%" : "—"}</td>
                        <td className={cn("px-4 py-2 text-right font-medium", cellColor(r.ytd))}>{r.ytd != null ? r.ytd.toFixed(2) + "%" : "—"}</td>
                        <td className={cn("px-4 py-2 text-right font-medium", cellColor(r.y2025))}>{r.y2025 != null ? r.y2025.toFixed(2) + "%" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )
          )}
        </div>
      </Modal>
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
  equityData,
  onUpload,
  uploading,
  uploadSuccess,
  mappings,
  onSaveMapping,
  onDeleteMapping,
}: {
  bondsData: any | null;
  equityData: any | null;
  onUpload: (file: File) => void;
  uploading: boolean;
  uploadSuccess: boolean;
  mappings: any[];
  onSaveMapping: (isin: string, dpam_type: string, col_index: number, instrument_name: string) => Promise<void>;
  onDeleteMapping: (isin: string) => Promise<void>;
}) {
  const [view, setView] = React.useState<DpamView>("Bonds");
  const [selectedCol, setSelectedCol] = React.useState<number | null>(null);
 const [newMappingIsin, setNewMappingIsin] = React.useState("");
const [newMappingType, setNewMappingType] = React.useState<"bonds" | "equity">("bonds");
const [newMappingCol, setNewMappingCol] = React.useState<number | null>(null);
const [mappingSaving, setMappingSaving] = React.useState(false);
  const [mappingSearch, setMappingSearch] = React.useState("");
  const [bondsSearch, setBondsSearch] = React.useState("");
const [equitySearch, setEquitySearch] = React.useState("");
  
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
 
const fmtNum = (v: any, dec = 2) => v != null ? Number(v).toFixed(dec) : "—";
const fmtPct = (v: any) => v != null ? Number(v).toFixed(1) + "%" : "—";
 
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

{/* ── 3 cases import ── */}
<div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-2">
  {/* Import */}
  <label className="flex items-center gap-2 border border-dashed border-slate-200 rounded-xl px-3 py-1.5 hover:border-sky-400 transition-all group cursor-pointer shrink-0">
    <input type="file" accept=".xlsx" onChange={handleFile} className="hidden" />
    <Upload className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-600" />
    <span className="text-xs font-bold text-slate-700">Importer</span>
    {uploading
      ? <Loader2 className="h-3 w-3 text-sky-600 animate-spin" />
      : uploadSuccess
        ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        : null
    }
  </label>

  <div className="w-px h-6 bg-slate-100 shrink-0" />

  {/* Equity */}
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <div className={cn("w-2 h-2 rounded-full shrink-0", equityData ? "bg-sky-400" : "bg-slate-200")} />
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Equity</span>
    {equityData
      ? <span className="text-[10px] text-slate-400 truncate">{equityData.importLog.filename} · {new Date(equityData.importLog.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
      : <span className="text-[10px] text-slate-300 italic">Aucun import</span>
    }
  </div>

  <div className="w-px h-6 bg-slate-100 shrink-0" />

  {/* Bonds */}
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <div className={cn("w-2 h-2 rounded-full shrink-0", bondsData ? "bg-emerald-400" : "bg-slate-200")} />
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Bonds</span>
    {bondsData
      ? <span className="text-[10px] text-slate-400 truncate">{bondsData.importLog.filename} · {new Date(bondsData.importLog.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
      : <span className="text-[10px] text-slate-300 italic">Aucun import</span>
    }
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
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
  <div className="flex items-center gap-3">
    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Fonds</span>
    <div className="flex items-center gap-2 flex-1 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
      <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <input type="text" value={bondsSearch}
        onChange={e => setBondsSearch(e.target.value)}
        placeholder="Rechercher un fonds…"
        className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
    </div>
  </div>
  <div className="flex flex-wrap gap-2">
{mainInstruments
      .filter((inst: any) => inst.name.toLowerCase().includes(bondsSearch.toLowerCase()))
      .map((inst: any) => {
        const isMapped = mappings.some((m: any) => m.instrument_name === inst.name && m.dpam_type === "bonds");
        return (
          <button key={inst.col_index}
            onClick={() => setSelectedCol(inst.col_index)}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
              selectedCol === inst.col_index
                ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                : isMapped
                  ? "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                  : "bg-white text-slate-400 border-slate-200 hover:border-sky-300 italic")}>
            {inst.name.replace("DPAM B BONDS ", "").replace("DPAM L BONDS ", "").trim()}
          </button>
        );
      })}
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
      { label: "Modified Duration", value: selGlobal.modified_duration != null ? fmtNum(selGlobal.modified_duration) : "—" },
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
                                {inst.name.replace("DPAM B BONDS ", "").replace("DPAM L BONDS ", "").trim()}
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
        <>
          {!equityData ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
              <TableIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Aucune donnée. Importez un fichier Equity Funds Summary.</p>
            </div>
          ) : (
            <>
              {/* ── Selector instrument ── */}
<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
  <div className="flex items-center gap-3">
    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Fonds</span>
    <div className="flex items-center gap-2 flex-1 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
      <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
<input type="text" value={equitySearch}
  onChange={e => setEquitySearch(e.target.value)}
        placeholder="Rechercher un fonds…"
        className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
    </div>
  </div>
  <div className="flex flex-wrap gap-2">
{(equityData.instruments ?? [])
  .filter((inst: any) => inst.name.toLowerCase().includes(equitySearch.toLowerCase()))
  .map((inst: any) => {
    const isMapped = mappings.some((m: any) => m.instrument_name === inst.name && m.dpam_type === "equity");
    return (
      <button key={inst.col_index}
        onClick={() => setSelectedCol(inst.col_index)}
        className={cn("px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
          selectedCol === inst.col_index
            ? "bg-sky-600 text-white border-sky-600 shadow-sm"
            : isMapped
              ? "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
              : "bg-white text-slate-400 border-slate-200 hover:border-sky-300 italic")}>
      {inst.name
        .replace("DPAM B EQUITIES ", "")
        .replace("DPAM L EQUITIES ", "")
        .replace("DPAM B REAL ESTATE ", "REAL ESTATE ")
        .replace("DPAM DBI RDT B EQUITIES ", "DBI RDT ")}
    </button>
    );
  })}
  </div>
</div>
 
              {/* ── Fiche détail ── */}
              {(() => {
                const selInst = (equityData.instruments ?? []).find((i: any) => i.col_index === selectedCol);
                const selGlob = (equityData.globals ?? []).find((g: any) => g.instrument_col === selectedCol);
                const selSectors = (equityData.sectors ?? [])
                  .filter((s: any) => s.instrument_col === selectedCol && (s.weight ?? 0) > 0.001)
                  .sort((a: any, b: any) => (b.weight ?? 0) - (a.weight ?? 0));
                const selCountries = (equityData.countries ?? [])
                  .filter((c: any) => c.instrument_col === selectedCol && (c.weight ?? 0) > 0.001)
                  .sort((a: any, b: any) => (b.weight ?? 0) - (a.weight ?? 0));
                const selCur = (equityData.currencies ?? []).find((c: any) => c.instrument_col === selectedCol);
 
                if (!selInst) return null;
                return (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">{selInst.name}</h3>
                    {selGlob && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { label: "Market Value", value: selGlob.market_value != null ? fmtNum(selGlob.market_value, 0) + " M€" : "—" },
                          { label: "Nb Holdings", value: selGlob.nb_holdings ?? "—" },
                          { label: "Dividend Yield", value: selGlob.dividend_yield != null ? fmtPct(selGlob.dividend_yield) : "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                            <p className="text-lg font-bold text-slate-900">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {selSectors.length > 0 && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <h4 className="text-base font-bold text-slate-900 mb-4">Exposition par Secteur</h4>
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {selSectors.map(({ sector, weight }: any) => (
                              <div key={sector} className="flex items-center gap-3">
                                <span className="text-xs text-slate-600 w-40 shrink-0 truncate">{sector}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.min(100, Number(weight) ?? 0)}%` }} />
                                </div>
                                <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{fmtPct(weight)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selCountries.length > 0 && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                          <h4 className="text-base font-bold text-slate-900 mb-4">Exposition par Pays</h4>
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {selCountries.map(({ country, weight }: any) => (
                              <div key={country} className="flex items-center gap-3">
                                <span className="text-xs text-slate-600 w-36 shrink-0 truncate">{country}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${Math.min(100, Number(weight) ?? 0)}%` }} />
                                </div>
                                <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{fmtPct(weight)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {selCur && (
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h4 className="text-base font-bold text-slate-900 mb-4">Exposition Devises</h4>
                        <div className="space-y-3">
                          {[
                            { label: "EUR", value: selCur.eur },
                            { label: "USD", value: selCur.usd },
                            { label: "JPY", value: selCur.jpy },
                            { label: "Other", value: selCur.other },
                          ].filter(({ value }) => Number(value ?? 0) > 0.05).map(({ label, value }) => (
                            <div key={label} className="flex items-center gap-3">
                              <span className="text-xs font-bold w-10 shrink-0" style={{ color: CUR_COLORS[label] ?? "#94a3b8" }}>{label}</span>
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Number(value) ?? 0)}%`, backgroundColor: CUR_COLORS[label] ?? "#94a3b8" }} />
                              </div>
                              <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{fmtPct(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
 
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
                            {(equityData.instruments ?? []).map((inst: any) => (
                              <th key={inst.col_index}
                                className="px-3 py-3 text-[10px] font-bold text-white/70 uppercase tracking-wider text-center min-w-[120px] cursor-pointer hover:text-white transition-colors"
                                onClick={() => setSelectedCol(inst.col_index)}>
                                {inst.name
                                  .replace("DPAM B EQUITIES ", "")
                                  .replace("DPAM L EQUITIES ", "")
                                  .replace("DPAM B REAL ESTATE ", "REAL ESTATE ")
                                  .replace("DPAM DBI RDT B EQUITIES ", "DBI RDT ")}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {[
                            { label: "Market Value (M€)", key: "market_value", fmt: (v: any) => fmtNum(v, 0) },
                            { label: "Nb Holdings", key: "nb_holdings", fmt: (v: any) => String(Math.round(Number(v))) },
                            { label: "Dividend Yield (%)", key: "dividend_yield", fmt: (v: any) => fmtPct(v) },
                          ].map(({ label, key, fmt }) => (
                            <tr key={key} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white z-10">{label}</td>
                              {(equityData.instruments ?? []).map((inst: any) => {
                                const g = (equityData.globals ?? []).find((g: any) => g.instrument_col === inst.col_index);
                                const val = g?.[key];
                                return <td key={inst.col_index} className="px-3 py-2.5 text-center text-slate-600">{val != null ? fmt(val) : "—"}</td>;
                              })}
                            </tr>
                          ))}
                          <tr className="bg-slate-100">
                            <td className="px-4 py-1.5 font-bold text-xs text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-100 z-10">Devises</td>
                            {(equityData.instruments ?? []).map((inst: any) => <td key={inst.col_index} />)}
                          </tr>
                          {[
                            { label: "EUR (%)", key: "eur" },
                            { label: "USD (%)", key: "usd" },
                            { label: "JPY (%)", key: "jpy" },
                            { label: "Other (%)", key: "other" },
                          ].map(({ label, key }) => (
                            <tr key={key} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white z-10">{label}</td>
                              {(equityData.instruments ?? []).map((inst: any) => {
                                const c = (equityData.currencies ?? []).find((c: any) => c.instrument_col === inst.col_index);
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
 
      {/* ── Mapping ISIN ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Mapping ISIN → Fonds DPAM</h3>
            <p className="text-slate-500 text-sm mt-1">Associe un ISIN de portefeuille à un fonds DPAM pour utiliser ses expositions.</p>
          </div>
        </div>
 
        {/* Formulaire ajout */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ISIN</label>
            <input type="text" value={newMappingIsin} onChange={e => setNewMappingIsin(e.target.value.toUpperCase())}
              placeholder="Ex: LU0123456789"
              className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none font-mono text-sm w-44" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
            <select value={newMappingType} onChange={e => { setNewMappingType(e.target.value as "bonds" | "equity"); setNewMappingCol(null); }}
              className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none text-sm bg-white">
              <option value="bonds">Bonds</option>
              <option value="equity">Equity</option>
            </select>
          </div>
<div className="relative">
  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fonds DPAM</label>
  <input
    type="text"
    value={mappingSearch || (newMappingCol ? (newMappingType === "bonds" ? bondsData?.instruments : equityData?.instruments)?.find((i: any) => i.col_index === newMappingCol)?.name?.replace("DPAM B BONDS ", "").replace("DPAM L BONDS ", "").replace("DPAM B EQUITIES ", "").replace("DPAM L EQUITIES ", "").replace("DPAM B REAL ESTATE ", "REAL ESTATE ").replace("DPAM DBI RDT B EQUITIES ", "DBI RDT ") ?? "" : "")}
    onChange={e => { setMappingSearch(e.target.value); setNewMappingCol(null); }}
    placeholder="Rechercher un fonds…"
    className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none text-sm w-64"
  />
  {mappingSearch && (
    <div className="absolute z-20 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
      {(newMappingType === "bonds"
        ? (bondsData?.instruments ?? []).filter((i: any) => !i.is_hedged)
        : (equityData?.instruments ?? [])
      ).filter((inst: any) => inst.name.toLowerCase().includes(mappingSearch.toLowerCase()))
       .map((inst: any) => {
        const label = inst.name.replace("DPAM B BONDS ", "").replace("DPAM L BONDS ", "").replace("DPAM B EQUITIES ", "").replace("DPAM L EQUITIES ", "").replace("DPAM B REAL ESTATE ", "REAL ESTATE ").replace("DPAM DBI RDT B EQUITIES ", "DBI RDT ");
        return (
          <button key={inst.col_index}
            onClick={() => { setNewMappingCol(inst.col_index); setMappingSearch(""); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50 text-slate-700 hover:text-sky-700 transition-colors">
            {label}
          </button>
        );
      })}
      {(newMappingType === "bonds"
        ? (bondsData?.instruments ?? []).filter((i: any) => !i.is_hedged)
        : (equityData?.instruments ?? [])
      ).filter((inst: any) => inst.name.toLowerCase().includes(mappingSearch.toLowerCase())).length === 0 && (
        <p className="px-3 py-2 text-sm text-slate-400 italic">Aucun résultat</p>
      )}
    </div>
  )}
</div>
          <button
            disabled={!newMappingIsin || !newMappingCol || mappingSaving}
            onClick={async () => {
              if (!newMappingIsin || !newMappingCol) return;
              setMappingSaving(true);
              const instName = (newMappingType === "bonds" ? bondsData?.instruments : equityData?.instruments)
                ?.find((i: any) => i.col_index === newMappingCol)?.name ?? "";
              try {
                await onSaveMapping(newMappingIsin, newMappingType, newMappingCol, instName);
                setNewMappingIsin("");
                setNewMappingCol(null);
              } finally { setMappingSaving(false); }
            }}
            className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-700 transition-all disabled:opacity-50">
            {mappingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ajouter
          </button>
        </div>
 
        {/* Liste mappings */}
        {mappings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 italic text-sm">
            Aucun mapping configuré.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ISIN</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fonds DPAM</th>
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mappings.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-sky-600 font-bold text-xs">{m.isin}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold",
                        m.dpam_type === "bonds" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700")}>
                        {m.dpam_type === "bonds" ? "Bonds" : "Equity"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-medium truncate max-w-[300px]">{m.instrument_name}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => onDeleteMapping(m.isin)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
 
    </div>
    );
}
// ════════════════════════════════════════════════════════════════════════════
// SIMULATION TAB — à coller avant export default function App()
// ════════════════════════════════════════════════════════════════════════════

function SimulationTab({
  allPortfolios,
  breakdowns,
  creditBreakdowns,
  durations,
  manualOverrides,
  currencyBreakdowns,
  targetGridData,
  dpamLookup,
  samdpDebtCreditBreakdown,
  samdpDebtInstruments,
  samdpGeoBreakdown,
}: {
  allPortfolios: any[];
  breakdowns: Record<string, any[]>;
  creditBreakdowns: Record<string, any[]>;
  durations: Record<string, { duration: number; updated_at: string }>;
  manualOverrides: any[];
  currencyBreakdowns: Record<string, any[]>;
  targetGridData: Record<string, any>;
  dpamLookup: Record<string, any>;
  samdpDebtCreditBreakdown: { credit_type: string; currency: string; weight: number }[] | null;
  samdpDebtInstruments: any[];
  samdpGeoBreakdown: { region: string; weight: number }[] | null;
}){

  const [selectedPortfolioId, setSelectedPortfolioId] = React.useState<number | null>(null);
  const [simulatedWeights, setSimulatedWeights] = React.useState<Record<number, number>>({});
  const [search, setSearch] = React.useState("");
  const [resetFlash, setResetFlash] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
const [regionFilter, setRegionFilter] = React.useState<string | null>(null);
  const [quickEditIds, setQuickEditIds] = React.useState<number[]>([]);
  const [quickAddInput, setQuickAddInput] = React.useState("");
  const [quickAddSuggestions, setQuickAddSuggestions] = React.useState<any[]>([]);

  const CREDIT_COLORS_SIM: Record<string, string> = {
    Govies: "#0ea5e9", IG: "#10b981", HY: "#f59e0b", NR: "#94a3b8", "EM Debt": "#8b5cf6",
  };
  const CURRENCY_COLORS_SIM: Record<string, string> = {
    EUR: "#0ea5e9", USD: "#10b981", JPY: "#f59e0b", Other: "#94a3b8",
  };
  const CATEGORY_COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  // Portefeuilles triés
  const sortedPortfolios = React.useMemo(() =>
    [...allPortfolios].filter(p => p?.name).sort((a, b) => {
      const order = [
        "Sicav - SCV_BDS", "Sicav - SCV_LOW", "Sicav - SCV_ML", "Sicav - SCV_MED",
        "Sicav - SCV_MH", "Sicav - SCV_HIGH", "Sicav - SCV_VH",
        "Mixed - MIX_BDS", "Mixed - MIX_LOW", "Mixed - MIX_ML", "Mixed - MIX_MED",
        "Mixed - MIX_MH", "Mixed - MIX_HIGH", "Mixed - MIX_VH",
      ];
      return (order.indexOf(a.name) === -1 ? 999 : order.indexOf(a.name)) -
             (order.indexOf(b.name) === -1 ? 999 : order.indexOf(b.name));
    }), [allPortfolios]);

  const currentPortfolio = allPortfolios.find(p => p.id === selectedPortfolioId) ?? null;

  // Init poids simulés quand on change de portefeuille
  React.useEffect(() => {
    if (!currentPortfolio) return;
    const init: Record<number, number> = {};
(currentPortfolio.holdings ?? []).forEach((h: any) => {
  init[h.id] = Math.round((h.weight ?? 0) * 100) / 100;
});
    setSimulatedWeights(init);
    setSearch("");
  }, [selectedPortfolioId]);

  // Init poids simulés quand on change de portefeuille
  React.useEffect(() => {
    if (!currentPortfolio) return;
    const init: Record<number, number> = {};
(currentPortfolio.holdings ?? []).forEach((h: any) => {
  init[h.id] = Math.round((h.weight ?? 0) * 100) / 100;
});
    setSimulatedWeights(init);
    setSearch("");
  }, [selectedPortfolioId]);

  React.useEffect(() => {
    setQuickEditIds([]);
    setQuickAddInput("");
    setQuickAddSuggestions([]);
  }, [selectedPortfolioId]);

  const totalSimulated = Object.values(simulatedWeights).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalOriginal = (currentPortfolio?.holdings ?? []).reduce((s: number, h: any) => s + (h.weight ?? 0), 0);

  // Holdings avec poids simulés
  const simulatedHoldings = React.useMemo(() => {
    if (!currentPortfolio) return [];
    return (currentPortfolio.holdings ?? []).map((h: any) => ({
      ...h,
      weight: simulatedWeights[h.id] ?? h.weight ?? 0,
    }));
  }, [currentPortfolio, simulatedWeights]);

  // Holdings filtrés pour la table
const filteredHoldings = React.useMemo(() => {
    const EUROPE_REGIONS = new Set(["Europe", "Europe ex-Euroland", "Euroland", "Europe ex-Eurolan"]);
    return (currentPortfolio?.holdings ?? []).filter((h: any) => {
      if (search) {
        const q = search.toLowerCase();
        if (!(h.asset_name ?? "").toLowerCase().includes(q) && !(h.isin ?? "").toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && (h.category ?? "") !== categoryFilter) return false;
      if (regionFilter) {
        if (regionFilter === "Europe") {
          if (!EUROPE_REGIONS.has(h.region ?? "")) return false;
        } else {
          if ((h.region ?? "") !== regionFilter) return false;
        }
      }
      return true;
    });
  }, [currentPortfolio, search, categoryFilter, regionFilter]);

  function normalizeRegion(r: string) {
    if (["Europe", "Europe ex-Euroland", "Euroland"].includes(r)) return "Europe";
    if (["US", "North America"].includes(r)) return "US";
    if (["Emerging and Frontier Markets", "Emerging Markets"].includes(r)) return "EM";
    if (["Other"].includes(r)) return "Others";
    return r;
  }

  function handleQuickAddInputChange(value: string) {
    setQuickAddInput(value);
    if (!currentPortfolio || value.trim().length < 2) {
      setQuickAddSuggestions([]);
      return;
    }
    const q = value.trim().toLowerCase();
    // Match ISIN exact d'abord
    const isinMatch = (currentPortfolio.holdings ?? []).find((h: any) => (h.isin ?? "").toLowerCase() === q);
    if (isinMatch) {
      addQuickEditRow(isinMatch.id);
      return;
    }
    const matches = (currentPortfolio.holdings ?? [])
      .filter((h: any) => (h.asset_name ?? "").toLowerCase().includes(q) || (h.isin ?? "").toLowerCase().includes(q))
      .filter((h: any) => !quickEditIds.includes(h.id))
      .slice(0, 8);
    setQuickAddSuggestions(matches);
  }

  function addQuickEditRow(id: number) {
    setQuickEditIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setQuickAddInput("");
    setQuickAddSuggestions([]);
  }

  function removeQuickEditRow(id: number) {
    setQuickEditIds(prev => prev.filter(x => x !== id));
  }

  // ── Calculs AVANT / APRÈS ──

  function computeCategoryData(holdings: any[]) {
    const m = new Map<string, number>();
    holdings.forEach(h => {
      if (!h?.category) return;
      m.set(h.category, (m.get(h.category) ?? 0) + (h.weight ?? 0));
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }

const SAMDP_ISINS_SIM = ["LU1795355053"];

  function computeRegionData(holdings: any[]) {
    const m = new Map<string, number>();
    holdings.filter(h => h?.category === "Equities").forEach(h => {
      if (h.isin === "LU1795355053" && samdpGeoBreakdown) {
        samdpGeoBreakdown.forEach((e: any) => {
          const r = normalizeRegion(e.region);
          if (r === "Cash") return;
          m.set(r, (m.get(r) ?? 0) + (h.weight ?? 0) * e.weight / 100);
        });
        return;
      }
      const bd = h.isin ? breakdowns[h.isin] : null;
      if (bd && bd.length > 0) {
        bd.forEach((e: any) => {
          const r = normalizeRegion(e.region);
          if (r === "Cash") return;
          m.set(r, (m.get(r) ?? 0) + (h.weight ?? 0) * e.weight / 100);
        });
        return;
      }
      const dpamGeo = h.isin && (h.asset_name ?? "").startsWith("DPAM") ? dpamLookup[h.isin]?.geoBreakdown : null;
      if (dpamGeo && dpamGeo.length > 0) {
        dpamGeo.forEach((e: any) => {
          const r = normalizeRegion(e.region);
          if (r === "Cash") return;
          m.set(r, (m.get(r) ?? 0) + (h.weight ?? 0) * e.weight / 100);
        });
        return;
      }
      const r = normalizeRegion(h.region ?? "Other");
      m.set(r, (m.get(r) ?? 0) + (h.weight ?? 0));
    });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }

  function computeCurrencyData(holdings: any[]) {
    const KEY = ["EUR", "USD", "JPY"];
    const m = new Map<string, number>();
    holdings.forEach(h => {
      if (!h) return;
      const cbd = h.isin ? currencyBreakdowns[h.isin] : null;
      if (cbd && cbd.length > 0) {
        cbd.forEach((e: any) => m.set(e.currency.toUpperCase(), (m.get(e.currency.toUpperCase()) ?? 0) + (h.weight ?? 0) * e.weight / 100));
      } else {
        const hedged = manualOverrides.some(ov =>
          ((ov.manual_isin && ov.manual_isin === h.isin) ||
          (ov.original_asset_name && ov.original_asset_name === (h.original_asset_name ?? h.asset_name)))
          && ov.is_hedged === true
        );
        const cur = hedged ? "EUR" : (h.currency ?? "Other").toUpperCase();
        m.set(cur, (m.get(cur) ?? 0) + (h.weight ?? 0));
      }
    });
    const result: { label: string; value: number }[] = [];
    let other = 0;
    m.forEach((w, cur) => KEY.includes(cur) ? result.push({ label: cur, value: +w.toFixed(2) }) : (other += w));
    if (other > 0.05) result.push({ label: "Other", value: +other.toFixed(2) });
    const ord = ["EUR", "USD", "JPY", "Other"];
    return result.sort((a, b) => (ord.indexOf(a.label) === -1 ? 99 : ord.indexOf(a.label)) - (ord.indexOf(b.label) === -1 ? 99 : ord.indexOf(b.label)));
  }

function computeCreditData(holdings: any[]) {
    const FI = ["Fixed Income", "Bonds"];
    const SAMDP_DEBT_ISIN_SIM = "LU1545753169";
    const m = new Map<string, number>();
    holdings.forEach(h => {
      if (!h || !FI.includes(h.category ?? "")) return;
      const cbd = h.isin ? creditBreakdowns[h.isin] : null;
      if (cbd && cbd.length > 0) {
        cbd.forEach((e: any) => m.set(e.credit_type, (m.get(e.credit_type) ?? 0) + (h.weight ?? 0) * e.weight / 100));
      } else if (h.isin === SAMDP_DEBT_ISIN_SIM && samdpDebtCreditBreakdown) {
        samdpDebtCreditBreakdown.forEach((e: any) => m.set(e.credit_type, (m.get(e.credit_type) ?? 0) + (h.weight ?? 0) * e.weight / 100));
      } else {
        const dpamCredit = h.isin ? dpamLookup[h.isin]?.creditBreakdown : null;
        if (dpamCredit && dpamCredit.length > 0) {
          dpamCredit.forEach((e: any) => m.set(e.credit_type, (m.get(e.credit_type) ?? 0) + (h.weight ?? 0) * e.weight / 100));
        }
      }
    });
    return ["Govies", "IG", "HY", "NR", "EM Debt"]
      .filter(ct => (m.get(ct) ?? 0) > 0.01)
      .map(ct => ({ name: ct, value: +((m.get(ct) ?? 0).toFixed(2)) }));
  }

function computeDuration(holdings: any[]) {
    const CATS = ["Fixed Income", "Bonds", "Liquidities"];
    const SAMDP_DEBT_ISIN_DUR = "LU1545753169";
    function getSimDuration(isin: string | null | undefined): number | null {
      if (!isin) return null;
      if (durations[isin]) return durations[isin].duration;
      if (isin === SAMDP_DEBT_ISIN_DUR && samdpDebtInstruments.length > 0) {
        const leafRows = samdpDebtInstruments.filter((i: any) => i.level === 2 && i.isin);
        const totalW = leafRows.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
        if (totalW === 0) return null;
        return +(leafRows.reduce((s: number, i: any) => s + Number(i.modified_duration ?? 0) * Number(i.wght_pct ?? 0), 0) / totalW).toFixed(2);
      }
      const dpamDur = dpamLookup[isin]?.duration;
      if (dpamDur != null) return dpamDur;
      return null;
    }
    const fi = holdings.filter(h => h && CATS.includes(h.category ?? "") &&
      (h.isin ? (getSimDuration(h.isin) != null || h.category === "Liquidities") : h.category === "Liquidities"));
    const total = fi.reduce((s, h) => s + (h.weight ?? 0), 0);
    if (total === 0) return null;
    const weighted = fi.reduce((s, h) => s + (h.weight ?? 0) * (getSimDuration(h.isin) ?? 0), 0);
    return +(weighted / total).toFixed(2);
  }
  const originalHoldings = currentPortfolio?.holdings ?? [];
  const beforeCat = React.useMemo(() => computeCategoryData(originalHoldings), [currentPortfolio]);
  const afterCat = React.useMemo(() => computeCategoryData(simulatedHoldings), [simulatedHoldings]);
  const beforeRegion = React.useMemo(() => computeRegionData(originalHoldings), [currentPortfolio, breakdowns]);
  const afterRegion = React.useMemo(() => computeRegionData(simulatedHoldings), [simulatedHoldings, breakdowns]);
  const beforeCurrency = React.useMemo(() => computeCurrencyData(originalHoldings), [currentPortfolio, currencyBreakdowns]);
  const afterCurrency = React.useMemo(() => computeCurrencyData(simulatedHoldings), [simulatedHoldings, currencyBreakdowns]);
  const beforeCredit = React.useMemo(() => computeCreditData(originalHoldings), [currentPortfolio, creditBreakdowns]);
  const afterCredit = React.useMemo(() => computeCreditData(simulatedHoldings), [simulatedHoldings, creditBreakdowns]);
  const beforeDuration = React.useMemo(() => computeDuration(originalHoldings), [currentPortfolio, durations]);
  const afterDuration = React.useMemo(() => computeDuration(simulatedHoldings), [simulatedHoldings, durations]);

  // Merge avant/après pour graphes combinés
  function mergeData(before: { name: string; value: number }[], after: { name: string; value: number }[]) {
    const keys = Array.from(new Set([...before.map(d => d.name), ...after.map(d => d.name)]));
    return keys.map(name => ({
      name,
      before: before.find(d => d.name === name)?.value ?? 0,
      after: after.find(d => d.name === name)?.value ?? 0,
    }));
  }

  const catMerged = React.useMemo(() => mergeData(beforeCat, afterCat), [beforeCat, afterCat]);
  const regionMerged = React.useMemo(() => mergeData(beforeRegion, afterRegion), [beforeRegion, afterRegion]);

  const portfolioLabel = (name: string) => {
    const parts = name.split(" - ");
    return parts.length >= 2 ? parts[1] : name;
  };

  if (!currentPortfolio) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Simulation</h2>
            <p className="text-slate-500">Simulez l'impact d'un changement de pondération sur votre portefeuille.</p>
          </div>
        </div>
        {/* Dropdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-sm">
          <label className="block text-sm font-bold text-slate-700 mb-2">Choisir un portefeuille</label>
          <select
            value={selectedPortfolioId ?? ""}
            onChange={e => setSelectedPortfolioId(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none text-slate-700 bg-white">
            <option value="">— Sélectionner —</option>
            {sortedPortfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
          <TrendingUp className="h-12 w-12 opacity-20" />
          <p className="text-lg">Sélectionnez un portefeuille pour commencer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Simulation</h2>
          <p className="text-slate-500">Modifiez les poids et observez l'impact en temps réel.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Dropdown */}
          <select
            value={selectedPortfolioId ?? ""}
            onChange={e => setSelectedPortfolioId(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none text-slate-700 bg-white text-sm font-medium shadow-sm">
            {sortedPortfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {/* Reset */}
          <button
  onClick={() => {
    const init: Record<number, number> = {};
    (currentPortfolio.holdings ?? []).forEach((h: any) => { init[h.id] = Math.round((h.weight ?? 0) * 100) / 100; });
    setSimulatedWeights(init);
    setResetFlash(true);
    setTimeout(() => setResetFlash(false), 600);
  }}
  className={cn(
    "px-4 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm",
    resetFlash
      ? "bg-emerald-500 text-white border-emerald-500"
      : "border-slate-200 text-slate-600 hover:bg-slate-50"
  )}>
  {resetFlash ? "✓ Réinitialisé" : "Réinitialiser"}
</button>
        </div>
      </div>


    {/* ── Édition rapide ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-700">Édition rapide</h3>
          <p className="text-xs text-slate-400 mt-0.5">Collez un ISIN ou recherchez un instrument pour ajuster son poids simulé directement.</p>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider bg-sky-50/40">ISIN</th>
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider bg-sky-50/40">Nom</th>
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids Original</th>
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids Simulé</th>
              <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Delta</th>
              <th className="px-2 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {quickEditIds.map(id => {
              const h = (currentPortfolio?.holdings ?? []).find((x: any) => x.id === id);
              if (!h) return null;
              const original = h.weight ?? 0;
              const simWeight = simulatedWeights[id] ?? original;
              const delta = simWeight - original;
              const changed = Math.abs(delta) > 0.001;
              return (
                <tr key={id} className={cn("transition-colors", changed && "bg-amber-50/30")}>
                  <td className="px-6 py-2.5 text-xs font-mono text-slate-500 bg-sky-50/20">{h.isin ?? "—"}</td>
                  <td className="px-6 py-2.5 text-sm font-medium text-slate-800 bg-sky-50/20 truncate max-w-[240px]">{h.asset_name ?? "—"}</td>
                  <td className="px-6 py-2.5 text-right text-slate-500 text-sm">{original.toFixed(2)}%</td>
                  <td className="px-6 py-2.5 text-right">
                    <input
                      type="number"
                      step={0.01}
                      value={simWeight}
                      onChange={e => {
                        const v = Math.round((parseFloat(e.target.value) || 0) * 100) / 100;
                        setSimulatedWeights(prev => ({ ...prev, [id]: v }));
                      }}
                      className={cn(
                        "w-20 px-2 py-1 text-right rounded-lg border text-sm font-bold outline-none transition-colors",
                        changed ? "border-amber-300 bg-amber-50 text-amber-700 focus:ring-2 focus:ring-amber-400"
                          : "border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-sky-400"
                      )}
                    />
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <input
                      type="number"
                      step={0.01}
                      value={+delta.toFixed(2)}
                      onChange={e => {
                        const d = parseFloat(e.target.value) || 0;
                        const v = Math.round((original + d) * 100) / 100;
                        setSimulatedWeights(prev => ({ ...prev, [id]: v }));
                      }}
                      className={cn(
                        "w-20 px-2 py-1 text-right rounded-lg border text-sm font-bold outline-none transition-colors",
                        changed ? "border-amber-300 bg-amber-50 text-amber-700 focus:ring-2 focus:ring-amber-400"
                          : "border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-sky-400"
                      )}
                    />
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <button onClick={() => removeQuickEditRow(id)} className="p-1 hover:bg-slate-100 rounded">
                      <X className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {/* Ligne d'ajout */}
            <tr>
              <td colSpan={2} className="px-6 py-2.5 bg-sky-50/40 relative">
                <input
                  type="text"
                  value={quickAddInput}
                  onChange={e => handleQuickAddInputChange(e.target.value)}
                  placeholder="Coller un ISIN ou rechercher un nom…"
                  className="w-full text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                />
                {quickAddSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-56 overflow-y-auto">
                    {quickAddSuggestions.map((h: any) => (
                      <button key={h.id} onClick={() => addQuickEditRow(h.id)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-700 truncate">{h.asset_name ?? "—"}</span>
                        <span className="text-xs font-mono text-slate-400 shrink-0">{h.isin ?? "—"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </td>
              <td colSpan={4} className="px-6 py-2.5 text-xs text-slate-300 italic">Sélectionnez un instrument pour l'ajouter</td>
            </tr>
          </tbody>
        </table>
      </div>

      
      {/* Total + table positions */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header table */}
        <div className="px-6 py-4 border-b border-slate-50 flex flex-col gap-3">
          {/* Ligne 1 : search + total */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un instrument…"
                className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
              {search && <button onClick={() => setSearch("")} className="p-0.5 hover:bg-slate-100 rounded"><X className="h-3.5 w-3.5 text-slate-400" /></button>}
            </div>
            {/* Total */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors shrink-0",
              Math.abs(totalSimulated - 100) < 0.05
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            )}>
              <span className="text-xs font-normal opacity-70">Total simulé</span>
              <span>{totalSimulated.toFixed(2)}%</span>
              {Math.abs(totalSimulated - 100) >= 0.05 && (
                <span className="text-xs font-normal opacity-80">
                  ({(100 - totalSimulated) > 0 ? "+" : ""}{(100 - totalSimulated).toFixed(2)}% pour 100%)
                </span>
              )}
            </div>
          </div>
          {/* Ligne 2 : filtres catégorie + région */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Catégorie</span>
            {Array.from(new Set((currentPortfolio?.holdings ?? []).map((h: any) => h.category).filter(Boolean))).sort().map((cat: any) => (
              <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all border",
                  categoryFilter === cat
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-sky-300")}>
                {cat}
              </button>
            ))}
            <div className="w-px h-4 bg-slate-200 shrink-0 mx-1" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Région</span>
{(() => {
              const EUROPE_REGIONS = new Set(["Europe", "Europe ex-Euroland", "Euroland", "Europe ex-Eurolan"]);
              const rawRegions = Array.from(new Set((currentPortfolio?.holdings ?? []).map((h: any) => h.region).filter(Boolean)));
              const hasEurope = rawRegions.some(r => EUROPE_REGIONS.has(r));
              const otherRegions = rawRegions.filter(r => !EUROPE_REGIONS.has(r)).sort();
              const regions = hasEurope ? ["Europe", ...otherRegions] : otherRegions;
              return regions.map((reg: string) => (
                <button key={reg} onClick={() => setRegionFilter(regionFilter === reg ? null : reg)}
                  className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all border",
                    regionFilter === reg
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-slate-500 border-slate-200 hover:border-amber-300")}>
                  {reg}
                </button>
              ));
            })()}
            {(categoryFilter || regionFilter) && (
              <button onClick={() => { setCategoryFilter(null); setRegionFilter(null); }}
                className="px-3 py-1 rounded-lg text-xs font-bold text-rose-500 border border-rose-200 hover:bg-rose-50 transition-all">
                Réinitialiser filtres
              </button>
            )}
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Instrument</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Région</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids original</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids simulé</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredHoldings.map((h: any) => {
                const simWeight = simulatedWeights[h.id] ?? h.weight ?? 0;
                const delta = simWeight - (h.weight ?? 0);
                const changed = Math.abs(delta) > 0.001;
                return (
                  <tr key={h.id} className={cn("transition-colors hover:bg-slate-50/50", changed && "bg-amber-50/30")}>
                    <td className="px-6 py-3 font-medium text-slate-900 text-sm truncate max-w-[220px]">{h.asset_name ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">{h.category ?? "—"}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">{h.region ?? "—"}</td>
                    <td className="px-6 py-3 text-right text-slate-500 text-sm">{(h.weight ?? 0).toFixed(2)}%</td>
                    <td className="px-6 py-3 text-right">
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        max={100}
                        value={simulatedWeights[h.id] ?? h.weight ?? 0}
                        onChange={e => setSimulatedWeights(prev => ({ ...prev, [h.id]: Math.round((parseFloat(e.target.value) || 0) * 100) / 100 }))}
                        className={cn(
                          "w-20 px-2 py-1 text-right rounded-lg border text-sm font-bold outline-none transition-colors",
                          changed
                            ? "border-amber-300 bg-amber-50 text-amber-700 focus:ring-2 focus:ring-amber-400"
                            : "border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-sky-400"
                        )}
                      />
                    </td>
                    <td className="px-6 py-3 text-right text-xs font-bold">
                      {changed
                        ? <span className={delta > 0 ? "text-emerald-600" : "text-rose-600"}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(2)}%
                          </span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Comparaison KPI ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Duration */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Duration</p>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-[10px] text-slate-400 mb-0.5">Avant</p>
              <p className="text-2xl font-bold text-slate-400">{beforeDuration ?? "—"}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 mb-1" />
            <div>
              <p className="text-[10px] text-sky-500 mb-0.5">Après</p>
              <p className={cn("text-2xl font-bold", afterDuration !== beforeDuration ? "text-sky-600" : "text-slate-900")}>
                {afterDuration ?? "—"}
              </p>
            </div>
            {afterDuration != null && beforeDuration != null && afterDuration !== beforeDuration && (
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-lg mb-1",
                afterDuration > beforeDuration ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
                {afterDuration > beforeDuration ? "+" : ""}{(afterDuration - beforeDuration).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Credit Quality */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm md:col-span-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Credit Quality</p>
          <div className="space-y-2">
            {Array.from(new Set([...beforeCredit.map(d => d.name), ...afterCredit.map(d => d.name)])).map(name => {
              const bv = beforeCredit.find(d => d.name === name)?.value ?? 0;
              const av = afterCredit.find(d => d.name === name)?.value ?? 0;
              const color = CREDIT_COLORS_SIM[name] ?? "#94a3b8";
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-16 shrink-0" style={{ color }}>{name}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full rounded-full opacity-40 transition-all"
                      style={{ width: `${Math.min(100, bv)}%`, backgroundColor: color }} />
                    <div className="absolute top-0 left-0 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, av)}%`, backgroundColor: color, opacity: av !== bv ? 1 : 0.4 }} />
                  </div>
                  <span className="text-xs text-slate-400 w-10 text-right shrink-0">{bv.toFixed(1)}%</span>
                  <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                  <span className={cn("text-xs font-bold w-10 text-right shrink-0", av !== bv ? "text-sky-600" : "text-slate-400")}>{av.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Currency Exposure ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Currency Exposure</p>
        <div className="space-y-3">
          {Array.from(new Set([...beforeCurrency.map(d => d.label), ...afterCurrency.map(d => d.label)])).map(label => {
            const bv = beforeCurrency.find(d => d.label === label)?.value ?? 0;
            const av = afterCurrency.find(d => d.label === label)?.value ?? 0;
            const color = CURRENCY_COLORS_SIM[label] ?? "#94a3b8";
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-bold w-10 shrink-0" style={{ color }}>{label}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full rounded-full opacity-40 transition-all"
                    style={{ width: `${Math.min(100, bv)}%`, backgroundColor: color }} />
                  <div className="absolute top-0 left-0 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, av)}%`, backgroundColor: color, opacity: av !== bv ? 1 : 0.4 }} />
                </div>
                <span className="text-xs text-slate-400 w-12 text-right shrink-0">{bv.toFixed(1)}%</span>
                <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                <span className={cn("text-xs font-bold w-12 text-right shrink-0", av !== bv ? "text-sky-600" : "text-slate-400")}>{av.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Graphes catégorie + région ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Allocation par catégorie */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold mb-2 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-sky-600" />Allocation par Catégorie
          </h3>
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-300" /><span className="text-slate-500">Avant</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-sky-500" /><span className="text-slate-500">Après</span></div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catMerged} layout="vertical" margin={{ top: 0, right: 60, left: 20, bottom: 0 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={v => v + "%"} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} width={90} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "16px", border: "none" }}
                  formatter={(v: number, name: string) => [v.toFixed(2) + "%", name === "before" ? "Avant" : "Après"]} />
                <Bar dataKey="before" fill="#cbd5e1" radius={[0, 6, 6, 0]} barSize={8}>
                  <LabelList dataKey="before" position="right" formatter={(v: number) => v > 0 ? v.toFixed(1) + "%" : ""} fill="#94a3b8" fontSize={10} />
                </Bar>
                <Bar dataKey="after" fill="#0ea5e9" radius={[0, 6, 6, 0]} barSize={8}>
                  <LabelList dataKey="after" position="right" formatter={(v: number) => v > 0 ? v.toFixed(1) + "%" : ""} fill="#0ea5e9" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exposition régionale */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold mb-2 flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-600" />Exposition Régionale
          </h3>
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-300" /><span className="text-slate-500">Avant</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-slate-500">Après</span></div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionMerged} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "16px", border: "none" }}
                  formatter={(v: number, name: string) => [v.toFixed(2) + "%", name === "before" ? "Avant" : "Après"]} />
                <Bar dataKey="before" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={16}>
                  <LabelList dataKey="before" position="top" formatter={(v: number) => v > 0 ? v.toFixed(1) + "%" : ""} fill="#94a3b8" fontSize={10} />
                </Bar>
                <Bar dataKey="after" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={16}>
                  <LabelList dataKey="after" position="top" formatter={(v: number) => v > 0 ? v.toFixed(1) + "%" : ""} fill="#f59e0b" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

type SamdpView = "Equities" | "Debt" | "Export";
 
interface SamdpInstrument {
  id?: number;
  name: string;
  isin: string;
  instrument_type: string | null;
  msci_sector_1: string | null;
  dom_country: string | null;
  msci_sector_2: string | null;
  msci_sector_3: string | null;
  style: string | null;
  secular: string | null;
  mkt_cap: number | null;
  pl_ptf: number | null;
  pl_local: number | null;
  currency: string | null;
  quantity: number | null;
  quote: number | null;
  quote_date: string | null;
  mtm_local: number | null;
  mtm_ptf: number | null;
  expo_pct: number | null;
  wght_pct: number | null;
}
 
function SamdpTab({ equityData, importLog, manualOverrides, onSelectInstrument, debtData, debtImportLog, durations, equityRows, breakdowns, creditBreakdowns }: {
  equityData: any[];
  importLog: any | null;
  manualOverrides: any[];
  onSelectInstrument: (inst: any) => void;
  debtData: any[];
  debtImportLog: any | null;
  durations: Record<string, { duration: number; updated_at: string }>;
  equityRows: any[];
  breakdowns: Record<string, any[]>;
  creditBreakdowns: Record<string, any[]>;
}) {
  
  const [view, setView] = React.useState<SamdpView>("Equities");
  const [uploading, setUploading] = React.useState(false);
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  const [equitySearch, setEquitySearch] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: "asc" | "desc" } | null>({ key: "wght_pct", direction: "desc" });
  const [exportText, setExportText] = React.useState("");
  const [exportTextDebt, setExportTextDebt] = React.useState("");
  const [debtSearch, setDebtSearch] = React.useState("");
const [debtSortConfig, setDebtSortConfig] = React.useState<{ key: string; direction: "asc" | "desc" } | null>({ key: "wght_pct", direction: "desc" });
const [debtLevel, setDebtLevel] = React.useState<"all" | "gov" | "ig" | "hy" | "nr">("all");
const [debtHierarchyLevel, setDebtHierarchyLevel] = React.useState<1|2>(2);
  const [showSamdpDetail, setShowSamdpDetail] = React.useState<"currency_equity" | "region_equity" | "currency_debt" | "credit_debt" | "duration_debt" | "cash_detail" | null>(null);
const [creditDebtFilter, setCreditDebtFilter] = React.useState<string | null>(null);
const [currencyDebtFilter, setCurrencyDebtFilter] = React.useState<string | null>(null);
  const [equityLevel, setEquityLevel] = React.useState<1|2|3|4|5>(2);
  const [regionFilter, setRegionFilter] = React.useState<string | null>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);

const handleExportPdf = () => {
    if (!exportRef.current) return;
    const content = exportRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SAMDP Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4 portrait; margin: 0; }
            html { width: 210mm; height: 297mm; }
            body {
              font-family: system-ui, sans-serif;
              background: white;
              width: 210mm;
              height: 297mm;
              overflow: hidden;
            }
            #report {
              width: 210mm;
              min-height: 297mm;
              padding: 36px;
              box-sizing: border-box;
              background: white;
            }
            @page { size: A4 portrait; margin: 0; }
            @media print {
              * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
              .page { width: 210mm; min-height: 297mm; page-break-after: always; box-shadow: none !important; }
              .page:last-child { page-break-after: avoid; }
            }
            .page { width: 210mm; min-height: 297mm; padding: 20mm; box-sizing: border-box; background: white; font-size: 9pt; }
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
  
  const handleDebtFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploading(true);
  setUploadSuccess(false);
  try {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs" as any);
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
 
const allCellKeys = Object.keys(ws).filter(k => !k.startsWith('!'));
    const instrumentRows: Map<number, any[]> = new Map();
    allCellKeys.forEach((key: string) => {
      const decoded = XLSX.utils.decode_cell(key);
      if (!instrumentRows.has(decoded.r)) instrumentRows.set(decoded.r, []);
      const row = instrumentRows.get(decoded.r)!;
      row[decoded.c] = ws[key]?.v;
    });

    const wsRows: any[] = (ws as any)['!rows'] ?? [];
    const toNum = (v: any) => v != null && !isNaN(Number(v)) ? Number(v) : null;
    const toStr = (v: any) => v != null && String(v).trim() !== '' ? String(v).trim() : null;
    const toDate = (v: any) => {
      if (!v) return null;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === 'string') return v.slice(0, 10);
      return String(v).slice(0, 10);
    };

    const sortedRows = Array.from(instrumentRows.entries()).sort(([a], [b]) => a - b);
    const allRows: any[] = [];

for (const [rowIdx, row] of sortedRows) {
      if (rowIdx <= 1) continue;
      const name = toStr(row[0]);
      if (!name) continue;
      const outlineLevel = wsRows[rowIdx]?.level ?? 0;
      allRows.push({
        row_index: rowIdx + 1,
        name,
        isin: toStr(row[1]),
        instrument_type: toStr(row[46]),
        issuer: toStr(row[3]),
        coupon_rate: toNum(row[4]),
        maturity_date: toDate(row[5]),
        currency: toStr(row[7]),
        seniority: toStr(row[8]),
        quote_date: toDate(row[9]),
        quote: toNum(row[10]),
        quantity: toNum(row[14]),
        nominal: toNum(row[16]),
        mtm_ptf: toNum(row[17]),
        wght_pct: toNum(row[18]),
        expo_pct: toNum(row[19]),
        ytw: toNum(row[20]),
        modified_duration: toNum(row[28]),
        gov_spread: toNum(row[26]),
        bics_sector_1: toStr(row[35]),
        issuer_country: toStr(row[37]),
        dom_country: toStr(row[38]),
        rating_cai: toStr(row[44]),
        ig_hy: toStr(row[45]),
        outline_level: outlineLevel,
      });
    }

    // Assigner les niveaux selon outline_level
const rowsWithLevel: any[] = allRows.map((row, i) => {
      let level: number;
      if (i === 0) {
        level = 1;
      } else if (row.outline_level === 0) {
        level = 2;
      } else {
        level = row.outline_level + 1;
      }
      return { ...row, level };
    });

    console.log("Debt rows found:", rowsWithLevel.length, "sample:", rowsWithLevel.slice(0, 5));

    if (rowsWithLevel.length === 0) {
      alert("Aucune ligne trouvée dans ce fichier.");
      return;
    }

const apiRes = await fetch("/api/dpam-data?section=samdp_debt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, instruments: rowsWithLevel }),
    });
 
    if (apiRes.ok) {
      // Recharger depuis l'API
      const fresh = await fetch("/api/dpam-data?section=samdp_debt");
      if (fresh.ok) {
        const data = await fresh.json();
        // Mettre à jour via le parent — signaler le rechargement
        window.dispatchEvent(new CustomEvent("samdp-debt-updated"));
      }
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } else {
      alert("Erreur lors de la sauvegarde: " + await apiRes.text());
    }
  } catch (err) {
    console.error("Debt upload error:", err);
    alert("Erreur lors du traitement du fichier.");
  } finally {
    setUploading(false);
  }
};

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploading(true);
  setUploadSuccess(false);

  try {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs" as any);
    const buffer = await file.arrayBuffer();

   const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const allCellKeys = Object.keys(ws).filter((k: string) => !k.startsWith('!'));
    const instrumentRows: Map<number, any[]> = new Map();
    allCellKeys.forEach((key: string) => {
      const decoded = XLSX.utils.decode_cell(key);
      if (!instrumentRows.has(decoded.r)) instrumentRows.set(decoded.r, []);
      const row = instrumentRows.get(decoded.r)!;
      row[decoded.c] = ws[key]?.v;
    });
    // Lire les niveaux de groupement (outline levels) depuis !rows
    const wsRows: any[] = (ws as any)['!rows'] ?? [];
    const toNum = (v: any) => v != null && !isNaN(Number(v)) ? Number(v) : null;
    const toStr = (v: any) => v != null && String(v).trim() !== '' ? String(v).trim() : null;

    const sortedRows = Array.from(instrumentRows.entries()).sort(([a], [b]) => a - b);

    const LEVEL2_NAMES = new Set(["Cash", "Futures", "Mutual funds", "Options"]);
    const LEVEL3_TYPES = new Set([
      "CASH: PROVISION", "CURRENCY", "DEPOSIT",
      "FUTURE ON INDEX", "ETF EQUITIES", "OPTION ON INDEX"
    ]);

    const allRows: any[] = [];
    for (const [rowIdx, row] of sortedRows) {
      if (rowIdx === 0) continue;
      const name = toStr(row[0]);
      if (!name) continue;
const outlineLevel = wsRows[rowIdx]?.level ?? 0;
      allRows.push({
        row_index: rowIdx + 1,
        name,
        isin: toStr(row[1]),
        instrument_type: toStr(row[3]),
        currency: toStr(row[13]),
        quantity: toNum(row[14]),
        mtm_ptf: toNum(row[18]),
        expo_pct: toNum(row[19]),
        wght_pct: toNum(row[22]),
        wght_ref: toNum(row[23]),
        wght_ptf_ref: toNum(row[24]),
        outline_level: outlineLevel,
      });
    }
const rowsWithLevel: any[] = allRows.map((row, i) => {
      const prev = allRows[i - 1];
      const isDuplicate = prev &&
        row.name === prev.name &&
        row.isin === prev.isin &&
        row.instrument_type === prev.instrument_type;

      let level: number;
      // Si outline_level disponible, l'utiliser directement (outline 0=niveau1, 1=niveau2, etc.)
      if (row.outline_level > 0) {
        level = row.outline_level + 1;
      } else if (i === 0) level = 1;
      else if (isDuplicate) level = 5;
      else if (LEVEL2_NAMES.has(row.name)) level = 2;
      else if (
        !row.isin &&
        row.instrument_type &&
        LEVEL3_TYPES.has(row.instrument_type) &&
        row.name === row.instrument_type
      ) level = 3;
      else if (
        !row.isin &&
        LEVEL3_TYPES.has(row.instrument_type ?? "") &&
        !LEVEL2_NAMES.has(row.name)
      ) level = row.name === row.instrument_type ? 3 : 4;
      else level = 4;

      return { ...row, level };
    });
    
// Corriger les sous-composants après un niveau 4 sans ISIN de type OPTION/FUTURE
  const PARENT_TYPES_WITH_CHILDREN = new Set(["OPTION ON INDEX", "FUTURE ON INDEX"]);
  let insideOptionFutureParent = false;
  for (let i = 1; i < rowsWithLevel.length; i++) {
    const row = rowsWithLevel[i];
    const prev = rowsWithLevel[i - 1];
    
    // On entre dans un bloc option/future quand on voit un niveau 4 sans ISIN
    if (prev.level === 4 && !prev.isin && PARENT_TYPES_WITH_CHILDREN.has(prev.instrument_type ?? "")) {
      insideOptionFutureParent = true;
    }
    // On sort du bloc quand on remonte au niveau 3 ou moins
    if (row.level <= 3) {
      insideOptionFutureParent = false;
    }
    // Toute ligne niveau 4 dans ce bloc devient niveau 5
    if (insideOptionFutureParent && row.level === 4 && !LEVEL2_NAMES.has(row.name)) {
      rowsWithLevel[i].level = 5;
    }
  }
    
  // Post-processing : enfants de niveau 5 avec noms différents du parent
    const LEVEL3_PARENT_TYPES = new Set(["OPTION ON INDEX", "FUTURE ON INDEX"]);
    for (let i = 1; i < rowsWithLevel.length; i++) {
      if (rowsWithLevel[i].level === 5 &&
          !LEVEL2_NAMES.has(rowsWithLevel[i].name) &&
          LEVEL3_PARENT_TYPES.has(rowsWithLevel[i].instrument_type ?? "")) {
        // Chercher le parent L4 le plus proche avec le même instrument_type
        let hasL4Parent = false;
        for (let j = i - 1; j >= 0; j--) {
          if (rowsWithLevel[j].level === 5 && 
              LEVEL3_PARENT_TYPES.has(rowsWithLevel[j].instrument_type ?? "")) {
            hasL4Parent = true;
            break;
          }
          if (rowsWithLevel[j].level <= 3) break;
        }
        if (hasL4Parent) rowsWithLevel[i].level = 5;
      }
    }
    // Envoyer à l'API section samdp_equity
    const apiRes = await fetch("/api/dpam-data?section=samdp_equity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, rows: rowsWithLevel }),
    });

    if (apiRes.ok) {
      window.dispatchEvent(new CustomEvent("samdp-equity-updated"));
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } else {
      const err = await apiRes.text();
      console.error("API error:", err);
      alert("Erreur lors de la sauvegarde: " + err);
    }
  } catch (err) {
    console.error("SAMDP upload error:", err);
    alert("Erreur lors du traitement du fichier.");
  } finally {
    setUploading(false);
  }
};

  const fmtPct = (v: number | null) => v == null ? "—" : (Number(v) * 100).toFixed(2) + "%";
  const fmtNum = (v: number | null, dec = 2) => v == null ? "—" : Number(v).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const fmtM = (v: number | null) => v == null ? "—" : (Number(v) / 1_000_000).toFixed(1) + "M";
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "desc" };
    });
  };
console.log("debtData.length:", debtData.length, "level1:", debtData.filter((i:any) => i.level === 1).length, "level2:", debtData.filter((i:any) => i.level === 2).length);
const debtLeafRows = debtData.filter((i: any) => i.level === 2 && i.isin);
const filteredDebt = React.useMemo(() => {
  const LEVEL1_NAMES = new Set(["CASH: PROVISION", "CURRENCY", "ETF BONDS", "FIXED RATE BOND", "FLOATING RATE BOND"]);
  let list = debtData.filter((inst: any) => {
    if (debtHierarchyLevel === 1) return inst.level === 1;
    return inst.level === 2 && !LEVEL1_NAMES.has(inst.name);
  }).filter((inst: any) => {
    if (!debtSearch) return true;
    const q = debtSearch.toLowerCase();
    return (inst.name ?? "").toLowerCase().includes(q) ||
           (inst.isin ?? "").toLowerCase().includes(q) ||
           (inst.issuer ?? "").toLowerCase().includes(q);
  });
  if (debtSortConfig && debtHierarchyLevel >= 3) {
    list = [...list].sort((a, b) => {
      const av = (a as any)[debtSortConfig.key] ?? 0;
      const bv = (b as any)[debtSortConfig.key] ?? 0;
      const dir = debtSortConfig.direction === "asc" ? 1 : -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  return list;
}, [debtData, debtSearch, debtSortConfig, debtHierarchyLevel]);
   
const totalDebtWght = debtData.filter((i: any) => i.level === 2).reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
const totalDebtMtm = debtData.filter((i: any) => i.level === 2).reduce((s: number, i: any) => s + Number(i.mtm_ptf ?? 0), 0);
const avgDuration = debtLeafRows.length > 0
  ? debtLeafRows.reduce((s, i) => {
      const override = manualOverrides.find(ov =>
        (ov.manual_isin && ov.manual_isin === i.isin) ||
        (ov.original_asset_name && ov.original_asset_name === i.name)
      );
      // Chercher la duration dans les instrument_duration si override existe
      const dur = durations[override?.manual_isin || i.isin]?.duration ?? Number(i.modified_duration ?? 0);
      return s + dur * Number(i.wght_pct ?? 0);
}, 0) /
    debtLeafRows.reduce((s, i) => s + Number(i.wght_pct ?? 0), 0)
  : 0;
  const filteredEquity = React.useMemo(() => {
    let list = equityData.filter(inst => {
      if (!equitySearch) return true;
      const q = equitySearch.toLowerCase();
      return (inst.name ?? "").toLowerCase().includes(q) || (inst.isin ?? "").toLowerCase().includes(q);
    });
    if (sortConfig) {
      list = [...list].sort((a, b) => {
        const av = (a as any)[sortConfig.key] ?? 0;
        const bv = (b as any)[sortConfig.key] ?? 0;
        const dir = sortConfig.direction === "asc" ? 1 : -1;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return list;
  }, [equityData, equitySearch, sortConfig]);
 
  const totalWght = equityData.reduce((s, i) => s + Number(i.wght_pct ?? 0), 0);
  const totalMtm = equityData.reduce((s, i) => s + Number(i.mtm_ptf ?? 0), 0);
  const totalPl = equityData.reduce((s, i) => s + Number(i.pl_ptf ?? 0), 0);
 
  const SortBtn = ({ k }: { k: string }) => {
    const active = sortConfig?.key === k;
    return (
      <button onClick={() => handleSort(k)} className="inline-flex items-center gap-0.5 hover:text-slate-900 transition-colors">
        {active
          ? (sortConfig?.direction === "asc"
            ? <ChevronUp className="h-3 w-3 text-sky-600" />
            : <ChevronDown className="h-3 w-3 text-sky-600" />)
          : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </button>
    );
  };
 
  return (
    <div className="space-y-8">
      {/* ── Header + Switch view ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">SAMDP</h2>
          <p className="text-slate-500">Analyse des holdings du portefeuille SAMDP.</p>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(["Equities", "Debt", "Export"] as SamdpView[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all",
                view === v ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {v === "Export" ? "📄 Export" : v}
            </button>
          ))}
        </div>
      </div>
 
      {/* ── Import bar ── */}
<div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-2">
  <label className="flex items-center gap-2 border border-dashed border-slate-200 rounded-xl px-3 py-1.5 hover:border-sky-400 transition-all group cursor-pointer shrink-0">
<input type="file" accept=".xls,.xlsx" onClick={(e) => { (e.target as HTMLInputElement).value = ""; }} onChange={(e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().startsWith("holdings am transparency")) {
      handleFileUpload(e);
} else if (file.name.toLowerCase().startsWith("fi holdings") || file.name.toLowerCase().startsWith("fi_holdings")) {
      handleDebtFileUpload(e);
    } else {
      alert("Le fichier doit commencer par 'Holdings AM Transparency' ou 'FI Holdings'");
    }
  }} className="hidden" />
  <Upload className="h-3.5 w-3.5 text-slate-400 group-hover:text-sky-600" />
  <span className="text-xs font-bold text-slate-700">Importer</span>
  {uploading && <Loader2 className="h-3 w-3 text-sky-600 animate-spin" />}
  {uploadSuccess && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
</label>
  {/* Status Equities */}
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <div className={cn("w-2 h-2 rounded-full shrink-0", equityData.length > 0 ? "bg-sky-400" : "bg-slate-200")} />
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Equities</span>
    {importLog
      ? <span className="text-[10px] text-slate-400 truncate">{importLog.filename} · {new Date(importLog.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
      : <span className="text-[10px] text-slate-300 italic">Aucun import</span>}
  </div>
  <div className="w-px h-6 bg-slate-100 shrink-0" />
  {/* Status Debt */}
  <div className="flex items-center gap-2 flex-1 min-w-0">
    <div className={cn("w-2 h-2 rounded-full shrink-0", debtData.length > 0 ? "bg-emerald-400" : "bg-slate-200")} />
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Debt</span>
    {debtImportLog
      ? <span className="text-[10px] text-slate-400 truncate">{debtImportLog.filename} · {new Date(debtImportLog.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
      : <span className="text-[10px] text-slate-300 italic">Aucun import</span>}
  </div>
</div>


{view === "Equities" && (
  <>
    {equityRows.length === 0 ? (
      <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
        <TableIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="text-lg">Aucune donnée. Importez un fichier Holdings AM Transparency.</p>
      </div>
    ) : (
      <>
        {/* KPI cards — toujours basées sur level 1 */}
        {(() => {
          const lvl1 = equityRows.find((r: any) => r.level === 1);
          const lvl2 = equityRows.filter((r: any) => r.level === 2);
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MtM Total</p>
                <p className="text-2xl font-bold text-slate-900">{fmtM(lvl1?.mtm_ptf ?? null)}</p>
                <p className="text-xs text-slate-400 mt-0.5">EUR</p>
              </div>
             {lvl2.map((r: any) => {
  if (r.name !== "Cash") return (
    <div key={r.name} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{r.name}</p>
      <p className="text-2xl font-bold text-slate-900">{fmtM(r.mtm_ptf ?? null)}</p>
      <p className="text-xs text-slate-400 mt-0.5">{r.expo_pct != null ? (Number(r.expo_pct) * 100).toFixed(1) + "%" : "—"}</p>
    </div>
  );

  // KPI Cash — calcul niveau 5
const CASH_ISINS = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
const cashLines = equityRows.filter((row: any) =>
  row.level === 5 &&
  (
    CASH_ISINS.has((row.isin ?? "").toUpperCase()) ||
    (row.instrument_type ?? "").toUpperCase().includes("DEPOSIT")
  )
);
const totalCashExpo = cashLines.reduce((s: number, row: any) => s + Number(row.wght_ptf_ref ?? 0), 0) * 100;

  return (
    <div key={r.name}
      onClick={() => setShowSamdpDetail("cash_detail" as any)}
      className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-sky-200 hover:shadow-md transition-all">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cash</p>
      <p className="text-2xl font-bold text-slate-900">{totalCashExpo.toFixed(2)}%</p>
      <p className="text-xs text-slate-400 mt-0.5">{cashLines.length} ligne{cashLines.length > 1 ? "s" : ""} · cliquez pour détail</p>
    </div>
  );
})}
            </div>
          );
        })()}

        {/* Graphes exposition — uniquement pour les lignes ETF EQUITIES level 4 */}
        {(() => {
const etfRows = equityRows.filter((r: any) => 
  r.level === 5 && r.isin
);
          if (etfRows.length === 0) return null;

          const COUNTRY_TO_REGION: Record<string, string> = {
            "United States": "US", "Canada": "US",
            "Belgium": "Europe", "France": "Europe", "Germany": "Europe", "Italy": "Europe",
            "Spain": "Europe", "Netherlands": "Europe", "Ireland": "Europe", "Austria": "Europe",
            "Denmark": "Europe", "Finland": "Europe", "Norway": "Europe", "Luxembourg": "Europe",
            "Sweden": "Europe", "Switzerland": "Europe", "Portugal": "Europe", "United Kingdom": "Europe",
            "Japan": "Japan",
            "China": "EM", "South Korea": "EM", "Korea": "EM", "India": "EM", "Brazil": "EM",
            "Taiwan": "EM", "Mexico": "EM", "South Africa": "EM", "Malaysia": "EM",
            "Australia": "Others", "Singapore": "Others", "Hong Kong": "Others",
          };
          const REGION_COLORS: Record<string, string> = {
            "US": "#0ea5e9", "Europe": "#10b981", "EM": "#f59e0b", "Japan": "#8b5cf6", "Others": "#94a3b8",
          };
          const CUR_COLORS: Record<string, string> = {
            "EUR": "#0ea5e9", "USD": "#10b981", "JPY": "#f59e0b", "GBP": "#8b5cf6", "CHF": "#ec4899",
          };

          const regionMap = new Map<string, number>();
          const currencyMap = new Map<string, number>();
          const totalWghtEtf = etfRows.reduce((s: number, r: any) => s + Number(r.wght_pct ?? 0), 0);

const CASH_ISINS_REGION = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
etfRows.forEach((inst: any) => {
  const w = Number(inst.expo_pct ?? 0) * 100;
  if (w === 0) return;
  const override = manualOverrides.find((ov: any) =>
    (ov.manual_isin && ov.manual_isin === inst.isin) ||
    (ov.original_asset_name && ov.original_asset_name === inst.name)
  );
  const isin = override?.manual_isin || inst.isin;

  // Exclure le cash du calcul régional
  const isCash = CASH_ISINS_REGION.has((inst.isin ?? "").toUpperCase()) ||
    (inst.instrument_type ?? "").toUpperCase().includes("DEPOSIT");

  if (!isCash) {
    const breakdown = breakdowns[isin];
    if (breakdown && breakdown.length > 0) {
      breakdown.forEach((entry: any) => {
        regionMap.set(entry.region, (regionMap.get(entry.region) ?? 0) + w * entry.weight / 100);
      });
    } else {
      const region = override?.manual_region || COUNTRY_TO_REGION[inst.dom_country ?? ""] || "Others";
      regionMap.set(region, (regionMap.get(region) ?? 0) + w);
    }
  }

  // La devise on la garde pour tous les instruments y compris cash
  const currency = (override?.manual_currency || inst.currency || "Other").toUpperCase();
  currencyMap.set(currency, (currencyMap.get(currency) ?? 0) + w);
});

        
console.log("regionMap graphe:", Array.from(regionMap.entries()));
console.log("etfRows utilisés:", etfRows.map((r: any) => `${r.name} expo=${r.expo_pct} region=${manualOverrides.find((ov: any) => ov.manual_isin === r.isin || ov.original_asset_name === r.name)?.manual_region ?? "no override"}`));
        
          const regionData = Array.from(regionMap.entries()).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
          const currencyData = Array.from(currencyMap.entries()).map(([label, value]) => ({ label, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 onClick={() => setShowSamdpDetail("region_equity")} className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 cursor-pointer hover:text-amber-700">
                  <Globe className="h-4 w-4 text-amber-600" />Exposition Régionale
                </h3>
                <div className="space-y-3">
                  {regionData.map(({ name, value }) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-16 shrink-0" style={{ color: REGION_COLORS[name] ?? "#94a3b8" }}>{name}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: REGION_COLORS[name] ?? "#94a3b8" }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-14 text-right">{value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 onClick={() => setShowSamdpDetail("currency_equity")} className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 cursor-pointer hover:text-sky-700">
                  <Coins className="h-4 w-4 text-sky-600" />Exposition Devise
                </h3>
                <div className="space-y-3">
                  {currencyData.map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs font-bold w-10 shrink-0" style={{ color: CUR_COLORS[label] ?? "#94a3b8" }}>{label}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: CUR_COLORS[label] ?? "#94a3b8" }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-14 text-right">{value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Filtre par niveau */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Niveau</span>
          {([1, 2, 3, 4, 5] as const).map(lvl => (
            <button key={lvl} onClick={() => setEquityLevel(lvl)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                equityLevel === lvl ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
              Niveau {lvl}
            </button>
          ))}
        </div>
<div className="flex items-center gap-4 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-100 shrink-0" />Cash</span>
  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 shrink-0" />Futures</span>
  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 shrink-0" />Mutual funds</span>
  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-100 shrink-0" />Options</span>
</div>
{/* Filtre par niveau */}
<div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input type="text" value={equitySearch} onChange={e => setEquitySearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
            {equitySearch && <button onClick={() => setEquitySearch("")} className="p-0.5 hover:bg-slate-100 rounded"><X className="h-3.5 w-3.5 text-slate-400" /></button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50">
                  {[
                    { label: "Instrument", align: "left" },
                    { label: "ISIN", align: "left" },
                    { label: "Type", align: "left" },
                    { label: "Devise", align: "left" },
                    { label: "Quantité", align: "right" },
                    { label: "MtM (EUR)", align: "right" },
                    { label: "Expo% (PTF)", align: "right" },
                    { label: "Wght% (PTF)", align: "right" },
                    { label: "Wght% (PTF-REF)", align: "right" },
                  ].map(({ label, align }) => (
                    <th key={label} className={cn("px-4 py-3 font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap", align === "right" ? "text-right" : "text-left")}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {equityRows
                  .filter((r: any) => r.level === equityLevel)
                  .filter((r: any) => {
                    if (!equitySearch) return true;
                    const q = equitySearch.toLowerCase();
                    return (r.name ?? "").toLowerCase().includes(q) || (r.isin ?? "").toLowerCase().includes(q);
                  })
.map((r: any, i: number) => {
  let parentL2 = "";
  if (r.level === 2) parentL2 = r.name;
  else {
    const idx = equityRows.indexOf(r);
    for (let j = idx - 1; j >= 0; j--) {
      if (equityRows[j].level === 2) { parentL2 = equityRows[j].name; break; }
      if (equityRows[j].level === 1) break;
    }
  }
  const GROUP_COLORS: Record<string, string> = {
    "Cash": "bg-sky-50/60",
    "Futures": "bg-amber-50/60",
    "Mutual funds": "bg-emerald-50/60",
    "Options": "bg-violet-50/60",
  };
  const groupColor = r.level === 1 ? "bg-slate-800 text-white" : GROUP_COLORS[parentL2] ?? "";
  return (
    <tr key={i} className={cn("transition-colors", groupColor, r.level === 1 ? "font-bold" : "")}>
      <td className="px-4 py-3 truncate max-w-[100px]">
        {r.level === 5 && r.isin ? (
          <button onClick={() => {
            const override = manualOverrides.find((ov: any) =>
              (ov.manual_isin && ov.manual_isin === r.isin) ||
              (ov.original_asset_name && ov.original_asset_name === r.name)
            );
            onSelectInstrument({
              asset_name: override?.manual_asset_name || r.name,
              original_asset_name: r.name,
              isin: override?.manual_isin || r.isin,
              category: override?.manual_category || "Equities",
              region: override?.manual_region || "",
              currency: override?.manual_currency || (r.currency ?? ""),
              instrument: override?.manual_instrument || (r.instrument_type ?? "ETF"),
              weight: Number(r.wght_pct ?? 0) * 100,
            } as any);
          }} className="font-medium text-sky-600 hover:underline text-left">
            {r.name}
          </button>
        ) : (
          <span className={cn("font-medium", r.level <= 2 ? "text-slate-900" : "text-slate-600")}>{r.name}</span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-sky-600">{r.isin ?? "—"}</td>
      <td className="px-4 py-3 text-slate-500 text-[10px]">{r.instrument_type ?? "—"}</td>
      <td className="px-4 py-3 text-slate-600">{r.currency ?? "—"}</td>
      <td className="px-4 py-3 text-right text-slate-600">{r.quantity != null ? Number(r.quantity).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—"}</td>
      <td className="px-4 py-3 text-right font-bold text-slate-900">{r.mtm_ptf != null ? Number(r.mtm_ptf).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) : "—"}</td>
      <td className="px-4 py-3 text-right text-slate-600">{r.expo_pct != null ? (Number(r.expo_pct) * 100).toFixed(2) + "%" : "—"}</td>
      <td className="px-4 py-3 text-right font-bold text-sky-600">{r.wght_pct != null ? (Number(r.wght_pct) * 100).toFixed(2) + "%" : "—"}</td>
   <td className="px-4 py-3 text-right text-slate-600">{r.wght_ptf_ref != null ? (Number(r.wght_ptf_ref) * 100).toFixed(2) + "%" : "—"}</td>
    </tr>
  );
})}
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-bold text-xs">
                  <td className="px-4 py-3 text-slate-700">Total</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right text-slate-700">
                    {equityRows.filter((r: any) => r.level === equityLevel).reduce((s: number, r: any) => s + Number(r.quantity ?? 0), 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-900">
                    {equityRows.filter((r: any) => r.level === equityLevel).reduce((s: number, r: any) => s + Number(r.mtm_ptf ?? 0), 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {(equityRows.filter((r: any) => r.level === equityLevel).reduce((s: number, r: any) => s + Number(r.expo_pct ?? 0), 0) * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-sky-600">
                    {(equityRows.filter((r: any) => r.level === equityLevel).reduce((s: number, r: any) => s + Number(r.wght_pct ?? 0), 0) * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {(equityRows.filter((r: any) => r.level === equityLevel).reduce((s: number, r: any) => s + Number(r.wght_ptf_ref ?? 0), 0) * 100).toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
  </>
)}

      {/* ── VUE DEBT ── */}
{view === "Debt" && (
  <>
    {console.log("debtData:", debtData, "length:", debtData.length)}
    {debtData.length === 0 ? (
      <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
        <TableIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="text-lg">Aucune donnée. Importez un fichier FI Holdings.</p>
      </div>
    ) : (
      <>
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
{ label: "Instruments", value: debtData.filter((i: any) => i.level === 2).length.toString(), sub: "Obligations & ETF Bonds" },
            { label: "Poids Total", value: (totalDebtWght * 100).toFixed(2) + "%", sub: "Wght% cumulé" },
            { label: "MtM Total", value: fmtM(totalDebtMtm), sub: "EUR" },
            { label: "Duration Moy.", value: avgDuration.toFixed(2), sub: "années (pondérée)" },
          ].map(({ label, value, sub }) => (
<div key={label} onClick={() => label === "Duration Moy." ? setShowSamdpDetail("duration_debt") : null} className={cn("bg-white p-5 rounded-2xl border border-slate-100 shadow-sm", label === "Duration Moy." && "cursor-pointer hover:border-sky-200 hover:shadow-md transition-all")}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

{/* ── Expositions devise + credit ── */}
{debtData.length > 0 && (() => {
  const CUR_COLORS_LOCAL: Record<string, string> = {
    "EUR": "#0ea5e9", "USD": "#10b981", "JPY": "#f59e0b",
    "GBP": "#8b5cf6", "CHF": "#ec4899",
  };
  const CREDIT_COLORS_LOCAL: Record<string, string> = {
    "IG": "#10b981", "HY": "#f59e0b", "Govies": "#0ea5e9",
    "EM Debt": "#8b5cf6", "NR": "#94a3b8",
  };

  const currencyMap = new Map<string, number>();
  const creditMap = new Map<string, number>();

const LEVEL1_NAMES_GRAPH = new Set(["CASH: PROVISION", "CURRENCY", "ETF BONDS", "FIXED RATE BOND", "FLOATING RATE BOND"]);
const debtLevel2Graph = debtData.filter((i: any) => i.level === 2 && !LEVEL1_NAMES_GRAPH.has(i.name));
debtLevel2Graph.forEach(inst => {
  const w = Number(inst.wght_pct ?? 0) * 100;
  if (w === 0) return;

  const override = manualOverrides.find(ov =>
    (ov.manual_isin && ov.manual_isin === inst.isin) ||
    (ov.original_asset_name && ov.original_asset_name === inst.name)
  );

  // Devise — priorité override
  const currency = (override?.manual_currency || inst.currency || "Other").toUpperCase();
  currencyMap.set(currency, (currencyMap.get(currency) ?? 0) + w);

  const manualCreditBreakdown = inst.isin ? creditBreakdowns[inst.isin] : null;
  const ighy = inst.ig_hy ?? "NR";
  const sector = inst.bics_sector_1 ?? "";

  if (manualCreditBreakdown && manualCreditBreakdown.length > 0) {
    manualCreditBreakdown.forEach((e: any) => {
      creditMap.set(e.credit_type, (creditMap.get(e.credit_type) ?? 0) + w * e.weight / 100);
    });
  } else {
    let credit = ighy;
    if (override?.manual_category && ["Govies", "IG", "HY", "NR", "EM Debt"].includes(override.manual_category)) {
      credit = override.manual_category;
    } else if (sector.toLowerCase().includes("government") || sector.toLowerCase().includes("sovereign")) {
      credit = "Govies";
    } else if (ighy === "IG") {
      credit = "IG";
    } else if (ighy === "HY") {
      credit = "HY";
    } else {
      credit = "NR";
    }
    creditMap.set(credit, (creditMap.get(credit) ?? 0) + w);
  }
  });
  
  const currencyData = Array.from(currencyMap.entries())
    .map(([label, value]) => ({ label, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);

  const creditData = Array.from(creditMap.entries())
    .map(([label, value]) => ({ label, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
{/* Exposition Devise */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Coins className="h-4 w-4 text-sky-600" />Exposition Devise
        </h3>
        <div className="space-y-3">
          {currencyData.map(({ label, value }) => (
            <div key={label} onClick={() => { setCurrencyDebtFilter(label); setShowSamdpDetail("currency_debt"); }}
              className="flex items-center gap-3 cursor-pointer group">
              <span className="text-xs font-bold w-10 shrink-0 group-hover:opacity-70 transition-opacity" style={{ color: CUR_COLORS_LOCAL[label] ?? "#94a3b8" }}>{label}</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all group-hover:opacity-75"
                  style={{ width: `${Math.min(100, value)}%`, backgroundColor: CUR_COLORS_LOCAL[label] ?? "#94a3b8" }} />
              </div>
              <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{value.toFixed(1)}%</span>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </div>
          ))}
          <p className="text-[10px] text-slate-400 italic pt-1">Cliquez pour détail</p>
        </div>
      </div>

{/* Credit Quality */}
<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
    <TrendingUp className="h-4 w-4 text-violet-600" />Credit Quality
  </h3>
  <div className="space-y-3">
    {creditData.map(({ label, value }) => (
      <div key={label} onClick={() => { setCreditDebtFilter(label); setShowSamdpDetail("credit_debt"); }}
        className="flex items-center gap-3 cursor-pointer group">
        <span className="text-xs font-bold w-16 shrink-0 group-hover:opacity-70 transition-opacity" style={{ color: CREDIT_COLORS_LOCAL[label] ?? "#94a3b8" }}>{label}</span>
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all group-hover:opacity-75"
            style={{ width: `${Math.min(100, value)}%`, backgroundColor: CREDIT_COLORS_LOCAL[label] ?? "#94a3b8" }} />
        </div>
        <span className="text-xs font-bold text-slate-700 w-14 text-right shrink-0">{value.toFixed(1)}%</span>
        <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
      </div>
    ))}
    <p className="text-[10px] text-slate-400 italic pt-1">Cliquez pour détail</p>
  </div>
</div>
    </div>
  );
})()}
        {/* Filtre par niveau hiérarchique */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Niveau</span>
{([1, 2] as const).map(lvl => (
            <button key={lvl} onClick={() => setDebtHierarchyLevel(lvl)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                debtHierarchyLevel === lvl ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
              {lvl === 1 ? "Par type" : "Détail"}
            </button>
          ))}
        </div>
{/* Légende types d'instruments */}
        {(() => {
          const types = Array.from(new Set(debtData.filter((i: any) => i.level === debtHierarchyLevel && i.instrument_type).map((i: any) => i.instrument_type as string)));
          const TYPE_COLORS: Record<string, string> = {
            "ETF BONDS": "#0ea5e9",
            "FIXED RATE BOND": "#10b981",
            "FLOATING RATE BOND": "#f59e0b",
            "CURRENCY": "#94a3b8",
            "CASH: PROVISION": "#cbd5e1",
          };
          if (types.length === 0) return null;
          return (
            <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-wrap">
              {types.map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: TYPE_COLORS[t] ?? "#94a3b8", opacity: 0.4 }} />
                  {t}
                </span>
              ))}
            </div>
          );
        })()}

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input type="text" value={debtSearch} onChange={e => setDebtSearch(e.target.value)}
              onChange={e => setDebtSearch(e.target.value)}
              placeholder="Rechercher un instrument, ISIN ou émetteur…"
              className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
            {debtSearch && <button onClick={() => setDebtSearch("")} className="p-0.5 hover:bg-slate-100 rounded"><X className="h-3.5 w-3.5 text-slate-400" /></button>}
            <span className="text-xs text-slate-400 shrink-0">{filteredDebt.length} résultat{filteredDebt.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50">
                 {[
                    { key: "name", label: "Instrument", align: "left" },
                    { key: "isin", label: "ISIN", align: "left" },
                    { key: "instrument_type", label: "Type", align: "left" },
                    { key: "issuer", label: "Émetteur", align: "left" },
                    { key: "mtm_ptf", label: "MtM (EUR)", align: "right" },
                    { key: "wght_pct", label: "Wght%", align: "right" },
                    { key: "expo_pct", label: "Expo%", align: "right" },
                    { key: "modified_duration", label: "Mod. Dur.", align: "right" },
                    { key: "currency", label: "Devise", align: "left" },
                    { key: "bics_sector_1", label: "Secteur", align: "left" },
                    { key: "rating_cai", label: "Rating", align: "left" },
                    { key: "ig_hy", label: "IG/HY", align: "left" },
                  ].map(({ key, label, align }) => (
                    <th key={key} className={cn("px-4 py-3 font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap", align === "right" ? "text-right" : "text-left")}>
                      <span className="flex items-center gap-1" style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
                        {label}
                        <button onClick={() => setDebtSortConfig(prev =>
                          prev?.key === key
                            ? prev.direction === "asc" ? { key, direction: "desc" } : null
                            : { key, direction: "desc" }
                        )} className="inline-flex items-center gap-0.5 hover:text-slate-900">
                          {debtSortConfig?.key === key
                            ? debtSortConfig.direction === "asc"
                              ? <ChevronUp className="h-3 w-3 text-sky-600" />
                              : <ChevronDown className="h-3 w-3 text-sky-600" />
                            : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                        </button>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
{filteredDebt.map((inst: any) => {
                  const TYPE_ROW_COLORS: Record<string, string> = {
                    "ETF BONDS": "bg-sky-50/60",
                    "FIXED RATE BOND": "bg-emerald-50/60",
                    "FLOATING RATE BOND": "bg-amber-50/60",
                    "CURRENCY": "bg-slate-50/60",
                    "CASH: PROVISION": "bg-slate-50/40",
                  };
                  const rowColor = TYPE_ROW_COLORS[inst.instrument_type ?? ""] ?? "";
                  return (
                  <tr key={inst.id ?? `${inst.name}-${inst.row_index}`} className={cn("transition-colors hover:opacity-90", rowColor)}>
                    <td className="px-4 py-3 truncate max-w-[200px]">
                      <button
                        onClick={() => {
                          const override = manualOverrides.find(
                            ov => (ov.manual_isin && ov.manual_isin === inst.isin) ||
                                  (ov.original_asset_name && ov.original_asset_name === inst.name)
                          );
                          onSelectInstrument({
                            asset_name: override?.manual_asset_name || inst.name,
                            original_asset_name: inst.name,
                            isin: override?.manual_isin || inst.isin,
                            category: override?.manual_category || "Fixed Income",
                            region: override?.manual_region || (inst.dom_country ?? ""),
                            currency: override?.manual_currency || (inst.currency ?? ""),
                            instrument: override?.manual_instrument || (inst.instrument_type ?? "Bond"),
                            weight: Number(inst.wght_pct ?? 0) * 100,
                          } as any);
                        }}
                        className="font-medium text-sky-600 hover:underline text-left truncate">
                        {inst.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-sky-600 font-bold">{inst.isin ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">{inst.instrument_type ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[120px]">{inst.issuer ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{inst.mtm_ptf != null ? Number(inst.mtm_ptf).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-sky-600">{inst.wght_pct != null ? (Number(inst.wght_pct) * 100).toFixed(2) + "%" : "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{inst.expo_pct != null ? (Number(inst.expo_pct) * 100).toFixed(2) + "%" : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{inst.modified_duration != null ? Number(inst.modified_duration).toFixed(2) : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{inst.currency ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[100px]">{inst.bics_sector_1 ?? "—"}</td>
                    <td className="px-4 py-3">
                      {inst.rating_cai && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700">{inst.rating_cai}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {inst.ig_hy && (
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
                          inst.ig_hy === "IG" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                          {inst.ig_hy}
                        </span>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
<tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={4} className="px-4 py-3 font-bold text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {filteredDebt.reduce((s: number, i: any) => s + Number(i.mtm_ptf ?? 0), 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-sky-600">
                    {(filteredDebt.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0) * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {(filteredDebt.reduce((s: number, i: any) => s + Number(i.expo_pct ?? 0), 0) * 100).toFixed(2)}%
                  </td>
                  <td colSpan={5} className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>
    )}
  </>
)}
 {/* ── VUE EXPORT ── */}
{view === "Export" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600">Prévisualisation A4</p>
<button onClick={handleExportPdf} className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-sky-700 transition-all">
                <FileText className="h-4 w-4" />
                Exporter PDF
              </button>
            </div>
            <div className="flex flex-col items-center gap-8 p-8 bg-slate-100">
              <div ref={exportRef}>
                
              {/* ── PAGE 1 : EQUITIES ── */}
                <div className="page bg-white shadow-2xl" style={{ fontFamily: "system-ui, sans-serif" }}>
  
                {/* ── EN-TÊTE ── */}
<div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "16px", borderBottom: "2px solid #0f172a" }}>
                  <div>
                    <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>SAMDP Fund Report</h1>
                    <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                      {importLog ? new Date(importLog.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                      {debtImportLog ? ` · Debt: ${new Date(debtImportLog.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {(() => {
                      const lvl1 = equityRows.find((r: any) => r.level === 1);
                      return (
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Equities MtM</p>
                          <p style={{ fontSize: "16px", fontWeight: 800, color: "#0ea5e9" }}>{fmtM(lvl1?.mtm_ptf ?? null)}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── TEXTE FIXE ── */}
                <div style={{ marginBottom: "14px", padding: "10px 12px", background: "#f8fafc", borderRadius: "6px", borderLeft: "3px solid #0ea5e9" }}>
                  <p style={{ fontSize: "8px", color: "#475569", lineHeight: "1.6", margin: 0 }}>
                    The proposed solution offers an efficient and flexible way to implement both strategic and tactical asset allocation. It enables rapid deployment without requiring portfolio managers to execute transactions directly within AVQ. This approach also facilitates the consistent use of derivatives across all client portfolios, primarily for hedging purposes, including instruments such as options (calls and puts), FX forwards, and futures. By centralizing exposures, it helps avoid the multiplication of very small positions in individual portfolios, thereby improving overall portfolio clarity and efficiency.
                    The structure is based in Luxembourg, which are not registered with the FSMA and therefore are not subject to TOB. The asset manager is DPAS, with CACEIS acting as custodian. These vehicles are exclusively designed for discretionary mandates and are not intended for commercial distribution.
                    From a cost perspective, management fees (N share class) are set at 0.50% for the equity fund and 0.25% for debt and currency strategies. Taxation follows the asset test methodology, as no TIS is calculated.
                    In terms of portfolio construction, the fund may hold up to 10% in cash, with short-term treasuries used for liquidity management. Its composition can vary significantly over time and should therefore not be assessed on a standalone basis. Instead, it plays a key role as a core building block within model portfolios, where it can carry a significant weight.
                  </p>
                </div>
                  
                {/* ── SECTION 1 : EQUITIES ── */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                    <div style={{ width: "3px", height: "14px", background: "#0ea5e9", borderRadius: "2px" }} />
                    <p style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>SAMDP Equities</p>
                  </div>

                  {/* Graphes région + devise */}
                  {(() => {
                    const etfRows = equityRows.filter((r: any) => r.level === 5 && r.isin);
                    const COUNTRY_TO_REGION: Record<string, string> = {
                      "United States": "US", "Canada": "US",
                      "Belgium": "Europe", "France": "Europe", "Germany": "Europe", "Italy": "Europe",
                      "Spain": "Europe", "Netherlands": "Europe", "Ireland": "Europe", "Austria": "Europe",
                      "Sweden": "Europe", "Switzerland": "Europe", "United Kingdom": "Europe",
                      "Japan": "Japan", "China": "EM", "South Korea": "EM", "India": "EM",
                      "Brazil": "EM", "Taiwan": "EM",
                    };
                    const REGION_COLORS: Record<string, string> = { "US": "#0ea5e9", "Europe": "#10b981", "EM": "#f59e0b", "Japan": "#8b5cf6", "Others": "#94a3b8" };
                    const CUR_COLORS_EXP: Record<string, string> = { "EUR": "#0ea5e9", "USD": "#10b981", "JPY": "#f59e0b", "GBP": "#8b5cf6", "CHF": "#ec4899" };
                    const regionMap = new Map<string, number>();
                    const currencyMap = new Map<string, number>();
                    const CASH_ISINS_EXPORT = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
                    etfRows.forEach((inst: any) => {
                      const w = Number(inst.expo_pct ?? 0) * 100;
                      if (w === 0) return;
                      const override = manualOverrides.find((ov: any) => (ov.manual_isin && ov.manual_isin === inst.isin) || (ov.original_asset_name && ov.original_asset_name === inst.name));
                      const isin = override?.manual_isin || inst.isin;
                      const isCash = CASH_ISINS_EXPORT.has((inst.isin ?? "").toUpperCase()) ||
                        (inst.instrument_type ?? "").toUpperCase().includes("DEPOSIT");
                      if (!isCash) {
                        const bd = breakdowns[isin];
                        if (bd && bd.length > 0) {
                          bd.forEach((e: any) => regionMap.set(e.region, (regionMap.get(e.region) ?? 0) + w * e.weight / 100));
                        } else {
                          const region = override?.manual_region || COUNTRY_TO_REGION[inst.dom_country ?? ""] || "Others";
                          regionMap.set(region, (regionMap.get(region) ?? 0) + w);
                        }
                      }
                      const currency = (override?.manual_currency || inst.currency || "Other").toUpperCase();
                      currencyMap.set(currency, (currencyMap.get(currency) ?? 0) + w);
                    });
                    const regionData = Array.from(regionMap.entries()).map(([n, v]) => ({ name: n, value: +v.toFixed(1) })).sort((a, b) => b.value - a.value);
                    const currencyData = Array.from(currencyMap.entries()).map(([n, v]) => ({ name: n, value: +v.toFixed(1) })).sort((a, b) => b.value - a.value);
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "10px" }}>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px" }}>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Exposition Régionale</p>
                          {regionData.map(({ name, value }) => (
                            <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "9px", fontWeight: 700, width: "40px", color: REGION_COLORS[name] ?? "#94a3b8", flexShrink: 0 }}>{name}</span>
                              <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: REGION_COLORS[name] ?? "#94a3b8", borderRadius: "3px" }} />
                              </div>
                              <span style={{ fontSize: "9px", fontWeight: 700, color: "#0f172a", width: "32px", textAlign: "right", flexShrink: 0 }}>{value.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px" }}>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Exposition Devise</p>
                          {currencyData.map(({ name, value }) => (
                            <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "9px", fontWeight: 700, width: "32px", color: CUR_COLORS_EXP[name] ?? "#94a3b8", flexShrink: 0 }}>{name}</span>
                              <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: CUR_COLORS_EXP[name] ?? "#94a3b8", borderRadius: "3px" }} />
                              </div>
                              <span style={{ fontSize: "9px", fontWeight: 700, color: "#0f172a", width: "32px", textAlign: "right", flexShrink: 0 }}>{value.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Niveau 2 */}
                  <div style={{ marginBottom: "8px" }}>
                    <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Allocation Niveau 2</p>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {equityRows.filter((r: any) => r.level === 2).map((r: any) => {
                        const label = r.name === "Cash" ? "Cash" : r.name;
                        const CASH_ISINS = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
                        const val = r.name === "Cash"
                          ? equityRows.filter((row: any) => row.level === 5 && (CASH_ISINS.has((row.isin ?? "").toUpperCase()) || (row.instrument_type ?? "").toUpperCase().includes("DEPOSIT"))).reduce((s: number, row: any) => s + Number(row.wght_ptf_ref ?? 0), 0) * 100
                          : r.expo_pct != null ? Number(r.expo_pct) * 100 : 0;
                        const COLORS_LVL2: Record<string, string> = { "Mutual funds": "#0ea5e9", "Cash": "#10b981", "Futures": "#f59e0b", "Options": "#8b5cf6" };
                        return (
                          <div key={r.name} style={{ flex: 1, background: "#f8fafc", borderRadius: "6px", padding: "8px", textAlign: "center", borderTop: `3px solid ${COLORS_LVL2[r.name] ?? "#94a3b8"}` }}>
                            <p style={{ fontSize: "8px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", margin: "0 0 2px 0" }}>{label}</p>
                            <p style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", margin: 0 }}>{val.toFixed(1)}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top holdings niveau 5 */}
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Top Holdings</p>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["Instrument", "ISIN", "Devise", "Expo%"].map(h => (
                            <th key={h} style={{ padding: "4px 6px", textAlign: h === "Expo%" ? "right" : "left", fontWeight: 700, color: "#64748b", textTransform: "uppercase", fontSize: "8px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                       {equityRows.filter((r: any) => r.level === 5 && r.isin && Number(r.expo_pct ?? 0) > 0)
                          .sort((a: any, b: any) => Number(b.expo_pct ?? 0) - Number(a.expo_pct ?? 0))
                          .map((r: any, i: number) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "3px 6px", color: "#0f172a", fontWeight: 500, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</td>
                              <td style={{ padding: "3px 6px", color: "#0ea5e9", fontFamily: "monospace" }}>{r.isin}</td>
                              <td style={{ padding: "3px 6px", color: "#64748b" }}>{r.currency ?? "—"}</td>
                              <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{(Number(r.expo_pct ?? 0) * 100).toFixed(2)}%</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

{/* ── DISCLAIMER PAGE 1 ── */}
                <div style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Note de gestion — Equities</p>
                  <textarea
                    value={exportText}
                    onChange={e => setExportText(e.target.value)}
                    placeholder="Décrivez ici la politique de gestion du fonds Equities…"
                    style={{ width: "100%", minHeight: "80px", fontSize: "9px", color: "#334155", lineHeight: "1.6", border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "8px", resize: "vertical", outline: "none", fontFamily: "system-ui, sans-serif", background: "#fafafa" }}
                  />
                </div>

              </div>

              {/* ── PAGE 2 : DEBT ── */}
<div className="page bg-white shadow-2xl" style={{ fontFamily: "system-ui, sans-serif" }}>

                {/* ── EN-TÊTE PAGE 2 ── */}
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "16px", borderBottom: "2px solid #0f172a" }}>
                  <div>
                    <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>SAMDP Fund Report</h1>
                    <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                      {debtImportLog ? new Date(debtImportLog.imported_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Debt MtM</p>
                    <p style={{ fontSize: "16px", fontWeight: 800, color: "#10b981" }}>{fmtM(debtData.reduce((s, i) => s + Number(i.mtm_ptf ?? 0), 0))}</p>
                  </div>
                </div>

{/* ── TEXTE FIXE ── */}
                <div style={{ marginBottom: "14px", padding: "10px 12px", background: "#f8fafc", borderRadius: "6px", borderLeft: "3px solid #10b981" }}>
                  <p style={{ fontSize: "8px", color: "#475569", lineHeight: "1.6", margin: 0 }}>
                    The proposed solution offers an efficient and flexible way to implement both strategic and tactical asset allocation. It enables rapid deployment without requiring portfolio managers to execute transactions directly within AVQ. This approach also facilitates the consistent use of derivatives across all client portfolios, primarily for hedging purposes, including instruments such as options (calls and puts), FX forwards, and futures. By centralizing exposures, it helps avoid the multiplication of very small positions in individual portfolios, thereby improving overall portfolio clarity and efficiency.
                    The structure is based in Luxembourg, which are not registered with the FSMA and therefore are not subject to TOB. The asset manager is DPAS, with CACEIS acting as custodian. These vehicles are exclusively designed for discretionary mandates and are not intended for commercial distribution.
                    From a cost perspective, management fees (N share class) are set at 0.50% for the equity fund and 0.25% for debt and currency strategies. Taxation follows the asset test methodology, as no TIS is calculated.
                    In terms of portfolio construction, the fund may hold up to 10% in cash, with short-term treasuries used for liquidity management. Its composition can vary significantly over time and should therefore not be assessed on a standalone basis. Instead, it plays a key role as a core building block within model portfolios, where it can carry a significant weight.
                  </p>
                </div>

                {/* ── SECTION 2 : DEBT ── */}
                <div>
<div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                    <div style={{ width: "3px", height: "14px", background: "#10b981", borderRadius: "2px" }} />
                    <p style={{ fontSize: "11px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>SAMDP Debt</p>
                  </div>

{/* KPIs Debt */}
{(() => {
  const CREDIT_COLORS_PDF: Record<string, string> = { "IG": "#10b981", "HY": "#f59e0b", "Govies": "#0ea5e9", "NR": "#94a3b8" };
  const CUR_COLORS_PDF: Record<string, string> = { "EUR": "#0ea5e9", "USD": "#10b981", "GBP": "#8b5cf6", "JPY": "#f59e0b" };
  const creditMap = new Map<string, number>();
  const currencyMap = new Map<string, number>();
  const LEVEL1_NAMES_PDF = new Set(["CASH: PROVISION", "CURRENCY", "ETF BONDS", "FIXED RATE BOND", "FLOATING RATE BOND"]);
  const debtLevel2 = debtData.filter((i: any) => i.level === 2 && !LEVEL1_NAMES_PDF.has(i.name));
  debtLevel2.forEach((inst: any) => {
    const w = Number(inst.wght_pct ?? 0) * 100;
    if (w === 0) return;
    // Devise
    const override = manualOverrides.find((ov: any) =>
      (ov.manual_isin && ov.manual_isin === inst.isin) ||
      (ov.original_asset_name && ov.original_asset_name === inst.name)
    );
    const currency = (override?.manual_currency || inst.currency || "Other").toUpperCase();
    currencyMap.set(currency, (currencyMap.get(currency) ?? 0) + w);
    // Credit — priorité 1 : creditBreakdowns manuel
    const manualCbd = inst.isin ? creditBreakdowns[inst.isin] : null;
    if (manualCbd && manualCbd.length > 0) {
      manualCbd.forEach((e: any) => {
        creditMap.set(e.credit_type, (creditMap.get(e.credit_type) ?? 0) + w * e.weight / 100);
      });
    } else {
      const sector = inst.bics_sector_1 ?? "";
      let credit = inst.ig_hy ?? "NR";
      if (override?.manual_category && ["Govies", "IG", "HY", "NR", "EM Debt"].includes(override.manual_category)) {
        credit = override.manual_category;
      } else if (sector.toLowerCase().includes("government") || sector.toLowerCase().includes("sovereign")) {
        credit = "Govies";
      } else if (inst.ig_hy === "IG") {
        credit = "IG";
      } else if (inst.ig_hy === "HY") {
        credit = "HY";
      }
      creditMap.set(credit, (creditMap.get(credit) ?? 0) + w);
    }
  });
                    const creditData = Array.from(creditMap.entries()).map(([n, v]) => ({ name: n, value: +v.toFixed(1) })).sort((a, b) => b.value - a.value);
                    const currencyData = Array.from(currencyMap.entries()).map(([n, v]) => ({ name: n, value: +v.toFixed(1) })).sort((a, b) => b.value - a.value);
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: "12px", marginBottom: "10px" }}>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px" }}>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Credit Quality</p>
                          {creditData.map(({ name, value }) => (
                            <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "9px", fontWeight: 700, width: "44px", color: CREDIT_COLORS_PDF[name] ?? "#94a3b8", flexShrink: 0 }}>{name}</span>
                              <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: CREDIT_COLORS_PDF[name] ?? "#94a3b8", borderRadius: "3px" }} />
                              </div>
                              <span style={{ fontSize: "9px", fontWeight: 700, color: "#0f172a", width: "32px", textAlign: "right", flexShrink: 0 }}>{value.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px" }}>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Exposition Devise</p>
                          {currencyData.map(({ name, value }) => (
                            <div key={name} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "9px", fontWeight: 700, width: "32px", color: CUR_COLORS_PDF[name] ?? "#94a3b8", flexShrink: 0 }}>{name}</span>
                              <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.min(100, value)}%`, background: CUR_COLORS_PDF[name] ?? "#94a3b8", borderRadius: "3px" }} />
                              </div>
                              <span style={{ fontSize: "9px", fontWeight: 700, color: "#0f172a", width: "32px", textAlign: "right", flexShrink: 0 }}>{value.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Duration</p>
                          <p style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1 }}>
                            {(() => {
                              const LEVEL1_NAMES_DUR = new Set(["CASH: PROVISION", "CURRENCY", "ETF BONDS", "FIXED RATE BOND", "FLOATING RATE BOND"]);
                              const leafRows = debtData.filter((i: any) => i.level === 2 && !LEVEL1_NAMES_DUR.has(i.name) && i.isin);
                              const total = leafRows.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
                              return total > 0 ? (leafRows.reduce((s: number, i: any) => s + Number(i.modified_duration ?? 0) * Number(i.wght_pct ?? 0), 0) / total).toFixed(2) : "—";
                            })()}
                          </p>
                          <p style={{ fontSize: "8px", color: "#94a3b8", marginTop: "4px" }}>années</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Top obligations */}
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Top Obligations</p>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["Instrument", "ISIN", "Rating", "Mod. Dur.", "Wght%"].map(h => (
                            <th key={h} style={{ padding: "4px 6px", textAlign: ["Mod. Dur.", "Wght%"].includes(h) ? "right" : "left", fontWeight: 700, color: "#64748b", textTransform: "uppercase", fontSize: "8px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
{[...debtData].sort((a, b) => Number(b.wght_pct ?? 0) - Number(a.wght_pct ?? 0)).map((inst, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "3px 6px", color: "#0f172a", fontWeight: 500, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inst.name}</td>
                            <td style={{ padding: "3px 6px", color: "#10b981", fontFamily: "monospace" }}>{inst.isin}</td>
                            <td style={{ padding: "3px 6px", color: "#64748b" }}>{inst.rating_cai ?? "—"}</td>
                            <td style={{ padding: "3px 6px", textAlign: "right", color: "#64748b" }}>{inst.modified_duration != null ? Number(inst.modified_duration).toFixed(2) : "—"}</td>
                            <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{(Number(inst.wght_pct ?? 0) * 100).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
                </div>

{/* ── DISCLAIMER PAGE 2 ── */}
                <div style={{ marginTop: "20px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
                  <p style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Note de gestion — Debt</p>
                  <textarea
                    value={exportTextDebt}
                    onChange={e => setExportTextDebt(e.target.value)}
                    placeholder="Décrivez ici la politique de gestion du fonds Debt, ses objectifs, son univers d'investissement…"
                    style={{ width: "100%", minHeight: "80px", fontSize: "9px", color: "#334155", lineHeight: "1.6", border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "8px", resize: "vertical", outline: "none", fontFamily: "system-ui, sans-serif", background: "#fafafa" }}
                  />
                </div>

              </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Modales détail ── */}
      {/* ── Modale Devise Equity ── */}
      <Modal isOpen={showSamdpDetail === "currency_equity"} onClose={() => setShowSamdpDetail(null)} title="Détail Exposition Devise — Equities">
        <div className="space-y-3">
          {equityData.map(inst => {
            const w = Number(inst.wght_pct ?? 0) * 100;
            if (w === 0) return null;
            const manualCurrency = manualOverrides.find(ov =>
              (ov.manual_isin && ov.manual_isin === inst.isin) ||
              (ov.original_asset_name && ov.original_asset_name === inst.name)
            )?.manual_currency;
            const currency = (manualCurrency || inst.currency || "Other").toUpperCase();
            return (
              <div key={inst.isin} className="flex items-center justify-between py-2 border-b border-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900 truncate max-w-[280px]">{inst.name}</p>
                  <p className="text-xs text-slate-400">{inst.isin}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">{currency}</span>
                  <span className="text-sm font-bold text-slate-900 w-16 text-right">{w.toFixed(2)}%</span>
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>
      </Modal>

      {/* ── Modale Région Equity ── */}
<Modal isOpen={showSamdpDetail === "region_equity"} onClose={() => { setShowSamdpDetail(null); setRegionFilter(null); }} title="Détail Exposition Régionale — Equities">
  {(() => {
   const CASH_ISINS_MODAL = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
    const allRows = equityRows
      .filter((r: any) => r.level === 5 && r.isin)
      .filter((r: any) => {
        const isCash = CASH_ISINS_MODAL.has((r.isin ?? "").toUpperCase()) ||
          (r.instrument_type ?? "").toUpperCase().includes("DEPOSIT");
        return !isCash;
      })
      .flatMap((inst: any) => {
        const w = Number(inst.expo_pct ?? 0) * 100;
        if (w === 0) return [];
        const override = manualOverrides.find((ov: any) =>
          (ov.manual_isin && ov.manual_isin === inst.isin) ||
          (ov.original_asset_name && ov.original_asset_name === inst.name)
        );
        const breakdown = breakdowns[override?.manual_isin || inst.isin];
        if (breakdown && breakdown.length > 0) {
          return breakdown.map((entry: any) => ({
            name: inst.name, isin: inst.isin,
            region: entry.region,
            exposition: w * entry.weight / 100,
          }));
        }
        const COUNTRY_TO_REGION: Record<string, string> = {
          "United States": "US", "Canada": "US",
          "Belgium": "Europe", "France": "Europe", "Germany": "Europe", "Italy": "Europe",
          "Spain": "Europe", "Netherlands": "Europe", "Ireland": "Europe", "Austria": "Europe",
          "Sweden": "Europe", "Switzerland": "Europe", "United Kingdom": "Europe",
          "Japan": "Japan",
          "China": "EM", "South Korea": "EM", "India": "EM", "Brazil": "EM", "Taiwan": "EM",
        };
        const region = override?.manual_region || COUNTRY_TO_REGION[inst.dom_country ?? ""] || "Others";
        return [{ name: inst.name, isin: inst.isin, region, exposition: w }];
      });

    const regions = Array.from(new Set(allRows.map(r => r.region)));
    const filtered = regionFilter ? allRows.filter(r => r.region === regionFilter) : allRows;
    const totalFiltered = filtered.reduce((s, r) => s + r.exposition, 0);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setRegionFilter(null)}
            className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all",
              !regionFilter ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
            Toutes
          </button>
          {regions.map(r => (
            <button key={r} onClick={() => setRegionFilter(r === regionFilter ? null : r)}
              className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all",
                regionFilter === r ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100")}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
          <span className="text-xs font-bold text-slate-500">Total {regionFilter ?? "toutes régions"}</span>
          <span className="text-sm font-bold text-slate-900">{totalFiltered.toFixed(2)}%</span>
        </div>
        <div className="space-y-2">
          {filtered.sort((a, b) => b.exposition - a.exposition).map((row, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-900 truncate max-w-[280px]">{row.name}</p>
                <p className="text-xs text-slate-400">{row.isin}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{row.region}</span>
                <span className="text-sm font-bold text-slate-900 w-20 text-right">{row.exposition.toFixed(2)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  })()}
</Modal>

{/* ── Modale Devise Debt ── */}
      <Modal isOpen={showSamdpDetail === "currency_debt"} onClose={() => { setShowSamdpDetail(null); setCurrencyDebtFilter(null); }} title={`Détail Exposition Devise — ${currencyDebtFilter ?? "Debt"}`}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500 italic">Instruments contribuant à l'exposition {currencyDebtFilter}.</p>
          {(() => {
            const LEVEL1_NAMES_CUR = new Set(["CASH: PROVISION", "CURRENCY", "ETF BONDS", "FIXED RATE BOND", "FLOATING RATE BOND"]);
            const rows = debtData
              .filter((inst: any) => inst.level === 2 && !LEVEL1_NAMES_CUR.has(inst.name))
              .map((inst: any) => {
                const override = manualOverrides.find((ov: any) =>
                  (ov.manual_isin && ov.manual_isin === inst.isin) ||
                  (ov.original_asset_name && ov.original_asset_name === inst.name)
                );
                const currency = (override?.manual_currency || inst.currency || "Other").toUpperCase();
                if (currency !== currencyDebtFilter) return null;
                const w = Number(inst.wght_pct ?? 0) * 100;
                if (w === 0) return null;
                return { inst, currency, w };
              })
              .filter(Boolean)
              .sort((a: any, b: any) => b.w - a.w);

            const total = rows.reduce((s: number, r: any) => s + r.w, 0);

            return (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Instrument</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Devise</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Wght%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-[240px]">{r.inst.name}</p>
                        <p className="text-xs font-mono text-slate-400">{r.inst.isin ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">{r.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-sky-600">{r.w.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={2} className="px-4 py-3 font-bold text-slate-700 text-right">Total {currencyDebtFilter}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{total.toFixed(2)}%</td>
                  </tr>
                </tfoot>
              </table>
            );
          })()}
        </div>
      </Modal>

{/* ── Modale Credit Quality Debt ── */}
      <Modal isOpen={showSamdpDetail === "credit_debt"} onClose={() => { setShowSamdpDetail(null); setCreditDebtFilter(null); }} title={`Détail Credit Quality — ${creditDebtFilter ?? "Debt"}`}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500 italic">Instruments contribuant à la catégorie {creditDebtFilter}.</p>
          {(() => {
            const LEVEL1_NAMES_MODAL = new Set(["CASH: PROVISION", "CURRENCY", "ETF BONDS", "FIXED RATE BOND", "FLOATING RATE BOND"]);
            const rows = debtData
              .filter((inst: any) => inst.level === 2 && !LEVEL1_NAMES_MODAL.has(inst.name))
              .map((inst: any) => {
                const sector = inst.bics_sector_1 ?? "";
                const override = manualOverrides.find((ov: any) =>
                  (ov.manual_isin && ov.manual_isin === inst.isin) ||
                  (ov.original_asset_name && ov.original_asset_name === inst.name)
                );
const manualCbd = inst.isin ? creditBreakdowns[inst.isin] : null;
                const w = Number(inst.wght_pct ?? 0) * 100;
                if (w === 0) return null;

                if (manualCbd && manualCbd.length > 0) {
                  const filtered = manualCbd.filter((e: any) => e.credit_type === creditDebtFilter);
                  if (filtered.length === 0) return null;
                  const exposition = filtered.reduce((s: number, e: any) => s + w * e.weight / 100, 0);
                  if (exposition < 0.001) return null;
                  return { inst, credit: creditDebtFilter, w: exposition };
                }

                let credit = inst.ig_hy ?? "NR";
                if (override?.manual_category && ["Govies", "IG", "HY", "NR", "EM Debt"].includes(override.manual_category)) {
                  credit = override.manual_category;
                } else if (sector.toLowerCase().includes("government") || sector.toLowerCase().includes("sovereign")) {
                  credit = "Govies";
                }
                if (credit !== creditDebtFilter) return null;
                return { inst, credit, w };
              })
              .filter(Boolean)
              .sort((a: any, b: any) => b.w - a.w);

            const total = rows.reduce((s: number, r: any) => s + r.w, 0);

            return (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Instrument</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Rating</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Wght%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-[220px]">{r.inst.name}</p>
                        <p className="text-xs font-mono text-slate-400">{r.inst.isin ?? "—"} · {r.inst.bics_sector_1 ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                          r.credit === "Govies" ? "bg-sky-50 text-sky-700" :
                          r.credit === "IG" ? "bg-emerald-50 text-emerald-700" :
                          r.credit === "HY" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}>{r.inst.rating_cai ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-violet-600">{r.w.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={2} className="px-4 py-3 font-bold text-slate-700 text-right">Total {creditDebtFilter}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{total.toFixed(2)}%</td>
                  </tr>
                </tfoot>
              </table>
            );
          })()}
        </div>
      </Modal>

      {/* ── Modale Duration Debt ── */}
      <Modal isOpen={showSamdpDetail === "duration_debt"} onClose={() => setShowSamdpDetail(null)} title="Détail Duration — Debt">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Instrument</th>
                <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids</th>
                <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Mod. Duration</th>
                <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {debtData
.filter(inst => inst.modified_duration != null || inst.instrument_type === "CURRENCY")
                .sort((a, b) => Number(b.wght_pct ?? 0) - Number(a.wght_pct ?? 0))
                .map(inst => {
                  const w = Number(inst.wght_pct ?? 0);
                  const dur = Number(inst.modified_duration ?? 0);
                  const contribution = totalDebtWght > 0 ? w * dur / totalDebtWght : 0;
                  return (
                    <tr key={inst.isin} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 truncate max-w-[200px]">
                        <p className="font-medium text-slate-900">{inst.name}</p>
                        <p className="text-xs text-slate-400">{inst.isin}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{(w * 100).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-slate-600">{dur.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-sky-600">{contribution.toFixed(2)}</td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={3} className="px-4 py-3 font-bold text-slate-700 text-right">Duration Moyenne</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">{avgDuration.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Modal>
<Modal isOpen={showSamdpDetail === ("cash_detail" as any)} onClose={() => setShowSamdpDetail(null)} title="Détail Cash — Equities">
  {(() => {
const CASH_ISINS = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
const cashLines = equityRows.filter((row: any) =>
  row.level === 5 &&
  (
    CASH_ISINS.has((row.isin ?? "").toUpperCase()) ||
    (row.instrument_type ?? "").toUpperCase().includes("DEPOSIT")
  )
);
const total = cashLines.reduce((s: number, row: any) => s + Number(row.wght_ptf_ref ?? 0), 0) * 100;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
          <span className="text-xs font-bold text-slate-500">Total Cash</span>
          <span className="text-sm font-bold text-slate-900">{total.toFixed(2)}%</span>
        </div>
        <div className="space-y-2">
          {cashLines.sort((a: any, b: any) => Number(b.expo_pct ?? 0) - Number(a.expo_pct ?? 0)).map((row: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-900">{row.name}</p>
                <p className="text-xs text-slate-400">
                  {row.instrument_type ?? "—"} · {row.currency ?? "—"}
                </p>
              </div>
              <span className="text-sm font-bold text-slate-900 w-20 text-right">
                {(Number(row.wght_ptf_ref ?? 0) * 100).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  })()}
</Modal>
    </div>
  );
}

function RiskAnalysisTab({
  allPortfolios,
  computePassiveActiveGlobal,
  computePassiveActiveByRegion,
  getManagementStyle,
  applyLookThroughWithStyle,
  computeFundOrigins,
  getFundOrigin,
}: {
  allPortfolios: Portfolio[];
  computePassiveActiveGlobal: (holdings: Holding[]) => { passive: number; active: number; passivePct: number; activePct: number };
  computePassiveActiveByRegion: (holdings: Holding[]) => { region: string; passive: number; active: number }[];
  getManagementStyle: (isin: string | null | undefined) => "active" | "passive";
  applyLookThroughWithStyle: (holdings: Holding[]) => { region: string; weight: number; style: "active" | "passive" }[];
computeFundOrigins: (holdings: Holding[]) => {
    dpam: number; select_equities: number; etf_amundi: number; samdp: number; indosuez: number; other: number;
    internal: number; internalPct: number; otherPct: number;
  };
  getFundOrigin: (h: Holding) => "dpam" | "select_equities" | "etf_amundi" | "samdp" | "indosuez" | "other";
}) {
  
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [drillDown, setDrillDown] = React.useState<{ style: "active" | "passive"; region?: string } | null>(null);
const [originDrillDown, setOriginDrillDown] = React.useState<"dpam" | "select_equities" | "etf_amundi" | "samdp" | "indosuez" | "other" | "internal" | null>(null);

React.useEffect(() => {
    if (selectedId != null || allPortfolios.length === 0) return;
    const sicavs = allPortfolios.filter(p => p?.type === "Sicav");
    const defaultP = sicavs.find(p => p.name === "Sicav - SCV_MED") ?? sicavs.find(p => p.name?.includes("_MED")) ?? sicavs[0] ?? allPortfolios[0];
    if (defaultP?.id != null) setSelectedId(defaultP.id);
  }, [allPortfolios]);

  const current = allPortfolios.find(p => p.id === selectedId) ?? null;

  const sortedPortfolios = React.useMemo(() =>
    [...allPortfolios].filter(p => p?.name).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [allPortfolios]);

  const global = current ? computePassiveActiveGlobal(current.holdings ?? []) : null;
  const byRegion = current ? computePassiveActiveByRegion(current.holdings ?? []) : [];
  const fundOrigins = current ? computeFundOrigins(current.holdings ?? []) : null;

    const originDrillDownHoldings = React.useMemo(() => {
    if (!current || !originDrillDown) return [];
    return (current.holdings ?? [])
      .filter(h => {
        if (!h) return false;
        const origin = getFundOrigin(h);
        if (originDrillDown === "internal") return origin !== "other";
        return origin === originDrillDown;
      })
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  }, [current, originDrillDown]);
  
  const COLORS = { active: "#0ea5e9", passive: "#f59e0b" };

  // Détail des holdings pour le drill-down (global, sans distinction de région)
  const drillDownHoldingsGlobal = React.useMemo(() => {
    if (!current || !drillDown || drillDown.region) return [];
    return (current.holdings ?? [])
      .filter(h => h && getManagementStyle(h.isin) === drillDown.style)
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  }, [current, drillDown]);

  // Détail des holdings pour le drill-down par région (avec look-through)
  const drillDownHoldingsByRegion = React.useMemo(() => {
    if (!current || !drillDown || !drillDown.region) return [];
    const SAMDP_ISINS = ["LU1795355053"];
    const rows: { name: string; isin: string; exposition: number }[] = [];
    (current.holdings ?? []).forEach(h => {
      if (!h) return;
      const style = getManagementStyle(h.isin);
      if (style !== drillDown.style) return;
      const holdingBreakdown = applyLookThroughWithStyle([h]).filter(e => e.region === drillDown.region);
      const exposition = holdingBreakdown.reduce((s, e) => s + e.weight, 0);
      if (exposition > 0.001) {
        rows.push({ name: h.asset_name ?? "—", isin: h.isin ?? "—", exposition });
      }
    });
    return rows.sort((a, b) => b.exposition - a.exposition);
  }, [current, drillDown]);

  if (!current) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Risk Analysis</h2>
          <p className="text-slate-500">Exposition gestion active vs passive, par portefeuille et par région.</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
          Chargement…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Risk Analysis</h2>
          <p className="text-slate-500">Exposition gestion active vs passive, par portefeuille et par région.</p>
        </div>
        <select
          value={selectedId ?? ""}
          onChange={e => { setSelectedId(Number(e.target.value)); setDrillDown(null); }}
          className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 outline-none text-slate-700 bg-white text-sm font-medium shadow-sm">
          {sortedPortfolios.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

{/* Table détail par région */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Région</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actif</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Passif</th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {byRegion.map(r => (
              <tr key={r.region} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 font-medium text-slate-900">{r.region}</td>
                <td className="px-6 py-3 text-right cursor-pointer hover:underline" style={{ color: COLORS.active }}
                  onClick={() => setDrillDown({ style: "active", region: r.region })}>{r.active.toFixed(1)}%</td>
                <td className="px-6 py-3 text-right cursor-pointer hover:underline" style={{ color: COLORS.passive }}
                  onClick={() => setDrillDown({ style: "passive", region: r.region })}>{r.passive.toFixed(1)}%</td>
                <td className="px-6 py-3 text-right font-bold text-slate-700">{(r.active + r.passive).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td className="px-6 py-3 font-bold text-slate-700">Total Equity</td>
              <td className="px-6 py-3 text-right font-bold" style={{ color: COLORS.active }}>
                {byRegion.reduce((s, r) => s + r.active, 0).toFixed(1)}%
              </td>
              <td className="px-6 py-3 text-right font-bold" style={{ color: COLORS.passive }}>
                {byRegion.reduce((s, r) => s + r.passive, 0).toFixed(1)}%
              </td>
              <td className="px-6 py-3 text-right font-bold text-slate-900">
                {byRegion.reduce((s, r) => s + r.active + r.passive, 0).toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Par région */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Actif / Passif par Région</h3>
        {byRegion.length === 0 ? (
          <p className="text-slate-400 text-sm italic">Aucune donnée régionale.</p>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRegion} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "16px", border: "none" }}
                  formatter={(v: number, name: string) => [v.toFixed(1) + "%", name === "active" ? "Actif" : "Passif"]} />
                <Bar dataKey="active" stackId="a" fill={COLORS.active} radius={[0, 0, 0, 0]} className="cursor-pointer"
                  onClick={(d: any) => d?.region && setDrillDown({ style: "active", region: d.region })} />
                <Bar dataKey="passive" stackId="a" fill={COLORS.passive} radius={[6, 6, 0, 0]} className="cursor-pointer"
                  onClick={(d: any) => d?.region && setDrillDown({ style: "passive", region: d.region })} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-center text-xs text-slate-400 mt-2 italic">Cliquez sur une barre pour voir le détail</p>
      </div>

      {/* Résumé global */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Exposition Globale</p>
        <div onClick={() => setDrillDown({ style: "active" })} className="flex items-center gap-3 cursor-pointer group">
          <span className="text-xs font-bold w-16 shrink-0 group-hover:opacity-70 transition-opacity" style={{ color: COLORS.active }}>Actif</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all group-hover:opacity-75" style={{ width: `${global?.activePct ?? 0}%`, backgroundColor: COLORS.active }} />
          </div>
          <span className="text-xs font-bold text-slate-700 w-14 text-right">{global?.activePct.toFixed(1)}%</span>
          <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        </div>
        <div onClick={() => setDrillDown({ style: "passive" })} className="flex items-center gap-3 mt-3 cursor-pointer group">
          <span className="text-xs font-bold w-16 shrink-0 group-hover:opacity-70 transition-opacity" style={{ color: COLORS.passive }}>Passif</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all group-hover:opacity-75" style={{ width: `${global?.passivePct ?? 0}%`, backgroundColor: COLORS.passive }} />
          </div>
          <span className="text-xs font-bold text-slate-700 w-14 text-right">{global?.passivePct.toFixed(1)}%</span>
          <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        </div>
        <p className="text-[10px] text-slate-400 italic pt-3">Cliquez pour voir le détail</p>
      </div>

{/* Fonds Maison */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Fonds Maison</p>
        <div onClick={() => setOriginDrillDown("internal")} className="flex items-center gap-3 mb-4 cursor-pointer group">
          <span className="text-xs font-bold w-24 shrink-0 text-emerald-600 group-hover:opacity-70 transition-opacity">Internal</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all group-hover:opacity-75" style={{ width: `${fundOrigins?.internalPct ?? 0}%`, backgroundColor: "#10b981" }} />
          </div>
          <span className="text-xs font-bold text-slate-700 w-14 text-right">{fundOrigins?.internalPct.toFixed(1)}%</span>
          <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        </div>
        <div onClick={() => setOriginDrillDown("other")} className="flex items-center gap-3 mb-6 cursor-pointer group">
          <span className="text-xs font-bold w-24 shrink-0 text-slate-400 group-hover:opacity-70 transition-opacity">Autres</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all group-hover:opacity-75" style={{ width: `${fundOrigins?.otherPct ?? 0}%`, backgroundColor: "#94a3b8" }} />
          </div>
          <span className="text-xs font-bold text-slate-700 w-14 text-right">{fundOrigins?.otherPct.toFixed(1)}%</span>
          <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        </div>
        <div className="space-y-2 pt-4 border-t border-slate-100">
        {([
            { key: "dpam" as const, label: "DPAM", value: fundOrigins?.dpam ?? 0, color: "#0ea5e9" },
            { key: "select_equities" as const, label: "Select Equities", value: fundOrigins?.select_equities ?? 0, color: "#8b5cf6" },
            { key: "etf_amundi" as const, label: "ETF Amundi", value: fundOrigins?.etf_amundi ?? 0, color: "#f59e0b" },
            { key: "samdp" as const, label: "SAMDP", value: fundOrigins?.samdp ?? 0, color: "#ec4899" },
            { key: "indosuez" as const, label: "Indosuez", value: fundOrigins?.indosuez ?? 0, color: "#14b8a6" },
            { key: "other" as const, label: "Autres", value: fundOrigins?.other ?? 0, color: "#94a3b8" },
          ]).map(({ key, label, value, color }) => (
  
            <div key={label} onClick={() => setOriginDrillDown(key)} className="flex items-center gap-3 cursor-pointer group">
              <span className="text-xs font-bold w-28 shrink-0 group-hover:opacity-70 transition-opacity" style={{ color }}>{label}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all group-hover:opacity-75" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
              </div>
              <span className="text-xs font-bold text-slate-700 w-14 text-right">{value.toFixed(1)}%</span>
              <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 italic pt-3">Cliquez pour voir le détail</p>
      </div>
      
      {/* ── Modale drill-down ── */}
      <Modal isOpen={!!drillDown} onClose={() => setDrillDown(null)}
        title={`${drillDown?.style === "passive" ? "Passif" : "Actif"}${drillDown?.region ? ` — ${drillDown.region}` : " — Global"}`}>
        <div className="space-y-4">
          {drillDown?.region ? (
            drillDownHoldingsByRegion.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-8">Aucun instrument.</p>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Instrument</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Exposition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {drillDownHoldingsByRegion.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-[280px]">{r.name}</p>
                        <p className="text-xs font-mono text-slate-400">{r.isin}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: drillDown.style === "passive" ? COLORS.passive : COLORS.active }}>
                        {r.exposition.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-700 text-right">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {drillDownHoldingsByRegion.reduce((s, r) => s + r.exposition, 0).toFixed(2)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            )
          ) : (
            drillDownHoldingsGlobal.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center py-8">Aucun instrument.</p>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Instrument</th>
                    <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Poids</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {drillDownHoldingsGlobal.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-[280px]">{h.asset_name ?? "—"}</p>
                        <p className="text-xs font-mono text-slate-400">{h.isin ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: drillDown?.style === "passive" ? COLORS.passive : COLORS.active }}>
                        {(h.weight ?? 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-700 text-right">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {drillDownHoldingsGlobal.reduce((s, h) => s + (h.weight ?? 0), 0).toFixed(2)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            )
          )}
        </div>
      </Modal>

{/* ── Modale drill-down origine des fonds ── */}
      <Modal isOpen={!!originDrillDown} onClose={() => setOriginDrillDown(null)}
        title={
          originDrillDown === "internal" ? "Fonds Internal" :
          originDrillDown === "other" ? "Autres fonds" :
          originDrillDown === "dpam" ? "Fonds DPAM" :
          originDrillDown === "select_equities" ? "Select Equities" :
          originDrillDown === "etf_amundi" ? "ETF Amundi" :
          originDrillDown === "samdp" ? "SAMDP" :
          originDrillDown === "indosuez" ? "Fonds Indosuez" : ""
        }>
        <div className="space-y-4">
          {originDrillDownHoldings.length === 0 ? (
            <p className="text-slate-400 text-sm italic text-center py-8">Aucun instrument.</p>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Instrument</th>
                  <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Poids</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {originDrillDownHoldings.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 truncate max-w-[280px]">{h.asset_name ?? "—"}</p>
                      <p className="text-xs font-mono text-slate-400">{h.isin ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{(h.weight ?? 0).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td className="px-4 py-3 font-bold text-slate-700 text-right">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {originDrillDownHoldings.reduce((s, h) => s + (h.weight ?? 0), 0).toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </Modal>
      
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
  const [styleSearch, setStyleSearch] = useState("");
  const [repairing, setRepairing] = useState(false);
  const [repairDone, setRepairDone] = useState(false);

  async function repairEmptyOverrides() {
    setRepairing(true);
    try {
      const broken = manualOverrides.filter(ov =>
        ov.manual_asset_name === "" || ov.manual_region === "" ||
        ov.manual_currency === "" || ov.manual_category === "" ||
        ov.manual_instrument === ""
      );
      for (const ov of broken) {
        await saveManualOverride({
          original_asset_name: ov.original_asset_name,
          manual_asset_name: ov.manual_asset_name || null,
          manual_isin: ov.manual_isin || null,
          manual_region: ov.manual_region || null,
          manual_currency: ov.manual_currency || null,
          manual_category: ov.manual_category || null,
          manual_instrument: ov.manual_instrument || null,
          is_hedged: ov.is_hedged ?? false,
          management_style: ov.management_style ?? null,
        });
      }
      await refreshData();
      setRepairDone(true);
      setTimeout(() => setRepairDone(false), 3000);
    } finally {
      setRepairing(false);
    }
  }
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
const [editingOverride, setEditingOverride] = useState<{
    original_asset_name: string; manual_asset_name: string; manual_isin: string;
    manual_region: string; manual_currency: string; manual_category: string; manual_instrument: string;
is_hedged?: boolean;
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
  const [managementStyles, setManagementStyles] = useState<ManagementStyleMap>({});
  const [performanceData, setPerformanceData] = useState<PerformanceRow[]>([]);
  const [showCreditDetail, setShowCreditDetail] = useState<string | null>(null);
  const [showDurationDetail, setShowDurationDetail] = useState(false);
  const [showCurrencyDetail, setShowCurrencyDetail] = useState<string | null>(null);
  const [p30Mode, setP30Mode] = useState(false);
  const [dpamBondsData, setDpamBondsData] = useState<any>(null);
  const [dpamEquityData, setDpamEquityData] = useState<any>(null);
  const [dpamUploading, setDpamUploading] = useState(false);
  const [dpamUploadSuccess, setDpamUploadSuccess] = useState(false);
  const [dpamMappings, setDpamMappings] = useState<{
    id: number; isin: string; dpam_type: string; col_index: number; instrument_name: string;
      }[]>([]);
  const [samdpInstruments, setSamdpInstruments] = useState<any[]>([]);
  const [samdpImportLog, setSamdpImportLog] = useState<any>(null);
  const [samdpDebtInstruments, setSamdpDebtInstruments] = useState<any[]>([]);
  const [samdpDebtImportLog, setSamdpDebtImportLog] = useState<any>(null);
  const [samdpEquityRows, setSamdpEquityRows] = useState<any[]>([]);
  
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

  const loadPerformanceData = async () => {
    try {
      const data = await fetchPerformanceData();
      setPerformanceData(data);
    } catch (e) { console.warn("Could not load performance data", e); }
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
            setManagementStyles(data.managementStyles ?? {});
      setManagementStyles(data.managementStyles ?? {});
      await loadPerformanceData();
            try {
        const dpamRes = await fetch("/api/dpam-data");
        if (dpamRes.ok) {
          const dpam = await dpamRes.json();
          if (dpam.bonds) setDpamBondsData(dpam.bonds);
          if (dpam.equity) setDpamEquityData(dpam.equity);
          if (dpam.mappings) setDpamMappings(dpam.mappings);
        }
      } catch (e) { console.warn("DPAM load failed", e); }
try {
  const samdpRes = await fetch("/api/dpam-data?section=samdp");
  if (samdpRes.ok) {
    const samdp = await samdpRes.json();
    if (samdp.instruments) setSamdpInstruments(samdp.instruments);
    if (samdp.importLog) setSamdpImportLog(samdp.importLog);
  }
} catch (e) { console.warn("SAMDP load failed", e); }
try {
  const eqRes = await fetch("/api/dpam-data?section=samdp_equity");
  if (eqRes.ok) {
    const eq = await eqRes.json();
    if (eq.rows) setSamdpEquityRows(eq.rows);
  }
} catch (e) { console.warn("SAMDP equity rows load failed", e); }      
try {
  const debtRes = await fetch("/api/dpam-data?section=samdp_debt");
  if (debtRes.ok) {
    const debt = await debtRes.json();
if (debt.instruments) setSamdpDebtInstruments(assignDebtLevels(debt.instruments));
    if (debt.importLog) setSamdpDebtImportLog(debt.importLog);
  }
} catch (e) { console.warn("SAMDP Debt load failed", e); }
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
  
  console.log("samdpDebtInstruments count:", samdpDebtInstruments.length);
const assignDebtLevels = (instruments: any[]) => {
  const LEVEL1_NAMES = new Set(["CASH: PROVISION", "CURRENCY", "ETF BONDS", "FIXED RATE BOND", "FLOATING RATE BOND"]);
  const EXCLUDE_PREFIXES = ["Normal", "Cash Value Date", "Cash : Forward", "Holdings", "SAMDP"];
  const seen = new Set<string>();
  return instruments
    .filter(inst => !EXCLUDE_PREFIXES.some(prefix => (inst.name ?? "").startsWith(prefix)))
    .map(inst => {
      const level = LEVEL1_NAMES.has(inst.name) ? 1 : 2;
      return { ...inst, level };
    })
    .filter(inst => {
      if (inst.level === 1) {
        if (seen.has(inst.name)) return false;
        seen.add(inst.name);
      }
      return true;
    });
};

useEffect(() => {
  const handler = async () => {
    const res = await fetch("/api/dpam-data?section=samdp_debt");
    if (res.ok) {
      const data = await res.json();
      if (data.instruments) setSamdpDebtInstruments(assignDebtLevels(data.instruments));
      if (data.importLog) setSamdpDebtImportLog(data.importLog);
    }
  };
  window.addEventListener("samdp-debt-updated", handler);
  return () => window.removeEventListener("samdp-debt-updated", handler);
}, []);

useEffect(() => {
  const handler = async () => {
    const res = await fetch("/api/dpam-data?section=samdp_equity");
    if (res.ok) {
      const data = await res.json();
      if (data.rows) setSamdpEquityRows(data.rows);
      if (data.importLog) setSamdpImportLog(data.importLog);
    }
  };
  window.addEventListener("samdp-equity-updated", handler);
  return () => window.removeEventListener("samdp-equity-updated", handler);
}, []);
  
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
          setManagementStyles(data.managementStyles ?? {});
    try {
      const dpamRes = await fetch("/api/dpam-data");
      if (dpamRes.ok) {
        const dpam = await dpamRes.json();
        if (dpam.bonds) setDpamBondsData(dpam.bonds);
        if (dpam.equity) setDpamEquityData(dpam.equity);
        if (dpam.mappings) setDpamMappings(dpam.mappings);
      }
    } catch (e) { console.warn("DPAM load failed", e); }
    try {
      const samdpRes = await fetch("/api/dpam-data?section=samdp");
      if (samdpRes.ok) {
        const samdp = await samdpRes.json();
        if (samdp.instruments) setSamdpInstruments(samdp.instruments);
        if (samdp.importLog) setSamdpImportLog(samdp.importLog);
      }
    } catch (e) { console.warn("SAMDP load failed", e); }
try {
  const eqRes = await fetch("/api/dpam-data?section=samdp_equity");
  if (eqRes.ok) {
    const eq = await eqRes.json();
    if (eq.rows) setSamdpEquityRows(eq.rows);
  }
} catch (e) { console.warn("SAMDP equity rows load failed", e); }
    try {
      const debtRes = await fetch("/api/dpam-data?section=samdp_debt");
      if (debtRes.ok) {
        const debt = await debtRes.json();
if (debt.instruments) setSamdpDebtInstruments(assignDebtLevels(debt.instruments));
        if (debt.importLog) setSamdpDebtImportLog(debt.importLog);
      }
    } catch (e) { console.warn("SAMDP Debt load failed", e); }
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

const handleExportExcel = async () => {
    if (!currentPortfolioEffective || sortedFilteredHoldings.length === 0) return;
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs" as any);
    const data = sortedFilteredHoldings.map(h => ({
      "Instrument": h?.asset_name ?? "",
      "ISIN": h?.isin ?? "",
      "Catégorie": h?.category ?? "",
      "Région": h?.region ?? "",
      "Devise": h?.currency ?? "",
      "Poids (%)": Number(h?.weight ?? 0),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 45 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Positions");
    const safeName = (currentPortfolioEffective.name ?? "Portfolio").replace(/[\\/:*?"<>|]/g, "_");
    XLSX.writeFile(wb, `${safeName}_Positions_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
        for (let col = 2; col <= 100; col++) {
          const name = r(4, col);
          if (!name) break;
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
            if (dpam.equity) setDpamEquityData(dpam.equity);
          }
          setDpamUploadSuccess(true);
          setTimeout(() => setDpamUploadSuccess(false), 3000);
        } else {
          setErrorMsg("Erreur upload DPAM Bonds: " + await res.text());
        }
      }

if (isEquity) {
        const instruments = [];
        for (let col = 2; col <= 100; col++) {
          const name = r(4, col);
          if (!name) break;
          instruments.push({
            colIndex: col,
            name: String(name),
            portfolioCode: r(5, col) ? String(r(5, col)) : null,
          });
        }

        const globals = instruments.map(inst => ({
          colIndex: inst.colIndex,
          marketValue: toNum(r(6, inst.colIndex)),
          nbHoldings: toNum(r(7, inst.colIndex)),
          dividendYield: toNum(r(8, inst.colIndex)),
        }));

        const sectors = [];
        for (let row = 10; row <= 46; row++) {
          const sector = r(row, 1);
          if (!sector) continue;
          for (const inst of instruments) {
            const w = toNum(r(row, inst.colIndex));
            sectors.push({ colIndex: inst.colIndex, sector: String(sector), weight: w });
          }
        }

        const countries = [];
        for (let row = 48; row <= 108; row++) {
          const country = r(row, 1);
          if (!country) continue;
          for (const inst of instruments) {
            const w = toNum(r(row, inst.colIndex));
            countries.push({ colIndex: inst.colIndex, country: String(country), weight: w });
          }
        }

        const currencies = instruments.map(inst => {
          const eur = toNum(r(110, inst.colIndex));
          const usd = toNum(r(116, inst.colIndex));
          const jpy = toNum(r(118, inst.colIndex));
          const other = Math.max(0, 100 - (eur ?? 0) - (usd ?? 0) - (jpy ?? 0));
          return { colIndex: inst.colIndex, eur, usd, jpy, other: +other.toFixed(2) };
        });

        const res = await fetch("/api/dpam-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "equity",
            filename: file.name,
            parsed: { instruments, globals, sectors, countries, currencies },
          }),
        });

        if (res.ok) {
          const fresh = await fetch("/api/dpam-data");
          if (fresh.ok) {
            const dpam = await fresh.json();
            if (dpam.bonds) setDpamBondsData(dpam.bonds);
            if (dpam.equity) setDpamEquityData(dpam.equity);
          }
          setDpamUploadSuccess(true);
          setTimeout(() => setDpamUploadSuccess(false), 3000);
        } else {
          setErrorMsg("Erreur upload DPAM Equity: " + await res.text());
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
  const isPerformanceFile = (filename: string) =>
    filename.toLowerCase().includes("return") || filename.toLowerCase().includes("perf");
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
const targetSheetName = wb.SheetNames.find((n: string) => n.toLowerCase().includes("target grid")) ?? wb.SheetNames[0];
const ws = wb.Sheets[targetSheetName];
console.log("Using sheet:", targetSheetName, "range:", ws['!ref']);
const raw: any[][] = XLSX.utils.sheet_to_json(ws, { 
  header: 1, 
  defval: null, 
  raw: true,
  blankrows: true 
});
console.log("Total rows read:", raw.length);
        const PROFILE_COLS: Record<string, [number, number, number]> = {
          LOW: [2, 4, 6], MEDLOW: [9, 11, 13], MEDIUM: [17, 19, 21], MEDHIGH: [24, 26, 28], HIGH: [31, 33, 35],
        };
const ROW_MAP: Record<number, string> = {
          8: "equities", 9: "eq_europe", 10: "eq_us", 11: "eq_em", 12: "eq_japan", 13: "eq_other",
          14: "alternatives", 15: "alt_conv", 16: "alt_gold", 17: "alt_other",
          18: "fixed_income", 19: "fi_eur", 20: "fi_eur_gov", 21: "fi_eur_gov_infl", 22: "fi_eur_ig", 23: "fi_eur_hy",
          24: "fi_usd", 25: "fi_usd_gov", 26: "fi_usd_gov_infl", 27: "fi_usd_ig", 28: "fi_usd_hy",
          29: "fi_em_local", 30: "fi_em_hard", 31: "fi_global",
          32: "short_term", 33: "st_eur", 34: "st_usd",
          35: "st_other",
          45: "modified_duration",
        };
        const rows: { grid_id: string; profile: string; bench: number | null; target: number | null; active: number | null }[] = [];
        for (const [rowIdx, gridId] of Object.entries(ROW_MAP)) {
          const r = raw[Number(rowIdx)];
          if (!r) continue;
          for (const [profile, [b, t, a]] of Object.entries(PROFILE_COLS)) {
            const round2 = (v: any) => v != null && typeof v === "number" ? Math.round(v * 10000) / 100 : null;
            const roundRaw = (v: any) => v != null && typeof v === "number" ? Math.round(v * 100) / 100 : null;
            const fmt = gridId === "modified_duration" ? roundRaw : round2;
            rows.push({ grid_id: gridId, profile, bench: fmt(r[b]), target: fmt(r[t]), active: fmt(r[a]) });
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
      } else if (isPerformanceFile(file.name)) {
        const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs" as any);
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const targetSheetName = wb.SheetNames.find((n: string) => n.toLowerCase() === "return") ?? wb.SheetNames[0];
        const wsReturn = wb.Sheets[targetSheetName];
        const rawReturn: any[][] = XLSX.utils.sheet_to_json(wsReturn, { header: 1, defval: null, blankrows: true });

        const titleCell = String(rawReturn[1]?.[2] ?? "");
        const dateMatch = titleCell.match(/AS OF (\d{1,2}-\w{3}-\d{4})/i);
        if (!dateMatch) {
          setErrorMsg("Impossible de trouver la date du rapport (format attendu : 'AS OF 31-Jul-2026')");
        } else {
          const reportDate = new Date(dateMatch[1]);
          const reportDateStr = reportDate.toISOString().slice(0, 10);

          const EXTERNAL_LABELS = new Set([
            "Mild", "Moderate", "Strong",
            "GLOBAL STRATEGY", "SELECT SUSTAINABLE", "SELECT TPF", "SELECT TPF FLEXIBLE",
          ]);

          const GROUPS = [
            { dataStart: 8, dataEnd: 22, blocks: { 5: "BDS", 12: "LOW", 19: "MEDLOW" } },
            { dataStart: 27, dataEnd: 43, blocks: { 5: "MEDIUM", 12: "MEDHIGH", 19: "HIGH" } },
            { dataStart: 48, dataEnd: 56, blocks: { 12: "VH" } },
          ];

          const perfRows: { report_code: string; profile: string; label: string; category: string; mtd: number | null; ytd: number | null; y2025: number | null }[] = [];
          const toNumPct = (v: any) => (v != null && typeof v === "number" ? v * 100 : null);

          for (const group of GROUPS) {
            for (let r = group.dataStart; r <= group.dataEnd; r++) {
              const row = rawReturn[r];
              if (!row) continue;
              const code = row[0] ? String(row[0]).trim() : null;
              const label = row[4] ? String(row[4]).trim() : null;
              if (!code || !label) continue;

              for (const [colStr, profile] of Object.entries(group.blocks)) {
                const col = Number(colStr);
                const mtd = toNumPct(row[col]);
                const ytd = toNumPct(row[col + 2]);
                const y2025 = toNumPct(row[col + 4]);
                if (mtd == null && ytd == null && y2025 == null) continue;

                const isExternal = EXTERNAL_LABELS.has(label.toUpperCase()) || EXTERNAL_LABELS.has(label);
                perfRows.push({
                  report_code: code,
                  profile,
                  label,
                  category: isExternal ? "external" : "portfolio",
                  mtd, ytd, y2025,
                });
              }
            }
          }

          if (perfRows.length === 0) {
            setErrorMsg("Aucune donnée de performance trouvée dans le fichier");
          } else {
            await savePerformanceData(reportDateStr, file.name, perfRows);
            await loadPerformanceData();
            setUploadSuccess(true);
            setActiveTab("PERFORMANCE");
            setTimeout(() => setUploadSuccess(false), 3000);
          }
        }
      } else {
const text = await file.text();
        const encoding = text.charCodeAt(0) === 0xFF || text.charCodeAt(0) === 0xFE ? 'utf-16' : 'utf-8';
        const fileBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-16');
        const decodedText = decoder.decode(fileBuffer);
        const lines = decodedText.split(/\r?\n/);
        try {
              const map = new Map<string, any>();
              lines.forEach((line, idx) => {
                if (idx < 4) return;
                const row = line.split('\t');
                const rawName = row[1]?.trim() ?? "";
                if (!rawName) return;
                const code = rawName.replace("TECHNICAL.MPF.", "").trim();
                const type = code.startsWith("MIX") ? "Mixed" : "Sicav";
                const name = `${type} - ${code}`;
                const asset = row[4]?.trim() ?? "";
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
        } catch (e) { setErrorMsg("Erreur lors du traitement du fichier."); }
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

const uniqueInstrumentsByIsin = useMemo(() => {
    const m = new Map<string, { isin: string; name: string; totalWeight: number }>();
    allPortfolios.forEach(p => (p.holdings ?? []).forEach(h => {
      if (!h?.isin) return;
      if (!m.has(h.isin)) m.set(h.isin, { isin: h.isin, name: h.asset_name ?? h.isin, totalWeight: 0 });
      m.get(h.isin)!.totalWeight += h.weight ?? 0;
    }));
    return Array.from(m.values()).sort((a, b) => b.totalWeight - a.totalWeight);
  }, [allPortfolios]);

function getManagementStyle(isin: string | null | undefined): "active" | "passive" {
    if (!isin) return "active";
    return managementStyles[isin]?.management_style === "passive" ? "passive" : "active";
  }

  function isStyleClassified(isin: string): boolean {
    return managementStyles[isin]?.management_style === "active" || managementStyles[isin]?.management_style === "passive";
  }

  const classificationProgress = useMemo(() => {
    const classified = uniqueInstrumentsByIsin.filter(i => isStyleClassified(i.isin));
    return { classified: classified.length, total: uniqueInstrumentsByIsin.length };
  }, [uniqueInstrumentsByIsin, managementStyles]);

  const filteredInstrumentsByIsin = useMemo(() => {
    if (!styleSearch) return uniqueInstrumentsByIsin;
    const q = styleSearch.toLowerCase();
    return uniqueInstrumentsByIsin.filter(i =>
      i.name.toLowerCase().includes(q) || i.isin.toLowerCase().includes(q)
    );
  }, [uniqueInstrumentsByIsin, styleSearch]);

  async function setManagementStyle(isin: string, name: string, style: "active" | "passive") {
    await saveManagementStyle(isin, style);
    setManagementStyles(prev => ({ ...prev, [isin]: { management_style: style, updated_at: new Date().toISOString() } }));
  }

function applyLookThroughWithStyle(holdings: Holding[]): { region: string; weight: number; style: "active" | "passive" }[] {
    const result: { region: string; weight: number; style: "active" | "passive" }[] = [];
    const SAMDP_ISINS = ["LU1795355053"];
    for (const h of holdings) {
      if (!h) continue;
      if (h.category !== "Equities") continue;
      const style = getManagementStyle(h.isin);
      if (h.isin && SAMDP_ISINS.includes(h.isin) && samdpGeoBreakdown) {
        samdpGeoBreakdown.forEach(entry => {
          result.push({ region: normalizeRegion(entry.region), weight: (h.weight ?? 0) * entry.weight / 100, style });
        });
        continue;
      }
      const bd = h.isin ? breakdownsWithP30[h.isin] : null;
      if (bd && bd.length > 0) {
        bd.forEach(entry => result.push({ region: normalizeRegion(entry.region), weight: (h.weight ?? 0) * entry.weight / 100, style }));
      } else {
        const dpamGeo = h.isin && (h.asset_name ?? "").startsWith("DPAM") ? dpamLookup[h.isin]?.geoBreakdown : null;
        if (dpamGeo && dpamGeo.length > 0) {
          dpamGeo.forEach((entry: any) => result.push({ region: normalizeRegion(entry.region), weight: (h.weight ?? 0) * entry.weight / 100, style }));
        } else {
          result.push({ region: normalizeRegion(h.region ?? "Other"), weight: h.weight ?? 0, style });
        }
      }
    }
    return result;
  }

function getFundOrigin(h: Holding): "dpam" | "select_equities" | "etf_amundi" | "samdp" | "indosuez" | "other" {
    const name = (h.asset_name ?? "").toUpperCase();
    const SAMDP_ISINS = ["LU1795355053", "LU1545753169"];
    if (h.isin && SAMDP_ISINS.includes(h.isin)) return "samdp";
    if (name.startsWith("SELECT EQUITIES")) return "select_equities";
    if (name.includes("AMUNDI") && name.includes("ETF")) return "etf_amundi";
    if (h.isin && dpamMappings.some(m => m.isin === h.isin)) return "dpam";
    if (name.includes("INDOSUEZ")) return "indosuez";
    return "other";
  }

  function computeFundOrigins(holdings: Holding[]) {
    const m = new Map<string, number>();
    holdings.forEach(h => {
      if (!h) return;
      const origin = getFundOrigin(h);
      m.set(origin, (m.get(origin) ?? 0) + (h.weight ?? 0));
    });
    const total = holdings.reduce((s, h) => s + (h?.weight ?? 0), 0);
    const get = (k: string) => m.get(k) ?? 0;
    const internal = get("dpam") + get("select_equities") + get("etf_amundi") + get("samdp") + get("indosuez");
    return {
      dpam: +get("dpam").toFixed(1),
      select_equities: +get("select_equities").toFixed(1),
      etf_amundi: +get("etf_amundi").toFixed(1),
      samdp: +get("samdp").toFixed(1),
      indosuez: +get("indosuez").toFixed(1),
      other: +get("other").toFixed(1),
      internal: +internal.toFixed(1),
      internalPct: total > 0 ? +(internal / total * 100).toFixed(1) : 0,
      otherPct: total > 0 ? +(get("other") / total * 100).toFixed(1) : 0,
    };
  }
  
  function computePassiveActiveGlobal(holdings: Holding[]) {
    let passive = 0, active = 0;
    holdings.forEach(h => {
      if (!h) return;
      if (getManagementStyle(h.isin) === "passive") passive += h.weight ?? 0;
      else active += h.weight ?? 0;
    });
    const total = passive + active;
    return {
      passive: +passive.toFixed(1), active: +active.toFixed(1),
      passivePct: total > 0 ? +(passive / total * 100).toFixed(1) : 0,
      activePct: total > 0 ? +(active / total * 100).toFixed(1) : 0,
    };
  }

function computePassiveActiveByRegion(holdings: Holding[]) {
    const rows = applyLookThroughWithStyle(holdings);
    const m = new Map<string, { passive: number; active: number }>();
    rows.forEach(({ region, weight, style }) => {
      if (region === "Cash") return;
      if (!m.has(region)) m.set(region, { passive: 0, active: 0 });
      const e = m.get(region)!;
      if (style === "passive") e.passive += weight; else e.active += weight;
    });
    return Array.from(m.entries()).map(([region, { passive, active }]) => ({
      region, passive, active,
    })).sort((a, b) => (b.passive + b.active) - (a.passive + a.active));
  }
  
function applyLookThrough(holdings: Holding[]): { region: string; weight: number }[] {
  const result: { region: string; weight: number }[] = [];
  const SAMDP_ISINS = ["LU1795355053"];
  for (const h of holdings) {
    if (!h) continue;
    // Look-through SAMDP
    if (h.isin && SAMDP_ISINS.includes(h.isin) && samdpGeoBreakdown) {
      samdpGeoBreakdown.forEach(entry => {
        result.push({ region: normalizeRegion(entry.region), weight: (h.weight ?? 0) * entry.weight / 100 });
      });
      continue;
    }
const bd = h.isin ? breakdownsWithP30[h.isin] : null;
    if (bd && bd.length > 0) {
        for (const entry of bd) {
          result.push({ region: normalizeRegion(entry.region), weight: (h.weight ?? 0) * entry.weight / 100 });
        }
} else {
        // Priorité 2 : données DPAM geo
        const dpamGeo = h.isin && (h.asset_name ?? "").startsWith("DPAM")
          ? dpamLookup[h.isin]?.geoBreakdown
          : null;
        if (dpamGeo && dpamGeo.length > 0) {
          for (const entry of dpamGeo) {
            result.push({ region: normalizeRegion(entry.region), weight: (h.weight ?? 0) * entry.weight / 100 });
          }
        } else {
          result.push({ region: normalizeRegion(h.region ?? "Other"), weight: h.weight ?? 0 });
        }
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
const dpamLookup = useMemo(() => {
  const result: Record<string, {
    geoBreakdown: { region: string; weight: number }[] | null;
    currencyBreakdown: { currency: string; weight: number }[] | null;
    creditBreakdown: { credit_type: string; currency: string; weight: number }[] | null;
    duration: number | null;
  }> = {};
 
for (const mapping of dpamMappings) {
    const { isin, dpam_type, instrument_name } = mapping;
    const currentInst = dpam_type === "bonds"
      ? (dpamBondsData?.instruments ?? []).find((i: any) => i.name === instrument_name)
      : (dpamEquityData?.instruments ?? []).find((i: any) => i.name === instrument_name);
    const col_index = currentInst?.col_index;
    if (col_index == null) continue;
 
  if (dpam_type === "bonds" && dpamBondsData) {
      // Geo : pas de geo bonds directs, on skip
      const geo = null;

      // Duration
      const globalRow = (dpamBondsData.globals ?? []).find((g: any) => g.instrument_col === col_index);
      const duration = globalRow?.modified_duration ?? globalRow?.duration ?? null;
 
      // Currency
      const curRow = (dpamBondsData.currencies ?? []).find((c: any) => c.instrument_col === col_index);
      const currency = curRow ? [
        { currency: "EUR", weight: Number(curRow.eur ?? 0) },
        { currency: "USD", weight: Number(curRow.usd ?? 0) },
        { currency: "JPY", weight: Number(curRow.jpy ?? 0) },
        { currency: "Other", weight: Number(curRow.other ?? 0) },
      ].filter(e => e.weight > 0.01) : null;
 
// Credit — on cherche la part "Government" dans les secteurs
      const creditRows = (dpamBondsData.ratings ?? []).find((r: any) => r.instrument_col === col_index);
      const sectorRows = (dpamBondsData.sectors ?? []).filter((s: any) => s.instrument_col === col_index);
      const govWeight = sectorRows
        .filter((s: any) => (s.sector ?? "").toLowerCase().includes("government") || (s.sector ?? "").toLowerCase().includes("sovereign"))
        .reduce((sum: number, s: any) => sum + Number(s.weight ?? 0), 0);
      const credit = creditRows ? (() => {
        const ig = Number(creditRows.ig ?? 0);
        const hy = Number(creditRows.hy ?? 0);
        const others = Number(creditRows.others ?? 0);
        const nonGovTotal = ig + hy + others;
        // Si on a des govies via secteurs, on les soustrait du IG (qui inclut souvent les govies)
        const govPct = Math.min(govWeight, ig);
        const igNet = ig - govPct;
        return [
          { credit_type: "Govies", currency: "EUR", weight: govPct },
          { credit_type: "IG", currency: "EUR", weight: igNet },
          { credit_type: "HY", currency: "EUR", weight: hy },
          { credit_type: "Others", currency: "EUR", weight: others },
        ].filter(e => e.weight > 0.01);
      })() : null;
 
result[isin] = { geoBreakdown: geo, currencyBreakdown: currency, creditBreakdown: credit, duration };
    }
 
    if (dpam_type === "equity" && dpamEquityData) {
      // Currency
      const curRow = (dpamEquityData.currencies ?? []).find((c: any) => c.instrument_col === col_index);
      const currency = curRow ? [
        { currency: "EUR", weight: Number(curRow.eur ?? 0) },
        { currency: "USD", weight: Number(curRow.usd ?? 0) },
        { currency: "JPY", weight: Number(curRow.jpy ?? 0) },
        { currency: "Other", weight: Number(curRow.other ?? 0) },
      ].filter(e => e.weight > 0.01) : null;
 
      // Geo : pays → on mappe vers régions
      const countryRows = (dpamEquityData.countries ?? [])
        .filter((c: any) => c.instrument_col === col_index && Number(c.weight ?? 0) > 0.001);
      
      const COUNTRY_TO_REGION: Record<string, string> = {
        "Belgium": "Europe", "France": "Europe", "Germany": "Europe", "Italy": "Europe",
        "Spain": "Europe", "Netherlands": "Europe", "Ireland": "Europe", "Austria": "Europe",
        "Denmark": "Europe", "Finland": "Europe", "Norway": "Europe", "Luxembourg": "Europe",
        "Sweden": "Europe", "Switzerland": "Europe", "Portugal": "Europe", "Slovakia": "Europe",
        "Croatia": "Europe", "Greece": "Europe", "Iceland": "Europe",
        "United States": "US", "Canada": "US",
        "Japan": "Japan",
        "China": "EM", "South Korea": "EM", "India": "EM", "Brazil": "EM", "Taiwan": "EM",
        "Mexico": "EM", "South Africa": "EM", "Malaysia": "EM", "Indonesia": "EM",
        "Thailand": "EM", "Philippines": "EM", "Turkey": "EM", "Poland": "EM",
        "Colombia": "EM", "Chile": "EM", "Peru": "EM", "Qatar": "EM",
        "United Arab Emirates": "EM", "Korea": "EM",
        "Australia": "Others", "New Zealand": "Others", "Hong Kong": "Others",
        "Singapore": "Others", "United Kingdom": "Europe",
      };
 
      const regionMap = new Map<string, number>();
const CASH_LABELS = ["Cash and Derivatives", "Cash", "Derivatives"];
let dpamCashWeight = 0;
countryRows.forEach((c: any) => {
  if (CASH_LABELS.includes(c.country)) {
    dpamCashWeight += Number(c.weight ?? 0);
    return;
  }
  if (c.country === "Other") return;
  const region = COUNTRY_TO_REGION[c.country] ?? "Others";
  regionMap.set(region, (regionMap.get(region) ?? 0) + Number(c.weight ?? 0));
});
if (dpamCashWeight > 0) {
  regionMap.set("Cash", dpamCashWeight);
}
      const geo = Array.from(regionMap.entries())
  .filter(([region]) => region !== "Others" || true) // garder pour l'instant
  .map(([region, weight]) => ({ region, weight }));
      
result[isin] = { geoBreakdown: geo.length > 0 ? geo : null, currencyBreakdown: currency, creditBreakdown: null, duration: null };
    }
  }
 console.log("dpamLookup:", result);
console.log("LU2799769836:", result["LU2799769836"]);
  return result;
}, [dpamMappings, dpamBondsData, dpamEquityData]);

const samdpDebtCashPct = useMemo(() => {
  if (samdpDebtInstruments.length === 0) return 0;
  const CASH_NAMES_DEBT = new Set(["CASH: PROVISION", "CURRENCY"]);
  const level2 = samdpDebtInstruments.filter((i: any) => i.level === 2);
  const totalAll = level2.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
  if (totalAll === 0) return 0;
  const cashSum = level2.filter((i: any) => CASH_NAMES_DEBT.has(i.name)).reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
  return cashSum * 100 / totalAll;
}, [samdpDebtInstruments]);

const samdpDebtCreditBreakdown = useMemo(() => {
  if (samdpDebtInstruments.length === 0) return null;
  const LEVEL1_NAMES_CBD = new Set(["CASH: PROVISION", "CURRENCY", "ETF BONDS", "FIXED RATE BOND", "FLOATING RATE BOND"]);
  const allLevel2 = samdpDebtInstruments.filter((i: any) => i.level === 2);
  const level2 = allLevel2.filter((i: any) => !LEVEL1_NAMES_CBD.has(i.name));
  const totalAll = allLevel2.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
  if (totalAll === 0) return null;
  const m = new Map<string, number>();
  level2.forEach((inst: any) => {
    const w = Number(inst.wght_pct ?? 0);
    if (w === 0) return;
    const manualCbd = creditBreakdowns[inst.isin];
    if (manualCbd && manualCbd.length > 0) {
      manualCbd.forEach((e: any) => {
        m.set(e.credit_type, (m.get(e.credit_type) ?? 0) + w * e.weight / 100 * 100 / totalAll);
      });
      return;
    }
    const sector = inst.bics_sector_1 ?? "";
    let credit = inst.ig_hy ?? "NR";
    if (sector.toLowerCase().includes("government") || sector.toLowerCase().includes("sovereign")) credit = "Govies";
    m.set(credit, (m.get(credit) ?? 0) + w * 100 / totalAll);
  });
return Array.from(m.entries()).map(([credit_type, weight]) => ({
    credit_type,
    currency: "EUR",
    weight: +weight.toFixed(2),
  }));
}, [samdpDebtInstruments, creditBreakdowns]);

const samdpGeoBreakdown = useMemo(() => {
  if (samdpEquityRows.length === 0) return null;
  const level5 = samdpEquityRows.filter((r: any) => r.level === 5 && r.isin);
  const regionMap = new Map<string, number>();
  const totalExpo = level5.reduce((s: number, r: any) => s + Number(r.expo_pct ?? 0), 0);
  if (totalExpo === 0) return null;

const CASH_ISINS_GEO = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
  level5.forEach((inst: any) => {
    const w = Number(inst.expo_pct ?? 0);
    if (w === 0) return;
    // Exclure le cash du calcul régional
    const isCash = CASH_ISINS_GEO.has((inst.isin ?? "").toUpperCase()) ||
      (inst.instrument_type ?? "").toUpperCase().includes("DEPOSIT");
    if (isCash) return;
    const override = manualOverrides.find((ov: any) =>
      (ov.manual_isin && ov.manual_isin === inst.isin) ||
      (ov.original_asset_name && ov.original_asset_name === inst.name)
    );
    const isin = override?.manual_isin || inst.isin;
    const breakdown = breakdowns[isin];
    if (breakdown && breakdown.length > 0) {
      breakdown.forEach((entry: any) => {
        regionMap.set(entry.region, (regionMap.get(entry.region) ?? 0) + w * entry.weight / 100);
      });
    } else {
      const COUNTRY_TO_REGION: Record<string, string> = {
        "United States": "US", "Canada": "US",
        "Belgium": "Europe", "France": "Europe", "Germany": "Europe", "Italy": "Europe",
        "Spain": "Europe", "Netherlands": "Europe", "Ireland": "Europe", "Austria": "Europe",
        "Sweden": "Europe", "Switzerland": "Europe", "United Kingdom": "Europe",
        "Japan": "Japan",
        "China": "EM", "South Korea": "EM", "India": "EM", "Brazil": "EM", "Taiwan": "EM",
      };
      const region = override?.manual_region || COUNTRY_TO_REGION[inst.dom_country ?? ""] || "Others";
      regionMap.set(region, (regionMap.get(region) ?? 0) + w);
    }
  });

  // Normaliser à 100%
return Array.from(regionMap.entries()).map(([region, weight]) => ({
    region,
    weight: weight * 100,
  }));
}, [samdpEquityRows, breakdowns, manualOverrides]);

const samdpEquityCashPct = useMemo(() => {
  if (samdpEquityRows.length === 0) return 0;
  const CASH_ISINS_SAMDP = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
  const cashLines = samdpEquityRows.filter((row: any) =>
    row.level === 5 &&
    (CASH_ISINS_SAMDP.has((row.isin ?? "").toUpperCase()) ||
     (row.instrument_type ?? "").toUpperCase().includes("DEPOSIT"))
  );
  return cashLines.reduce((s: number, row: any) => s + Number(row.wght_ptf_ref ?? 0), 0);
}, [samdpEquityRows]);
  
  const breakdownsWithP30 = useMemo(() => ({
  ...breakdowns,
  [P30_ISIN]: [
    { region: "Europe", weight: 50 },
    { region: "US", weight: 50 },
  ],
}), [breakdowns]);

const currencyBreakdownsWithP30 = useMemo(() => ({
  ...currencyBreakdowns,
  [P30_ISIN]: [
    { currency: "EUR", weight: 50 },
    { currency: "USD", weight: 50 },
  ],
}), [currencyBreakdowns]);

  const currentPortfolioEffective = useMemo(() => {
  if (!currentPortfolio || !p30Mode || currentPortfolio.type !== "Mixed") {
    return currentPortfolio;
  }
  const shareHoldings = (currentPortfolio.holdings ?? []).filter(h => h?.instrument === "Share");
  const otherHoldings = (currentPortfolio.holdings ?? []).filter(h => h?.instrument !== "Share");
  const shareWeight = shareHoldings.reduce((s, h) => s + (h.weight ?? 0), 0);
  if (shareWeight === 0) return currentPortfolio;
  const p30Holding = {
    id: -1,
    asset_name: "P30",
    isin: P30_ISIN,
    category: "Equities",
    region: "Global",
    instrument: "Fund",
    currency: "EUR",
    weight: shareWeight,
    original_asset_name: "P30",
  };
  return {
    ...currentPortfolio,
    holdings: [...otherHoldings, p30Holding],
  };
}, [currentPortfolio, p30Mode]);

  
  const regionData = useMemo(() => {
    const m = new Map<string, number>();
const equityHoldings = (currentPortfolioEffective?.holdings ?? []).filter(h => h?.category === "Equities");
applyLookThrough(equityHoldings).forEach(({ region, weight }) => {
  if (normalizeRegion(region) === "Cash") return;
  m.set(region, (m.get(region) ?? 0) + weight);
});
    const profile = detectRiskProfile(currentPortfolio?.name);
return Array.from(m.entries()).map(([name, value]) => {
      const gridId = REGION_TO_GRID[name];
      const target = profile && gridId ? targetGridData[gridId]?.[profile]?.["target"] ?? null : null;
      return { name, value: +value.toFixed(1), target };
    }).sort((a, b) => b.value - a.value);
}, [currentPortfolioEffective, breakdownsWithP30, targetGridData, dpamLookup]);

 const currencyData = useMemo(() => {
    const KEY_CURRENCIES = ["EUR", "USD", "JPY"];
    const SAMDP_DEBT_ISIN_CUR = "LU1545753169";
    const m = new Map<string, number>();
(currentPortfolioEffective?.holdings ?? []).forEach((h) => {
      if (!h) return;
const cbd = h.isin ? currencyBreakdownsWithP30[h.isin] : null;
      if (cbd && cbd.length > 0) {
        for (const entry of cbd) {
          const cur = entry.currency.toUpperCase().trim();
          m.set(cur, (m.get(cur) ?? 0) + (h.weight ?? 0) * entry.weight / 100);
        }
} else if (h.isin === SAMDP_DEBT_ISIN_CUR && samdpDebtInstruments.length > 0) {
  const debtLeafRows = samdpDebtInstruments.filter((i: any) => i.level === 2 && i.isin);
  const totalW = debtLeafRows.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
  if (totalW > 0) {
    const curMap = new Map<string, number>();
    debtLeafRows.forEach((i: any) => {
      const cur = (i.currency || "Other").toUpperCase().trim();
      curMap.set(cur, (curMap.get(cur) ?? 0) + Number(i.wght_pct ?? 0) / totalW * 100);
    });
    curMap.forEach((pct, cur) => {
      m.set(cur, (m.get(cur) ?? 0) + (h.weight ?? 0) * pct / 100);
    });
  }
} else {
  const dpamCur = h.isin
    ? dpamLookup[h.isin]?.currencyBreakdown
    : null;
  if (dpamCur && dpamCur.length > 0) {
    for (const entry of dpamCur) {
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
}, [currentPortfolioEffective, currencyBreakdownsWithP30, dpamLookup, manualOverrides, samdpDebtInstruments]);

const categoryData = useMemo(() => {
  const m = new Map<string, number>();
  
  // Cash extra provenant des breakdowns géographiques (région "Cash")
  let extraCash = 0;
  
(currentPortfolioEffective?.holdings ?? []).forEach((h) => {
    if (!h?.category) return;
    
    if (h.category !== "Equities") {
      m.set(h.category, (m.get(h.category) ?? 0) + (h.weight ?? 0));
    }

    // Chercher la part Cash dans les breakdowns géo (tous fonds y compris Equities)
const bd = h.isin ? breakdownsWithP30[h.isin] : null;
    if (bd) {
      const cashEntry = bd.find(e => e.region === "Cash");
      if (cashEntry) {
        extraCash += (h.weight ?? 0) * cashEntry.weight / 100;
      }
    }
    
    // Chercher la part Cash dans les fonds DPAM
    const dpamGeo = h.isin ? dpamLookup[h.isin]?.geoBreakdown : null;
    if (dpamGeo) {
      const cashEntry = dpamGeo.find((e: any) => e.region === "Cash");
      if (cashEntry) {
        extraCash += (h.weight ?? 0) * cashEntry.weight / 100;
      }
    }
    
// Chercher la part Cash dans le SAMDP Equity via les lignes niveau 5
    if (h.isin === "LU1795355053" && samdpEquityRows.length > 0) {
      const CASH_ISINS_SAMDP = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
      const cashLines = samdpEquityRows.filter((row: any) =>
        row.level === 5 &&
        (CASH_ISINS_SAMDP.has((row.isin ?? "").toUpperCase()) ||
         (row.instrument_type ?? "").toUpperCase().includes("DEPOSIT"))
      );
      const samdpCashPct = cashLines.reduce((s: number, row: any) => s + Number(row.wght_ptf_ref ?? 0), 0);
      extraCash += (h.weight ?? 0) * samdpCashPct;
    }

    // Chercher la part Cash dans le SAMDP Debt (CASH: PROVISION et CURRENCY)
    if (h.isin === "LU1545753169" && samdpDebtInstruments.length > 0) {
      const CASH_NAMES_DEBT = new Set(["CASH: PROVISION", "CURRENCY"]);
      const level2 = samdpDebtInstruments.filter((i: any) => i.level === 2);
      const totalAll = level2.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
      if (totalAll > 0) {
        const cashSum = level2.filter((i: any) => CASH_NAMES_DEBT.has(i.name)).reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
        extraCash += (h.weight ?? 0) * (cashSum / totalAll);
      }
    }
  });
  
  // Ajouter l'exposition Equities réelle = somme des régions
  const totalEquities = regionData.reduce((s, d) => s + d.value, 0);
  if (totalEquities > 0) m.set("Equities", totalEquities);
  
  // Ajouter le cash extra aux Liquidities
  if (extraCash > 0) {
    m.set("Liquidities", (m.get("Liquidities") ?? 0) + extraCash);
  }
  
  const profile = detectRiskProfile(currentPortfolio?.name);
  return Array.from(m.entries()).map(([name, value]) => {
    const gridId = CATEGORY_TO_GRID[name];
    const target = profile && gridId ? targetGridData[gridId]?.[profile]?.["target"] ?? null : null;
    return { name, value: +value.toFixed(1), target };
  });
}, [currentPortfolio, targetGridData, breakdowns, dpamLookup, samdpGeoBreakdown, regionData, samdpEquityRows]);

 // ── Credit exposure — agrégation par credit_type sur tout le portefeuille ──

  
const creditData = useMemo(() => {
    const FIXED_INCOME_CATS = ["Fixed Income", "Bonds"];
    const SAMDP_DEBT_ISIN_CD = "LU1545753169";
    const m = new Map<string, number>();
    (currentPortfolio?.holdings ?? []).forEach((h) => {
      if (!h || !FIXED_INCOME_CATS.includes(h.category ?? "")) return;
            const cbd = h.isin ? creditBreakdowns[h.isin] : null;
      if (cbd && cbd.length > 0) {
        for (const entry of cbd) {
          m.set(entry.credit_type, (m.get(entry.credit_type) ?? 0) + (h.weight ?? 0) * entry.weight / 100);
        }
      } else if (h.isin === SAMDP_DEBT_ISIN_CD && samdpDebtCreditBreakdown) {
        for (const entry of samdpDebtCreditBreakdown) {
          m.set(entry.credit_type, (m.get(entry.credit_type) ?? 0) + (h.weight ?? 0) * entry.weight / 100);
        }
      } else {
        // Priorité 2 : données DPAM credit
        const dpamCredit = h.isin
          ? dpamLookup[h.isin]?.creditBreakdown
          : null;
        if (dpamCredit && dpamCredit.length > 0) {
          for (const entry of dpamCredit) {
            m.set(entry.credit_type, (m.get(entry.credit_type) ?? 0) + (h.weight ?? 0) * entry.weight / 100);
          }
        }
      }
    });
    const order: CreditType[] = ["Govies", "IG", "HY", "NR", "EM Debt"];
    return order
      .filter(ct => (m.get(ct) ?? 0) > 0.01)
      .map(ct => ({ name: ct, value: +((m.get(ct) ?? 0).toFixed(1)) }));
  }, [currentPortfolio, creditBreakdowns, dpamLookup, samdpDebtCreditBreakdown]);

const SAMDP_DEBT_ISIN = "LU1545753169";

function getEffectiveDuration(isin: string | null | undefined): number | null {
  if (!isin) return null;
  if (durations[isin]) return durations[isin].duration;
  if (isin === SAMDP_DEBT_ISIN && samdpDebtInstruments.length > 0) {
    const debtLeafRows = samdpDebtInstruments.filter((i: any) => i.level === 2 && i.isin);
    const totalW = debtLeafRows.reduce((s: number, i: any) => s + Number(i.wght_pct ?? 0), 0);
    if (totalW === 0) return null;
    const weighted = debtLeafRows.reduce((s: number, i: any) => s + Number(i.modified_duration ?? 0) * Number(i.wght_pct ?? 0), 0);
    return +(weighted / totalW).toFixed(2);
  }
  const dpamDur = dpamLookup[isin]?.duration;
  if (dpamDur != null) return dpamDur;
  return null;
}
  
const portfolioDuration = useMemo(() => {
  const FIXED_INCOME_CATS = ["Fixed Income", "Bonds", "Liquidities"];
  const fiHoldings = (currentPortfolio?.holdings ?? []).filter(h =>
    h && FIXED_INCOME_CATS.includes(h.category ?? "") &&
    (h.isin ? (getEffectiveDuration(h.isin) != null || h.category === "Liquidities") : h.category === "Liquidities")
  );
  const totalWeight = fiHoldings.reduce((s, h) => s + (h.weight ?? 0), 0);
  if (totalWeight === 0) return null;
  const weightedDuration = fiHoldings.reduce((s, h) => {
    const dur = getEffectiveDuration(h.isin) ?? 0;
    return s + (h.weight ?? 0) * dur;
  }, 0);
  return +(weightedDuration / totalWeight).toFixed(2);
}, [currentPortfolio, durations, dpamLookup, samdpDebtInstruments]);
  
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
}, [allPortfolios, samdpInstruments]);

  const sortedPortfolios = useMemo(() =>
    [...allPortfolios].filter((p) => p?.name).sort((a, b) => {
      const ai = PORTFOLIO_ORDER.indexOf(a.name);
      const bi = PORTFOLIO_ORDER.indexOf(b.name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }), [allPortfolios]);

  const synthesisRegions = useMemo(() =>
    Array.from(new Set(sortedPortfolios.flatMap((p) =>
      applyLookThrough(p.holdings ?? []).map(({ region }) => region).filter(Boolean)
    ))), [sortedPortfolios, breakdowns, dpamLookup]);

  const synthesisData = useMemo(() =>
    sortedPortfolios.map((p) => {
      const rw: Record<string, number> = {};
      synthesisRegions.forEach((r) => (rw[r] = 0));
      applyLookThrough(p.holdings ?? []).forEach(({ region, weight }) => {
        rw[region] = (rw[region] ?? 0) + weight;
      });
      return { name: p.name ?? "—", type: p.type ?? "—", ...rw };
    }), [sortedPortfolios, synthesisRegions, breakdowns, dpamLookup]);

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
 const holdings = currentPortfolioEffective?.holdings ?? [];
if (drillDownFilter.type === "category") {
    if (drillDownFilter.value !== "Liquidities") {
      return holdings.filter(h => h?.category === drillDownFilter.value);
    }

    const CASH_ISINS_SET = new Set(["EUR", "USD", "GBP", "JPY", "YEN", "CHF", "NOK", "SEK", "DKK"]);
    const result: any[] = [];

    holdings.forEach(h => {
      if (!h) return;

      if (h.category === "Liquidities") {
        result.push(h);
        return;
      }

const bd = h.isin ? breakdownsWithP30[h.isin] : null;
      if (bd) {
        const cashEntry = bd.find(e => e.region === "Cash");
        if (cashEntry && cashEntry.weight > 0) {
          result.push({ ...h, asset_name: h.asset_name + " (Cash)", weight: (h.weight ?? 0) * cashEntry.weight / 100 });
          return;
        }
      }

      const dpamGeo = h.isin ? dpamLookup[h.isin]?.geoBreakdown : null;
      if (dpamGeo) {
        const cashEntry = dpamGeo.find((e: any) => e.region === "Cash");
        if (cashEntry && cashEntry.weight > 0) {
          result.push({ ...h, asset_name: h.asset_name + " (Cash)", weight: (h.weight ?? 0) * cashEntry.weight / 100 });
          return;
        }
      }

      if (h.isin === "LU1795355053" && samdpEquityRows.length > 0) {
        const cashLines = samdpEquityRows.filter((row: any) =>
          row.level === 5 &&
          (CASH_ISINS_SET.has((row.isin ?? "").toUpperCase()) ||
           (row.instrument_type ?? "").toUpperCase().includes("DEPOSIT"))
        );
        const samdpCashPct = cashLines.reduce((s: number, row: any) => s + Number(row.wght_ptf_ref ?? 0), 0);
        if (samdpCashPct > 0) {
          result.push({ ...h, asset_name: h.asset_name + " (Cash)", weight: (h.weight ?? 0) * samdpCashPct });
          return;
        }
      }
    });

    return result.filter(h => (h.weight ?? 0) > 0).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  }

  const SAMDP_ISINS = ["LU1795355053"];
  
  return holdings
    .filter(h => {
      if (!h) return false;
      if (h.category !== "Equities") return false;
      
      if (h.isin && SAMDP_ISINS.includes(h.isin) && samdpGeoBreakdown) {
        return samdpGeoBreakdown.some(e => normalizeRegion(e.region) === drillDownFilter.value);
      }
      const bd = h.isin ? breakdowns[h.isin] : null;
      if (bd && bd.length > 0) {
        return bd.some(e => normalizeRegion(e.region) === drillDownFilter.value);
      }
      const dpamGeo = h.isin && (h.asset_name ?? "").startsWith("DPAM")
        ? dpamLookup[h.isin]?.geoBreakdown
        : null;
      if (dpamGeo && dpamGeo.length > 0) {
        return dpamGeo.some(e => normalizeRegion(e.region) === drillDownFilter.value);
      }
      return normalizeRegion(h.region ?? "Others") === drillDownFilter.value;
    })
    .map(h => {
      if (h.isin && SAMDP_ISINS.includes(h.isin) && samdpGeoBreakdown) {
        const entry = samdpGeoBreakdown.find(e => normalizeRegion(e.region) === drillDownFilter.value);
        return { ...h, weight: (h.weight ?? 0) * (entry?.weight ?? 0) / 100 };
      }
      const bd = h.isin ? breakdowns[h.isin] : null;
      if (bd && bd.length > 0) {
        const totalWeight = bd
          .filter(e => normalizeRegion(e.region) === drillDownFilter.value)
          .reduce((s, e) => s + (h.weight ?? 0) * e.weight / 100, 0);
        return { ...h, weight: totalWeight };
      }
      const dpamGeo = h.isin && (h.asset_name ?? "").startsWith("DPAM")
        ? dpamLookup[h.isin]?.geoBreakdown
        : null;
      if (dpamGeo && dpamGeo.length > 0) {
        const totalWeight = dpamGeo
          .filter(e => normalizeRegion(e.region) === drillDownFilter.value)
          .reduce((s, e) => s + (h.weight ?? 0) * e.weight / 100, 0);
        return { ...h, weight: totalWeight };
      }
      return h;
    })
    .filter(h => (h.weight ?? 0) > 0);
}, [currentPortfolio, drillDownFilter, breakdowns, dpamLookup, samdpGeoBreakdown]);


const sortedFilteredHoldings = useMemo(() => {
let list = (currentPortfolioEffective?.holdings ?? []).filter((h) => {
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
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-1.5 rounded-lg"><TrendingUp className="text-white h-4 w-4" /></div>
          <h1 className="text-lg font-bold tracking-tight">Portfolio Insight</h1>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(() => {
const labels: Record<Tab, string> = { RISK_ANALYSIS: "⚠️ Risk Analysis", PERFORMANCE: "📈 Performance", SYNTHESE: "Breakdown Deviation", INSTRUMENTS: "Synthèse Instruments", TARGET_GRID: "Target Grid", Sicav: "Sicav", Mixed: "Mixed", MANUALS: "Manuals", DPAM: "DPAM", SIMULATION: "Simulation", SAMDP: "SAMDP"};
return (["RISK_ANALYSIS","PERFORMANCE","SYNTHESE", "INSTRUMENTS", "TARGET_GRID", "Sicav", "Mixed", "MANUALS", "DPAM", "SIMULATION", "SAMDP"] as Tab[]).map((tab) => {
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
            });
          })()}
        </div>
        <div className="w-32" />
      </header>

      <div className="flex flex-1 overflow-hidden">

        {(activeTab === "Sicav" || activeTab === "Mixed") && (
          <aside className="w-72 border-r border-slate-200 bg-white p-6 flex flex-col overflow-y-auto">
<div className="flex items-center justify-between mb-4 px-2">
  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profils {activeTab}</p>
  {activeTab === "Mixed" && (
    <button
      onClick={() => setP30Mode(v => !v)}
      className={cn(
        "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all",
        p30Mode
          ? "bg-violet-600 text-white border-violet-600"
          : "bg-white text-slate-400 border-slate-200 hover:border-violet-300"
      )}>
      {p30Mode ? "P30" : "Real"}
    </button>
  )}
</div>
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
                    dpamLookup={dpamLookup}
                    samdpGeoBreakdown={samdpGeoBreakdown}
                    samdpDebtCreditBreakdown={samdpDebtCreditBreakdown}
                    durations={durations}
                    samdpDebtInstruments={samdpDebtInstruments}
                    samdpEquityCashPct={samdpEquityCashPct}
                    samdpDebtCashPct={samdpDebtCashPct}
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
                  <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-52 shrink-0">
                    <label className="flex flex-row items-center justify-center border border-dashed border-slate-200 rounded-xl px-3 py-2 hover:border-sky-400 transition-all group cursor-pointer h-full gap-3">                      <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="hidden" />
                      <Upload className="h-4 w-4 text-slate-400 group-hover:text-sky-600 shrink-0" />
                      <span className="text-sm font-bold text-slate-900">Importer CSV</span>
                      {uploading
                        ? <Loader2 className="h-3.5 w-3.5 text-sky-600 animate-spin shrink-0" />
                        : uploadSuccess
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          : null
                      }
                    </label>
                  </div>

{([
                    { key: "quick_valuation", label: "Quick Valuation", color: "sky", entries: importLog.quick_valuation ? [importLog.quick_valuation] : [] },
                  ] as const).map(({ key, label, color, entries }) => (
  
<div key={key} className={cn("flex-1 bg-white px-4 py-2 rounded-2xl border shadow-sm flex flex-col justify-center gap-1", entries.length > 0 ? "border-slate-100" : "border-slate-100 opacity-70")}>                      <div className="flex items-center gap-2">
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
  {row.name}

  
  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
</button>
                                </td>
                                <td className="px-8 py-4 text-xs font-mono text-slate-400">{row.isin || "—"}</td>
{sortedPortfolios.map((p) => {
  const w = row.weights[p.name] ?? 0;
  const samdpW = (row as any).isSamdp ? (row as any).samdpWght : null;
  return (
    <td key={p.id} className="px-4 py-4 text-right font-medium text-slate-600 text-sm">
{w > 0 ? `${w.toFixed(1)}%` : "—"}
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

            {/* ── MANUALS ── */}
            {activeTab === "MANUALS" && (
              <motion.div key="manuals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Changements Manuels</h2>
                    <p className="text-slate-500">Ces données sont prioritaires sur les imports CSV.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {manualOverrides.some(ov => ov.manual_asset_name === "" || ov.manual_region === "" || ov.manual_currency === "" || ov.manual_category === "" || ov.manual_instrument === "") && (
                      <button onClick={repairEmptyOverrides} disabled={repairing}
                        className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-700 transition-all disabled:opacity-50">
                        {repairing ? <Loader2 className="h-4 w-4 animate-spin" /> : repairDone ? "✓ Réparé" : "Réparer les noms manquants"}
                      </button>
                    )}
                    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="bg-amber-50 p-2 rounded-lg"><Edit2 className="h-5 w-5 text-amber-600" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modifications</p>
                        <p className="text-xl font-bold text-slate-900 leading-none">{manualOverrides.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          {["Nom Original", "ISIN", "Région", "Devise", "Catégorie", "Type", "Date", "Actions"].map((h) => (
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
const samdpInst = !holding ? samdpInstruments.find((s: any) => s.isin === isin) : null;
const name = holding?.asset_name ?? samdpInst?.name ?? isin;
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
const samdpInst = samdpInstruments.find((s: any) => s.isin === isin);
const name = holding?.asset_name ?? samdpInst?.name ?? isin;
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

                {/* ── Gestion Active / Passive ── */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Gestion Active / Passive</h3>
                    <p className="text-slate-500 text-sm mt-1">Classifiez chaque instrument par ISIN. Non classifié = actif par défaut.</p>
                  </div>
                  <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="bg-sky-50 p-2 rounded-lg"><Tag className="h-5 w-5 text-sky-600" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progression</p>
                      <p className="text-xl font-bold text-slate-900 leading-none">
                        {classificationProgress.classified} / {classificationProgress.total}
                      </p>
                    </div>
                  </div>
                </div>

<div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-50 flex items-center gap-3">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <input type="text" value={styleSearch} onChange={e => setStyleSearch(e.target.value)}
                      placeholder="Rechercher un fonds ou un ISIN…"
                      className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                    {styleSearch && <button onClick={() => setStyleSearch("")} className="p-0.5 hover:bg-slate-100 rounded"><X className="h-3.5 w-3.5 text-slate-400" /></button>}
                    <span className="text-xs text-slate-400 shrink-0">{filteredInstrumentsByIsin.length} résultat{filteredInstrumentsByIsin.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Instrument</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ISIN</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids total</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Style</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredInstrumentsByIsin.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic">Aucun résultat pour "{styleSearch}"</td></tr>
                        ) : filteredInstrumentsByIsin.map(inst => {
                          const current = getManagementStyle(inst.isin);
                          const classified = isStyleClassified(inst.isin);
                          return (
                            <tr key={inst.isin} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3 font-medium text-slate-900 truncate max-w-[280px]">{inst.name}</td>
                              <td className="px-6 py-3 text-xs font-mono text-sky-600">{inst.isin}</td>
                              <td className="px-6 py-3 text-right text-slate-600">{inst.totalWeight.toFixed(2)}%</td>
                              <td className="px-6 py-3 text-right">
                                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                  <button onClick={() => setManagementStyle(inst.isin, inst.name, "active")}
                                    className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                      classified && current === "active" ? "bg-sky-600 text-white" : "text-slate-500 hover:bg-slate-200")}>
                                    Actif
                                  </button>
                                  <button onClick={() => setManagementStyle(inst.isin, inst.name, "passive")}
                                    className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                      classified && current === "passive" ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-200")}>
                                    Passif
                                  </button>
                                  {!classified && <span className="text-[10px] text-slate-300 italic px-2">non classifié</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
                      <label className="flex items-center gap-2 bg-white border border-dashed border-slate-200 rounded-xl px-4 py-2.5 hover:border-emerald-400 transition-all group cursor-pointer shrink-0">
                      <input type="file" accept=".xlsx,.xlsm" onChange={handleFileUpload} className="hidden" />
                      <Upload className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
                      <span className="text-sm font-bold text-slate-700">Importer</span>
                      {uploading
                        ? <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
                        : uploadSuccess
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          : null
                      }
                    </label>
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
                                          {val != null ? (row.id === "modified_duration" ? val.toFixed(2) : `${val.toFixed(1)}%`) : "—"}
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
  equityData={dpamEquityData}
  onUpload={handleDpamUpload}
  uploading={dpamUploading}
  uploadSuccess={dpamUploadSuccess}
  mappings={dpamMappings}
  onSaveMapping={async (isin, dpam_type, col_index, instrument_name) => {
    await fetch("/api/dpam-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mapping", filename: "mapping", parsed: { isin, dpam_type, col_index, instrument_name } }),
    });
    const fresh = await fetch("/api/dpam-data");
    if (fresh.ok) { const d = await fresh.json(); if (d.mappings) setDpamMappings(d.mappings); }
  }}
  onDeleteMapping={async (isin) => {
    await fetch("/api/dpam-data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isin }),
    });
    const fresh = await fetch("/api/dpam-data");
    if (fresh.ok) { const d = await fresh.json(); if (d.mappings) setDpamMappings(d.mappings); }
  }}
/>
  </motion.div>
)}

<div className={activeTab === "SIMULATION" ? "block" : "hidden"}>
  <div className="max-w-7xl mx-auto">
<SimulationTab
  allPortfolios={allPortfolios}
  breakdowns={breakdownsWithP30}
  creditBreakdowns={creditBreakdowns}
  durations={durations}
  manualOverrides={manualOverrides}
  currencyBreakdowns={currencyBreakdownsWithP30}
  targetGridData={targetGridData}
  dpamLookup={dpamLookup}
  samdpDebtCreditBreakdown={samdpDebtCreditBreakdown}
  samdpDebtInstruments={samdpDebtInstruments}
  samdpGeoBreakdown={samdpGeoBreakdown}
/>
  </div>
</div>

  {activeTab === "SAMDP" && (
  <motion.div key="samdp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="max-w-7xl mx-auto">
<SamdpTab
  equityData={samdpInstruments}
  importLog={samdpImportLog}
  manualOverrides={manualOverrides}
  onSelectInstrument={(inst) => setSelectedInstrument(inst)}
  debtData={samdpDebtInstruments}
  debtImportLog={samdpDebtImportLog}
  durations={durations}
  equityRows={samdpEquityRows}
  breakdowns={breakdowns}
  creditBreakdowns={creditBreakdowns}
/>
  </motion.div>
)}

{activeTab === "RISK_ANALYSIS" && (
  <motion.div key="risk_analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="max-w-6xl mx-auto">
    
<RiskAnalysisTab
      allPortfolios={allPortfolios}
      computePassiveActiveGlobal={computePassiveActiveGlobal}
      computePassiveActiveByRegion={computePassiveActiveByRegion}
      getManagementStyle={getManagementStyle}
      applyLookThroughWithStyle={applyLookThroughWithStyle}
      computeFundOrigins={computeFundOrigins}
      getFundOrigin={getFundOrigin}
    />
  </motion.div>
)}

{activeTab === "PERFORMANCE" && (
              <motion.div key="performance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Performance</h2>
                    <p className="text-slate-500">Performances des portefeuilles modèles et fonds de comparaison.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 bg-white border border-dashed border-slate-200 rounded-xl px-4 py-2.5 hover:border-emerald-400 transition-all group cursor-pointer shrink-0">
                      <input type="file" accept=".xlsx,.xlsm" onChange={handleFileUpload} className="hidden" />
                      <Upload className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
                      <span className="text-sm font-bold text-slate-700">Importer</span>
                      {uploading
                        ? <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
                        : uploadSuccess
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          : null
                      }
                    </label>
                    {performanceData.length > 0 && (() => {
                      const latestDate = performanceData.reduce((max, r) => (r.report_date > max ? r.report_date : max), performanceData[0].report_date);
                      const latestRow = performanceData.find(r => r.report_date === latestDate);
                      return (
                        <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm text-xs text-slate-500">
                          <span className="font-bold text-slate-700 block truncate max-w-[220px]">{latestRow?.filename ?? "—"}</span>
                          <span>{new Date(latestDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })} à {new Date(latestRow?.imported_at ?? latestDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      );
                    })()}
                    <div className="bg-emerald-100 p-3 rounded-2xl"><TrendingUp className="h-6 w-6 text-emerald-600" /></div>
                  </div>
                </div>

<PerformanceTab performanceData={performanceData} />
              </motion.div>
            )}
            
   {/* ── SICAV / MIXED ── */}
            {(activeTab === "Sicav" || activeTab === "Mixed") && (
              <motion.div key={`detail-${selectedId ?? "none"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-6xl mx-auto space-y-8">
                {detailLoading && <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>}
 {!detailLoading && !currentPortfolioEffective && (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
                    <Briefcase className="h-12 w-12 opacity-30" />
                    <p className="text-lg">Sélectionnez un portefeuille.</p>
                  </div>
                )}
{!detailLoading && currentPortfolioEffective && (
                  <>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
currentPortfolioEffective.type === "Sicav" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700")}>
                            {currentPortfolioEffective.type ?? "—"}
                          </span>
<h2 className="text-3xl font-bold tracking-tight text-slate-900">{portfolioLabel(currentPortfolioEffective.name)}</h2>
                        </div>
<p className="text-slate-500 max-w-2xl">{currentPortfolioEffective.description ?? ""}</p>
                      </div>
                        <button onClick={handleExportExcel}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                        <Download className="h-4 w-4" />
                        Export Positions
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
<div className="text-3xl font-bold text-slate-900">{currentPortfolioEffective.holdings?.length ?? 0}</div>
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
                              <div key={name} onClick={() => setShowCreditDetail(name)}
                                className="flex items-center gap-3 cursor-pointer group">
                                <span className="text-xs font-bold w-16 shrink-0 group-hover:opacity-70 transition-opacity" style={{ color: CREDIT_COLORS[name] ?? "#94a3b8" }}>{name}</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all group-hover:opacity-75"
                                    style={{ width: `${Math.min(100, value)}%`, backgroundColor: CREDIT_COLORS[name] ?? "#94a3b8" }} />
                                </div>
                                <span className="text-xs font-bold text-slate-700 w-12 text-right shrink-0">{value.toFixed(1)}%</span>
                                <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                              </div>
                            ))}
                            <p className="text-[10px] text-slate-400 italic pt-1">Cliquez pour filtrer</p>
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

{(currentPortfolioEffective.holdings?.length ?? 0) > 0 ? (
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
{[...drillDownHoldings]
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

{(currentPortfolioEffective.holdings?.length ?? 0) > 0 && (
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
                            {sortedFilteredHoldings.length > 0 && (
                              <tfoot>
                                <tr className="bg-slate-50 border-t border-slate-200">
                                  <td colSpan={5} className="px-8 py-4 font-bold text-slate-700 text-right">Total</td>
                                  <td className="px-8 py-4 text-right font-bold text-slate-900">
                                    {sortedFilteredHoldings.reduce((s, h) => s + Number(h?.weight ?? 0), 0).toFixed(2)}%
                                  </td>
                                </tr>
                              </tfoot>
                            )}
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
<Modal isOpen={!!showCreditDetail} onClose={() => setShowCreditDetail(null)} title={`Détail Credit Quality — ${showCreditDetail}`}>
  <div className="space-y-4">
    <p className="text-xs text-slate-500 italic">Détail du calcul pour la catégorie {showCreditDetail}.</p>
    {(() => {
      const SAMDP_DEBT_ISIN_MODAL = "LU1545753169";
      const rows = (currentPortfolio?.holdings ?? [])
        .filter(h => h && ["Fixed Income", "Bonds"].includes(h.category ?? ""))
        .map(h => {
          const cbd = h.isin ? creditBreakdowns[h.isin] : null;
          const samdpDebt = h.isin === SAMDP_DEBT_ISIN_MODAL ? samdpDebtCreditBreakdown : null;
          const dpamCredit = h.isin ? dpamLookup[h.isin]?.creditBreakdown : null;
          const entries = cbd ?? samdpDebt ?? dpamCredit ?? [];
          const filtered = entries.filter((e: any) => e.credit_type === showCreditDetail);
          if (filtered.length === 0) return null;
          const exposition = filtered.reduce((s: number, e: any) => s + (h.weight ?? 0) * e.weight / 100, 0);
          if (exposition < 0.001) return null;
          return { h, entries, exposition };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.exposition - a.exposition);

      const total = rows.reduce((s: number, r: any) => s + r.exposition, 0);

      return (
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Instrument</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Poids PTF</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">% {showCreditDetail}</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Exposition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r: any, i: number) => {
              const pct = r.entries.filter((e: any) => e.credit_type === showCreditDetail)
                .reduce((s: number, e: any) => s + e.weight, 0);
              return (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 truncate max-w-[200px]">{r.h.asset_name ?? "—"}</p>
                    <p className="text-xs font-mono text-slate-400">{r.h.isin ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{(r.h.weight ?? 0).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-slate-500">{pct.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-bold text-violet-600">{r.exposition.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={3} className="px-4 py-3 font-bold text-slate-700 text-right">Total {showCreditDetail}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{total.toFixed(2)}%</td>
            </tr>
          </tfoot>
        </table>
      );
    })()}
  </div>
</Modal>

      <Modal isOpen={showDurationDetail} onClose={() => setShowDurationDetail(false)} title="Détail Duration">
  {currentPortfolio && (() => {
        const FIXED_INCOME_CATS = ["Fixed Income", "Bonds", "Liquidities"];
const fiHoldings = (currentPortfolio.holdings ?? [])
  .filter(h => h && FIXED_INCOME_CATS.includes(h.category ?? "") &&
    (h.isin ? (getEffectiveDuration(h.isin) != null || h.category === "Liquidities") : h.category === "Liquidities"))
  .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

const allFiHoldings = (currentPortfolio.holdings ?? [])
  .filter(h => h && FIXED_INCOME_CATS.includes(h.category ?? ""))
  .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
        const totalWeight = fiHoldings.reduce((s, h) => s + (h.weight ?? 0), 0);

        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 italic">Duration moyenne pondérée — divisée par le poids total des instruments obligataires avec duration configurée.</p>
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instruments utilisés ({fiHoldings.length} / {allFiHoldings.length})</p>
              </div>
<div className="divide-y divide-slate-50 max-h-32 overflow-y-auto">
                {allFiHoldings.map((h, i) => {
                  const hasDur = h.category === "Liquidities" || (h.isin && getEffectiveDuration(h.isin) != null);
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
const dur = Number((h.isin && getEffectiveDuration(h.isin)) ?? 0);
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
{currentPortfolioEffective && showCurrencyDetail && (
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
{(currentPortfolioEffective.holdings ?? [])
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
