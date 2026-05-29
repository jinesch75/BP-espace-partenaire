import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Biergerpakt coral accent
        brand: {
          DEFAULT: "#e45c41",
          dark: "#c94a30",
          light: "#fdeae4",
        },
        surface: "#faf9f9",
        ink: "#1a1a1a",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "ui-sans-serif", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 5px 15px rgba(0,0,0,0.07)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
