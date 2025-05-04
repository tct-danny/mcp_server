# Function Explanations for fetch_crypto_detail MCP Server

This document explains the main functions and tools defined in `index.js`.

## Helper Functions

### `fetchCryptoPrice(cryptoSymbol)`
- **Purpose:** Fetches detailed cryptocurrency information from the CoinGecko API.
- **Input:** `cryptoSymbol` (string) - The symbol or name of the cryptocurrency (e.g., "bitcoin", "eth", "solana").
- **Process:**
    1. Normalizes the input symbol (lowercase, trimmed).
    2. Uses a predefined map (`COMMON_CRYPTOS`) for quick lookups of common symbols/IDs.
    3. If not found in the map, queries the CoinGecko `/coins/list` endpoint to find the coin's `id` based on the input symbol, name, or ID.
    4. Queries the CoinGecko `/coins/{id}` endpoint using the found `id` to get detailed market data.
    5. Extracts relevant information like price (USD), name, description, image URL, and market cap.
- **Output:** An object containing the fetched cryptocurrency data or throws an error if fetching fails or the coin is not found.
- **Note:** Uses `debugLog` for logging to a file (`crypto-mcp-debug.log`) to avoid interfering with MCP stdout.

## MCP Tools

### `getCryptoPrice`
- **Purpose:** Exposes the cryptocurrency price fetching functionality as an MCP tool.
- **MCP Name:** `getCryptoPrice`
- **Input Schema:** `{ cryptoSymbol: z.string().describe(...) }`
- **Process:**
    1. Calls the `fetchCryptoPrice` helper function with the provided `cryptoSymbol`.
    2. Formats the price and market cap for better readability.
    3. Returns the formatted price, market cap, and description as text content for the MCP client.
    4. Includes the raw fetched data in the `data` field of the response.
    5. Handles errors from `fetchCryptoPrice` and returns an error message.
- **Description:** "Get the current price of a cryptocurrency from CoinGecko"

### `compareCryptoPrices`
- **Purpose:** Compares the prices of two cryptocurrencies using the CoinGecko API via an MCP tool.
- **MCP Name:** `compareCryptoPrices`
- **Input Schema:** `{ cryptoSymbol1: z.string().describe(...), cryptoSymbol2: z.string().describe(...) }`
- **Process:**
    1. Calls `fetchCryptoPrice` concurrently for both `cryptoSymbol1` and `cryptoSymbol2`.
    2. Calculates the price ratio between the two cryptocurrencies.
    3. Returns a formatted text comparison showing individual prices and the exchange ratio.
    4. Includes the raw fetched data for both coins and the ratio in the `data` field.
    5. Handles errors and returns an error message.
- **Description:** "Compare the prices of two cryptocurrencies" 