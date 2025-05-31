const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    name: 'Viberunner',
    executableName: 'Viberunner',
    appBundleId: 'com.viberunner.app',
    appCategoryType: 'public.app-category.productivity',
    icon: './assets/icon', // Add your icon files (without extension)
    asar: true, // Enable asar packaging for AutoUnpackNatives plugin
    extraResource: [
      './assets'
    ],
    osxSign: {
      // Add your Apple Developer info when ready for distribution
      // identity: 'Developer ID Application: Your Name (XXXXXXXXXX)',
    },
    osxNotarize: {
      // Add your Apple ID info when ready for distribution
      // tool: 'notarytool',
      // appleId: process.env.APPLE_ID,
      // appleIdPassword: process.env.APPLE_PASSWORD,
      // teamId: process.env.APPLE_TEAM_ID,
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Viberunner',
        authors: 'Viberunner Team',
        description: 'Modern file visualization platform and app runner'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Viberunner Team',
          homepage: 'https://github.com/yourusername/viberunner'
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Viberunner Team',
          homepage: 'https://github.com/yourusername/viberunner'
        }
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Viberunner',
        title: 'Viberunner ${version}',
        background: './assets/dmg-background.png', // Optional: create a custom DMG background
        icon: './assets/icon.icns',
        overwrite: true
      },
      platforms: ['darwin']
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'yourusername', // Replace with your GitHub username
          name: 'viberunner'      // Replace with your repo name
        },
        prerelease: false,
        draft: true
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // Vite config options
        build: [
          {
            entry: 'src/main/index.ts',
            config: 'vite.config.ts',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            entry: 'index.html',
          },
        ],
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
};