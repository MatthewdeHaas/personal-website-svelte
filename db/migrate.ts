import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";
import "dotenv/config";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = postgres(url);

const main = async () => {
  console.log("Running migrations...");

  const schema = readFileSync(join(process.cwd(), "schema.sql"), "utf8");
  await sql.unsafe(schema);

  console.log("Migrations complete");
  await sql.end();
};

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
