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
      if (!a.label) { 
        console.log("a", a);
      }
      
      const labelA = Number.parseInt(a.label.split("-")[0]);
          const labelB = Number.parseInt(b.label.split("-")[0]);
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
      
      this.mainTreeNode = sortedTree;
      return new Promise<TreeControl>(resolve =>
        resolve(sortedTree)
      );
    } catch (e) {
      return new Promise<string>((resolve, reject) =>
        reject(e)
      )
    }
  }
  public updateTree(
      checked: Array<string>,
      keysAdded: Array<string>,
      keysRemoved: Array<string>
    ): {
      [key: string]: Array<string> | any
    } {
    let filteredKeyRemoved: any = [];
    // Upon creation of the Orchestra output file, StandardHeader and StandardTrailer components need to automatically be added to the messages that were selected.
    // For this we create the hardcoded headerTrailer object with the necessary values if the condition is met.
    // component:1024 and component:1025 represent the StandardHeader and StandardTrailer value groups.

    if (keysRemoved.length > 0) {
      filteredKeyRemoved = keysRemoved.filter(key => (!key.includes("component:1024") && !key.includes("component:1025")) || key.startsWith("component:1024") || key.startsWith("component:1025"))
      if (filteredKeyRemoved.length === 3 &&
        (filteredKeyRemoved[0].startsWith("component:1024") || filteredKeyRemoved[0].startsWith("component:1025")) 
       ) {
          filteredKeyRemoved.pop();
      }
      if (filteredKeyRemoved[0].length > 1 && filteredKeyRemoved[0].startsWith("group:") && filteredKeyRemoved[0].split("->").length === 1) {
        filteredKeyRemoved.shift();
      }
    }
  
    let newChecked = [...checked];
    if (keysAdded.length > 0) {
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
      }
    }
    if (filteredKeyRemoved.length > 0) {
      const headerTrailerFilterKeyRemoved = keysRemoved.filter(key => key.includes("component:1024") || key.includes("component:1025"));
      this.firstKeyIsCodeset = filteredKeyRemoved.length > 0 && filteredKeyRemoved[0].startsWith("codeset");
      const preKeysRemoved: any = [];
      if (!this.firstKeyIsCodeset && (keysRemoved.length > 2 || keysRemoved.filter(e => e.startsWith("section:")).length > 0)) {
        this.preRemoveCheckedReference(preKeysRemoved, filteredKeyRemoved) 
        newChecked = this.removeCheckedReference(checked, newChecked, uniq(preKeysRemoved));
      } else {
        newChecked = this.removeCheckedReference(checked, newChecked, filteredKeyRemoved);
      }
      if (headerTrailerFilterKeyRemoved && headerTrailerFilterKeyRemoved.length > 0) {
        newChecked = newChecked.filter(key => !headerTrailerFilterKeyRemoved.includes(key))
      }
    }
    const newCheckedList = uniq(newChecked);
    const checkedFields = newCheckedList.filter((item) => {
      return item.split('->').length === 1 && item.includes('field:');
    });
    const newTree = this.updateFieldsNode(checkedFields);
    this.mainTreeNode = newTree;
    return { newCheckedList, newTree };
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
  
  public addCheckedReference(checked: Array<string>, keysToAdd: Array<string>) {
    if (Object.keys(this.keys).length > 0) {
      keysToAdd.forEach((key) => {
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

  public preRemoveCheckedReference(preKeysRemoved: Array<string>, keysToRemove: Array<string>) {
    keysToRemove.forEach((key) => {
      if (!preKeysRemoved.includes(key)) {
        const splittedKey = key.split('->');
        const newKey = splittedKey[splittedKey.length-1];
        preKeysRemoved.push(key)
        this.removeCheckKeys(preKeysRemoved, key);
        if (key !== newKey) {
          preKeysRemoved.push(newKey)
          this.removeCheckKeys(preKeysRemoved, newKey);
        }
      }
    });
  }

  private removeCheckKeys(checked: Array<string>, key: string) {
    if (this.keys[key]) {
      if (this.keys[key].filter(x => checked.includes(x)).length === 0) {
        const keysFilter = this.keys[key].filter((k) => (
          !checked.includes(k) &&
          !(k.startsWith('codeset') && 
          checked.find((checkedKey) => checkedKey.startsWith(k)))
        ));
        this.preRemoveCheckedReference(checked, keysFilter);
      }
    }
  }

  public removeCheckedReference(mainKeysChecked: Array<string>, checked: Array<string>, keysToRemove: Array<string>) {
    let newChecked = [...checked];
    let breakProcess = false;
    if (this.firstKeyIsCodeset && keysToRemove.length > 0 && keysToRemove[0].startsWith("codeset")) {
      this.firstKeyIsCodeset = false;
      const splittedCodesetKey = keysToRemove[0].split('-');
      const totalCodeset = checked.filter(c => c.startsWith(splittedCodesetKey[0]))
      if (totalCodeset.length === 1) {
        breakProcess = true;
        this.updateLastCodesetItem();
      }
    }
    if (keysToRemove.length === 1 && keysToRemove[0].indexOf('->') !== -1) {
      const preSplitedKey = keysToRemove[0].split('->');
      const key = preSplitedKey[preSplitedKey.length - 1];
      if (key.startsWith("field")) {
        newChecked.forEach(e => {
          if (e.startsWith('component') || e.startsWith('group') || e.startsWith('section')) {  
            if (e.indexOf(key) !== -1 && e !== keysToRemove[0]) {
              newChecked = newChecked.filter(e => e !== keysToRemove[0]);
              breakProcess = true;
            }
          }
        })
      }
      else if (key.startsWith("group") && this.keys[key]) {
        newChecked = this.removeCheckedReference(mainKeysChecked, newChecked, [key, ...this.keys[key]]);
        breakProcess = true;
      }
    }
    
    !breakProcess &&
    keysToRemove.forEach((key) => {
      const splittedKey = key.split('->');
      let checkKeys: any = [];
      if ((key.startsWith("field:") || key.startsWith("group:")) && splittedKey.length === 1) {
        checkKeys = mainKeysChecked.filter((item) => 
            item.startsWith("section:") && item.endsWith(key) && item !== key);
      } else if (key.startsWith("section:") && (key.includes("field:") || key.includes("group:"))) {
          checkKeys = mainKeysChecked.filter((item) => 
            item.endsWith(splittedKey[splittedKey.length - 1]) && splittedKey[splittedKey.length - 1] !== item);
      }
      if (checkKeys.length <= 1) {    
        switch (splittedKey.length) {
          case 1:
            const foundKeys = newChecked.filter((item) => item.endsWith(key));   
            newChecked = newChecked.filter((item) => !item.endsWith(key));
            if (key.startsWith('field')) {
              const result = newChecked.filter(e => {
                if (e.startsWith('field') && this.keys[e] && this.keys[key]) {
                  return this.keys[e][0] === this.keys[key][0]
                } else {
                  return false
                }
              }) 
              if (result.length === 0 && this.keys[key]) {
                const keysToDelete = uniq(this.keys[this.keys[key][0]] || this.keys[key] || []);
                newChecked = newChecked.filter((item) => !keysToDelete.find(e => item === e));
                const fieldRefs = uniq(this.keys[key]);
                const fields = newChecked.filter((value) => (value.startsWith('field')));
                
                const refsToRemove = fields.reduce((refsToRemove: string[], field) => {
                  const fieldKeys = uniq(this.keys[field]);
                  return refsToRemove.filter((ref) => !fieldKeys.includes(ref));
                }, [...fieldRefs]);
                newChecked = this.removeCheckedReference(mainKeysChecked, newChecked, [...refsToRemove]);
              }
            }
            foundKeys.forEach((foundKey) => {
              if (foundKey.split('->').length > 1) {
                const stringEnd = foundKey.length - key.length * 2 - 3;
                const newKey = foundKey.substring(0, stringEnd);
                const foundKeyRefs = newChecked.filter((item) => item.startsWith(`${newKey}-`));
                if (foundKeyRefs.length === 1) {
                  newChecked = this.removeCheckedReference(mainKeysChecked, newChecked, [newKey]);
                }
              }
            });
            break;
          case 2:
            const keyStart = key.split('-')[0];
            newChecked = newChecked.filter((item) => item !== key);
            const foundRefKeys = newChecked.filter((item) => item.startsWith(`${keyStart}-`));
            if (foundRefKeys.length === 0) {
              newChecked = this.removeCheckedReference(mainKeysChecked, newChecked, [keyStart, splittedKey[1]]);
            } else {
              newChecked = this.removeCheckedReference(mainKeysChecked, newChecked, [splittedKey[1]]);
            }
            break;
          default:
            newChecked = this.removeCheckedReference(mainKeysChecked, newChecked, [...splittedKey]);
            break;
          }
      } else {
        newChecked = newChecked.filter(e => e !== key);
      }
    });
    return newChecked;
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
}