import { scheduledTelegramAlerts } from "../../server/scheduledTelegram.js";

export default function handler(req: any, res: any) {
  return scheduledTelegramAlerts(req, res);
}
