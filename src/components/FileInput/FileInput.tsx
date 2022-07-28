import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import ProgressCircle from "../ProgressCircle/ProgressCircle";
import StandardFileButton from '../StandardFilesButton';
import InputButton from '../InputButton';
import "./fileInput.css";

interface Props {
  label: string;
  accept?: HTMLInputElement['accept'];
  multiple?: boolean;
  disableButton: boolean;
  onChange: (files: FileList, isConfigFile: boolean) => void;
  error?: string;
  clearError?: () => void;
  clearFields: () => void;
}

class FileInput extends Component<Props> {

  public state = {
    fileName: "",
    pct: 0,
    isConfigFile: false,
  }

  public render() {
    const { label, accept, multiple = false, disableButton, error } = this.props;
    const { pct, fileName } = this.state;

    return (
      <div className="fileInput">
        <p className="inputLabel">{label}</p>
  
        <Dropzone onDrop={this.onDrop as () => {}} multiple={multiple}>
          {({ getRootProps, getInputProps, isDragActive, draggedFiles }) => {
            
            const isValidFileType = this.isValidType(draggedFiles[0]);
            const fileType = draggedFiles[0] && draggedFiles[0].type.split("/")[1]

            return (
              <div {...getRootProps()}>
                <input
                  {...getInputProps({
                    onChange: this.onChange
                  })}
                  accept={accept}
                  multiple={multiple}
                />
                <div className={`inputBox ${isDragActive ? "dragActive" : ""} ${(!isValidFileType && isDragActive) || error  ? "inputBoxError" : ""}`}>
                  {
                    isDragActive ?
                      <>
                        <ProgressCircle value={pct} />
                        <div>
                          {
                            isValidFileType ?
                            <p className="inputText">Drop your Reference Orchestra file here</p> :
                            <p className="inputText inputTextError">{fileType || "This file type" } is not allowed</p>
                          }
                        </div>
                      </>
                      :
                      <>
                        <ProgressCircle value={pct} />
                        <div className="inputContent">
                          <p className="inputText">Drag file to read or</p>
                          {/* <div className="chooseFileButton">Choose File{multiple ? "s" : ""}</div> */}
                          <InputButton 
                            onChange={this.changeReferenceFile}
                            disableButton={false}
                            buttonStyle={"chooseGenericFileButton"}
                            buttonTitle={`Choose File${multiple ? "s" : ""}`}
                            titleAttributes={"Orchestra file required as source of messages and elements to be selected"}
                          />
                          <StandardFileButton onChange={this.standardFileChange}/>
                          <InputButton 
                            onChange={this.changeConfigFile}
                            disableButton={disableButton}
                            buttonStyle={"configFileFieldsButton"}
                            buttonTitle={"Use Selector File"}
                            titleAttributes={"Optional Orchestra file to pre-select a subset of the source file, subject to subsequent changes"}
                          />
                        </div>
                        { !error && <p className="fileName">{fileName}</p>}
                        { error && <p className="fileName inputTextError">{error}</p> }
                      </>
                  }
                </div>
              </div>
            )
          }}
        </Dropzone>
      </div>
    )

  }

  public changeConfigFile = () => {
    this.setState({
      isConfigFile: true,
    })
  }

  public changeReferenceFile = () => {
    this.setState({
      isConfigFile: false,
    })
  }

  public standardFileChange = (files: FileList) => {
    this.props.clearFields();
    this.setState({
      isConfigFile: false,
    })
    this.handleChange(files as FileList);
  }

  public isValidType = (file: File | undefined) => {
    const acceptedType = this.props.accept && this.props.accept.replace(".", "");
    const fileType = file && file.type.split("/")[1];

    if (!file || !acceptedType || (!fileType && !acceptedType)) { return true; }
    
    return acceptedType === fileType
  }

  public onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files && e.target.files;

    if (this.props.clearError) {
      this.props.clearError();
    }
    if (!this.state.isConfigFile) {
      this.props.clearFields();
    }
    this.handleChange(files as FileList);
  };

  public handleChange = (files: FileList) => {

    const filesArray = new Array(...files);

    const areFilesValid = filesArray.every(f => this.isValidType(f));

    if (!areFilesValid) {
      return;
    }

    if (files.length > 1) {
      this.setState({
        fileName: `${files.length} files loaded`
      })
    } else {
      !this.state.isConfigFile &&
      this.setState({
        fileName: files[0] ? files[0].name : ""
      })
    }
    this.props.onChange(files, this.state.isConfigFile);
  }

  public setProgress = (value: number) => {
    this.setState({
      pct: value
    })
  };

  public clear = () => {
    this.setState({
      fileName: "",
      pct: 0,
      isConfigFile: false,
    })
  }

  private onDrop = (acceptedFiles: FileList) => {
    this.handleChange(acceptedFiles)
  };
}

export default FileInput;