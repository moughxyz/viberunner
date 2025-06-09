import { nativeImage } from "electron"
import * as fs from "fs"

/**
 * Utility function to load an icon as a nativeImage, with SVG support via Sharp
 * Handles SVG files by converting them to PNG using Sharp for better compatibility
 *
 * @param iconPath - Absolute path to the icon file
 * @param usage - The intended usage of the icon ("dock" | "menubar"), affects size
 * @returns Promise<Electron.NativeImage> - The loaded native image
 * @throws Error if the icon cannot be loaded
 */
export const loadIconAsNativeImage = async (
  iconPath: string,
  usage: "dock" | "menubar" = "menubar"
): Promise<Electron.NativeImage> => {
  try {
    console.log(`Attempting to load icon from: ${iconPath}`)

    // Check if file exists and is readable
    if (!fs.existsSync(iconPath)) {
      throw new Error(`File does not exist: ${iconPath}`)
    }

    const stats = fs.statSync(iconPath)
    console.log(`Icon file size: ${stats.size} bytes`)

    // Read the file to check if it's accessible
    const fileContent = fs.readFileSync(iconPath)
    console.log(`Successfully read ${fileContent.length} bytes from icon file`)

        // For SVG files, validate content and handle differently for menu bar vs dock
    if (iconPath.toLowerCase().endsWith(".svg")) {
      const svgContent = fileContent.toString("utf8")
      console.log(`Loading SVG for ${usage} usage`)
      console.log(`SVG content preview: ${svgContent.substring(0, 200)}...`)

      // Basic SVG validation
      if (!svgContent.includes("<svg") || !svgContent.includes("</svg>")) {
        throw new Error("SVG file appears to be malformed (missing svg tags)")
      }

      // For menu bar icons, prioritize vector rendering - skip PNG conversion entirely
      if (usage === "menubar") {
        console.log("Menu bar usage detected - trying SVG buffer methods first to avoid PNG conversion")

        // Try SVG buffer first for better vector quality
        try {
          const trayIcon = nativeImage.createFromBuffer(fileContent)
          if (!trayIcon.isEmpty()) {
            console.log("Successfully created crisp menu bar icon from SVG buffer (no PNG conversion)")
            return trayIcon
          }
        } catch (bufferError) {
          console.warn("SVG buffer method failed:", bufferError)
        }

        // Try direct path loading as backup
        try {
          const trayIcon = nativeImage.createFromPath(iconPath)
          if (!trayIcon.isEmpty()) {
            console.log("Successfully loaded menu bar icon from SVG path (no PNG conversion)")
            return trayIcon
          }
        } catch (pathError) {
          console.warn("SVG path method failed:", pathError)
        }

        console.log("All vector SVG methods failed for menu bar, will skip PNG conversion and throw error")
        throw new Error("Could not load SVG as vector for menu bar - refusing PNG conversion to maintain quality")
      }

      // For dock icons, try direct loading first
      let trayIcon = nativeImage.createFromPath(iconPath)

      if (trayIcon.isEmpty()) {

        // Use Sharp to convert SVG to PNG (mainly for dock icons or fallback)
        console.log(
          `SVG file returned empty image, using Sharp to convert to PNG for ${usage}...`
        )
        try {
          const sharp = require("sharp")
          const svgBuffer = fs.readFileSync(iconPath)

          // Determine appropriate size based on usage and platform
          const getIconSize = (usage: "dock" | "menubar", platform: string): number => {
            if (usage === "dock") {
              // Dock icons should be larger for better quality
              return platform === "darwin" ? 128 : 64
            } else {
              // Menu bar icons - use higher resolution for Sharp conversion if needed
              return platform === "darwin" ? 32 : 28
            }
          }

          const iconSize = getIconSize(usage, process.platform)

          console.log(
            `Converting SVG to PNG at ${iconSize}x${iconSize} for ${usage} using Sharp...`
          )

          // Convert SVG to PNG using Sharp
          const pngBuffer = await sharp(svgBuffer)
            .png()
            .resize(iconSize, iconSize)
            .toBuffer()

          // Create nativeImage from the PNG buffer
          trayIcon = nativeImage.createFromBuffer(pngBuffer)

          if (!trayIcon.isEmpty()) {
            console.log("Successfully converted SVG to PNG using Sharp")
            return trayIcon
          } else {
            throw new Error("Sharp conversion resulted in empty image")
          }
        } catch (sharpError) {
          console.warn("Sharp conversion failed:", sharpError)
          throw new Error(
            `SVG file could not be converted with Sharp: ${
              sharpError instanceof Error ? sharpError.message : "Unknown error"
            }`
          )
        }
      } else {
        console.log(`Successfully loaded SVG icon directly: ${iconPath}`)
        return trayIcon
      }
    } else {
      // Non-SVG files: try direct loading
      const trayIcon = nativeImage.createFromPath(iconPath)

      if (trayIcon.isEmpty()) {
        throw new Error(
          "Icon is empty or invalid - nativeImage.createFromPath returned empty image"
        )
      }

      // Log icon properties for debugging
      const iconSize = trayIcon.getSize()
      console.log(
        `Successfully loaded icon: ${iconPath} (${iconSize.width}x${iconSize.height})`
      )
      return trayIcon
    }
  } catch (error) {
    console.warn(`Failed to load icon from "${iconPath}": ${error}`)
    throw error
  }
}
