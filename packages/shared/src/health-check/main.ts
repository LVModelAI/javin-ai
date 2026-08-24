import { NextResponse } from "next/server";
import { getAllToolsWithConfigs } from "@javin/shared/lib/ai/prompts";
import { SearchGroupId } from "@javin/shared/lib/utils/utils";

// Mock Jest for testing tools
const jest = {
  describe: async (name: string, fn: () => void | Promise<void>) => {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      await fn();
    } catch (error) {
      console.error(`❌ Suite "${name}" failed:`, error);
      throw error;
    }
  },

  it: async (name: string, fn: () => void | Promise<void>) => {
    console.log(`  ▶ ${name}`);
    try {
      await fn(); // ✅ Await directly to catch async errors properly
      console.log(`  ✅ ${name} passed`);
    } catch (error) {
      console.error(
        `  ❌ ${name} failed:`,
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  },

  expect: (actual: any) => ({
    toBeDefined: () => {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined, but got ${actual}`);
      }
    },
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`
        );
      }
    },
    toHaveProperty: (property: string) => {
      if (!(property in actual)) {
        throw new Error(`Expected object to have property '${property}'`);
      }
    },
    toBeInstanceOf: (constructor: any) => {
      if (constructor === Array) {
        if (!Array.isArray(actual)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be an array`);
        }
      } else if (!(actual instanceof constructor)) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} to be instance of ${
            constructor.name
          }`
        );
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (typeof actual !== "number") {
        throw new Error(`Expected a number, but got ${typeof actual}`);
      }
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toContain: (expected: any) => {
      if (typeof actual === "string") {
        if (!actual.includes(expected)) {
          throw new Error(
            `Expected string "${actual}" to contain "${expected}"`
          );
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(
            `Expected array ${JSON.stringify(
              actual
            )} to contain ${JSON.stringify(expected)}`
          );
        }
      } else {
        throw new Error(`Expected string or array, but got ${typeof actual}`);
      }
    },
  }),
};

interface ToolTestResult {
  toolName: string;
  status: "passed" | "failed";
  error?: string;
  duration: number;
}

interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  timestamp: string;
  totalTools: number;
  passedTools: number;
  failedTools: number;
  toolResults: ToolTestResult[];
  summary: string;
}

const VitalikEthereumAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const VitalikENS = "vitalik.eth";
const EthereumTokenAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const ShantanuSolanaAddress = "BssDRXarRRG129xGLiXPbHCt58q1eAsn7bTBA8rgyj68";
const SolanaTokenAddress = "So11111111111111111111111111111111111111112";

async function testTool(
  toolName: string,
  toolConfig: any
): Promise<ToolTestResult> {
  const startTime = Date.now();

  try {
    // Test that the tool configuration exists
    jest.expect(toolConfig).toBeDefined();
    jest.expect(typeof toolConfig).toBe("object");

    // Test that the tool has required properties for AI tools
    jest.expect(toolConfig).toHaveProperty("description");
    jest.expect(toolConfig).toHaveProperty("parameters");
    jest.expect(toolConfig).toHaveProperty("execute");

    // Test description
    jest.expect(toolConfig.description).toBeDefined();
    jest.expect(typeof toolConfig.description).toBe("string");
    jest.expect(toolConfig.description.length).toBeGreaterThan(0);

    // Test parameters schema
    jest.expect(toolConfig.parameters).toBeDefined();
    jest.expect(typeof toolConfig.parameters).toBe("object");

    // Test execute function
    jest.expect(toolConfig.execute).toBeDefined();
    jest.expect(typeof toolConfig.execute).toBe("function");

    // Test that the tool can be called with minimal parameters
    // We'll use a try-catch here since some tools might require specific parameters
    try {
      if (toolName === "webSearch") {
        // webSearch requires specific parameters
        const testParams = {
          queries: ["test query"],
          maxResults: [5],
          topics: ["general"],
          searchDepth: ["basic"],
          exclude_domains: [],
        };
        const result = await toolConfig.execute(testParams);
        console.log("webSearch result: ", result);
        jest.expect(result).toBeDefined();
      } else if (toolName === "ensToAddress") {
        // ensToAddress requires a name parameter
        const testParams = { ensName: VitalikENS };
        const result = await toolConfig.execute(testParams);
        console.log("ensToAddress result: ", result);
        jest.expect(result).toBeDefined();
        jest.expect(result).toHaveProperty("ensName");
        jest.expect(result).toHaveProperty("address");
        jest.expect(typeof result.ensName).toBe("string");
        jest.expect(typeof result.address).toBe("string");
        jest.expect(result.address).toBe(VitalikEthereumAddress);
      } else if (toolName === "getSiteContent") {
        // getSiteContent requires a url parameter
        const testParams = { linkToScrape: "https://example.com" };
        const result = await toolConfig.execute(testParams);
        console.log("getSiteContent result:", result);
        jest.expect(result).toBeDefined();
        // Check for the stable page heading rather than the body copy, which
        // IANA has changed wording on before and can change again.
        jest.expect(result.pageContent).toContain("Example Domain");
      } else if (toolName === "getSolanaChainWalletPortfolio") {
        // getSolanaChainWalletPortfolio requires wallet_address parameter
        const testParams = {
          wallet_address: ShantanuSolanaAddress,
        };
        const result = await toolConfig.execute(testParams);
        console.log("getSolanaChainWalletPortfolio result:", result);
        jest.expect(result).toBeDefined();
        jest.expect(result.type).toBe("portfolio");
        jest.expect(result.id).toBe(ShantanuSolanaAddress);
        // Portfolio tools should return either PortfolioData object or error string
        jest.expect(result).toHaveProperty("attributes");
      } else if (toolName === "searchSolanaTokenMarketData") {
        // searchSolanaTokenMarketData requires address parameter
        const testParams = {
          address: SolanaTokenAddress,
        };
        const result = await toolConfig.execute(testParams);
        console.log("searchSolanaTokenMarketData result:", result);
        jest.expect(result).toBeDefined();
        jest.expect(result[0].attributes.name).toBe("Wrapped SOL");
      } else if (toolName === "getEvmMultiChainWalletPortfolio") {
        // getEvmMultiChainWalletPortfolio requires wallet_address parameter
        const testParams = {
          wallet_address: VitalikEthereumAddress,
          currency: "usd",
        };
        const result = await toolConfig.execute(testParams);
        console.log("getEvmMultiChainWalletPortfolio result:", result);
        jest.expect(result).toBeDefined();
        // Tool returns { summary: PortfolioData, positions: [...], currency }
        jest.expect(result).toHaveProperty("summary");
        jest.expect(result.summary).toHaveProperty("attributes");
        jest
          .expect(result.summary.attributes)
          .toHaveProperty("positions_distribution_by_type");
      } else if (toolName === "searchEvmTokenMarketData") {
        // searchEvmTokenMarketData requires token_address parameter
        const testParams = {
          token_address: EthereumTokenAddress,
          currency: "usd",
        };
        const result = await toolConfig.execute(testParams);
        console.log("searchEvmTokenMarketData result:", result);
        jest.expect(result).toBeDefined();
      } else if (toolName === "getEvmOnchainDataUsingZerion") {
        // getEvmOnchainDataUsingZerion requires userQuery parameter
        const testParams = {
          userQuery: "Get wallet balance for " + VitalikEthereumAddress,
        };
        const result = await toolConfig.execute(testParams);
        console.log("getEvmOnchainDataUsingZerion result:", result);
        jest.expect(result).toBeDefined();
        jest.expect(result).toContain("Total Value");
      } else if (toolName === "getEvmWalletPositionsUsingZerion") {
        // getEvmWalletPositionsUsingZerion requires wallet_address parameter
        const testParams = {
          wallet_address: VitalikEthereumAddress,
        };
        const result = await toolConfig.execute(testParams);
        console.log("getEvmWalletPositionsUsingZerion result:", result);
        jest.expect(result).toBeDefined();
        jest.expect(typeof result).toBe("object");
        jest.expect(result[0].value).toBeDefined();
      } else if (toolName === "getEvmOnchainDataUsingBlockscout") {
        // getEvmOnchainDataUsingBlockscout (uses Blockscout API v2) requires userQuery parameter
        const testParams = { userQuery: "Get latest block number" };
        const result = await toolConfig.execute(testParams);
        console.log("getEvmOnchainDataUsingBlockscout (Blockscout) result:", result);
        jest.expect(result).toBeDefined();
        jest.expect(result).toContain("block number");

        const testParams2 = {
          userQuery:
            "Get the transaction details for 0x1808017091f3091d92b66b47e197854241beb98611b35635105dd0637fc61d2e",
        };
        const result2 = await toolConfig.execute(testParams2);
        console.log("getEvmOnchainDataUsingBlockscout (Blockscout) result2:", result2);
        jest.expect(result2).toBeDefined();
        jest.expect(result2).toContain("Transaction Hash");
        jest
          .expect(result2)
          .toContain(
            "0x1808017091f3091d92b66b47e197854241beb98611b35635105dd0637fc61d2e"
          );
      } else if (toolName === "translateTransactions") {
        // translateTransactions requires transactionDetails, chain, and userQuery parameters
        const testParams = {
          transactionDetails:
            '{"hash":"0x1808017091f3091d92b66b47e197854241beb98611b35635105dd0637fc61d2e","from":"0x339D19296bc061f4a8e413C717686aa32A54d4a6","to":"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","value":"0.00000123"}',
          chain: "eth",
          userQuery: "What does this transaction do?",
        };
        const result = await toolConfig.execute(testParams);
        console.log("translateTransactions result:", result);
        jest.expect(result).toBeDefined();
        jest.expect(result[0].type).toBe("sendToken");
      } else if (toolName === "defiLlama") {
        // defiLlama requires userQuery parameter
        const testParams = { userQuery: "Get top DeFi protocols by TVL" };
        const result = await toolConfig.execute(testParams);
        console.log("defiLlama result:", result);
        jest.expect(result).toBeDefined();
        jest
          .expect(result)
          .toContain("Here are the top DeFi protocols by Total Value Locked");
      } else {
        // For other tools, try calling with empty object
        // const result = await toolConfig.execute({});
        // // console.log("other tool result:", result);
        // jest.expect(result).toBeDefined();
      }
    } catch (paramError) {
        // Only treat "parameter required" or validation errors as expected
        const msg = (paramError as Error).message || "";
      
        if (msg.toLowerCase().includes("missing") || msg.toLowerCase().includes("parameter")) {
          console.log(`    ⚠️  Tool ${toolName} requires specific parameters (expected)`);
        } else {
          throw paramError; // ✅ rethrow actual test failures like wrong type/value
        }
      }
      

    const duration = Date.now() - startTime;
    return {
      toolName,
      status: "passed",
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      toolName,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

async function runToolTests(): Promise<ToolTestResult[]> {
  const results: ToolTestResult[] = [];

  // Get all tools with default configuration
  const tools = getAllToolsWithConfigs({
    modelName: "gpt-4o-mini",
    mode: "on_chain" as SearchGroupId,
  });

  console.log(`\n🔧 Testing ${Object.keys(tools).length} tools...\n`);

  // Test each tool
  for (const [toolName, toolConfig] of Object.entries(tools)) {
    console.log(`Testing tool: ${toolName}`);
    const result = await testTool(toolName, toolConfig);
    results.push(result);

    if (result.status === "passed") {
      console.log(`  ✅ ${toolName} - PASSED (${result.duration}ms)`);
    } else {
      console.log(`  ❌ ${toolName} - FAILED: ${result.error}`);
    }
  }

  return results;
}

export async function GET() {
  try {
    console.log("🏥 Starting health check...");

    const startTime = Date.now();
    const toolResults = await runToolTests();
    const totalDuration = Date.now() - startTime;

    const passedTools = toolResults.filter((r) => r.status === "passed").length;
    const failedTools = toolResults.filter((r) => r.status === "failed").length;
    const totalTools = toolResults.length;

    const isHealthy = failedTools === 0;

    const result: HealthCheckResult = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      totalTools,
      passedTools,
      failedTools,
      toolResults,
      summary: `Health check completed in ${totalDuration}ms. ${passedTools}/${totalTools} tools passed.`,
    };

    console.log(`\n📊 Health Check Summary:`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Total Tools: ${totalTools}`);
    console.log(`   Passed: ${passedTools}`);
    console.log(`   Failed: ${failedTools}`);
    console.log(`   Duration: ${totalDuration}ms`);

    return NextResponse.json(result, {
      status: isHealthy ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("❌ Health check failed:", error);

    const errorResult: HealthCheckResult = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      totalTools: 0,
      passedTools: 0,
      failedTools: 0,
      toolResults: [],
      summary: `Health check failed with error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };

    return NextResponse.json(errorResult, {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
