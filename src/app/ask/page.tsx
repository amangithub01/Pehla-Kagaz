"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { evalAll } from "@/lib/engine/evaluate";
import { pickNextField } from "@/lib/engine/nextQuestion";
import { QUESTIONS, type Question } from "@/lib/engine/questions";
import { scrub } from "@/lib/engine/scrub";
import type { Profile, Scheme } from "@/lib/engine/types";
import { useLocal } from "@/lib/useLocal";

type Lang = "en" | "te";
type Field = keyof Profile;
type Answer = Profile[Field];
type Next = { field: Field; question: Question };

const MAX_QUESTIONS = 6;
const BTN = "min-h-11 rounded-lg border-2 border-black px-5 py-3 text-xl";

const QUESTION_BY_FIELD = new Map(
  Object.values(QUESTIONS).map((q) => [q.field, q] as [Field, Question]),
);

const L = {
  en: {
    title: "Answer a few questions",
    question: "Question",
    yes: "Yes",
    no: "No",
    dontKnow: "I don't know",
    next: "Next",
    done: "Thank you. We have enough to show your schemes.",
    seeResults: "See my schemes",
    loading: "Loading...",
    rejectId:
      "Please enter only your age or amount in rupees, not ID or account numbers.",
    invalid: "Please enter a valid number.",
    answerLabel: "Your answer",
    langLabel: "Language",
  },
  te: {
    title: "కొన్ని ప్రశ్నలకు జవాబు ఇవ్వండి",
    question: "ప్రశ్న",
    yes: "అవును",
    no: "కాదు",
    dontKnow: "తెలియదు",
    next: "తదుపరి",
    done: "ధన్యవాదాలు. పథకాలు చూపించడానికి తగిన సమాచారం ఉంది.",
    seeResults: "నా పథకాలను చూడండి",
    loading: "లోడ్ అవుతోంది...",
    rejectId:
      "దయచేసి వయసు లేదా రూపాయల మొత్తం మాత్రమే నమోదు చేయండి, ID లేదా ఖాతా నంబర్లు కాదు.",
    invalid: "దయచేసి సరైన సంఖ్య నమోదు చేయండి.",
    answerLabel: "మీ జవాబు",
    langLabel: "భాష",
  },
} as const;

// Shown when no scheme data is available (empty list or failed fetch).
const NO_DATA = {
  en: "No scheme data is available right now. Please try again later.",
  te: "ప్రస్తుతం పథక సమాచారం అందుబాటులో లేదు. దయచేసి తర్వాత మళ్ళీ ప్రయత్నించండి.",
} as const;

// Choice codes are stored as-is; only the displayed label is translated.
const OPTION_LABEL: Record<string, { en: string; te: string }> = {
  SC: { en: "SC", te: "ఎస్సీ" },
  ST: { en: "ST", te: "ఎస్టీ" },
  BC: { en: "BC", te: "బీసీ" },
  OC: { en: "OC", te: "ఓసీ" },
};

// pickNextField can return fields that have no question; skip those.
function findNext(profile: Profile, asked: Field[], schemes: Scheme[]): Next | null {
  const results = evalAll(schemes, profile);
  let skip = asked;
  for (;;) {
    const field = pickNextField(results, skip);
    if (field === null) return null;
    const question = QUESTION_BY_FIELD.get(field);
    if (question) return { field, question };
    skip = [...skip, field];
  }
}

function NumberAnswer({
  lang,
  onAnswer,
}: {
  lang: Lang;
  onAnswer: (v: number) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Typed numbers can still be ID or account numbers; never store them.
        if (scrub(value).removed > 0) {
          setError(L[lang].rejectId);
          return;
        }
        const n = Number(value);
        if (value === "" || !Number.isFinite(n) || n < 0) {
          setError(L[lang].invalid);
          return;
        }
        setError("");
        onAnswer(n);
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-3">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={L[lang].answerLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-11 w-full rounded-lg border-2 border-zinc-500 p-3 text-xl"
        />
        <button type="submit" className={BTN}>
          {L[lang].next}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-base text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}

export default function AskPage() {
  const [lang, setLang] = useLocal<Lang>("lang", "en");
  const [profile, setProfile] = useLocal<Profile>("profile", {});
  const [asked, setAsked] = useLocal<Field[]>("asked", []);
  const [schemes, setSchemes] = useState<Scheme[] | null>(null);

  useEffect(() => {
    fetch("/api/schemes")
      .then((r) => r.json())
      .then((d: { schemes: Scheme[] }) => setSchemes(d.schemes))
      .catch(() => setSchemes([]));
  }, []);

  const t = L[lang];
  const next =
    schemes !== null && asked.length < MAX_QUESTIONS
      ? findNext(profile, asked, schemes)
      : null;

  // value undefined means "I don't know": the field is marked asked, no value stored.
  function answer(field: Field, value: Answer) {
    if (value !== undefined) {
      setProfile({ ...profile, [field]: value } as Profile);
    }
    setAsked([...asked, field]);
  }

  if (schemes === null) {
    return (
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6 text-lg">
        <p>{t.loading}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-6 text-lg">
      <div className="flex gap-2" role="group" aria-label={t.langLabel}>
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
      <h1 className="text-3xl font-bold">{t.title}</h1>

      {schemes.length === 0 && (
        <section className="flex flex-col gap-1">
          <p>{NO_DATA.en}</p>
          <p>{NO_DATA.te}</p>
        </section>
      )}

      {schemes.length > 0 && next && (
        <section className="flex flex-col gap-5">
          <p className="text-base text-zinc-600">
            {t.question} {asked.length + 1} / {MAX_QUESTIONS}
          </p>
          <h2 className="text-2xl font-semibold">{next.question.text[lang]}</h2>

          {next.question.kind === "number" && (
            <NumberAnswer
              key={next.field}
              lang={lang}
              onAnswer={(v) => answer(next.field, v)}
            />
          )}

          {next.question.kind === "yesno" && (
            <div className="flex gap-3">
              <button
                type="button"
                className={BTN}
                onClick={() => answer(next.field, true)}
              >
                {t.yes}
              </button>
              <button
                type="button"
                className={BTN}
                onClick={() => answer(next.field, false)}
              >
                {t.no}
              </button>
            </div>
          )}

          {next.question.kind === "choice" && (
            <div className="flex flex-wrap gap-3">
              {(next.question.options ?? []).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={BTN}
                  onClick={() => answer(next.field, opt as Answer)}
                >
                  {OPTION_LABEL[opt]?.[lang] ?? opt}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="min-h-11 self-start text-base underline"
            onClick={() => answer(next.field, undefined)}
          >
            {t.dontKnow}
          </button>
        </section>
      )}

      {schemes.length > 0 && !next && (
        <section className="flex flex-col gap-4">
          <p className="text-xl">{t.done}</p>
          <Link
            href="/results"
            className="min-h-11 rounded-lg bg-black px-6 py-4 text-center text-xl font-semibold text-white"
          >
            {t.seeResults}
          </Link>
        </section>
      )}
    </main>
  );
}
