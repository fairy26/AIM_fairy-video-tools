import React from 'react';

import {
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Grid,
  IconButton,
} from '@mui/material';
import { PowerSettingsNewRounded as PowerSettingsNewRoundedIcon } from '@mui/icons-material';

import { useFunctions } from './MainProvider';
import { ReloadDisksButton } from './ReloadDisksButton';
import { PowerOnBadge } from './PowerOnBadge';
import { ListedMountButton } from './ListedMountButton';
import { AlertSnackbar } from './AlertSnackbar';

export const DeviceStrages: React.FC = () => {
  const { disks, mounted, mountPoints, handleEject } = useFunctions();

  const Disks = () => {
    return disks.map((disk: string, index: number) => {
      const isEmpty: boolean = disk === 'empty';
      const isMounted: boolean = mounted[index];

      return (
        <ListItem key={index} sx={{ paddingY: '0' }}>
          <ListItemAvatar>
            <PowerOnBadge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
              invisible={isEmpty}
            >
              <Avatar sx={{ width: 34, height: 34 }}>
                <IconButton color="inherit" onClick={handleEject(disk)} disabled={isEmpty}>
                  <PowerSettingsNewRoundedIcon />
                </IconButton>
              </Avatar>
            </PowerOnBadge>
          </ListItemAvatar>
          <ListItemText
            primary={disk}
            secondary={isEmpty ? null : isMounted ? mountPoints[index] : 'not mounted'}
            sx={{
              border: isEmpty ? 1 : 2,
              marginY: '4px',
              maxWidth: 250,
              paddingX: '4px',
              paddingY: isEmpty ? '15.01px' : '4px',
              bgcolor: 'common.white',
              ...(isMounted && { borderColor: 'primary.light' }),
              ...(isEmpty && { color: 'text.disabled' }),
            }}
          />
        </ListItem>
      );
    });
  };

  const Buttons = () => {
    return disks.map((disk: string, index: number) => {
      const isEmpty: boolean = disk === 'empty';
      const isMounted: boolean = mounted[index];

      return (
        <ListItem
          key={index}
          sx={{
            paddingY: '0',
            paddingRight: '0',
            height: '64px',
            visibility: isEmpty ? 'hidden' : 'visible',
          }}
        >
          <ListedMountButton {...{ isMounted, index }} />
        </ListItem>
      );
    });
  };

  return (
    <>
      <Grid container spacing={1} justifyContent="space-between" alignItems="center">
        <Grid item xs={8}>
          <Typography component="h2" variant="h6" color="primary" gutterBottom>
            Device Strages
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <ReloadDisksButton />
        </Grid>
        <Grid item container xs={12} alignItems="center">
          <Grid item>
            <List
              sx={{
                border: 1,
                borderRadius: 3,
                width: 350,
              }}
            >
              <Disks />
            </List>
          </Grid>
          <Grid item xs zeroMinWidth>
            <List>
              <Buttons />
            </List>
          </Grid>
        </Grid>
      </Grid>
      <AlertSnackbar />
    </>
  );
};
