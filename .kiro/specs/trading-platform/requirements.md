# Requirements Document

## Introduction

A simulated (paper-trading) stock trading platform built as a single-page web app in vanilla JavaScript using ES modules, with no build step. Users fund a virtual account with play money, browse stocks, view live-updating price charts, and place simulated buy/sell orders that adjust their cash balance and holdings. An integrated Gemini-assisted chatbot provides stock reviews and surfaces news pulled from a market-news API. The app persists all state (balance, holdings, transactions) in the browser via `localStorage`, consistent with the existing projects in this repo (plain HTML/CSS/JS, Gemini called directly from the browser with a user-supplied API key).

No real money or real brokerage connections are involved. Price data is simulated client-side (or pulled from a free quote API where available); all trading affects only the local virtual portfolio.

## Requirements

### Requirement 1: Initial Account Funding

**User Story:** As a new user, I want to fund my account with a starting virtual balance, so that I have capital to practice trading.

#### Acceptance Criteria

1. WHEN the app loads for the first time (no saved state) THEN the system SHALL prompt the user to set an initial virtual cash balance.
2. WHEN the user submits an initial funding amount THEN the system SHALL accept only positive numeric values and SHALL reject zero, negative, or non-numeric input with an inline error message.
3. WHEN a valid funding amount is submitted THEN the system SHALL set the available cash balance to that amount and persist it to `localStorage`.
4. WHEN the user has already funded their account THEN the system SHALL NOT show the initial funding prompt again on reload.
5. WHERE an "Add funds" control is provided THE system SHALL allow the user to add additional virtual cash to the existing balance at any time.
6. WHERE a "Reset account" control is provided THE system SHALL allow the user to clear all saved state (balance, holdings, transactions) after an explicit confirmation.

### Requirement 2: Stock Browsing and Selection

**User Story:** As a trader, I want to browse and select stocks, so that I can decide what to trade.

#### Acceptance Criteria

1. WHEN the app loads THEN the system SHALL display a list of available stock symbols with their current simulated price.
2. WHEN the user selects a stock from the list THEN the system SHALL make it the active stock for charting and trading.
3. WHILE a stock is active THE system SHALL display its symbol, company name, current price, and the change (absolute and percentage) since the session or day open.
4. WHERE a search or filter input is provided THE system SHALL filter the stock list by symbol or company name as the user types.

### Requirement 3: Live Price Chart

**User Story:** As a trader, I want to see a live-updating price chart for the selected stock, so that I can track its movement visually.

#### Acceptance Criteria

1. WHEN a stock becomes active THEN the system SHALL render a price chart for that stock using a charting module (e.g., Chart.js) loaded as an ES module.
2. WHILE a stock is active THE system SHALL update the price at a fixed interval (for example every 1-3 seconds) and append the new data point to the chart.
3. WHEN new price data arrives THEN the system SHALL update the displayed current price, the change indicator, and the chart without reloading the page.
4. IF price updates are paused or resumed via a control THEN the system SHALL stop or restart the live updates accordingly.
5. WHERE multiple time ranges are offered THE system SHALL allow the user to switch the chart window (for example a rolling window of recent ticks).
6. WHEN the user switches to a different active stock THEN the system SHALL stop updating the previous stock's chart and start the new one, avoiding duplicate update timers.

### Requirement 4: Buy Orders

**User Story:** As a trader, I want to buy shares of a stock with my virtual cash, so that I can build a portfolio.

#### Acceptance Criteria

1. WHEN the user enters a buy quantity for the active stock THEN the system SHALL display the estimated total cost at the current price before confirmation.
2. WHEN the user confirms a buy order THEN the system SHALL verify that the total cost does not exceed the available cash balance.
3. IF the total cost exceeds the available balance THEN the system SHALL reject the order and show an "insufficient funds" message without changing any state.
4. WHEN a buy order succeeds THEN the system SHALL deduct the total cost from the cash balance, increase the holding quantity for that symbol, and update the average cost basis.
5. WHEN a buy order succeeds THEN the system SHALL record a transaction entry (type, symbol, quantity, price, total, timestamp) and persist all changes to `localStorage`.
6. WHEN the buy quantity is zero, negative, or non-integer THEN the system SHALL reject the order with a validation message.

### Requirement 5: Sell Orders

**User Story:** As a trader, I want to sell shares I own, so that I can realize gains or cut losses.

#### Acceptance Criteria

1. WHEN the user enters a sell quantity for the active stock THEN the system SHALL display the estimated proceeds at the current price before confirmation.
2. WHEN the user confirms a sell order THEN the system SHALL verify that the sell quantity does not exceed the currently held quantity for that symbol.
3. IF the sell quantity exceeds holdings THEN the system SHALL reject the order and show an error without changing any state.
4. WHEN a sell order succeeds THEN the system SHALL add the proceeds to the cash balance, decrease the holding quantity, and record the realized profit or loss relative to the average cost basis.
5. WHEN a sell order reduces a holding to zero THEN the system SHALL remove that symbol from the active holdings list.
6. WHEN a sell order succeeds THEN the system SHALL record a transaction entry and persist all changes to `localStorage`.

### Requirement 6: Portfolio and Transaction History

**User Story:** As a trader, I want to see my holdings, cash, total value, and past transactions, so that I can track my performance.

#### Acceptance Criteria

1. WHILE the app is open THE system SHALL display the current cash balance, a holdings table (symbol, quantity, average cost, current price, market value, unrealized P/L), and the total portfolio value (cash + holdings market value).
2. WHEN live prices update THEN the system SHALL recompute holdings market value, unrealized P/L, and total portfolio value.
3. WHILE the app is open THE system SHALL display a transaction history list ordered most-recent-first, showing type, symbol, quantity, price, total, and timestamp.
4. WHEN the app reloads THEN the system SHALL restore balance, holdings, and transaction history from `localStorage`.

### Requirement 7: Gemini-Assisted Chatbot (Stock Review & News)

**User Story:** As a trader, I want an AI chatbot that reviews a stock and surfaces recent news, so that I can make more informed simulated decisions.

#### Acceptance Criteria

1. WHERE a Gemini API key input is provided THE system SHALL store the key in `localStorage` and prefill it on return visits, matching the existing projects' pattern.
2. WHEN the user requests a review of the active stock THEN the system SHALL send the stock's symbol, recent price context, and the user's holding for that symbol to Gemini and SHALL display the returned review text.
3. WHEN the user asks a free-form question in the chatbot THEN the system SHALL send the message (with relevant stock context) to Gemini and SHALL display the response in a chat transcript.
4. WHEN a news request is made for the active stock THEN the system SHALL fetch recent headlines from a market-news API and SHALL display them with source and link; IF a news API key is required THE system SHALL let the user supply and store it.
5. IF no Gemini API key is entered THEN the system SHALL show a clear message prompting the user to add a key instead of calling the API.
6. IF a Gemini or news API request fails THEN the system SHALL show a non-blocking error message and SHALL leave the rest of the app functional.
7. WHILE a request is in flight THE system SHALL show a loading state and SHALL disable the triggering control to prevent duplicate requests.

### Requirement 8: Persistence and State Management

**User Story:** As a user, I want my account to be remembered between visits, so that I don't lose my progress.

#### Acceptance Criteria

1. WHEN any state-changing action occurs (funding, buy, sell, reset) THEN the system SHALL persist the updated state to `localStorage`.
2. WHEN the app loads THEN the system SHALL read existing state from `localStorage` and rehydrate the UI.
3. IF stored state is missing or corrupt THEN the system SHALL fall back to a clean initial state without throwing an unhandled error.
4. WHERE API keys are stored THE system SHALL keep them in `localStorage` only and SHALL never transmit them anywhere other than the respective API endpoint.

### Requirement 9: Layout, Styling, and Usability

**User Story:** As a user, I want a clear, responsive single-page interface, so that I can trade and monitor my portfolio easily.

#### Acceptance Criteria

1. WHEN the app loads THEN the system SHALL present a single-page layout with distinct regions for the stock list, the chart, the trade panel, the portfolio, and the chatbot.
2. WHEN viewed on smaller screens THEN the layout SHALL remain usable and readable (responsive).
3. WHEN price or P/L values are shown THEN the system SHALL visually distinguish gains and losses (for example green and red).
4. WHEN an action succeeds or fails THEN the system SHALL give immediate, visible feedback (toast, inline message, or status text).
5. WHERE interactive controls exist THE system SHALL provide accessible labels and keyboard operability.

### Requirement 10: Project Structure

**User Story:** As the repo owner, I want the project to match the existing conventions, so that it fits alongside the other projects.

#### Acceptance Criteria

1. THE system SHALL live in a new `project-6` folder under the workspace root.
2. THE system SHALL be a static site runnable by opening `index.html` (or via a simple static server) with no build/bundler step.
3. THE system SHALL use vanilla JavaScript organized as ES modules (for example `app.js`, `market.js`, `portfolio.js`, `chart.js`, `gemini.js`, `news.js`).
4. THE system SHALL load the charting library as an ES module (CDN import) consistent with a no-build setup.
