import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import "./index.css";

export default function CircularIndeterminate() {
  return (
    <Box className="circularWrapper" sx={{ display: 'flex' }}>
      <CircularProgress disableShrink />
    </Box>
  );
}