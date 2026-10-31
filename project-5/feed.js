import { wait } from "./util.js";

const DEFAULT_TICK_MS = 900;
const DEFAULT_VOLATILITY = 0.012;
const MIN_PRICE = 1;
const CONNECT_DELAY_MS = 600;

function cleanPrice(value) {
  const floored = value < MIN_PRICE ? MIN_PRICE + Math.random() : value;
  return Math.round(floored * 100) / 100;
}

export function createTick(symbol, price, prevPrice, time = Date.now()) {
  return {
    symbol,
    price,
    prevPrice,
    time,
    get delta() {
      return price - prevPrice;
    },
    get direction() {
      if (price > prevPrice) return "up";
      if (price < prevPrice) return "down";
      return "flat";
    },
  };
}

export function createMarketFeed(
  seed,
  { tickMs = DEFAULT_TICK_MS, volatility = DEFAULT_VOLATILITY } = {},
) {
  const prices = new Map();
  const listeners = new Map();
  let controller = null;

  for (const { symbol, price } of seed) {
    prices.set(symbol, price);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[feed] listener for "${event}" threw:`, err);
      }
    }
  }

  function symbols() {
    return [...prices.keys()];
  }

  function nextPrice(price) {
    const drift = (Math.random() - 0.5) * 2 * volatility;
    return cleanPrice(price * (1 + drift));
  }

  async function* stream(signal) {
    while (!signal.aborted) {
      await wait(tickMs, signal);
      if (signal.aborted) return;

      const all = symbols();
      const symbol = all[Math.floor(Math.random() * all.length)];
      const prev = prices.get(symbol);
      const next = nextPrice(prev);
      prices.set(symbol, next);

      yield createTick(symbol, next, prev);
    }
  }

  async function run(signal) {
    try {
      for await (const tick of stream(signal)) {
        emit("tick", tick);
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("[feed] stream error:", err);
        emit("error", err);
      }
    }
  }

  return {
    get connected() {
      return controller !== null;
    },

    get symbols() {
      return symbols();
    },

    priceOf(symbol) {
      return prices.get(symbol);
    },

    nudge(symbol, fraction) {
      if (!prices.has(symbol) || !fraction) return null;
      const prev = prices.get(symbol);
      const next = cleanPrice(prev * (1 + fraction));
      prices.set(symbol, next);
      emit("tick", createTick(symbol, next, prev));
      return next;
    },

    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return () => listeners.get(event)?.delete(callback);
    },

    connect() {
      emit("status", "connecting");
      return new Promise((resolve) => {
        setTimeout(() => {
          emit("status", "connected");
          resolve(this);
        }, CONNECT_DELAY_MS);
      });
    },

    start() {
      if (controller) return;
      controller = new AbortController();
      run(controller.signal);
      emit("status", "streaming");
    },

    stop() {
      controller?.abort();
      controller = null;
      emit("status", "stopped");
    },
  };
}
