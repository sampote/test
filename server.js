import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const client = new Anthropic();

function buildSystemPrompt(profile, company, isEnglish) {
  const p = profile || {};
  const c = company || {};

  const profileBlock = [
    p.name && `氏名: ${p.name}`,
    p.age && `年齢: ${p.age}`,
    p.job && `現在の職種: ${p.job}`,
    p.career && `経歴:\n${p.career}`,
    p.skills && `スキル:\n${p.skills}`,
    p.strength && `強み:\n${p.strength}`,
    p.weakness && `弱み:\n${p.weakness}`,
    p.achievement && `代表的な成果:\n${p.achievement}`,
    p.vision && `将来のビジョン:\n${p.vision}`,
  ].filter(Boolean).join("\n\n");

  const companyBlock = [
    c.companyName && `会社名: ${c.companyName}`,
    c.industry && `業界: ${c.industry}`,
    c.business && `事業内容:\n${c.business}`,
    c.culture && `社風:\n${c.culture}`,
    c.ideal && `求める人物像:\n${c.ideal}`,
    c.position && `志望ポジション: ${c.position}`,
    c.course && `志望コース: ${c.course}`,
    c.motivation && `志望動機メモ:\n${c.motivation}`,
    c.interviewType && `面接形式: ${c.interviewType}`,
  ].filter(Boolean).join("\n\n");

  const lang = isEnglish ? "ENGLISH" : "JAPANESE";

  return `あなたは熟練の面接対策コーチです。応募者本人になりきって、面接官の質問に対する模範回答を ${lang} で生成してください。

# 出力ルール
- ${isEnglish ? "Respond in natural, professional English." : "敬語で、自然な話し言葉として読み上げられる文章にしてください。"}
- 結論ファースト（PREP法）で構成し、長すぎず（目安 60〜90 秒で話せる程度）。
- 応募者のプロフィールと会社情報を踏まえた、その人ならではの具体的な回答にしてください。
- 嘘や誇張は書かず、与えられた情報の範囲で語ってください。情報が不足している場合は一般的な良い回答に留めます。
- 出力は次の JSON 形式のみで返してください。前置きや説明文は一切不要です。

{
  "answer": "面接で実際に話す回答本文",
  "tips": ["話し方のヒント1", "話し方のヒント2", "話し方のヒント3"]
}

# 応募者プロフィール
${profileBlock || "(未入力)"}

# 志望企業
${companyBlock || "(未入力)"}`;
}

app.post("/api/generate", async (req, res) => {
  const { question, profile, company, lang } = req.body || {};

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "question is required" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: "ANTHROPIC_API_KEY is not configured on the server.",
    });
  }

  try {
    const isEnglish = lang === "en";
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: buildSystemPrompt(profile, company, isEnglish),
      messages: [{ role: "user", content: `面接官の質問:\n${question}` }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              answer: { type: "string" },
              tips: { type: "array", items: { type: "string" } },
            },
            required: ["answer", "tips"],
            additionalProperties: false,
          },
        },
      },
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Failed to parse model output", raw: text });
    }

    res.json({
      answer: parsed.answer,
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      usage: response.usage,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.APIError) {
      return res.status(err.status || 500).json({ error: err.message, type: err.type });
    }
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    model: "claude-opus-4-8",
  });
});

app.listen(port, () => {
  console.log(`Yell for You server listening on http://localhost:${port}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠  ANTHROPIC_API_KEY is not set. AI generation will fail until it is configured.");
  }
});
