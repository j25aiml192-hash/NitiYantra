import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import ChatBot from "@/components/ChatBot";
import Navbar from "@/components/Navbar";
import LayoutShell from "@/components/LayoutShell";
import "./globals.css";
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NitiYantra — AI Governance Intelligence & Election Simulation",
  description:
    "NitiYantra is an AI-powered governance intelligence & election simulation superplatform.",
  icons: {
    icon: "/nittisetulogo.svg",
    apple: "/nittisetulogo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var s = JSON.parse(localStorage.getItem('nitisetu_settings') || '{}');
              var t = s.theme || 'light';
              if (t === 'system') {
                t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              document.documentElement.setAttribute('data-theme', t);
            } catch(e) {}
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <LayoutShell>{children}</LayoutShell>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "13px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#ffffff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
            },
          }}
        />
        <ChatBot />
      </body>
    </html>
  );
}
