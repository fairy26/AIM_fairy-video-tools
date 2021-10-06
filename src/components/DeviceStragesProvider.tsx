import React, { createContext, useState, useContext, useCallback, useEffect, useMemo, useReducer } from "react";

import { ContextBridgeApi } from "../preload";

const DeviceStragesCtx = createContext(null);
export const useDeviceStragesFunctions = () => useContext(DeviceStragesCtx);

const strToArray = (str: string): string[] => str.slice(1, -1).split(', ');
const removeSingleQuote = (str: string): string => str.replace(/'/g, "");

let index: number = 0;

// @ts-ignore
const api: ContextBridgeApi = window.api;
const send = async (arg: string) => {
  const result: string | void = await api.sendToMainProcess(arg);
  console.log('R: sendToMainProcess ', result);
};

export const DeviceStragesProvider: React.FC<React.ReactNode>  = ({ children }: any) => {
  useEffect(() => {
    console.log('R: only one after initial render');

    api.onSendToRenderer(callback);

    send('--check');
  }, []);
  
  const [ message, setMessage ] = useState<string[]>([]);
  const [ disks, setDisks] = useState<string[]>(Array(10).fill('empty'));
  const [ mountPoints, setMountPoints] = useState<string[]>(Array(10).fill('empty'));
  const mounted = useMemo<boolean[]>(() => mountPoints.map((element) => element !== 'empty' && element !== 'not_mounted'), [mountPoints]);
  const [readOnlyFlags, setReadOnlyFlags] = useState<boolean[]>(Array(10).fill(true));

  const handleReadOnly = (index: number) => (event: React.ChangeEvent<HTMLInputElement>): void => {
    const newReadOnlyFlags: boolean[] = [...readOnlyFlags];
    newReadOnlyFlags.splice(index, 1, event.target.checked);
    setReadOnlyFlags(newReadOnlyFlags);
  };

  const updateOneMountPoint = (mountPoint: string): void => {
    const newMountPoints: string[] = [...mountPoints];
    newMountPoints.splice(index, 1, mountPoint);
    setMountPoints(newMountPoints);
  };

  const callback = useCallback((args: string[]): void =>{
    console.log('R: onSendToRenderer ', args);
    setMessage(args);
  }, []);
  
  useEffect(() => {
    const prefix: string = message[0];
    const results: string[] = message.slice(1);

    switch (prefix) {
      case 'check':
        const strArgs = results.map(element => removeSingleQuote(element));
        const newDisks = strToArray(strArgs[0]);
        const newMountPoints = strToArray(strArgs[1]);

        setDisks(newDisks);
        setMountPoints(newMountPoints);
        break;

      case 'mount':
      case 'unmount':
        updateOneMountPoint(results[0]);
        break;
        
      default:
        console.log('python-shell send unexpected messages');
        break;
    }
  }, [message]);

  const handleMount = (newIndex: number) => (): void => {
    console.log('R: clicked, change mount states' + newIndex);
    
    index = newIndex;
    mounted[index]
    ? send(`--unmount --path ${mountPoints[index]}`)
    : readOnlyFlags[index]
      ? send(`--mount --read-only --path ${disks[index]}`)
      : send(`--mount --path ${disks[index]}`);
  };

  const getDisksList = useCallback((): void => {
    console.log('R: clicked, check hdd list');

    send('--check');
  }, []);

  return (
    <DeviceStragesCtx.Provider
      value={{
        disks,
        mountPoints,
        mounted,
        handleMount,
        getDisksList,
        readOnlyFlags,
        handleReadOnly
      }}
    >
      { children }
    </DeviceStragesCtx.Provider>
  );
};
