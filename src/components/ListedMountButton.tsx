import React from 'react';

import { Button, Checkbox, FormControlLabel, Switch } from '@mui/material';
import { PlayCircle as PlayCircleIcon, StopCircle as StopCircleIcon } from '@mui/icons-material';

import { useDeviceStragesFunctions } from './DeviceStragesProvider';

type Props = {
  isMounted: boolean;
  index: number;
};

export const ListedMountButton: React.VFC<Props> = ({ isMounted, index }) => {
  const { readOnlyFlags, handleReadOnly, handleMount } = useDeviceStragesFunctions();

  return (
    <>
      <FormControlLabel
        id={index.toString()}
        label={readOnlyFlags[index] ? 'ro' : 'rw'}
        control={
          <Checkbox
            checked={readOnlyFlags[index]}
            disabled={isMounted}
            onChange={handleReadOnly(index)}
            inputProps={{ 'aria-label': 'Read Only' }}
          />
        }
      />
      <Button
        variant="outlined"
        color={isMounted ? 'error' : 'primary'}
        startIcon={isMounted ? <StopCircleIcon /> : <PlayCircleIcon />}
        onClick={handleMount(index)}
      >
        {isMounted ? 'Unmount' : 'Mount'}
      </Button>
    </>
  );
};
