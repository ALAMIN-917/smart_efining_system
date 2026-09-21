/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b0d10",
        panel: "#14171c",
        accent: "#ef4444",
        accent2: "#f97316",
        ok: "#22c55e",
        info: "#38bdf8",
      },
    },
  },
  plugins: [],
};
