import { createApiClient } from 'dots-wrapper';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { NodeSSH } from 'node-ssh';
import { join } from 'path';
import 'dotenv/config';

const REGION = 'sfo3';
const DROPLET_NAME = 'personal-site';
const DROPLET_SIZE = 's-1vcpu-1gb';
const DROPLET_IMAGE = 'docker-20-04';
const DOMAIN = 'mattdehaas.dev';
const GITHUB_REPO = 'MatthewdeHaas/personal-website-svelte';

const token = process.env.DIGITALOCEAN_TOKEN;
if (!token) throw new Error('DIGITALOCEAN_TOKEN is not set');

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) throw new Error('GITHUB_TOKEN is not set');

const dots = createApiClient({ token });

const getDroplet = async () => {
  const { data: { droplets } } = await dots.droplet.listDroplets({});
  return droplets?.find((d) => d.name === DROPLET_NAME) ?? null;
};

const createDroplet = async (sshKeyFingerprints: string[]) => {
  console.log(`Creating droplet ${DROPLET_NAME}...`);
  const { data: { droplet } } = await dots.droplet.createDroplet({
    name: DROPLET_NAME,
    region: REGION,
    size: DROPLET_SIZE,
    image: DROPLET_IMAGE,
    ssh_keys: sshKeyFingerprints,
    tags: ['personal-site']
  });
  console.log(`Droplet created: ${droplet!.id}`);
  return droplet!;
};

const getSshKey = async (name: string) => {
  const { data: { ssh_keys } } = await dots.sshKey.listSshKeys({});
  const key = ssh_keys?.find((k) => k.name === name);
  if (!key) throw new Error(`SSH key '${name}' not found on DO account`);
  return key;
};

const getOrCreateDeployKey = async (keyPath: string) => {
  if (!existsSync(keyPath)) {
    console.log('Generating deploy key...');
    execSync(`ssh-keygen -t ed25519 -C "personal-site-deploy" -f ${keyPath} -N ""`);
    console.log('Deploy key generated');
  } else {
    console.log('Deploy key already exists locally');
  }

  const { data: { ssh_keys } } = await dots.sshKey.listSshKeys({});
  let deployKey = ssh_keys?.find((k) => k.name === 'personal-site-deploy');

  if (!deployKey) {
    const pubKey = readFileSync(`${keyPath}.pub`, 'utf8').trim();
    console.log('Adding deploy key to DO account...');
    const { data } = await dots.sshKey.createSshKey({
      name: 'personal-site-deploy',
      public_key: pubKey
    });
    deployKey = data.ssh_key;
    console.log('Deploy key added to DO account');
  } else {
    console.log('Deploy key already on DO account');
  }

  return deployKey!;
};

const waitForActive = async () => {
  console.log('Waiting for droplet to become active...');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const current = await getDroplet();
    if (current?.status === 'active') {
      console.log('Droplet is active');
      return current;
    }
  }
  throw new Error('Droplet did not become active in time');
};

const setupDroplet = async (ip: string, deployKeyPath: string) => {
  const ssh = new NodeSSH();

  console.log('Waiting for SSH to become available...');
  for (let i = 0; i < 20; i++) {
    try {
      await ssh.connect({ host: ip, username: 'root', privateKeyPath: deployKeyPath });
      console.log('SSH connection established');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  if (!ssh.isConnected()) throw new Error('SSH connection failed');

  const commands = [
    'ufw allow 80',
    'ufw allow 443',
    'mkdir -p /app'
  ];

  for (const cmd of commands) {
    console.log(`Running: ${cmd}`);
    const result = await ssh.execCommand(cmd);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }

  const repoRoot = join(process.cwd(), '..');
	await ssh.putFile(join(repoRoot, 'infra/docker-compose.prod.yaml'), '/app/docker-compose.prod.yaml');
  console.log('docker-compose.prod.yaml uploaded');

	await ssh.putFile(join(repoRoot, 'docker/Caddyfile'), '/app/Caddyfile');
  console.log('Caddyfile uploaded');

  await ssh.dispose();
  console.log('Droplet setup complete');
};

const setupDns = async (ip: string) => {
  const { data: { domain_records } } = await dots.domain.listDomainRecords({
    domain_name: DOMAIN
  });

  const existing = domain_records?.find((r) => r.type === 'A' && r.name === 'svelte');

  if (existing) {
    console.log('DNS A record exists, updating...');
    await dots.domain.updateDomainRecord({
      domain_name: DOMAIN,
      domain_record_id: existing.id!,
      type: 'A',
      name: '@',
      data: ip,
      ttl: 300
    });
  } else {
    console.log('Creating DNS A record...');
    await dots.domain.createDomainRecord({
      domain_name: DOMAIN,
      type: 'A',
      name: '@',
      data: ip,
      ttl: 300
    });
  }

  console.log(`DNS A record set: ${DOMAIN} → ${ip}`);
};

const setGithubVariable = async (name: string, value: string) => {
  // Check if variable exists first
  const checkRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/variables/${name}`,
    { headers: { Authorization: `Bearer ${githubToken}`, 'X-GitHub-Api-Version': '2022-11-28' } }
  );

  const method = checkRes.ok ? 'PATCH' : 'POST';
  const url = checkRes.ok
    ? `https://api.github.com/repos/${GITHUB_REPO}/actions/variables/${name}`
    : `https://api.github.com/repos/${GITHUB_REPO}/actions/variables`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ name, value })
  });

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to set GitHub variable ${name}: ${res.status}`);
  }

  console.log(`GitHub variable ${name} set to ${value}`);
};

const updateEnv = (updates: Record<string, string>) => {
  const existing = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
  const envVars = Object.fromEntries(
    existing
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      })
  );
  Object.assign(envVars, updates);
  writeFileSync('.env', Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join('\n'));
  console.log('.env updated');
};

const main = async () => {
  const deployKeyPath = `${process.env.HOME}/.ssh/personal_site_deploy`;

  let droplet = await getDroplet();

  if (droplet) {
    console.log(`Droplet ${DROPLET_NAME} already exists (${droplet.id})`);
  } else {
    const myKey = await getSshKey('Matthew');
    const deployKey = await getOrCreateDeployKey(deployKeyPath);

    droplet = await createDroplet([myKey.fingerprint!, deployKey.fingerprint!]);
    droplet = await waitForActive();
  }

  const ip = droplet.networks?.v4?.find((n) => n.type === 'public')?.ip_address;
  if (!ip) throw new Error('Could not determine droplet IP');

  await setupDroplet(ip, deployKeyPath);
  await setupDns(ip);
  await setGithubVariable('DROPLET_IP', ip);

  updateEnv({
    DROPLET_IP: ip,
    DROPLET_ID: String(droplet.id!)
  });

  console.log('\nProvisioning complete:');
  console.log(`  Droplet: ${DROPLET_NAME} (${droplet.id})`);
  console.log(`  IP:      ${ip}`);
  console.log(`  Domain:  ${DOMAIN}`);
};

main().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
