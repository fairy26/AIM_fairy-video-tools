import React from 'react';

import { Button, Grid, LinearProgress, TextareaAutosize, Typography } from '@mui/material';
import { useDeviceStragesFunctions } from './DeviceStragesProvider';
import { AlertSnackbar } from './AlertSnackbar';
import { AlertDialog } from './AlertDialog';
import { CopyTargetSelect } from './CopyTargetSelect';

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
  } = useDeviceStragesFunctions();

  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logg]);

  const HandleCopyButton = (
    <Button
      variant="outlined"
      onClick={handleCopycheck(source, destination)}
      disabled={source == null || destination == null}
    >
      実行
    </Button>
  );

  return (
    <>
      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs={12}>
          <Typography component="h2" variant="h6" color="primary" gutterBottom>
            Disk Copy
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <CopyTargetSelect
            label="コピー元"
            select={source}
            except={destination}
            options={sources}
            handleChange={handleSourceChange}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <CopyTargetSelect
            label="コピー先"
            select={destination}
            except={source}
            options={destinations}
            handleChange={handleDestinationChange}
          />
        </Grid>

        <Grid item xs={12} sx={{ marginLeft: 'auto' }}>
          {HandleCopyButton}
        </Grid>

        {showProgress && (
          <Grid item xs>
            <Grid container direction="column" spacing={0.5}>
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
          </Grid>
        )}
      </Grid>

      <TextareaAutosize ref={scrollRef} maxRows={20} value={logg} disabled />

      <AlertDialog {...{ source, destination }} />
      <AlertSnackbar />
    </>
  );
};
