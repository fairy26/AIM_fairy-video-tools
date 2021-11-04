import React from 'react';

import { Button, Grid, LinearProgress, Typography } from '@mui/material';
import { useFunctions } from './MainProvider';

export const GriddedPbar: React.VFC = () => {
  const { percentage, remaining, endTime, killBySIGINT } = useFunctions();

  return (
    <>
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
    </>
  );
};
