import { wait } from "./util.js";

const DEFAULT_MIN_MS = 4000;
const DEFAULT_MAX_MS = 9000;
const IMPACT_TO_PRICE = 0.04;
const MIN_IMPACT = 0.3;
const MAX_IMPACT = 1.0;

export function createHeadline({
  symbol,
  text,
  sentiment,
  impact,
  time = Date.now(),
}) {
  return {
    symbol,
    text,
    sentiment,
    impact,
    time,

    get priceEffect() {
      if (sentiment === "bullish") return impact * IMPACT_TO_PRICE;
      if (sentiment === "bearish") return -impact * IMPACT_TO_PRICE;
      return 0;
    },
  };
}

const TEMPLATES = {
  bullish: [
    "{name} beats quarterly earnings expectations",
    "Analysts upgrade {name} to 'strong buy'",
    "{name} announces record product pre-orders",
    "{name} lands major enterprise contract",
    "{name} raises full-year revenue guidance",
  ],
  bearish: [
    "{name} misses revenue targets, shares slip",
    "Regulators open probe into {name}",
    "{name} warns of supply-chain disruptions",
    "Analysts downgrade {name} on margin concerns",
    "{name} faces class-action lawsuit",
  ],
  neutral: [
    "{name} to present at industry conference",
    "{name} names new board member",
    "{name} schedules earnings call for next week",
    "Mixed reaction to {name}'s latest keynote",
  ],
};

const SENTIMENTS = ["bullish", "bearish", "neutral"];

export function createNewsWire(
  instruments,
  { minMs = DEFAULT_MIN_MS, maxMs = DEFAULT_MAX_MS } = {},
) {
  const items = instruments.map(({ symbol, name }) => ({ symbol, name }));
  const listeners = new Map();
  let controller = null;

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[news] listener for "${event}" threw:`, err);
      }
    }
  }

  function generate() {
    const inst = items[Math.floor(Math.random() * items.length)];
    const sentiment = SENTIMENTS[Math.floor(Math.random() * SENTIMENTS.length)];
    const pool = TEMPLATES[sentiment];
    const text = pool[Math.floor(Math.random() * pool.length)].replace(
      "{name}",
      inst.name,
    );
    const impact =
      sentiment === "neutral"
        ? 0
        : MIN_IMPACT + Math.random() * (MAX_IMPACT - MIN_IMPACT);

    return createHeadline({
      symbol: inst.symbol,
      text,
      sentiment,
      impact: Math.round(impact * 100) / 100,
    });
  }

  async function run(signal) {
    try {
      while (!signal.aborted) {
        const delay = minMs + Math.random() * (maxMs - minMs);
        await wait(delay, signal);
        if (signal.aborted) return;
        emit("headline", generate());
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("[news] wire error:", err);
        emit("error", err);
      }
    }
  }

  return {
    get running() {
      return controller !== null;
    },

    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return () => listeners.get(event)?.delete(callback);
    },

    start() {
      if (controller) return;
      controller = new AbortController();
      run(controller.signal);
    },

    stop() {
      controller?.abort();
      controller = null;
    },
  };
}
