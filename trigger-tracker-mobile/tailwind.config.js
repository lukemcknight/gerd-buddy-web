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
        background: "#f6fbf8",
        foreground: "#1f2a30",
        card: "#ffffff",
        border: "#e1e8e3",
        primary: "#3aa27f",
        "primary-foreground": "#ffffff",
        "primary-light": "#e6f4ef",
        accent: "#f07c52",
        "accent-foreground": "#ffffff",
        "accent-light": "#ffe7dc",
        muted: "#edf2ee",
        "muted-foreground": "#5f6f74",
        success: "#2fa16d",
        "success-light": "#e8f5ee",
        warning: "#f2b440",
        "warning-light": "#fdf3d9",
        destructive: "#e5484d",
        "destructive-foreground": "#ffffff",
      },
      fontFamily: {
        display: ["PlusJakartaSans", "System"],
        body: ["DMSans", "System"],
      },
      borderRadius: {
        xl: 16,
        "2xl": 20,
      },
    },
  },
  plugins: [],
};
