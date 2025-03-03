import $RefParser from "@apidevtools/json-schema-ref-parser";
import { parse } from "yaml";

async function fetchYAML(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch YAML: ${response.statusText}`);

    const yamlText = await response.text();
    return parse(yamlText); // Parse YAML to OBJECT
  } catch (error) {
    console.error("Error fetching YAML:", error);
  }
}

export async function loadOpenAPI(url: string) {
  // Read and parse the YAML file
  const openapiData = await fetchYAML(url);
  // Resolve $ref references
  return await $RefParser.dereference(openapiData);
}

export async function loadOpenAPIFromJson(json: any) {
  // Resolve $ref references
  return await $RefParser.dereference(json);
}

// returns a list of all paths and their summaries in a json string
export async function getAllPaths(openapiData: any) {
  return JSON.stringify(
    Object.entries(openapiData.paths || {}).map(
      ([path, methods]: [string, any]) => {
        // Get the first available HTTP method (e.g., GET, POST, etc.)
        const firstMethod = Object.keys(methods)[0];
        const summary = firstMethod
          ? methods[firstMethod]?.summary || "No summary available"
          : "No summary available";

        return { path, summary };
      }
    )
  );
}

// get info of the path with the name from the open api spec
// delete the repsonses because it is irrelevant and too big
export async function getPathInfo(openapiData: any, path: string) {
  const pathInfo = { ...openapiData.paths?.[path] };
  if (pathInfo) {
    for (const method of Object.keys(pathInfo)) {
      if (typeof pathInfo[method] === "object") {
        delete pathInfo[method].responses;
      }
    }
  }
  return { path: pathInfo };
}
