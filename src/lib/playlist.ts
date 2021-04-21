/*!
 * Copyright 2021, FIX Protocol Ltd.
 */
import OrchestraFile from "./OrchestraFile";
import OrchestraModel from "./OrchestraModel";
import uniq from 'lodash/uniq';

/**
 * Controller for Playlist operations
 */
export default class Playlist {
  private inputProgress: HTMLElement | null;
  private outputProgress: HTMLElement | null;
  private progressFunc: (progressNode: HTMLElement, percent: number) => void;
  private referenceFile: File;
  private inputFile: OrchestraFile | undefined = undefined;
  private blob: Blob | undefined = undefined;
  public onFinish: undefined | ((output: OrchestraFile) => void);

  constructor(referenceFile: File, inputProgress: HTMLElement | null, outputProgress: HTMLElement | null, progressFunc: (progressNode: HTMLElement, percent: number) => void) {
    this.referenceFile = referenceFile;
    this.inputProgress = inputProgress;
    this.outputProgress = outputProgress;
    this.progressFunc = progressFunc;
  }
  public async runReader(): Promise<string> {
    try {
      const input = new OrchestraFile(this.referenceFile, false, this.inputProgress, this.progressFunc);
      // read local reference Orchestra file
      const inputDom = await input.readFile();
      this.inputFile = input;
      return new Promise<string>(resolve =>
        resolve(inputDom)
      );
    } catch (e) {
      return new Promise<string>((resolve, reject) =>
        reject(e)
      )
    }
  }
  public async runCreator(orchestraFileName: string, selectedItems: Array<string>): Promise<Blob> {
    try {
      if (this.inputFile && selectedItems.length > 0) {
        // populate model from reference Orchestra file
        const referenceModel: OrchestraModel = new OrchestraModel();
        this.inputFile.populateOrchestraModelFromDom(referenceModel);
        // create new Orchestra file for output
        const output = new OrchestraFile(new File([""], orchestraFileName), false, this.outputProgress, this.progressFunc);
        // clones reference dom to output file
        output.dom = this.inputFile.cloneDom();

        // parse selected items
        const itemList: string[] = [];
        selectedItems.forEach((selectedItem: string) => {
          const items = selectedItem.split("->");
          items.forEach((item) => {
            itemList.push(item);
          });
        });
        const newItemList = uniq(itemList);

        const dataModel = newItemList.reduce((data: any, newItem) => {
          const splittedItem = newItem.split(":");
          switch(splittedItem[0]) {
            case "field":
              data.fields.push({ "id": splittedItem[1] });
              break;
            case "datatype":
              data.datatypes.push({ "name": splittedItem[1] });
              break;
            case "section":
              data.sections.push({ "name": splittedItem[1] });
              break;
            case "category":
              data.categories.push({ "name": splittedItem[1] });
              break;
            case "codeset":
              const splittedCodeset = newItem.split('-');
              const codesetName = splittedCodeset[0].split(':')[1];
              const codeName = splittedCodeset[1].split(':')[1];
              if (data.codesets[codesetName]) {
                data.codesets[codesetName].push({ "codeName": codeName })
              }
              else {
                data.codesets[codesetName] = [{ "codeName": codeName }];
              }
              break;
            case "group":
              data.groups.push({ id: splittedItem[1] });
              break;
            case "message":
              const splittedMessage = newItem.split('-');
              const messageName = splittedMessage[0].split(':')[1];
              const messageRef = splittedMessage[1].split(':');
              const messageRefType = messageRef[0];
              const messageRefValue = messageRef[1];
              if (!data.messages[messageName]) {
                data.messages[messageName] = {};
              }
              if (!data.messages[messageName][messageRefType]) {
                data.messages[messageName][messageRefType] = [{ "id": messageRefValue }];
              }
              else {
                data.messages[messageName][messageRefType].push({ "id": messageRefValue});
              }
              break;
            case "component":
              const splittedComponent = newItem.split('-');
              const componentName = splittedComponent[0].split(':')[1];
              if (splittedComponent.length > 1) {
                  const componentRef = splittedComponent[1].split(':');
                  const componentRefType = componentRef[0];
                  const componentRefValue = componentRef[1];
                  if (!data.components[componentName]) {
                    data.components[componentName] = {};
                  }
                  if (!data.components[componentName][componentRefType]) {
                    data.components[componentName][componentRefType] = [{ "id": componentRefValue }];
                  }
                  else {
                    data.components[componentName][componentRefType].push({ "id": componentRefValue});
                  }
              }
              else {
                  data.components[componentName] = { all: true };
              }
              break;
            default: 
              break;
          }

          return data;
        }, {
          fields: [],
          datatypes: [],
          categories: [],
          sections: [],
          codesets: {},
          groups: [],
          messages: {},
          components: {}
        });

        output.updateDomFromModel(dataModel, this.outputProgress);
        if (this.onFinish) {
            this.onFinish(output);
        }
        this.blob = output.contents();
        return new Promise<Blob>(resolve =>
            resolve(this.blob)
        );
      }
      return new Promise<Blob>((resolve, reject) =>
        reject('Error: undefined input file')
      )
    } catch (e) {
        return new Promise<Blob>((resolve, reject) =>
            reject(e)
        )
    }
  }
  /**
   * Provide contents of a new Orchestra file for download
   */
  get contents(): Blob | undefined {
      return this.blob;
  }
}