import React, { useState } from 'react';

import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Grid,
  LinearProgress,
  TextareaAutosize,
  TextField,
  Typography,
} from '@mui/material';
import { useDeviceStragesFunctions } from './DeviceStragesProvider';
import { AlertSnackbar } from './AlertSnackbar';

export const DiskCopy: React.FC = () => {
  const {
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
  } = useDeviceStragesFunctions();

  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logg]);

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

        <Grid item xs={12} sx={{ marginLeft: 'auto' }}>
          <Button
            variant="outlined"
            onClick={handleCopycheck(source, destination)}
            disabled={source == null || destination == null}
          >
            実行
          </Button>
        </Grid>

        {showProgress && (
          <>
            <Grid item xs container direction="column" spacing={0.5}>
              <Grid item xs>
                <LinearProgress variant="determinate" value={percentage} />
              </Grid>

              <Grid item xs zeroMinWidth sx={{ marginLeft: 'auto' }}>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {remaining ? `${remaining} (${endTime})` : ' '}
                </Typography>
              </Grid>
            </Grid>

            <Grid item xs="auto" sx={{ marginLeft: 'auto' }}>
              <Button variant="outlined" onClick={killBySIGINT} color="error">
                中断
              </Button>
            </Grid>
          </>
        )}
      </Grid>

      <TextareaAutosize ref={scrollRef} maxRows={20} value={logg} disabled />

      <Dialog
        open={alertDialogOpen}
        onClose={handleDisagree}
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-description">{alertDialogContent}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleAgree}>
            はい
          </Button>
          <Button variant="outlined" onClick={handleDisagree} autoFocus color="error">
            キャンセル
          </Button>
        </DialogActions>
      </Dialog>
      <AlertSnackbar />
    </>
  );
};
