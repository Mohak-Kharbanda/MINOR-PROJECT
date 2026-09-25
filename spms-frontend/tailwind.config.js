/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1E2761",
          dark: "#161B4D",
          light: "#354F9C",
        },
        ice: "#CADCFC",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "serif"],
      },
    },
  },
  plugins: [],
};
