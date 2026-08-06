// Client-side port of backend/app/routes/artisan.py — parses Artisan .alog exports
// (Python dict-literal syntax, occasionally valid JSON) directly in the browser,
// since there's no backend left to do it for us.

function pyLiteralToJson(text: string): string {
  let s = text
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null");

  let out = "";
  let i = 0;
  const n = s.length;
  while (i < n) {
    const ch = s[i];
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      let buf = "";
      while (j < n && s[j] !== quote) {
        if (s[j] === "\\" && j + 1 < n) {
          buf += s[j] + s[j + 1];
          j += 2;
          continue;
        }
        if (s[j] === '"') {
          buf += '\\"';
          j += 1;
          continue;
        }
        buf += s[j];
        j += 1;
      }
      out += '"' + buf + '"';
      i = j + 1;
      continue;
    }
    if (ch === "(") {
      out += "[";
      i++;
      continue;
    }
    if (ch === ")") {
      out += "]";
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  out = out.replace(/,\s*([\]}])/g, "$1");
  return out;
}

async function readAlogAsProfileData(text: string): Promise<Record<string, unknown>> {
  const trimmed = text.trim();
  try {
    const asJson = JSON.parse(trimmed);
    if (asJson && typeof asJson === "object") return asJson as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  try {
    const converted = pyLiteralToJson(trimmed);
    const asJson = JSON.parse(converted);
    if (asJson && typeof asJson === "object") return asJson as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new Error("No se pudo parsear el archivo .alog");
}

function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9 * 10) / 10;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function tryParseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

function parseRoastDate(pd: Record<string, unknown>): string {
  const iso = pd["roastisodate"];
  if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  const raw = pd["roastdate"];
  if (typeof raw === "string") {
    const parsed = tryParseDate(raw);
    if (parsed) return parsed;
  }
  return new Date().toISOString().slice(0, 10);
}

function detectRoastLevel(pd: Record<string, unknown>, dropTempC: number | null): "light" | "medium" | "dark" {
  const raw = (pd["roastlevel"] ?? pd["roast_level"] ?? "") as unknown;
  if (raw) {
    const l = String(raw).toLowerCase();
    if (l.includes("light") || l.includes("claro") || l.includes("ligero")) return "light";
    if (l.includes("dark") || l.includes("oscuro")) return "dark";
    if (l.includes("medium") || l.includes("medio")) return "medium";
  }
  if (dropTempC !== null) {
    if (dropTempC < 200) return "light";
    if (dropTempC < 215) return "medium";
    return "dark";
  }
  return "medium";
}

export interface ParsedAlogRoast {
  bean_origin: string;
  roast_date: string;
  roast_level: "light" | "medium" | "dark";
  green_weight_g?: number;
  roasted_weight_g?: number;
  charge_temp?: number;
  drop_temp?: number;
  roast_time_minutes?: number;
  profile_data: Record<string, unknown>;
}

export async function parseAlogFile(file: File): Promise<ParsedAlogRoast> {
  const text = await file.text();
  const profileData = await readAlogAsProfileData(text);
  const computed = (profileData["computed"] as Record<string, unknown>) ?? {};
  const useFahrenheit = String(profileData["mode"] ?? "").toUpperCase() === "F";

  let greenWeightG: number;
  let roastedWeightG: number;
  const weight = profileData["weight"];
  if (Array.isArray(weight) && weight.length >= 2) {
    greenWeightG = Math.trunc(Number(weight[0]));
    roastedWeightG = Math.trunc(Number(weight[1]));
  } else {
    const greenRaw = computed["weightin"] ?? profileData["beanin"];
    const roastedRaw = computed["weightout"] ?? profileData["beanout"];
    if (greenRaw == null || roastedRaw == null) {
      throw new Error("Faltan los pesos (verde/tostado) en el archivo .alog");
    }
    greenWeightG = Math.trunc(Number(greenRaw));
    roastedWeightG = Math.trunc(Number(roastedRaw));
  }
  if (!Number.isFinite(greenWeightG) || !Number.isFinite(roastedWeightG)) {
    throw new Error("Los valores de peso no son números válidos");
  }

  let beanOrigin =
    (profileData["title"] as string | undefined) ||
    String(profileData["beans"] ?? "").split("\n")[0] ||
    "Importado de Artisan";
  beanOrigin = beanOrigin.trim() || "Importado de Artisan";

  const roastDate = parseRoastDate(profileData);

  const chargeRaw = computed["CHARGE_BT"] ?? profileData["chargeTemp"];
  const dropRaw = computed["DROP_BT"] ?? profileData["dropTemp"];
  const toCelsius = (v: unknown): number | undefined => {
    const n = toNumber(v);
    if (n === null) return undefined;
    return Math.trunc(useFahrenheit ? fToC(n) : n);
  };
  const chargeTemp = toCelsius(chargeRaw);
  const dropTemp = toCelsius(dropRaw);

  const roastLevel = detectRoastLevel(profileData, dropTemp ?? null);

  const totalSeconds = toNumber(computed["totaltime"] ?? computed["DROP_time"]);
  const roastTimeMinutes = totalSeconds !== null ? Math.round((totalSeconds / 60) * 100) / 100 : undefined;

  return {
    bean_origin: beanOrigin,
    roast_date: roastDate,
    roast_level: roastLevel,
    green_weight_g: greenWeightG,
    roasted_weight_g: roastedWeightG,
    charge_temp: chargeTemp,
    drop_temp: dropTemp,
    roast_time_minutes: roastTimeMinutes,
    profile_data: profileData,
  };
}
