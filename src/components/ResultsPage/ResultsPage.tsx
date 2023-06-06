import React from "react";
import cancelIcon from "./cancel.svg";
import "./resultsPage.css";

interface Props {
  results?: {
    codesets: number;
    components: number;
    fields: number;
    datatypes: number;
    fixMessageTypes: number;
    codes: number;
    groups: number;
  };
  downloadButton: JSX.Element;
  onClose: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ProgressCircle: React.FC<Props> = (props) => {
  const { results, downloadButton, onClose } = props;

  let codesets = 0;
  let components = 0;
  let fields = 0;
  let datatypes = 0;
  let fixMessageTypes = 0;
  let codes = 0;
  let groups = 0;
  
  if (results) {
    fixMessageTypes = results.fixMessageTypes;
    codes = results.codes;
    groups = results.groups;
    fields = results.fields;
    datatypes = results.datatypes;
    components = results.components;
    codesets = results.codesets;
   
  }

  return (
    <div className="resultsPageContainer">
      <div className="resultsPageOverlay" />
      <div className="resultsContainer">
        <button className="closeButton" onClick={onClose}>
          <img className="closeIcon" src={cancelIcon} alt="close" />
        </button>
        <div className="resultsValueContainer no-margin-top">
          <div className="resultsLabel"># FIX Message Types selected</div>
          <div className="resultsValue">{fixMessageTypes}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Groups selected</div>
          <div className="resultsValue">{groups}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Components selected</div>
          <div className="resultsValue">{components}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Standard Fields selected</div>
          <div className="resultsValue">{fields}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Code Sets selected</div>
          <div className="resultsValue">{codesets}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Datatypes selected</div>
          <div className="resultsValue">{datatypes}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Codes selected</div>
          <div className="resultsValue">{codes}</div>
        </div>
        <div className="downloadButtonContainer">
          {downloadButton}
        </div>
      </div>
    </div>
  );
};

export default ProgressCircle;
