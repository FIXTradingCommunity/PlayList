import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import Avatar from '@material-ui/core/Avatar';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import ListItemText from '@material-ui/core/ListItemText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import { blue } from '@material-ui/core/colors';
import "./index.css";
import { FixStandardFile, GitStandardFile } from './types';
import { getFileList, readXMLfromURL } from './helpers';


const useStyles = makeStyles({
  avatar: {
    backgroundColor: blue[100],
    color: blue[600],
  },
});

export interface StandardFileProps {
  open: boolean;
  selectedValue: string,
  onClose: (value: string) => void;
  fixStandardFiles: any;
  handleCancel: any;
}

function StandardFile(props: StandardFileProps) {
  const classes = useStyles();
  const { onClose, selectedValue, open, handleCancel, fixStandardFiles } = props; 
  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value: any, e: any) => {
    e.stopPropagation();
    onClose(value);
  };
    
  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
      <DialogTitle id="simple-dialog-title">Select FIX Standard File</DialogTitle>
      <List>
        {fixStandardFiles && fixStandardFiles.map((file: any) => (
          <ListItem button onClick={(e) => handleListItemClick(file, e)} key={file.name}>
            <ListItemAvatar>
              <Avatar className={classes.avatar}>
                <AttachFileIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={file.name} />
          </ListItem>
        ))}
      </List>
      <Button onClick={handleCancel} variant="contained">Cancel</Button>
    </Dialog>
  );
}

export default function StandardFileButton(props: any) {
  const [open, setOpen] = React.useState(false);
  const [fixStandardFiles, setFixStandardFiles] = React.useState<any>(null);
  React.useEffect(() => {
    const fetchData = async () => {
      const data: GitStandardFile[] = await getFileList();
      const filteredData = data && data.filter((e: GitStandardFile) => !(e.name === "Readme.md" || e.name === "pom.xml"));
      setFixStandardFiles(filteredData);
    }
    fetchData();
  }, []);
  
  const fixOnClick = async (fileObject: any): Promise<any> => { 
    const file: FixStandardFile = await readXMLfromURL(fileObject)
    props.onChange([file]);
  }

  const handleClickOpen = (e: any) => {
    e.stopPropagation();    
    setOpen(true);
  };
  
  
  const handleClose = (value: any) => {
    if (value) fixOnClick(value)
    setOpen(false);
  };

  const handleCancel = (e: any) => {
     e.stopPropagation();
    setOpen(false);
  }
  
  return (
    <div onClick={handleClickOpen} className="chooseFileButton fixFileButton">
        FIX Standard
      <StandardFile selectedValue={""} open={open} handleCancel={handleCancel} onClose={handleClose} fixStandardFiles={fixStandardFiles} />
    </div>
  );
}