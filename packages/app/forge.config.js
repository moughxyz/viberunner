require("dotenv").config()

const { FusesPlugin } = require("@electron-forge/plugin-fuses")
const { FuseV1Options, FuseVersion } = require("@electron/fuses")

module.exports = {
  packagerConfig: {
    name: "Viberunner",
    // Platform-specific executable naming to fix two issues:
    // 1. macOS: capitalized name gives "Viberunner.app" instead of "viberunner.app" in DMG
    // 2. Linux: lowercase name matches the "bin" config in deb/rpm makers to prevent build errors
    executableName: process.platform === "darwin" ? "Viberunner" : "viberunner",
    appBundleId: "me.viberunner.mac",
    appCategoryType: "public.app-category.productivity",
    icon: "./assets/icon", // Electron-forge will auto-select .ico/.icns/.png based on platform
    asar: {
      // Configure asar to handle native modules properly
      unpack: "*.{node,dll,dylib,so}",
    },
    // Generic solution: follow symlinks during packaging
    // This resolves workspace symlinks by copying their contents
    derefSymlinks: true,
    // Point to the main entry in dist-electron (built by vite-plugin-electron)
    out: "out",
    ignore: [
      /^\/src\//,
      /^\/\.vscode\//,
      /^\/\.git\//,
      /^\/\.gitignore$/,
      /^\/README\.md$/,
      /^\/vite\.config\.ts$/,
      /^\/tsconfig.*\.json$/,
      /^\/forge\.config\.js$/,
    ],
    extraResource: ["./assets"],
    // Use specific architecture or default to current
    arch: process.env.TARGET_ARCH || process.arch,
    // Configuration for universal builds
    osxUniversal: {
      mergeASARs: true,
      // Handle native modules that are architecture-specific
      singleArchFiles: "**/node_modules/**/*{arm64,x64,darwin-arm64,darwin-x64}*/**",
      // Files that should be taken from x64 build when they're identical
      x64ArchFiles: "**/node_modules/**/*{arm64,x64,darwin-arm64,darwin-x64}*/**",
    },
    osxSign:
      process.env.SKIP_OSX_SIGNING === "true"
        ? false
        : {
            // Add your Apple Developer info when ready for distribution
            identity: process.env.OSX_SIGN_IDENTITY,
            keychain: process.env.CI ? "build.keychain" : undefined, // Use temp keychain in CI
            type: "distribution",
          },
    osxNotarize:
      process.env.SKIP_OSX_SIGNING === "true"
        ? false
        : {
            // Add your Apple ID info when ready for distribution
            tool: "notarytool",
            appleId: process.env.VR_APPLE_ID,
            appleIdPassword: process.env.VR_APPLE_PASSWORD,
            teamId: process.env.VR_APPLE_TEAM_ID,
          },
  },
  rebuildConfig: {
    // Force rebuild native modules
    force: true,
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "Viberunner",
        authors: "Viberunner Team",
        description: "Modern file visualization platform and app runner",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          maintainer: "Viberunner Team",
          homepage: "https://github.com/moughxyz/viberunner-releases",
          name: "viberunner",
          bin: "viberunner",
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        options: {
          maintainer: "Viberunner Team",
          homepage: "https://github.com/moughxyz/viberunner-releases",
          name: "viberunner",
          bin: "viberunner",
        },
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {
        name: "Viberunner",
        title: "Viberunner ${version}",
        overwrite: true,
        // Remove problematic DMG customizations that might be causing path issues
        // background: './assets/dmg-background.png', // Optional: add if you have one
        // icon: './assets/icon.icns', // Ensure proper icon
        // iconSize: 128,
        // contents: [
        //   { x: 448, y: 344, type: 'link', path: '/Applications' },
        //   { x: 192, y: 344, type: 'file', path: 'Viberunner.app' }
        // ],
        // additionalDMGOptions: {
        //   window: {
        //     size: {
        //       width: 640,
        //       height: 500
        //     }
        //   }
        // }
      },
      platforms: ["darwin"],
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "moughxyz", // Replace with your actual GitHub username
          name: "viberunner-releases", // Replace with your actual repo name
        },
        prerelease: false,
        draft: false, // Set to false for autoupdate to work
        generateReleaseNotes: true, // Automatically generate release notes
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {
        // Ensure native modules are unpacked properly
        unpack: ["@electron/remote", "mime-types"],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    }),
  ],
  hooks: {
    generateAssets: async () => {
      // Build the app with Vite before any packaging starts
      const { execSync } = require("child_process")
      console.log("Building app with Vite...")
      execSync("npm run build", { stdio: "inherit", cwd: process.cwd() })
      console.log("Build completed, ready for packaging...")
    },
  },
}
