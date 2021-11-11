import React from 'react';

import { Button, Checkbox, FormControlLabel } from '@mui/material';
import { PlayCircle as PlayCircleIcon, StopCircle as StopCircleIcon } from '@mui/icons-material';

import { useFunctions } from './MainProvider';

type Props = {
  isMounted: boolean;
  index: number;
};

export const ListedMountButton: React.VFC<Props> = ({ isMounted, index }) => {
  const { readOnlyFlags, handleReadOnly, handleMount } = useFunctions();

  return (
    <>
      <FormControlLabel
        id={index.toString()}
        label="RO"
        control={
          <Checkbox
            checked={readOnlyFlags[index]}
            disabled={isMounted}
            onChange={handleReadOnly(index)}
            title="RO"
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
