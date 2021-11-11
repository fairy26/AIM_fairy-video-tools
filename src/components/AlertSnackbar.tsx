import React from 'react';

import { Alert, Snackbar } from '@mui/material';
import { useFunctions } from './MainProvider';

export const AlertSnackbar: React.VFC = () => {
  const { snackbarOpen, handleSnackbarClose, snackbarMessage } = useFunctions();

  return (
    <Snackbar
      key={snackbarMessage}
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
