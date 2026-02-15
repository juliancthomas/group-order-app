import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "./lib/**/*.{ts,tsx,mdx}",
    "./server/**/*.{ts,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "brand-primary": "rgb(var(--brand-primary) / <alpha-value>)",
        "brand-accent": "rgb(var(--brand-accent) / <alpha-value>)",
        "brand-dark": "rgb(var(--brand-dark) / <alpha-value>)"
      }
    }
  }
};

export default config;
