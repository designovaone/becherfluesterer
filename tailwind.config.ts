import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Stammtisch / parchment palette
        parchment: {
          DEFAULT: "#F5EDE0",
          50: "#FBF7EE",
          100: "#F5EDE0",
          200: "#EDE0CB",
          300: "#E0CDAA",
        },
        forest: {
          DEFAULT: "#1A3A2F",
          800: "#1A3A2F",
          700: "#264E40",
          600: "#316552",
          500: "#3F8369",
        },
        amber_: {
          DEFAULT: "#B8862E",
          700: "#946720",
          500: "#B8862E",
          400: "#D29F3F",
        },
        wine: {
          DEFAULT: "#7A2A2A",
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: "0 1px 0 rgba(26,58,47,0.06), 0 8px 24px -12px rgba(26,58,47,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
