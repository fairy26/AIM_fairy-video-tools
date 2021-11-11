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
  const { inst, setInst, room, setRoom } = useFunctions();

  return (
    <ListItem sx={{ display: 'flex', alignItems: 'flex-end', paddingLeft: 6 }}>
      <ListItemIcon sx={{ marginBottom: 0.5 }}>
        {[<LocationCityIcon />, <MeetingRoomIcon />][index]}
      </ListItemIcon>
      <TextField
        required
        variant="standard"
        id="outlined-ReorderTwoTonerequired"
        label={label}
        value={[inst, room][index]}
        onChange={[setInst, setRoom][index]}
        fullWidth
        sx={{ paddingRight: 10 }}
      />
    </ListItem>
  );
};
