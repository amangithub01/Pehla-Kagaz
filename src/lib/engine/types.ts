export type Profile = {
  age?: number;
  gender?: "male" | "female" | "other";
  area?: "rural" | "urban";
  monthly_income?: number;
  occupation?: "construction" | "daily_wage" | "farmer" | "student" | "other";
  social_category?: "SC" | "ST" | "BC" | "OC";
  has_bank_account?: boolean;
  has_ration_card?: boolean;
  is_income_taxpayer?: boolean;
  in_epfo_esic_nps?: boolean;
  has_child_in_school?: boolean;
  has_disability?: boolean;
  is_widow?: boolean;
};

export type Op = "eq" | "gte" | "lte" | "between" | "in" | "not_in";

export type Rule = {
  id: string;
  field: keyof Profile;
  op: Op;
  value: unknown;
  explain: { en: string; te: string };
  source_clause: string;
};

export type Scheme = {
  id: string;
  name: { en: string; te: string };
  level: "central" | "state";
  department: string;
  benefit: { en: string; te: string };
  fee_inr: number;
  rules: Rule[];
  documents: string[];
  apply_steps: { en: string; te: string }[];
  apply_url: string;
  source_url: string;
  last_verified: string;
  deadline?: string | null;
  followup_days?: number;
};

export type DocumentDef = {
  id: string;
  name: { en: string; te: string };
  issued_by: string;
  where: string;
  fee_inr: number;
  typical_days: number;
  validity_months?: number;
  requires: string[];
  source_url: string;
  last_verified: string;
};
