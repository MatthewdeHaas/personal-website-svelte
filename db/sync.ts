import postgres from "postgres";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import "dotenv/config";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

const sql = postgres(process.env.DATABASE_URL!);

const client = new S3Client({
  endpoint: "https://sfo3.digitaloceanspaces.com",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY!,
    secretAccessKey: process.env.SPACES_SECRET_KEY!,
  },
});

const BUCKET = "personal-site-media";
const BASE_URL = "https://personal-site-media.sfo3.digitaloceanspaces.com";

const listFolders = async (): Promise<string[]> => {
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "albums/",
      Delimiter: "/",
    }),
  );

  return (res.CommonPrefixes ?? []).map((p) => p.Prefix!).filter(Boolean);
};

const listAssets = async (prefix: string): Promise<string[]> => {
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    }),
  );

  return (res.Contents ?? [])
    .map((o) => o.Key!)
    .filter((key) => !key.endsWith("/"));
};

const slugFromPrefix = (prefix: string): string => {
  // 'albums/mountains/' -> 'mountains'
  return prefix.replace("albums/", "").replace("/", "");
};

const typeFromKey = (key: string): "photo" | "video" => {
  const ext = key.split(".").at(-1)?.toLowerCase() ?? "";
  return ["mp4", "mov", "webm"].includes(ext) ? "video" : "photo";
};

const getMetadata = async (prefix: string) => {
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: `${prefix}metadata.json`,
      }),
    );
    const body = await res.Body?.transformToString();
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
};

const main = async () => {
  const folders = await listFolders();
  console.log(`Found ${folders.length} album(s) in Spaces`);

  for (const folder of folders) {
    const slug = slugFromPrefix(folder);

    // Upsert album — preserve existing title/description/cover_url/year if set
    const metadata = await getMetadata(folder);
    const title = metadata?.title || slug;
    const year = metadata?.year || new Date().getFullYear().toString();

    const [album] = await sql`
			INSERT INTO albums (slug, title, year, description)
			VALUES (${slug}, ${title}, ${year}, ${metadata?.description || ""})
			ON CONFLICT (slug) DO UPDATE SET
				title = EXCLUDED.title,
				year = EXCLUDED.year,
				description = EXCLUDED.description
			RETURNING id, slug
		`;

    console.log(`Album: ${album.slug} (id: ${album.id})`);

    const keys = await listAssets(folder);
    console.log(`  Found ${keys.length} asset(s)`);

    for (const [i, key] of keys.entries()) {
      const url = `${BASE_URL}/${key}`;
      const type = typeFromKey(key);

      await sql`
        INSERT INTO assets (album_id, type, url, position)
        VALUES (${album.id}, ${type}, ${url}, ${i + 1})
        ON CONFLICT (url) DO NOTHING
      `;

      console.log(`  ${type}: ${key}`);
    }
  }

  console.log("Sync complete");
  await sql.end();
};

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
