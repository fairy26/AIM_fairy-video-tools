import React from 'react';

import { Button, Grid, Typography } from '@mui/material';

import { useDeviceStragesFunctions } from './DeviceStragesProvider';
import { AlertSnackbar } from './AlertSnackbar';
import { AlertDialog } from './AlertDialog';
import { CopyTargetSelect } from './CopyTargetSelect';
import { GriddedPbar } from './GriddedPbar';
import { Logger } from './Logger';

export const DiskCopy: React.FC = () => {
  const {
    showProgress,
    source,
    sources,
    handleSourceChange,
    destination,
    destinations,
    handleDestinationChange,
    handleCopycheck,
  } = useDeviceStragesFunctions();

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
            <GriddedPbar />
          </Grid>
        )}
      </Grid>

      <Logger />

      <AlertDialog {...{ source, destination }} />
      <AlertSnackbar />
    </>
  );
};
