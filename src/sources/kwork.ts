import { fetchPage } from "../http.js";
import type { Order, OrderSource } from "../types.js";

// robots.txt разрешает /projects, но запрещает ?page=, поэтому берём только 1-ю страницу (12 свежих заказов).
const LIST_URL = "https://kwork.ru/projects";

type KworkWant = {
  id: number;
  name: string;
  description: string;
  priceLimit: string;
  date_create: string; // "2026-10-20 14:45:51", московское время
};

export function parseKwork(html: string): Order[] {
  const state = extractJsonAfter(html, "window.stateData=") as { wants?: KworkWant[] };
  if (!Array.isArray(state.wants)) {
    throw new Error("kwork: в stateData нет wants, похоже, вёрстка изменилась");
  }
  return state.wants.map((w) => ({
    source: "kwork",
    externalId: String(w.id),
    title: decodeEntities(w.name).trim(),
    description: decodeEntities(w.description).replace(/\r\n/g, "\n").trim(),
    budget: Number(w.priceLimit) || null,
    url: `https://kwork.ru/projects/${w.id}/view`,
    publishedAt: new Date(`${w.date_create.replace(" ", "T")}+03:00`),
  }));
}

export const kworkSource: OrderSource = {
  name: "kwork",
  async fetchNew() {
    return parseKwork(await fetchPage(LIST_URL));
  },
};

// kwork хранит текст заказа с HTML-сущностями («&laquo;ЗНАК&raquo;»). Список — то, что реально встречается
// на kwork. Незнакомую сущность оставляем как есть: это лучше, чем потерять символ.
const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  laquo: "«", raquo: "»", mdash: "—", ndash: "–", bull: "•", hellip: "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isNaN(n) ? match : String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

// Данные лежат в <script> как `window.stateData={...};`. Находим конец объекта по парным скобкам,
// не считая скобки внутри строк, и отдаём кусок в JSON.parse.
function extractJsonAfter(html: string, marker: string): unknown {
  const start = html.indexOf(marker);
  if (start === -1) throw new Error(`kwork: не найден ${marker.slice(0, -1)}, похоже, вёрстка изменилась`);
  const from = start + marker.length;
  let depth = 0;
  let inString = false;
  for (let i = from; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(from, i + 1));
    }
  }
  throw new Error("kwork: stateData обрывается, не нашёл конец JSON");
}
