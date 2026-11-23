"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocal } from "@/lib/useLocal";

type Lang = "en" | "te";

export default function Navbar() {
  const pathname = usePathname();
  const [lang, setLang] = useLocal<Lang>("lang", "en");
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: { en: "Home", te: "హోమ్" } },
    { href: "/results", label: { en: "Results", te: "ఫలితాలు" } },
    { href: "/plan", label: { en: "Plan", te: "ప్రణాళిక" } },
    { href: "/before-you-go", label: { en: "Before You Go", te: "వెళ్లే ముందు తనిఖీ" } },
    { href: "/sheet", label: { en: "Claim Sheet", te: "క్లెయిమ్ షీట్" } },
    { href: "/tracker", label: { en: "Tracker", te: "ట్రాకర్" } },
    { href: "/sources", label: { en: "Sources", te: "మూలాలు" } },
    { href: "/admin", label: { en: "Admin", te: "అడ్మిన్" } },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 print:hidden shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl">📜</span>
              <div>
                <span className="font-bold text-gray-900 group-hover:text-blue-600 transition block leading-tight">
                  {lang === "te" ? "మొదటి కాగితం" : "Claim What's Yours"}
                </span>
                <span className="text-[10px] text-gray-500 font-medium block leading-none">
                  Pehla Kagaz • Mee Seva & CSC
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {link.label[lang]}
                </Link>
              );
            })}
          </div>

          {/* Right Action: Language Toggle */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === "en"
                    ? "bg-white text-gray-900 shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang("te")}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === "te"
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                తెలుగు
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                aria-label="Toggle Navigation Menu"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {link.label[lang]}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
