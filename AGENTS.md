# ShopLedger

## Stack

ShopLedger is a retail and wholesale billing, inventory, and customer credit (khata) app. The server uses Node.js with CommonJS modules, Express 4, and `body-parser` for JSON requests. Express serves static HTML, CSS, and browser JavaScript. The app persists its records in one JSON file.

## Module map

| Location | Responsibility |
| --- | --- |
| `server.js`, `config.js` | Express serves the UI, mounts the routers under `/api`, and handles printable invoices. Configuration supplies the port, shop details, and billing rules. |
| `public/` | HTML, CSS, and browser JavaScript for checkout, order history, customer credit, and reports. |
| `routes/` | `products.js` serves the catalog and coupons. `orders.js` handles checkout and cancellation. `customers.js` handles accounts and settlements. `reports.js` serves summaries, GST reconciliation, pricing previews, and exports. |
| `lib/` | `pricing.js`, `coupons.js`, and `tax.js` calculate checkout totals. `orders.js`, `inventory.js`, `ledger.js`, and `dates.js` handle orders, stock, credit, and dates. `invoice.js` computes printable invoices, and `reports.js` compares those figures with stored orders. |
| `lib/store.js`, `data/db.json` | The store reads and writes the JSON file containing shop records, ID counters, and audit entries. |

## Commands

Run commands from the repository root.

- `npm install` installs the dependencies declared in `package.json`.
- `npm start` runs `node server.js`. The server uses `PORT` when set and defaults to port 3000.
- `npm test` is a placeholder that prints `Error: no test specified` and exits with status 1.

## Rules for changes

- Write **characterization tests** before changing behaviour. Capture what the module currently does for the inputs affected by the ticket.
- Change only the module the ticket is about.
- Tests must never read or write `data/db.json`. Use independent fixtures, such as an in-memory database object.
- Add no dependencies, including test dependencies.
