/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import React, { Component } from 'react';
import { version } from '../../package.json';
import logo from '../assets/FIXorchestraLogo.png';
import './app.css';
import FileInput from './FileInput/FileInput';
import CheckboxTree from 'react-checkbox-tree';

const currentYear = new Date().getFullYear();

export default class App extends Component {
  public static readonly rightsMsg: string = `© Copyright ${currentYear}, FIX Protocol Ltd.`;

  public state = {
    orchestraFileNameError: '',
    referenceFileError: '',
    showAlerts: false,
    readingFile: false,
    treeData: [],
    treeState: {
      checked: [],
      expanded: [],
    },
  };
  private referenceFile: File | undefined = undefined;
  private orchestraFileName: string | undefined = 'myorchestra.xml';
  private inputProgress: HTMLElement | undefined = undefined;
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
                    this.setState({ referenceFileError: "", showAlerts: false }) //make sure it is false and not ""
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
                // onClick={() => this.readOrchestra()}
                disabled={!this.referenceFile || this.state.readingFile}
              >
                {this.state.readingFile ? 'Loading...' : 'Read Orchestra file'}
              </button>
            </div>
            <output id="output"></output>
          </div>
          {this.state.treeData && this.state.treeData.length ? (
            <div className="treeContainer">
              <h2>Tree Control</h2>
              <CheckboxTree
                checkModel="all"
                nodes={this.state.treeData}
                icons={{
                  expandClose: <span className={'icon'}>+</span>,
                  expandOpen: <span className={'icon'}>-</span>,
                }}
                iconsClass="fa5"
                checked={this.state.treeState.checked}
                expanded={this.state.treeState.expanded}
                onCheck={(checked) => this.setState({ treeState: { checked } })}
                onExpand={(expanded) => this.setState({ treeState: { expanded } })}
              />
            </div>
          ) : (
            <></>
          )}
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

  private setInputFileBarRef = (instance: HTMLDivElement): void => {
    this.inputProgress = instance;
  };
}
