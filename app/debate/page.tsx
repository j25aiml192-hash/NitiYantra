"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DebateAgent {
  agent: string;
  role: string;
  argument: string;
  key_points: string[];
}

interface DebateResult {
  topic: string;
  lokniti: DebateAgent;
  lokmitra: DebateAgent;
  verdict: string | null;
  key_constitutional_articles?: string[];
  source: string;
  ai_provider?: string;
}

type DebateState = "idle" | "listening" | "processing" | "debating";
type TTSSection = "lokniti" | "lokmitra" | "verdict" | null;

export default function DebatePage() {
  const [state, setState] = useState<DebateState>("idle");
  const [topic, setTopic] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [result, setResult] = useState<DebateResult | null>(null);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState<"lokniti" | "lokmitra" | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  // TTS auto-play state
  const [ttsSection, setTtsSection] = useState<TTSSection>(null);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const ttsQueueRef = useRef<TTSSection[]>([]);
  const ttsActiveRef = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Load autoplay preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("debate_autoplay");
      if (saved !== null) setAutoPlay(saved === "true");
    }
  }, []);

  // Save autoplay preference
  const toggleAutoPlay = () => {
    const next = !autoPlay;
    setAutoPlay(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("debate_autoplay", String(next));
    }
  };

  // Fetch suggested topics
  useEffect(() => {
    fetch(`${API}/debate/topics`)
      .then(r => r.json())
      .then(data => setSuggestedTopics(data.topics || []))
      .catch(() => {});
  }, []);

  // ── TTS Auto-Play Engine ──
  const speakSection = useCallback((section: TTSSection, debateData: DebateResult, lang: string) => {
    if (typeof window === "undefined" || !section || !debateData) return;
    window.speechSynthesis.cancel();

    let text = "";
    if (section === "lokniti") text = debateData.lokniti.argument;
    else if (section === "lokmitra") text = debateData.lokmitra.argument;
    else if (section === "verdict") text = debateData.verdict || "";

    if (!text) {
      // Skip empty section, move to next
      processNextTTS();
      return;
    }

    const isHindi = lang === "hi";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = isHindi ? 0.85 : 0.9;
    utterance.pitch = section === "lokniti" ? 0.9 : section === "lokmitra" ? 1.1 : 1.0;
    utterance.lang = isHindi ? "hi-IN" : "en-IN";

    // Try to use different voices
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 1) {
      if (section === "lokniti") utterance.voice = voices[0];
      else if (section === "lokmitra") utterance.voice = voices[1];
    }

    utterance.onstart = () => {
      setTtsSection(section);
      if (section === "lokniti" || section === "lokmitra") {
        setIsSpeaking(section);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(null);
      processNextTTS();
    };

    utterance.onerror = () => {
      setIsSpeaking(null);
      processNextTTS();
    };

    window.speechSynthesis.speak(utterance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processNextTTS = useCallback(() => {
    const next = ttsQueueRef.current.shift();
    if (next) {
      setTtsSection(next);
    } else {
      // Queue finished
      setTtsSection(null);
      setIsSpeaking(null);
      ttsActiveRef.current = false;
    }
  }, []);

  // React to ttsSection changes — speak current section
  useEffect(() => {
    if (ttsSection && result && ttsActiveRef.current) {
      // detect language from topic (simple heuristic)
      const lang = manualTopic ? "en" : "en";
      speakSection(ttsSection, result, lang);
    }
  }, [ttsSection, result, manualTopic, speakSection]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const startAutoTTS = useCallback((_debateData: DebateResult) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();

    ttsQueueRef.current = ["lokmitra", "verdict"]; // lokniti plays first, rest queued
    ttsActiveRef.current = true;
    setTtsPaused(false);
    setTtsSection("lokniti");
  }, []);

  const pauseResumeTTS = () => {
    if (typeof window === "undefined") return;
    if (ttsPaused) {
      window.speechSynthesis.resume();
      setTtsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setTtsPaused(true);
    }
  };

  const stopTTS = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    ttsQueueRef.current = [];
    ttsActiveRef.current = false;
    setTtsSection(null);
    setIsSpeaking(null);
    setTtsPaused(false);
  };

  // ── Speech Recognition ──
  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech Recognition not supported in this browser. Type your topic instead.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTopic(transcript);
      setState("processing");
      generateDebate(transcript);
    };

    recognition.onerror = () => {
      setState("idle");
      setError("Could not recognize speech. Try again or type your topic.");
    };

    recognition.onend = () => {
      if (state === "listening") {
        setState("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");
    setError("");
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setState("idle");
  };

  // ── Generate Debate ──
  const generateDebate = async (topicText: string) => {
    setState("processing");
    setError("");
    try {
      const res = await fetch(`${API}/debate/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicText, language: "en" }),
      });
      if (!res.ok) throw new Error("Failed to generate debate");
      const data = await res.json();
      setResult(data);
      setState("debating");

      // Auto-play TTS if enabled
      if (autoPlay) {
        // Small delay to let UI render first
        setTimeout(() => startAutoTTS(data), 800);
      }
    } catch {
      setError("Failed to generate debate. Check backend connection.");
      setState("idle");
    }
  };

  const handleSubmit = () => {
    if (manualTopic.trim().length < 5) {
      setError("Topic must be at least 5 characters");
      return;
    }
    setTopic(manualTopic.trim());
    generateDebate(manualTopic.trim());
  };

  // ── Manual Text-to-Speech ──
  const speakArgument = (text: string, agent: "lokniti" | "lokmitra") => {
    if (typeof window === "undefined") return;
    stopTTS(); // Stop any auto-play first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = agent === "lokniti" ? 0.9 : 1.1;
    utterance.lang = "en-IN";

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 1) {
      utterance.voice = agent === "lokniti" ? voices[0] : voices[1];
    }

    utterance.onstart = () => setIsSpeaking(agent);
    utterance.onend = () => setIsSpeaking(null);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(null);
    stopTTS();
  };

  const handleReset = () => {
    setState("idle");
    setTopic("");
    setManualTopic("");
    setResult(null);
    setError("");
    stopSpeaking();
  };

  const sectionLabel = (s: TTSSection) => {
    if (s === "lokniti") return "LokNiti";
    if (s === "lokmitra") return "LokMitra";
    if (s === "verdict") return "Verdict";
    return "";
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto", paddingBottom: ttsSection ? 80 : 24 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", margin: 0 }}>
          🎙️ Policy Debate Arena
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>
          AI-powered multi-agent policy debate — speak or type a topic
        </p>
      </div>

      {/* Topic Input Area */}
      {state !== "debating" && (
        <div style={{
          background: "var(--card)", borderRadius: 20, border: "1px solid var(--border)",
          padding: 32, textAlign: "center", marginBottom: 24, maxWidth: 600, margin: "0 auto 24px",
        }}>
          {/* Manual Input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              value={manualTopic}
              onChange={e => setManualTopic(e.target.value)}
              placeholder="Type a debate topic..."
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--bg)",
                color: "var(--text)", fontSize: 14, outline: "none",
              }}
              disabled={state === "processing"}
            />
            <button
              onClick={handleSubmit}
              disabled={state === "processing" || manualTopic.trim().length < 5}
              style={{
                padding: "12px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                opacity: state === "processing" ? 0.7 : 1,
              }}
            >
              Debate!
            </button>
          </div>

          {/* Auto-play toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={toggleAutoPlay}
                style={{ accentColor: "#2563EB", width: 14, height: 14, cursor: "pointer" }}
              />
              Auto-play after generation
            </label>
          </div>

          {/* Voice Button */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>— or —</span>
          </div>
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onMouseLeave={stopListening}
            disabled={state === "processing"}
            style={{
              width: 80, height: 80, borderRadius: "50%", border: "none",
              background: state === "listening"
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #2563EB, #1D4ED8)",
              color: "#fff", fontSize: 28, cursor: "pointer",
              boxShadow: state === "listening"
                ? "0 0 0 8px rgba(239,68,68,0.2), 0 0 0 16px rgba(239,68,68,0.1)"
                : "0 4px 20px rgba(99,102,241,0.3)",
              transition: "all 0.2s ease",
            }}
          >
            🎤
          </button>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            {state === "listening" ? "🔴 Listening... release to stop" :
             state === "processing" ? "⏳ Generating debate..." :
             "Hold to speak your topic"}
          </div>

          {/* Detected topic */}
          {topic && (
            <div style={{
              marginTop: 16, padding: "8px 16px", borderRadius: 8,
              background: "rgba(16,185,129,0.1)", color: "#10b981",
              fontSize: 13, fontWeight: 600,
            }}>
              🎯 Topic: &quot;{topic}&quot;
            </div>
          )}

          {/* Suggested Topics */}
          {suggestedTopics.length > 0 && state === "idle" && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Suggested Topics
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {suggestedTopics.slice(0, 5).map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setManualTopic(t); setTopic(t); generateDebate(t); }}
                    style={{
                      padding: "5px 12px", borderRadius: 8, fontSize: 11,
                      border: "1px solid var(--border)", background: "var(--bg)",
                      color: "var(--text-secondary)", cursor: "pointer",
                    }}
                  >
                    {t.length > 50 ? t.substring(0, 47) + "..." : t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.1)",
          color: "#ef4444", fontSize: 13, textAlign: "center", marginBottom: 16,
          maxWidth: 600, margin: "0 auto 16px",
        }}>
          {error}
        </div>
      )}

      {/* Debate Arena */}
      {result && state === "debating" && (
        <>
          {/* Topic Banner */}
          <div style={{
            textAlign: "center", marginBottom: 24,
            padding: "12px 24px", borderRadius: 12,
            background: "linear-gradient(135deg, #2563EB22, #8b5cf622)",
            border: "1px solid #2563EB30",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Debate Topic
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>
              &quot;{result.topic}&quot;
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                Source: {result.source}
              </span>
              {result.ai_provider && (
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 600 }}>
                  {result.ai_provider}
                </span>
              )}
            </div>
          </div>

          {/* Two Agent Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, alignItems: "stretch" }}>
            {/* LokNiti */}
            <div style={{
              background: "linear-gradient(135deg, #ef444412, #ef444406)",
              borderRadius: 16, border: `1px solid ${ttsSection === "lokniti" ? "#ef4444" : "#ef444425"}`, padding: 24,
              transition: "border-color 0.3s ease",
              boxShadow: ttsSection === "lokniti" ? "0 0 20px rgba(239,68,68,0.15)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}>
                  ❓
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>{result.lokniti.agent}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{result.lokniti.role}</div>
                </div>
                <button
                  onClick={() => isSpeaking === "lokniti" ? stopSpeaking() : speakArgument(result.lokniti.argument, "lokniti")}
                  style={{
                    marginLeft: "auto", padding: "6px 12px", borderRadius: 8,
                    border: "1px solid #ef444440", background: isSpeaking === "lokniti" ? "#ef444420" : "transparent",
                    color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {isSpeaking === "lokniti" ? "⏹ Stop" : "🔊 Listen"}
                </button>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
                {result.lokniti.argument}
              </p>
              {result.lokniti.key_points.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", marginBottom: 6, textTransform: "uppercase" }}>
                    Key Points
                  </div>
                  {result.lokniti.key_points.map((p, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-muted)", padding: "3px 0" }}>
                      • {p}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 16px",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "linear-gradient(135deg, #2563EB, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 900, color: "#fff",
                boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
              }}>
                VS
              </div>
            </div>

            {/* LokMitra */}
            <div style={{
              background: "linear-gradient(135deg, #2563EB12, #2563EB06)",
              borderRadius: 16, border: `1px solid ${ttsSection === "lokmitra" ? "#2563EB" : "#2563EB25"}`, padding: 24,
              transition: "border-color 0.3s ease",
              boxShadow: ttsSection === "lokmitra" ? "0 0 20px rgba(37,99,235,0.15)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20,
                }}>
                  ⚖️
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#2563EB" }}>{result.lokmitra.agent}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{result.lokmitra.role}</div>
                </div>
                <button
                  onClick={() => isSpeaking === "lokmitra" ? stopSpeaking() : speakArgument(result.lokmitra.argument, "lokmitra")}
                  style={{
                    marginLeft: "auto", padding: "6px 12px", borderRadius: 8,
                    border: "1px solid #2563EB40", background: isSpeaking === "lokmitra" ? "#2563EB20" : "transparent",
                    color: "#2563EB", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {isSpeaking === "lokmitra" ? "⏹ Stop" : "🔊 Listen"}
                </button>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
                {result.lokmitra.argument}
              </p>
              {result.lokmitra.key_points.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", marginBottom: 6, textTransform: "uppercase" }}>
                    Key Points
                  </div>
                  {result.lokmitra.key_points.map((p, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-muted)", padding: "3px 0" }}>
                      • {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Constitutional Articles */}
          {result.key_constitutional_articles && result.key_constitutional_articles.length > 0 && (
            <div style={{
              marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Referenced:
              </span>
              {result.key_constitutional_articles.map((a, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 6,
                  background: "rgba(139,92,246,0.1)", color: "#8b5cf6", fontWeight: 600,
                }}>
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Verdict */}
          {result.verdict && (
            <div style={{
              marginTop: 24, padding: 20, borderRadius: 14,
              background: "linear-gradient(135deg, #8b5cf622, #2563EB12)",
              border: `1px solid ${ttsSection === "verdict" ? "#8b5cf6" : "#8b5cf630"}`, textAlign: "center",
              transition: "border-color 0.3s ease",
              boxShadow: ttsSection === "verdict" ? "0 0 20px rgba(139,92,246,0.15)" : "none",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                ⚖️ Moderator&apos;s Verdict
              </span>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6 }}>
                {result.verdict}
              </p>
            </div>
          )}

          {/* New Debate Button */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={handleReset}
              style={{
                padding: "12px 32px", borderRadius: 12,
                background: "var(--card)", color: "var(--text)",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                border: "1px solid var(--border)",
              }}
            >
              🔄 New Debate
            </button>
          </div>
        </>
      )}

      {/* ── Floating TTS Control Bar ── */}
      {ttsSection && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "var(--card)", borderTop: "1px solid var(--border)",
          padding: "10px 24px", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
          backdropFilter: "blur(12px)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
        }}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {(["lokniti", "lokmitra", "verdict"] as TTSSection[]).map((s) => (
              <div key={s!} style={{
                width: s === ttsSection ? 24 : 8, height: 8, borderRadius: 4,
                background: s === ttsSection
                  ? (s === "lokniti" ? "#ef4444" : s === "lokmitra" ? "#2563EB" : "#8b5cf6")
                  : "var(--border)",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>

          {/* Now speaking label */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 140, textAlign: "center" }}>
            🔊 Now: <span style={{
              color: ttsSection === "lokniti" ? "#ef4444" : ttsSection === "lokmitra" ? "#2563EB" : "#8b5cf6",
            }}>
              {sectionLabel(ttsSection)}
            </span>
          </div>

          {/* Pause/Resume */}
          <button
            onClick={pauseResumeTTS}
            style={{
              padding: "6px 16px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--bg)", color: "var(--text)", fontSize: 12,
              fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {ttsPaused ? "▶️ Resume" : "⏸️ Pause"}
          </button>

          {/* Stop */}
          <button
            onClick={stopTTS}
            style={{
              padding: "6px 16px", borderRadius: 8, border: "1px solid #ef444440",
              background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 12,
              fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            ⏹️ Stop
          </button>
        </div>
      )}
    </div>
  );
}
