import postgres from "postgres";
import "dotenv/config";

const sql = postgres(process.env.DATABASE_URL!);

const main = async () => {
  // Insert album
  const [album] = await sql`
    INSERT INTO albums (slug, title, description, cover_url, year)
    VALUES (
      'mountains',
      'Mountains',
      'Hiking and such.',
      'https://personal-site-media.sfo3.digitaloceanspaces.com/albums/mountains/black-tusk.webp',
      '2025'
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      cover_url = EXCLUDED.cover_url,
      year = EXCLUDED.year
    RETURNING id
  `;

  // Insert assets
  await sql`
		INSERT INTO assets (album_id, type, url, caption, position)
		VALUES
			(${album.id}, 'photo', 'https://personal-site-media.sfo3.digitaloceanspaces.com/albums/mountains/black-tusk.webp', 'A very cloudy day', 1)
		ON CONFLICT DO NOTHING
	`;

  console.log("Seed complete");
  await sql.end();
};

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
