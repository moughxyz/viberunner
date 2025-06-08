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

    // For SVG files, validate content and use Sharp conversion
    if (iconPath.toLowerCase().endsWith(".svg")) {
      const svgContent = fileContent.toString("utf8")
      console.log(`Full SVG content:`)
      console.log(svgContent)

      // Basic SVG validation
      if (!svgContent.includes("<svg") || !svgContent.includes("</svg>")) {
        throw new Error("SVG file appears to be malformed (missing svg tags)")
      }

      // Try direct loading first
      let trayIcon = nativeImage.createFromPath(iconPath)

      if (trayIcon.isEmpty()) {
        // Use Sharp to convert SVG to PNG
        console.log(
          "SVG file returned empty image, using Sharp to convert to PNG..."
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
              // Menu bar icons should be small
              return platform === "darwin" ? 16 : 24
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
