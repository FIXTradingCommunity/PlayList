/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import React, { Component } from 'react';
import { version } from '../../package.json';
import logo from '../assets/FIXorchestraLogo.png';
import './app.css';
import FileInput from './FileInput/FileInput';
import ProgressBar from './ProgressBar/ProgressBar';
import Playlist from '../lib/playlist';
import convert from 'xml-js';
import CheckboxTree from 'react-checkbox-tree';
import Utility from '../lib/utility';
import TextField from '@material-ui/core/TextField';

const currentYear = new Date().getFullYear();

export default class App extends Component {
  public static readonly rightsMsg: string = `© Copyright ${currentYear}, FIX Protocol Ltd.`;

  public state = {
    orchestraFileNameError: '',
    referenceFileError: '',
    showAlerts: false,
    readingFile: false,
    creatingFile: false,
    treeData: [],
    checkedTreeState: [],
    expandedTreeState: []
  };
  private referenceFile: File | undefined = undefined;
  private orchestraFileName: string | undefined = 'myorchestra.xml';
  private inputProgress: HTMLElement | undefined = undefined;
  private outputProgress: HTMLElement | undefined = undefined;
  private alertMsg: string = '';

  public render() {
    return (
      <div className="App">
        <div className="App-header container">
          <div className="titleContainer">
            <h1>FIX Playlist</h1>
            <h3 className="subTitle">Creates a subset of an Orchestra file</h3>
          </div>
          <img src={logo} className="App-logo" alt="FIX Orchestra" />
        </div>
        <div className="contentContainer container">
          <div className="form">
            <h2>Input</h2>
            <div className="inputsContainer">
              <div className="field">
                <FileInput
                  label="Reference Orchestra file"
                  accept=".xml"
                  onChange={this.inputOrchestra}
                  ref={this.setInputFileBarRef as () => {}}
                  error={this.state.referenceFileError}
                  clearError={() => {
                    this.setState({ referenceFileError: "", showAlerts: false })
                  }}
                />
              </div>
              <button className="clearFieldsButton" onClick={this.handleClearFields}>
                Clear Field
              </button>
            </div>
            {this.state.showAlerts && (
              <div className="errorContainer">
                <h4>{`Your input orchestra file ${
                  this.referenceFile && `named '${this.referenceFile.name}'`
                } is invalid or empty`}</h4>
                <textarea
                  readOnly={true}
                  className="errorMessage"
                  value={this.alertMsg}
                ></textarea>
              </div>
            )}
            <div className="buttonsContainer">
              <button
                type="button"
                className="submitButton"
                onClick={() => this.readOrchestra()}
                disabled={!this.referenceFile || this.state.readingFile}
              >
                {this.state.readingFile ? 'Loading...' : 'Read Orchestra file'}
              </button>
            </div>
          </div>
          {this.state.treeData.length > 0 && (
            <> 
              <div className="treeContainer">
                <h2>Select Your Content</h2>
                <CheckboxTree
                  checkModel="all"
                  nodes={this.state.treeData}
                  icons={{
                    expandClose: <div className={'icon'}>+</div>,
                    expandOpen: <div className={'icon'}>-</div>
                  }}
                  iconsClass="fa5"
                  checked={this.state.checkedTreeState}
                  expanded={this.state.expandedTreeState}
                  onCheck={(checked) => this.setState({
                    ...this.state,
                    checkedTreeState: checked
                  })}
                  onExpand={(expanded) => this.setState({
                    ...this.state,
                    expandedTreeState: expanded
                  })}
                />
              </div>
              <div className="outputContainer">
                <div className="field">
                  <TextField
                    label="Orchestra file to create (*.xml)"
                    type="text"
                    variant={"outlined"}
                    defaultValue={this.orchestraFileName}
                    InputProps={{
                      classes: {
                        focused: "textField-focused",
                      }}
                    }
                    InputLabelProps={{
                      classes: {
                        focused: "textField-label-focused"
                      },
                      shrink: true,
                    }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.outputOrchestra(e.target.value)}
                    error={!!this.state.orchestraFileNameError}
                    helperText={this.state.orchestraFileNameError}
                  />
                </div>
                <div className='buttonsContainer'>
                  <button
                    type="button"
                    className="submitButton"
                    onClick={() => this.createOrchestra()}
                    disabled={
                      this.state.showAlerts ||
                      Boolean(this.state.orchestraFileNameError) ||
                      Boolean(this.state.referenceFileError) ||
                      this.state.checkedTreeState.length === 0
                    }
                  >
                    {
                      this.state.creatingFile ? "Loading..." : "Create Orchestra file"
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        <ProgressBar ref={this.setOutputFileBarRef as () => {}} />
        </div>
        <footer className="container">
          <p>Version {version}</p>
          <p>{App.rightsMsg}</p>
        </footer>
      </div>
    );
  }

  private handleClearFields() {
    if (this.referenceFile) {
      this.referenceFile = undefined;
    }
    if (this.orchestraFileName) {
      this.orchestraFileName = "";
    }
    if (this.inputProgress instanceof FileInput) {
      this.inputProgress.clear();
    }
    this.setState({ showAlerts: false });
  };

  private inputOrchestra = (fileList: FileList | null): void => {
    if (fileList && fileList.length > 0) {
      this.referenceFile = fileList[0];
    }
  };

  private outputOrchestra = (fileName: string | undefined): void => {
    if (this.state.orchestraFileNameError) {
      this.setState({
        orchestraFileNameError: ""
      })
    }
    this.orchestraFileName = fileName;
  };

  private setInputFileBarRef = (instance: HTMLDivElement): void => {
    this.inputProgress = instance;
  };

  private setOutputFileBarRef = (instance: HTMLDivElement): void => {
    this.outputProgress = instance;
  };

  private showProgress(progressNode: HTMLElement, percent: number): void {
    if (percent >= 0) {
      if (
        progressNode instanceof FileInput ||
        progressNode instanceof ProgressBar
      ) {
        progressNode.setProgress(percent);
      }
    } else if (progressNode.style) {
      progressNode.style.backgroundColor = 'red';
    }
    if (progressNode.parentElement) {
      progressNode.parentElement.style.visibility = 'visible';
    }
  };

  private async readOrchestra(): Promise<void> {
    if (this.referenceFile && this.inputProgress && this.outputProgress) {
      this.setState({ showAlerts: false, readingFile: true });
      const runner: Playlist = new Playlist(
        this.referenceFile,
        this.inputProgress,
        this.outputProgress,
        this.showProgress
      );
      try {
        // read local reference Orchestra file
        await runner.runReader();

        const jsonDom = convert.xml2js(runner.dom);
        const tree = Utility.mapOrchestraDom(jsonDom.elements[0].elements);
        this.setState({ treeData: tree });
      } catch (error) {
        if (error) {
          this.alertMsg = error;
        }
        this.setState({ showAlerts: true, readingFile: false });
      }
    } else {
      this.setState({ readingFile: false });

      if (!this.referenceFile) {
        this.setState({ ReferenceFileError: 'Reference Orchestra file not selected' });
      }
    }
  }

  private createOrchestra(): void {
    this.setState({ creatingFile: true });
    if (this.outputProgress instanceof ProgressBar) {
      this.outputProgress.setProgress(100);
    }
  }
}
