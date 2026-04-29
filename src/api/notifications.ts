import { getLeadNotifications } from "../lib/agentManager";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const status = typeof req.query?.status === "string" ? req.query.status : undefined;

  try {
    const notifications = await getLeadNotifications(status);
    return res.status(200).json({ notifications, ready: true });
  } catch (error: any) {
    return res.status(200).json({ notifications: [], ready: false, warning: error?.message ?? "Failed to fetch notifications" });
  }
}
