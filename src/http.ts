// Честный User-Agent: площадка видит, кто к ней ходит и зачем.
const USER_AGENT =
  "OrderRadar/0.1 (personal job alerts, 1 request / 5 min; +https://github.com/AbubakirDev-react/freelanceparser)";

// Сайт явно ограничил доступ. По правилам проекта обходы не ищем, просто останавливаемся.
export class BlockedError extends Error {}

export async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "ru" },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 403 || res.status === 429) {
    throw new BlockedError(`${url}: HTTP ${res.status}, сайт ограничил доступ`);
  }
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}
