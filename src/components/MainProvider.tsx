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
const inputOkInReorder = (str: string): boolean => /^[\w]+$/.test(str);
const inputOkInMakelist = (str: string): boolean => /^[\w-]+$/.test(str);

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

  const updateOneMountPoint = (index: number, mountPoint: string): void => {
    setMountPoints((prev) => [...prev.map((element, i) => (i === index ? mountPoint : element))]);
  };

  useEffect(() => {
    if (!stdout) return;

    const [prefix, ...messages] = stdout.split(' ');
    const message = messages.join('');

    switch (prefix) {
      case 'DISK':
        const newDisks = strToArray(removeSingleQuote(message));
        setDisks(newDisks);
        break;
      case 'MOUNTPOINT':
        const newMountPoints = strToArray(removeSingleQuote(message));
        setMountPoints(newMountPoints);
        break;
      case 'ACCESS':
        const newReadOnlyFlags = strToArray(removeSingleQuote(message)).map(
          (access) => access === 'ro'
        );
        setReadOnlyFlags(newReadOnlyFlags);
        break;
      case 'MOUNT':
      case 'UNMOUNT':
        message.startsWith('ERROR')
          ? handleSnackbarOpen(messages.filter((_, i) => i != 0).join(' '))
          : updateOneMountPoint(Number(messages[0]) - 1, messages[1]);
        break;
      case 'EJECT':
        message.startsWith('ERROR') &&
          handleSnackbarOpen(messages.filter((_, i) => i != 0).join(' '));
        break;
      case 'NEXT':
        handleSteps(messages[0]);
        break;
      default:
        setLogs((prev) => [...prev, stdout]);
        break;
    }

    // setStdout('');
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

  const handleMount = (index: number) => (): void => {
    console.log(`R: clicked, change mount states ${index}:${disks[index]}`);

    mounted[index]
      ? send(`--unmount --path ${disks[index]}`)
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
    setOptionOpen(false);
    setLogs([]);
    setErrorFiles([]);
    setShowProgress(true);
    setPyError('');
  }, []);

  const progressOff = useCallback((onlyPbar: boolean = false): void => {
    setShowProgress(false);
    initRemaining();
    if (!onlyPbar) {
      setOptionOpen(true);
      setSource(null);
      setDestination(null);
    }
  }, []);

  const initRemaining = useCallback((): void => {
    setPercentage(0);
    setRemaining('');
    setEndTime('');
  }, []);

  useEffect(() => {
    if (!stderr) return;

    const [prefix, ...messages] = stderr.split(' ');
    const message = messages.join(' ');

    switch (prefix) {
      case 'ALERT':
        setAlertDialogContent(message);
        break;
      case 'ERROR':
        handleSnackbarOpen(message);
        break;
      case 'FILEERROR':
        setErrorFiles((prev) => [...prev, message]);
        break;
      case 'PYERROR':
        progressOff();
        setPyError((prev) => `${prev}${message}\n`);
        break;
      default:
        updateProgress(stderr);
        break;
    }
    setStderr('');
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
      `R: ${format && `clicked, format ${destination} & `}copy ${source} -> ${destination}`
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
  const [optionsOpen, setOptionOpen] = useState<boolean>(true);

  const toggleOptionsOpen = () => setOptionOpen((prev) => !prev);

  const [reorder, setReorder] = useState<boolean>(true);
  const [precheck, setPrecheck] = useState<boolean>(true);
  const [makelist, setMakelist] = useState<boolean>(true);
  const [nas, setNas] = useState<boolean>(true);

  const toggleReorder = () => {
    setReorder((prev) => !prev);
  };

  const togglePrecheck = () => {
    setPrecheck((prev) => !prev);
  };

  const toggleMakelist = () => {
    setMakelist((prev) => !prev);
  };

  const toggleNas = () => {
    setNas((prev) => !prev);
  };

  useEffect(() => {
    if (!reorder) {
      setPrecheck(false);
    }
  }, [reorder]);

  useEffect(() => {
    if (precheck) {
      setReorder(true);
    } else {
      setMakelist(false);
    }
  }, [precheck]);

  useEffect(() => {
    if (makelist) {
      setPrecheck(true);
    } else {
      setNas(false);
    }
  }, [makelist]);

  useEffect(() => {
    if (nas) {
      setMakelist(true);
    }
  }, [nas]);

  const [inst, setInst] = useReducer(
    (_: string, event: React.ChangeEvent<HTMLInputElement>) => event.target.value,
    ''
  );
  const [room, setRoom] = useReducer(
    (_: string, event: React.ChangeEvent<HTMLInputElement>) => event.target.value,
    ''
  );
  const [xlsxName, setXlsxName] = useReducer(
    (_: string, event: React.ChangeEvent<HTMLInputElement>) => event.target.value,
    ''
  );

  const instError = useMemo(() => reorder && !inputOkInReorder(inst), [reorder, inst]);

  const roomError = useMemo(() => reorder && !inputOkInReorder(room), [reorder, room]);

  const xlsxNameError = useMemo(
    () => makelist && !inputOkInMakelist(xlsxName),
    [makelist, xlsxName]
  );

  const copyDisable = useMemo(
    () => showProgress || !source || !destination || instError || roomError || xlsxNameError,
    [showProgress, source, destination, instError, roomError, xlsxNameError]
  );

  const [errorFiles, setErrorFiles] = useState<string[]>([]);

  const [pyError, setPyError] = useState<string>('');

  const handleReorder = () => {
    if (reorder) {
      console.log(`R: reorder ${destination} (institution=${inst}, room=${room})`);
      initRemaining();
      send(`--reorder --path ${destination} --inst ${inst} --room ${room}`);
    } else progressOff();
  };

  const handlePrecheck = () => {
    if (precheck) {
      console.log(`R: precheck ${destination}`);
      initRemaining();
      send(`--precheck --path ${destination}`);
    } else progressOff();
  };

  const handleMakelist = () => {
    if (makelist) {
      console.log(`R: make_list ${xlsxName}.xlsx in ${destination}`);
      initRemaining();
      send(`--make_list --path ${destination} --xlsx ${xlsxName + '.xlsx'}`);
    } else progressOff();
  };

  const handleNas = () => {
    if (nas) {
      console.log(`R: nas ${destination} -> ${xlsxName} (config sandbox)`);
      initRemaining();
      send(`--nas --path ${destination} --dest ${xlsxName}`);
    } else progressOff();
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
        errorFiles,
        optionsOpen,
        toggleOptionsOpen,
        pyError,
      }}
    >
      {children}
    </MainCtx.Provider>
  );
};
