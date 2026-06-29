import { openApiSchema } from "./schema";

function jsonToYaml(value: unknown, indent = 0): string {
  const space = " ".repeat(indent);

  if (value === null) return "null";
  if (typeof value === "string") {
    if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return `${space}- ${jsonToYaml(item, indent + 2).trimStart()}`;
        }
        return `${space}- ${jsonToYaml(item, indent + 2)}`;
      })
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";

    return entries
      .map(([key, item]) => {
        const safeKey = /^[A-Za-z0-9_.\/{}-]+$/.test(key) ? key : JSON.stringify(key);
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return `${space}${safeKey}:\n${jsonToYaml(item, indent + 2)}`;
        }
        if (Array.isArray(item)) {
          return `${space}${safeKey}:\n${jsonToYaml(item, indent + 2)}`;
        }
        return `${space}${safeKey}: ${jsonToYaml(item, indent + 2)}`;
      })
      .join("\n");
  }

  return JSON.stringify(value);
}

export function getOpenApiJson() {
  return openApiSchema;
}

export function getOpenApiYaml() {
  return `${jsonToYaml(openApiSchema)}\n`;
}
