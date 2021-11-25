import React from 'react';

import { List, ListItemIcon, ListItemText, ListItemButton, Switch } from '@mui/material';
import {
  Backup as BackupIcon,
  Movie as MovieIcon,
  Reorder as ReorderIcon,
  ViewList as ViewListIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';

import { useFunctions } from './MainProvider';
import { ReorderOption } from './PreorderOptions';
import { MakelistOption } from './MakelistOptions';
import { NasOption } from './NasOption';

export const PreOptions = () => {
  const {
    showProgress,
    reorder,
    toggleReorder,
    precheck,
    togglePrecheck,
    makelist,
    toggleMakelist,
    nas,
    toggleNas,
    optionsOpen,
    toggleOptionsOpen,
  } = useFunctions();

  return (
    <List>
      <ListItemButton onClick={toggleOptionsOpen}>
        <ListItemText
          primary="Options"
          primaryTypographyProps={{ color: 'primary', variant: 'subtitle1' }}
        />
        <KeyboardArrowDownIcon
          sx={{
            mr: -1,
            transform: optionsOpen ? 'rotate(-180deg)' : 'rotate(0)',
            transition: '0.2s',
          }}
        />
      </ListItemButton>

      {optionsOpen && (
        <>
          <ListItemButton onClick={toggleReorder} disabled={showProgress}>
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

          <ListItemButton onClick={togglePrecheck} disabled={showProgress}>
            <ListItemIcon>
              <MovieIcon />
            </ListItemIcon>
            <ListItemText primary="precheck動画を作成する" />

            <Switch checked={precheck} />
          </ListItemButton>

          <ListItemButton onClick={toggleMakelist} disabled={showProgress}>
            <ListItemIcon>
              <ViewListIcon />
            </ListItemIcon>
            <ListItemText primary="Excelを作成する" />

            <Switch checked={makelist} />
          </ListItemButton>
          {makelist && <MakelistOption key={'input_makelist'} label="ファイル名" />}

          <ListItemButton onClick={toggleNas} disabled={showProgress}>
            <ListItemIcon>
              <BackupIcon />
            </ListItemIcon>
            <ListItemText primary="NASにアップロードする" />

            <Switch checked={nas} />
          </ListItemButton>
          {nas && <NasOption key={'input_nas'} label="フォルダ名" />}
        </>
      )}
    </List>
  );
};
