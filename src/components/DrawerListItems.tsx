import React from 'react';

import {
    ListItem,
    ListItemIcon,
    ListItemText,
    ListSubheader} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AllInboxRounded as AllInboxRoundedIcon,
} from '@mui/icons-material/';

export const mainListItems = ( 
  <div>
    <ListItem button>
      <ListItemIcon>
        <AllInboxRoundedIcon />
      </ListItemIcon>
      <ListItemText primary="Device Strages" />
    </ListItem>
  </div>
);