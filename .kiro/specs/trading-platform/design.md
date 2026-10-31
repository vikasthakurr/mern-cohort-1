# Design Document

## Overview

A single-page, no-build paper-trading app written in vanilla JavaScript using ES modules. The app lets a user fund a virtual account, browse stocks, watch a live-updating price chart, place simulated buy/sell orders, track a portfolio, and consult a Gemini-assisted chatbot for stock reviews and recent news.

Everything runs client-side in the browser. There is no server and no bundler: `index.html` imports ES modules directly, and Chart.js is loaded from a CDN as an ES module. All persistent state (cash balance, holdings, transactions, API keys) lives in `localStorage`, consistent with the other projects in this repo.

The project is built into the existing (mostly empty) `project-5` folder. The existing `utils.js` (`wait(ms, signal)` helper) and `gemini.js` (Gemini `fetch` pattern) are reused/repurposed; the other files (`app.js`, `feed.js`, `news.js`, `portfolio.js`, `style.css`, `index.html`) are currently empty and will be filled in.

### Goals

- Realistic-feeling paper trading with live price motion, correct cash/holdings accounting, and persisted history.
- Clear separation of concerns across small ES modules.
- Resilient AI/news integration that degrades gracefully when keys are missing or requests fail.

### Non-Goals

- No real money, no brokerage connectivity, no server-side component.
- No user authentication beyond the single local browser profile.
- No backtesting engine or advanced order types (limit/stop) in this iteration — market orders at the current simulated price only.

## Architecture

### Module Map

```
project-5/
  index.html        # layout, regions, module + Chart.js imports
  style.css         # responsive layout, gain/loss theming
  app.js            # entry point: wires modules, owns app state, event handling
  store.js          # localStorage read/write + state schema + migrations/fallback
  market.js         # stock universe + simulated price engine (random walk)
  feed.js           # live tick scheduler (start/stop/pause), uses utils.wait
  chart.js          # Chart.js wrapper: create, append tick, reset, destroy
  portfolio.js      # pure trading logic: buy/sell, cost basis, P/L, valuation
  gemini.js         # Gemini chat + stock review requests (repurposed)
  news.js           # market-news API fetch + rendering
  utils.js          # shared helpers (existing wait(); add formatters)
```

### Data Flow

```
            +-----------+       tick        +-----------+
            |  feed.js  |------------------->|  app.js   |
            | (timer)   |                    | (state)   |
            +-----------+                    +-----+-----+
                  ^                                 |
                  | price from                      | render
                  |                                 v
            +-----------+   +-----------+   +-----------+   +-----------+
            | market.js |   | chart.js  |   |portfolio.js|  |  DOM UI   |
            | (prices)  |   | (Chart.js)|   | (accounting)| | (regions) |
            +-----------+   +-----------+   +-----------+   +-----------+
                  |                                 ^
                  v                                 |
            +-----------+   on any state change     |
            | store.js  |<--------------------------+
            | (persist) |
            +-----------+

            +-----------+   context    +-----------+
            |  app.js    |------------>|  gemini.js | --> Gemini API
            |            |             +-----------+
            |            |   context    +-----------+
            |            |------------>|  news.js   | --> News API
            +-----------+             +-----------+
```

`app.js` is the single owner of in-memory state and the only module that touches the DOM for the main regions (list, chart header, trade panel, portfolio). Logic modules (`market`, `portfolio`) are pure and DOM-free so they are easy to reason about and test. `gemini.js` and `news.js` own their own panels' DOM.

### Why client-side simulation

Per the requirements decision, prices are simulated client-side with a random walk seeded per symbol. This keeps the app fully functional offline, avoids quote-API rate limits/keys for the core trading loop, and makes the "live chart" deterministic to drive. The news feature still calls a real API because headlines can't be simulated usefully.

## Components and Interfaces

### store.js — persistence & state schema

Single source of truth for the persisted shape. Namespaced keys avoid collisions with other projects.

```js
// Keys
const STORE_KEY = "tradesim.state.v1";
const GEMINI_KEY = "tradesim.geminiKey";
const NEWS_KEY   = "tradesim.newsKey";

// State schema (persisted)
{
  version: 1,
  funded: false,          // has the user completed initial funding?
  cash: 0,                // available virtual cash
  holdings: {             // symbol -> position
    AAPL: { qty: 10, avgCost: 182.34 }
  },
  transactions: [         // most-recent-first appended, newest at index 0
    { id, type: "BUY"|"SELL", symbol, qty, price, total, realizedPL?, ts }
  ]
}

// API
export function loadState()                // returns state or clean default; never throws
export function saveState(state)           // serializes to localStorage
export function clearState()               // reset account (keeps nothing)
export function getGeminiKey() / setGeminiKey(k)
export function getNewsKey() / setNewsKey(k)
```

Corrupt/missing JSON -> caught, logged, returns `defaultState()` (Req 8.3).

### market.js — stock universe + price engine

```js
export const UNIVERSE = [
  { symbol: "AAPL", name: "Apple Inc.",        base: 182 },
  { symbol: "MSFT", name: "Microsoft Corp.",   base: 410 },
  { symbol: "GOOGL",name: "Alphabet Inc.",     base: 168 },
  // ~10-12 symbols
];

// Price engine: per-symbol random walk with mean drift + volatility
export function createMarket()              // returns a market instance
market.getPrice(symbol)                     // current price
market.getQuote(symbol)                     // { price, open, change, changePct }
market.tick()                               // advance all symbols one step
market.getName(symbol)
```

Each symbol tracks `open` (session open for the day's change calc) and `price`. `tick()` nudges each price by a bounded random step (`price *= 1 + gaussian(0, vol)`), floored at a small positive value. Prices are stored in memory only; they are re-seeded from `base` on reload (holdings still value correctly against the live price).

### feed.js — live tick scheduler

Wraps a start/stop loop around `market.tick()` using the existing `utils.wait(ms, signal)` so it is cleanly cancelable (addresses Req 3.6 — no duplicate timers).

```js
export function createFeed(market, { intervalMs = 2000, onTick }) {
  // returns { start(), stop(), setInterval(ms), isRunning() }
}
```

Internally uses an `AbortController`; `stop()` aborts the pending `wait`, guaranteeing a single active loop. `onTick(quotes)` is called after each `market.tick()` so `app.js` can update the active chart, prices, and portfolio valuation.

### chart.js — Chart.js wrapper

Chart.js imported from CDN as an ES module:

```html
<script type="importmap">
{ "imports": { "chart.js/auto": "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm" } }
</script>
```

```js
import Chart from "chart.js/auto";

export function createPriceChart(canvasEl)  // returns controller
controller.reset(symbol, seedPoints)        // clear + seed when active stock changes
controller.push(price, ts)                  // append a tick, trim to window (e.g. 60 points)
controller.destroy()
```

A rolling window (configurable, default ~60 points) keeps the chart readable and bounded. Switching active stock calls `reset()` rather than creating a new Chart instance, avoiding leaks and duplicate canvases (Req 3.6).

### portfolio.js — trading logic (pure)

DOM-free, returns new values and never mutates `localStorage` directly — `app.js` persists the result.

```js
export function quoteCost(price, qty)                    // price * qty (buy estimate)
export function quoteProceeds(price, qty)                // price * qty (sell estimate)

export function buy(state, symbol, qty, price)
// -> { ok: true, state: newState, tx } | { ok: false, error }
//    validates qty (positive integer) and cost <= cash;
//    updates cash, holdings[symbol].qty, avgCost (weighted);
//    appends BUY transaction.

export function sell(state, symbol, qty, price)
// -> { ok: true, state: newState, tx } | { ok: false, error }
//    validates qty (positive integer) and qty <= held;
//    updates cash, reduces qty (removes holding at 0);
//    computes realizedPL = (price - avgCost) * qty;
//    appends SELL transaction.

export function valuation(state, market)
// -> { cash, positions:[{symbol, qty, avgCost, price, marketValue, unrealizedPL, unrealizedPct}],
//      holdingsValue, totalValue }
```

Average cost basis on buy: `avgCost' = (avgCost*qty + price*buyQty) / (qty + buyQty)`. Sell leaves `avgCost` unchanged and realizes P/L against it.

### gemini.js — AI chat + stock review (repurposed)

Keeps the existing project's request pattern (`fetch` to `generativelanguage.googleapis.com`, key in `localStorage`, graceful error handling) but changes the prompts and UI hooks from the resume use case to trading.

```js
export function initChatbot({ getContext })
// getContext() -> { symbol, name, quote, position, recentPrices }

// Two entry points:
//  - "Review this stock" button -> buildReviewPrompt(context)
//  - free-form chat input -> buildChatPrompt(context, userMessage)
```

- `buildReviewPrompt`: asks Gemini for a concise, clearly-labeled simulated-trading review (trend read of recent prices, the user's position context, risk notes) with an explicit "not financial advice" framing.
- `buildChatPrompt`: forwards the user's question plus compact stock context; renders responses into a scrolling chat transcript.
- Reuses `requestGemini(apiKey, prompt)` (unchanged request shape). Missing key -> inline prompt to add one (Req 7.5). In-flight -> button disabled + loading state (Req 7.7).

The model constant is centralized; the existing files use `gemini-3.6-flash`, which will be reused for consistency.

### news.js — market news

```js
export function initNews({ getSymbol })
export async function fetchNews(symbol, apiKey)   // -> [{ title, source, url, publishedAt }]
```

Default provider: **Finnhub** (`/company-news`), chosen because a single free key also covers quotes if we later want real prices, and it returns per-symbol headlines. The provider detail is isolated to `news.js` so it can be swapped. Missing/invalid key or request failure -> non-blocking message in the news panel (Req 7.4, 7.6). Rendered links open in a new tab with `rel="noopener"`.

### app.js — entry point & orchestration

Responsibilities:
- On load: `loadState()`; if `!funded`, show funding modal (Req 1). Else rehydrate UI.
- Build the stock list (Req 2); wire search filter; handle selection -> set active symbol, `chart.reset`, start/refresh feed subscription.
- Own the live `onTick` handler: update active quote header, push to chart, recompute valuation, re-render portfolio (Req 3, 6).
- Trade panel: live cost/proceeds estimate; confirm -> call `portfolio.buy/sell`; on success persist via `saveState` and re-render; on failure show inline error (Req 4, 5).
- Funding/add-funds/reset controls (Req 1.5, 1.6) with confirmation for reset.
- Provide `getContext()` to `gemini.js` and `getSymbol()` to `news.js`.

## Data Models

```
State
  version:Int, funded:Bool, cash:Number
  holdings: Map<symbol, { qty:Int, avgCost:Number }>
  transactions: List<Transaction>   // newest first

Transaction
  id:String, type:"BUY"|"SELL", symbol:String, qty:Int,
  price:Number, total:Number, realizedPL:Number?, ts:Number(epoch ms)

Quote (in-memory, from market.js)
  symbol, name, price, open, change, changePct

Position (derived, from valuation)
  symbol, qty, avgCost, price, marketValue, unrealizedPL, unrealizedPct
```

## Error Handling

| Scenario | Handling | Req |
|---|---|---|
| Corrupt/missing localStorage | `try/catch` in `loadState` -> clean default | 8.3 |
| Invalid funding amount | Inline validation, no state change | 1.2 |
| Buy cost > cash | Reject, "insufficient funds", no state change | 4.3 |
| Sell qty > holdings | Reject, inline error, no state change | 5.3 |
| Invalid qty (<=0, non-integer) | Reject with validation message | 4.6, 5.6 |
| Missing Gemini key | Inline prompt, no API call | 7.5 |
| Gemini/News request fails | Non-blocking panel error; app stays functional | 7.6 |
| Duplicate in-flight AI/news request | Disable control + loading state | 7.7 |
| Active-stock switch | `feed` keeps one loop; `chart.reset` replaces series | 3.6 |

## Testing Strategy

No framework is set up and the user hasn't requested automated tests, so verification is primarily manual, with the pure logic written to be testable later.

- **Manual smoke flow:** fund -> select stock -> watch chart tick -> buy -> see holding + cash drop -> sell partial -> see realized P/L + history -> reload -> state restored -> reset -> back to funding.
- **Pure-function checks (portfolio.js):** buy/sell math, avg-cost weighting, realized P/L, insufficient-funds and over-sell rejections, zero-out removes holding. These functions are intentionally pure so they can be exercised in the browser console (or a lightweight test runner later) without DOM.
- **Edge cases to exercise manually:** empty portfolio valuation, selling entire position, invalid quantities, missing API keys, forced API failure (bad key) to confirm graceful degradation.
- **Persistence:** corrupt the `tradesim.state.v1` value manually and confirm the app recovers to a clean state without crashing.

## Key Design Decisions

1. **Client-side simulated prices** (random walk) for the core loop; real API reserved for news. Rationale: offline-capable, no rate limits, deterministic chart motion; matches the "simulated" requirement.
2. **Single state owner (`app.js`) + pure logic modules.** Rationale: predictable rendering, DOM-free accounting that's easy to verify.
3. **`AbortController`-based feed loop reusing existing `utils.wait`.** Rationale: guarantees a single tick loop and clean cancellation on stock switch/pause (Req 3.6), and reuses code already in the repo.
4. **Chart reused via `reset()` not recreated.** Rationale: avoids Chart.js instance/canvas leaks.
5. **No build step; Chart.js via importmap + ESM CDN.** Rationale: matches the repo's static, buildless convention.
6. **Finnhub as the default (swappable) news provider.** Rationale: single free key, per-symbol company news, and a path to real quotes later; isolated behind `news.js`.
7. **Reuse the existing `gemini.js` request shape and model constant.** Rationale: consistency with project-3/5 and less surface area to get wrong.
