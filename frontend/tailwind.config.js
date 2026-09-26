/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zoom: {
          blue: "#0E71EB",
          "blue-hover": "#0B5ED7",
          dark: "#1A1E22",
          "dark-card": "#242A31",
          "dark-accent": "#2D343F",
          sidebar: "#1E242C",
          topbar: "#161B22",
          bg: "#0F1217",
          video: "#101216",
        }
      }
    },
  },
  plugins: [],
};
