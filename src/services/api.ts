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

export async function fetchAllPortfolios(): Promise<Portfolio[]> {
  const data = await safeFetch<Portfolio[]>("/api/portfolios-all");
  return Array.isArray(data) ? data : [];
}

export async function fetchPortfolios(): Promise<Portfolio[]> {
  const data = await safeFetch<Portfolio[]>("/api/portfolios-list");
  return Array.isArray(data) ? data : [];
}

export async function fetchPortfolioDetails(id: number): Promise<Portfolio> {
  const data = await safeFetch<Portfolio>(`/api/portfolio-detail?id=${id}`);
  if (!data) throw new Error(`Failed to load portfolio ${id}`);
  return data;
}

export async function fetchModelGrid(): Promise<ModelGridItem[]> {
  const data = await safeFetch<ModelGridItem[]>("/api/model-grid");
  return Array.isArray(data) ? data : [];
}

export async function fetchManualOverrides(): Promise<ManualOverride[]> {
  const data = await safeFetch<ManualOverride[]>("/api/manual-overrides");
  return Array.isArray(data) ? data : [];
}

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
