import { GoogleGenAI } from "@google/genai";
import { Portfolio, ModelGridItem, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzePortfolio(
  portfolio: Portfolio,
  modelGrid: ModelGridItem[]
): Promise<AnalysisResult> {
  const prompt = `
    Analyse ce portefeuille d'investissement par rapport à une grille modèle.
    
    Portefeuille: ${portfolio.name}
    Holdings: ${JSON.stringify(portfolio.holdings)}
    
    Grille Modèle: ${JSON.stringify(modelGrid)}
    
    Instructions:
    1. Compare l'allocation actuelle (par catégorie et région) à la cible de la grille modèle.
    2. Identifie les écarts significatifs.
    3. Fournis un commentaire global professionnel et constructif en français.
    4. Retourne le résultat au format JSON avec la structure suivante:
    {
      "commentary": "Ton commentaire ici",
      "differences": [
        { "category": "Nom", "region": "Nom", "current": 0, "target": 0, "diff": 0 }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { commentary: "Erreur lors de l'analyse IA.", differences: [] };
  }
}
