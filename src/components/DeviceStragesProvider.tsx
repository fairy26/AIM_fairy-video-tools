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
const divmod = (x: number, y: number): number[] => [Math.floor(x / y), x % y];

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
  const destinations = mountPoints
    .map((name: string, index: number) => (name === 'not_mounted' ? disks[index] : name))
    .filter(
      (name: string, index: number) => name !== 'empty' && !readOnlyFlags[index] && name !== source
    );
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [percentage, setPercentage] = useState<number>(0);
  const [remaining, setRemaining] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [logg, setLogg] = useState<string>('');

  const progressOn = useCallback((): void => {
    setLogg('');
    setShowProgress(true);
  }, []);

  const progressOff = useCallback((): void => {
    setShowProgress(false);
    setPercentage(0);
    setRemaining('');
    setEndTime('');
  }, []);

  const getProgress = useCallback((arg: string): void => {
    arg === 'finished' ? progressOff() : updateProgress(arg);
  }, []);

  const formatInterval = (t: number): string => {
    const [mins, s] = divmod(t, 60);
    const [h, m] = divmod(mins, 60);
    const str = `${h ? `${h.toString()}:` : ''}
      ${m.toString().padStart(2, '0')}:
      ${s.toString().padStart(2, '0')}`;
    return str;
  };

  const formatEndTime = (remainingTime: number): string => {
    const date = new Date();
    date.setSeconds(date.getSeconds() + remainingTime);
    const str = new Intl.DateTimeFormat('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    }).format(date);
    return str;
  };

  const updateProgress = (arg: string) => {
    const message = arg.replace(/\r/g, '');
    if (/^\d+,\s?(\?|\d+)/.test(message)) {
      const progress = message.replace(/\s/g, '').split(',');

      const newPercentage = parseInt(progress[0], 10);
      const newRemaining =
        progress[1] === '?' ? '' : `残り ${formatInterval(parseInt(progress[1], 10))}`;
      const newEndTime =
        progress[1] === '?' ? '' : `終了予定 ${formatEndTime(parseInt(progress[1], 10))}`;

      setPercentage(newPercentage);
      setRemaining(newRemaining);
      setEndTime(newEndTime);
    } else {
      setLogg((prev) => `${prev}${message}\n`);
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
        endTime,
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
