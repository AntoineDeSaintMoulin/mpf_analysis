import { sql } from "@vercel/postgres";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const SECRET = process.env.MARKET_SUMMARY_SECRET ?? "mon_secret_token_123";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { subject, body, date, sender, secret } = req.body;

  if (secret !== SECRET) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Résumé via Claude
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Tu es un analyste financier senior. Résume cet email d'analyse de marché en JSON structuré.

Email:
Sujet: ${subject}
Date: ${date}
Contenu: ${body.substring(0, 8000)}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) de cette structure exacte:
{
  "title": "titre court du rapport",
  "date": "date de l'analyse",
  "source": "nom de la source/expéditeur",
  "sentiment_global": "bullish|neutral|bearish",
  "themes": [
    {
      "region": "US|Europe|APAC|Global",
      "sentiment": "bullish|neutral|bearish",
      "key_points": ["point 1", "point 2", "point 3"]
    }
  ],
  "triggers_semaine": ["trigger 1", "trigger 2"],
  "conclusion": "phrase de conclusion en 2-3 phrases max"
}`
      }]
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const summary = JSON.parse(rawText);

    // Stocker en DB
    await sql`
      CREATE TABLE IF NOT EXISTS market_summaries (
        id SERIAL PRIMARY KEY,
        subject TEXT,
        sender TEXT,
        email_date TIMESTAMP,
        summary JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO market_summaries (subject, sender, email_date, summary)
      VALUES (${subject}, ${sender}, ${date}, ${JSON.stringify(summary)})
    `;

    return res.status(200).json({ ok: true, summary });

  } catch (e: any) {
    console.error("market-summary error:", e);
    return res.status(500).json({ error: e.message });
  }
}
