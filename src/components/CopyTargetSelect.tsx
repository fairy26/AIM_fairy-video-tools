import React from 'react';

import { Autocomplete, TextField } from '@mui/material';

type Props = {
  label: string;
  select: string;
  except: string;
  options: string[];
  handleChange: any;
  disabled: boolean;
};

export const CopyTargetSelect: React.VFC<Props> = ({
  label,
  select,
  except,
  options,
  handleChange,
  disabled,
}) => {
  return (
    <Autocomplete
      disablePortal
      id={label}
      value={select}
      onChange={handleChange}
      options={options}
      getOptionDisabled={(option) => option === 'empty' || option === except}
      renderInput={(params) => <TextField {...params} label={label} />}
      disabled={disabled}
    />
  );
};
