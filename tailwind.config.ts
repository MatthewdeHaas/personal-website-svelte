import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,ts,svelte,svx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Playfair Display", "serif"],
        serif: ["Cormorant Garamond", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
