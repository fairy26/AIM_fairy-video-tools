import React from 'react';

import { ListItem, ListItemIcon, TextField } from '@mui/material';
import { DriveFolderUploadRounded as DriveFolderUploadRoundedIcon } from '@mui/icons-material';

import { useFunctions } from './MainProvider';

type Props = {
  label: string;
};

export const NasOption: React.VFC<Props> = ({ label }) => {
  const { showProgress, xlsxName, setXlsxName, xlsxNameError } = useFunctions();

  return (
    <ListItem
      disabled={showProgress}
      sx={{ display: 'flex', alignItems: 'flex-start', paddingLeft: 6 }}
    >
      <ListItemIcon sx={{ marginTop: 2 }}>
        <DriveFolderUploadRoundedIcon />
      </ListItemIcon>
      <TextField
        required
        disabled={showProgress}
        error={xlsxNameError}
        helperText={
          xlsxNameError
            ? xlsxName
              ? '使えない文字が含まれています'
              : '入力してください'
            : '※Excelファイル名と同一になります'
        }
        variant="standard"
        id={`outlined-nas-${label}-required`}
        label={label}
        value={xlsxName}
        onChange={setXlsxName}
        fullWidth
        sx={{ paddingRight: 10 }}
      />
    </ListItem>
  );
};
