/*!
 * Copyright 2021, FIX Protocol Ltd.
 */
import OrchestraFile from "./OrchestraFile";
import OrchestraModel from "./OrchestraModel";
import { TreeControl } from "./types";
import convert from 'xml-js';
import Utility from '../lib/utility';
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
  private mappedData: { [key: string]: any } = {};
  private keys: { [key: string]: Array<string> } = {};
  private mainTreeNode: TreeControl = [];
  private blob: Blob | undefined = undefined;
  private firstKeyIsCodeset: boolean = false;
  public onFinish: undefined | ((output: OrchestraFile) => void);
  public lastCodesetItem: boolean = false;
  public parseXMLError: string | null = null;
  public duplicateValuesError: string[] | null = null;
  constructor(
    referenceFile: File,
    inputProgress: HTMLElement | null,
    outputProgress: HTMLElement | null,
    progressFunc: (progressNode: HTMLElement, percent: number) => void
    ) {
      this.referenceFile = referenceFile;
      this.inputProgress = inputProgress;
      this.outputProgress = outputProgress;
      this.progressFunc = progressFunc;
    }
  public updateLastCodesetItem() {
    this.lastCodesetItem = !this.lastCodesetItem;
  }

  public cleanParseXMLError() {
    this.parseXMLError = null;
  }

  public cleanDuplicateValuesError() {
    this.duplicateValuesError = null;
  }

  private sortTree(tree: Array<any>) {
    const sortedTree = tree.map((node: any) => {
      return {
        ...node,
        children: this.sortChildren(node.children),
      }
    })
    return sortedTree;
  }

  private sortChildren(children: any) {
    const sortedChildren = children.map((node: any) => {
      if (node.children) {
        return {...node, children: this.sortChildren(node.children)}
      };
      return node;
    });
    return sortedChildren.sort((a: any, b: any) => {
      const labelA = Number.parseInt(a.label?.split("-")[0]);
          const labelB = Number.parseInt(b.label?.split("-")[0]);
           if (isNaN(labelA) && isNaN(labelB)) {
             return a.label > b.label ? 1 : a.label < b.label ? -1 : 0
           } else if (!isNaN(labelA) && !isNaN(labelB)){
            return labelA-labelB
           } else {return 0}
    })
  }

  public async runReader(): Promise<TreeControl | string> {
    try {
      const input = new OrchestraFile(this.referenceFile, false, this.inputProgress, this.progressFunc);
      // read local reference Orchestra file
      const inputDom = await input.readFile();
      this.inputFile = input;
      const jsonDom = convert.xml2js(inputDom);
      this.mappedData = Utility.mapOrchestraDom(jsonDom.elements[0].elements)
      const tree = Utility.createInitialTree(this.mappedData);      
      this.keys = tree.mappedKeys;
      const sortedTree = this.sortTree(tree.initialTree)
      if (!!tree.duplicateValues.length) {
        this.duplicateValuesError = tree.duplicateValues;
        return new Promise<string>((resolve, reject) =>
        reject("")
      )
      }
      this.mainTreeNode = sortedTree;
      return new Promise<TreeControl>(resolve =>
        resolve(sortedTree)
      );
    } catch (e) {
      if (String(e).includes("reference")) {
        this.parseXMLError = String(e).replace("Error:", "XML");
        return "";
      }
      if (String(e).includes("tag mismatch")) {
        this.parseXMLError = String(e).replace("Error:", "XML");
        return "";
      }
      return new Promise<string>((resolve, reject) =>
        reject(e)
      )
    }
  }
      // Upon creation of the Orchestra output file, StandardHeader and StandardTrailer components need to automatically be added to the messages that were selected.
    // For this we create the hardcoded headerTrailer object with the necessary values if the condition is met.
    // component:1024 and component:1025 represent the StandardHeader and StandardTrailer value groups.
  public checkValues = (
    checked: Array<string>,
    keysAdded: Array<string>
  ): {
    [key: string]: Array<string> | any
  } => {
    let newChecked = [...checked];
    const messegesKey = keysAdded.find(key => key.includes("message:"))  
    if (messegesKey && messegesKey.length > 0) {
      const messageHeaderTrailer = keysAdded[0].split(/-\w/g)[0]
      this.addCheckedReference(newChecked, [
        ...keysAdded,
        `${messageHeaderTrailer}-component:1024->component:1024`,
        `${messageHeaderTrailer}-component:1025->component:1025`,
      ]);
    } else {
      this.addCheckedReference(newChecked, keysAdded);
    };
    const newCheckedList = uniq(newChecked);
    const checkedFields = newCheckedList.filter((item) => {
      return item.split('->').length === 1 && item.includes('field:');
    });
    const newTree = this.updateFieldsNode(checkedFields);
    this.mainTreeNode = newTree;
    
    return { newCheckedList, newTree };
  }

  public addCheckedReference(checked: Array<string>, keysToAdd: Array<string>) {
    if (Object.keys(this.keys).length > 0) {
      keysToAdd.forEach((key) => {
        if (!checked.includes(key) && key.includes("group:")) {
          const group = key.split('-')[0];
          if (this.keys[group]) {
            const numInGroup = this.keys[group].find((e) => e.includes("numInGroup"));
            if (numInGroup) {
              checked.push(numInGroup, numInGroup.split('->')[1]);
            }
          }
        }
        if (!checked.includes(key) || key.includes("components") || key.includes("field")) {
          const splittedKey = key.split('->');
          const newKey = splittedKey[splittedKey.length-1];
          checked.push(key)
          this.checkKeys(checked, key);
          if (key !== newKey) {
            checked.push(newKey)
            this.checkKeys(checked, newKey);
          }
        }
      });
    }
  }

  private checkKeys(checked: Array<string>, key: string) {
    if (this.keys[key]) { 
      if (this.keys[key].filter(x => checked.includes(x)).length === 0) {
        const keysFilter = this.keys[key].filter((k) => (
          !checked.includes(k) &&
          !(k.startsWith('codeset') && 
          checked.find((checkedKey) => checkedKey.startsWith(k)))
        ));
        this.addCheckedReference(checked, keysFilter);
      } else if (key.startsWith('field')) {
        this.addCheckedReference(checked, this.keys[key])
      }
    }
  }

  public updateFieldsNode(checkedFields: Array<string>) {
    const newTree = [...this.mainTreeNode ];
    if (this.mappedData.fields && this.mappedData.fields.elements) {
      const fieldsObject = Utility.createFieldNodes(
        this.mappedData.fields,
        this.mappedData.codesets,
        this.keys, checkedFields
      );
      const { fieldsOut } = fieldsObject;
      let treeIndex = -1;
      const fieldsOutIndex = newTree.findIndex((node) => node.value === 'FieldsOut');   
      if (fieldsOutIndex > -1) { 
        treeIndex = fieldsOutIndex;
        newTree.splice(fieldsOutIndex, 1)
      }
      if (fieldsOut.children.length > 0) {
        newTree.splice(treeIndex > -1 ? treeIndex : newTree.length, 0, fieldsOut);
      }
    }
    return newTree;
  }
  
  public async runCreator(orchestraFileName: string, selectedItems: Array<string>): Promise<Blob> {
    try {
      if (this.inputFile && selectedItems.length > 0) {
        // populate model from reference Orchestra file
        const referenceModel: OrchestraModel = new OrchestraModel();
        this.inputFile.populateOrchestraModelFromDom(referenceModel);
        // create new Orchestra file for output
        const output = new OrchestraFile(
          new File([""], orchestraFileName),
          false,
          this.outputProgress,
          this.progressFunc
        );
        // clones reference dom to output file
        output.dom = this.inputFile.cloneDom();

        const dataModel = Utility.groupSelectedItems(selectedItems, this.mappedData.groups);
      
        output.updateDomFromModel(dataModel, this.outputProgress);
        if (this.onFinish) {
            this.onFinish(output);
        }
        this.blob = output.contents();
        return new Promise<Blob>(resolve =>
          this.blob && resolve(this.blob)
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

  /** --------------- New Uncheck Implementation - April 2023 */
  public newUncheckValues = (
    checked: Array<string>,
    keysRemoved: Array<string>
  ): {
    [key: string]: Array<string> | any
  } => {
    // it cheking if the value to remove is the last codeset value, in that case it breaks the process and set the lastCodesetItem to true to don't remove the last codeset value and show an alert message
    let breakProcess = this.checkIfLastCodesetValue(keysRemoved, checked);
    // newChecked is a copy of checked
    let newChecked: Array<string> = [...checked];
    // newKeysRemoved is an array of keys to remove
    let newKeysRemoved: Array<string> = [];

    if (!breakProcess) {
      newKeysRemoved = this.recursiveFindValuesToUncheck(keysRemoved, checked);
      newChecked = newChecked.filter((item) => !newKeysRemoved.includes(item));
      // remove form newKeysRemoved all the values that not start with group:, section:, component: and filed: and include "->"
      newKeysRemoved = newKeysRemoved.filter((item) => (item.startsWith("group:") || item.startsWith("message:") || item.startsWith("section:") || item.startsWith("component:") || item.startsWith("filed:")) && !item.includes("->"));
      // check if each item in newChecked include some item of newKeysRemoved, if it's true, remove it from newChecked
      newChecked.forEach((item) => {
        newKeysRemoved.forEach((key) => {
          if (item.includes(key)) {
            newChecked = newChecked.filter((e) => e !== item);
          }
        });
      }
      );
    }

    const headerTrailerValuesToRemove = this.checkStandardHeaderTrailer(newChecked);
    newChecked = newChecked.filter((item) => !headerTrailerValuesToRemove.includes(item));
    
    const newTree = this.updateFieldsNode(newChecked);
    return { newCheckedList: uniq(newChecked), newTree };
  };

  // function to verify if the header and trailer messages values are included in more than one message, if it's not, remove them from checked array
  public checkStandardHeaderTrailer = (newChecked: Array<string>): Array<string> => {
    const headerTrailerValuesToRemove: Array<string> = [];
    const headerTrailerValues = newChecked.filter(key => key.startsWith('message:') && (key.includes("component:1024") || key.includes("component:1025")));
    headerTrailerValues.forEach((key) => {
      const messageHeaderTrailer = key.split(/-\w/g)[0]
      let countMessage = 0;
      newChecked.forEach((checkedKey) => {
        if (checkedKey.startsWith(messageHeaderTrailer) && !checkedKey.includes("component:1024") && !checkedKey.includes("component:1025")) {
          ++countMessage;
        }
      })
      if (countMessage === 0) {
        headerTrailerValuesToRemove.push(key);
      }
    })
    return headerTrailerValuesToRemove;
  }
    


  // Check if the value to remove is the last codeset value
  public checkIfLastCodesetValue = (keysRemoved: Array<string>, checked: Array<string>): boolean => {
    if (keysRemoved?.[0]?.startsWith("codeset")) {
      this.firstKeyIsCodeset = false;
      const splittedCodesetKey = keysRemoved[0].split('-');
      const totalCodeset = checked.filter(c => c.startsWith(splittedCodesetKey[0]) && c.includes("-"))
      if (totalCodeset.length === 1) {
        this.updateLastCodesetItem(); 
        return true;
      }
    }
    return false;
  }

  // create function deleteValuesUsedOnMoreThanOneValue to check if values in splittedKeyToRemove array are included in more than one value in keyToRemoveWithArrow and remove them from splittedKeyToRemove  
  public deleteValuesUsedOnMoreThanOneValue = (splittedKeyToRemove: Array<string>, newChecked: Array<string>): Array<string> => {
    let newSplittedKeyToRemove: Array<string> = [];
    splittedKeyToRemove.forEach((item) => {
      let count = 0;
      newChecked.forEach((key) => {
        if (key.endsWith(`->${item}`)) {
          count++;
        }
      });
      if (count < 2) {
        newSplittedKeyToRemove.push(item);
      }
    });
    return newSplittedKeyToRemove;
  }

  // recursive function is to create a list with all values to unckeck from checked array. Select each value on keysRemoved that could be a new key in this.keys each new key in this.keys could be a new arrays of values to romove from checked array
  public recursiveFindValuesToUncheck = (keysRemoved: Array<string>, checked: Array<string>): Array<string> => {
    const newChecked = [...checked];
    let newKeysRemoved: Array<string> = [];

    let keyToRemoveWithoutArrow: Array<string> = [];
    let filteredKeyToRemoveWithoutArrow: Array<string> = [];
    // keyToRemoveWithArrow is an array of keys to remove with arrow
    let keyToRemoveWithArrow: Array<string> = [];
    // In the foreach it's splitting the keysRemoved array in two arrays, values with arrow and values without arrow
    keysRemoved.forEach((item) => {
      item.includes("->") ? keyToRemoveWithArrow.push(item) : keyToRemoveWithoutArrow.push(item);
    });

    // to evitate infinite recursive loop, remove from keyToRemoveWithArrow all the values that includes group:, section:, component: and filed:
    filteredKeyToRemoveWithoutArrow = keyToRemoveWithoutArrow.filter((item) => !item.includes("group:") && !item.includes("message:") && !item.includes("section:") && !item.includes("component:") && !item.includes("filed:"));
  
    let splittedKeyToRemove: Array<string> = [];
    keyToRemoveWithArrow.forEach((key) => {
      splittedKeyToRemove.push(key.split("->")[key.split("->").length - 1]);
    });

    // deleteValuesUsedOnMoreThanOneValue is going to check if the values are used on more than one value in the array keyToRemoveWithArrow
    splittedKeyToRemove = this.deleteValuesUsedOnMoreThanOneValue(splittedKeyToRemove, newChecked);

    // splittedKeyToRemove are keys of the object this.keys, so create a new array with all the values contained by each key inside this.keys that match the splittedKeyToRemove array
    [...splittedKeyToRemove, ...filteredKeyToRemoveWithoutArrow].forEach((key) => {
      // check if the key is included in this.keys and if it's not a datatype, because this.keys contains datatypes value equal to the key and fall in an infinite loop
      if (this.keys[key] && !key.includes("datatype:")) {
        newKeysRemoved.push(...this.recursiveFindValuesToUncheck(this.keys[key], newChecked));
      }
    });

    return uniq([...newKeysRemoved, ...keyToRemoveWithArrow, ...splittedKeyToRemove, ...keyToRemoveWithoutArrow]);
  };
}
