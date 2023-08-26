/*!
 * Copyright 2021, FIX Protocol Ltd.
 */

import React, { Component } from 'react';
import { version } from '../../package.json';
import * as jwt from 'jsonwebtoken';
import * as QueryString from 'query-string';
import CheckboxTree from 'react-checkbox-tree';
import logo from '../assets/FIXorchestraLogo.png';
import './app.css';
import FileInput from './FileInput/FileInput';
import ResultsPage from './ResultsPage/ResultsPage';
import ProgressBar from './ProgressBar/ProgressBar';
import OrchestraFile from "../lib/OrchestraFile";
import Playlist from '../lib/playlist';
import SelectorFile from '../lib/selectorFile';
import Utility from '../lib/utility';
import TextField from '@material-ui/core/TextField';
import BasicModal from './Modal/Modal';
import CircularIndeterminate from './CircularProgress';
import ErrorHandler from '../lib/ErrorHandler';

const splittedVersion = version.split('.');
const appVersion = `${splittedVersion[0]}.${splittedVersion[1]}${splittedVersion[2] ? `.${splittedVersion[2]}` : ""}`;
const currentYear = new Date().getFullYear();

interface INode {
  value: string;
  label: string;
  children?: INode[];
  className?: string;
};

export interface IDecodedUserData {
  at_hash: string;
  sub: string;
  firstname: string;
  Employer: string;
  "Zip/Postcode": string | null;
  iss: string;
  groups: string[] | null;
  Title: null;
  Website: null;
  "State/Region": string | null;
  "City": string | null;
  "Street Address 1": string | null;
  "Job Title": string | null;
  nonce: string | null;
  "Street Address 2": string | null;
  lastname: string;
  aud: string[];
  auth_time: string;
  Country: string | null;
  exp: number;
  iat: number;
  email: string;
}

interface IDecoded {
  exp?: number;
}

interface ErrorMsg {
  title: string,
  message: string
}

export interface State {
  orchestraFileNameError: string,
  referenceFileError: string,
  showAlerts: boolean,
  downloadHref: string,
  downloadUrl: string,
  readingFile: boolean,
  creatingFile: boolean,
  downloaded: boolean,
  results: any,
  showResults: boolean,
  authVerified: boolean,
  treeData: Array<any>,
  checkedTreeState: Array<string>,
  expandedTreeState: Array<string>,
  showModal: boolean,
  modalTitle: string,
  modalMessage: string,
  modalAlternativeMessage: string,
  activeCleanApp: boolean,
  showCircularProgress: boolean,
  isSelectorFile: boolean,
  checked: Array<string>,
  targetNode: any,
}

export default class App extends Component {
  public static readonly rightsMsg: string = `© Copyright ${currentYear}, FIX Protocol Ltd.`;

  public state: State = {
    orchestraFileNameError: '',
    referenceFileError: '',
    showAlerts: false,
    downloadHref: "",
    downloadUrl: "",
    readingFile: false,
    creatingFile: false,
    downloaded: false,
    results: undefined,
    showResults: false,
    authVerified: false,
    treeData: [],
    checkedTreeState: [],
    expandedTreeState: ["FieldsOut"],
    showModal: false,
    modalTitle: "",
    modalMessage: "",
    modalAlternativeMessage: "",
    activeCleanApp: false,
    showCircularProgress: false,
    isSelectorFile: false,
    checked: [],
    targetNode: "",
  };
  private referenceFile: File | undefined = undefined;
  private orchestraFileName: string | undefined = 'myorchestra.xml';
  private inputProgress: HTMLElement | undefined = undefined;
  private outputProgress: HTMLElement | undefined = undefined;
  private alertMsg: ErrorMsg = { title: "", message: "" };
  private playlist: Playlist | undefined = undefined;
  private errorHandler: ErrorHandler | undefined = undefined;

  private selectorFile: SelectorFile | undefined = undefined;
  private referenceSelectorFile: File | undefined = undefined;
  private inputConfigProgress: HTMLElement | undefined = undefined;

  constructor(props: {}) {
    super(props);
    window.addEventListener("offline", (event: any) => {
      this.setState({
        showModal: true,
        modalTitle: "Error Connection",
        modalMessage: "There is no Internet connection",
        activeCleanApp: false,
      });
    });
    window.onunhandledrejection = (event: any) => {
      this.errorHandler?.captureException(event)
      this.setState({
        showModal: true,
        modalTitle: "Unhandled Rejection",
        modalMessage: event?.reason ?? "",
        activeCleanApp: false,
      });;
    };
    this.errorHandler = ErrorHandler.getInstance();

  }

  checkTreeNodeStart(checked: Array<string>, targetNode: any) {
    this.setState({ showCircularProgress: true, checked, targetNode });
  }

  checkTreeNode = (checked: Array<string>, targetNode: any) => {
    const oldState = [...this.state.checkedTreeState];
    let added: any[] = [];
    let removed: any[] = [];
    if (targetNode?.parent?.className === "lastLeaf" || targetNode?.value.startsWith('codeset')) {
      if (targetNode?.checked) {
        added = checked.filter((x: string) => (!oldState.includes(x)));
      } else {
        if (targetNode.value.startsWith('group')) {
          const numInGroup = targetNode.parent.children.find((e: any) => e.value.includes('numInGroup'));
          removed = [targetNode.value, numInGroup?.value || ""];
        } else {
          removed = [targetNode.value];
        }
      }
    } else {
      if (targetNode?.checked) {
      added = checked.filter((x: string) => (!oldState.includes(x)));
      } else if (targetNode?.children) {
        removed = [...targetNode.children.map((x: any) => x.value), targetNode.value];
      } else {
        removed = [targetNode.value] // oldState.filter((y: string) => (!checked.includes(y)));
      }
    }

    if (this.playlist) {
      const runner = this.playlist;
      let updatedValues = !!added.length ? runner.checkValues(oldState, added) : runner.newUncheckValues(oldState, removed);
      if (removed.length) {
        updatedValues = runner.checkValues([...updatedValues.newCheckedList], [...updatedValues.newCheckedList]);
      }
      this.setState({
        showCircularProgress: false,
        treeData: updatedValues.newTree,
        checkedTreeState: [...updatedValues.newCheckedList],
        downloadHref: "",
        downloadUrl: "",
        results: undefined,
        showResults: false
      });
    }
  }
  public setErrorMessage = (modalTitle: string, modalMessage: string) => {
    this.setState({
      showModal: true,
      modalTitle,
      modalMessage,
      activeCleanApp: true,
    });
  }
  public render() {
    return (
      <div className="App">
        <CircularIndeterminate showCircular={this.state.showCircularProgress} />
        <BasicModal
          title={this.state.modalTitle}
          message={this.state.modalMessage}
          showModal={this.state.showModal}
          myHandleClose={() => this.setState({showModal: false})}
          cleanAppFunction={this.handleClearFields.bind(this)}
          activeCleanApp={this.state.activeCleanApp}
          alternativeMessage={this.state.modalAlternativeMessage}
        />
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
                  label="Source Orchestra file"
                  accept=".xml"
                  onChange={this.inputOrchestra}
                  disableButton={this.state.treeData.length === 0}
                  ref={this.setInputFileBarRef as () => {}}
                  error={this.state.referenceFileError}
                  clearError={() => {
                    this.setState({ referenceFileError: "", showAlerts: false })
                  }}
                  clearFields={this.handleClearFields.bind(this)}
                  setErrorMessage={this.setErrorMessage}
                />
                <div className="fieldsButtonContainers">
                  <button className="clearFieldsButton" onClick={this.handleClearFields.bind(this)}>
                    Clear Input File
                  </button>
                </div>
              </div>
              </div>
              <h2>Output</h2>
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
                    onClick={() => this.setState({ creatingFile: true }, () => this.createOrchestra())}
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
                  { this.state.downloadHref && <a
                      className="showResultsButton"
                      href={this.state.downloadHref}
                      download={this.orchestraFileName}
                      data-downloadurl={this.state.downloadUrl}
                      onClick={this.handleDownloadClick.bind(this)}
                    >
                      Download File
                    </a>
                  }
                </div>
              </div>
              <div className="buttonsWrapper">
                <div className="redirectButtonContainers">
                  <a
                    className="redirectButton"
                    href="https://www.fixtrading.org/standards/fix-orchestra/playlist-user-guide/"
                    rel="noreferrer noopener"
                    target="_blank"
                    >
                    User Guide
                  </a>
                </div>
                <div className="redirectButtonContainers">
                  <a
                    className="redirectButton"
                    href="http://fixprotocol.io/orchestratools/termsofservice.html"
                    rel="noreferrer noopener"
                    target="_blank"
                    >
                    Terms of Service
                  </a>
                </div>
              </div>
            {this.state.showAlerts && (
              <div className="errorContainer">
                <h4>{this.alertMsg.title}</h4>
                <textarea
                  readOnly={true}
                  className="errorMessage"
                  value={this.alertMsg.message}
                ></textarea>
              </div>
            )}
          </div>
          {!!this.state.treeData.length && (
            <>
              <div className="treeContainer">
                <h2 className="treeTitle" >Select Your Content</h2>
                <h3 className="treeReference">(All elements sorted alphabetically. Greyed out items are deprecated)</h3>
                <div className="tree">
                  <CheckboxTree
                    checkModel={'all'}
                    optimisticToggle={false}
                    nodes={this.state.treeData}
                    icons={{
                      expandClose: <div className={'icon'}>+</div>,
                      expandOpen: <div className={'icon'}>-</div>,
                      check: <span className="rct-icon rct-icon-check" />,
                    }}
                    iconsClass="fa5"
                    checked={[...this.state.checkedTreeState]}
                    expanded={this.state.expandedTreeState}
                    onCheck={(checked: Array<string>, targetNode: any) => {
                      this.checkTreeNodeStart(checked, targetNode)
                    }}
                    onExpand={(expanded) => this.setState({
                      expandedTreeState: expanded
                    })}
                  />
                </div>
              </div>
            </>
          )}
        <ProgressBar ref={this.setOutputFileBarRef as () => {}} />
        </div>
        <footer className="container">
          <p>Version {appVersion}</p>
          <p>{App.rightsMsg}</p>
        </footer>
        {
          this.state.showResults &&
          <ResultsPage
            results={this.state.results}
            onClose={this.closeResults}
            downloadButton={
              this.state.downloadHref ? <a
              className="submitButton downloadButton"
              href={this.state.downloadHref}
              download={this.orchestraFileName}
              data-downloadurl={this.state.downloadUrl}
              onClick={this.handleDownloadClick.bind(this)}
            >
              { this.state.downloaded ? "Downloaded" : "Download File"}
            </a> :
            <button className="submitButton closeResultsButton" onClick={this.closeResults}>
              Close Results
            </button>
            }
          />
        }
      </div>
    );
  }

  public componentDidUpdate(nextProps: any, nextState: any) {
    if (!this.state.authVerified) {
      return null
    }
    if (this.playlist?.duplicateValuesError?.length) {
      this.setState({
        showModal: true,
        modalTitle: "Duplicate Values in XML",
        modalMessage: this.playlist.duplicateValuesError,
        activeCleanApp: true,
        modalAlternativeMessage: "Note that this version of Playlist does not support scenarios.",
      });
      this.playlist.cleanDuplicateValuesError();
    }
    if (this.playlist?.parseXMLError && !this.state.showModal) {
      this.setState({
        showModal: true,
        modalTitle: "Bad XML File",
        modalMessage: this.playlist.parseXMLError,
        activeCleanApp: true,
      });
      this.playlist.cleanParseXMLError();
    }
    if (this.selectorFile?.lastCodesetItem) {
      this.setState({
        showModal: true,
        modalTitle: "Warning",
        modalMessage: "The last code of a code set cannot be removed. Instead, please remove the field(s) using this code set from messages, groups and/or components."
      });
      this.selectorFile.updateLastCodesetItem();
    }
    if (this.playlist?.lastCodesetItem) {
      this.setState({
        showModal: true,
        modalTitle: "Warning",
        modalMessage: "The last code of a code set cannot be removed. Instead, please remove the field(s) using this code set from messages, groups and/or components."
      });
      this.setState({showModal: true});
      this.playlist.updateLastCodesetItem();
    }
    if (this.state.showCircularProgress && !this.state.isSelectorFile) {
      setTimeout(() => {
        this.checkTreeNode(this.state.checked, this.state.targetNode);
      }, 100)
    }
    if (this.playlist && this.playlist.lastCodesetItem) {
      this.setState({showModal: true});
      this.playlist.updateLastCodesetItem();
    }
    const nodes: any = document.querySelectorAll(".rct-node-expanded");
    for(let i = 0; i < nodes.length; i++) {
      if (nodes[i]) {
        const doc2: any = nodes[i].querySelector(".rct-title")
        if (doc2 && doc2.innerText === 'CODESETS') {
          const allFirstCheckbox: any = nodes[i].querySelectorAll(".tree > div > ol > li > ol > li > .rct-text > label > input");
          for (let checkbox of allFirstCheckbox) {
            checkbox.disabled = true;
            checkbox.className="disabledCheckbox";
          }
        }
        if (doc2 && ['DATATYPES', 'FIELDS'].includes(doc2.innerText)) {
          const allFirstCheckbox: any = nodes[i].querySelectorAll(".tree > div > ol > li > ol > li > .rct-text > label > input");
          for (let checkbox of allFirstCheckbox) {
            checkbox.className="disabledCheckbox";
          }
        }
        if (doc2 && doc2.innerText === 'FIELDS') {
          const allFirstCheckbox: any = nodes[i].querySelectorAll(".tree > div > ol > li > ol > li > ol > li > .rct-text > label > input");
          for (let checkbox of allFirstCheckbox) {
            checkbox.className="disabledCheckbox";
          }
        }
      }
    }

    if (this.state.treeData.length > 0 && nextState.treeData.length === 0) {
      const allFirstCheckbox: any = document.querySelectorAll(".tree > div > ol > li > .rct-text > label > input");
      for (let checkbox of allFirstCheckbox) {
        checkbox.disabled = true;
        checkbox.className="disabledCheckbox";
      }
    }
  };

  public componentDidMount() {
    this.CheckAuthenticated();
  }

  public handleClearFields() {
    if (this.referenceFile) {
      this.referenceFile = undefined;
    }
    if (this.inputProgress instanceof FileInput) {
      this.inputProgress.clear();
    }
    this.setState({
      downloadHref: "",
      downloadUrl: "",
      results: undefined,
      showResults: false,
      showAlerts: false,
      checkedTreeState: [],
      expandedTreeState: ["FieldsOut"],
      treeData: [],
      activeCleanApp: false,
      modalTitle: "",
      modalMessage: "",
      modalAlternativeMessage: "",
    });
  };

  private inputOrchestra = (fileList: FileList | null, isSelectorFile: boolean): void => {
    if (fileList && fileList.length > 0) {
      if (isSelectorFile) {
        this.setState({ showCircularProgress: true, isSelectorFile: true })
        this.referenceSelectorFile = fileList[0];
      } else {
        this.referenceFile = fileList[0];
      }
    }
    isSelectorFile ? setTimeout(() => {
      this.readSelectorFileOrchestra()
    }, 1000)
    : this.readOrchestra();
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
    this.inputConfigProgress = instance;
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
     const standardHeaderTrailerPreSelected = [
      "component:1024-field:8->field:8",
      "component:1024-field:9->field:9",
      "component:1024-field:49->field:49",
      "component:1024-field:56->field:56",
      "component:1024-field:34->field:34",
      "component:1024-field:52->field:52",
      "component:1025-field:10->field:10",
    ];
    if (this.referenceFile && this.inputProgress && this.outputProgress) {
      this.setState({
        showAlerts: false,
        readingFile: true,
        downloadHref: "",
        downloadUrl: "",
        downloaded: false,
        results: undefined,
        showResults: false,
        checkedTreeState: [],
        expandedTreeState: ["FieldsOut"],
        showModal: false
      });
      const runner: Playlist = new Playlist(
        this.referenceFile,
        this.inputProgress,
        this.outputProgress,
        this.showProgress
        );
      this.playlist = runner;
      try {
        // read local reference Orchestra file
        const tree = await runner.runReader();
        this.setState({ treeData: tree });
      } catch (err) {
        const error = err as {name: string, message: string}
        this.errorHandler?.captureException(error);
        this.alertMsg = {
          title: this.getErrorTitle(error?.name ?? ""),
          message: this.setMessageError(error?.message ?? error)
        };
        this.setState({ showAlerts: true });
      }
    } else if (!this.referenceFile) {
      this.setState({ ReferenceFileError: 'Reference Orchestra file not selected' });
    }
    const updatedValues = this.playlist?.checkValues(this.state.checkedTreeState, standardHeaderTrailerPreSelected);
    this.setState({ readingFile: false, checkedTreeState: updatedValues?.newCheckedList || [] });
    // this.setState({ readingFile: false, checkedTreeState: [] });
  }

  private checkIfExistInTree = (tree: Array<INode>, checkedList: Array<string>): Array<string> => {
    const newCheckedList: Array<string> = [];
    for (let i = 0; i < checkedList.length; i++) {
      const value = checkedList[i];
      const exist = this.checkIfExistInTreeRecursive(tree, value);
      if (exist) {
        newCheckedList.push(value);
      }
    }
    return newCheckedList;
  }

  private checkIfExistInTreeRecursive = (tree: Array<INode>, value: string): boolean => {
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      if (value.startsWith("message:")) {
        if (value.includes(node.value)) return true; 
      } else {
        if (value === node.value) return true;
      }
      if (node.children) {
        const exist = this.checkIfExistInTreeRecursive(node.children, value);
        if (exist) {
          return true;
        }
      }
    }
    return false;
  }

  private async readSelectorFileOrchestra(): Promise<void> {
    if (this.referenceSelectorFile && this.inputConfigProgress && this.outputProgress) {
      const runner: SelectorFile = new SelectorFile(
        this.referenceSelectorFile,
        this.inputConfigProgress,
        this.outputProgress,
        this.showProgress
      );
    this.selectorFile = runner;
    try {
      // Read local config file.
      const selectorKeys = await runner.runReader();
      const filteredCheckedSelectorFileKeys = this.checkIfExistInTree(this.state.treeData, selectorKeys.newCheckedSelectorFileKeys);
      // Removing duplicated elements from the checked list.
      const dataArr = new Set([...filteredCheckedSelectorFileKeys, ...this.state.checkedTreeState]);
      const updatedValues = [...dataArr];
      this.setState({ readingFile: false, checkedTreeState: updatedValues || [], showCircularProgress: false, isSelectorFile: false });
      if (selectorKeys.newNumInGroupSelectorFileKeys.length) {
        const updatedNumInGroupValues = this.playlist?.checkValues(this.state.checkedTreeState, selectorKeys.newNumInGroupSelectorFileKeys);
        this.setState({ readingFile: false, checkedTreeState: updatedNumInGroupValues?.newCheckedList || [] });
      }
    } catch (err) {
      const error = err as {name: string, message: string}
      this.setState({ showCircularProgress: false, isSelectorFile: false })
      this.errorHandler?.captureException(error);
      this.alertMsg = {
        title: this.getErrorTitle(error?.name ?? ""),
        message: this.setMessageError(error?.message ?? error)
      };
      this.setState({ showAlerts: true });
    }
  }
}

  private openResults = () => {
    this.setState({
      showResults: true,
    });
  }
  private closeResults = () => {
    this.setState({
      showResults: false,
    });
  }

  private async createOrchestra(): Promise<void> {
    this.setState({
      creatingFile: true,
      showAlerts: false,
      readingFile: true,
      downloadHref: "",
      downloadUrl: "",
      downloaded: false,
      results: undefined,
      showResults: false
    });
    if (this.playlist && this.orchestraFileName) {
      const runner = this.playlist;
      try {
        // Uncomment this line when adding content to Modal
        runner.onFinish = this.handleReaderFinish;
        await runner.runCreator(this.orchestraFileName, this.state.checkedTreeState);


        if (this.outputProgress instanceof ProgressBar) {
          this.outputProgress.setProgress(0);
        }

      } catch (err) {
        const error = err as {name: string, message: string}
        this.errorHandler?.captureException(error);
        this.alertMsg = {
          title: this.getErrorTitle(error?.name ?? ""),
          message: this.setMessageError(error?.message ?? error)
        };

        this.setState({ showAlerts: true });
      }

      if (runner.contents) {
        this.createLink(runner.contents);
        this.openResults();
      }
    } else {
      this.setState({
        orchestraFileNameError: !this.orchestraFileName && "Orchestra file name not entered",
        referenceFileError: !this.referenceFile && !this.playlist && "FIX log file not selected",
      });
    }
    this.setState({ creatingFile: false });
  }


  private handleReaderFinish = (output: OrchestraFile) => {
    //return the values from the statistics dictionary
    this.setState({
      results: {
        fixMessageTypes: output.statistics.Item("Messages.Added"),
        codes: output.statistics.Item("Codes.Added"),
        groups: output.statistics.Item("Groups.Added"),
        sections: output.statistics.Item("Sections.Added"),
        fields: output.statistics.Item("Fields.Added"),
        datatypes: output.statistics.Item("Datatypes.Added"),
        components: output.statistics.Item("Components.Added"),
        codesets: output.statistics.Item("Codesets.Added"),
      }
    })
  }

  private getErrorTitle(error: string): string {
    switch (error) {
      case 'Orchestra File':
        return `There was an error reading your ${error}, please upload it again`;
      default:
        return `Your input orchestra file ${this.referenceFile && `named '${this.referenceFile.name}'`} is invalid or empty`;
    }
  }

  private setMessageError(errorMsg: string): string {
    const NotReadableErrorRes =
      'The requested file could not be read, possibly due to a permission problem or because the file was changed';
    return (
      errorMsg.startsWith('NotReadableError') ? `NotReadableError: ${NotReadableErrorRes}` : errorMsg
    );
  }

  private createLink(contents: Blob): void {
    if (this.orchestraFileName) {
      const url = window.URL.createObjectURL(contents);

      this.setState({
        downloadHref: url,
        downloadUrl: [OrchestraFile.MIME_TYPE, this.orchestraFileName, url].join(':'),
      });
    }
  }

  private handleDownloadClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>): void {
    this.setState({
      downloaded: true
    });
    setTimeout(() => {
      this.setState({
        downloadHref: "",
        downloadUrl: "",
        downloaded: false,
      });
    }, 1500);
  }

  private CheckAuthenticated() {

    if (process.env.NODE_ENV === "development") {
      this.setState({
        authVerified: true,
      })
      return;
    }

    const urlparsed = QueryString.parse(window.location.search);
    const id_token = urlparsed.id_token as string;
    try {
      const decoded: null | IDecoded | string = jwt.decode(id_token);
      if (!decoded) {
        throw new Error("unauthenticated");
      }
      if (typeof decoded !== "string" && decoded.exp) {
        const sec = decoded.exp as number;
        const date: Date = new Date(0);
        date.setUTCSeconds(sec);
        const now: Date = new Date();
        if (date < now) {
          throw new Error("expired");
        }
      }

      const verified: object | string = jwt.verify(id_token, Utility.GetMOPublicKey());
      if (!verified) {
        throw new Error("unauthenticated");
      }
      this.errorHandler?.configureScope(decoded as IDecodedUserData);
      this.setState({
        authVerified: true,
      })

    } catch (e) {
      Utility.Log(e);

      const redirectUri = process.env.REACT_APP_REDIRECT_URL;
      const clientId = process.env.REACT_APP_CLIENT_ID;

      window.location.href = "https://fixtrading.xecurify.com/moas/idp/openidsso?" +
        "client_id="+ clientId +"&" +
        "redirect_uri="+ redirectUri + "&" +
        "scope=profile&" +
        "response_type=token&" +
        "state=123";
    }
  }
}
