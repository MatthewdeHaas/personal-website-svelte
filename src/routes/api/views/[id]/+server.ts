import { sql } from "$lib/db";

export const POST = async ({ params }) => {
  await sql`
    UPDATE assets SET view_count = view_count + 1 WHERE id = ${params.id}
  `;
  return new Response(null, { status: 204 });
};
