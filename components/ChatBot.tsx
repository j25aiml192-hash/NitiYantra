"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { 
  PaperPlaneRight, 
  X, 
  ChatTeardropDots, 
  Robot, 
  Lightning,
  ChartBar,
  Buildings,
  WarningCircle,
  Question,
  Scales
} from "@phosphor-icons/react"

interface Message {
  role: "user" | "model"
  parts: [{ text: string }]
  timestamp: Date
}

interface PlatformData {
  totalComplaints: number
  activeIssues: number
  delayedIssues: number
  resolvedToday: number
  byCategory: Record<string, number>
  byDepartment: Record<string, number>
}

const API = process.env.NEXT_PUBLIC_API_URL ||
            "https://nityantra-backend.onrender.com"

/* ─── Rule-based fallback engine ─── */
function localResponse(input: string, data: PlatformData): string {
  const q = input.toLowerCase()

  if (q.match(/^(hi|hello|hey|namaste)/))
    return `Namaste! I'm NitiYantra AI — your governance intelligence assistant. We're tracking ${data.totalComplaints} complaints across 5 districts. How can I help?`

  if (q.includes("delay") || q.includes("sla") || q.includes("breach") || q.includes("overdue"))
    return `There are currently ${data.delayedIssues} issues that have breached SLA thresholds. Visit the SLA Breaches page for the full list. Critical issues (15+ days open) need immediate escalation.`

  if (q.includes("total") || q.includes("summary") || q.includes("overview") || q.includes("how many"))
    return `Platform Summary:\n• Total Complaints: ${data.totalComplaints}\n• Active Issues: ${data.activeIssues}\n• SLA Breaches: ${data.delayedIssues}\n• Resolved Today: ${data.resolvedToday}\n\nVisit the Command Center for detailed analytics.`

  if (q.includes("pwd") || q.includes("road"))
    return `PWD (Public Works Department) handles roads, potholes, flyovers. They have ${data.byDepartment?.["PWD"] || "several"} complaint(s). Check Department Directory for full metrics.`

  if (q.includes("jal") || q.includes("water"))
    return `Jal Board manages water supply, pipelines, and drainage. ${data.byDepartment?.["Jal Board"] || "Several"} complaint(s) active. Water issues typically have a 5-day SLA.`

  if (q.includes("desu") || q.includes("electric") || q.includes("power") || q.includes("bijli"))
    return `DESU handles electricity — outages, transformers, streetlights. Currently tracking ${data.byDepartment?.["DESU"] || "several"} complaint(s).`

  if (q.includes("mcd") || q.includes("garbage") || q.includes("sanitation"))
    return `MCD manages sanitation — garbage collection, drain cleaning, public toilets. ${data.byDepartment?.["MCD"] || "Several"} complaint(s) in the system.`

  if (q.includes("police") || q.includes("safety") || q.includes("crime"))
    return `Delhi Police handles public safety — crime, traffic, harassment. ${data.byDepartment?.["Delhi Police"] || "Several"} complaint(s) active.`

  if (q.includes("department"))
    return `NitiYantra monitors 5 departments:\n• PWD — Roads & Infrastructure\n• Jal Board — Water Supply\n• DESU — Electricity\n• MCD — Sanitation\n• Delhi Police — Public Safety\n\nVisit Performance Metrics for comparison.`

  if (q.includes("category") || q.includes("type"))
    return `Complaints are AI-classified into: Roads, Water Supply, Electricity, Sanitation, and Public Safety. Our keyword engine classifies with 85-91% confidence.`

  if (q.includes("ai") || q.includes("classify") || q.includes("how does") || q.includes("how do you") || q.includes("work"))
    return `NitiYantra uses a 3-stage AI pipeline:\n1. Text Classification — categorizes complaints into 5 departments\n2. Pattern Analysis — groups similar complaints to detect trends\n3. SLA Detection — flags issues open beyond 7-day threshold\n\nTry it on the AI Classifier page!`

  if (q.includes("map") || q.includes("heatmap") || q.includes("geographic"))
    return `The Geographic Monitor shows an interactive India map with district drill-down. Districts are color-coded: 🔴 Critical, 🟡 Warning, 🟢 Normal. Click any state to see district boundaries.`

  if (q.includes("meeting") || q.includes("decision") || q.includes("extract"))
    return `The Decision Extractor lets you paste meeting transcripts and our AI extracts action items, deadlines, and responsible departments automatically.`

  if (q.includes("file") || q.includes("submit") || q.includes("lodge") || q.includes("new complaint"))
    return `To file a grievance:\n1. Go to File Grievance\n2. Enter details, district, source\n3. Click Submit & Classify\n4. AI auto-routes to the right department`

  if (q.includes("resolved") || q.includes("fixed"))
    return `${data.resolvedToday} complaint(s) resolved today. View the full lifecycle on the Live Feed.`

  if (q.includes("active") || q.includes("pending") || q.includes("open"))
    return `${data.activeIssues} active issues being tracked. ${data.delayedIssues} have breached SLA.`

  if (q.includes("report") || q.includes("pdf") || q.includes("download"))
    return `Download a full Governance Report PDF from the Command Center — includes stats, department performance, and SLA analysis.`

  if (q.includes("help") || q.includes("what can"))
    return `I can help with:\n• Platform stats & summaries\n• Department queries\n• SLA breach info\n• AI pipeline explanations\n• Navigation guidance\n\nJust ask naturally!`

  if (q.includes("thank"))
    return `You're welcome! Keep tracking those governance issues! 🇮🇳`

  return `I can help with complaint statistics, department performance, SLA breaches, AI pipeline info, and navigation. Try "give me a platform summary" or "which department is slowest?"`
}

export default function ChatBot() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(true)
  const [platformData, setPlatformData] = useState<PlatformData>({
    totalComplaints: 0, activeIssues: 0,
    delayedIssues: 0, resolvedToday: 0,
    byCategory: {}, byDepartment: {}
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  /* Close chat when clicking outside */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  useEffect(() => {
    fetch(`${API}/dashboard/stats`)
      .then(r => r.json())
      .then(d => setPlatformData({
        totalComplaints: d.total_complaints || 0,
        activeIssues: d.active_issues || 0,
        delayedIssues: d.delayed_issues || 0,
        resolvedToday: d.resolved_today || 0,
        byCategory: d.complaints_by_category || {},
        byDepartment: d.complaints_by_department || {}
      }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Hide on landing and login — must be AFTER all hooks
  if (pathname === "/" || pathname === "/login") return null

  async function sendMessage(text: string) {
    if (!text.trim()) return
    setUnread(false)
    setLoading(true)

    const userMsg: Message = {
      role: "user",
      parts: [{ text }],
      timestamp: new Date()
    }

    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput("")

    let reply = ""

    try {
      // Try Gemini via backend first
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newHistory.slice(-10).map(m => ({
            role: m.role,
            parts: m.parts
          }))
        })
      })

      if (!res.ok) throw new Error(`Backend error ${res.status}`)

      const data = await res.json()
      reply = data.reply
      if (!reply) throw new Error("Empty reply")
    } catch {
      // Fallback to rule-based engine — always works
      reply = localResponse(text, platformData)
    }

    setMessages(prev => [...prev, {
      role: "model",
      parts: [{ text: reply }],
      timestamp: new Date()
    }])
    setLoading(false)
  }

  const chips = [
    "How does NitiYantra's AI work?",
    "How many issues are delayed?",
    "Give me a platform summary",
    "Which departments are tracked?"
  ]

  return (
    <>
      <div ref={chatRef}>
      {/* Floating Button with Tooltip */}
      <div className="fixed bottom-6 right-6 z-[9999] group">
        <button
          onClick={() => { setOpen(!open); setUnread(false) }}
          className="relative w-12 h-12 rounded-full bg-indigo-500 text-white border-none shadow-[0_10px_25px_rgba(79,125,243,0.3)] cursor-pointer flex items-center justify-center transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:-translate-y-1 group-hover:shadow-[0_12px_30px_rgba(79,125,243,0.45)]"
        >
          <ChatTeardropDots size={24} weight="duotone" />
          {unread && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2" style={{ borderColor: "var(--card)" }} />
          )}
        </button>
        <span className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-in-out whitespace-nowrap shadow-md pointer-events-none">
          NitiYantra AI
        </span>
      </div>

      {/* Chat Panel */}
      {open && (
        <>
        {/* Backdrop dim effect — subtle depth layer */}
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.10)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 9997,
          pointerEvents: "none"
        }} />
        <div
          style={{
            position: "fixed",
            bottom: 84,
            right: 24,
            width: 360,
            height: 500,
            background: "var(--card)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
            boxShadow: "0 25px 80px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.30)",
            outline: "1px solid rgba(0,0,0,0.05)",
            animation: "scaleIn 0.3s ease-out",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = "0 30px 90px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.30)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = "0 25px 80px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.30)"
          }}
        >
          <style>{`
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0.97); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes bounce {
              0%,60%,100% { transform: translateY(0); }
              30% { transform: translateY(-5px); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            background: "var(--card)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
            borderRadius: "16px 16px 0 0",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                display: "flex", alignItems: "center",
                justifyContent: "center",
              }}><Robot size={18} weight="duotone" className="text-white" /></div>
              <div>
                <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>
                  NitiYantra AI
                </div>
                <div style={{ color: "#22c55e", fontSize: 10, display: "flex", alignItems: "center", gap: 4, opacity: 0.85 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "var(--text-muted)",
                       cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 6 }}>
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Messages — Inner contrast layer */}
          <div style={{
            flex: 1, overflowY: "auto", padding: 0,
            display: "flex", flexDirection: "column",
            background: "var(--bg)",
            position: "relative"
          }}>
          <div style={{
            background: "var(--card)",
            borderRadius: 16,
            padding: 14,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            position: "relative",
            overflow: "auto"
          }}>
            {/* Doodle background image */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "url('/chat-doodle-bg.png')",
              backgroundRepeat: "repeat",
              backgroundSize: "400px",
              backgroundPosition: "center",
              opacity: 0.18,
              pointerEvents: "none"
            }} />
            {/* Gradient blend overlay */}
            <div style={{
              position: "absolute", inset: 0,
              pointerEvents: "none",
              background: "linear-gradient(to bottom right, rgba(255,255,255,0.1), rgba(239,246,255,0.05), rgba(238,242,255,0.05))"
            }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                  margin: "0 auto 10px",
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                }}><Robot size={24} weight="duotone" className="text-white" /></div>
                <p style={{ color: "var(--text)", fontSize: 13,
                            fontWeight: 600, marginBottom: 6 }}>
                  NitiYantra AI
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 11,
                            maxWidth: 240, margin: "0 auto 16px",
                            lineHeight: 1.5 }}>
                  Ask about complaints, departments, SLA breaches, or platform features.
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  padding: "0 4px"
                }}>
                  {chips.map(chip => (
                    <button key={chip} onClick={() => sendMessage(chip)}
                      style={{
                        background: "rgba(30,41,59,0.65)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 12,
                        padding: "10px 10px",
                        fontSize: 10,
                        color: "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.3s",
                        textAlign: "left",
                        lineHeight: 1.4,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(51,65,85,0.75)"
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"
                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)"
                        e.currentTarget.style.transform = "scale(1.02)"
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(30,41,59,0.65)"
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"
                        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"
                        e.currentTarget.style.transform = "scale(1)"
                      }}>
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
              }}>
                <div style={{
                  background: msg.role === "user"
                    ? "var(--accent-light)"
                    : "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: msg.role === "user"
                    ? "14px 14px 4px 14px"
                    : "14px 14px 14px 4px",
                  padding: "9px 13px",
                  maxWidth: "82%",
                  fontSize: 12,
                  lineHeight: 1.65,
                  whiteSpace: "pre-line"
                }}>
                  {msg.parts[0].text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "6px 0" }}>
                {[0, 150, 300].map(delay => (
                  <div key={delay} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "#2563EB",
                    animation: `bounce 1s ${delay}ms infinite`
                  }} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
            </div>
          </div>
          </div>

          {/* Input */}
          <div style={{
            background: "var(--card)",
            borderTop: "1px solid var(--border)",
            borderRadius: "0 0 16px 16px",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !loading) sendMessage(input)
              }}
              placeholder="Ask NitiYantra AI..."
              style={{
                flex: 1,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 24,
                padding: "8px 14px",
                color: "var(--text)",
                fontSize: 12,
                outline: "none",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.2s"
              }}
              onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,125,243,0.15)"; e.currentTarget.style.borderColor = "#3B82F6" }}
              onBlur={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "var(--border)" }}
            />
            <button
              onClick={() => !loading && sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 32, height: 32,
                borderRadius: "50%",
                background: input.trim()
                  ? "linear-gradient(135deg, #2563EB, #1D4ED8)"
                  : "var(--border)",
                border: "none",
                color: "white",
                cursor: input.trim() ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                flexShrink: 0
              }}
              onMouseEnter={e => { if (input.trim()) e.currentTarget.style.transform = "scale(1.08)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}>
              <PaperPlaneRight size={16} weight="bold" />
            </button>
          </div>
        </div>
        </>
      )}
      </div>
    </>
  )
}
