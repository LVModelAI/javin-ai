const APTOS_GRAPHQL_ENDPOINT =
  "https://indexer.mainnet.aptoslabs.com/v1/graphql";

// Utility function for making GraphQL requests
async function fetchGraphQL(query: string, variables: Record<string, any>) {
  try {
    const response = await fetch(APTOS_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();

    if (!response.ok || json.errors) {
      throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
    }

    return json.data;
  } catch (error) {
    console.error(`Error fetching data: ${error}`);
    throw error;
  }
}

// 1️⃣ Get Transaction Block Number
export async function getPortfolio(address: string, limit = 25, offset = 0) {
  console.log("Fetching portfolio for address:", address);
  const ownedTokens = await getOwnedTokens(address, limit, offset);
  const ownedCoins = await getOwnedCoinsData(address, limit, offset);
  return {
    ownedTokens,
    ownedCoins,
  };
}

// 1️⃣ Get Transaction Block Number
export async function getAccountTransactionsData(
  address: string,
  limit = 25,
  offset = 0
) {
  console.log("Fetching transactions for address:", address);
  const query = `
    query AccountTransactionsData($address: String, $limit: Int, $offset: Int) {
      account_transactions(
        where: {account_address: {_eq: $address}}
        order_by: {transaction_version: desc}
        limit: $limit
        offset: $offset
      ) {
        transaction_version
        __typename
      }
    }
  `;
  return await fetchGraphQL(query, { address, limit, offset });
}

// 2️⃣ Get Coins and Fungible Assets Data
export async function getOwnedCoinsData(
  ownerAddress: string,
  limit = 100,
  offset = 0
) {
  console.log("Fetching coins data for address:", ownerAddress);
  const query = `
    query CoinsData($owner_address: String, $limit: Int, $offset: Int) {
      current_fungible_asset_balances(
        where: {owner_address: {_eq: $owner_address}}
        limit: $limit
        offset: $offset
      ) {
        amount
        asset_type
        metadata {
          name
          decimals
          symbol
          token_standard
        }
      }
    }
  `;
  const data = await fetchGraphQL(query, {
    owner_address: ownerAddress,
    limit,
    offset,
  });
  console.log("Coins data:", data);
  /* "data": {
    "current_fungible_asset_balances": [
      {
        "amount": 195241136,
        "asset_type": "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::amapt_token::AmnisApt",
        "metadata": {
          "name": "Amnis Aptos Coin",
          "decimals": 8,
          "symbol": "amAPT",
          "token_standard": "v1"
        }
      },
      */
  // divide the amount by 10^decimals to get the actual amount
  const coinsData = data.current_fungible_asset_balances.map((coin: any) => {
    const { amount, metadata } = coin;
    const { decimals } = metadata;
    return {
      ...coin,
      amount: amount / Math.pow(10, decimals),
    };
  });
  console.log("Coins data:", coinsData);
  return coinsData;
}

// 3️⃣ Get Count of Fungible Assets
export async function getFungibleAssetCount(address: string) {
  console.log("Fetching fungible asset count for address:", address);
  const query = `
    query GetFungibleAssetCount($address: String) {
      current_fungible_asset_balances_aggregate(
        where: {owner_address: {_eq: $address}}
      ) {
        aggregate {
          count
        }
      }
    }
  `;
  return await fetchGraphQL(query, { address });
}

// 4️⃣ Get Count of Tokens Held
export async function getAccountTokensCount(address: string) {
  console.log("Fetching token count for address:", address);
  const query = `
    query getAccountTokensCount($where_condition: current_token_ownerships_v2_bool_exp) {
      current_token_ownerships_v2_aggregate(
        where: $where_condition
      ) {
        aggregate {
          count
        }
      }
    }
  `;
  const whereCondition = {
    owner_address: { _eq: address },
    amount: { _gt: "0" },
  };
  return await fetchGraphQL(query, { where_condition: whereCondition });
}

// 5️⃣ Get Detailed Information of Tokens Held
export async function getOwnedTokens(address: string, limit = 20, offset = 0) {
  console.log("Fetching owned tokens for address:", address);
  const query = `
    query getOwnedTokens($where_condition: current_token_ownerships_v2_bool_exp!, $offset: Int, $limit: Int) {
      current_token_ownerships_v2(
        where: $where_condition
        offset: $offset
        limit: $limit
      ) {
        token_standard
        token_data_id
        owner_address
        amount
        current_token_data {
          token_name
          token_standard
          token_uri
        }
      }
    }
  `;
  const whereCondition = {
    owner_address: { _eq: address },
    amount: { _gt: 0 },
  };
  return await fetchGraphQL(query, {
    where_condition: whereCondition,
    offset,
    limit,
  });
}

// 6️⃣ Get Token Data
export async function getTokenData(tokenDataId: string) {
  console.log("Fetching token data for token address:", tokenDataId);
  const query = `
    query getTokenData($where_condition: current_token_datas_v2_bool_exp) {
      current_token_datas_v2(
        where: $where_condition
      ) {
        token_name
        token_standard
        token_uri
      }
    }
  `;
  const whereCondition = {
    token_data_id: { _eq: tokenDataId },
  };
  return await fetchGraphQL(query, { where_condition: whereCondition });
}

// 7️⃣ Get Token Activity
export async function getTokenActivity(
  tokenDataId: string,
  limit = 20,
  offset = 0
) {
  console.log("Fetching token activity for token ID:", tokenDataId);
  const query = `
    query getTokenActivity($where_condition: token_activities_v2_bool_exp!) {
      token_activities_v2(
        where: $where_condition
        offset: $offset
        limit: $limit
      ) {
        transaction_version
        transaction_timestamp
        token_amount
      }
    }
  `;
  const whereCondition = {
    token_data_id: { _eq: tokenDataId },
  };
  return await fetchGraphQL(query, {
    where_condition: whereCondition,
    offset,
    limit,
  });
}

// 8️⃣ Get Transaction Balance Change
export async function getTransactionBalanceChange(txnVersion: string) {
  console.log(
    "Fetching transaction balance change for txn version:",
    txnVersion
  );
  const query = `
    query TransactionQuery($txn_version: String) {
      fungible_asset_activities(where: {transaction_version: {_eq: $txn_version}}) {
        amount
        asset_type
        owner_address
        transaction_timestamp
        transaction_version
      }
    }
  `;
  return await fetchGraphQL(query, { txn_version: txnVersion });
}
