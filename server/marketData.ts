export type SortKey = "age" | "liquidity" | "volume" | "momentum" | "potential" | "risk";
export type SparklineRange = "1h" | "4h" | "24h";

export type RadarToken = {
  id: string;
  chainId: string;
  chainName: string;
  dexId: string;
  pairAddress: string;
  tokenAddress: string;
  symbol: string;
  name: string;
  url: string;
  createdAt: number;
  ageMinutes: number;
  priceUsd: number | null;
  liquidityUsd: number;
  volume24h: number;
  priceChange5m: number;
  priceChange24h: number;
  txns24h: number;
  potentialScore: number;
  riskScore: number;
  potentialReasons: string[];
  riskReasons: string[];
  freshness: "fresh" | "aging" | "stale";
  dataTimestamp: number;
  profileLinks: string[];
  sparkline: number[];
};

type DexProfile = { chainId?: string; tokenAddress?: string; url?: string; links?: { label?: string; url?: string }[] };
type DexPair = {
  chainId?: string; dexId?: string; url?: string; pairAddress?: string; pairCreatedAt?: number;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string; liquidity?: { usd?: number }; volume?: { h24?: number }; priceChange?: { m5?: number; h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
};

const API = "https://api.dexscreener.com";
const GECKO_API = "https://api.geckoterminal.com/api/v2";
const geckoNetworks: Record<string, string> = { solana: "solana", ethereum: "eth", bsc: "bsc", base: "base", arbitrum: "arbitrum", polygon_pos: "polygon_pos" };
const chainNames: Record<string, string> = { solana: "Solana", ethereum: "Ethereum", bsc: "BNB Chain", base: "Base", arbitrum: "Arbitrum", polygon: "Polygon" };

function numberOr(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function scorePair(pair: DexPair, ageMinutes: number) {
  const liquidity = numberOr(pair.liquidity?.usd);
  const volume = numberOr(pair.volume?.h24);
  const momentum = numberOr(pair.priceChange?.h24);
  const buys = numberOr(pair.txns?.h24?.buys);
  const sells = numberOr(pair.txns?.h24?.sells);
  const potentialReasons: string[] = [];
  const riskReasons: string[] = [];
  let potential = 20;
  let risk = 40;
  if (liquidity >= 100000) { potential += 25; risk -= 12; potentialReasons.push("Thanh khoản đủ sâu cho một token mới"); }
  else if (liquidity >= 25000) { potential += 14; risk -= 4; potentialReasons.push("Thanh khoản ở mức theo dõi được"); }
  else { risk += 25; riskReasons.push("Thanh khoản thấp: dễ trượt giá và biến động mạnh"); }
  if (volume >= 250000) { potential += 22; potentialReasons.push("Khối lượng 24 giờ nổi bật"); }
  else if (volume >= 50000) { potential += 10; potentialReasons.push("Có hoạt động giao dịch ban đầu"); }
  else { risk += 10; riskReasons.push("Khối lượng 24 giờ còn mỏng"); }
  if (momentum > 10 && momentum < 250) { potential += 15; potentialReasons.push("Động lượng dương nhưng chưa vượt ngưỡng cực đoan"); }
  if (momentum >= 250) { risk += 18; riskReasons.push("Tăng giá cực đoan: rủi ro đảo chiều cao"); }
  if (momentum < -15) { risk += 15; riskReasons.push("Động lượng 24 giờ âm mạnh"); }
  const ratio = buys + sells > 0 ? buys / (buys + sells) : 0.5;
  if (ratio > 0.58) potential += 8;
  if (ageMinutes <= 60) { potential += 10; potentialReasons.push("Cặp giao dịch vừa được tạo"); }
  if (ageMinutes > 1440) risk -= 2;
  riskReasons.push("Dữ liệu holder concentration chưa có từ nguồn công khai này");
  riskReasons.push("Contract warning chưa được xác minh tự động; cần kiểm tra explorer trước khi đánh giá sâu");
  potential = Math.max(0, Math.min(100, Math.round(potential)));
  risk = Math.max(0, Math.min(100, Math.round(risk)));
  return { potential, risk, potentialReasons, riskReasons };
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "MemecoinRadar/1.0 research dashboard" } });
  if (!response.ok) throw new Error(`Public market data returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function getSparkline(chainId: string, pairAddress: string, range: SparklineRange): Promise<number[]> {
  const network = geckoNetworks[chainId];
  if (!network || !pairAddress) return [];
  try {
    const [timeframe, aggregate, limit] = range === "1h" ? ["minute", 5, 12] : range === "4h" ? ["hour", 1, 4] : ["hour", 1, 24];
    const data = await getJson<{ data?: { attributes?: { ohlcv_list?: number[][] } } }>(`${GECKO_API}/networks/${network}/pools/${pairAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}`);
    return (data.data?.attributes?.ohlcv_list ?? []).map(candle => Number(candle[4])).filter(Number.isFinite).reverse();
  } catch { return []; }
}

export async function discoverTokens(args: { chain?: string; search?: string; sort?: SortKey; minVolume24h?: number; maxVolume24h?: number; sparklineRange?: SparklineRange; limit?: number }): Promise<{ tokens: RadarToken[]; fetchedAt: number; source: string; warning?: string }> {
  const fetchedAt = Date.now();
  try {
    const profiles = await getJson<DexProfile[]>(`${API}/token-profiles/latest/v1`);
    const selected = profiles.filter(p => !args.chain || args.chain === "all" || p.chainId === args.chain).slice(0, 18);
    const results = await Promise.all(selected.map(async profile => {
      if (!profile.chainId || !profile.tokenAddress) return null;
      try {
        const data = await getJson<{ pairs?: DexPair[] }>(`${API}/latest/dex/tokens/${profile.tokenAddress}`);
        const pair = (data.pairs ?? []).filter(p => p.chainId === profile.chainId).sort((a, b) => numberOr(b.liquidity?.usd) - numberOr(a.liquidity?.usd))[0];
        if (!pair?.pairCreatedAt || !pair.baseToken) return null;
        const ageMinutes = Math.max(0, Math.round((fetchedAt - pair.pairCreatedAt) / 60000));
        const scored = scorePair(pair, ageMinutes);
        const freshness = ageMinutes < 15 ? "fresh" : ageMinutes < 60 ? "aging" : "stale";
        const chainId = pair.chainId;
        if (!chainId) return null;
        const sparkline = await getSparkline(chainId, pair.pairAddress ?? "", args.sparklineRange ?? "24h");
        const token: RadarToken = {
          id: `${chainId}:${pair.pairAddress}`,
          chainId, chainName: chainNames[chainId] ?? chainId, dexId: pair.dexId ?? "DEX", pairAddress: pair.pairAddress ?? "", tokenAddress: profile.tokenAddress,
          symbol: pair.baseToken.symbol ?? "UNKNOWN", name: pair.baseToken.name ?? "Unnamed token", url: pair.url ?? profile.url ?? "https://dexscreener.com",
          createdAt: pair.pairCreatedAt, ageMinutes, priceUsd: pair.priceUsd ? numberOr(pair.priceUsd, NaN) : null, liquidityUsd: numberOr(pair.liquidity?.usd), volume24h: numberOr(pair.volume?.h24), priceChange5m: numberOr(pair.priceChange?.m5), priceChange24h: numberOr(pair.priceChange?.h24), txns24h: numberOr(pair.txns?.h24?.buys) + numberOr(pair.txns?.h24?.sells),
          potentialScore: scored.potential, riskScore: scored.risk + (freshness === "stale" ? 10 : 0), potentialReasons: scored.potentialReasons, riskReasons: freshness === "stale" ? [...scored.riskReasons, "Dữ liệu đã cũ so với thời điểm tải dashboard"] : scored.riskReasons, freshness, dataTimestamp: fetchedAt, sparkline, profileLinks: (profile.links ?? []).map(l => l.url).filter((url): url is string => Boolean(url)),
        };
        return token;
      } catch { return null; }
    }));
    let tokens = results.filter((token): token is RadarToken => Boolean(token));
    if (args.search) { const q = args.search.toLowerCase(); tokens = tokens.filter(t => `${t.symbol} ${t.name} ${t.chainName}`.toLowerCase().includes(q)); }
    if (args.minVolume24h !== undefined) tokens = tokens.filter(t => t.volume24h >= args.minVolume24h!);
    if (args.maxVolume24h !== undefined) tokens = tokens.filter(t => t.volume24h <= args.maxVolume24h!);
    const key = args.sort ?? "potential";
    tokens.sort((a, b) => key === "age" ? a.ageMinutes - b.ageMinutes : key === "liquidity" ? b.liquidityUsd - a.liquidityUsd : key === "volume" ? b.volume24h - a.volume24h : key === "momentum" ? b.priceChange24h - a.priceChange24h : key === "risk" ? b.riskScore - a.riskScore : b.potentialScore - a.potentialScore);
    return { tokens: tokens.slice(0, args.limit ?? 12), fetchedAt, source: "API công khai DEX Screener" };
  } catch (error) {
    return { tokens: [], fetchedAt, source: "API công khai DEX Screener", warning: error instanceof Error ? error.message : "Không thể tải dữ liệu công khai" };
  }
}
