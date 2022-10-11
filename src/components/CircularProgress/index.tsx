import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import "./index.css";

const CircularIndeterminate = ({showCircular}: {showCircular: boolean}) => {
  const isSafari = () => !!navigator.userAgent && !navigator.userAgent.match(/Chrome|Firefox|edg|opr/) && navigator.userAgent.match(/Safari/)
     
  return (
    <Box className={showCircular ? "circularWrapper" : ""} sx={{ display: 'flex' }}>
      {showCircular && (isSafari() ? <div className="waitTextWrapper">Please wait</div> : <CircularProgress disableShrink />)}
    </Box>
  );
  }

  export default CircularIndeterminate;
  