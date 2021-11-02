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

const strToArray = (str: string): string[] => str.slice(1, -1).split(',');
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

    api.onSendToRenderer(handleStdout);
    api.onSendToRendererInRealTime(handleStderr);

    send('--check');

    return api.removeOnSendToRenderers;
  }, []);

  const [disks, setDisks] = useState<string[]>(Array(10).fill('empty'));
  const [mountPoints, setMountPoints] = useState<string[]>(Array(10).fill('empty'));
  const mounted = useMemo<boolean[]>(
    () => mountPoints.map((element) => element !== 'empty' && element !== 'not_mounted'),
    [mountPoints]
  );
  const [readOnlyFlags, setReadOnlyFlags] = useState<boolean[]>(Array(10).fill(true));
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  const handleSnackbarOpen = useCallback((message: string): void => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = useCallback((): void => {
    setSnackbarOpen(false);
  }, []);

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

  const handleStdout = (arg: string): void => {
    console.log(arg);
    const [prefix, ...messages] = arg.split(' ');
    const message = messages.join('');

    switch (prefix) {
      case 'disk':
        const newDisks = strToArray(removeSingleQuote(message));
        setDisks(newDisks);
        break;
      case 'mountpoint':
        const newMountPoints = strToArray(removeSingleQuote(message));
        setMountPoints(newMountPoints);
        break;
      case 'access':
        const newReadOnlyFlags = strToArray(removeSingleQuote(message)).map(
          (access) => access === 'ro'
        );
        setReadOnlyFlags(newReadOnlyFlags);
        break;
      case 'mount':
      case 'unmount':
        message.startsWith('ERROR')
          ? handleSnackbarOpen(messages.filter((_, i) => i != 0).join(' '))
          : updateOneMountPoint(message);
        break;
      case 'eject':
        message.startsWith('ERROR') &&
          handleSnackbarOpen(messages.filter((_, i) => i != 0).join(' '));
        break;
      default:
        console.log('python-shell send unexpected messages');
    }
  };

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

  const handleEject = useCallback(
    (disk: string) => (): void => {
      console.log('R: clicked, eject', disk);

      send(`--eject --path ${disk}`);
    },
    []
  );

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

  const sources = useMemo<string[]>(
    () =>
      mountPoints.filter(
        (name: string, index: number) =>
          name !== 'not_mounted' && name !== 'empty' && readOnlyFlags[index] && name !== destination
      ),
    [mountPoints]
  );

  const destinations = useMemo<string[]>(
    () =>
      mountPoints
        .map((name: string, index: number) => (name === 'not_mounted' ? disks[index] : name))
        .filter(
          (name: string, index: number) =>
            name !== 'empty' && !readOnlyFlags[index] && name !== source
        ),
    [mountPoints]
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

  const handleStderr = (arg: string): void => {
    console.log(arg);

    const [prefix, ...messages] = arg.split(' ');

    switch (prefix) {
      case 'ALERT':
        setAlertDialogContent(messages.join(' '));
        break;
      case 'OK':
        handleCopy(messages[0], messages[1]);
        break;
      case 'COMPLETED':
        progressOff();
        break;
      default:
        updateProgress(arg);
    }
  };

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

  const handleCopy = useCallback((src: string, dest: string) => {
    console.log(`R: clicked, copy ${src} -> ${dest}`);

    send(`--copy --path ${src} ${dest}`);
    progressOn();
    setSource(null);
    setDestination(null);
  }, []);

  const handleCopyFormat = useCallback((src: string, dest: string) => {
    console.log(`R: clicked, format ${dest} & copy ${src} -> ${dest}`);

    send(`--copy --format --path ${src} ${dest}`);
    progressOn();
    setSource(null);
    setDestination(null);
  }, []);

  const handleCopycheck = useCallback(
    (src: string, dest: string) => (): void => {
      console.log(`R: copycheck ${src}, ${dest}`);

      send(`--copycheck --path ${src} ${dest}`);
    },
    []
  );

  const killBySIGINT = useCallback((): void => {
    console.log('R: clicked, raise keyboard interrupt');

    send('SIGINT');
    progressOff();
  }, []);

  const [alertDialogOpen, setAlertDialogOpen] = useState<boolean>(false);
  const [alertDialogContent, setAlertDialogContent] = useState<string>('');

  const handleAlertDialogClose = () => {
    setAlertDialogOpen(false);
    setAlertDialogContent('');
  };

  const handleAgree = () => {
    handleCopyFormat(source, destination);
    handleAlertDialogClose();
  };

  const handleDisagree = () => {
    progressOff();
    handleAlertDialogClose();
  };

  const handleAlertDialogOpen = useEffect(() => {
    alertDialogContent && setAlertDialogOpen(true);
  }, [alertDialogContent]);

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
        snackbarOpen,
        handleSnackbarClose,
        snackbarMessage,
        handleEject,
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
        handleCopycheck,
        logg,
        alertDialogOpen,
        handleAgree,
        handleDisagree,
        alertDialogContent,
      }}
    >
      {children}
    </DeviceStragesCtx.Provider>
  );
};
