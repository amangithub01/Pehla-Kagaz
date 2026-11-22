import type { Profile } from "./types";

export type Question = {
  field: keyof Profile;
  kind: "number" | "yesno" | "choice";
  text: { en: string; te: string };
  options?: string[];
};

export const QUESTIONS: Record<string, Question> = {
  age: {
    field: "age",
    kind: "number",
    text: {
      en: "What is your age?",
      te: "మీ వయసు ఎంత?",
    },
  },
  monthly_income: {
    field: "monthly_income",
    kind: "number",
    text: {
      en: "What is your family's monthly income in rupees?",
      te: "మీ కుటుంబ నెలవారీ ఆదాయం ఎంత (రూపాయల్లో)?",
    },
  },
  has_bank_account: {
    field: "has_bank_account",
    kind: "yesno",
    text: {
      en: "Do you have a bank account in your name?",
      te: "Do you have a bank account in your name?",
    },
  },
  has_ration_card: {
    field: "has_ration_card",
    kind: "yesno",
    text: {
      en: "Do you have a ration card?",
      te: "మీ వద్ద రేషన్ కార్డు ఉందా?",
    },
  },
  social_category: {
    field: "social_category",
    kind: "choice",
    text: {
      en: "What is your social category?",
      te: "మీ సామాజిక వర్గం ఏది?",
    },
    options: ["SC", "ST", "BC", "OC"],
  },
  is_income_taxpayer: {
    field: "is_income_taxpayer",
    kind: "yesno",
    text: {
      en: "Do you pay income tax?",
      te: "Do you pay income tax?",
    },
  },
  in_epfo_esic_nps: {
    field: "in_epfo_esic_nps",
    kind: "yesno",
    text: {
      en: "Are you enrolled in EPFO, ESIC or NPS?",
      te: "Are you enrolled in EPFO, ESIC or NPS?",
    },
  },
  has_child_in_school: {
    field: "has_child_in_school",
    kind: "yesno",
    text: {
      en: "Do you have a child in school?",
      te: "Do you have a child in school?",
    },
  },
  has_disability: {
    field: "has_disability",
    kind: "yesno",
    text: {
      en: "Does anyone in your family have a disability?",
      te: "Does anyone in your family have a disability?",
    },
  },
  is_widow: {
    field: "is_widow",
    kind: "yesno",
    text: {
      en: "Are you a widow?",
      te: "Are you a widow?",
    },
  },
};
