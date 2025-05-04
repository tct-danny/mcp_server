# Crypto Price MCP Server

This is a Model Context Protocol (MCP) server that allows AI models to fetch cryptocurrency prices from Binance. The server provides tools to get the current price of a cryptocurrency and to compare prices between two cryptocurrencies.

## Features

- Get the current price of any cryptocurrency listed on Binance
- Compare prices between two cryptocurrencies
- Real-time data fetched directly from Binance

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

## Running the Server

To start the server, run:

```bash
npm start
```

## Configuration for Different MCP Clients

### Claude Desktop

Add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "cryptoPrice": {
      "command": "node",
      "args": ["path/to/fetch_crypto_detail/index.js"]
    }
  }
}
```

### Cursor

Add the following to your `.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "cryptoPrice": {
      "command": "node",
      "args": ["path/to/fetch_crypto_detail/index.js"]
    }
  }
}
```

## Available Tools

### getCryptoPrice

Get the current price of a cryptocurrency.

**Parameters:**
- `cryptoSymbol` (string): The symbol of the cryptocurrency (e.g., bitcoin, ethereum, solana)

**Example Response:**
```
Current price of Bitcoin (bitcoin) is 84177.01 USD.

Live price of Bitcoin is $84,177.01 with a market cap of $1,670.52B USD. Discover current price, trading volume, chart history, and more.
```

### compareCryptoPrices

Compare the prices of two cryptocurrencies.

**Parameters:**
- `cryptoSymbol1` (string): The symbol of the first cryptocurrency (e.g., bitcoin)
- `cryptoSymbol2` (string): The symbol of the second cryptocurrency (e.g., ethereum)

**Example Response:**
```
Current price comparison:

Bitcoin (bitcoin): 84177.01 USD
Ethereum (ethereum): 3245.67 USD

1 Bitcoin = 25.935200 Ethereum
1 Ethereum = 0.038557 Bitcoin
```

## Example Usage in a Conversation

**User:** What's the current price of Bitcoin?

**AI (using getCryptoPrice):** Current price of Bitcoin (bitcoin) is 84177.01 USD.

Live price of Bitcoin is $84,177.01 with a market cap of $1,670.52B USD. Discover current price, trading volume, chart history, and more.

**User:** How does that compare to Ethereum?

**AI (using compareCryptoPrices):** 
Current price comparison:

Bitcoin (bitcoin): 84177.01 USD
Ethereum (ethereum): 3245.67 USD

1 Bitcoin = 25.935200 Ethereum
1 Ethereum = 0.038557 Bitcoin

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License. 