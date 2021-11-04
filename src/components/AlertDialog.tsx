import React, { useEffect, useState } from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText } from '@mui/material';
import { useFunctions } from './MainProvider';

type Props = {
  source: string;
  destination: string;
};

export const AlertDialog: React.VFC<Props> = ({ source, destination }) => {
  const { alertDialogContent, setAlertDialogContent, handleCopyFormat, progressOff } =
    useFunctions();

  const [alertDialogOpen, setAlertDialogOpen] = useState<boolean>(false);

  const handleAlertDialogClose = () => {
    setAlertDialogOpen(false);
    setAlertDialogContent('');
  };

  const handleAgree = () => {
    handleCopyFormat(source, destination);
    handleAlertDialogClose();
  };

  const handleDisagree = () => {
    progressOff();
    handleAlertDialogClose();
  };

  useEffect(() => {
    alertDialogContent && setAlertDialogOpen(true);
  }, [alertDialogContent]);

  const YesButton = (
    <Button variant="outlined" onClick={handleAgree}>
      はい
    </Button>
  );
  const CancelButton = (
    <Button variant="outlined" onClick={handleDisagree} autoFocus color="error">
      キャンセル
    </Button>
  );

  return (
    <Dialog
      open={alertDialogOpen}
      onClose={handleDisagree}
      aria-describedby="alert-dialog-description"
    >
      <DialogContent>
        <DialogContentText id="alert-dialog-description">{alertDialogContent}</DialogContentText>
      </DialogContent>
      <DialogActions>
        {YesButton}
        {CancelButton}
      </DialogActions>
    </Dialog>
  );
};
