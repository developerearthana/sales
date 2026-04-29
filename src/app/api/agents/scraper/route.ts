import { NextRequest, NextResponse } from "next/server";
import { scraperAgent } from "../../../../api/agents/scraper";
import { saveLeadState, createLeadNotification } from "../../../../lib/agentManager";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await scraperAgent(body);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Scrape failed" }, { status: 400 });
  }
}

// PATCH: save specific contacts to CRM after review
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { contacts } = body as {
      contacts: Array<{
        id: string;
        name?: string;
        email?: string;
        company?: string;
        title?: string;
        phone?: string;
        linkedin?: string;
        aiScore?: number;
        aiReasoning?: string;
        scraperUrl?: string;
        analysis?: Record<string, unknown>;
      }>;
    };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
    }

    let savedCount = 0;
    const savedIds: string[] = [];

    for (const contact of contacts) {
      try {
        const leadId = contact.id ?? crypto.randomUUID();
        await saveLeadState({
          id: leadId,
          email: contact.email ?? "",
          name: contact.name ?? "",
          company: contact.company ?? "",
          title: contact.title ?? "",
          interest_status: "new",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            source: "scraper:manual_save",
            scraperUrl: contact.scraperUrl ?? null,
            linkedin: contact.linkedin ?? null,
            phone: contact.phone ?? null,
            aiScore: contact.aiScore ?? null,
            aiReasoning: contact.aiReasoning ?? null,
            ...(contact.analysis && { companyAnalysis: contact.analysis })
          }
        });
        await createLeadNotification(
          leadId,
          "scraper",
          `Manually saved from scraper: ${contact.name ?? contact.email ?? "contact"}`,
          { aiScore: contact.aiScore }
        );
        savedIds.push(leadId);
        savedCount++;
      } catch { /* best-effort */ }
    }

    return NextResponse.json({ savedCount, savedIds });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Save failed" }, { status: 400 });
  }
}
