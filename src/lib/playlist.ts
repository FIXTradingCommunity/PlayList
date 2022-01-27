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
    return sortedChildren.sort((a: any, b: any) => (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0))
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
    this.firstKeyIsCodeset = keysRemoved.length > 0 && keysRemoved[0].startsWith("codeset")
    let newChecked = [...checked];
    if (keysAdded.length > 0) {
      this.addCheckedReference(newChecked, keysAdded);
    }
    if (keysRemoved.length > 0) {
      const preKeysRemoved: any = [];
      if (keysRemoved.length > 2) {
        this.preRemoveCheckedReference(preKeysRemoved, keysRemoved)
        newChecked = this.removeCheckedReference(newChecked, preKeysRemoved);
      } else {
        newChecked = this.removeCheckedReference(newChecked, keysRemoved);
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
    keysToAdd.forEach((key) => {
      const splittedKey = key.split('->');
      const newKey = splittedKey[splittedKey.length-1];
      checked.push(key)
      this.checkKeys(checked, key);
      if (key !== newKey) {
        checked.push(newKey)
        this.checkKeys(checked, newKey);
      } 
    });
  }

  private checkKeys(checked: Array<string>, key: string) {
    if (this.keys[key]) { 
      if (this.keys[key].filter(x => checked.includes(x)).length === 0) {
        const keysFilter = this.keys[key].filter((k) => (
          !checked.includes(k) &&
          !(k.startsWith('codeset') && checked.find((checkedKey) => checkedKey.startsWith(k)))
        ));
        this.addCheckedReference(checked, keysFilter);
      } else if (key.startsWith('field')) {
        this.addCheckedReference(checked, this.keys[key])
      }
    }
  }

  public preRemoveCheckedReference(preKeysRemoved: Array<string>, keysToRemove: Array<string>) {
    keysToRemove.forEach((key) => {
      const splittedKey = key.split('->');
      const newKey = splittedKey[splittedKey.length-1];
      preKeysRemoved.push(key)
      this.removeCheckKeys(preKeysRemoved, key);
      if (key !== newKey) {
        preKeysRemoved.push(newKey)
        this.removeCheckKeys(preKeysRemoved, newKey);
      } 
    });
  }

  private removeCheckKeys(checked: Array<string>, key: string) {
    if (this.keys[key]) {
      if (this.keys[key].filter(x => checked.includes(x)).length === 0) {
        const keysFilter = this.keys[key].filter((k) => (
          !checked.includes(k) &&
          !(k.startsWith('codeset') && checked.find((checkedKey) => checkedKey.startsWith(k)))
        ));
        this.preRemoveCheckedReference(checked, keysFilter);
      }
    }
  }

  public removeCheckedReference(checked: Array<string>, keysToRemove: Array<string>) { 
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
        newChecked.map(e => {
          if (e.startsWith('component') || e.startsWith('group') || e.startsWith('section')) {  
            if (e.indexOf(key) !== -1 && e !== keysToRemove[0]) {
              newChecked = newChecked.filter(e => e !== keysToRemove[0]);
              breakProcess = true;
            }
          }
          return true;
        })
      }
    }
    
    !breakProcess &&
    keysToRemove.forEach((key) => {
      const splittedKey = key.split('->');
      switch (splittedKey.length) {
        case 1:
          const foundKeys = newChecked.filter((item) => item.endsWith(key));            
          newChecked = newChecked.filter((item) => !item.endsWith(key));
          if (key.startsWith('field')) {
            const result = newChecked.filter(e => {
              if (e.startsWith('field')) {
                return this.keys[e][0] === this.keys[key][0]
              } else {
                return false
              }
            })

            if (result.length === 0) {
              const keysToDelete = uniq(this.keys[this.keys[key][0]] || this.keys[key] || []);
              newChecked = newChecked.filter((item) => !keysToDelete.find(e => item === e));
              const fieldRefs = uniq(this.keys[key]);
              const fields = newChecked.filter((value) => (value.startsWith('field')));
              
              const refsToRemove = fields.reduce((refsToRemove: string[], field) => {
                const fieldKeys = uniq(this.keys[field]);
                return refsToRemove.filter((ref) => !fieldKeys.includes(ref));
              }, [...fieldRefs]);
  
              newChecked = this.removeCheckedReference(newChecked, [...refsToRemove]);
            }
          }
          foundKeys.forEach((foundKey) => {
            if (foundKey.split('->').length > 1) {
              const stringEnd = foundKey.length - key.length * 2 - 3;
              const newKey = foundKey.substring(0, stringEnd);
              const foundKeyRefs = newChecked.filter((item) => item.startsWith(`${newKey}-`));
              if (foundKeyRefs.length === 1) {
                newChecked = this.removeCheckedReference(newChecked, [newKey]);
              }
            }
          });
          break;
        case 2:
          const keyStart = key.split('-')[0];
          newChecked = newChecked.filter((item) => item !== key);
          const foundRefKeys = newChecked.filter((item) => item.startsWith(`${keyStart}-`));
          if (foundRefKeys.length === 0) {
            newChecked = this.removeCheckedReference(newChecked, [keyStart, splittedKey[1]]);
          } else {
            newChecked = this.removeCheckedReference(newChecked, [splittedKey[1]]);
          }
          break;
        default:
          newChecked = this.removeCheckedReference(newChecked, [...splittedKey]);
          break;
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