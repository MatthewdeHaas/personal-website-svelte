import { createApiClient } from "dots-wrapper";
import { existsSync, readFileSync, writeFileSync } from "fs";
import "dotenv/config";

const DROPLET_NAME = "personal-site";
const GITHUB_REPO = "your-username/personal-site";

const token = process.env.DIGITALOCEAN_TOKEN;
if (!token) throw new Error("DIGITALOCEAN_TOKEN is not set");

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) throw new Error("GITHUB_TOKEN is not set");

const dots = createApiClient({ token });

const getDroplet = async () => {
  const {
    data: { droplets },
  } = await dots.droplet.listDroplets({});
  return droplets?.find((d) => d.name === DROPLET_NAME) ?? null;
};

const deleteGithubVariable = async (name: string) => {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/variables/${name}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (res.ok || res.status === 404) {
    console.log(`GitHub variable ${name} removed`);
  } else {
    console.warn(`Failed to delete GitHub variable ${name}: ${res.status}`);
  }
};

const main = async () => {
  const droplet = await getDroplet();

  if (!droplet) {
    console.log(`Droplet ${DROPLET_NAME} not found — nothing to teardown`);
  } else {
    console.log(`Deleting droplet ${DROPLET_NAME} (${droplet.id})...`);
    await dots.droplet.deleteDroplet({ droplet_id: droplet.id! });
    console.log("Droplet deleted");
  }

  await deleteGithubVariable("DROPLET_IP");

  if (existsSync(".env")) {
    const existing = readFileSync(".env", "utf8");
    const updated = existing
      .split("\n")
      .filter(
        (line) =>
          !line.startsWith("DROPLET_IP=") && !line.startsWith("DROPLET_ID="),
      )
      .join("\n");
    writeFileSync(".env", updated);
    console.log(".env updated — DROPLET_IP and DROPLET_ID removed");
  }

  console.log("\nTeardown complete.");
};

main().catch((err) => {
  console.error("Teardown failed:", err);
  process.exit(1);
});
