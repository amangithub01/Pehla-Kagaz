import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { extractProfileLocal, extractProfile } from "../src/lib/llm/extract";

const EN =
  "I am 32 years old, a female tailor from Telangana, earn 12000 per month, no PF";
const HI =
  "मैं 32 साल की महिला हूं, तेलंगाना में दर्जी का काम करती हूं, महीने की कमाई 12000 है, मेरा पीएफ नहीं कटता";
const TE =
  "నేను 32 ఏళ్ల మహిళను, తెలంగాణలో టైలర్‌ను, నెలకు 12000 సంపాదిస్తాను, పీఎఫ్ లేదు";

describe("extractProfileLocal: English", () => {
  it("extracts age, gender, state, occupation, income and EPFO flag", () => {
    const r = extractProfileLocal(EN);
    expect(r.profile.age).toBe(32);
    expect(r.profile.gender).toBe("female");
    expect(r.state).toBe("Telangana");
    expect(r.profile.occupation).toBe("other");
    expect(r.occupation_note).toBe("tailor");
    expect(r.profile.monthly_income).toBe(12000);
    expect(r.profile.in_epfo_esic_nps).toBe(false);
  });

  it("reads a positive EPFO cue and a tax cue", () => {
    const r = extractProfileLocal("I work as a farmer and have EPFO. I pay income tax.");
    expect(r.profile.in_epfo_esic_nps).toBe(true);
    expect(r.profile.is_income_taxpayer).toBe(true);
    expect(r.profile.occupation).toBe("farmer");
  });

  it("treats a negated tax cue as false", () => {
    const r = extractProfileLocal("I am a daily wage worker, no income tax");
    expect(r.profile.is_income_taxpayer).toBe(false);
    expect(r.profile.occupation).toBe("daily_wage");
  });

  it("divides an annual lakh figure by 12", () => {
    const r = extractProfileLocal("My annual income is 1.5 lakh");
    expect(r.profile.monthly_income).toBe(12500);
  });

  it("maps state aliases", () => {
    expect(extractProfileLocal("from AP, 40 years").state).toBe("Andhra Pradesh");
    expect(extractProfileLocal("from TG, 40 years").state).toBe("Telangana");
    expect(extractProfileLocal("from MH").state).toBe("Maharashtra");
  });

  it("does not set bank or ration flags on negated mentions", () => {
    const r = extractProfileLocal("no bank account, no ration card");
    expect(r.profile.has_bank_account).toBeUndefined();
    expect(r.profile.has_ration_card).toBeUndefined();
  });
});

describe("extractProfileLocal: Hindi", () => {
  it("extracts age, gender, state, occupation, income and EPFO flag", () => {
    const r = extractProfileLocal(HI);
    expect(r.profile.age).toBe(32);
    expect(r.profile.gender).toBe("female");
    expect(r.state).toBe("Telangana");
    expect(r.profile.occupation).toBe("other");
    expect(r.occupation_note).toBe("दर्जी");
    expect(r.profile.monthly_income).toBe(12000);
    expect(r.profile.in_epfo_esic_nps).toBe(false);
  });

  it("reads Hindi tax cues and annual lakh income", () => {
    const pos = extractProfileLocal("मैं आयकर भरता हूं");
    expect(pos.profile.is_income_taxpayer).toBe(true);
    const neg = extractProfileLocal("मैं आयकर नहीं भरता");
    expect(neg.profile.is_income_taxpayer).toBe(false);
    const annual = extractProfileLocal("सालाना आय 1.5 लाख है");
    expect(annual.profile.monthly_income).toBe(12500);
  });
});

describe("extractProfileLocal: Telugu", () => {
  it("extracts age, gender, state, occupation, income and EPFO flag", () => {
    const r = extractProfileLocal(TE);
    expect(r.profile.age).toBe(32);
    expect(r.profile.gender).toBe("female");
    expect(r.state).toBe("Telangana");
    expect(r.profile.occupation).toBe("other");
    expect(r.occupation_note).toBe("టైలర్");
    expect(r.profile.monthly_income).toBe(12000);
    expect(r.profile.in_epfo_esic_nps).toBe(false);
  });

  it("reads Telugu digits and a negated tax cue", () => {
    const r = extractProfileLocal("ఆదాయపు పన్ను లేదు");
    expect(r.profile.is_income_taxpayer).toBe(false);
    const digits = extractProfileLocal("౩౨ ఏళ్ల రైతు");
    expect(digits.profile.age).toBe(32);
    expect(digits.profile.occupation).toBe("farmer");
  });
});

describe("extractProfile (never throws, Gemini optional)", () => {
  const savedKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = savedKey;
  });

  it("returns source rules when GEMINI_API_KEY is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r = await extractProfile(EN);
    expect(r.source).toBe("rules");
    expect(r.profile.age).toBe(32);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to rules when Gemini fetch rejects", async () => {
    process.env.GEMINI_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    const r = await extractProfile(HI);
    expect(r.source).toBe("rules");
    expect(r.state).toBe("Telangana");
    expect(r.profile.gender).toBe("female");
  });
});
