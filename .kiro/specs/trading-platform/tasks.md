# Implementation Plan

- [x] 1. Set up project shell and shared utilities
  - Create `index.html` with the single-page layout regions (stock list, chart, trade panel, portfolio, chatbot, news) and the Chart.js importmap + module `<script type="module" src="app.js">` entry.
  - Create `style.css` with a responsive layout and gain/loss color variables.
  - Extend `utils.js` with formatters (`formatMoney`, `formatPct`, `formatQty`, `uid`, `clamp`) alongside the existing `wait`.
  - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4_

- [x] 2. Implement persistent state store (`store.js`)
  - Define `STORE_KEY`, `GEMINI_KEY`, `NEWS_KEY` and the `defaultState()` factory.
  - Implement `loadState()` with try/catch fallback to a clean default on missing/corrupt JSON, `saveState(state)`, and `clearState()`.
  - Implement `getGeminiKey/setGeminiKey` and `getNewsKey/setNewsKey`.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 1.3, 1.4_

- [x] 3. Implement the market price engine (`market.js`)
  - Define the `UNIVERSE` of ~10-12 symbols with name and base price.
  - Implement `createMarket()` with per-symbol state (`price`, `open`), `getPrice`, `getQuote` (price/open/change/changePct), `getName`, and `tick()` random-walk advance with bounded step and positive floor.
  - _Requirements: 2.1, 2.3, 3.2_

- [x] 4. Implement the pure trading logic (`portfolio.js`)
  - Implement `quoteCost` and `quoteProceeds` estimate helpers.
  - Implement `buy(state, symbol, qty, price)`: validate positive-integer qty and cost <= cash; update cash, holdings qty, weighted avgCost; append BUY transaction; return `{ok, state, tx}` or `{ok:false, error}`.
  - Implement `sell(state, symbol, qty, price)`: validate positive-integer qty and qty <= held; update cash, reduce qty (remove holding at 0); compute realized P/L vs avgCost; append SELL transaction.
  - Implement `valuation(state, market)` returning cash, positions with marketValue/unrealized P/L, holdingsValue, and totalValue.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2_

- [x] 5. Implement the live tick scheduler (`feed.js`)
  - Implement `createFeed(market, { intervalMs, onTick })` using an `AbortController` + the existing `utils.wait` so only one loop can run.
  - Expose `start()`, `stop()` (aborts pending wait), `setInterval(ms)`, and `isRunning()`; call `market.tick()` then `onTick(quotes)` each cycle.
  - _Requirements: 3.2, 3.4, 3.6_

- [x] 6. Implement the chart wrapper (`chart.js`)
  - Import `chart.js/auto` via the importmap; implement `createPriceChart(canvasEl)`.
  - Implement `reset(symbol, seedPoints)`, `push(price, ts)` with a rolling window trim, and `destroy()`; reuse a single Chart instance across stock switches.
  - _Requirements: 3.1, 3.3, 3.5, 3.6_

- [x] 7. Build initial funding and account controls in `app.js`
  - On load, call `loadState()`; if `!funded`, show the funding modal; validate positive numeric amount; on submit set cash, mark funded, persist, and dismiss.
  - Wire "Add funds" (adds to balance) and "Reset account" (confirm, then `clearState()` and return to funding).
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1_

- [x] 8. Build stock list, search, and active-stock selection in `app.js`
  - Render the stock list with symbol + current price from `market`; implement the search/filter input.
  - On selection, set active symbol, render the stock header (symbol, name, price, change), call `chart.reset`, and (re)start the feed subscription for rendering.
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 9. Wire the live update loop in `app.js`
  - Implement the `onTick` handler: update stock-list prices, the active header, push to the chart, recompute `valuation`, and re-render the portfolio and total value.
  - Add pause/resume and (optional) interval/time-window controls mapped to `feed` and `chart`.
  - Ensure switching the active stock does not create duplicate timers or chart series.
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2_

- [x] 10. Build the trade panel (buy/sell) in `app.js`
  - Render quantity input with a live cost/proceeds estimate from `portfolio.quoteCost/quoteProceeds`.
  - Wire Buy and Sell to `portfolio.buy/sell`; on success `saveState` and re-render portfolio + history; on failure show the inline error (insufficient funds, over-sell, invalid qty).
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 11. Build the portfolio and transaction-history views in `app.js`
  - Render the holdings table (symbol, qty, avg cost, current price, market value, unrealized P/L) with gain/loss coloring, the cash balance, and total portfolio value.
  - Render the transaction history newest-first (type, symbol, qty, price, total, timestamp); rehydrate both from persisted state on load.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.2, 9.3_

- [x] 12. Repurpose the Gemini chatbot (`gemini.js`)
  - Replace the resume prompts with `buildReviewPrompt(context)` and `buildChatPrompt(context, message)`; keep the existing `requestGemini` shape, model constant, and key-in-localStorage handling.
  - Implement `initChatbot({ getContext })`: a "Review this stock" button and a free-form chat transcript; missing-key inline prompt; loading/disabled state while in flight; non-blocking error on failure.
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 7.7, 8.4_

- [x] 13. Implement the news panel (`news.js`)
  - Implement `fetchNews(symbol, apiKey)` against Finnhub `company-news` (isolated so the provider can be swapped); render headlines with source, link (new tab, `rel="noopener"`), and date.
  - Implement `initNews({ getSymbol })` with a news-key input (stored via `store`), a refresh action, missing-key prompt, and non-blocking error handling.
  - _Requirements: 7.4, 7.6, 7.7, 8.4_

- [x] 14. Final wiring, polish, and manual verification pass
  - Confirm `app.js` provides `getContext()` to `gemini.js` and `getSymbol()` to `news.js`, and that all regions re-render consistently on state changes.
  - Add success/failure feedback (status text/toast), accessible labels, and keyboard operability for the controls.
  - Run the manual smoke flow (fund -> select -> tick -> buy -> sell -> reload -> reset) and the persistence corruption-recovery check from the design's testing strategy; fix any issues found.
  - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5_
