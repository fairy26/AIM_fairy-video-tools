import React from 'react';

import { Button } from '@mui/material';
import { Cached as CashedIcon } from '@mui/icons-material';

import { useFunctions } from './MainProvider';

export const ReloadDisksButton = () => {
  const { getDisksList } = useFunctions();
  return (
    <Button variant="outlined" startIcon={<CashedIcon />} onClick={getDisksList}>
      Reload
    </Button>
  );
};
