import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "../db.ts";

export const runMigrations = async () => {
  try {
    const schemaPath =
      process.env.NODE_ENV === "production"
        ? join(process.cwd(), "schema.sql")
        : join(process.cwd(), "db/schema.sql");

    const schema = readFileSync(schemaPath, "utf8");
    await sql.unsafe(schema);
    console.log("Migrations complete");
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  }
};
