import React from 'react';

import { List, ListItemIcon, ListItemText, ListItemButton, Switch } from '@mui/material';
import {
  Backup as BackupIcon,
  Movie as MovieIcon,
  Reorder as ReorderIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';

import { useFunctions } from './MainProvider';
import { ReorderOption } from './PreorderOptions';
import { MakelistOptinos } from './MakelistOptions';

export const PreOptions = () => {
  const {
    reorder,
    toggleReorder,
    precheck,
    togglePrecheck,
    makelist,
    toggleMakelist,
    nas,
    toggleNas,
  } = useFunctions();

  return (
    <List>
      <ListItemButton onClick={toggleReorder}>
        <ListItemIcon>
          <ReorderIcon />
        </ListItemIcon>
        <ListItemText primary="HDDを整理する" />

        <Switch checked={reorder} />
      </ListItemButton>
      {reorder &&
        ['施設名', '部屋番号'].map((label, index) => (
          <ReorderOption key={`input_reorder_${index}`} {...{ label, index }} />
        ))}

      <ListItemButton onClick={togglePrecheck}>
        <ListItemIcon>
          <MovieIcon />
        </ListItemIcon>
        <ListItemText primary="precheck動画を作成する" />

        <Switch checked={precheck} />
      </ListItemButton>

      <ListItemButton onClick={toggleMakelist}>
        <ListItemIcon>
          <ViewListIcon />
        </ListItemIcon>
        <ListItemText primary="Excelを作成する" />

        <Switch checked={makelist} />
      </ListItemButton>
      {makelist && <MakelistOptinos key={'input_makelist'} label="ファイル名" />}

      <ListItemButton onClick={toggleNas}>
        <ListItemIcon>
          <BackupIcon />
        </ListItemIcon>
        <ListItemText primary="NASにアップロードする" />

        <Switch checked={nas} />
      </ListItemButton>
    </List>
  );
};
