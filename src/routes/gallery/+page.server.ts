export interface Album {
  slug: string;
  title: string;
  description: string;
  cover: string;
  year: string;
  count: number;
}

const albums: Album[] = [
  {
    slug: "pacific-spirit",
    title: "Pacific Spirit",
    description: "Trail running through the old growth.",
    cover: "/images/placeholder.jpg",
    year: "2025",
    count: 12,
  },
  {
    slug: "vancouver",
    title: "Vancouver",
    description: "The city across seasons.",
    cover: "/images/placeholder.jpg",
    year: "2024",
    count: 8,
  },
  {
    slug: "miscellaneous",
    title: "Miscellaneous",
    description: "Everything else.",
    cover: "/images/placeholder.jpg",
    year: "2024",
    count: 24,
  },
];

export const load = () => ({ albums });
