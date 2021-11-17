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

const MainCtx = createContext(null);
export const useFunctions = () => useContext(MainCtx);

const strToArray = (str: string): string[] => str.slice(1, -1).split(',');
const removeSingleQuote = (str: string): string => str.replace(/'/g, '');
const divmod = (x: number, y: number): number[] => [Math.floor(x / y), x % y];
const inputOk = (str: string): boolean => /^[\w-]+$/.test(str);

let index: number = 0;

// @ts-ignore
const api: ContextBridgeApi = window.api;
const send = async (arg: string) => {
  const result: string | void = await api.sendToMainProcess(arg);
  console.log('R: sendToMainProcess ', result);
};

export const MainProvider: React.FC<React.ReactNode> = ({ children }: any) => {
  const [stdout, setStdout] = useReducer((_: string, arg: string) => arg, '');
  const [stderr, setStderr] = useReducer((_: string, arg: string) => arg, '');

  useEffect(() => {
    console.log('R: only one after initial render');

    api.onSendToRenderer(setStdout);
    api.onSendToRendererInRealTime(setStderr);

    send('--monitor');
    send('--check');

    return api.removeOnSendToRenderers;
  }, []);

  // disk management ---------------------------------------------------------

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

  useEffect(() => {
    if (!stdout) return;

    const [prefix, ...messages] = stdout.split(' ');
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
      case 'next':
        handleSteps(messages[0]);
        break;
      default:
        setLogs((prev) => [...prev, stdout]);
        break;
    }
  }, [stdout]);

  const handleSteps = (step: string) => {
    switch (step) {
      case 'copy':
        handleCopy();
        break;
      case 'reorder':
        handleReorder();
        break;
      case 'precheck':
        handlePrecheck();
        break;
      case 'make_list':
        handleMakelist();
        break;
      case 'nas':
        handleNas();
        break;
      default:
        progressOff();
        break;
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

  // disk copy --------------------------------------------------------------

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
    [mountPoints, readOnlyFlags, destination]
  );

  const destinations = useMemo<string[]>(
    () =>
      mountPoints
        .map((name: string, index: number) => (name === 'not_mounted' ? disks[index] : name))
        .filter(
          (name: string, index: number) =>
            name !== 'empty' && !readOnlyFlags[index] && name !== source
        ),
    [disks, mountPoints, readOnlyFlags, source]
  );

  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [percentage, setPercentage] = useState<number>(0);
  const [remaining, setRemaining] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const progressOn = useCallback((): void => {
    setLogs([]);
    setShowProgress(true);
  }, []);

  const progressOff = useCallback((): void => {
    setShowProgress(false);
    setPercentage(0);
    setRemaining('');
    setEndTime('');
    setSource(null);
    setDestination(null);
  }, []);

  useEffect(() => {
    if (!stderr) return;

    const [prefix, ...messages] = stderr.split(' ');

    switch (prefix) {
      case 'ALERT':
        setAlertDialogContent(messages.join(' '));
        break;
      case 'ERROR':
        handleSnackbarOpen(messages.join(' '));
        break;
      default:
        updateProgress(stderr);
        break;
    }
  }, [stderr]);

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
      setLogs((prev) => [...prev, arg]);
    }
  };

  const handleCopy = (format: boolean = false): void => {
    console.log(
      `R: ${format ? `clicked, format ${destination} & ` : ''}copy ${source} -> ${destination}`
    );

    format
      ? send(`--copy --format --path ${source} ${destination}`)
      : send(`--copy --path ${source} ${destination}`);
    progressOn();
  };

  const handleCopycheck = (): void => {
    console.log(`R: clicked, copycheck ${source}, ${destination}`);

    send(`--copycheck --path ${source} ${destination}`);
  };

  const killBySIGINT = useCallback((): void => {
    console.log('R: clicked, raise keyboard interrupt');

    send('SIGINT');
    progressOff();
  }, []);

  const [alertDialogContent, setAlertDialogContent] = useState<string>('');

  // precheck --------------------------------------------------------------
  const [reorder, toggleReorder] = useReducer((reorder) => !reorder, true);
  const [precheck, togglePrecheck] = useReducer((precheck) => !precheck, true);
  const [makelist, toggleMakelist] = useReducer((makelist) => !makelist, true);
  const [nas, toggleNas] = useReducer((nas) => !nas, true);

  const [inst, setInst] = useReducer(
    (_: string, event: React.ChangeEvent<HTMLInputElement>) => event.target.value,
    'aim'
  );
  const [room, setRoom] = useReducer(
    (_: string, event: React.ChangeEvent<HTMLInputElement>) => event.target.value,
    'room'
  );
  const [xlsxName, setXlsxName] = useReducer(
    (_: string, event: React.ChangeEvent<HTMLInputElement>) => event.target.value,
    'disk-'
  );

  const instError = useMemo(() => !inputOk(inst), [inst]);

  const roomError = useMemo(() => !inputOk(room), [room]);

  const xlsxNameError = useMemo(() => !inputOk(xlsxName), [xlsxName]);

  const copyDisable = useMemo(
    () =>
      showProgress ||
      !source ||
      !destination ||
      !inst ||
      !room ||
      instError ||
      roomError ||
      xlsxNameError,
    [showProgress, source, destination, inst, room, instError, roomError, xlsxNameError]
  );

  const handleReorder = () => {
    console.log(`R: reorder ${destination} (institution=${inst}, room=${room})`);

    reorder ? send(`--reorder --path ${destination} --inst ${inst} --room ${room}`) : progressOff();
  };

  const handlePrecheck = () => {
    console.log(`R: precheck ${destination}`);

    precheck ? send(`--precheck --path ${destination}`) : progressOff();
  };

  const handleMakelist = () => {
    console.log(`R: make_list ${xlsxName}.xlsx in ${destination}`);

    makelist
      ? send(`--make_list --path ${destination} --xlsx ${xlsxName + '.xlsx'}`)
      : progressOff();
  };

  const handleNas = () => {
    console.log(`R: nas ${destination} -> dest (config bucket)`);

    nas ? send(`--nas --path ${destination}`) : progressOff();
  };

  return (
    <MainCtx.Provider
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
        handleCopy,
        handleCopycheck,
        logs,
        alertDialogContent,
        setAlertDialogContent,
        progressOff,
        reorder,
        toggleReorder,
        precheck,
        togglePrecheck,
        makelist,
        toggleMakelist,
        nas,
        toggleNas,
        inst,
        setInst,
        room,
        setRoom,
        xlsxName,
        setXlsxName,
        copyDisable,
        instError,
        roomError,
        xlsxNameError,
      }}
    >
      {children}
    </MainCtx.Provider>
  );
};
