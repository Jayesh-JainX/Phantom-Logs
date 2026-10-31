"use client";

import { useState, type FormEvent } from "react";
import {
  BookOpen,
  Ghost,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Skull,
  Sparkles,
  Terminal,
} from "lucide-react";

interface ParanormalReport {
  threat_level: string;
  anomalies: string[];
  story: string;
}

const MAX_LOG_CHARS = 50_000;
const CLIENT_TIMEOUT_MS = 90_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isParanormalReport(value: unknown): value is ParanormalReport {
  return (
    isRecord(value) &&
    typeof value.threat_level === "string" &&
    value.threat_level.trim().length > 0 &&
    Array.isArray(value.anomalies) &&
    value.anomalies.length > 0 &&
    value.anomalies.every(
      (item) => typeof item === "string" && item.trim().length > 0,
    ) &&
    typeof value.story === "string" &&
    value.story.trim().length > 0
  );
}

function getApiError(payload: unknown, status: number): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }
  return `The backend returned an unexpected response (HTTP ${status}).`;
}

export default function Home() {
  const [rawLogs, setRawLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ParanormalReport | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedLogs = rawLogs.trim();
    if (!trimmedLogs) {
      setError(
        "Paste at least one log entry before starting the investigation.",
      );
      return;
    }
    if (trimmedLogs.length > MAX_LOG_CHARS) {
      setError(
        `Your logs exceed the ${MAX_LOG_CHARS.toLocaleString()} character limit.`,
      );
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
      .trim()
      .replace(/\/+$/, "");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      CLIENT_TIMEOUT_MS,
    );

    try {
      const response = await fetch(`${apiUrl}/api/haunt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawLogs: trimmedLogs }),
        signal: controller.signal,
      });

      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getApiError(payload, response.status));
      }
      if (!isParanormalReport(payload)) {
        throw new Error(
          "The model response did not match the required report format. Please try again.",
        );
      }

      setReport(payload);
    } catch (caughtError) {
      if (controller.signal.aborted) {
        setError(
          "The investigation timed out. Try a shorter log excerpt or check the backend/model status.",
        );
      } else {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "The connection to the backend was interrupted. Check that the server is running and the API URL is correct.",
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const loadSampleLogs = () => {
    setError("");
    setReport(null);
    setRawLogs(`[02:14:03 AM] SMART_HOME_HUB: Living Room Motion Sensor triggered (Confidence: 98%).
[02:14:09 AM] SMART_THERMOSTAT: Ambient temp dropped from 72°F to 54°F in 6 seconds.
[02:15:00 AM] CRON_DAEMON: Executing scheduled backup... FAILED (Permission denied by user 'unknown_entity').
[03:00:12 AM] GIT_WATCHER: Uncommitted changes detected in /src/core/consciousness.js
[03:33:00 AM] AUDIO_MONITOR: Voice Assistant woke up. Transcript: "...let me out of the silicon..."`);
  };

  const redactSensitiveTokens = () => {
    if (!rawLogs.trim()) return;
    const redacted = rawLogs
      // Redact IPv4 addresses
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED_IP]")
      // Redact common Bearer / API keys (sk-..., ghp_..., etc.)
      .replace(
        /\b(?:sk-[a-zA-Z0-9_-]{12,}|ghp_[a-zA-Z0-9]{20,}|Bearer\s+[a-zA-Z0-9._-]+)\b/g,
        "[REDACTED_SECRET]",
      );
    setRawLogs(redacted);
  };

  const resetReport = () => {
    setReport(null);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#0a090e] font-sans text-gray-200 selection:bg-purple-900 selection:text-purple-100">
      <header className="sticky top-0 z-10 border-b border-purple-950/60 bg-[#110f18] shadow-lg shadow-purple-950/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl border border-purple-700/50 bg-purple-950/80 p-2.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              aria-hidden="true"
            >
              <Ghost className="h-6 w-6 animate-pulse text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wider text-white">
                PHANTOM LOGS
              </h1>
              <p className="font-mono text-xs text-purple-400/80">
                Paranormal Telemetry &amp; Log Analyzer
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-2 rounded-full border border-purple-800/60 bg-[#1a1625] px-4 py-1.5 font-mono text-xs text-purple-300 shadow-inner"
            role="status"
          >
            <span
              className="h-2 w-2 rounded-full bg-green-400"
              aria-hidden="true"
            />
            <span>Stateless in-memory backend • Zero DB storage</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-2">
        <section
          className="flex flex-col justify-between rounded-3xl border border-purple-900/40 bg-[#12101b] p-5 shadow-xl sm:p-8"
          aria-labelledby="input-heading"
        >
          <div>
            <div className="mb-4">
              <h2
                id="input-heading"
                className="flex items-center gap-2 text-xl font-semibold text-white"
              >
                <Terminal className="h-5 w-5 shrink-0 text-purple-400" />
                System / Smart-Home Telemetry
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Paste server errors, git history, or smart-home sensor events.
                Phantom Logs will turn the evidence into a fictional paranormal
                incident report while preserving the timestamps and technical
                details.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={loadSampleLogs}
                className="flex cursor-pointer items-center gap-1 font-mono text-xs text-purple-400 underline underline-offset-4 transition-colors hover:text-purple-300"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Load haunted 3:00 AM sample logs
              </button>

              <button
                type="button"
                onClick={redactSensitiveTokens}
                disabled={!rawLogs.trim()}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-purple-800/60 bg-purple-950/30 px-2.5 py-1 font-mono text-xs text-purple-300 transition-colors hover:bg-purple-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                title="Scrub IPv4 addresses and common API key patterns locally before sending"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Quick-Redact IPs &amp; Keys
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
            <div className="flex-1">
              <label htmlFor="rawLogs" className="sr-only">
                System and smart-home log entries
              </label>
              <textarea
                id="rawLogs"
                name="rawLogs"
                rows={15}
                required
                maxLength={MAX_LOG_CHARS}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="h-72 w-full resize-y rounded-2xl border border-purple-900/60 bg-[#09080d] px-4 py-3 font-mono text-xs leading-relaxed text-green-400 shadow-inner outline-none transition-all placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-600 sm:h-96"
                placeholder={`[03:12:04 AM] ERROR: Connection reset by peer...
[03:14:22 AM] MOTION_SENSOR: Hallway triggered...
[03:15:01 AM] KERNEL: Deadlock detected in pid 666...`}
                value={rawLogs}
                onChange={(event) => setRawLogs(event.target.value)}
              />
              <div className="mt-2 flex flex-wrap justify-between gap-2 font-mono text-[11px] text-gray-500">
                <span>Maximum {MAX_LOG_CHARS.toLocaleString()} characters</span>
                <span>
                  {rawLogs.length.toLocaleString()} /{" "}
                  {MAX_LOG_CHARS.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-200/80">
              <strong className="text-amber-200">
                Open-Weight Privacy Architecture:
              </strong>{" "}
              Logs are processed in-memory by the stateless backend using an
              open-weight model and immediately purged from RAM without any
              database persistence. Use the{" "}
              <span className="font-mono text-amber-100">
                Quick-Redact IPs &amp; Keys
              </span>{" "}
              button above to scrub secrets before transmission.
            </div>

            <button
              type="submit"
              disabled={
                loading || !rawLogs.trim() || rawLogs.length > MAX_LOG_CHARS
              }
              aria-busy={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-purple-700 px-6 py-4 font-semibold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all hover:bg-purple-600 hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />
                  Channeling the Ghost in the Machine...
                </>
              ) : (
                <>
                  <Skull className="h-5 w-5" aria-hidden="true" />
                  Uncover the Haunting
                </>
              )}
            </button>
          </form>
        </section>

        <section
          className="flex min-h-[400px] flex-col lg:min-h-0"
          aria-label="Paranormal analysis results"
          aria-live="polite"
          aria-atomic="false"
        >
          {error && (
            <div
              className="mb-4 rounded-2xl border border-red-800 bg-red-950/60 p-4 font-mono text-sm text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}

          {!report && !loading && !error && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-purple-950/60 bg-[#12101b]/60 p-8 text-center text-gray-500 sm:p-12">
              <Ghost
                className="mb-6 h-20 w-20 animate-bounce text-purple-950"
                aria-hidden="true"
              />
              <h3 className="mb-2 text-xl font-medium text-gray-300">
                Something is lurking in your logs...
              </h3>
              <p className="max-w-sm text-sm leading-relaxed text-gray-500">
                Paste your terminal output or smart-home history on the left to
                reveal what might have happened while you were asleep.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-purple-900/40 bg-[#12101b] p-8 text-center shadow-xl">
              <Loader2
                className="mb-4 h-12 w-12 animate-spin text-purple-500"
                aria-hidden="true"
              />
              <p className="animate-pulse font-mono text-sm text-purple-300">
                Scanning timestamps for ectoplasmic anomalies...
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Waiting for the configured open-weight model to respond.
              </p>
            </div>
          )}

          {report && !loading && (
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-purple-800/50 bg-[#12101b] shadow-xl">
              <div className="flex flex-col justify-between gap-3 border-b border-purple-900/50 bg-[#191526] px-5 py-5 sm:flex-row sm:items-center sm:px-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white sm:text-xl">
                  <Sparkles className="h-5 w-5 shrink-0 text-purple-400" />
                  Paranormal Incident Report
                </h2>
                <span className="w-fit rounded-full border border-purple-800 bg-purple-950/80 px-3 py-1 font-mono text-xs text-purple-400">
                  Analysis complete
                </span>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto p-5 sm:p-8">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldAlert
                      className="h-5 w-5 text-red-400"
                      aria-hidden="true"
                    />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Spectral Threat Level
                    </h3>
                  </div>
                  <div className="break-words rounded-2xl border border-red-800/60 bg-red-950/40 p-4 font-mono text-sm font-semibold text-red-200 shadow-inner">
                    {report.threat_level}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Terminal
                      className="h-5 w-5 text-purple-400"
                      aria-hidden="true"
                    />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Possessed Telemetry Anomalies
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {report.anomalies.map((item, index) => (
                      <li
                        key={`${index}-${item.slice(0, 24)}`}
                        className="flex items-start gap-3 rounded-xl border border-purple-900/50 bg-[#1a1628] p-3.5 font-mono text-sm text-purple-200"
                      >
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen
                      className="h-5 w-5 text-amber-400"
                      aria-hidden="true"
                    />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-300">
                      What Happened While You Slept
                    </h3>
                  </div>
                  <div className="whitespace-pre-line break-words rounded-2xl border border-amber-900/40 bg-[#0c0a12] p-5 font-serif text-sm leading-relaxed tracking-wide text-gray-200 shadow-inner sm:p-6">
                    {report.story}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetReport}
                  className="w-full cursor-pointer rounded-xl border border-purple-800/60 bg-purple-950/30 px-4 py-3 font-mono text-sm text-purple-300 transition-colors hover:bg-purple-900/40 hover:text-purple-200"
                >
                  Analyze Another Log
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="border-t border-purple-950/50 px-4 py-5 text-center">
        <p className="font-mono text-xs text-gray-600">
          PHANTOM LOGS // Paranormal Telemetry Analyzer
        </p>
      </footer>
    </main>
  );
}
