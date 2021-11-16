import React from 'react';

import { Button, Grid, Typography } from '@mui/material';

import { useFunctions } from './MainProvider';
import { AlertSnackbar } from './AlertSnackbar';
import { AlertDialog } from './AlertDialog';
import { CopyTargetSelect } from './CopyTargetSelect';
import { GriddedPbar } from './GriddedPbar';
import { Logger } from './Logger';
import { PreOptions } from './PreOptions';

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
    copyDisable,
  } = useFunctions();

  const HandleCopyButton = () => (
    <Button variant="outlined" onClick={handleCopycheck} disabled={copyDisable} size="large">
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
            disabled={showProgress}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <CopyTargetSelect
            label="コピー先"
            select={destination}
            except={source}
            options={destinations}
            handleChange={handleDestinationChange}
            disabled={showProgress}
          />
        </Grid>

        <Grid item xs={12}>
          <PreOptions />
        </Grid>

        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
          <HandleCopyButton />
        </Grid>

        <GriddedPbar />
      </Grid>

      <Logger />

      <AlertDialog />
      <AlertSnackbar />
    </>
  );
};
