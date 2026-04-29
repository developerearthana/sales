import { NextRequest, NextResponse } from "next/server";
import { analyzeEmailReply, generateOutreachReply, isAIConfigured } from "../../../../lib/anthropicClient";
import { saveLeadState, createLeadNotification } from "../../../../lib/agentManager";
import { isSupabaseConfigured } from "../../../../lib/supabaseClient";
import { supabase } from "../../../../lib/supabaseClient";
import { sendEmail } from "../../../../lib/emailClient";

// SendGrid Inbound Parse sends multipart/form-data
async function parseInboundEmail(req: NextRequest): Promise<{
  from: string; subject: string; text: string; html?: string; to?: string;
} | null> {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      return { from: body.from ?? "", subject: body.subject ?? "", text: body.text ?? body.body ?? "", html: body.html, to: body.to };
    }

    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      return {
        from: String(formData.get("from") ?? ""),
        subject: String(formData.get("subject") ?? ""),
        text: String(formData.get("text") ?? formData.get("body") ?? ""),
        html: formData.get("html") ? String(formData.get("html")) : undefined,
        to: formData.get("to") ? String(formData.get("to")) : undefined
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Extract sender email from "Name <email@domain.com>" format
function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/) ?? from.match(/([\w.+%-]+@[\w-]+\.[\w.]+)/);
  return (match?.[1] ?? from).trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseInboundEmail(req);
    if (!parsed || !parsed.from) {
      return NextResponse.json({ status: "ignored", reason: "No parseable email data" });
    }

    const senderEmail = extractEmail(parsed.from);
    const subject     = parsed.subject ?? "(no subject)";
    const body        = parsed.text ?? "";

    // Look up lead by email
    let lead: Record<string, any> | null = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .ilike("email", senderEmail)
        .limit(1)
        .single();
      lead = data ?? null;
    }

    // AI analysis of the reply
    let analysis: Awaited<ReturnType<typeof analyzeEmailReply>> | null = null;
    if (isAIConfigured()) {
      analysis = await analyzeEmailReply({
        subject,
        body,
        fromEmail: senderEmail,
        leadContext: {
          name: lead?.name,
          company: lead?.company,
          lastSubject: (lead?.metadata as any)?.lastEmailSubject
        }
      });
    }

    // Update lead status if found
    if (lead && analysis) {
      await saveLeadState({
        id: lead.id,
        interest_status: analysis.suggestedStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(lead.metadata as Record<string, unknown> | undefined),
          lastReplyFrom: senderEmail,
          lastReplySubject: subject,
          lastReplyIntent: analysis.intent,
          lastReplySentiment: analysis.sentiment,
          lastReplyAt: new Date().toISOString()
        }
      });

      await createLeadNotification(
        lead.id,
        "inbound_reply",
        `Reply from ${senderEmail}: ${analysis.sentiment} — ${analysis.intent}`,
        {
          subject,
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          nextAction: analysis.nextAction
        }
      );
    }

    // Auto-reply if Claude generated one and the intent is positive/informational
    if (analysis?.autoReply && lead?.email && analysis.intent !== "unsubscribe" && analysis.intent !== "not_interested") {
      try {
        const replyBody = await generateOutreachReply({
          originalSubject: subject,
          replyBody: body,
          lead: {
            name: lead?.name,
            company: lead?.company,
            industry: (lead?.metadata as any)?.intent?.industry,
            location: (lead?.metadata as any)?.intent?.location
          },
          replyIntent: analysis.intent
        }) ?? analysis.autoReply;

        await sendEmail(
          senderEmail,
          `Re: ${subject}`,
          replyBody.replace(/\n/g, "<br>")
        );

        if (lead) {
          await createLeadNotification(lead.id, "auto_reply", `Auto-reply sent to ${senderEmail}`, { subject: `Re: ${subject}` });
        }
      } catch { /* auto-reply is non-blocking */ }
    }

    return NextResponse.json({
      status: "processed",
      leadFound: !!lead,
      leadId: lead?.id ?? null,
      analysis: analysis ? {
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        suggestedStatus: analysis.suggestedStatus,
        nextAction: analysis.nextAction
      } : null
    });
  } catch (err: any) {
    console.error("[webhook/email]", err);
    // Always return 200 to SendGrid to prevent retries
    return NextResponse.json({ status: "error", message: err?.message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "sendgrid-inbound-webhook-ready" });
}
