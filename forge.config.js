const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    name: 'Viberunner',
    executableName: 'viberunner',
    appBundleId: 'com.viberunner.app',
    appCategoryType: 'public.app-category.productivity',
    icon: './assets/icon', // Electron-forge will auto-select .ico/.icns/.png based on platform
    asar: {
      // Configure asar to handle native modules properly
      unpack: '*.{node,dll,dylib,so}',
    },
    // Point to the main entry in dist-electron (built by vite-plugin-electron)
    out: 'out',
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
    extraResource: [
      './assets'
    ],
    // Ensure proper architecture handling
    arch: process.env.TARGET_ARCH || process.arch,
    // osxSign: {
    //   // Add your Apple Developer info when ready for distribution
    //   // identity: 'Developer ID Application: Your Name (XXXXXXXXXX)',
    // },
    // osxNotarize: {
    //   // Add your Apple ID info when ready for distribution
    //   // tool: 'notarytool',
    //   // appleId: process.env.APPLE_ID,
    //   // appleIdPassword: process.env.APPLE_PASSWORD,
    //   // teamId: process.env.APPLE_TEAM_ID,
    // }
  },
  rebuildConfig: {
    // Force rebuild native modules
    force: true,
  },
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
          homepage: 'https://github.com/yourusername/viberunner',
          name: 'viberunner',
          bin: 'viberunner'
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Viberunner Team',
          homepage: 'https://github.com/yourusername/viberunner',
          name: 'viberunner',
          bin: 'viberunner'
        }
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Viberunner',
        title: 'Viberunner ${version}',
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
      platforms: ['darwin']
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'yourusername', // Replace with your actual GitHub username
          name: 'viberunner'      // Replace with your actual repo name
        },
        prerelease: false,
        draft: false, // Set to false for autoupdate to work
        generateReleaseNotes: true // Automatically generate release notes
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {
        // Ensure native modules are unpacked properly
        unpack: [
          '@electron/remote',
          'electron-updater',
          'mime-types'
        ]
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
    packageAfterCopy: async (config, buildPath) => {
      // Build the app with Vite before packaging
      const { execSync } = require('child_process');
      console.log('Building app with Vite...');
      execSync('npm run build', { stdio: 'inherit' });

      // Remove the problematic electron-rebuild step for now
      // The CI workflow handles this better
      console.log('Skipping electron-rebuild in hook (handled by CI)');
    }
  }
};