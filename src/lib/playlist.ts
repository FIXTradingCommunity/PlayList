/*!
 * Copyright 2021, FIX Protocol Ltd.
 */
import OrchestraFile from "./OrchestraFile";
import OrchestraModel from "./OrchestraModel";

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