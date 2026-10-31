const MAX_HISTORY = 40;
export const STARTING_CASH = 100000;

export function createInstrument({ symbol, name, price }) {
  const open = price;
  const priceHistory = [price];

  const inst = {
    symbol,
    name,
    price,
    open,

    update(next) {
      inst.price = next;
      priceHistory.push(next);
      if (priceHistory.length > MAX_HISTORY) priceHistory.shift();
    },

    get history() {
      return [...priceHistory];
    },

    get changePct() {
      if (open === 0) return 0;
      return ((inst.price - open) / open) * 100;
    },

    get direction() {
      if (inst.price > open) return "up";
      if (inst.price < open) return "down";
      return "flat";
    },
  };

  return inst;
}

export function createPosition(symbol) {
  const pos = {
    symbol,
    qty: 0,
    avgCost: 0,

    get isOpen() {
      return pos.qty > 0;
    },

    addShares(qty, price) {
      const totalCost = pos.avgCost * pos.qty + price * qty;
      pos.qty += qty;
      pos.avgCost = pos.qty === 0 ? 0 : totalCost / pos.qty;
    },

    removeShares(qty) {
      pos.qty = Math.max(0, pos.qty - qty);
      if (pos.qty === 0) pos.avgCost = 0;
    },

    marketValue(price) {
      return pos.qty * price;
    },

    unrealisedPnL(price) {
      return (price - pos.avgCost) * pos.qty;
    },
  };

  return pos;
}

export function createOrderError(message) {
  const err = new Error(message);
  err.name = "OrderError";
  return err;
}

export function isOrderError(err) {
  return err instanceof Error && err.name === "OrderError";
}

export function createPortfolio(startingCash = STARTING_CASH) {
  const positions = new Map();
  const trades = [];

  function positionFor(symbol) {
    if (!positions.has(symbol)) {
      positions.set(symbol, createPosition(symbol));
    }
    return positions.get(symbol);
  }

  function holdingsValue(priceLookup) {
    let sum = 0;
    for (const pos of positions.values()) {
      if (pos.isOpen) sum += pos.marketValue(priceLookup(pos.symbol));
    }
    return sum;
  }

  return {
    cash: startingCash,
    positions,
    trades,

    positionFor,

    execute({ side, symbol, qty, price }) {
      qty = Math.floor(Number(qty));
      if (!Number.isFinite(qty) || qty <= 0) {
        throw createOrderError("Enter a whole quantity of 1 or more.");
      }

      const cost = qty * price;
      const position = positionFor(symbol);

      if (side === "buy") {
        if (cost > this.cash) {
          throw createOrderError("Not enough cash for this order.");
        }
        this.cash -= cost;
        position.addShares(qty, price);
      } else if (side === "sell") {
        if (qty > position.qty) {
          throw createOrderError(`You only hold ${position.qty} share(s).`);
        }
        this.cash += cost;
        position.removeShares(qty);
      } else {
        throw createOrderError(`Unknown order side "${side}".`);
      }

      const trade = {
        id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
        side,
        symbol,
        qty,
        price,
        total: cost,
        time: Date.now(),
      };
      trades.push(trade);
      return trade;
    },

    holdingsValue,

    netWorth(priceLookup) {
      return this.cash + holdingsValue(priceLookup);
    },
  };
}
