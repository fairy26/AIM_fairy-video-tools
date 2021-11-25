import React, { useState } from 'react';

import { Alert, AlertTitle, Box, Paper, Tab } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Subject as SubjectIcon, ErrorOutline as ErrorOutlineIcon } from '@mui/icons-material';

import { Logger } from './Logger';
import { useFunctions } from './MainProvider';

export const OutputTabs: React.FC = () => {
  const { logs, errorFiles, pyError } = useFunctions();

  const [tabValue, setTabValue] = useState<string>('1');
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ display: !logs.length && 'none' }}>
      <TabContext value={tabValue}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList onChange={handleTabChange}>
            <Tab icon={<SubjectIcon />} value="1" />
            <Tab icon={<ErrorOutlineIcon />} value="2" />
          </TabList>
        </Box>
        <TabPanel value="1">
          <Paper variant="outlined">
            <Logger contents={logs} />
          </Paper>
        </TabPanel>
        <TabPanel value="2">
          <Alert
            severity="warning"
            sx={{ mb: pyError && 3, display: !errorFiles.length && 'none' }}
          >
            <AlertTitle>名前が適切でない動画が検出されました</AlertTitle>
            <Logger contents={errorFiles} />
          </Alert>
          <Alert severity="error" sx={{ display: pyError === '' && 'none' }}>
            <AlertTitle>内部処理でエラーが発生しました</AlertTitle>
            {pyError}
          </Alert>
        </TabPanel>
      </TabContext>
    </Box>
  );
};
