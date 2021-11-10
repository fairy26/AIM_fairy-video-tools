import React from 'react';

import { Button } from '@mui/material';
import { Cached as CashedIcon } from '@mui/icons-material';

import { useDeviceStragesFunctions } from './DeviceStragesProvider';

export const ReloadDisksButton = () => {
  const { getDisksList } = useDeviceStragesFunctions();
  return (
      <Button
        variant='outlined'
        startIcon={<CashedIcon />}
        onClick={getDisksList}
      >
        Reload
      </Button>
  );
};