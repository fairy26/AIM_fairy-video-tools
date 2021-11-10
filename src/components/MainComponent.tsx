import React from 'react';
import { Paper } from '@mui/material';

import { DeviceStrages } from './DeviceStrages';
import { DiskCopy } from './DiskCopy';
import { useModeFunctions } from './ModeProvider';

export const MainComponent = () => {
  const { modeIs } = useModeFunctions();

  const mode = Object.keys(modeIs).reduce((prev, key) => (modeIs[key] ? key : prev));

  const Mode = () => {
    switch (mode) {
      case 'device_strages':
        return <DeviceStrages />;
      case 'disk_copy':
        return <DiskCopy />;
    }
  };

  return (
    <Paper
      sx={{
        margin: 2,
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Mode />
    </Paper>
  );
};
