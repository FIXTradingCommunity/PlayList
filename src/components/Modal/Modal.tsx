import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import './modal.css'

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  display: "flex!important",
  flexDirection: "column!important",
  alignItems: "center!important",
};

export default function BasicModal({ showModal, handleClose, title, message, cleanApp }: any) {
  return (
      <Modal
        open={showModal}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            {title}
          </Typography>
          <Typography id="modal-modal-description" style={{textAlign: "center"}} sx={{ mt: 2 }}>
            {message}
          </Typography>
          <Button className="closeModalButton" onClick={() => {
              handleClose();
              title === "Bad XML File" && cleanApp();
            }
          }>Ok</Button>
        </Box>
      </Modal>
  );
}