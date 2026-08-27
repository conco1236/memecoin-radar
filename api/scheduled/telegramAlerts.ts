import { scheduledTelegramAlerts } from "../../server/scheduledTelegram";

export default function handler(req: any, res: any) {
  return scheduledTelegramAlerts(req, res);
}
