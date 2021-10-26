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

import { useDeviceStragesFunctions } from './DeviceStragesProvider';
import { ReloadDisksButton } from './ReloadDisksButton';
import { PowerOnBadge } from './PowerOnBadge';
import { ListedMountButton } from './ListedMountButton';

export const DeviceStrages: React.FC = () => {
  const { disks, mounted, mountPoints } = useDeviceStragesFunctions();

  return (
    <>
      <Grid container spacing={2} justifyContent="space-between" alignItems="center">
        <Grid item xs={8}>
          <Typography component="h2" variant="h6" color="primary" gutterBottom>
            Device Strages
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <ReloadDisksButton />
        </Grid>

        <Grid item xs={12}>
          <List
            sx={{
              border: 1,
              borderRadius: 3,
              width: '100%',
              bgcolor: 'background.paper',
            }}
          >
            {disks.map((disk: string, index: number) => {
              const isEmpty: boolean = disk === 'empty';
              const isMounted: boolean = mounted[index];

              return (
                <ListItem
                  key={index}
                  secondaryAction={isEmpty ? null : <ListedMountButton {...{ isMounted, index }} />}
                  sx={{ paddingY: '0' }}
                >
                  <ListItemAvatar>
                    <PowerOnBadge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      invisible={isEmpty}
                    >
                      <Avatar sx={{ width: 34, height: 34 }}>
                        <IconButton color="inherit">
                          <PowerSettingsNewRoundedIcon />
                        </IconButton>
                      </Avatar>
                    </PowerOnBadge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={disk}
                    secondary={isEmpty ? null : isMounted ? mountPoints[index] : 'not mounted'}
                    sx={{
                      border: 1,
                      maxWidth: 250,
                      paddingX: '4px',
                      paddingY: isEmpty ? '14.01px' : '4px',
                      bgcolor: 'common.white',
                      ...(isMounted && { borderColor: 'primary.light' }),
                      ...(isEmpty && { color: 'text.disabled' }),
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        </Grid>
      </Grid>
    </>
  );
};
