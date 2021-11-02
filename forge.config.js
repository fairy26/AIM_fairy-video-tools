// const fs = require('fs');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  packagerConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'fairy-video-tools',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    [
      '@electron-forge/plugin-webpack',
      {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.ts',
              name: 'main_window',
              preload: {
                js: './src/preload.ts',
              },
            },
          ],
        },
      },
    ],
  ],
  hooks: {
    postPackage: async (forgeConfig, { outputPaths }) => {
      const pyDataSrcPath = path.resolve(__dirname, 'src', 'scripts', 'data');
      const distPath = path.resolve(__dirname, 'dist');
      const pyScriptName = 'main';
      const pyExeSrcPath = path.resolve(distPath, pyScriptName);

      try {
        // fs.existsSync(distPath) && fs.rmdirSync(distPath, { recursive: true });
        const cmd = [
          'pyinstaller',
          '--onefile',
          '--add-data',
          path.resolve(__dirname, 'src', 'scripts', 'data', 'log_config.json') + ':data',
          '--add-data',
          path.resolve(__dirname, 'src', 'scripts', 'data', '__init__.py') + ':data',
          path.resolve(__dirname, 'src', 'scripts', `${pyScriptName}.py`),
        ];
        execSync(cmd.join(' '), { stdio: ['ignore'] });
      } catch (err) {
        if (!fs.existsSync(distPath)) throw err;
      }

      const pyDestDir = path.resolve(
        outputPaths[0],
        'resources',
        'app',
        '.webpack',
        'main',
        'dist'
      );

      const pyExeDestPath = path.resolve(pyDestDir, pyScriptName);
      const pyDataDestPath = path.resolve(pyDestDir, 'data');

      fs.mkdirSync(pyDestDir);

      // (node version >= v16.7.0)      import fs from 'fs'; fs.cpSync(src, dest, {recursive: true}); is avail
      // https://nodejs.org/api/fs.html#fscpsyncsrc-dest-options
      // now:(node version = v14.17.6)  import fs from 'fs-extra'; fs.copySync(src, dest);            is used
      // https://www.npmjs.com/package/fs-extra
      fs.copySync(pyDataSrcPath, pyDataDestPath);
      fs.copyFileSync(pyExeSrcPath, pyExeDestPath);

      fs.access(pyExeDestPath, fs.constants.X_OK, (err) => {
        if (err)
          fs.chmod(pyExeDestPath, 0o775, (err) => {
            if (err) throw err;
          });
      });

      checkAccess(pyExeDestPath);
    },
  },
};

const checkAccess = (targetPath) => {
  const flags = [fs.constants.F_OK, fs.constants.R_OK, fs.constants.W_OK, fs.constants.X_OK];
  const permissions = ['exists', 'readable', 'writable', 'executable'];
  flags.forEach((flag, index) => {
    !index && console.log(`\n${path.basename(targetPath)}`);
    try {
      fs.accessSync(targetPath, flag);
      console.log(`\t${permissions[index]}: true`);
    } catch (err) {
      console.log(`\t${permissions[index]}: false`);
    }
  });
};
