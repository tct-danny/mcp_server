import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import fs from 'fs';

// Create a log file for debugging
const logFile = './crypto-mcp-debug.log';
// Clear log file
fs.writeFileSync(logFile, '', 'utf8');

// Helper function for logging that doesn't interfere with stdout
function debugLog(message) {
  fs.appendFileSync(logFile, message + '\n', 'utf8');
}

// Create an MCP server
const server = new McpServer({
  name: "CryptoPrice",
  version: "1.0.0",
  description: "A server that fetches cryptocurrency prices from CoinGecko"
});

// Common cryptocurrencies with their IDs for direct lookup
const COMMON_CRYPTOS = {
  'bitcoin': 'bitcoin',
  'btc': 'bitcoin',
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  'tether': 'tether',
  'usdt': 'tether',
  'bnb': 'binancecoin',
  'solana': 'solana',
  'sol': 'solana',
  'xrp': 'ripple',
  'dogecoin': 'dogecoin',
  'doge': 'dogecoin',
  'cardano': 'cardano',
  'ada': 'cardano',
  'polkadot': 'polkadot',
  'dot': 'polkadot'
};

// Function to fetch crypto price from CoinGecko API
async function fetchCryptoPrice(cryptoSymbol) {
  try {
    // Normalize the symbol
    const symbol = cryptoSymbol.toLowerCase().trim();
    let coinId;
    
    // Check if it's a common crypto for direct lookup (faster)
    if (COMMON_CRYPTOS[symbol]) {
      coinId = COMMON_CRYPTOS[symbol];
      debugLog(`Using direct lookup for ${symbol} -> ${coinId}`);
    } else {
      // First get the coin ID from the CoinGecko API
      debugLog(`Performing search for ${symbol}`);
      const coinsListUrl = 'https://api.coingecko.com/api/v3/coins/list';
      const coinsListResponse = await fetch(coinsListUrl);
      
      if (!coinsListResponse.ok) {
        throw new Error(`CoinGecko API error: ${coinsListResponse.statusText}`);
      }
      
      const coinsList = await coinsListResponse.json();
      
      // Try to find the coin by exact ID match first
      let coin = coinsList.find(c => c.id === symbol);
      
      // If not found by ID, try to find by exact symbol match
      if (!coin) {
        coin = coinsList.find(c => c.symbol.toLowerCase() === symbol);
      }
      
      // If still not found, try to find by name (case insensitive)
      if (!coin) {
        coin = coinsList.find(c => c.name.toLowerCase() === symbol);
      }
      
      if (!coin) {
        throw new Error(`Could not find cryptocurrency with symbol: ${cryptoSymbol}`);
      }
      
      coinId = coin.id;
      debugLog(`Found match for ${symbol}: ${coinId}`);
    }
    
    // Fetch detailed information for the coin
    const coinUrl = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`;
    const coinResponse = await fetch(coinUrl);
    
    if (!coinResponse.ok) {
      throw new Error(`CoinGecko API error: ${coinResponse.statusText}`);
    }
    
    const coinData = await coinResponse.json();
    
    // Extract the relevant information
    const price = coinData.market_data.current_price.usd;
    const name = coinData.name;
    const description = coinData.description.en ? 
      coinData.description.en.split('\n')[0] : // Just take the first paragraph
      `${name} price information`;
    const image = coinData.image.large;
    const marketCap = coinData.market_data.market_cap.usd;
    
    return {
      name,
      symbol: cryptoSymbol,
      price: Number(price),
      currency: "USD",
      marketCap,
      description,
      image,
      source: "CoinGecko",
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    debugLog(`Error fetching price for ${cryptoSymbol}: ${error.message}`);
    throw new Error(`Failed to fetch price for ${cryptoSymbol}: ${error.message}`);
  }
}

// Add a tool to get the current price of a cryptocurrency
server.tool(
  "getCryptoPrice",
  { 
    cryptoSymbol: z.string().describe("The symbol of the cryptocurrency (e.g., bitcoin, ethereum, solana)")
  },
  async ({ cryptoSymbol }) => {
    try {
      const data = await fetchCryptoPrice(cryptoSymbol);
      
      const marketCapFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        compactDisplay: 'short'
      }).format(data.marketCap);
      
      return {
        content: [
          { 
            type: "text", 
            text: `Current price of ${data.name} (${cryptoSymbol}) is $${data.price.toLocaleString()} ${data.currency}.\n\nMarket Cap: ${marketCapFormatted}\n\n${data.description || ''}`
          }
        ],
        data
      };
    } catch (error) {
      return {
        content: [
          { 
            type: "text", 
            text: `Error: ${error.message}` 
          }
        ]
      };
    }
  },
  {
    description: "Get the current price of a cryptocurrency from CoinGecko"
  }
);

// Add a tool to compare prices of two cryptocurrencies
server.tool(
  "compareCryptoPrices",
  { 
    cryptoSymbol1: z.string().describe("The symbol of the first cryptocurrency (e.g., bitcoin)"),
    cryptoSymbol2: z.string().describe("The symbol of the second cryptocurrency (e.g., ethereum)")
  },
  async ({ cryptoSymbol1, cryptoSymbol2 }) => {
    try {
      const [data1, data2] = await Promise.all([
        fetchCryptoPrice(cryptoSymbol1),
        fetchCryptoPrice(cryptoSymbol2)
      ]);
      
      const ratio = data1.price / data2.price;
      
      return {
        content: [
          { 
            type: "text", 
            text: `Current price comparison:\n\n` +
                  `${data1.name} (${cryptoSymbol1}): $${data1.price.toLocaleString()} ${data1.currency}\n` +
                  `${data2.name} (${cryptoSymbol2}): $${data2.price.toLocaleString()} ${data2.currency}\n\n` +
                  `1 ${data1.name} = ${ratio.toFixed(6)} ${data2.name}\n` +
                  `1 ${data2.name} = ${(1/ratio).toFixed(6)} ${data1.name}`
          }
        ],
        data: {
          crypto1: data1,
          crypto2: data2,
          ratio
        }
      };
    } catch (error) {
      return {
        content: [
          { 
            type: "text", 
            text: `Error: ${error.message}` 
          }
        ]
      };
    }
  },
  {
    description: "Compare the prices of two cryptocurrencies"
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

// Log to file instead of console
debugLog("Crypto Price MCP Server is running..."); 