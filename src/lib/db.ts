import postgres from "postgres";
import { env } from "$env/dynamic/private";

const sql = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
});

export { sql };
