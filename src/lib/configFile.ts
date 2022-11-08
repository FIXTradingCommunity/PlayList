/*!
 * Copyright 2021, FIX Protocol Ltd.
 */
import OrchestraFile from "./OrchestraFile";
import convert from 'xml-js';
import Utility from './utility';

/**
 * Controller for ConfigFile operations
 */
export default class ConfigFile {
  private inputProgress: HTMLElement | null;
  private outputProgress: HTMLElement | null;
  private progressFunc: (progressNode: HTMLElement, percent: number) => void;
  private referenceFile: File;
  private mappedData: { [key: string]: any } = {};
  private keys: { [key: string]: Array<string> } = {};
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

  private sortChildren(children: any) {
    const sortedChildren = children.map((node: any) => {
      if (node.children) {
        return {...node, children: this.sortChildren(node.children)}
      };
      return node;
    });
    return sortedChildren.sort((a: any, b: any) => {
      const labelA = Number.parseInt(a.label.split("-")[0]);
          const labelB = Number.parseInt(b.label.split("-")[0]);
           if (isNaN(labelA) && isNaN(labelB)) {
             return a.label > b.label ? 1 : a.label < b.label ? -1 : 0
           } else if (!isNaN(labelA) && !isNaN(labelB)){
            return labelA-labelB
           } else {return 0}
    })
  }

  public async runReader(): Promise<string[]> {
    try {
      
      const input = new OrchestraFile(this.referenceFile, false, this.inputProgress, this.progressFunc);
      // read local reference Orchestra file
      const inputDom = await input.readFile();
      const jsonDom = convert.xml2js(inputDom);
      this.mappedData = Utility.mapOrchestraDom(jsonDom.elements[0].elements)
      const tree = Utility.createInitialTree(this.mappedData);      
      this.keys = tree.mappedKeys;
      const newCheckedConfigFileKeys: string[] = [];
      for (const key in this.keys) {
        this.keys[key].forEach(key => newCheckedConfigFileKeys.push(key))
      }
      return new Promise<string[]>(resolve =>
        resolve(newCheckedConfigFileKeys)
      );
    } catch (e) {
      return new Promise<string[]>((resolve, reject) =>
        reject(e)
      )
    }
  }
  }
