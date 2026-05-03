import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1a73e8",
          ink: "#202124",
          muted: "#5f6368",
          line: "#e8eaed",
          paper: "#f8f9fa",
        },
      },
      boxShadow: {
        card: "0 16px 48px rgba(32, 33, 36, 0.08)",
        search: "0 12px 40px rgba(32, 33, 36, 0.12)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top left, rgba(26, 115, 232, 0.14), transparent 30%), radial-gradient(circle at top right, rgba(52, 168, 83, 0.12), transparent 28%), linear-gradient(180deg, rgba(248, 249, 250, 0.95) 0%, rgba(255,255,255,1) 65%)",
      },
    },
  },
  plugins: [],
};

export default config;
