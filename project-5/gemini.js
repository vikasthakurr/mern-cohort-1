const KEY_STORAGE = "tradestream.geminiKey";
const MODEL = "gemini-3.6-flash";
const ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  MODEL +
  ":generateContent";

function readKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function buildPrompt(snapshot) {
  const money = (n) =>
    "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

  const positions = snapshot.positions.length
    ? snapshot.positions
        .map(
          (p) =>
            `- ${p.qty} ${p.symbol} @ avg ${money(p.avgCost)}, now ${money(
              p.price,
            )} (P&L ${money(p.pnl)})`,
        )
        .join("\n")
    : "- none";

  const market = snapshot.watchlist
    .map(
      (w) =>
        `- ${w.symbol} ${money(w.price)} (${
          w.changePct >= 0 ? "+" : ""
        }${w.changePct.toFixed(2)}% today)`,
    )
    .join("\n");

  const news = snapshot.news.length
    ? snapshot.news
        .map((n) => `- [${n.sentiment}] ${n.symbol}: ${n.text}`)
        .join("\n")
    : "- no recent headlines";

  return (
    "You are a concise, level-headed market analyst for a simulated trading " +
    "terminal. All data below is fictional/simulated — do NOT give real " +
    "financial advice or disclaimers. Speak plainly.\n\n" +
    "ACCOUNT:\n" +
    `- Cash: ${money(snapshot.cash)}\n` +
    `- Holdings: ${money(snapshot.holdingsValue)}\n` +
    `- Net worth: ${money(snapshot.netWorth)}\n\n` +
    "OPEN POSITIONS:\n" +
    positions +
    "\n\nMARKET (today's change):\n" +
    market +
    "\n\nRECENT HEADLINES:\n" +
    news +
    "\n\nWrite a short briefing with exactly these three sections, each a " +
    "single sentence, prefixed with the label:\n" +
    "Market: <one sentence on the overall tone>\n" +
    "Portfolio: <one sentence on how the account looks>\n" +
    "Watch: <one sentence naming one symbol to watch and why>\n"
  );
}

export function createGeminiAnalyst() {
  let key = readKey();

  return {
    get model() {
      return MODEL;
    },

    get hasKey() {
      return key.trim().length > 0;
    },

    setKey(next) {
      key = (next || "").trim();
      try {
        localStorage.setItem(KEY_STORAGE, key);
      } catch {}
    },

    async brief(snapshot) {
      if (!this.hasKey) {
        throw new Error("Add your Gemini API key to enable the AI analyst.");
      }

      const prompt = buildPrompt(snapshot);
      let response;
      try {
        response = await fetch(ENDPOINT + "?key=" + encodeURIComponent(key), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
      } catch {
        throw new Error(
          "Network error reaching Gemini. Check your connection.",
        );
      }

      if (!response.ok) {
        let detail = "";
        try {
          const errBody = await response.json();
          detail = errBody?.error?.message ? " - " + errBody.error.message : "";
        } catch {}
        throw new Error(`Gemini request failed (${response.status})${detail}`);
      }

      const body = await response.json();
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned an empty response.");
      return text.trim();
    },
  };
}
