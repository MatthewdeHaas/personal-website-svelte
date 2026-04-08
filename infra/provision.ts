import { createApiClient } from "dots-wrapper";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutBucketAclCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { NodeSSH } from "node-ssh";
import { join } from "path";
import "dotenv/config";

const REGION = "sfo3";
const DROPLET_NAME = "personal-site";
const DROPLET_SIZE = "s-1vcpu-1gb";
const DROPLET_IMAGE = "docker-20-04";
const DOMAIN = "mattdehaas.dev";

const VOLUME_NAME = "personal-site-pg-data";
const VOLUME_SIZE_GB = 10;
const VOLUME_MOUNT = "/mnt/personal_site_pg_data";

const GITHUB_REPO = "MatthewdeHaas/personal-website-svelte";

const BUCKET_NAME = "personal-site-media";
const SPACES_ENDPOINT = `https://${REGION}.digitaloceanspaces.com`;

const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
if (!POSTGRES_PASSWORD) throw new Error("POSTGRES_PASSWORD is not set");

const APP_DB_PASSWORD = process.env.APP_DB_PASSWORD;
if (!APP_DB_PASSWORD) throw new Error("APP_DB_PASSWORD is not set");

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

const createDroplet = async (
  sshKeyFingerprints: string[],
  volumeId: string,
) => {
  console.log(`Creating droplet ${DROPLET_NAME}...`);
  const {
    data: { droplet },
  } = await dots.droplet.createDroplet({
    name: DROPLET_NAME,
    region: REGION,
    size: DROPLET_SIZE,
    image: DROPLET_IMAGE,
    ssh_keys: sshKeyFingerprints,
    volume_ids: [volumeId],
    tags: ["personal-site"],
  });
  console.log(`Droplet created: ${droplet!.id}`);
  return droplet!;
};

const getSshKey = async (name: string) => {
  const {
    data: { ssh_keys },
  } = await dots.sshKey.listSshKeys({});
  const key = ssh_keys?.find((k) => k.name === name);
  if (!key) throw new Error(`SSH key '${name}' not found on DO account`);
  return key;
};

const getOrCreateDeployKey = async (keyPath: string) => {
  if (!existsSync(keyPath)) {
    console.log("Generating deploy key...");
    execSync(
      `ssh-keygen -t ed25519 -C "personal-site-deploy" -f ${keyPath} -N ""`,
    );
    console.log("Deploy key generated");
  } else {
    console.log("Deploy key already exists locally");
  }

  const {
    data: { ssh_keys },
  } = await dots.sshKey.listSshKeys({});
  let deployKey = ssh_keys?.find((k) => k.name === "personal-site-deploy");

  if (!deployKey) {
    const pubKey = readFileSync(`${keyPath}.pub`, "utf8").trim();
    console.log("Adding deploy key to DO account...");
    const { data } = await dots.sshKey.createSshKey({
      name: "personal-site-deploy",
      public_key: pubKey,
    });
    deployKey = data.ssh_key;
    console.log("Deploy key added to DO account");
  } else {
    console.log("Deploy key already on DO account");
  }

  return deployKey!;
};

const waitForActive = async () => {
  console.log("Waiting for droplet to become active...");
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const current = await getDroplet();
    if (current?.status === "active") {
      console.log("Droplet is active");
      return current;
    }
  }
  throw new Error("Droplet did not become active in time");
};

const setupDroplet = async (ip: string, deployKeyPath: string) => {
  const ssh = new NodeSSH();

  console.log("Waiting for SSH to become available...");
  for (let i = 0; i < 20; i++) {
    try {
      await ssh.connect({
        host: ip,
        username: "root",
        privateKeyPath: deployKeyPath,
      });
      console.log("SSH connection established");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  if (!ssh.isConnected()) throw new Error("SSH connection failed");

  const volumeCommands = [
    `sleep 5 && lsblk /dev/sda | grep -q ext4 || mkfs.ext4 /dev/sda`,
    `mkdir -p ${VOLUME_MOUNT}`,
    `mountpoint -q ${VOLUME_MOUNT} || mount /dev/sda ${VOLUME_MOUNT}`,
    `grep -q '/dev/sda' /etc/fstab || echo '/dev/sda ${VOLUME_MOUNT} ext4 defaults,nofail 0 2' >> /etc/fstab`,
    `mkdir -p ${VOLUME_MOUNT}/postgres`,
    `chown -R 999:999 ${VOLUME_MOUNT}/postgres`,
  ];

  for (const cmd of volumeCommands) {
    console.log(`Running: ${cmd}`);
    const result = await ssh.execCommand(cmd);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }

  const commands = [
    "ufw allow 22",
    "ufw allow 80",
    "ufw allow 443",
    "ufw default deny incoming",
    "ufw default allow outgoing",
    "ufw --force enable",
    "mkdir -p /app",
  ];

  for (const cmd of commands) {
    console.log(`Running: ${cmd}`);
    const result = await ssh.execCommand(cmd);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }

  const repoRoot = join(process.cwd(), "..");
  await ssh.putFile(
    join(repoRoot, "infra/docker-compose.prod.yaml"),
    "/app/docker-compose.prod.yaml",
  );
  console.log("docker-compose.prod.yaml uploaded");

  await ssh.putFile(join(repoRoot, "docker/Caddyfile"), "/app/Caddyfile");
  console.log("Caddyfile uploaded");

  await ssh.dispose();
  console.log("Droplet setup complete");
};

const setupDns = async (ip: string) => {
  const {
    data: { domain_records },
  } = await dots.domain.listDomainRecords({
    domain_name: DOMAIN,
  });

  const existing = domain_records?.find(
    (r) => r.type === "A" && r.name === "svelte",
  );

  if (existing) {
    console.log("DNS A record exists, updating...");
    await dots.domain.updateDomainRecord({
      domain_name: DOMAIN,
      domain_record_id: existing.id!,
      type: "A",
      name: "svelte",
      data: ip,
      ttl: 300,
    });
  } else {
    console.log("Creating DNS A record...");
    await dots.domain.createDomainRecord({
      domain_name: DOMAIN,
      type: "A",
      name: "svelte",
      data: ip,
      ttl: 300,
    });
  }

  console.log(`DNS A record set: ${DOMAIN} → ${ip}`);
};

const setGithubVariable = async (name: string, value: string) => {
  // Check if variable exists first
  const checkRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/variables/${name}`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  const method = checkRes.ok ? "PATCH" : "POST";
  const url = checkRes.ok
    ? `https://api.github.com/repos/${GITHUB_REPO}/actions/variables/${name}`
    : `https://api.github.com/repos/${GITHUB_REPO}/actions/variables`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ name, value }),
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to set GitHub variable ${name}: ${res.status}`);
  }

  console.log(`GitHub variable ${name} set to ${value}`);
};

const updateEnv = (updates: Record<string, string>) => {
  const existing = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  const envVars = Object.fromEntries(
    existing
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1)];
      }),
  );
  Object.assign(envVars, updates);
  writeFileSync(
    ".env",
    Object.entries(envVars)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n"),
  );
  console.log(".env updated");
};

const getSpacesClient = () => {
  const accessKey = process.env.SPACES_ACCESS_KEY;
  const secretKey = process.env.SPACES_SECRET_KEY;
  if (!accessKey || !secretKey)
    throw new Error("SPACES_ACCESS_KEY or SPACES_SECRET_KEY is not set");

  return new S3Client({
    endpoint: SPACES_ENDPOINT,
    region: "us-east-1", // required by S3 client, ignored by Spaces
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
};

const bucketExists = async (client: S3Client): Promise<boolean> => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    return true;
  } catch {
    return false;
  }
};

const setupSpaces = async () => {
  const client = getSpacesClient();

  if (await bucketExists(client)) {
    console.log(`Bucket ${BUCKET_NAME} already exists`);
    return;
  }

  console.log(`Creating bucket ${BUCKET_NAME}...`);
  await client.send(
    new CreateBucketCommand({
      Bucket: BUCKET_NAME,
    }),
  );

  // Make bucket public
  await client.send(
    new PutBucketAclCommand({
      Bucket: BUCKET_NAME,
      ACL: "public-read",
    }),
  );

  // Set CORS so the browser can load media directly from Spaces
  await client.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [`https://svelte.mattdehaas.dev`],
            AllowedMethods: ["GET"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );

  console.log(`Bucket ${BUCKET_NAME} created and configured`);
};

const getVolume = async () => {
  const {
    data: { volumes },
  } = await dots.volume.listVolumes({});
  return volumes?.find((v) => v.name === VOLUME_NAME) ?? null;
};

const createVolume = async () => {
  console.log(`Creating volume ${VOLUME_NAME}...`);
  const {
    data: { volume },
  } = await dots.volume.createVolume({
    name: VOLUME_NAME,
    region: REGION,
    size_gigabytes: VOLUME_SIZE_GB,
    description: "Postgres data for personal site",
    filesystem_type: "ext4",
  });
  console.log(`Volume created: ${volume!.id}`);
  return volume!;
};

const attachVolume = async (volumeId: string, dropletId: number) => {
  console.log(`Attaching volume ${volumeId} to droplet ${dropletId}...`);
  await dots.volume.attachVolumeToDroplet({
    volume_id: volumeId,
    droplet_id: dropletId,
    region: REGION,
    type: "attach",
  });
  console.log("Volume attached");
};

const setupEnv = async (
  ip: string,
  deployKeyPath: string,
  postgresPassword: string,
  appPassword: string,
) => {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: ip,
    username: "root",
    privateKeyPath: deployKeyPath,
  });

  const envContent = [
    `DATABASE_URL=postgres://app_user:${appPassword}@db:5432/personal-site`,
    `POSTGRES_DB=personal-site`,
    `POSTGRES_USER=postgres`,
    `POSTGRES_PASSWORD=${postgresPassword}`,
    `OBJECT_STORAGE_URL=https://${BUCKET_NAME}.${REGION}.digitaloceanspaces.com`,
  ].join("\n");

  // We wrap the content in a heredoc to prevent shell expansion of passwords
  console.log("Writing .env file...");
  const result = await ssh.execCommand(
    `cat << 'EOF' > /app/.env\n${envContent}\nEOF`,
  );

  if (result.stderr) {
    console.error("Error writing .env:", result.stderr);
    throw new Error("Failed to write .env file");
  }

  console.log("/app/.env written to droplet");
  await ssh.dispose();
};

const setupDatabase = async (
  ip: string,
  deployKeyPath: string,
  appPassword: string,
) => {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: ip,
    username: "root",
    privateKeyPath: deployKeyPath,
  });

  console.log("Starting db container...");
  await ssh.execCommand(
    "cd /app && docker compose -f docker-compose.prod.yaml up -d db",
  );

  await new Promise((r) => setTimeout(r, 5000));

  console.log("Waiting for Postgres to be ready...");
  // Loop without the unused 'ready' variable to satisfy the linter
  for (let i = 0; i < 30; i++) {
    const result = await ssh.execCommand(
      `docker exec app-db-1 pg_isready -U postgres`,
    );
    if (result.stdout.includes("accepting connections")) {
      await new Promise((r) => setTimeout(r, 2000));
      break;
    }
    if (i === 29) throw new Error("Postgres did not become ready in time");
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log("Setting up app_user...");
  const sqlCommands = [
    // Removed unnecessary escapes: ESLint is happy with $$ in template literals
    // as long as they aren't followed by {
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='app_user') THEN CREATE ROLE app_user LOGIN PASSWORD '${appPassword}'; END IF; END $$;`,
    `GRANT ALL PRIVILEGES ON DATABASE "personal-site" TO app_user;`,
    `GRANT ALL PRIVILEGES ON SCHEMA public TO app_user;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;`,
  ];

  for (const cmd of sqlCommands) {
    // We use single quotes for the shell command to prevent the remote shell
    // from interpreting the $$ itself.
    const shellEscapedCmd = cmd.replace(/'/g, "'\\''");
    const res = await ssh.execCommand(
      `docker exec app-db-1 psql -U postgres -d postgres -c '${shellEscapedCmd}'`,
    );
    if (res.stderr && !res.stderr.includes("already exists"))
      console.error(res.stderr);
    if (res.stdout) console.log(res.stdout);
  }

  console.log("Database setup complete");
  await ssh.dispose();
};

const main = async () => {
  await setupSpaces();

  // Ensure volume exists
  let volume = await getVolume();
  if (volume) {
    console.log(`Volume ${VOLUME_NAME} already exists (${volume.id})`);
  } else {
    volume = await createVolume();
  }

  const deployKeyPath = `${process.env.HOME}/.ssh/personal_site_deploy`;
  let droplet = await getDroplet();

  if (droplet) {
    console.log(`Droplet ${DROPLET_NAME} already exists (${droplet.id})`);
  } else {
    const myKey = await getSshKey("Matthew");
    const deployKey = await getOrCreateDeployKey(deployKeyPath);
    await createDroplet(
      [myKey.fingerprint!, deployKey.fingerprint!],
      volume.id!,
    );
    droplet = await waitForActive();
  }

  // Attach volume if not already attached
  const volumeAttached = droplet.volume_ids?.includes(volume.id!);
  if (volumeAttached) {
    console.log("Volume already attached");
  } else {
    await attachVolume(volume.id!, droplet.id!);
  }

  const ip = droplet?.networks?.v4?.find(
    (n) => n.type === "public",
  )?.ip_address;
  if (!ip) throw new Error("Could not determine droplet IP");

  await setupDroplet(ip, deployKeyPath);
  await setupEnv(ip, deployKeyPath, POSTGRES_PASSWORD, APP_DB_PASSWORD);

  await setupDatabase(ip, deployKeyPath, APP_DB_PASSWORD);

  await setupDns(ip);
  await setGithubVariable("DROPLET_IP", ip);

  updateEnv({
    DROPLET_IP: ip,
    DROPLET_ID: String(droplet.id!),
    VOLUME_ID: String(volume.id!),
    OBJECT_STORAGE_URL: `https://${BUCKET_NAME}.${REGION}.digitaloceanspaces.com`,
  });

  console.log("\nProvisioning complete:");
  console.log(`  Droplet: ${DROPLET_NAME} (${droplet.id})`);
  console.log(`  IP:      ${ip}`);
  console.log(`  Domain:  ${DOMAIN}`);
};

main().catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});
