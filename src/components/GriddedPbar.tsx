import React from 'react';

import { Button, Grid, LinearProgress, Typography } from '@mui/material';
import { useFunctions } from './MainProvider';

export const GriddedPbar: React.VFC = () => {
  const { showProgress, percentage, remaining, endTime, killBySIGINT } = useFunctions();

  return (
    <Grid
      item
      xs={12}
      container
      justifyContent="flex-end"
      alignItems="flex-end"
      spacing={1}
      sx={{ display: !showProgress && 'none' }}
    >
      <Grid item xs>
        <LinearProgress variant={remaining ? 'determinate' : 'indeterminate'} value={percentage} />

        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          sx={{ display: 'flex', justifyContent: 'flex-end' }}
        >
          {remaining ? `${remaining} (${endTime})` : ' '}
        </Typography>
      </Grid>

      <Grid item xs="auto">
        <Button variant="outlined" onClick={killBySIGINT} color="error">
          中断
        </Button>
      </Grid>
    </Grid>
  );
};
