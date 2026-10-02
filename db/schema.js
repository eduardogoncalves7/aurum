"use strict";

// Shared by the Node migration runner and the Next server. Never accept SQL here.
function getDbSchema(value = process.env.DB_SCHEMA) {
  const schema = value === undefined ? "public" : value;
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema) || schema.startsWith("pg_") || schema === "information_schema") {
    throw new Error("AURUM_INVALID_DB_SCHEMA");
  }
  return schema;
}
function quotedDbSchema(value = process.env.DB_SCHEMA) {
  return `"${getDbSchema(value)}"`;
}
module.exports = { getDbSchema, quotedDbSchema };
