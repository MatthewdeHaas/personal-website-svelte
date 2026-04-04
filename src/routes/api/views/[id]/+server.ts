import { incrementViewCount } from "$lib/server/gallery";
import { json } from "@sveltejs/kit";

export const POST = async ({ params }) => {
  const id = parseInt(params.id);
  if (isNaN(id)) return json({ error: "Invalid id" }, { status: 400 });

  await incrementViewCount(id);
  return new Response(null, { status: 204 });
};
