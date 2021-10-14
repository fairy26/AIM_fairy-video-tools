import React from 'react';

import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import {
  AllInboxRounded as AllInboxRoundedIcon,
  CopyAll as CopyAllIcon,
} from '@mui/icons-material/';

import { useModeFunctions } from './ModeProvider';

export const DrawerListItems: React.VFC = () => {
  const { modeIs, handleMode } = useModeFunctions();

  return (
    <List>
      <ListItemButton selected={modeIs.device_strages} onClick={handleMode('device_strages')}>
        <ListItemIcon>
          <AllInboxRoundedIcon />
        </ListItemIcon>
        <ListItemText primary="Device Strages" />
      </ListItemButton>
      <ListItemButton selected={modeIs.disk_copy} onClick={handleMode('disk_copy')}>
        <ListItemIcon>
          <CopyAllIcon />
        </ListItemIcon>
        <ListItemText primary="Disk Copy" />
      </ListItemButton>
    </List>
  );
};
