/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        inksoft: "rgb(var(--c-inksoft) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        accentink: "rgb(var(--c-accentink) / <alpha-value>)",
        gold: "rgb(var(--c-gold) / <alpha-value>)",
        good: "rgb(var(--c-good) / <alpha-value>)",
        goodbg: "rgb(var(--c-goodbg) / <alpha-value>)",
        warn: "rgb(var(--c-warn) / <alpha-value>)",
        warnbg: "rgb(var(--c-warnbg) / <alpha-value>)",
        bad: "rgb(var(--c-bad) / <alpha-value>)",
        badbg: "rgb(var(--c-badbg) / <alpha-value>)",
      },
    },
  },
  plugins: [],
}