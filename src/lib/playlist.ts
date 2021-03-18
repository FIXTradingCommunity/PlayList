/*!
 * Copyright 2021, FIX Protocol Ltd.
 */
import OrchestraFile from "./OrchestraFile";

/**
 * Controller for Playlist operations
 */
export default class Playlist {
  private inputProgress: HTMLElement | null;
  private progressFunc: (progressNode: HTMLElement, percent: number) => void;
  private referenceFile: File;
  private orchestraJson: string = '';
    constructor(referenceFile: File, inputProgress: HTMLElement | null, progressFunc: (progressNode: HTMLElement, percent: number) => void) {
        this.referenceFile = referenceFile;
        this.inputProgress = inputProgress;
        this.progressFunc = progressFunc;
    }
    get dom(): string {
      return this.orchestraJson;
    }
    public async runReader(): Promise<string> {
        try {
            const input = new OrchestraFile(this.referenceFile, false, this.inputProgress, this.progressFunc);

            // read local reference Orchestra file
            await input.readFile();
            
            // set orchestra dom 
            this.orchestraJson = input.xmlDom;
            return new Promise<string>(resolve =>
              resolve(this.orchestraJson)
            );
        } catch (e) {
            return new Promise<string>((resolve, reject) =>
                reject(e)
            )
        }
    }
}