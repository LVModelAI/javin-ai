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

// returns a list of all paths as an array
export async function getAllPathsUrl(openapiData: any): Promise<string[]> {
  return Object.keys(openapiData.paths || {});
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

export async function getAllPathsAndSummary(openapiData: any) {
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

export async function getAllPathsAndDesc(openapiData: any) {
  return JSON.stringify(
    Object.entries(openapiData.paths || {})
      .filter(([_, methods]: [string, any]) => !methods.POST) // Skip paths with POST method
      .map(([path, methods]: [string, any]) => {
        // Get the first available non-POST HTTP method (e.g., GET, PUT, etc.)
        const availableMethods = Object.keys(methods).filter(
          (method) => method !== "post"
        );
        const firstMethod = availableMethods[0];

        const desc = firstMethod
          ? methods[firstMethod]?.description || "No desc available"
          : "No desc available";

        return { path, desc };
      })
  );
}

export async function getAllPathDetails(openapiData: any) {
  const pathDetailsPromises = Object.entries(openapiData.paths || {}).map(
    async ([path, methods]: [string, any]) => {
      const t = await getPathDetails(openapiData, path);
      return { path: path, details: t };
    }
  );

  return await Promise.all(pathDetailsPromises);
}

export async function getPathDetails(openapiData: any, pathUrl: string) {
  //give all the parameters for a path
  const pathObj = openapiData.paths?.[pathUrl];

  if (!pathObj) {
    throw new Error(`Path '${pathUrl}' not found in the OpenAPI spec.`);
  }

  const details = Object.entries(pathObj).map(
    ([method, methodDetails]: [string, any]) => {
      const description =
        methodDetails?.description || "No description available";

      // Extract parameters (inline and referenced)
      const parameters = (methodDetails.parameters || []).map((param: any) => {
        if (param.$ref) {
          // Resolve the referenced parameter
          const refKey = param.$ref.replace("#/components/parameters/", "");
          return (
            openapiData.components?.parameters?.[refKey] || {
              error: "Reference not found",
            }
          );
        }
        return param;
      });
      const mainServerUrl = openapiData.servers?.[0]?.url;

      const servers = methodDetails?.servers || [];
      const serverUrl = servers[0]?.url || mainServerUrl;
      console.log("server url is ", serverUrl);
      return {
        method: method.toUpperCase(),
        description,
        parameters,
        baseUrl: serverUrl,
      };
    }
  );

  return details;
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
