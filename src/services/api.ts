import { Portfolio, ModelGridItem, ManualOverride } from "../types";

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`API ${url} returned ${res.status}`);
      return null;
    }
    return res.json();
  } catch (e) {
    console.error(`API ${url} failed:`, e);
    return null;
  }
}

// ── Bootstrap — tout en un seul appel ─────────────────────────────────────────
export type BreakdownEntry = { region: string; weight: number; updated_at?: string };
export type BreakdownMap = Record<string, BreakdownEntry[]>;
export type CurrencyBreakdownEntry = { currency: string; weight: number; updated_at?: string };
export type CurrencyBreakdownMap = Record<string, CurrencyBreakdownEntry[]>;
export type RatingValue = "Govies" | "IG" | "HY" | "NR";
export type RatingsMap = Record<string, { rating: RatingValue; updated_at: string }>;

export type BootstrapData = {
  portfolios: Portfolio[];
  overrides: ManualOverride[];
  breakdowns: BreakdownMap;
  currencyBreakdowns: CurrencyBreakdownMap;
  ratings: RatingsMap;
  importLog: {
    quick_valuation: { filename: string; imported_at: string } | null;
    samdp: { filename: string; imported_at: string }[];
    target_grid: { filename: string; imported_at: string } | null;
    other: { filename: string; imported_at: string } | null;
  };
  targetGrid: Record<string, any>;
};

export async function fetchBootstrap(): Promise<BootstrapData | null> {
  return safeFetch<BootstrapData>("/api/bootstrap");
}

// ── Portfolios (pour rafraîchissement partiel) ────────────────────────────────
export async function fetchPortfolioDetails(id: number): Promise<Portfolio> {
  const data = await safeFetch<Portfolio>(`/api/portfolio-detail?id=${id}`);
  if (!data) throw new Error(`Failed to load portfolio ${id}`);
  return data;
}

// ── Manual overrides ──────────────────────────────────────────────────────────
export async function saveManualOverride(override: Partial<ManualOverride>): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/manual-overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(override),
  });
  return data ?? { success: false };
}

export async function deleteManualOverride(id: number): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>(`/api/manual-overrides-delete?id=${id}`, {
    method: "DELETE",
  });
  return data ?? { success: false };
}

// ── Geo breakdowns ────────────────────────────────────────────────────────────
export async function saveBreakdown(isin: string, breakdown: BreakdownEntry[]): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/manual-data?resource=breakdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin, breakdown }),
  });
  return data ?? { success: false };
}

export async function deleteBreakdown(isin: string): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/manual-data?resource=breakdown", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin }),
  });
  return data ?? { success: false };
}

// ── Currency breakdowns ───────────────────────────────────────────────────────
export async function saveCurrencyBreakdown(isin: string, breakdown: CurrencyBreakdownEntry[]): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/manual-data?resource=currency", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin, breakdown }),
  });
  return data ?? { success: false };
}

export async function deleteCurrencyBreakdown(isin: string): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/manual-data?resource=currency", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin }),
  });
  return data ?? { success: false };
}

// ── Ratings ───────────────────────────────────────────────────────────────────
export async function saveRating(isin: string, rating: RatingValue): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/manual-data?resource=ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin, rating }),
  });
  return data ?? { success: false };
}

export async function deleteRating(isin: string): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/manual-data?resource=ratings", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isin }),
  });
  return data ?? { success: false };
}

// ── Upload ────────────────────────────────────────────────────────────────────
export async function uploadPortfolios(portfolios: any[]): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/upload-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ portfolios }),
  });
  return data ?? { success: false };
}

export async function saveImportLogEntry(filename: string): Promise<void> {
  await safeFetch("/api/import-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });
}

export async function uploadTargetGrid(rows: any[]): Promise<{ success: boolean }> {
  const data = await safeFetch<{ success: boolean }>("/api/target-grid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  return data ?? { success: false };
}
