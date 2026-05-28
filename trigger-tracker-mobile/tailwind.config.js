/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./navigation/**/*.{js,jsx,ts,tsx}",
    "./utils/**/*.{js,jsx,ts,tsx}",
    "./services/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#fcf9f8",
        foreground: "#1b1c1c",
        card: "#ffffff",
        border: "#e5e2d9",
        primary: "#154212",
        "primary-foreground": "#ffffff",
        "primary-light": "#ecf5e9",
        accent: "#9e4132",
        "accent-foreground": "#ffffff",
        "accent-light": "#ffdad4",
        muted: "#f0eded",
        "muted-foreground": "#72796e",
        success: "#2d5a27",
        "success-light": "#eef6eb",
        warning: "#b87518",
        "warning-light": "#fff1dc",
        destructive: "#e5484d",
        "destructive-foreground": "#ffffff",
      },
      fontFamily: {
        display: ["PlusJakartaSans", "System"],
        body: ["DMSans", "System"],
      },
      borderRadius: {
        xl: 12,
        "2xl": 16,
      },
    },
  },
  plugins: [],
};
