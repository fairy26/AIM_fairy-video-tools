import React, { useState } from 'react';

import {
  Alert,
  Autocomplete,
  Button,
  Grid,
  LinearProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useDeviceStragesFunctions } from './DeviceStragesProvider';

type Props = {
  disk: string;
};

const NotBlankAlert: React.VFC<Props> = ({ disk }) => {
  const [alertOpen, setAlertOpen] = useState<boolean>(false);

  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  return (
    <>
      <Button onClick={() => setAlertOpen(true)}>open</Button>
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={alertOpen}
        autoHideDuration={1000}
        onClose={handleAlertClose}
      >
        <Alert severity="error" onClose={handleAlertClose}>
          {disk} is not black!
        </Alert>
      </Snackbar>
    </>
  );
};

export const DiskCopy: React.FC = () => {
  const {
    message,
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
  } = useDeviceStragesFunctions();

  return (
    <>
      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs={12}>
          <Typography component="h2" variant="h6" color="primary" gutterBottom>
            Disk Copy
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Autocomplete
            disablePortal
            id="original"
            value={source}
            onChange={handleSourceChange}
            options={sources}
            getOptionDisabled={(option) => option === 'empty' || option === destination}
            renderInput={(params) => <TextField {...params} label="コピー元" />}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Autocomplete
            disablePortal
            id="target"
            value={destination}
            onChange={handleDestinationChange}
            options={destinations}
            getOptionDisabled={(option) => option === 'empty' || option === source}
            renderInput={(params) => <TextField {...params} label="コピー先" />}
          />
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="outlined"
            onClick={handleCopy(source, destination)}
            disabled={source == null || destination == null}
          >
            実行
          </Button>
        </Grid>

        {showProgress && (
          <>
            <Grid item xs={2}>
              <Button variant="outlined" onClick={killBySIGINT} color="error">
                中断
              </Button>
            </Grid>

            <Grid item xs={8}>
              <LinearProgress variant="determinate" value={percentage} />
            </Grid>
            <Grid item xs={2} zeroMinWidth>
              <Typography variant="body2" color="text.secondary" noWrap>
                {remaining}
              </Typography>
            </Grid>
          </>
        )}
      </Grid>

      <NotBlankAlert disk={'/sda/hoge'} />

      {/* python からの出力を表示する Paper */}
      <Paper
        elevation={3}
        sx={{
          width: '100',
          marginTop: 5,
          padding: 3,
        }}
      >
        {message}
      </Paper>
    </>
  );
};
