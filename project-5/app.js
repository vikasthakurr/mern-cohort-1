import { createMarketFeed } from "./feed.js";
import {
  createInstrument,
  createPortfolio,
  isOrderError,
  STARTING_CASH,
} from "./portfolio.js";
import { createNewsWire } from "./news.js";
import { createGeminiAnalyst } from "./gemini.js";

const SEED = [
  { symbol: "AAPL", name: "Apple Inc.", price: 224.31 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 418.9 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 128.44 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 246.12 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 186.55 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 165.28 },
];

const instruments = new Map(SEED.map((s) => [s.symbol, createInstrument(s)]));
const portfolio = createPortfolio(STARTING_CASH);
const feed = createMarketFeed(
  SEED.map(({ symbol, price }) => ({ symbol, price })),
);
const newsWire = createNewsWire(
  SEED.map(({ symbol, name }) => ({ symbol, name })),
);
const analyst = createGeminiAnalyst();

const priceLookup = (symbol) => instruments.get(symbol)?.price ?? 0;

let selectedSymbol = SEED[0].symbol;
let orderSide = "buy";
const recentNews = [];

const $ = (id) => document.getElementById(id);

const el = {
  connBadge: $("connBadge"),
  feedBtn: $("feedBtn"),
  cashValue: $("cashValue"),
  holdingsValue: $("holdingsValue"),
  netValue: $("netValue"),
  watchlist: $("watchlist"),
  detailSymbol: $("detailSymbol"),
  detailName: $("detailName"),
  quotePrice: $("quotePrice"),
  quoteChange: $("quoteChange"),
  sparklinePath: $("sparklinePath"),
  orderForm: $("orderForm"),
  orderQty: $("orderQty"),
  orderEst: $("orderEst"),
  orderSubmit: $("orderSubmit"),
  orderMsg: $("orderMsg"),
  positionValue: $("positionValue"),
  tradeLog: $("tradeLog"),
  logCount: $("logCount"),
  newsFeed: $("newsFeed"),
  analystModel: $("analystModel"),
  geminiKey: $("geminiKey"),
  briefBtn: $("briefBtn"),
  analystStatus: $("analystStatus"),
  analystOutput: $("analystOutput"),
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const fmt = (n) => money.format(n);
const pct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function buildWatchlist() {
  el.watchlist.replaceChildren();
  for (const inst of instruments.values()) {
    const li = document.createElement("li");
    li.className = "ticker-row";
    li.dataset.symbol = inst.symbol;
    li.innerHTML = `
      <span class="sym">
        <span class="sym-ticker">${inst.symbol}</span>
        <span class="sym-name">${inst.name}</span>
      </span>
      <span class="last num" data-role="last">${fmt(inst.price)}</span>
      <span class="chg num" data-role="chg"></span>
    `;
    el.watchlist.append(li);
  }
  updateSelectionHighlight();
  for (const inst of instruments.values()) paintRow(inst);
}

function paintRow(inst, flash = null) {
  const row = el.watchlist.querySelector(`[data-symbol="${inst.symbol}"]`);
  if (!row) return;
  row.querySelector('[data-role="last"]').textContent = fmt(inst.price);

  const chg = row.querySelector('[data-role="chg"]');
  const dir = inst.changePct >= 0 ? "up" : "down";
  chg.textContent = pct(inst.changePct);
  chg.className = `chg num ${dir}`;

  if (flash) {
    row.classList.remove("flash-up", "flash-down");
    void row.offsetWidth;
    row.classList.add(flash === "up" ? "flash-up" : "flash-down");
  }
}

function updateSelectionHighlight() {
  for (const row of el.watchlist.children) {
    row.classList.toggle("active", row.dataset.symbol === selectedSymbol);
  }
}

function renderDetail() {
  const inst = instruments.get(selectedSymbol);
  if (!inst) return;

  el.detailSymbol.textContent = inst.symbol;
  el.detailName.textContent = inst.name;
  el.quotePrice.textContent = fmt(inst.price);

  const dir = inst.changePct >= 0 ? "up" : "down";
  el.quoteChange.textContent = pct(inst.changePct);
  el.quoteChange.className = `quote-change ${dir}`;

  drawSparkline(inst.history);
  renderPosition(inst);
  renderEstimate();
}

function drawSparkline(history) {
  if (history.length < 2) {
    el.sparklinePath.setAttribute("points", "");
    return;
  }
  const w = 300;
  const h = 80;
  const pad = 4;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const step = w / (history.length - 1);

  const points = history
    .map((price, i) => {
      const x = i * step;
      const y = pad + (h - pad * 2) * (1 - (price - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  el.sparklinePath.setAttribute("points", points);
}

function renderPosition(inst) {
  const pos = portfolio.positions.get(inst.symbol);
  if (!pos || !pos.isOpen) {
    el.positionValue.textContent = "No open position";
    return;
  }
  const pnl = pos.unrealisedPnL(inst.price);
  const sign = pnl >= 0 ? "+" : "";
  el.positionValue.textContent = `${pos.qty} @ ${fmt(pos.avgCost)} · ${sign}${fmt(pnl)}`;
}

function renderAccount() {
  el.cashValue.textContent = fmt(portfolio.cash);
  el.holdingsValue.textContent = fmt(portfolio.holdingsValue(priceLookup));
  el.netValue.textContent = fmt(portfolio.netWorth(priceLookup));
}

function renderEstimate() {
  const inst = instruments.get(selectedSymbol);
  const qty = Math.max(0, Math.floor(Number(el.orderQty.value) || 0));
  el.orderEst.textContent = fmt(qty * (inst?.price ?? 0));
}

function setOrderSide(side) {
  orderSide = side;
  for (const btn of el.orderForm.querySelectorAll(".side-btn")) {
    btn.classList.toggle("active", btn.dataset.side === side);
  }
  el.orderSubmit.dataset.side = side;
  el.orderSubmit.textContent = `Place ${side} order`;
}

function flashOrderMsg(text, kind) {
  el.orderMsg.textContent = text;
  el.orderMsg.className = `order-msg ${kind}`;
  if (kind === "ok") {
    setTimeout(() => {
      if (el.orderMsg.textContent === text) {
        el.orderMsg.textContent = "";
        el.orderMsg.className = "order-msg";
      }
    }, 3000);
  }
}

function addTradeToLog(trade) {
  const empty = el.tradeLog.querySelector(".log-empty");
  if (empty) empty.remove();

  const li = document.createElement("li");
  li.className = "log-row";
  const time = new Date(trade.time).toLocaleTimeString("en-US", {
    hour12: false,
  });
  li.innerHTML = `
    <span class="log-side ${trade.side}">${trade.side.toUpperCase()}</span>
    <span class="log-detail">
      <strong>${trade.qty}</strong> ${trade.symbol} @ ${fmt(trade.price)}
      <br />${fmt(trade.total)}
    </span>
    <span class="log-time">${time}</span>
  `;
  el.tradeLog.prepend(li);
  el.logCount.textContent = `${portfolio.trades.length} fill${
    portfolio.trades.length === 1 ? "" : "s"
  }`;
}

function addHeadlineToFeed(headline) {
  const empty = el.newsFeed.querySelector(".news-empty");
  if (empty) empty.remove();

  const li = document.createElement("li");
  li.className = "news-row";
  const time = new Date(headline.time).toLocaleTimeString("en-US", {
    hour12: false,
  });
  li.innerHTML = `
    <span class="news-tag ${headline.sentiment}">${headline.sentiment}</span>
    <span class="news-text">
      <span class="news-sym">${headline.symbol}</span> ${headline.text}
    </span>
    <span class="news-time">${time}</span>
  `;
  el.newsFeed.prepend(li);

  while (el.newsFeed.children.length > 30) {
    el.newsFeed.lastElementChild.remove();
  }
}

function setAnalystStatus(message, isError = false) {
  el.analystStatus.textContent = message;
  el.analystStatus.classList.toggle("error", isError);
}

function buildSnapshot() {
  const positions = [];
  for (const pos of portfolio.positions.values()) {
    if (!pos.isOpen) continue;
    const price = priceLookup(pos.symbol);
    positions.push({
      symbol: pos.symbol,
      qty: pos.qty,
      avgCost: pos.avgCost,
      price,
      pnl: pos.unrealisedPnL(price),
    });
  }

  const watchlist = [...instruments.values()].map((inst) => ({
    symbol: inst.symbol,
    name: inst.name,
    price: inst.price,
    changePct: inst.changePct,
  }));

  const news = recentNews
    .slice(0, 6)
    .map((h) => ({ symbol: h.symbol, text: h.text, sentiment: h.sentiment }));

  return {
    cash: portfolio.cash,
    holdingsValue: portfolio.holdingsValue(priceLookup),
    netWorth: portfolio.netWorth(priceLookup),
    positions,
    watchlist,
    news,
  };
}

function renderBriefing(text) {
  el.analystOutput.replaceChildren();
  const labels = ["Market", "Portfolio", "Watch"];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let matchedAny = false;
  for (const line of lines) {
    const label = labels.find((l) =>
      line.toLowerCase().startsWith(l.toLowerCase() + ":"),
    );
    const row = document.createElement("div");
    row.className = "brief-line";
    if (label) {
      matchedAny = true;
      const body = line.slice(label.length + 1).trim();
      row.innerHTML = `<span class="brief-label">${label}</span><span>${body}</span>`;
    } else {
      row.innerHTML = `<span>${line}</span>`;
    }
    el.analystOutput.append(row);
  }

  if (!matchedAny && !lines.length) {
    el.analystOutput.textContent = text;
  }
  el.analystOutput.classList.remove("hidden");
}

async function requestBriefing() {
  const typed = el.geminiKey.value.trim();
  if (typed) analyst.setKey(typed);
  if (!analyst.hasKey) {
    setAnalystStatus("Enter your Gemini API key to use the AI analyst.", true);
    return;
  }

  el.briefBtn.disabled = true;
  el.briefBtn.classList.add("loading");
  setAnalystStatus("Asking Gemini for a briefing…");
  el.analystOutput.classList.add("hidden");

  try {
    const text = await analyst.brief(buildSnapshot());
    renderBriefing(text);
    setAnalystStatus(`Briefing generated by ${analyst.model}.`);
    console.log("[analyst] briefing:\n" + text);
  } catch (err) {
    setAnalystStatus(err.message || "Could not generate a briefing.", true);
    console.error("[analyst]", err);
  } finally {
    el.briefBtn.disabled = false;
    el.briefBtn.classList.remove("loading");
  }
}

el.watchlist.addEventListener("click", (e) => {
  const row = e.target.closest(".ticker-row");
  if (!row) return;
  selectedSymbol = row.dataset.symbol;
  updateSelectionHighlight();
  renderDetail();
});

el.orderForm.addEventListener("click", (e) => {
  const btn = e.target.closest(".side-btn");
  if (!btn) return;
  setOrderSide(btn.dataset.side);
});

el.orderQty.addEventListener("input", renderEstimate);

el.orderForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const inst = instruments.get(selectedSymbol);
  if (!inst) return;
  try {
    const trade = portfolio.execute({
      side: orderSide,
      symbol: inst.symbol,
      qty: el.orderQty.value,
      price: inst.price,
    });
    addTradeToLog(trade);
    renderAccount();
    renderPosition(inst);
    flashOrderMsg(
      `Filled: ${trade.side} ${trade.qty} ${trade.symbol} @ ${fmt(trade.price)}`,
      "ok",
    );
    console.log("[order] filled", trade);
  } catch (err) {
    if (isOrderError(err)) {
      flashOrderMsg(err.message, "err");
    } else {
      flashOrderMsg("Something went wrong placing the order.", "err");
      console.error(err);
    }
  }
});

el.feedBtn.addEventListener("click", async () => {
  if (feed.connected) {
    feed.stop();
    newsWire.stop();
    return;
  }
  el.feedBtn.disabled = true;
  el.feedBtn.textContent = "Connecting…";
  try {
    await feed.connect();
    feed.start();
    newsWire.start();
  } catch (err) {
    console.error("[feed] failed to connect:", err);
    setConn("off", "● offline");
  } finally {
    el.feedBtn.disabled = false;
  }
});

el.briefBtn.addEventListener("click", requestBriefing);

function setConn(state, label) {
  el.connBadge.dataset.state = state;
  el.connBadge.textContent = label;
}

feed.on("status", (status) => {
  switch (status) {
    case "connecting":
      setConn("off", "● connecting");
      break;
    case "connected":
    case "streaming":
      setConn("on", "● live");
      el.feedBtn.dataset.state = "on";
      el.feedBtn.textContent = "Disconnect";
      break;
    case "stopped":
      setConn("off", "● offline");
      el.feedBtn.dataset.state = "off";
      el.feedBtn.textContent = "Connect feed";
      break;
  }
});

feed.on("tick", (tick) => {
  const inst = instruments.get(tick.symbol);
  if (!inst) return;

  const dir = tick.direction;
  inst.update(tick.price);
  paintRow(inst, dir === "flat" ? null : dir);
  if (tick.symbol === selectedSymbol) renderDetail();
  renderAccount();
});

feed.on("error", (err) => {
  console.error("[feed] error:", err);
  setConn("off", "● error");
});

newsWire.on("headline", (headline) => {
  addHeadlineToFeed(headline);

  recentNews.unshift(headline);
  if (recentNews.length > 12) recentNews.pop();

  if (headline.priceEffect) {
    feed.nudge(headline.symbol, headline.priceEffect);
  }

  console.log(
    `[news] ${headline.sentiment.toUpperCase()} ${headline.symbol}: ${headline.text}`,
  );
});

newsWire.on("error", (err) => console.error("[news] error:", err));

function init() {
  buildWatchlist();
  setOrderSide("buy");
  renderDetail();
  renderAccount();

  if (analyst.hasKey) el.geminiKey.value = "";
  el.analystModel.textContent = `powered by ${analyst.model}`;
  if (analyst.hasKey) {
    setAnalystStatus("Saved API key loaded. Ready for a briefing.");
  }

  console.log(
    "%cTradeStream ready.",
    "color:#4ea8ff;font-weight:bold",
    "Click “Connect feed” to start streaming simulated prices and news.",
  );
}

init();
