/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/index.html", "./src/renderer/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gray: {
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
        blue: {
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      borderRadius: {
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
  safelist: [
    "bg-gray-800",
    "bg-gray-600",
    "bg-blue-600",
    "bg-blue-700",
    "text-gray-400",
    "text-gray-500",
    "border-gray-700",
    "text-4xl",
    "text-xl",
    "text-lg",
    "rounded-3xl",
    "hover:bg-blue-700",
    "hover:scale-105",
    "placeholder-gray-500",
    "focus:ring-blue-500",
  ],
}
