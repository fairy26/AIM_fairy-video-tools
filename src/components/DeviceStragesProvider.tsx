import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import { ContextBridgeApi } from '../preload';

const DeviceStragesCtx = createContext(null);
export const useDeviceStragesFunctions = () => useContext(DeviceStragesCtx);

const strToArray = (str: string): string[] => str.slice(1, -1).split(', ');
const removeSingleQuote = (str: string): string => str.replace(/'/g, '');

let index: number = 0;

// @ts-ignore
const api: ContextBridgeApi = window.api;
const send = async (arg: string) => {
  const result: string | void = await api.sendToMainProcess(arg);
  console.log('R: sendToMainProcess ', result);
};

export const DeviceStragesProvider: React.FC<React.ReactNode> = ({ children }: any) => {
  useEffect(() => {
    console.log('R: only one after initial render');

    api.onSendToRenderer(callback);
    api.onSendToRendererInRealTime(getProgress);

    send('--check');

    return api.removeOnSendToRenderers;
  }, []);

  const [message, setMessage] = useState<string[]>([]);
  const [disks, setDisks] = useState<string[]>(Array(10).fill('empty'));
  const [mountPoints, setMountPoints] = useState<string[]>(Array(10).fill('empty'));
  const mounted = useMemo<boolean[]>(
    () => mountPoints.map((element) => element !== 'empty' && element !== 'not_mounted'),
    [mountPoints]
  );
  const [readOnlyFlags, setReadOnlyFlags] = useState<boolean[]>(Array(10).fill(true));

  const handleReadOnly =
    (index: number) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setReadOnlyFlags((prev) => [
        ...prev.map((element, i) => (i === index ? event.target.checked : element)),
      ]);
    };

  const updateOneMountPoint = (mountPoint: string): void => {
    setMountPoints((prev) => [...prev.map((element, i) => (i === index ? mountPoint : element))]);
  };

  const callback = useCallback((args: string[]): void => {
    console.log('R: onSendToRenderer ', args);
    setMessage(args);
  }, []);

  useEffect(() => {
    const prefix: string = message[0];
    const results: string[] = message.slice(1);

    switch (prefix) {
      case 'check':
        const strArgs = results.map((element) => removeSingleQuote(element));
        const newDisks = strToArray(strArgs[0]);
        const newMountPoints = strToArray(strArgs[1]);
        const newReadOnlyFlags = strToArray(strArgs[2]).map((access) => access === 'ro');

        setDisks(newDisks);
        setMountPoints(newMountPoints);
        setReadOnlyFlags(newReadOnlyFlags);
        break;

      case 'mount':
      case 'unmount':
        updateOneMountPoint(results[0]);
        break;

      case 'copy':
        // console.log(results);
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

  // --------------------------------------------------------------

  const [source, setSource] = useState<string | null>(null);
  const handleSourceChange = (event: React.ChangeEvent<HTMLInputElement>, newValue: string) => {
    setSource(newValue);
  };

  const [destination, setDestination] = useState<string | null>(null);
  const handleDestinationChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    newValue: string
  ) => {
    setDestination(newValue);
  };

  const sources = mountPoints.filter(
    (name: string, index: number) =>
      name !== 'not_mounted' && name !== 'empty' && readOnlyFlags[index] && name !== destination
  );
  const destinations = mountPoints.filter(
    (name: string, index: number) =>
      name !== 'not_mounted' && name !== 'empty' && !readOnlyFlags[index] && name !== source
  );

  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [percentage, setPercentage] = useState<number>(0);
  const [remaining, setRemaining] = useState<string>('-');

  const progressOn = useCallback((): void => {
    setShowProgress(true);
  }, []);

  const progressOff = useCallback((): void => {
    setShowProgress(false);
    setPercentage(0);
    setRemaining('-');
    setLogg('');
  }, []);

  const getProgress = useCallback((arg: string): void => {
    arg === 'finished' ? progressOff() : updateProgress(arg);
  }, []);

  const [logg, setLogg] = useState<string>('');

  const updateProgress = (arg: string) => {
    if (arg.startsWith('copy')) {
      setLogg((prev) => `${prev}${arg}\n`);
    } else {
      const progress = arg.replace(/\r/g, '').split(',');

      const newPercentage = parseInt(progress[0], 10);
      const newRemaining = progress[1] === '?' ? '-' : `残り ${progress[1]}`;

      setPercentage(newPercentage);
      setRemaining(newRemaining);
    }
  };

  const handleCopy = useCallback(
    (src: string, dest: string) => (): void => {
      console.log('R: clicked, check hdd list');

      send(`--copy --path ${src} ${dest}`);
      progressOn();
      setSource(null);
      setDestination(null);
    },
    []
  );

  const killBySIGINT = useCallback((): void => {
    console.log('R: clicked, raise keyboard interrupt');

    send('SIGINT');
    progressOff();
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
        handleReadOnly,
        percentage,
        showProgress,
        remaining,
        killBySIGINT,
        source,
        sources,
        handleSourceChange,
        destination,
        destinations,
        handleDestinationChange,
        handleCopy,
        logg,
      }}
    >
      {children}
    </DeviceStragesCtx.Provider>
  );
};
