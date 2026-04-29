import sgMail from "@sendgrid/mail";
import { config } from "./config";

if (config.sendgridApiKey) {
  sgMail.setApiKey(config.sendgridApiKey);
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!config.sendgridApiKey) {
    throw new Error("SENDGRID_API_KEY is not configured.");
  }
  if (!config.sendgridFrom) {
    throw new Error("SENDGRID_FROM is not configured.");
  }

  const msg = {
    to,
    from: config.sendgridFrom,
    subject,
    html
  };

  const [response] = await sgMail.send(msg);
  return { statusCode: response.statusCode, body: response.body };
}
