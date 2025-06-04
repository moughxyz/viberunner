export const templates = [
  {
    name: "Clipboard Manager",
    description: "a clipboard manager that shows recent history",
    prompt:
      "a clipboard manager that shows recent history. Use the Node API to access the clipboard history as the web API requires the document to be focused.",
  },
  {
    name: "Daily Notes",
    description: "a note for every day saved to a file",
    prompt: `
      create a new runner called Daily Notes:

      here's how it looks structurally

      [ [today] | [today - 1] | [today - 2] ... [today - n | infinite horizontal scroll] ] [Calendar Picker] [Settings]
      [
      textarea displaying the contents of the daily note
      ]

      - Each daily note is .txt file saved by default in the app's cwd in the "notes" folder (create it if it doesn't exit)
      - User can change this directory and the preference is saved via the parent app's (viberunner) prefs API
      - Changing the directroy does not transfer any of the existing txt files. user must be instructed to manually copy paste old files into new directory
      - User should be able to "Show notes directory" to reveal in finder
      - Date format should be localized in the format "May 12"
      `,
  },
  {
    name: "Network Speed Meter",
    description: "a network speed monitor with download and upload speed",
    prompt: `
      create a new runner called Network Speed Monitor:

      - Uses speedtest-net package to show realtime up/down ping.
      - Also logs IP address, latency, server used.
      `,
  },
]
