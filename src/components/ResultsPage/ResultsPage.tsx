import React from "react";
import cancelIcon from "./cancel.svg";
import "./resultsPage.css";

interface Props {
  results?: {
    componentScenarios: number;
    components: number;
    fields: number;
    fixMessageTypes: number;
    messageScenarios: number;
    userDefinedFields: number;
    messagesCount: number;
  };
  downloadButton: JSX.Element;
  onClose: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const ProgressCircle: React.FC<Props> = (props) => {
  const { results, downloadButton, onClose } = props;

  let componentScenarios = 0;
  let components = 0;
  let fields = 0;
  let fixMessageTypes = 0;
  let messageScenarios = 0;
  let userDefinedFields = 0;
  let messagesCount = 0;
  
  if (results) {
    componentScenarios = results.componentScenarios;
    components = results.components;
    fields = results.fields;
    fixMessageTypes = results.fixMessageTypes;
    messageScenarios = results.messageScenarios;
    userDefinedFields = results.userDefinedFields;
    messagesCount = results.messagesCount;
  }

  return (
    <div className="resultsPageContainer">
      <button className="resultsPageOverlay" onClick={onClose} />
      <div className="resultsContainer">
      <div className="downloadButtonContainer">
        {downloadButton}
      </div>
    </div>
  </div>
  );
};

export default ProgressCircle;
