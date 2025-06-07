import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { RunnerConfig } from "../renderer/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getSupportedFormats = (runner: RunnerConfig): string => {
  if (runner.standalone) {
    return "Standalone utility"
  }

  if (runner.mimetypes && runner.mimetypes.length > 0) {
    return runner.mimetypes.join(", ")
  }

  if (runner.matchers && runner.matchers.length > 0) {
    const formats = new Set<string>()

    runner.matchers.forEach((matcher: any) => {
      if (matcher.type === "mimetype" && matcher.mimetype) {
        formats.add(matcher.mimetype)
      } else if (matcher.type === "filename" && matcher.pattern) {
        formats.add(`*.${matcher.pattern.split(".").pop() || "file"}`)
      } else if (matcher.type === "filename-contains" && matcher.substring) {
        const ext = matcher.extension ? `.${matcher.extension}` : ""
        formats.add(`*${matcher.substring}*${ext}`)
      } else if (matcher.type === "content-json") {
        formats.add("JSON")
      } else if (matcher.type === "file-size") {
        formats.add("Size-based")
      } else {
        formats.add(matcher.type)
      }
    })

    return Array.from(formats).join(", ") || "Enhanced matching"
  }

  return "All files"
}
