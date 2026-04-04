import { error } from "@sveltejs/kit";

export type MediaType = "photo" | "video";

export interface Asset {
  id: string;
  type: MediaType;
  url: string;
  caption?: string;
}

export interface AlbumDetail {
  slug: string;
  title: string;
  description: string;
  year: string;
  assets: Asset[];
}

const albums: Record<string, AlbumDetail> = {
  "pacific-spirit": {
    slug: "pacific-spirit",
    title: "Pacific Spirit",
    description: "Trail running through the old growth.",
    year: "2025",
    assets: [
      {
        id: "1",
        type: "photo",
        url: "/images/placeholder.jpg",
        caption: "Morning light on the trail",
      },
      {
        id: "2",
        type: "photo",
        url: "/images/placeholder.jpg",
        caption: "Ferns after rain",
      },
      {
        id: "3",
        type: "video",
        url: "/videos/placeholder.mp4",
        caption: "Descent into the ravine",
      },
      { id: "4", type: "photo", url: "/images/placeholder.jpg" },
      {
        id: "5",
        type: "photo",
        url: "/images/placeholder.jpg",
        caption: "The canopy in November",
      },
      { id: "6", type: "video", url: "/videos/placeholder.mp4" },
    ],
  },
  vancouver: {
    slug: "vancouver",
    title: "Vancouver",
    description: "The city across seasons.",
    year: "2024",
    assets: [
      {
        id: "1",
        type: "photo",
        url: "/images/placeholder.jpg",
        caption: "False Creek at dusk",
      },
      { id: "2", type: "photo", url: "/images/placeholder.jpg" },
      {
        id: "3",
        type: "photo",
        url: "/images/placeholder.jpg",
        caption: "Granville Bridge",
      },
    ],
  },
  miscellaneous: {
    slug: "miscellaneous",
    title: "Miscellaneous",
    description: "Everything else.",
    year: "2024",
    assets: [
      { id: "1", type: "photo", url: "/images/placeholder.jpg" },
      { id: "2", type: "photo", url: "/images/placeholder.jpg" },
    ],
  },
};

export const load = ({ params }) => {
  const album = albums[params.album];
  if (!album) error(404, "Album not found");
  return { album };
};
