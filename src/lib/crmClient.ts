import { Client } from "@hubspot/api-client";
import { config } from "./config";

const hubspot = new Client({ apiKey: config.hubspotApiKey });

export async function fetchCrmLeadByEmail(email: string) {
  if (!email) return null;

  const searchRequest: any = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "email",
            operator: "EQ",
            value: email
          }
        ]
      }
    ],
    properties: ["email", "firstname", "lastname", "company", "phone"],
    limit: 1
  };

  const response = await hubspot.crm.contacts.searchApi.doSearch(searchRequest);
  return response?.results?.[0] ?? null;
}

export async function upsertCrmLead(payload: Record<string, unknown>) {
  if (!payload.email) {
    throw new Error("CRM payload must include email.");
  }

  const existing = await fetchCrmLeadByEmail(payload.email as string);
  const contactProps: Record<string, string> = {
    email: String(payload.email),
    firstname: String(payload.name ?? payload.firstName ?? ""),
    company: String(payload.company ?? "")
  };

  if ((payload.metadata as any)?.phone) {
    contactProps.phone = String((payload.metadata as any).phone);
  }

  if (existing?.id) {
    return hubspot.crm.contacts.basicApi.update(existing.id as string, { properties: contactProps });
  }

  return hubspot.crm.contacts.basicApi.create({ properties: contactProps });
}
