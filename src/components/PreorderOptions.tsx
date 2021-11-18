import React from 'react';

import { ListItem, ListItemIcon, TextField } from '@mui/material';
import {
  LocationCity as LocationCityIcon,
  MeetingRoom as MeetingRoomIcon,
} from '@mui/icons-material';

import { useFunctions } from './MainProvider';

type Props = {
  label: string;
  index: number;
};

export const ReorderOption: React.VFC<Props> = ({ label, index }) => {
  const { showProgress, inst, setInst, instError, room, setRoom, roomError } = useFunctions();

  return (
    <ListItem
      disabled={showProgress}
      sx={{ display: 'flex', alignItems: 'flex-start', paddingLeft: 6 }}
    >
      <ListItemIcon sx={{ marginTop: 2 }}>
        {[<LocationCityIcon />, <MeetingRoomIcon />][index]}
      </ListItemIcon>
      <TextField
        required
        disabled={showProgress}
        error={[instError, roomError][index]}
        helperText={
          [instError, roomError][index] &&
          ([inst, room][index] ? '使えない文字が含まれています' : '入力してください')
        }
        variant="standard"
        id={`outlined-reorder-${label}-required`}
        label={label}
        value={[inst, room][index]}
        onChange={[setInst, setRoom][index]}
        fullWidth
        sx={{ paddingRight: 10 }}
      />
    </ListItem>
  );
};
