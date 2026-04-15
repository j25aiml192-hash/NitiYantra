"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SARVAM_KEY = process.env.NEXT_PUBLIC_SARVAM_API_KEY || "";

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

// ── Speaker config for Sarvam ──
const SARVAM_SPEAKERS: Record<string, string> = {
  lokniti: "arvind",     // male, serious
  lokmitra: "meera",     // female, confident
  verdict: "amol",       // male, authoritative
};

const SECTION_LABELS: Record<string, string> = {
  lokniti: "LokNiti is arguing...",
  lokmitra: "LokMitra is countering...",
  verdict: "Delivering verdict...",
};

// ── FIX 1: Strip markdown before TTS ──
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")   // remove bold
    .replace(/\*(.*?)\*/g, "$1")        // remove italic
    .replace(/#{1,6}\s/g, "")           // remove headers
    .replace(/•\s/g, "")               // remove bullets
    .replace(/^\d+\.\s/gm, "")         // remove numbered lists
    .replace(/\n{2,}/g, ". ")          // double newlines to pause
    .replace(/\n/g, " ")              // single newlines to space
    .trim();
}

// ── FIX 2: Sarvam TTS with Web Speech fallback ──
async function speakWithSarvam(
  text: string,
  speaker: string,
  language: string
): Promise<HTMLAudioElement | null> {
  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) return null;
  if (!SARVAM_KEY) return null; // No key → skip to fallback

  try {
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_KEY,
      },
      body: JSON.stringify({
        inputs: [cleanText],
        target_language_code: language === "hi" ? "hi-IN" : "en-IN",
        speaker: speaker,
        model: "bulbul:v3",
        enable_preprocessing: true,
      }),
    });

    if (!response.ok) throw new Error(`Sarvam returned ${response.status}`);

    const data = await response.json();
    if (!data.audios || !data.audios[0]) throw new Error("No audio in response");

    const audio = new Audio(`data:audio/wav;base64,${data.audios[0]}`);
    return audio;
  } catch (err) {
    console.warn("[TTS] Sarvam failed, falling back to Web Speech:", err);
    return null;
  }
}

function speakWithWebSpeech(
  text: string,
  section: TTSSection,
  onEnd: () => void
) {
  if (typeof window === "undefined") return;
  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) { onEnd(); return; }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.9;
  utterance.pitch = section === "lokniti" ? 0.9 : section === "lokmitra" ? 1.1 : 1.0;
  utterance.lang = "en-IN";

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 1) {
    if (section === "lokniti") utterance.voice = voices[0];
    else if (section === "lokmitra") utterance.voice = voices[1];
  }

  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function DebatePage() {
  const [state, setState] = useState<DebateState>("idle");
  const [topic, setTopic] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [result, setResult] = useState<DebateResult | null>(null);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState<"lokniti" | "lokmitra" | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  // TTS state
  const [ttsSection, setTtsSection] = useState<TTSSection>(null);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsActiveRef = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Load autoplay preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("debate_autoplay");
      if (saved !== null) setAutoPlay(saved === "true");
    }
  }, []);

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

  // ── TTS Engine: Sarvam → Web Speech fallback ──
  const playSection = useCallback(async (
    section: TTSSection,
    debateData: DebateResult,
    language: string,
    onDone: () => void
  ) => {
    if (!section || !debateData) { onDone(); return; }

    let text = "";
    if (section === "lokniti") text = debateData.lokniti.argument;
    else if (section === "lokmitra") text = debateData.lokmitra.argument;
    else if (section === "verdict") text = debateData.verdict || "";

    if (!text) { onDone(); return; }

    setTtsSection(section);
    if (section === "lokniti" || section === "lokmitra") setIsSpeaking(section);

    const speaker = SARVAM_SPEAKERS[section] || "arvind";
    const audio = await speakWithSarvam(text, speaker, language);

    if (audio) {
      // Sarvam succeeded
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(null);
        audioRef.current = null;
        onDone();
      };
      audio.onerror = () => {
        setIsSpeaking(null);
        audioRef.current = null;
        // Fallback to Web Speech on playback error
        speakWithWebSpeech(text, section, () => {
          setIsSpeaking(null);
          onDone();
        });
      };
      audio.play().catch(() => {
        // Autoplay blocked — fallback
        speakWithWebSpeech(text, section, () => {
          setIsSpeaking(null);
          onDone();
        });
      });
    } else {
      // Sarvam failed or no key — fallback to Web Speech
      speakWithWebSpeech(text, section, () => {
        setIsSpeaking(null);
        onDone();
      });
    }
  }, []);

  // Auto-play chain: LokNiti → LokMitra → Verdict
  const startAutoTTS = useCallback((debateData: DebateResult) => {
    ttsActiveRef.current = true;
    setTtsPaused(false);

    const language = "en";

    // Chain: LokNiti → LokMitra → Verdict
    playSection("lokniti", debateData, language, () => {
      if (!ttsActiveRef.current) return;
      playSection("lokmitra", debateData, language, () => {
        if (!ttsActiveRef.current) return;
        playSection("verdict", debateData, language, () => {
          // All done
          setTtsSection(null);
          setIsSpeaking(null);
          ttsActiveRef.current = false;
        });
      });
    });
  }, [playSection]);

  const pauseResumeTTS = () => {
    if (audioRef.current) {
      if (ttsPaused) {
        audioRef.current.play();
        setTtsPaused(false);
      } else {
        audioRef.current.pause();
        setTtsPaused(true);
      }
    } else if (typeof window !== "undefined") {
      // Web Speech fallback pause/resume
      if (ttsPaused) {
        window.speechSynthesis.resume();
        setTtsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setTtsPaused(true);
      }
    }
  };

  const stopTTS = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
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

  // ── Manual TTS (single agent) ──
  const speakArgument = async (text: string, agent: "lokniti" | "lokmitra") => {
    stopTTS();

    setIsSpeaking(agent);
    setTtsSection(agent);

    const speaker = SARVAM_SPEAKERS[agent] || "arvind";
    const audio = await speakWithSarvam(text, speaker, "en");

    if (audio) {
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(null); setTtsSection(null); audioRef.current = null; };
      audio.onerror = () => {
        speakWithWebSpeech(text, agent, () => { setIsSpeaking(null); setTtsSection(null); });
      };
      audio.play().catch(() => {
        speakWithWebSpeech(text, agent, () => { setIsSpeaking(null); setTtsSection(null); });
      });
    } else {
      speakWithWebSpeech(text, agent, () => { setIsSpeaking(null); setTtsSection(null); });
    }
  };

  const stopSpeaking = () => {
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
              Auto-play with Sarvam AI voices
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

          {/* Now speaking label — contextual */}
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 200, textAlign: "center" }}>
            🔊 <span style={{
              color: ttsSection === "lokniti" ? "#ef4444" : ttsSection === "lokmitra" ? "#2563EB" : "#8b5cf6",
            }}>
              {SECTION_LABELS[ttsSection] || "Speaking..."}
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
