"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Profile } from "@/lib/engine/types";
import { useLocal } from "@/lib/useLocal";

type Lang = "en" | "te";
type SpeechLang = "en-IN" | "hi-IN" | "te-IN";

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib).
interface SpeechAlternativeLike {
  readonly transcript: string;
}
interface SpeechResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechAlternativeLike;
}
interface SpeechResultEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechResultLike>;
}
interface SpeechErrorEventLike {
  readonly error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEventLike) => void) | null;
  onerror: ((e: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SPEECH_LANGS: { value: SpeechLang; label: string }[] = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "हिन्दी (India)" },
  { value: "te-IN", label: "తెలుగు (India)" },
];

const COPY = {
  en: {
    body: "Answer a few questions about your family. We will show the schemes you may qualify for, the documents to collect first, and what to ask for.",
    start: "Start",
    speak: "Speak about your family",
    stop: "Stop",
    speechLang: "Speech language",
    unsupported:
      "Voice input is not supported in this browser. You can type below.",
    typedLabel: "Or type about your family",
    typedSubmit: "Use typed text",
    listening: "Listening…",
    sending: "Reading your answer…",
    merged: "Saved to your profile. Review the answers on the next page.",
    fallback:
      "We could not read this automatically. The typed form will be used. You can continue below.",
    heard: "What we heard",
    voiceError: "Voice input stopped",
    langGroup: "Language",
    micDenied:
      "Microphone permission is needed. You can type below.",

  },
  te: {
    body: "మీ కుటుంబం గురించి కొన్ని ప్రశ్నలకు జవాబు ఇవ్వండి. మీకు అర్హత ఉండే పథకాలు, ముందుగా సేకరించాల్సిన పత్రాలు చూపిస్తాం.",
    start: "ప్రారంభించండి",
    speak: "మీ కుటుంబం గురించి మాట్లాడండి",
    stop: "ఆపండి",
    speechLang: "మాట్లాడే భాష",
    unsupported:
      "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ పనిచేయదు. కింద టైప్ చేయవచ్చు.",
    typedLabel: "లేదా మీ కుటుంబం గురించి టైప్ చేయండి",
    typedSubmit: "టైప్ చేసిన వివరాలు ఉపయోగించండి",
    listening: "వింటున్నాం…",
    sending: "మీ జవాబు చదువుతున్నాం…",
    merged:
      "మీ ప్రొఫైల్‌లో సేవ్ చేశాం. తదుపరి పేజీలో సమాధానాలు చూడండి.",
    fallback:
      "ఇది స్వయంచాలకంగా చదవలేకపోయాం. టైప్ చేసిన ఫారమ్ ఉపయోగిస్తాం. కింద కొనసాగించండి.",
    heard: "మేము విన్నది",
    voiceError: "వాయిస్ ఇన్‌పుట్ ఆగిపోయింది",
    langGroup: "భాష",
    micDenied: "మైక్రోఫోన్ అనుమతి కావాలి. కింద టైప్ చేయవచ్చు.",
  },
} as const;

function defaultSpeechLang(lang: Lang): SpeechLang {
  return lang === "te" ? "te-IN" : "en-IN";
}

// Joins two pieces of text with a single space, skipping empty pieces.
function joinText(a: string, b: string): string {
  const left = a.replace(/\s+$/, "");
  const right = b.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`;
}

// Recognition support never changes after mount, so the subscription is a no-op.
function subscribeNoop(): () => void {
  return () => {};
}
function getSttSupportedSnapshot(): boolean {
  return getRecognitionCtor() !== null;
}
function getSttSupportedServerSnapshot(): boolean {
  return false;
}

export default function Home() {
  const [lang, setLang] = useLocal<Lang>("lang", "en");
  const [, setStoredProfile] = useLocal<Profile>("profile", {});
  const t = COPY[lang];

  // null = follow the en/te toggle; a value = the user picked one explicitly.
  const [speechOverride, setSpeechOverride] = useState<SpeechLang | null>(null);
  const speechLang = speechOverride ?? defaultSpeechLang(lang);

  const sttSupported = useSyncExternalStore(
    subscribeNoop,
    getSttSupportedSnapshot,
    getSttSupportedServerSnapshot,
  );
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // listeningRef stays true until the user presses Stop; onend uses it to restart.
  const listeningRef = useRef(false);
  // committedRef: text in the box before the current session plus finished sessions.
  const committedRef = useRef("");
  // sessionFinalRef: final (non-interim) text of the current recognition session.
  const sessionFinalRef = useRef("");

  useEffect(() => {
    return () => {
      listeningRef.current = false;
      recRef.current?.stop();
    };
  }, []);

  function mergeIntoProfile(incoming: Partial<Profile>) {
    // Merge with whatever is already stored, never replace it.
    let current: Profile = {};
    try {
      const raw = localStorage.getItem("profile");
      if (raw) current = JSON.parse(raw) as Profile;
    } catch {
      // unreadable storage: start from an empty profile
    }
    setStoredProfile({ ...current, ...incoming });
  }

  async function submit(text: string) {
    const clean = text.trim();
    if (!clean) return;
    setBusy(true);
    setNotice(null);
    setTranscript(clean);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        profile?: Partial<Profile>;
        source?: string;
      };
      if (
        (data.source === "rules" || data.source === "gemini") &&
        data.profile &&
        Object.keys(data.profile).length > 0
      ) {
        mergeIntoProfile(data.profile);
        setNotice(t.merged);
      } else {
        setNotice(t.fallback);
      }
    } catch {
      setNotice(t.fallback);
    } finally {
      setBusy(false);
    }
  }

  function startListening() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setVoiceError(null);
    setNotice(null);
    setTranscript("");

    // Text already in the box stays; speech is appended after it.
    committedRef.current = typed;
    sessionFinalRef.current = "";

    const rec = new Ctor();
    rec.lang = speechLang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += r[0].transcript;
        else interim += r[0].transcript;
      }
      sessionFinalRef.current = finals;
      setTyped(joinText(committedRef.current, joinText(finals, interim)));
    };
    rec.onerror = (e) => {
      // "no-speech" and "aborted" are normal during continuous listening.
      if (e.error === "no-speech" || e.error === "aborted") return;
      listeningRef.current = false;
      setListening(false);
      setVoiceError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? t.micDenied
          : `${t.voiceError}: ${e.error}`,
      );
    };
    rec.onend = () => {
      // The browser ends a session on its own after silence; keep the text
      // gathered so far and restart while the user has not pressed Stop.
      committedRef.current = joinText(committedRef.current, sessionFinalRef.current);
      sessionFinalRef.current = "";
      setTyped(committedRef.current);
      if (listeningRef.current) {
        try {
          rec.start();
          return;
        } catch {
          listeningRef.current = false;
        }
      }
      setListening(false);
    };

    recRef.current = rec;
    listeningRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      listeningRef.current = false;
      setVoiceError(t.voiceError);
      setListening(false);
    }
  }

  function stopListening() {
    listeningRef.current = false;
    setListening(false);
    recRef.current?.stop();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-6 text-lg">
      <div className="flex gap-2" role="group" aria-label={t.langGroup}>
        {(["en", "te"] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => setLang(l)}
            className={`min-h-11 rounded-lg border-2 border-black px-4 py-2 text-lg ${
              lang === l ? "bg-black text-white" : ""
            }`}
          >
            {l === "en" ? "English" : "తెలుగు"}
          </button>
        ))}
      </div>
      <h1 className="text-4xl font-bold">Claim What&apos;s Yours</h1>
      <p>{t.body}</p>

      <section className="flex flex-col gap-3">
        {sttSupported ? (
          <>
            <label className="flex flex-col gap-1 text-base">
              <span>{t.speechLang}</span>
              <select
                value={speechLang}
                onChange={(e) => setSpeechOverride(e.target.value as SpeechLang)}
                disabled={listening}
                className="min-h-11 rounded-lg border-2 border-black px-3 py-2 text-lg"
              >
                {SPEECH_LANGS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={busy}
              aria-pressed={listening}
              className="min-h-11 rounded-lg border-2 border-black px-6 py-4 text-xl font-semibold"
            >
              {listening ? t.stop : `🎤 ${t.speak}`}
            </button>
            {listening && <p role="status">{t.listening}</p>}
          </>
        ) : (
          <p className="text-base">{t.unsupported}</p>
        )}

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(typed);
          }}
        >
          <label className="flex flex-col gap-1 text-base">
            <span>{t.typedLabel}</span>
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              rows={3}
              className="rounded-lg border-2 border-black px-3 py-2 text-lg"
            />
          </label>
          <button
            type="submit"
            disabled={busy || typed.trim() === ""}
            className="min-h-11 rounded-lg border-2 border-black px-6 py-3 text-lg font-semibold"
          >
            {t.typedSubmit}
          </button>
        </form>

        {busy && <p role="status">{t.sending}</p>}
        {voiceError && (
          <p role="alert" className="text-base">
            {voiceError}
          </p>
        )}
        {transcript && (
          <div className="text-base">
            <p className="font-semibold">{t.heard}</p>
            <p>{transcript}</p>
          </div>
        )}
        {notice && (
          <p role="status" className="text-base">
            {notice}
          </p>
        )}
      </section>

      <Link
        href="/ask"
        className="min-h-11 rounded-lg bg-black px-6 py-4 text-center text-xl font-semibold text-white"
      >
        {t.start}
      </Link>
    </main>
  );
}
