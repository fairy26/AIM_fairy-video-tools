import React from 'react';

import { InputAdornment, ListItem, ListItemIcon, TextField } from '@mui/material';
import { InsertDriveFile as InsertDriveFileIcon } from '@mui/icons-material';

import { useFunctions } from './MainProvider';

type Props = {
  label: string;
};

export const MakelistOptinos: React.VFC<Props> = ({ label }) => {
  const { xlsxName, setXlsxName } = useFunctions();

  return (
    <ListItem sx={{ display: 'flex', alignItems: 'flex-end', paddingLeft: 6 }}>
      <ListItemIcon sx={{ marginBottom: 0.5 }}>
        <InsertDriveFileIcon />
      </ListItemIcon>
      <TextField
        required
        variant="standard"
        id={`outlined-makelist-${label}-required`}
        label={label}
        value={xlsxName}
        onChange={setXlsxName}
        InputProps={{
          endAdornment: <InputAdornment position="end">.xlsx</InputAdornment>,
        }}
        fullWidth
        sx={{ paddingRight: 10 }}
      />
    </ListItem>
  );
};
