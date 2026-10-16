import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LeadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(9).max(24),
  when: z.string().trim().max(40),
  comment: z.string().trim().max(600),
  items: z
    .array(z.object({ name: z.string().max(80), detail: z.string().max(60), total: z.number().nullable() }))
    .max(20),
  total: z.number().nullable(),
  offer: z.string().max(80),
  lang: z.enum(["ru", "tg"]),
  source: z.string().max(200),
  website: z.string().max(200),
});

export type Lead = z.infer<typeof LeadSchema>;
export type LeadResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

function formatLead(lead: Lead) {
  const lines = [
    "🧺 Новая заявка с сайта",
    "",
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Когда забрать: ${lead.when}`,
  ];
  if (lead.items.length > 0) {
    lines.push("", "Расчёт:");
    for (const item of lead.items) {
      const price = item.total === null ? "—" : `${Math.round(item.total)} сомони`;
      lines.push(`• ${item.name}${item.detail ? ` (${item.detail})` : ""}: ${price}`);
    }
    if (lead.total !== null) lines.push(`Итого: ≈ ${Math.round(lead.total)} сомони`);
  }
  if (lead.offer) lines.push("", `Акция: ${lead.offer}`);
  if (lead.comment) lines.push("", `Комментарий: ${lead.comment}`);
  lines.push("", `Язык сайта: ${lead.lang === "tg" ? "тоҷикӣ" : "русский"}`);
  if (lead.source) lines.push(`Источник: ${lead.source}`);
  return lines.join("\n");
}

/**
 * Sends a lead to Telegram. Configure on the hosting side:
 *   TELEGRAM_BOT_TOKEN — token from @BotFather
 *   TELEGRAM_CHAT_ID   — chat/group id (several allowed, comma-separated)
 */
export const sendLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LeadSchema.parse(input))
  .handler(async ({ data }): Promise<LeadResult> => {
    // Honeypot: bots fill the hidden field; pretend success.
    if (data.website) return { ok: true };

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chats = (process.env.TELEGRAM_CHAT_ID ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (!token || chats.length === 0) return { ok: false, reason: "not_configured" };

    const text = formatLead(data);
    const results = await Promise.all(
      chats.map(async (chatId) => {
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
          });
          if (!res.ok) console.error("[lead] telegram error", res.status, await res.text());
          return res.ok;
        } catch (err) {
          console.error("[lead] telegram request failed", err);
          return false;
        }
      }),
    );
    return results.some(Boolean) ? { ok: true } : { ok: false, reason: "failed" };
  });
