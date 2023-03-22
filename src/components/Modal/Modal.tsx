import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import './modal.css'

const boxStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  display: "flex!important",
  flexDirection: "column!important",
  alignItems: "center!important",
  width: "auto",
  maxHeight: "550px"
};

const getYypographyStyle = (width: string): object => ({
  textAlign: "center",
  overflow: "auto",
  width,
})

interface IProps {
  showModal: boolean;
  myHandleClose: any;
  title: string;
  message: string | string[];
  cleanAppFunction?: Function;
  activeCleanApp?: boolean;
  alternativeMessage?: string;
}

export default function BasicModal({ 
  showModal,
  myHandleClose, 
  title, 
  message, 
  cleanAppFunction=()=>{}, 
  activeCleanApp=false, 
  alternativeMessage 
}: IProps) {
  const handleClose = (event: any, reason: any) => {
    console.log("reason", reason)
    if (reason && (reason === "backdropClick" || reason === "escapeKeyDown")) 
        return;
    myHandleClose();
}
  return (
      <Modal
        open={showModal}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={boxStyle}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            {title}
          </Typography>
          <Typography id="modal-modal-description" style={getYypographyStyle(typeof message === "string" ? "200xp" : "max-content")} sx={{ mt: 2 }} component="span">
            {typeof message === "string" ? message : message.map((m:string) => (<p key={m}>{m}</p>))}
          </Typography>
          <Button className="closeModalButton" onClick={() => {
              myHandleClose();
              activeCleanApp && cleanAppFunction();
            }
          }>Ok</Button>
          {alternativeMessage && (<p className="alternativeMessageWrapper">{alternativeMessage}</p>)}
        </Box>
      </Modal>
  );
}