import { error } from "@sveltejs/kit";
import { getAlbum, getAssets } from "$lib/server/gallery";

export const load = async ({ params }) => {
  const album = await getAlbum(params.album);
  if (!album) error(404, "Album not found");

  const assets = await getAssets(album.id);
  return { album, assets };
};
