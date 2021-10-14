import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { IpcChannelType } from "./IpcChannelType";
import { PythonShell } from "python-shell";
import { ChildProcess } from "child_process";
// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const getResourceDirectory = () => {
  return process.env.NODE_ENV === "development"
    ? path.join(process.cwd(), "dist")
    : path.join(process.resourcesPath, "app.asar.unpacked", "dist");
};

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 830,
    width: 700,
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

  mainWindow.on("ready-to-show", () => {
    mainWindow.webContents.send(IpcChannelType.TO_RENDERER, "M: ping");
    ipcMain.removeHandler(IpcChannelType.TO_MAIN);
    let prevPyshell: ChildProcess | null = null;
    ipcMain.handle(IpcChannelType.TO_MAIN, (event, message) => {
      console.log("M: IpcChannelType.TO_MAIN ", message);

      const options = {
        pythonOptions: ["-u"],
        args: message.message.split(" "),
      };

      if (message.message === "SIGINT") {
        prevPyshell != null &&
          prevPyshell.exitCode == null &&
          prevPyshell.kill("SIGINT");
      } else {
        const pyshell = new PythonShell("src/scripts/main.py", options);
        prevPyshell = pyshell.childProcess;

        let output: string[] = [];

        pyshell
          .on("message", (message) => {
            output.push(message);
          })
          .on("stderr", (stderr) => {
            mainWindow.webContents.send(
              IpcChannelType.TO_RENDERER_IN_RT,
              stderr
            );
          })
          .end((err, code, signal) => {
            if (err) throw err;
            mainWindow.webContents.send(IpcChannelType.TO_RENDERER, output);
            mainWindow.webContents.send(
              IpcChannelType.TO_RENDERER_IN_RT,
              "finished"
            );

            console.log("The exit code was: " + code);
            console.log("The exit signal was: " + signal);
            console.log("finished");

            prevPyshell = null;
          });
      }

      return "M: pong";
    });
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
