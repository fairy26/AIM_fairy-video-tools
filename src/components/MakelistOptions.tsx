import React from 'react';

import { InputAdornment, ListItem, ListItemIcon, TextField } from '@mui/material';
import { InsertDriveFile as InsertDriveFileIcon } from '@mui/icons-material';

import { useFunctions } from './MainProvider';

type Props = {
  label: string;
};

export const MakelistOptinos: React.VFC<Props> = ({ label }) => {
  const { showProgress, xlsxName, setXlsxName, xlsxNameError } = useFunctions();

  return (
    <ListItem
      disabled={showProgress}
      sx={{ display: 'flex', alignItems: 'flex-start', paddingLeft: 6 }}
    >
      <ListItemIcon sx={{ marginTop: 2 }}>
        <InsertDriveFileIcon />
      </ListItemIcon>
      <TextField
        required
        disabled={showProgress}
        error={xlsxNameError}
        helperText={
          xlsxNameError && (xlsxName ? '使えない文字が含まれています' : '入力してください')
        }
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
