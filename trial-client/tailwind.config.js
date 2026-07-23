/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-alt": "var(--bg-alt)",
        surface: "var(--surface)",
        sunken: "var(--surface-sunken)",
        raised: "var(--surface-raised)",

        ink: "var(--text-primary)",
        "ink-2": "var(--text-secondary)",
        "ink-3": "var(--text-muted)",

        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-strong": "var(--accent-strong)",
        "accent-surface": "var(--accent-surface)",
        "accent-contrast": "var(--accent-contrast)",

        success: "var(--success)",
        "success-surface": "var(--success-surface)",
        warning: "var(--warning)",
        "warning-surface": "var(--warning-surface)",
        danger: "var(--danger)",
        "danger-surface": "var(--danger-surface)",
        info: "var(--info)",

        line: "var(--border)",
        "line-strong": "var(--border-strong)",
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', '"Be Vietnam Pro"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "var(--shadow-sm)",
        mid: "var(--shadow-md)",
        float: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      maxWidth: {
        prose: "68ch",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
