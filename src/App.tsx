import React, { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  PieChart as PieChartIcon, 
  Globe, 
  Briefcase, 
  AlertCircle, 
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
  Plus
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
  LabelList
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
  deleteManualOverride
} from "./services/api";
import { analyzePortfolio } from "./services/gemini";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

type Tab = 'SYNTHESE' | 'Sicav' | 'Mixed' | 'INSTRUMENTS' | 'MANUALS';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Sicav');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [allPortfolios, setAllPortfolios] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [modelGrid, setModelGrid] = useState<ModelGridItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Drill-down states
  const [drillDownFilter, setDrillDownFilter] = useState<{ type: 'category' | 'region', value: string } | null>(null);
  
  // Modal states
  const [selectedInstrument, setSelectedInstrument] = useState<Holding | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Manual Overrides states
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
  const [editingOverride, setEditingOverride] = useState<{ 
    original_asset_name: string, 
    manual_asset_name: string, 
    manual_isin: string,
    manual_region: string,
    manual_currency: string,
    manual_category: string,
    manual_instrument: string
  } | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [pList, mGrid, allP, overrides] = await Promise.all([
        fetchPortfolios(), 
        fetchModelGrid(),
        fetchAllPortfolios(),
        fetchManualOverrides()
      ]);
      setPortfolios(pList);
      setModelGrid(mGrid);
      setAllPortfolios(allP);
      setManualOverrides(overrides);
      
      if (selectedId) {
        const details = await fetchPortfolioDetails(selectedId);
        setCurrentPortfolio(details);
      }
    } catch (error) {
      console.error("Refresh failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const [pList, mGrid, allP, overrides] = await Promise.all([
          fetchPortfolios(), 
          fetchModelGrid(),
          fetchAllPortfolios(),
          fetchManualOverrides()
        ]);
        setPortfolios(pList);
        setModelGrid(mGrid);
        setAllPortfolios(allP);
        setManualOverrides(overrides);
        
        const scvPortfolios = pList.filter(p => p.type === 'Sicav');
        if (scvPortfolios.length > 0) {
          setSelectedId(scvPortfolios[0].id);
        }
      } catch (error) {
        console.error("Initialization failed", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSaveOverride = async () => {
    if (!editingOverride) return;
    try {
      await saveManualOverride(editingOverride);
      setEditingOverride(null);
      await refreshData();
    } catch (error) {
      console.error("Failed to save override", error);
    }
  };

  const handleDeleteOverride = async (id: number) => {
    try {
      await deleteManualOverride(id);
      await refreshData();
    } catch (error) {
      console.error("Failed to delete override", error);
    }
  };

  useEffect(() => {
    if (selectedId) {
      async function loadDetails() {
        setLoading(true);
        try {
          const details = await fetchPortfolioDetails(selectedId!);
          setCurrentPortfolio(details);
          setAnalysis(null);
          setDrillDownFilter(null); // Reset drill-down
        } catch (error) {
          console.error("Failed to load portfolio details", error);
        } finally {
          setLoading(false);
        }
      }
      loadDetails();
    }
  }, [selectedId]);

  useEffect(() => {
    if (activeTab === 'Sicav' || activeTab === 'Mixed') {
      const filtered = portfolios.filter(p => p.type === activeTab);
      if (filtered.length > 0 && (!selectedId || !filtered.find(p => p.id === selectedId))) {
        setSelectedId(filtered[0].id);
      }
    }
  }, [activeTab, portfolios]);

  const handleAnalyze = async () => {
    if (!currentPortfolio || analyzing) return;
    setAnalyzing(true);
    try {
      const result = await analyzePortfolio(currentPortfolio, modelGrid);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const categoryData = useMemo(() => {
    if (!currentPortfolio?.holdings) return [];
    const map = new Map<string, number>();
    currentPortfolio.holdings.forEach(h => {
      map.set(h.category, (map.get(h.category) || 0) + h.weight);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));
  }, [currentPortfolio]);

  const regionData = useMemo(() => {
    if (!currentPortfolio?.holdings) return [];
    const map = new Map<string, number>();
    currentPortfolio.holdings.forEach(h => {
      map.set(h.region, (map.get(h.region) || 0) + h.weight);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));
  }, [currentPortfolio]);

  const synthesisData = useMemo(() => {
    const regions = Array.from(new Set(allPortfolios.flatMap(p => p.holdings?.map(h => h.region) || []))) as string[];
    return allPortfolios.map(p => {
      const regionWeights: Record<string, number> = {};
      regions.forEach(r => {
        regionWeights[r] = 0;
      });
      p.holdings?.forEach(h => {
        regionWeights[h.region] = (regionWeights[h.region] || 0) + h.weight;
      });
      return {
        name: p.name,
        type: p.type,
        ...regionWeights
      };
    });
  }, [allPortfolios]);

  const instrumentsSynthesis = useMemo(() => {
    // Group by asset_name to ensure uniqueness even if ISIN is empty
    const instrumentMap = new Map<string, { name: string, originalName: string, isin: string, weights: Record<string, number>, details: Partial<Holding> }>();
    const portfolioNames = allPortfolios.map(p => p.name);
    
    allPortfolios.forEach(p => {
      p.holdings?.forEach(h => {
        const key = h.asset_name;
        if (!instrumentMap.has(key)) {
          const weights: Record<string, number> = {};
          portfolioNames.forEach(pn => weights[pn] = 0);
          instrumentMap.set(key, {
            name: h.asset_name,
            originalName: h.original_asset_name,
            isin: h.isin,
            weights,
            details: h
          });
        }
        const entry = instrumentMap.get(key)!;
        entry.weights[p.name] = h.weight;
        // Keep the most complete details
        if (h.isin && !entry.isin) entry.isin = h.isin;
      });
    });
    
    return Array.from(instrumentMap.values()).map(item => ({
      ...item,
      originalName: item.originalName || item.name
    }));
  }, [allPortfolios]);

  const filteredPortfolios = useMemo(() => {
    return portfolios.filter(p => p.type === activeTab);
  }, [portfolios, activeTab]);

  const drillDownHoldings = useMemo(() => {
    if (!currentPortfolio?.holdings || !drillDownFilter) return [];
    return currentPortfolio.holdings.filter(h => {
      if (drillDownFilter.type === 'category') return h.category === drillDownFilter.value;
      if (drillDownFilter.type === 'region') return h.region === drillDownFilter.value;
      return false;
    });
  }, [currentPortfolio, drillDownFilter]);

 const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setUploading(true);
  setUploadSuccess(false);

  Papa.parse(file, {
    header: false, // pas de header, on utilise les indices
    skipEmptyLines: true,
    complete: async (results) => {
      try {
        const portfolioMap = new Map<string, any>();
        
        results.data.forEach((row: any, index: number) => {
          // Ignorer les 2 premières lignes (headers)
          if (index < 2) return;

          const rawRow = row as string[];
          
          const portfolioName = rawRow[1]?.trim(); // Colonne B
          if (!portfolioName) return;

// Colonne E = index 4, on enlève les 20 derniers caractères pour le nom de l'instrument
const rawName = rawRow[4]?.trim() || "";
const assetName = rawName.length > 20 ? rawName.slice(0, -20).trim() : rawName;
if (!assetName) return;

// Nom du portefeuille = colonne E sans "TECHNICAL.MPF." et sans les 20 derniers caractères
const rawPortfolioName = rawName.replace("TECHNICAL.MPF.", "");
const portfolioShortName = rawPortfolioName.length > 20 ? rawPortfolioName.slice(0, -20).trim() : rawPortfolioName;

// Extraire juste le code portefeuille ex: MIX_HIGH, SCV_ML
const portfolioCode = portfolioShortName.split("_").slice(0, 2).join("_");
const portfolioType = portfolioCode.startsWith("MIX") ? "Mixed" : portfolioCode.startsWith("SCV") ? "Sicav" : "Sicav";
const portfolioName = `${portfolioType} - ${portfolioCode}`;

const weight = parseFloat(rawRow[12]?.replace(",", ".") || "0"); // Colonne M
const currency = rawRow[11]?.trim() || "EUR"; // Colonne L
const isin = rawRow[20]?.trim() || ""; // Colonne U
const instrument = rawRow[21]?.trim() || "Other"; // Colonne V
const category = rawRow[23]?.trim() || "Unknown"; // Colonne X
const region = rawRow[26]?.trim() || "Global"; // Colonne AA

          if (!portfolioMap.has(portfolioName)) {
            portfolioMap.set(portfolioName, {
              name: portfolioName,
              type: portfolioType,
              description: "",
              holdings: []
            });
          }

          if (assetName) {
            portfolioMap.get(portfolioName).holdings.push({
              asset_name: assetName,
              isin,
              category,
              region,
              instrument,
              weight,
              currency
            });
          }
        });

        const portfoliosToUpload = Array.from(portfolioMap.values());

        const response = await fetch("/api/upload-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portfolios: portfoliosToUpload })
        });

        if (response.ok) {
          setUploadSuccess(true);
          await refreshData();
          setTimeout(() => setUploadSuccess(false), 3000);
        } else {
          const err = await response.text();
          alert(`Erreur ${err}`);
        }
      } catch (error) {
        console.error("CSV processing error", error);
        alert("Erreur lors du traitement du fichier CSV.");
      } finally {
        setUploading(false);
      }
    }
  });
};

  if (loading && !currentPortfolio && allPortfolios.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600 p-1.5 rounded-lg">
            <TrendingUp className="text-white h-4 w-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Portfolio Insight</h1>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('SYNTHESE')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'SYNTHESE' ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Synthèse Géo
          </button>
          <button
            onClick={() => setActiveTab('INSTRUMENTS')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'INSTRUMENTS' ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Synthèse Instruments
          </button>
          <button
            onClick={() => setActiveTab('Sicav')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'Sicav' ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Sicav
          </button>
          <button
            onClick={() => setActiveTab('Mixed')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'Mixed' ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mixed
          </button>
          <button
            onClick={() => setActiveTab('MANUALS')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'MANUALS' ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Manuals
          </button>
        </div>

        <div className="w-32" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {(activeTab === 'Sicav' || activeTab === 'Mixed') && (
          <aside className="w-72 border-r border-slate-200 bg-white p-6 flex flex-col overflow-y-auto">
            <nav className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Profils {activeTab}</p>
              {filteredPortfolios.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    selectedId === p.id 
                      ? "bg-sky-50 text-sky-700 font-medium shadow-sm ring-1 ring-sky-100" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Briefcase className={cn("h-4 w-4", selectedId === p.id ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className="truncate">{p.name.split(' - ')[1]}</span>
                  {selectedId === p.id && <ChevronRight className="ml-auto h-4 w-4" />}
                </button>
              ))}
            </nav>
          </aside>
        )}

        <main className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <AnimatePresence mode="wait">
            {activeTab === 'SYNTHESE' ? (
              <motion.div
                key="synthese"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Synthèse Géographique</h2>
                    <p className="text-slate-500">Vue d'ensemble de l'exposition régionale pour tous les portefeuilles modèles.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="bg-sky-50 p-2 rounded-lg">
                        <TableIcon className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instruments</p>
                        <p className="text-xl font-bold text-slate-900 leading-none">{instrumentsSynthesis.length}</p>
                      </div>
                    </div>
                    <div className="bg-sky-100 p-3 rounded-2xl">
                      <Globe className="h-6 w-6 text-sky-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">Portefeuille</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                          {Array.from(new Set(allPortfolios.flatMap(p => p.holdings?.map(h => h.region) || []))).map(region => (
                            <th key={region} className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{region}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {synthesisData.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50">{row.name}</td>
                            <td className="px-8 py-5">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                row.type === 'Sicav' ? "bg-purple-50 text-purple-700" : "bg-amber-50 text-amber-700"
                              )}>
                                {row.type}
                              </span>
                            </td>
                            {Object.entries(row).filter(([k]) => k !== 'name' && k !== 'type').map(([region, weight]) => (
                              <td key={region} className="px-8 py-5 text-right font-medium text-slate-600">
                                <div className="flex flex-col items-end">
                                  <span>{Number(weight).toFixed(1)}%</span>
                                  <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div 
                                      className="h-full bg-sky-500" 
                                      style={{ width: `${Math.min(100, Number(weight))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'INSTRUMENTS' ? (
              <motion.div
                key="instruments"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Synthèse des Instruments</h2>
                    <p className="text-slate-500">Détail de chaque instrument et son poids au sein de tous les portefeuilles.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="bg-emerald-50 p-2 rounded-lg">
                        <TableIcon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instruments</p>
                        <p className="text-xl font-bold text-slate-900 leading-none">{instrumentsSynthesis.length}</p>
                      </div>
                    </div>
                    <div className="bg-emerald-100 p-3 rounded-2xl">
                      <Layers className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                </div>

{/* Upload Zone - Compact version */}
<div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
  <label className="flex items-center justify-between border border-dashed border-slate-200 rounded-xl p-3 hover:border-sky-400 transition-all group cursor-pointer">
    <input 
      type="file" 
      accept=".csv" 
      onChange={handleFileUpload}
      className="hidden"
    />
    <div className="flex items-center gap-4">
      <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-sky-50 transition-colors">
        <Upload className="h-5 w-5 text-slate-400 group-hover:text-sky-600" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900 leading-tight">Importer CSV</h3>
        <p className="text-[11px] text-slate-500 leading-tight">Remplace toutes les données (Col E: Nom, Col U: ISIN)</p>
      </div>
    </div>
    
    {uploading ? (
      <div className="flex items-center gap-2 bg-sky-50 px-3 py-1.5 rounded-lg">
        <Loader2 className="h-4 w-4 text-sky-600 animate-spin" />
        <span className="text-xs font-bold text-sky-700">Importation...</span>
      </div>
    ) : uploadSuccess ? (
      <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-xs font-bold text-emerald-700">Succès !</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg">
        <FileText className="h-3 w-3" />
        CSV
      </div>
    )}
  </label>
</div>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">Instrument</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ISIN</th>
                          {allPortfolios.map(p => {
                            const [type, profile] = p.name.split(' - ');
                            return (
                              <th key={p.id} className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right min-w-[100px]" title={p.name}>
                                <div className="flex flex-col">
                                  <span className="opacity-60 leading-tight">{type}</span>
                                  <span className="text-slate-900 leading-tight">{profile}</span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {instrumentsSynthesis.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-5 sticky left-0 bg-white group-hover:bg-slate-50">
                              <button 
                                onClick={() => setSelectedInstrument(row.details as Holding)}
                                className="flex items-center gap-2 text-sky-600 font-bold hover:underline text-left"
                              >
                                {row.name}
                                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </td>
                            <td className="px-8 py-5 text-xs font-mono text-slate-500">{row.isin}</td>
                            {allPortfolios.map(p => (
                              <td key={p.id} className="px-4 py-5 text-right font-medium text-slate-600 text-sm">
                                {row.weights[p.name] > 0 ? `${row.weights[p.name].toFixed(1)}%` : "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'MANUALS' ? (
              <motion.div
                key="manuals"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-7xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Changements Manuels</h2>
                    <p className="text-slate-500">Liste des instruments modifiés manuellement. Ces données sont prioritaires sur les imports CSV.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                      <div className="bg-amber-50 p-2 rounded-lg">
                        <Edit2 className="h-5 w-5 text-amber-600" />
                      </div>
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
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nom Original</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nouveau Nom</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ISIN</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Région</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Devise</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {manualOverrides.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-8 py-12 text-center text-slate-400 italic">
                              Aucun changement manuel pour le moment.
                            </td>
                          </tr>
                        ) : (
                          manualOverrides.map((override) => (
                            <tr key={override.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-5 font-medium text-slate-500">{override.original_asset_name}</td>
                              <td className="px-8 py-5 font-bold text-slate-900">{override.manual_asset_name || "-"}</td>
                              <td className="px-8 py-5 text-xs font-mono text-sky-600 font-bold">{override.manual_isin || "-"}</td>
                              <td className="px-8 py-5 text-xs text-slate-600 font-medium">{override.manual_region || "-"}</td>
                              <td className="px-8 py-5 text-xs text-slate-600 font-medium">{override.manual_currency || "-"}</td>
                              <td className="px-8 py-5 text-xs text-slate-600 font-medium">{override.manual_category || "-"}</td>
                              <td className="px-8 py-5 text-xs text-slate-600 font-medium">{override.manual_instrument || "-"}</td>
                              <td className="px-8 py-5 text-xs text-slate-400">
                                {new Date(override.updated_at).toLocaleDateString()}
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => setEditingOverride({ 
                                      original_asset_name: override.original_asset_name, 
                                      manual_asset_name: override.manual_asset_name || "", 
                                      manual_isin: override.manual_isin || "",
                                      manual_region: override.manual_region || "",
                                      manual_currency: override.manual_currency || "",
                                      manual_category: override.manual_category || "",
                                      manual_instrument: override.manual_instrument || ""
                                    })}
                                    className="p-2 hover:bg-sky-50 text-slate-400 hover:text-sky-600 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteOverride(override.id)}
                                    className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              currentPortfolio && (
                <motion.div
                  key={currentPortfolio.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-6xl mx-auto space-y-8"
                >
                  {/* Header */}
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                          currentPortfolio.type === 'Sicav' ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {currentPortfolio.type}
                        </span>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{currentPortfolio.name.split(' - ')[1]}</h2>
                      </div>
                      <p className="text-slate-500 max-w-2xl">{currentPortfolio.description}</p>
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Analyse IA
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-sky-100 p-2 rounded-xl">
                          <LayoutDashboard className="h-5 w-5 text-sky-600" />
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Actifs</span>
                      </div>
                      <div className="text-3xl font-bold text-slate-900">{currentPortfolio.holdings?.length || 0}</div>
                      <div className="text-xs text-slate-400 mt-1">Instruments individuels</div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-emerald-100 p-2 rounded-xl">
                          <PieChartIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Catégorie Principale</span>
                      </div>
                      <div className="text-3xl font-bold text-slate-900">
                        {[...categoryData].sort((a, b) => b.value - a.value)[0]?.name || "N/A"}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Plus grande exposition</div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-amber-100 p-2 rounded-xl">
                          <Globe className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Région Principale</span>
                      </div>
                      <div className="text-3xl font-bold text-slate-900">
                        {[...regionData].sort((a, b) => b.value - a.value)[0]?.name || "N/A"}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Concentration géographique</div>
                    </div>
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5 text-sky-600" />
                        Allocation par Catégorie
                      </h3>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                              onClick={(data) => setDrillDownFilter({ type: 'category', value: data.name })}
                              className="cursor-pointer"
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                              <LabelList dataKey="value" position="outside" formatter={(v: number) => `${v}%`} fill="#64748b" fontSize={12} />
                            </Pie>
                            <Tooltip 
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(v: number) => `${v}%`}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-center text-xs text-slate-400 mt-2 italic">Cliquez sur une section pour voir le détail des instruments</p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                        <Globe className="h-5 w-5 text-amber-600" />
                        Exposition Régionale
                      </h3>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={regionData}
                            onClick={(data: any) => data && data.activeLabel && setDrillDownFilter({ type: 'region', value: data.activeLabel })}
                          >
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip 
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(v: number) => `${v}%`}
                            />
                            <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} className="cursor-pointer">
                              <LabelList dataKey="value" position="top" formatter={(v: number) => `${v}%`} fill="#64748b" fontSize={12} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-center text-xs text-slate-400 mt-2 italic">Cliquez sur une barre pour voir le détail des instruments</p>
                    </div>
                  </div>

                  {/* Drill-down Detail Section */}
                  <AnimatePresence>
                    {drillDownFilter && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-sky-50 p-8 rounded-3xl border border-sky-100"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-sky-900">
                            Détail {drillDownFilter.type === 'category' ? 'Catégorie' : 'Région'} : {drillDownFilter.value}
                          </h3>
                          <button 
                            onClick={() => setDrillDownFilter(null)}
                            className="text-sky-600 hover:text-sky-800 text-sm font-medium flex items-center gap-1"
                          >
                            Fermer le détail <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {drillDownHoldings.map((h, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-sky-100 flex justify-between items-center">
                              <div>
                                <div className="font-bold text-slate-900">{h.asset_name}</div>
                                <div className="text-xs text-slate-500">{h.instrument} • {h.currency}</div>
                              </div>
                              <div className="text-lg font-bold text-sky-600">{h.weight}%</div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* AI Analysis Section */}
                  <AnimatePresence>
                    {analysis && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                          <Sparkles className="h-32 w-32" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                              <Sparkles className="h-5 w-5 text-sky-400" />
                            </div>
                            <h3 className="text-xl font-bold">Analyse IA Insight</h3>
                          </div>
                          <p className="text-slate-300 leading-relaxed text-lg mb-8">
                            {analysis.commentary}
                          </p>
                          
                          {analysis.differences.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {analysis.differences.map((diff, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
                                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    {diff.category} • {diff.region}
                                  </div>
                                  <div className="flex items-end justify-between">
                                    <div className="text-xl font-bold">
                                      {diff.current}% <span className="text-xs font-normal text-slate-400">vs {diff.target}%</span>
                                    </div>
                                    <div className={cn(
                                      "text-sm font-medium px-2 py-0.5 rounded-lg",
                                      diff.diff > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                    )}>
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

                  {/* Holdings Table */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-bottom border-slate-100 flex items-center justify-between">
                      <h3 className="text-lg font-bold">Détails des Positions</h3>
                      <div className="text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full">
                        {currentPortfolio.holdings?.length} Positions
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Instrument</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ISIN</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Région</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Devise</th>
                            <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Poids</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {currentPortfolio.holdings?.map((h) => (
                            <tr key={h.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-5">
                                <button 
                                  onClick={() => setSelectedInstrument(h)}
                                  className="font-medium text-slate-900 hover:text-sky-600 hover:underline text-left"
                                >
                                  {h.asset_name}
                                </button>
                              </td>
                              <td className="px-8 py-5 text-xs font-mono text-slate-400">{h.isin}</td>
                              <td className="px-8 py-5">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                                  {h.category}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-slate-600">{h.region}</td>
                              <td className="px-8 py-5 text-slate-500 text-sm">{h.currency}</td>
                              <td className="px-8 py-5 text-right font-bold text-slate-900">{h.weight}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Instrument Detail Modal */}
      <Modal 
        isOpen={!!selectedInstrument} 
        onClose={() => setSelectedInstrument(null)}
        title="Fiche Instrument"
      >
        {selectedInstrument && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-sky-600 p-3 rounded-xl">
                  <TrendingUp className="text-white h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{selectedInstrument.asset_name}</h4>
                  <p className="text-sm text-slate-500">{selectedInstrument.instrument}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setEditingOverride({ 
                    original_asset_name: selectedInstrument.original_asset_name || selectedInstrument.asset_name, 
                    manual_asset_name: selectedInstrument.asset_name, 
                    manual_isin: selectedInstrument.isin,
                    manual_region: selectedInstrument.region,
                    manual_currency: selectedInstrument.currency,
                    manual_category: selectedInstrument.category,
                    manual_instrument: selectedInstrument.instrument
                  });
                  setSelectedInstrument(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-sky-50 text-sky-600 border border-sky-100 rounded-xl transition-colors font-bold text-sm"
              >
                <Edit2 className="h-4 w-4" />
                Modifier
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Info className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">ISIN</span>
                </div>
                <div className="font-bold text-slate-900">{selectedInstrument.isin}</div>
              </div>
              <div className="p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Région</span>
                </div>
                <div className="font-bold text-slate-900">{selectedInstrument.region}</div>
              </div>
              <div className="p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Coins className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Devise</span>
                </div>
                <div className="font-bold text-slate-900">{selectedInstrument.currency}</div>
              </div>
              <div className="p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Tag className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Catégorie</span>
                </div>
                <div className="font-bold text-slate-900">{selectedInstrument.category}</div>
              </div>
              <div className="p-4 border border-slate-100 rounded-2xl">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Info className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Type</span>
                </div>
                <div className="font-bold text-slate-900">{selectedInstrument.instrument}</div>
              </div>
            </div>

            <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100">
              <p className="text-sm text-sky-800 leading-relaxed">
                Cet instrument est utilisé dans vos portefeuilles modèles pour assurer une exposition diversifiée à la classe d'actifs <strong>{selectedInstrument.category}</strong> dans la zone <strong>{selectedInstrument.region}</strong>.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Instrument Edit Modal */}
      <Modal 
        isOpen={!!editingOverride} 
        onClose={() => setEditingOverride(null)}
        title="Modifier l'instrument"
      >
        {editingOverride && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instrument Original</p>
              <p className="text-slate-900 font-bold">{editingOverride.original_asset_name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nouveau Nom</label>
                <input 
                  type="text"
                  value={editingOverride.manual_asset_name}
                  onChange={(e) => setEditingOverride({ ...editingOverride, manual_asset_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                  placeholder="Entrez le nom de l'instrument"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nouvel ISIN</label>
                <input 
                  type="text"
                  value={editingOverride.manual_isin}
                  onChange={(e) => setEditingOverride({ ...editingOverride, manual_isin: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-mono"
                  placeholder="Ex: LU0123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Région</label>
                <input 
                  type="text"
                  value={editingOverride.manual_region}
                  onChange={(e) => setEditingOverride({ ...editingOverride, manual_region: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                  placeholder="Ex: Europe, US, Global"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Devise</label>
                <input 
                  type="text"
                  value={editingOverride.manual_currency}
                  onChange={(e) => setEditingOverride({ ...editingOverride, manual_currency: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                  placeholder="Ex: EUR, USD, CHF"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Catégorie</label>
                <input 
                  type="text"
                  value={editingOverride.manual_category}
                  onChange={(e) => setEditingOverride({ ...editingOverride, manual_category: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                  placeholder="Ex: Equity, Fixed Income, Cash"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Type d'Instrument</label>
                <input 
                  type="text"
                  value={editingOverride.manual_instrument}
                  onChange={(e) => setEditingOverride({ ...editingOverride, manual_instrument: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                  placeholder="Ex: ETF, Fund, Stock, Bond"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setEditingOverride(null)}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveOverride}
                className="flex-1 flex items-center justify-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-sky-700 transition-all shadow-lg shadow-sky-100"
              >
                <Save className="h-4 w-4" />
                Sauvegarder
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center italic">
              Ce changement sera conservé même après un nouvel import CSV.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
