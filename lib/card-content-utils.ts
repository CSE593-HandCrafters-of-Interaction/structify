import type {
  BulletContent,
  SliderContent,
  CardContent,
  IncomingContent,
} from "./card-content-types";

export function normalizeCardContent(raw: IncomingContent): CardContent | undefined {
  if (Array.isArray(raw)) {
    const items = raw
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);
    if (!items.length) return undefined;
    return { type: "bullet", items };
  }

  if (!raw || typeof raw !== "object") return undefined;

  // raw is now guaranteed to be CardContent
  const cardRaw = raw as CardContent;

  if (cardRaw.type === "bullet") {
    const rawItems = cardRaw.items;
    if (!Array.isArray(rawItems)) return undefined;
    const items = rawItems
      .map((line: unknown) =>
        typeof line === "string" ? line.trim() : "",
      )
      .filter((line: string) => line.length > 0);
    if (!items.length) return undefined;
    return { type: "bullet", items };
  }

  if (cardRaw.type === "slider") {
    const toNumber = (v: unknown): number | undefined =>
      typeof v === "number" && Number.isFinite(v) ? v : undefined;

    let value = toNumber(cardRaw.value);
    let min = toNumber(cardRaw.min);
    let max = toNumber(cardRaw.max);
    let step = toNumber(cardRaw.step);

    if (min === undefined && max === undefined && value !== undefined) {
      min = Math.max(0, Math.floor(value * 0.5));
      max = Math.ceil(value * 1.5);
    }
    if (min === undefined) min = 0;
    if (max === undefined) max = min + 100;
    if (value === undefined) value = Math.min(Math.max(min, 0), max);
    if (step === undefined || step <= 0) {
      step = Math.max(1, Math.round((max - min) / 10));
    }

    if (max < min) {
      const tmp = max;
      max = min;
      min = tmp;
    }

    if (value < min) value = min;
    if (value > max) value = max;

    return {
      type: "slider",
      value,
      min,
      max,
      step,
    };
  }

  return undefined;
}

export function formatContentForPrompt(
  content: IncomingContent,
): { typeLabel: string; text: string } {
  const normalized = normalizeCardContent(content);
  if (!normalized) {
    return {
      typeLabel: "none",
      text: "(empty)",
    };
  }

  if (normalized.type === "bullet") {
    return {
      typeLabel: "bullet",
      text: normalized.items.map((item) => `- ${item}`).join("\n"),
    };
  }

  return {
    typeLabel: "slider",
    text: [
      `value: ${normalized.value}`,
      `min: ${normalized.min}`,
      `max: ${normalized.max}`,
      `step: ${normalized.step}`,
    ].join("\n"),
  }
}

export function extractBulletItems(content: IncomingContent): string[] {
  if (Array.isArray(content)) {
    return content
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);
  }

  if (isBulletContent(content)) {
    return (content.items || [])
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);
  }

  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBulletContent(value: any): value is BulletContent {
  return (
    value &&
    typeof value === "object" &&
    value.type === "bullet" &&
    Array.isArray(value.items)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSliderContent(value: any): value is SliderContent {
  return (
    value &&
    typeof value === "object" &&
    value.type === "slider" &&
    typeof value.value === "number" &&
    typeof value.min === "number" &&
    typeof value.max === "number" &&
    typeof value.step === "number"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractJsonObject(text: string): any | null {
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const jsonText = trimmed.slice(start, end + 1);
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("[extractJsonObject] Failed to parse JSON:", e);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeModelOutput(json: any, fallback: BulletContent): CardContent {
  if (!json || typeof json !== "object") {
    return fallback;
  }

  if (json.type === "slider") {
    const v = Number(json.value);
    const min = Number(json.min);
    const max = Number(json.max);
    let step = Number(json.step);

    if (!Number.isFinite(v) || !Number.isFinite(min) || !Number.isFinite(max)) {
      return fallback;
    }

    let value = Math.round(v);
    let minVal = Math.round(min);
    let maxVal = Math.round(max);

    if (maxVal < minVal) {
      const tmp = maxVal;
      maxVal = minVal;
      minVal = tmp;
    }

    if (!Number.isFinite(step) || step <= 0) {
      step = Math.max(1, Math.round((maxVal - minVal) / 10) || 1);
    }

    if (value < minVal) value = minVal;
    if (value > maxVal) value = maxVal;

    const slider: SliderContent = {
      type: "slider",
      value,
      min: minVal,
      max: maxVal,
      step,
    };
    return slider;
  }

  if (json.type === "bullet" && Array.isArray(json.items)) {
    const items = (json.items as unknown[])
      .map((line) => (typeof line === "string" ? line.trim() : ""))
      .filter((line) => line.length > 0);

    if (!items.length) return fallback;

    const bullet: BulletContent = {
      type: "bullet",
      items,
    };
    return bullet;
  }

  return fallback;
}

