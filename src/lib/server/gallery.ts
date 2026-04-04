import { sql } from "$lib/db";

export interface Album {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  year: string;
  asset_count: number;
}

export interface Asset {
  id: number;
  album_id: number;
  type: "photo" | "video";
  url: string;
  caption: string | null;
  position: number;
  view_count: number;
}

export const getAlbums = async (): Promise<Album[]> => {
  return await sql<Album[]>`
    SELECT
      a.id,
      a.slug,
      a.title,
      a.description,
      a.cover_url,
      a.year,
      COUNT(ast.id)::int AS asset_count
    FROM albums a
    LEFT JOIN assets ast ON ast.album_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;
};

export const getAlbum = async (slug: string): Promise<Album | null> => {
  const rows = await sql<Album[]>`
    SELECT
      a.id,
      a.slug,
      a.title,
      a.description,
      a.cover_url,
      a.year,
      COUNT(ast.id)::int AS asset_count
    FROM albums a
    LEFT JOIN assets ast ON ast.album_id = a.id
    WHERE a.slug = ${slug}
    GROUP BY a.id
  `;
  return rows[0] ?? null;
};

export const getAssets = async (albumId: number): Promise<Asset[]> => {
  return await sql<Asset[]>`
    SELECT id, album_id, type, url, caption, position, view_count
    FROM assets
    WHERE album_id = ${albumId}
    ORDER BY position ASC, created_at ASC
  `;
};

export const incrementViewCount = async (assetId: number): Promise<void> => {
  await sql`
    UPDATE assets SET view_count = view_count + 1 WHERE id = ${assetId}
  `;
};
