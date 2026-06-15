import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#00A878",
          teal: "#00B894",
          navy: "#0B1F49",
          mint: "#EEFDF8",
          soft: "#F7FBFA",
        },
        surface: {
          card: "#FFFFFF",
          page: "#F7FBFA",
          mint: "#EEFDF8",
        },
        border: {
          soft: "#E6EEF2",
        },
        text: {
          primary: "#0B1F49",
          secondary: "#667085",
        },
        danger: "#FF6B6B",
        warning: "#F6B44B",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11, 31, 73, 0.04), 0 8px 24px rgba(11, 31, 73, 0.06)",
        card: "0 1px 3px rgba(11, 31, 73, 0.05), 0 12px 32px rgba(11, 31, 73, 0.07)",
        focus: "0 0 0 4px rgba(0, 184, 148, 0.18)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #00B894 0%, #00A878 100%)",
        "mint-fade": "linear-gradient(180deg, #EEFDF8 0%, #FFFFFF 100%)",
      },
      maxWidth: {
        content: "1240px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
