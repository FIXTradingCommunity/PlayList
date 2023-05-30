import React from "react";
import cancelIcon from "./cancel.svg";
import "./resultsPage.css";
import { group } from "console";

interface Props {
  results?: {
    codesets: number;
    components: number;
    fields: number;
    datatypes: number;
    fixMessageTypes: number;
    codes: number;
    groups: number;
    sections: number;
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
  let sections = 0;
  
  if (results) {
    fixMessageTypes = results.fixMessageTypes;
    codes = results.codes;
    groups = results.groups;
    sections = results.sections;
    fields = results.fields;
    datatypes = results.datatypes;
    components = results.components;
    codesets = results.codesets;
   
  }


  // fixMessageTypes: output.statistics.Item("Messages.Added"),
  // codes: output.statistics.Item("Codes.Added"),
  // groups: output.statistics.Item("Groups.Added"),
  // sections: output.statistics.Item("Sections.Added"),
  // fields: output.statistics.Item("Fields.Added"),
  // datatypes: output.statistics.Item("Datatypes.Added"),
  // components: output.statistics.Item("Components.Added"),
  // codesets: output.statistics.Item("Codesets.Added"),
  return (
    <div className="resultsPageContainer">
      <div className="resultsPageOverlay" />
      <div className="resultsContainer">
        <button className="closeButton" onClick={onClose}>
          <img className="closeIcon" src={cancelIcon} alt="close" />
        </button>
        <div className="resultsValueContainer no-margin-top">
          <div className="resultsLabel"># FIX Message Types discovered</div>
          <div className="resultsValue">{fixMessageTypes}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Codes</div>
          <div className="resultsValue">{codes}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># standard fields discovered</div>
          <div className="resultsValue">{fields}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># datatypes discovered</div>
          <div className="resultsValue">{datatypes}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Groups</div>
          <div className="resultsValue">{groups}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># Sections</div>
          <div className="resultsValue">{sections}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># components discovered</div>
          <div className="resultsValue">{components}</div>
        </div>
        <div className="resultsValueContainer">
          <div className="resultsLabel"># code sets discovered</div>
          <div className="resultsValue">{codesets}</div>
        </div>
        <div className="downloadButtonContainer">
          {downloadButton}
        </div>
      </div>
    </div>
  );
};

export default ProgressCircle;
