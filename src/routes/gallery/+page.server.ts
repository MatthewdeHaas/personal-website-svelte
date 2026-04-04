import { getAlbums } from "$lib/server/gallery";

export const load = async () => {
  const albums = await getAlbums();
  return { albums };
};
