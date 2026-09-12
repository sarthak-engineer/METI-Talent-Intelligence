import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "METI — Modus Enterprise Talent Intelligence",
  description: "Evidence-first consulting capability diagnosis powered by METI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="mi-app">
        <Sidebar />
        <div className="mi-page">
          {children}
        </div>
      </body>
    </html>
  );
}
