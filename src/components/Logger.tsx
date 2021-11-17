import React, { useRef, useEffect } from 'react';

import { Box, List, ListItemText } from '@mui/material';

type Props = {
  contents: string[];
};

export const Logger: React.FC<Props> = ({ contents }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [contents]);

  return (
    <Box ref={scrollRef} sx={{ maxHeight: 270, flexGrow: 1, overflowY: 'auto' }}>
      <List dense sx={{ paddingX: 2 }}>
        {contents.map((line: string, index: number) => (
          <ListItemText key={`${line}_${index}`} primary={line} />
        ))}
      </List>
    </Box>
  );
};
