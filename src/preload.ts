
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { IpcChannelType } from "./IpcChannelType";


export class ContextBridgeApi {
  public static readonly API_KEY = "api";

  constructor() {}

  // <= window.api.sendToMainProcess(someMessage) でsomeMessageをMainプロセスに送信する
  public sendToMainProcess = (message: string) => {
    return ipcRenderer
      .invoke(IpcChannelType.TO_MAIN, {
        message: message,
      })
      .then((result: string) => result)
      .catch((e: Error) => console.log(e));
  };

  // <= window.api.onSendToRenderer(callback) でMainプロセスから受信する
  public onSendToRenderer = (
    rendererListener: (message: string[]) => void
  ) => {
    ipcRenderer.on(
      IpcChannelType.TO_RENDERER,
      (event: IpcRendererEvent, args: string[]) => {
        rendererListener(args);
      }
    );
  };
}


contextBridge.exposeInMainWorld(
  ContextBridgeApi.API_KEY, // <= window.apiで呼び出す
  new ContextBridgeApi()
);
