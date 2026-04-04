export interface Project {
  title: string;
  description: string;
  tags: string[];
  year: string;
  image?: string;
  links?: { label: string; href: string }[];
}

const projects: Project[] = [
  {
    title: "Gambit",
    description:
      "A peer-to-peer prediction market platform built on Ethereum. Users create and settle binary outcome markets using SIWE authentication and on-chain settlement.",
    tags: ["SvelteKit", "Solidity", "Postgres", "Ethers.js"],
    year: "2025",
    links: [{ label: "GitHub", href: "https://github.com/yourname/gambit" }],
  },
  {
    title: "Personal Site",
    description:
      "This site. Built with SvelteKit and Node, containerized with Docker, deployed via GitHub Actions to a DigitalOcean droplet.",
    tags: ["SvelteKit", "Docker", "Caddy", "GitHub Actions"],
    year: "2026",
    links: [
      { label: "GitHub", href: "https://github.com/yourname/personal-site" },
    ],
  },
];

export const load = () => ({ projects });
