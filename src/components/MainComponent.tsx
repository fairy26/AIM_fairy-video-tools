import React from 'react';
import { DeviceStrages } from './DeviceStrages';
import { DiskCopy } from './DiskCopy';

import { useModeFunctions } from './ModeProvider';

export const MainComponent = () => {
  const { modeIs } = useModeFunctions();

  const mode = Object.keys(modeIs).reduce((prev, key) => modeIs[key] ? key : prev)

  switch(mode) {
    case 'device_strages':
      return (
        <DeviceStrages />
      )
    case 'disk_copy':
      return (
        <DiskCopy />
      )
  }
}