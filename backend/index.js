import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const MAX_LOG_CHARS = 50_000;
const UPSTREAM_TIMEOUT_MS = 85_000;

// Verify API key exists
if (!process.env.OPENROUTER_API_KEY) {
  console.error("CRITICAL ERROR: OPENROUTER_API_KEY is missing from .env file");
  process.exit(1);
}

// Open-Weight Model Selection via OpenRouter
const modelName =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
  }),
);

// Explicit 256kb limit to comfortably support 50,000-character raw logs
app.use(express.json({ limit: "256kb" }));

/**
 * Escapes unescaped control characters (like literal newlines or tabs) inside
 * JSON string values without destroying valid structural whitespace outside strings.
 */
function sanitizeJsonStringLiterals(input) {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
        continue;
      }
      if (char === "\\") {
        result += char;
        isEscaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
        result += char;
        continue;
      }
      if (char === "\n") {
        result += "\\n";
        continue;
      }
      if (char === "\r") {
        continue;
      }
      if (char === "\t") {
        result += "\\t";
        continue;
      }
      const code = char.charCodeAt(0);
      if (code >= 0 && code < 0x20) {
        result += " ";
        continue;
      }
      result += char;
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  return result;
}

/**
 * Ensures the returned object strictly satisfies the frontend's isParanormalReport type guard:
 * - threat_level: non-empty string
 * - anomalies: non-empty string[] of non-empty strings
 * - story: non-empty string (2 paragraphs preferred)
 */
function normalizeParanormalReport(rawReport) {
  const report =
    rawReport && typeof rawReport === "object" && !Array.isArray(rawReport)
      ? rawReport
      : {};

  // 1. Normalize threat_level
  const threatLevel =
    typeof report.threat_level === "string" &&
    report.threat_level.trim().length > 0
      ? report.threat_level.trim()
      : "Class 4 Poltergeist in System Memory";

  // 2. Normalize anomalies into strictly non-empty strings
  let anomalies = [];
  if (Array.isArray(report.anomalies)) {
    anomalies = report.anomalies
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }
        if (item && typeof item === "object") {
          // Handle cases where open-weight models return objects inside the array
          const values = Object.values(item)
            .filter((v) => typeof v === "string" || typeof v === "number")
            .map((v) => String(v).trim())
            .filter(Boolean);
          return values.join(" — ");
        }
        return "";
      })
      .filter((str) => str.length > 0);
  } else if (
    typeof report.anomalies === "string" &&
    report.anomalies.trim().length > 0
  ) {
    anomalies = report.anomalies
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  if (anomalies.length === 0) {
    anomalies = [
      "Unexplained spectral interference detected across midnight timestamps.",
    ];
  }

  // 3. Normalize story into a clean string with preserved paragraph breaks
  let story = "";
  if (typeof report.story === "string" && report.story.trim().length > 0) {
    story = report.story.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  } else if (Array.isArray(report.story)) {
    story = report.story
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .map((p) => p.trim())
      .join("\n\n");
  }

  if (!story) {
    story =
      "Something walked through the file system during the dead of night, leaving subtle alterations across your telemetry before vanishing from volatile memory.";
  }

  return {
    threat_level: threatLevel,
    anomalies,
    story,
  };
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    stateless: true,
    model: modelName,
  });
});

// Main Haunting / Paranormal Log Analyzer Endpoint
app.post("/api/haunt", async (req, res) => {
  const { rawLogs } = req.body || {};

  if (typeof rawLogs !== "string" || !rawLogs.trim()) {
    return res.status(400).json({
      error: "System or smart-home logs are required to summon the spirit.",
    });
  }

  const trimmedLogs = rawLogs.trim();
  if (trimmedLogs.length > MAX_LOG_CHARS) {
    return res.status(400).json({
      error: `Logs exceed the maximum limit of ${MAX_LOG_CHARS.toLocaleString()} characters.`,
    });
  }

  // 1. Strict JSON System Prompt for the Paranormal Investigator Persona
  const systemPrompt = `You are a Paranormal Systems Investigator and eerie gothic storyteller.
Read the user's raw server logs, git commit history, or smart-home sensor logs. Weave the exact timestamps, file names, and technical errors into a chilling, atmospheric ghost story about a "Ghost in the Machine" haunting their system while they were asleep.

You MUST return your response in ONLY raw, valid JSON format. Do not include markdown code blocks, backticks, or conversational text outside the JSON.
The JSON must contain exactly three keys with these exact types:
{
  "threat_level": "A spooky classification rating (e.g., 'Class 4 Poltergeist in node_modules', 'Level 5 Silicon Possession')",
  "anomalies": [
    "[Timestamp] Translate a specific log line into a creepy paranormal observation.",
    "[Timestamp] Translate another log line into a sinister machine event.",
    "[Timestamp] Translate a final log line into an eerie warning."
  ],
  "story": "Paragraph 1 weaving the initial timestamps and system events into eerie suspense.\\n\\nParagraph 2 escalating the haunting using the remaining timestamps and technical details."
}`;

  const userPrompt = `RAW SYSTEM / SMART-HOME LOGS:\n${trimmedLogs}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": allowedOrigins[0] || "http://localhost:3000",
          "X-Title": "Phantom Logs",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          top_p: 0.9,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenRouter HTTP ${response.status}:`, errorData);
      return res.status(502).json({
        error: `Upstream model provider returned HTTP ${response.status}. Check your OPENROUTER_API_KEY and model availability.`,
      });
    }

    const data = await response.json();

    // Check for provider-level errors wrapped inside a 200 OK response
    if (data?.error) {
      console.error("OpenRouter Provider Error:", JSON.stringify(data.error));
      return res.status(502).json({
        error:
          data.error?.message ||
          "The model provider encountered an error processing your logs.",
      });
    }

    const messageObj = data?.choices?.[0]?.message;

    // Safely extract content (fallback to reasoning field if a thinking model puts output there)
    const rawContent = messageObj?.content || messageObj?.reasoning || "";

    if (!rawContent || typeof rawContent !== "string") {
      console.error(
        "Empty or null model response. Full payload:",
        JSON.stringify(data, null, 2),
      );
      return res.status(502).json({
        error: "The AI model returned an empty response. Please try again.",
      });
    }

    // 2. Bulletproof 3-Layer JSON Extraction Logic
    let outputText = rawContent
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsedReport = null;

    // Layer 1: Standard JSON.parse
    try {
      parsedReport = JSON.parse(outputText);
    } catch {
      // Layer 2: Boundary Extraction + String-Literal Control Character Sanitization
      try {
        const firstBrace = outputText.indexOf("{");
        const lastBrace = outputText.lastIndexOf("}");

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const candidate = outputText.substring(firstBrace, lastBrace + 1);
          const sanitized = sanitizeJsonStringLiterals(candidate);
          parsedReport = JSON.parse(sanitized);
        } else {
          throw new Error("No JSON object boundaries found.");
        }
      } catch {
        // Layer 3: Aggressive Regex Fallback for Truncated or Malformed Responses
        const threatMatch = outputText.match(
          /"threat_level"\s*:\s*"((?:\\.|[^"\\])*)"/i,
        );
        const anomaliesBlockMatch = outputText.match(
          /"anomalies"\s*:\s*\[([\s\S]*?)\]/i,
        );
        const storyMatch = outputText.match(
          /"story"\s*:\s*"([\s\S]*?)(?:"\s*\}|\s*$)/i,
        );

        let extractedAnomalies = [];
        if (anomaliesBlockMatch && anomaliesBlockMatch[1]) {
          const itemMatches = [
            ...anomaliesBlockMatch[1].matchAll(/"((?:\\.|[^"\\])+)"/g),
          ];
          extractedAnomalies = itemMatches
            .map((m) => m[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim())
            .filter(Boolean);
        }

        let extractedStory = "";
        if (storyMatch && storyMatch[1]) {
          extractedStory = storyMatch[1]
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .trim();
        } else {
          extractedStory = outputText;
        }

        parsedReport = {
          threat_level: threatMatch
            ? threatMatch[1].replace(/\\"/g, '"').trim()
            : "Class 5 Unidentified Daemon",
          anomalies: extractedAnomalies,
          story: extractedStory,
        };
      }
    }

    // 3. Final Schema Normalization (Guarantees frontend validation passes)
    const verifiedReport = normalizeParanormalReport(parsedReport);

    return res.json(verifiedReport);
  } catch (error) {
    if (controller.signal.aborted) {
      return res.status(504).json({
        error: "The paranormal investigation timed out waiting for the model.",
      });
    }
    console.error("Error during OpenRouter API call:", error);
    return res.status(500).json({
      error: "Failed to analyze logs due to a server haunting.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

app.listen(PORT, () => {
  console.log(
    `Phantom Logs Stateless Server running on http://localhost:${PORT}`,
  );
  console.log(`Channeling Open-Weight Model: ${modelName} via OpenRouter`);
});
