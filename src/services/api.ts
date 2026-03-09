import { Portfolio, ModelGridItem, ManualOverride } from "../types";

export async function fetchAllPortfolios(): Promise<Portfolio[]> {
  const res = await fetch("/api/portfolios-all");
  return res.json();
}

export async function fetchPortfolios(): Promise<Portfolio[]> {
  const res = await fetch("/api/portfolios");
  return res.json();
}

export async function fetchPortfolioDetails(id: number): Promise<Portfolio> {
  const res = await fetch(`/api/portfolio-detail?id=${id}`);
  return res.json();
}

export async function fetchModelGrid(): Promise<ModelGridItem[]> {
  const res = await fetch("/api/model-grid");
  return res.json();
}

export async function fetchManualOverrides(): Promise<ManualOverride[]> {
  const res = await fetch("/api/manual-overrides");
  return res.json();
}

export async function saveManualOverride(override: Partial<ManualOverride>): Promise<{ success: boolean }> {
  const res = await fetch("/api/manual-overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(override),
  });
  return res.json();
}

export async function deleteManualOverride(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`/api/manual-overrides-delete?id=${id}`, {
    method: "DELETE",
  });
  return res.json();
}
