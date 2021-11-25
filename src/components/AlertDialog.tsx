import React, { useEffect, useState } from 'react';

import { Button, Dialog, DialogActions, DialogContent, DialogContentText } from '@mui/material';
import { useFunctions } from './MainProvider';

export const AlertDialog: React.VFC = () => {
  const { alertDialogContent, setAlertDialogContent, handleCopy, progressOff } = useFunctions();

  const [alertDialogOpen, setAlertDialogOpen] = useState<boolean>(false);

  const handleAlertDialogClose = () => {
    setAlertDialogOpen(false);
    setAlertDialogContent('');
  };

  const handleAgree = () => {
    handleCopy(true);
    handleAlertDialogClose();
  };

  const handleDisagree = () => {
    progressOff(true);
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
