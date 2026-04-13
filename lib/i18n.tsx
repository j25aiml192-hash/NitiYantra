"use client";

import { useState, useCallback, createContext, useContext, ReactNode } from "react";

/* ─── Translation Dictionary ─── */
const translations: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    "nav.command_center": "Command Center",
    "nav.live_feed": "Live Feed",
    "nav.grievance_registry": "Grievance Registry",
    "nav.sla_breaches": "SLA Breaches",
    "nav.pattern_analysis": "Pattern Analysis",
    "nav.performance_metrics": "Performance Metrics",
    "nav.geographic_monitor": "Geographic Monitor",
    "nav.election_engine": "Election Engine",
    "nav.onoe_simulator": "ONOE Simulator",
    "nav.spotlight_debate": "Spotlight Debate",
    "nav.department_directory": "Department Directory",
    "nav.settings": "Settings",

    // Common
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.submit": "Submit",
    "common.export_csv": "Export CSV",
    "common.export_pdf": "Export PDF",
    "common.search": "Search...",
    "common.filter": "Filter",

    // Dashboard
    "dashboard.title": "Command Center",
    "dashboard.total_complaints": "Total Complaints",
    "dashboard.active_issues": "Active Issues",
    "dashboard.resolved_today": "Resolved Today",
    "dashboard.delayed_issues": "Delayed Issues",

    // Election Engine
    "election.title": "Hybrid Election Resource Calculator",
    "election.subtitle": "AI-powered election resource allocation engine",
    "election.projected_voters": "Projected Voters",
    "election.poll_stations": "Poll Stations",
    "election.total_budget": "Total Budget",
    "election.total_workforce": "Total Workforce",
    "election.security_forces": "Security Forces",
    "election.hr_admin": "HR & Administration",
    "election.logistics": "Logistics Overview",
    "election.budget_split": "Budget Split",

    // Simulator
    "simulator.title": "One Nation One Election — Simulator",
    "simulator.subtitle": "20-year projection engine for synchronized elections",
    "simulator.governance_days": "Governance Days Saved",
    "simulator.savings": "Cumulative Savings",
    "simulator.synced_states": "Synced States",
    "simulator.run_simulation": "Run Simulation",

    // Debate
    "debate.title": "Spotlight Debate Arena",
    "debate.subtitle": "AI-powered multi-agent policy debate",
    "debate.hold_to_speak": "Hold to Speak",
    "debate.listening": "Listening...",
    "debate.processing": "Generating debate...",
    "debate.new_debate": "New Debate",
    "debate.verdict": "Moderator's Verdict",
  },
  hi: {
    // Navigation
    "nav.command_center": "कमांड सेंटर",
    "nav.live_feed": "लाइव फीड",
    "nav.grievance_registry": "शिकायत रजिस्ट्री",
    "nav.sla_breaches": "SLA उल्लंघन",
    "nav.pattern_analysis": "पैटर्न विश्लेषण",
    "nav.performance_metrics": "प्रदर्शन मेट्रिक्स",
    "nav.geographic_monitor": "भौगोलिक मॉनिटर",
    "nav.election_engine": "चुनाव इंजन",
    "nav.onoe_simulator": "ONOE सिम्युलेटर",
    "nav.spotlight_debate": "स्पॉटलाइट बहस",
    "nav.department_directory": "विभाग निर्देशिका",
    "nav.settings": "सेटिंग्स",

    // Common
    "common.loading": "लोड हो रहा है...",
    "common.error": "एक त्रुटि हुई",
    "common.save": "सहेजें",
    "common.cancel": "रद्द करें",
    "common.submit": "जमा करें",
    "common.export_csv": "CSV निर्यात",
    "common.export_pdf": "PDF निर्यात",
    "common.search": "खोजें...",
    "common.filter": "फ़िल्टर",

    // Dashboard
    "dashboard.title": "कमांड सेंटर",
    "dashboard.total_complaints": "कुल शिकायतें",
    "dashboard.active_issues": "सक्रिय मुद्दे",
    "dashboard.resolved_today": "आज हल किए गए",
    "dashboard.delayed_issues": "विलंबित मुद्दे",

    // Election Engine
    "election.title": "हाइब्रिड चुनाव संसाधन कैलकुलेटर",
    "election.subtitle": "AI-संचालित चुनाव संसाधन आवंटन इंजन",
    "election.projected_voters": "अनुमानित मतदाता",
    "election.poll_stations": "मतदान केंद्र",
    "election.total_budget": "कुल बजट",
    "election.total_workforce": "कुल कार्यबल",
    "election.security_forces": "सुरक्षा बल",
    "election.hr_admin": "मानव संसाधन एवं प्रशासन",
    "election.logistics": "रसद अवलोकन",
    "election.budget_split": "बजट विभाजन",

    // Simulator
    "simulator.title": "एक राष्ट्र एक चुनाव — सिम्युलेटर",
    "simulator.subtitle": "समकालिक चुनावों के लिए 20-वर्षीय प्रक्षेपण",
    "simulator.governance_days": "शासन दिवस बचाए गए",
    "simulator.savings": "संचित बचत",
    "simulator.synced_states": "समकालिक राज्य",
    "simulator.run_simulation": "सिमुलेशन चलाएं",

    // Debate
    "debate.title": "स्पॉटलाइट बहस अखाड़ा",
    "debate.subtitle": "AI-संचालित बहु-एजेंट नीति बहस",
    "debate.hold_to_speak": "बोलने के लिए दबाएं",
    "debate.listening": "सुन रहा है...",
    "debate.processing": "बहस तैयार हो रही है...",
    "debate.new_debate": "नई बहस",
    "debate.verdict": "मॉडरेटर का फैसला",
  },
};

/* ─── Context ─── */
interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
});

/* ─── Provider ─── */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState("en");

  const setLocale = useCallback((l: string) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("nityantra_locale", l);
    }
  }, []);

  const t = useCallback(
    (key: string) => translations[locale]?.[key] || translations["en"]?.[key] || key,
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/* ─── Hook ─── */
export function useTranslation() {
  return useContext(I18nContext);
}

/* ─── Language Toggle Component ─── */
export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "hi" : "en")}
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--text)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
      title={locale === "en" ? "Switch to Hindi" : "Switch to English"}
    >
      {locale === "en" ? "हिंदी" : "English"}
    </button>
  );
}
