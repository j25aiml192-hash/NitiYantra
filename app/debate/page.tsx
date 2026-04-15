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
  const [manualTopic, setManualTopic] = useState("");
  const [result, setResult] = useState<DebateResult | null>(null);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState<"lokniti" | "lokmitra" | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  // TTS state
  const [ttsSection, setTtsSection] = useState<TTSSection>(null);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState("");
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
    setIsPlaying(true);
    setCurrentSpeaker(SECTION_LABELS[section] || "Speaking...");
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
    setIsPlaying(true);

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
          setIsPlaying(false);
          setCurrentSpeaker("");
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

  const stopTTS = useCallback(() => {
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
    setIsPlaying(false);
    setCurrentSpeaker("");
  }, []);

  // ── Keyboard shortcuts: Space = pause/resume, Escape = stop ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      // Don't capture when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        pauseResumeTTS();
      } else if (e.code === "Escape") {
        e.preventDefault();
        stopTTS();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, ttsPaused]);

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
      setManualTopic(transcript);
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
    setManualTopic("");
    setResult(null);
    setError("");
    stopSpeaking();
  };

  const getTopicIcon = (t: string) => {
    const lower = t.toLowerCase();
    if (lower.includes("election")) return "🗳️";
    if (lower.includes("ai") || lower.includes("tech")) return "🤖";
    if (lower.includes("law") || lower.includes("justice")) return "⚖️";
    if (lower.includes("money") || lower.includes("economy")) return "💰";
    if (lower.includes("health")) return "🏥";
    if (lower.includes("education")) return "🎓";
    return "💡";
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center py-4 px-6 overflow-hidden bg-[#020617]">
      {/* ─── Premium Background Elements ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: `radial-gradient(#ffffff 0.8px, transparent 0.8px)`, backgroundSize: '32px 32px' }} />
      </div>

      <style>{`
        @keyframes debateFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes debatePulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        @keyframes debateRipple {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.3; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes debateGlow {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(245, 158, 11, 0.4)); }
          50% { filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.7)); }
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 1);
          box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.6);
          position: relative;
          z-index: 10;
        }
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,1), rgba(99,102,241,0.2), rgba(255,255,255,0.8));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .debate-input {
          background: rgba(15, 23, 42, 0.04);
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          color: #0f172a;
        }
        .debate-input:focus {
          background: #fff;
          border-color: #6366F1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
        }
        .premium-btn {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        .premium-btn:active {
          transform: translateY(1px) scale(0.98);
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #e2e8f0;
          transition: .4s;
          border-radius: 34px;
          border: 1px solid rgba(0,0,0,0.05);
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px; width: 16px;
          left: 3px; bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input:checked + .slider { background-color: #10B981; }
        input:checked + .slider:before { transform: translateX(20px); }
      `}</style>

      {/* ─── Header Section ─── */}
      <div className="relative z-10 text-center mb-6 max-w-[600px]">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-500/20 mb-3 relative">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          <div className="absolute inset-0 rounded-full border-2 border-indigo-400 opacity-20 animate-ping" />
        </div>
        <h1 className="text-[28px] font-black text-white tracking-tight leading-none mb-2">
          Policy Debate Arena
        </h1>
        <div className="h-[2px] w-10 bg-gradient-to-r from-amber-400 to-orange-500 mx-auto rounded-full mb-3" />
        <p className="text-[13px] font-medium text-indigo-100/60 tracking-wide max-w-[400px] mx-auto italic">
          Powering democratic discourse with advanced multi-agent intelligence
        </p>
      </div>

      {/* ─── Main Container: Glass Modal ─── */}
      {state !== "debating" && (
        <div className="glass-card w-full max-w-[660px] rounded-[32px] p-8 flex flex-col items-center">
          
          {/* Manual Input Group */}
          <div className="w-full flex items-center gap-3 mb-6">
            <div className="relative flex-1 group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </span>
              <input
                type="text"
                value={manualTopic}
                onChange={e => setManualTopic(e.target.value)}
                placeholder="Describe a policy or controversial topic..."
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="debate-input w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200/50 font-medium placeholder:text-slate-400 placeholder:font-normal outline-none text-sm"
                disabled={state === "processing"}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={state === "processing" || manualTopic.trim().length < 5}
              className="premium-btn px-6 py-3.5 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              <span>{state === "processing" ? "Analyzing..." : "Debate"}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </button>
          </div>

          {/* Centerpiece: Animated Voice Button */}
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all" />
            
            {/* Visual sound waves */}
            {state === "listening" && (
              <>
                <div className="absolute inset-[-10px] border-2 border-indigo-400/30 rounded-full animate-[debateRipple_2s_infinite]" />
                <div className="absolute inset-[-20px] border-2 border-indigo-300/20 rounded-full animate-[debateRipple_2s_infinite_1s]" />
              </>
            )}

            <button
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onMouseLeave={stopListening}
              disabled={state === "processing"}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
                state === "listening" 
                  ? "bg-gradient-to-br from-rose-500 to-rose-700 animate-[debatePulse_1.5s_infinite]" 
                  : "bg-gradient-to-br from-indigo-500 to-indigo-700 hover:scale-105 active:scale-95"
              }`}
            >
              <div className="absolute inset-1 rounded-full border border-white/20" />
              <span className="text-2xl filter drop-shadow-md">
                {state === "listening" ? "⏹" : "🎙️"}
              </span>
            </button>
            <div className={`mt-3 text-center text-[11px] font-bold tracking-widest uppercase transition-colors duration-300 ${state === 'listening' ? 'text-rose-500' : 'text-slate-400'}`}>
              {state === "listening" ? "Recording..." :
               state === "processing" ? "Analyzing..." :
               "Hold to Speak"}
            </div>
          </div>

          {/* Autoplay Toggle Segment */}
          <div className="flex items-center gap-4 py-2.5 px-5 rounded-2xl bg-slate-50/50 border border-slate-200/50 mb-8 transition-all hover:bg-white/80">
            <span className="text-[11px] font-bold text-slate-600 tracking-tight">Auto-vocalize debate arguments</span>
            <label className="switch">
              <input type="checkbox" checked={autoPlay} onChange={toggleAutoPlay} />
              <span className="slider"></span>
            </label>
            <span className={`text-[11px] font-black uppercase ${autoPlay ? 'text-emerald-500' : 'text-slate-400'}`}>
              {autoPlay ? "Active" : "Off"}
            </span>
          </div>

          {/* Suggested Contextual Topics */}
          {suggestedTopics.length > 0 && state === "idle" && (
            <div className="w-full text-center">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center justify-center gap-3">
                <span className="w-8 h-[1px] bg-slate-100" />
                Intelligence Starters
                <span className="w-8 h-[1px] bg-slate-100" />
              </div>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {suggestedTopics.slice(0, 5).map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setManualTopic(t); generateDebate(t); }}
                    className="group px-5 py-2.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm hover:border-indigo-400 hover:bg-white hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
                  >
                    <span className="text-sm scale-90 group-hover:scale-110 transition-transform">
                      {getTopicIcon(t)}
                    </span>
                    <span className="text-[12px] font-bold text-slate-700 tracking-tight">
                      {t.length > 40 ? t.substring(0, 37) + "..." : t}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="relative z-10 mt-6 px-6 py-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-[13px] font-bold shadow-xl shadow-rose-900/5 animate-bounce">
          ⚠️ {error}
        </div>
      )}

      {/* Debate Arena (Result View) */}
      {result && state === "debating" && (
        <div className="w-full max-w-[1240px] px-4 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
          {/* AI Banner */}
          <div className="glass-card rounded-[24px] p-8 border-white/5 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <svg className="w-24 h-24 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 mb-3">Intelligence Objective</div>
            <h2 className="text-[26px] font-black text-white tracking-tighter mb-4 leading-tight">
              &quot;{result.topic}&quot;
            </h2>
            <div className="flex items-center justify-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/5 text-indigo-100 text-xs font-bold ring-1 ring-white/10">
                Source: {result.source}
              </span>
              {result.ai_provider && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold ring-1 ring-emerald-500/30 animate-pulse">
                  AI: {result.ai_provider}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0 items-stretch h-full">
            {/* LokNiti (Opposition) */}
            <div className={`glass-card rounded-3xl p-8 border-white/5 transition-all duration-500 ${ttsSection === "lokniti" ? 'scale-[1.02] border-rose-500/40 ring-4 ring-rose-500/10 bg-white/5' : ''}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 shadow-xl shadow-rose-500/20 flex items-center justify-center text-2xl filter contrast-[1.1]">
                    ❓
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white leading-tight">{result.lokniti.agent}</h3>
                    <p className="text-[11px] font-bold text-indigo-100/40 uppercase tracking-widest">{result.lokniti.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => isSpeaking === "lokniti" ? stopSpeaking() : speakArgument(result.lokniti.argument, "lokniti")}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isSpeaking === 'lokniti' ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/5 text-rose-500 hover:bg-rose-600 hover:text-white'}`}
                >
                  {isSpeaking === "lokniti" ? "⏹" : "🔊"}
                </button>
              </div>
              <p className="text-[15px] leading-[1.8] text-indigo-100/80 font-medium tracking-tight whitespace-pre-line mb-8">
                {result.lokniti.argument}
              </p>
              {result.lokniti.key_points.length > 0 && (
                <div className="space-y-3 p-5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <div className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Crucial Objections</div>
                  {result.lokniti.key_points.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 text-[13px] font-bold text-indigo-100/70 italic">
                      <span className="text-rose-400 mt-1">◈</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VS CENTER */}
            <div className="flex items-center justify-center px-6 relative">
              <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-[13px] font-black text-white shadow-2xl relative z-10 border-4 border-[#020617]">
                VS
              </div>
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/10 translate-x-[-50%]" />
            </div>

            {/* LokMitra (Proposition) */}
            <div className={`glass-card rounded-3xl p-8 border-white/5 transition-all duration-500 ${ttsSection === "lokmitra" ? 'scale-[1.02] border-indigo-500/40 ring-4 ring-indigo-500/10 bg-white/5' : ''}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-500/20 flex items-center justify-center text-2xl filter contrast-[1.1]">
                    ⚖️
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white leading-tight">{result.lokmitra.agent}</h3>
                    <p className="text-[11px] font-bold text-indigo-100/40 uppercase tracking-widest">{result.lokmitra.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => isSpeaking === "lokmitra" ? stopSpeaking() : speakArgument(result.lokmitra.argument, "lokmitra")}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isSpeaking === 'lokmitra' ? 'bg-indigo-500 text-white animate-pulse' : 'bg-white/5 text-indigo-500 hover:bg-indigo-600 hover:text-white'}`}
                >
                  {isSpeaking === "lokmitra" ? "⏹" : "🔊"}
                </button>
              </div>
              <p className="text-[15px] leading-[1.8] text-indigo-100/80 font-medium tracking-tight whitespace-pre-line mb-8">
                {result.lokmitra.argument}
              </p>
              {result.lokmitra.key_points.length > 0 && (
                <div className="space-y-3 p-5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Defense Pillars</div>
                  {result.lokmitra.key_points.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 text-[13px] font-bold text-indigo-100/70 italic">
                      <span className="text-indigo-400 mt-1">◈</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* References & Links */}
          {result.key_constitutional_articles && result.key_constitutional_articles.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap pb-4">
              <span className="text-[10px] font-black text-indigo-100/30 uppercase tracking-widest mr-2">Constitutional Base:</span>
              {result.key_constitutional_articles.map((a, i) => (
                <div key={i} className="px-4 py-1.5 rounded-full bg-white/5 text-amber-400 text-[11px] font-black shadow-sm ring-1 ring-white/10 border border-white/5 hover:bg-white/10 transition-all cursor-default text-shadow-glow">
                  {a}
                </div>
              ))}
            </div>
          )}

          {/* Verdict Segment */}
          {result.verdict && (
            <div className={`glass-card rounded-3xl p-10 text-center border-white/5 transition-all duration-500 max-w-[900px] mx-auto ${ttsSection === 'verdict' ? 'ring-8 ring-amber-500/10 border-amber-500/50 scale-[1.01]' : ''}`}>
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 text-amber-400 font-black uppercase text-[11px] tracking-[0.15em] mb-6 shadow-sm border border-white/5 animate-[debateGlow_3s_infinite]">
                ⚖️ AI Verdict
              </div>
              <p className="text-[17px] font-bold italic text-indigo-50 font-serif leading-relaxed max-w-[700px] mx-auto tracking-tight">
                &quot;{result.verdict}&quot;
              </p>
            </div>
          )}

          <div className="flex items-center justify-center pt-8 pb-12">
            <button
              onClick={handleReset}
              className="premium-btn px-10 py-4 rounded-2xl bg-white text-slate-900 font-black text-[13px] uppercase tracking-widest shadow-2xl hover:bg-indigo-100"
            >
              🔄 Initialize New Arena
            </button>
          </div>
        </div>
      )}

      {/* ─── Persistent Voice Status Bar ─── */}
      {isPlaying && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 rounded-[24px] bg-[#0F172A]/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 flex items-center gap-10 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-2">
            {(["lokniti", "lokmitra", "verdict"] as TTSSection[]).map((s) => (
              <div key={s!} className={`h-2.5 rounded-full transition-all duration-500 ${s === ttsSection ? 'w-10 ' + (s === 'lokniti' ? 'bg-rose-500' : s === 'lokmitra' ? 'bg-indigo-500' : 'bg-amber-500') : 'w-2.5 bg-white/10'}`} />
            ))}
          </div>

          <div className="flex items-center gap-4 min-w-[200px]">
            <div className={`w-3 h-3 rounded-full animate-pulse ${ttsSection === 'lokniti' ? 'bg-rose-500' : ttsSection === 'lokmitra' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
            <div className="text-sm font-black text-white tracking-tight leading-none uppercase">
              {currentSpeaker?.split(" ")[0]} <span className="text-indigo-100/40 font-bold ml-1">is speaking</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-white/10 pl-8">
            <button onClick={pauseResumeTTS} className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center text-lg shadow-sm text-white">
              {ttsPaused ? "▶️" : "⏸"}
            </button>
            <button onClick={stopTTS} className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center text-lg shadow-sm">
              ⏹
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
