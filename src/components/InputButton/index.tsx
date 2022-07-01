import * as React from 'react';
import "./index.css";

export default function InputButton(props: any) {

  const { onChange, disableButton, buttonStyle, buttonTitle } = props;

  const handleOnClick = (e: any) => {
    disableButton ?  e.stopPropagation() : onChange()
  }

  return (
    <div onClick={handleOnClick} className="fieldsButtonContainers">
        <button className={`${buttonStyle} ${props.disableButton && "disabledButton"}`}>
          {buttonTitle}
        </button>
    </div>
  );
}
