/**
 * JSON Schema validation via Ajv (draft 2020-12).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const SCHEMA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "schemas");

export const SCHEMA_NAMES = [
  "scope",
  "search",
  "extraction",
  "support",
  "challenge",
  "adjudication",
  "report",
];

const ajv = new Ajv2020.default({ allErrors: true, strict: true, allowUnionTypes: true });
const validators = new Map();

export function schemaPath(name) {
  if (!SCHEMA_NAMES.includes(name)) {
    throw new Error(`unknown schema: ${name}`);
  }
  return path.join(SCHEMA_DIR, `${name}.schema.json`);
}

function validatorFor(name) {
  let validator = validators.get(name);
  if (!validator) {
    const schema = JSON.parse(readFileSync(schemaPath(name), "utf8"));
    validator = ajv.compile(schema);
    validators.set(name, validator);
  }
  return validator;
}

/**
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validate(name, data) {
  const validator = validatorFor(name);
  const valid = validator(data);
  if (valid) return { valid: true, errors: [] };
  const errors = (validator.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
  );
  return { valid: false, errors };
}
