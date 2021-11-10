import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { existsSync } from 'fs';
import { IpcChannelType } from './IpcChannelType';
import { PythonShell } from 'python-shell';
import { ChildProcess, spawn } from 'child_process';
import { Transform, TransformCallback } from 'stream';
import { EOL } from 'os';

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const childProcesses: ChildProcess[] = [];
let monitoringPID: number | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const getResourceDirectory = () => {
  return process.env.NODE_ENV === 'development'
    ? path.join(process.cwd(), 'dist')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'dist');
};

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 830,
    width: 720,
    minWidth: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('ready-to-show', () => {
    mainWindow.webContents.send(IpcChannelType.TO_RENDERER, 'M: ping');
    ipcMain.removeHandler(IpcChannelType.TO_MAIN);
    ipcMain.handle(IpcChannelType.TO_MAIN, (event, message) => {
      console.log('M: IpcChannelType.TO_MAIN ', message);

      message.message === 'SIGINT'
        ? killChildProcesses('SIGINT', monitoringPID)
        : execPython(mainWindow, message);

      return 'M: pong';
    });
  });
};

app.on('quit', () => {
  killChildProcesses();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const PY_DIST = 'dist';
const PY_DIR = 'scripts';
const PY_MODULE = 'main';

const guessPackaged = () => {
  const fullPath = path.join(__dirname, PY_DIST);
  return existsSync(fullPath);
};

const getScriptPath = () => {
  if (!guessPackaged()) {
    return path.join(__dirname, PY_DIR, PY_MODULE + '.py');
  }
  if (process.platform === 'win32') {
    return path.join(__dirname, PY_DIST, PY_MODULE + '.exe');
  }
  return path.join(__dirname, PY_DIST, PY_MODULE);
};

const killChildProcesses = (signal?: string, excludePID?: number | null) => {
  childProcesses.forEach((cprocess, index) => {
    if (excludePID && cprocess.pid === excludePID) return;
    console.log(`kill ${cprocess.pid}(${cprocess.exitCode})`);
    try {
      signal ? process.kill(-cprocess.pid, signal) : process.kill(-cprocess.pid);
    } catch (e) {
      // nice catch
    }
    cprocess.exitCode != null && childProcesses.splice(index, 1);
  });
};

const execPython = (window: BrowserWindow, message: any): void => {
  const args = message.message.split(' ');
  const scriptPath = getScriptPath();

  const stdoutSplitter = new NewlineTransformer();
  const stderrSplitter = new NewlineTransformer();
  stdoutSplitter.setEncoding('utf8');
  stderrSplitter.setEncoding('utf8');

  if (guessPackaged()) {
    const pyps: ChildProcess = spawn(scriptPath, args, { detached: true });
    childProcesses.push(pyps);

    if (args.includes('--monitor')) monitoringPID = pyps.pid;

    pyps.stdout.pipe(stdoutSplitter).on('data', (data: string) => {
      const stdout = data.toString();
      window.webContents.send(IpcChannelType.TO_RENDERER, stdout);
    });

    pyps.stderr.pipe(stderrSplitter).on('data', (data: string) => {
      const stderr = data.toString();
      window.webContents.send(IpcChannelType.TO_RENDERER_STDERR, stderr);
    });

    pyps.on('close', (code: number, signal: string) => {
      console.log('The exit code was: ' + code);
      console.log('The exit signal was: ' + signal);
      console.log('finished');

      childProcesses.forEach((cprocess, index) => {
        cprocess.pid === pyps.pid && childProcesses.splice(index, 1);
      });
    });

    pyps.on('error', (err: Error) => {
      throw err;
    });
  } else {
    const options = {
      args: args,
      // pythonPath: '/home/fairy26/Documents/venv39/bin/python',
      pythonPath: '/home/fairy26/ドキュメント/venv39/bin/python',
      detached: true,
    };

    const pyshell = new PythonShell(scriptPath, options);
    childProcesses.push(pyshell.childProcess);

    if (args.includes('--monitor')) monitoringPID = pyshell.childProcess.pid;

    pyshell
      .on('message', (stdout: string) => {
        window.webContents.send(IpcChannelType.TO_RENDERER, stdout);
      })
      .on('stderr', (stderr: string) => {
        console.log(stderr);
        window.webContents.send(IpcChannelType.TO_RENDERER_STDERR, stderr);
      })
      .end((err, code, signal) => {
        if (err) throw err;

        console.log('The exit code was: ' + code);
        console.log('The exit signal was: ' + signal);
        console.log('finished');

        childProcesses.forEach((cprocess, index) => {
          cprocess.pid === pyshell.childProcess.pid && childProcesses.splice(index, 1);
        });
      });
  }
};

export class NewlineTransformer extends Transform {
  // NewlineTransformer: Megatron's little known once-removed cousin
  private _lastLineData: string;
  _transform(chunk: any, encoding: string, callback: TransformCallback) {
    let data: string = chunk.toString();
    if (this._lastLineData) data = this._lastLineData + data;
    const lines = data.split(EOL);
    this._lastLineData = lines.pop();
    //@ts-ignore this works, node ignores the encoding if it's a number
    lines.forEach(this.push.bind(this));
    callback();
  }
  _flush(done: TransformCallback) {
    if (this._lastLineData) this.push(this._lastLineData);
    this._lastLineData = null;
    done();
  }
}
