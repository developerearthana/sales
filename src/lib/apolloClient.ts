import { config } from "./config";

export type ApolloPerson = {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  headline: string;
  title: string;
  organization_name: string;
  linkedin_url: string;
  city: string;
  state: string;
  country: string;
  phone_numbers?: Array<{ sanitized_number: string }>;
};

export type ApolloSearchResult = {
  people: ApolloPerson[];
  total: number;
  page: number;
};

export async function searchPeople(params: {
  query: string;
  titles?: string[];
  locations?: string[];
  perPage?: number;
  page?: number;
}): Promise<ApolloSearchResult> {
  if (!config.apolloApiKey) {
    return { people: [], total: 0, page: 1 };
  }

  const body: Record<string, unknown> = {
    q_keywords: params.query,
    page: params.page ?? 1,
    per_page: params.perPage ?? 10,
    prospected_by_current_team: ["no"]
  };
  if (params.titles?.length) body.person_titles = params.titles;
  if (params.locations?.length) body.person_locations = params.locations;

  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": config.apolloApiKey
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Apollo API ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    people: (data.people ?? []) as ApolloPerson[],
    total: data.pagination?.total_entries ?? 0,
    page: data.pagination?.page ?? 1
  };
}

export async function enrichByEmail(email: string): Promise<ApolloPerson | null> {
  if (!config.apolloApiKey || !email) return null;

  try {
    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": config.apolloApiKey
      },
      body: JSON.stringify({ email, reveal_personal_emails: true })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.person as ApolloPerson) ?? null;
  } catch {
    return null;
  }
}

export function apolloPersonToLeadSpec(p: ApolloPerson) {
  return {
    id: crypto.randomUUID(),
    name: p.name,
    email: p.email ?? "",
    company: p.organization_name ?? "",
    title: p.title ?? "",
    metadata: {
      source: "apollo",
      linkedin: p.linkedin_url,
      phone: p.phone_numbers?.[0]?.sanitized_number ?? null,
      city: p.city,
      state: p.state,
      country: p.country
    }
  };
}

export function isApolloConfigured(): boolean {
  return !!config.apolloApiKey;
}
