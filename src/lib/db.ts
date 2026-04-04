import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

const sql = postgres(DATABASE_URL);

export { sql };
