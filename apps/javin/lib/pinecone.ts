import { Pinecone } from "@pinecone-database/pinecone";
import { buildClientSchema, printSchema, parse, validate } from "graphql";
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { cosineSimilarity } from "ai";
import {
  GraphQLSchema,
  isObjectType,
  getNamedType,
  GraphQLList,
} from "graphql";

// Pinecone setup
const PINECONE_API_KEY = process.env.PINECONE_API_KEY!;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME!;
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST!;

if (!PINECONE_INDEX_NAME || !PINECONE_INDEX_HOST) {
  throw new Error("❌ Pinecone index name or host is missing in env vars.");
}

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pinecone.index(PINECONE_INDEX_NAME, PINECONE_INDEX_HOST);

// Embedding model
const embeddingModel = openai.embedding("text-embedding-3-small");

function getRootQueryMappings(schema: GraphQLSchema): Record<string, string> {
  const queryType = schema.getQueryType();
  if (!queryType) return {};

  const fields = queryType.getFields();
  const mappings: Record<string, string> = {};

  for (const fieldName in fields) {
    const field = fields[fieldName];
    const type = getNamedType(field.type);

    const isList =
      field.type instanceof GraphQLList || String(field.type).includes("[");
    const returnType = isList ? `${type.name}[]` : type.name;

    mappings[type.name] = `${fieldName} → ${returnType}`;
  }

  return mappings;
}

function batch<T>(array: T[], batchSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    result.push(array.slice(i, i + batchSize));
  }
  return result;
}

// 2. Chunk and enrich with query root metadata
export async function chunkSchemaFromIntrospection(
  introspectionData: any
): Promise<string[]> {
  const schema = buildClientSchema(introspectionData);
  const sdl = printSchema(schema);
  const rawChunks = sdl.split(
    /\n(?=type\s|enum\s|interface\s|input\s|scalar\s|union\s)/g
  );

  const queryMappings = getRootQueryMappings(schema);

  const enrichedChunks = rawChunks.map((chunk) => {
    const match = chunk.match(/^type\s+(\w+)/);
    if (!match) return chunk;

    const typeName = match[1];
    const queryInfo = queryMappings[typeName];
    if (queryInfo) {
      return `# Root query: ${queryInfo}\n${chunk}`;
    }

    return chunk;
  });

  // 3. Add the full Query root as its own chunk (optional but very helpful)
  const queryChunkMatch = sdl.match(/type\s+Query\s+{[^}]*}/s);
  if (queryChunkMatch) {
    enrichedChunks.push(`# All query roots:\n${queryChunkMatch[0]}`);
  }

  return enrichedChunks;
}

// // Optional: chunk directly from SDL if available
// export async function chunkSchema(schemaSDL: string): Promise<string[]> {
//   return schemaSDL.split(
//     /\n(?=type\s|enum\s|interface\s|input\s|scalar\s|union\s)/g
//   );
// }

// Check if schema vectors already exist in Pinecone
export async function schemaExists(subgraphId: string): Promise<boolean> {
  console.log(
    "Checking if schema with id  ",
    subgraphId,
    "  exists in Pinecone..."
  );
  const results = await index.namespace(subgraphId).query({
    topK: 1,
    vector: new Array(1536).fill(0), // dummy vector for existence check
    includeMetadata: false,
  });
  return results.matches.length > 0;
}

// Embed and store schema chunks in Pinecone
export async function embedAndStoreChunks(
  subgraphId: string,
  schemaChunks: string[]
) {
  console.log("Embedding schema chunks...");

  const batchSize = 50;
  const batches = batch(schemaChunks, batchSize);
  let vectors: any[] = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batchChunks = batches[batchIndex];

    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: batchChunks,
    });

    const batchVectors = batchChunks.map((chunk, i) => ({
      id: `${subgraphId}-${batchIndex}-${i}`,
      values: embeddings[i],
      metadata: { text: chunk },
    }));

    vectors.push(...batchVectors);
  }

  await index.namespace(subgraphId).upsert(vectors);

  console.log(
    `✅ Uploaded ${vectors.length} schema chunks in batches to Pinecone namespace "${subgraphId}"`
  );
}

// Retrieve top schema chunks relevant to a user query
export async function queryRelevantSchemaChunks(
  subgraphId: string,
  userQuery: string
) {
  console.log("Querying relevant schema chunks...");
  const { embedding } = await embed({
    model: embeddingModel,
    value: userQuery,
  });

  const results = await index.namespace(subgraphId).query({
    topK: 10,
    vector: embedding,
    includeMetadata: true,
  });

  return (
    results.matches?.map((match) => match.metadata?.text || "").join("\n\n") ||
    ""
  );
}

export async function queryRelevantSchemaChunksWithBoosting(
  subgraphId: string,
  userQuery: string,
  keywords: string[] = []
) {
  console.log("Querying relevant schema chunks...");

  const { embedding } = await embed({
    model: embeddingModel,
    value: userQuery,
  });

  const results = await index.namespace(subgraphId).query({
    topK: 20,
    vector: embedding,
    includeMetadata: true,
  });

  const chunks = results.matches.map((match) => ({
    text: match.metadata?.text || "",
    score: match.score || 0,
  }));

  // Boost by keyword match
  const boostedChunks = chunks.map((chunk) => {
    let boost = 0;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      //@ts-ignore
      if (regex.test(chunk.text)) boost += 0.2;
    }

    return {
      ...chunk,
      score: chunk.score + boost,
    };
  });

  // Sort and return top-ranked
  const sorted = boostedChunks.sort((a, b) => b.score - a.score).slice(0, 10);

  return sorted.map((c) => c.text).join("\n\n");
}
