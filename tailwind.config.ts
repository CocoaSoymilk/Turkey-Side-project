import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trust & Professional palette from design spec
        navy: {
          DEFAULT: "#1A2B4C",
          900: "#0F1B33",
          800: "#1A2B4C",
          700: "#243A66",
        },
        point: {
          blue: "#3B82F6",
        },
        accent: {
          gold: "#F59E0B",
          mint: "#79ECCE",
        },
        cool: {
          gray: "#F8FAFC",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
