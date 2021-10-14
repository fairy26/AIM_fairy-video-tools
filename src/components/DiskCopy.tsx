import React, { useState } from "react";

import {
  Alert,
  Autocomplete,
  Button,
  Grid,
  LinearProgress,
  Paper,
  Snackbar,
  TextField,
  Typography
} from "@mui/material";
import { useDeviceStragesFunctions } from "./DeviceStragesProvider";

const NotBlankAlert: React.VFC = (disk: string) => {
  const [alertOpen, setAlertOpen] = useState<boolean>(false);

  const handleAlertClose = () => {
    setAlertOpen(false);
  }

  return (
    <>
    <Button onClick={() => setAlertOpen(true)}>open</Button>
    <Snackbar anchorOrigin={{vertical: 'bottom', horizontal: 'center'}} open={alertOpen} autoHideDuration={1000} onClose={handleAlertClose}>
      <Alert severity='error' onClose={handleAlertClose}>
        {disk} is not black!
      </Alert>
    </Snackbar>
    </>
  )
}

export const DiskCopy: React.FC = () => {
  const { disks, readOnlyFlags, message, copyDisk, percentage, showProgress, remaining, killBySIGINT } = useDeviceStragesFunctions();

  const [originalDisk, setOriginalDisk] = useState<string | null>(null)
  const handleOriginalChange = (event: React.ChangeEvent<HTMLInputElement>, newInputValue: string) => {
    setOriginalDisk(newInputValue);
  };

  const [targetDisk, setTargetDisk] = useState<string | null>(null)
  const handleTargetChange = (event: React.ChangeEvent<HTMLInputElement>, newInputValue: string) => {
    setTargetDisk(newInputValue);
  };

  const handleCopy = () => {
    setOriginalDisk(null);
    setTargetDisk(null);
    copyDisk();
  }

  const disksWithPosition = disks.map((name: string, index: number) => name !== 'empty' ? `Disk${index+1} (${name})` : name)
  const originalDisks = disksWithPosition.filter((_: string, index: number) => readOnlyFlags[index])
  const targetDisks = disksWithPosition.filter((name :string, index: number) => !readOnlyFlags[index] && name !== 'empty')

  return (
    <>
      <Grid
        container
        spacing={2}
        justifyContent="center"
        alignItems="center"
      >
        <Grid item xs={12}>
          <Typography component="h2" variant="h6" color="primary" gutterBottom>
            Disk Copy
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
        <Autocomplete
            disablePortal
            id="original"
            value={originalDisk}
            onChange={handleOriginalChange}
            options={originalDisks}
            getOptionDisabled={(option) =>
              option === 'empty' ||
              option === targetDisk
            }
            renderInput={(params) => <TextField {...params} label="コピー元" />}
            />
        </Grid>

        <Grid item xs={12} md={6}>
          <Autocomplete
            disablePortal
            id="target"
            value={targetDisk}
            onChange={handleTargetChange}
            options={targetDisks}
            getOptionDisabled={(option) =>
              option === 'empty' ||
              option === originalDisk
            }
            renderInput={(params) => <TextField {...params} label="コピー先" />}
            />
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="outlined"
            onClick={handleCopy}
            disabled={originalDisk == null || targetDisk == null}
          >
            実行
          </Button>
        </Grid>

        {showProgress &&
        <>
          <Grid item xs={2}>
            <Button
              variant="outlined"
              onClick={killBySIGINT}
              color="error"
            >
              中断
            </Button>
          </Grid>

          <Grid item xs={8}>
            <LinearProgress variant="determinate" value={percentage}/>
          </Grid>
          <Grid item xs={2} zeroMinWidth>
            <Typography variant="body2" color="text.secondary" noWrap>
              {remaining}
            </Typography>
        </Grid>
        </>
        }

      </Grid>

      {NotBlankAlert('/sda/hoge')}

      {/* python からの出力を表示する Paper */}
      <Paper
        elevation={3}
        sx = {{
          width: "100",
          marginTop: 5,
          padding: 3
        }}
      >
        {message}
      </Paper>
    </>
  )
}