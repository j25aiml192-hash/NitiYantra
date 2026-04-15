"use client";

import { useState, useRef, useEffect } from "react";

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
  source: string;
}

type DebateState = "idle" | "listening" | "processing" | "debating";

export default function DebatePage() {
  const [state, setState] = useState<DebateState>("idle");
  const [topic, setTopic] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [result, setResult] = useState<DebateResult | null>(null);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState<"lokniti" | "lokmitra" | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Fetch suggested topics
  useEffect(() => {
    fetch(`${API}/debate/topics`)
      .then(r => r.json())
      .then(data => setSuggestedTopics(data.topics || []))
      .catch(() => {});
  }, []);

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

  // ── Text-to-Speech ──
  const speakArgument = (text: string, agent: "lokniti" | "lokmitra") => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = agent === "lokniti" ? 0.9 : 1.1;
    utterance.lang = "en-IN";

    // Try to pick different voices
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
  };

  const handleReset = () => {
    setState("idle");
    setTopic("");
    setManualTopic("");
    setResult(null);
    setError("");
    stopSpeaking();
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", margin: 0 }}>
          🎙️ Spotlight Debate Arena
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
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              Source: {result.source}
            </span>
          </div>

          {/* Two Agent Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0, alignItems: "stretch" }}>
            {/* LokNiti */}
            <div style={{
              background: "linear-gradient(135deg, #ef444412, #ef444406)",
              borderRadius: 16, border: "1px solid #ef444425", padding: 24,
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
              borderRadius: 16, border: "1px solid #2563EB25", padding: 24,
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

          {/* Verdict */}
          {result.verdict && (
            <div style={{
              marginTop: 24, padding: 20, borderRadius: 14,
              background: "linear-gradient(135deg, #8b5cf622, #2563EB12)",
              border: "1px solid #8b5cf630", textAlign: "center",
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
    </div>
  );
}
