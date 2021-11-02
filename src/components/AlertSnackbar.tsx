import React from 'react';

import { Alert, Snackbar } from '@mui/material';
import { useDeviceStragesFunctions } from './DeviceStragesProvider';

export const AlertSnackbar: React.VFC = () => {
  const { snackbarOpen, handleSnackbarClose, snackbarMessage } = useDeviceStragesFunctions();

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={snackbarOpen}
      autoHideDuration={3000}
      onClose={handleSnackbarClose}
    >
      <Alert onClose={handleSnackbarClose} severity="error">
        {snackbarMessage}
      </Alert>
    </Snackbar>
  );
};
