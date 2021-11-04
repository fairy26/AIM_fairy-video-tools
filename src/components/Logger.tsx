import React from 'react';

import { Box, List, ListItemText, Paper } from '@mui/material';

import { useFunctions } from './MainProvider';

export const Logger: React.VFC = () => {
  const { logs } = useFunctions();
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length) {
    return (
      <Paper variant="outlined" sx={{ mt: 2 }}>
        <Box ref={scrollRef} sx={{ maxHeight: 270, flexGrow: 1, overflowY: 'auto' }}>
          <List dense sx={{ paddingX: 2 }}>
            {logs.map((line: string) => (
              <ListItemText key={line} primary={line} />
            ))}
          </List>
        </Box>
      </Paper>
    );
  } else {
    return <></>;
  }
};
