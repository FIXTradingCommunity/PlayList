/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import CodesetModel, { CodeModel } from "./CodesetModel";
import MessageModel, { ComponentModel, ComponentRef, FieldModel, FieldRef, GroupModel, GroupRef } from "./MessageModel";
import OrchestraModel, { CodesetsModel, ComponentsModel, FieldsModel, GroupsModel, MessagesModel } from "./OrchestraModel";
import { IsSupportedfromString, Presence, PresencefromString, StructureModel } from "./StructureModel";
import { KeyedCollection } from "./KeyedCollection";
import { xml } from "vkbeautify";
import { CodesetSelectionModel, ComponentSelectionModel, IdSelectionModel, MessageSelectionModel, NameSelectionModel, SelectionModel, GroupSelectionModel } from "./types";

enum DOMParserSupportedType {
  TEXT_HTML = "text/html",
  TEXT_XML = "text/xml",
  APPLICATION_XML = "application/xml",
  APPLICATION_XHTML = "application/xhtml+xml",
  IMAGE_SVG = "image/svg+xml"
};

export default class OrchestraFile {
    static readonly MIME_TYPE: DOMParserSupportedType = DOMParserSupportedType.APPLICATION_XML;
    static readonly NAMESPACE: string = "http://fixprotocol.io/2020/orchestra/repository";

    private repositoryStatistics = new KeyedCollection<Number>();

    private file: File;
    private document: Document | any = new Document();
    private progressNode: HTMLElement | null;
    private progressFunc: (progressNode: HTMLElement, percent: number) => void;
    private appendOnly: boolean;
    static errorDescription: any;

    constructor(file: File, appendOnly: boolean = false, progressNode: HTMLElement | null, progressFunc: (progressNode: HTMLElement, percent: number) => void) {
        this.file = file;
        this.progressNode = progressNode;
        this.progressFunc = progressFunc;
        this.appendOnly = appendOnly;
    }
    static parse(xml: string): Document | Error {
        const parser = new DOMParser();
        // test namespace of parseerror since it's different between browsers
        let parsererrorNS: string | null = parser.parseFromString('INVALID', 'text/xml').getElementsByTagName("parsererror")[0].namespaceURI;
        let doc: Document = parser.parseFromString(xml, OrchestraFile.MIME_TYPE);
        if (parsererrorNS && doc.getElementsByTagNameNS(parsererrorNS, 'parsererror').length > 0) {
            const errors: any = doc.getElementsByTagNameNS(parsererrorNS, 'parsererror');
            return new Error(OrchestraFile.getErrorMessage(errors[0].getElementsByTagName('div')[0].textContent), );
        } else if (!parsererrorNS && doc.getElementsByTagName('parsererror').length > 0) {
            const errors = doc.getElementsByTagName('parsererror');
            return new Error(OrchestraFile.getErrorMessage(errors[0].textContent));
        } else {
            return doc;
        }
    }
    static removeDocumentNodes = (document: Document): void => {
      const listElements = ["fixr:categories"]
      listElements.forEach(e => {
        const node = document.getElementsByTagName(e)[0];
        if (node) {
            node.remove();
        }
      })
    }
    static serialize(document: Document): string {
        this.removeDocumentNodes(document);
        const serializer = new XMLSerializer();
        const text = serializer.serializeToString(document);
        return xml(text, 2);
    }
    static getErrorMessage(textContent: string | null): string {
        if (!textContent) return "Error parsing XML";
        return textContent;
    }
    get dom(): Document {
        return this.document;
    }
    cloneDom(): Document {
        const newDocument: Document = this.document.implementation.createDocument(this.document.namespaceURI, // namespace to use
            null, // name of the root element (or for empty document)
            null // doctype (null for XML)
        );
        const rootNode: Node | null = this.document.documentElement;
        if (rootNode) {
            const newNode: Node = newDocument.importNode(rootNode, // node to import
                true // clone its descendants
            );
            newDocument.appendChild(newNode);
        }
        return newDocument;
    }
    set dom(document: Document) {
        this.document = document;
    }
    get size(): number {
        return this.file.size;
    }
    get statistics(): KeyedCollection<Number> {
        return this.repositoryStatistics;
    }
    readFile(): Promise<string> {
        const reader = new FileReader();
        return new Promise<string>((resolve, reject) => {
            reader.onload = () => {
                if (this.progressNode) {
                    this.progressFunc(this.progressNode, 100);
                }
                const res = reader.result;
                if (typeof res === "string") {
                    const dom = OrchestraFile.parse(res);
                    if (dom instanceof Error) {
                        reject(dom);
                    } else {
                        this.dom = dom;
                        resolve(res);
                    }
                }
                else if (res) {
                    const stringRes = res.toString();
                    const dom = OrchestraFile.parse(stringRes);
                    if (dom instanceof Error) {
                        reject(dom);
                    } else {
                        this.dom = dom;
                        resolve(stringRes);
                    }
                } else {
                    reject("Failed to read XML file; possibly empty");
                }
            };
            reader.onerror = () => {
                if (this.progressNode) {
                    this.progressFunc(this.progressNode, -1);
                }
                reader.abort();
                if (reader.error && reader.error.toString) {
                  const newError = new Error(reader.error.toString());
                  newError.name = 'Orchestra File';
                  reject(newError);
                }
                reject(reader.error);
            };
            reader.onprogress = (event: ProgressEvent) => {
                if (event.lengthComputable && this.progressNode) {
                    this.progressFunc(this.progressNode, Math.floor(event.loaded * 100 / event.total));
                }
            };
            reader.readAsText(this.file);
        });
    }

    updateDomFromModel(dataModel: SelectionModel, progressNode: HTMLElement | null): void {
        this.updateDomMetadata();
        this.updateDomSections(dataModel.sections);
        this.updateDomMessages(dataModel.messages);
        this.updateDomComponents(dataModel.components);
        this.updateDomGroups(dataModel.groups);
        this.updateDomFields(dataModel.fields);
        this.updateDomCodes(dataModel.codesets);
        this.updateDomDatatypes(dataModel.datatypes);
        if (progressNode) {
            this.progressFunc(progressNode, 100);
        }
    }
    private updateDomMessages(messagesModel: MessageSelectionModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const messagesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const messagesElement: Element = messagesSnapshot.snapshotItem(0) as Element;
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        var countMessagesAdded: number = 0;
        var countMessagesRemoved: number = 0;

        for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
          const node: Element = nodesSnapshot.snapshotItem(i) as Element;
          const name: string = node.getAttribute("name") || "not found";
          if (!messagesModel[name]) {
            messagesElement.removeChild(node);
            countMessagesRemoved++;
          }
          else {
            const messageElement = node;
            const structureElement = messageElement.getElementsByTagName("fixr:structure")[0];
            const refs = structureElement.children;
            if (refs.length > 0) {
              for (let i = refs.length - 1; i >= 0; i--) {
                const refName = refs[i].tagName.split(":")[1];
                const refKey = refName.substring(0, refName.length-3);
                if (messagesModel[name][refKey] && messagesModel[name][refKey].length > 0) {
                  const id: string | null = refs[i].getAttribute("id");
                  const found = messagesModel[name][refKey].find((messageModel) => {
                    return messageModel.id === id
                  });
                  if (!found) {
                    structureElement.removeChild(refs[i]);
                  }
                  else {
                    structureElement.appendChild(refs[i]);
                  }
                }
                else {
                  structureElement.removeChild(refs[i]);
                }
              }
            }
            [].slice.call(structureElement.children).sort(() => (-1)).forEach((val) => { structureElement.appendChild(val); });
            messageElement.appendChild(structureElement);
            countMessagesAdded++;
          }
        }

        this.repositoryStatistics.Add("Messages.Added", countMessagesAdded);
        this.repositoryStatistics.Add("Messages.Removed", countMessagesRemoved);
    }
    private updateDomMetadata(): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:metadata", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const metadataElement: Element = nodesSnapshot.snapshotItem(0) as Element;
        const elementsToRemove: Array<Element> = [
            metadataElement.getElementsByTagName('dc:creator')[0],
            metadataElement.getElementsByTagName('dc:source')[0],
            metadataElement.getElementsByTagName('dc:rights')[0]
        ];
        if (elementsToRemove) elementsToRemove.map(element => element && metadataElement.removeChild(element));
        const contributorElement: Element = this.dom.createElementNS("http://purl.org/dc/elements/1.1/", "dc:contributor");
        const textNode: Text = this.dom.createTextNode("playlist");
        contributorElement.appendChild(textNode);
        metadataElement.appendChild(contributorElement);
        const timestamp: string = new Date().toISOString();
        let dateElement: Element = metadataElement.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "date")[0];
        if (dateElement) {
            dateElement.childNodes[0].nodeValue = timestamp;
        }
        else {
            dateElement = this.dom.createElementNS("http://purl.org/dc/elements/1.1/", "dc:date");
            const timeText: Text = this.dom.createTextNode(timestamp);
            dateElement.appendChild(timeText);
            metadataElement.appendChild(dateElement);
        }
    }
    contents(): Blob {
        return new Blob([OrchestraFile.serialize(this.document)], { type: OrchestraFile.MIME_TYPE });
    }
    public populateOrchestraModelFromDom(orchestraModel: OrchestraModel) {
        this.populateFieldsModelFromDom(orchestraModel.fields);
        this.populateCodesetsModelFromDom(orchestraModel.codesets);
        this.populateComponentsModelFromDom(orchestraModel.components);
        this.populateGroupsModelFromDom(orchestraModel.groups);
        this.poulateMessagesModelFromDom(orchestraModel.messages);
    }
    private populateFieldsModelFromDom(fieldsModel: FieldsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:fields/fixr:field", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let element: Element = iterator.iterateNext() as Element;
        while (element) {
            const elementName: string = element.localName;
            if (elementName === "field") {
                const id: string | null = element.getAttribute("id");
                const name: string | null = element.getAttribute("name");
                const type: string | null = element.getAttribute("type");
                const scenario: string = element.getAttribute("scenario") || "base";
                if (id && name && type) {
                    fieldsModel.add(new FieldModel(id, name, type, scenario));
                }
            }
            element = iterator.iterateNext() as Element;
        }
    }
    private populateCodesetsModelFromDom(codesetsModel: CodesetsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:codeSets/fixr:codeSet", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let codesetElement: Element = iterator.iterateNext() as Element;
        while (codesetElement) {
            const id: string | null = codesetElement.getAttribute("id");
            const name: string | null = codesetElement.getAttribute("name");
            const scenario: string = codesetElement.getAttribute("scenario") || "base";
            const type: string | null = codesetElement.getAttribute("type");
            let supported: string = codesetElement.getAttribute("supported") || "supported";
            if (name && type) {
                const codeset = new CodesetModel(id, name, scenario, type, IsSupportedfromString(supported));
                codesetsModel.set(codeset.key(), codeset);
                let childElement: Element | null = codesetElement.firstElementChild;
                while (childElement) {
                    const elementName: string = childElement.localName;
                    if (elementName === "code") {
                        const id: string | null = childElement.getAttribute("id");
                        const name: string | null = childElement.getAttribute("name");
                        const value: string | null = childElement.getAttribute("value");
                        supported = childElement.getAttribute("supported") || "supported";
                        if (name && value) {
                            const code: CodeModel = new CodeModel(id, name, value, IsSupportedfromString(supported));
                            codeset.add(code);
                        }
                    }
                    childElement = childElement.nextElementSibling;
                }
            }
            codesetElement = iterator.iterateNext() as Element;
        }
    }
    private populateComponentsModelFromDom(componentsModel: ComponentsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let componentElement: Element = iterator.iterateNext() as Element;
        while (componentElement) {
            const elementName: string = componentElement.localName;
            if (elementName === "component") {
                const id: string | null = componentElement.getAttribute("id");
                const name: string | null = componentElement.getAttribute("name");
                const scenario: string = componentElement.getAttribute("scenario") || "base";
                if (id && name) {
                    const componentModel = new ComponentModel(id, name, scenario);
                    componentsModel.add(componentModel);
                    const memberElement: Element | null = componentElement.firstElementChild;
                    if (memberElement) {
                        this.extractStructureMembers(memberElement, componentModel);
                    }
                }
            }
            componentElement = iterator.iterateNext() as Element;
        }
    }
    private populateGroupsModelFromDom(groupsModel: GroupsModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let groupElement: Element = iterator.iterateNext() as Element;
        while (groupElement) {
            const elementName: string = groupElement.localName;
            if (elementName === "group") {
                const id: string | null = groupElement.getAttribute("id");
                const name: string | null = groupElement.getAttribute("name");
                const scenario: string = groupElement.getAttribute("scenario") || "base";
                let memberElement: Element | null = groupElement.firstElementChild;
                if (memberElement && id && name) {
                    const elementName: string = memberElement.localName;
                    if (elementName === "numInGroup") {
                        const numInGroupId: string | null = memberElement.getAttribute("id");
                        if (numInGroupId) {
                            const groupModel = new GroupModel(id, name, numInGroupId, scenario);
                            groupsModel.add(groupModel);
                            memberElement = memberElement.nextElementSibling;
                            if (memberElement) {
                                this.extractStructureMembers(memberElement, groupModel);
                            }
                        }
                    }
                }
            }
            groupElement = iterator.iterateNext() as Element;
        }
    }
    private poulateMessagesModelFromDom(messagesModel: MessagesModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const iterator: XPathResult = this.dom.evaluate("/fixr:repository/fixr:messages/fixr:message", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
        let messageElement: Element = iterator.iterateNext() as Element;
        while (messageElement) {
            let elementName: string = messageElement.localName;
            if (elementName === "message") {
                const id: string | null = messageElement.getAttribute("id");
                const name: string | null = messageElement.getAttribute("name");
                const msgType: string | null = messageElement.getAttribute("msgType");
                let scenario: string = messageElement.getAttribute("scenario") || "base";
                if (name && msgType) {
                    const messageModel: MessageModel = new MessageModel(id, name, msgType, scenario);
                    messagesModel.add(messageModel);
                    let structureElement = messageElement.firstElementChild;
                    if (structureElement) {
                        elementName = structureElement.localName;
                        if (elementName === "structure" && structureElement.firstElementChild) {
                            this.extractStructureMembers(structureElement.firstElementChild, messageModel);
                        }
                    }
                }
            }
            messageElement = iterator.iterateNext() as Element;
        }
    }
    private updateDomCodes(codesetsModel: CodesetSelectionModel): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const codesetsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:codeSets", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const codesetsElement: Element = codesetsSnapshot.snapshotItem(0) as Element;
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:codeSets/fixr:codeSet", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        let countCodesetsRemoved : number = 0;
        let countCodesetsAdded : number = 0;
        let countCodesRemoved : number = 0;
        let countCodesAdded : number = 0;

        for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
          const node: Element = nodesSnapshot.snapshotItem(i) as Element;
          const name: string = node.getAttribute("name") || "not found";
          if (!codesetsModel[name]) {
            codesetsElement.removeChild(node);
            countCodesetsRemoved++;
            // Count how many codes are removed for countCodesRemoved
          }
          else {
            const codesetElement = node;
            const codeElements: HTMLCollectionOf<Element> = codesetElement.getElementsByTagName("fixr:code");
            for (let i: number = codeElements.length - 1; i >= 0; i--) {
              const value: string | null = codeElements[i].getAttribute("name");
              const codeFound = codesetsModel[name].find((codeModel) => (codeModel.codeName === value));
              if (!codeFound) {
                codesetElement.removeChild(codeElements[i]);
                countCodesRemoved++;
              }
              else {
                codesetElement.appendChild(codeElements[i]);
                countCodesAdded++;
              }
            }
            [].slice.call(codesetElement.children).sort(() => (-1)).forEach((val) => { codesetElement.appendChild(val); });
            codesetsElement.appendChild(codesetElement);
            countCodesetsAdded++;
          }
        }

        this.repositoryStatistics.Add("Codesets.Removed", countCodesetsRemoved);
        this.repositoryStatistics.Add("Codesets.Added", countCodesetsAdded);
        this.repositoryStatistics.Add("Codes.Removed", countCodesRemoved);
        this.repositoryStatistics.Add("Codes.Added", countCodesAdded);
    }
    private updateDomFields(fieldsModel: IdSelectionModel[]): void {
        const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
        const fieldsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:fields", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        const fieldsElement: Element = fieldsSnapshot.snapshotItem(0) as Element;
        const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:fields/fixr:field", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        let countFieldsRemoved : number = 0;
        let countFieldsAdded : number = 0;

        for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
            const node: Element = nodesSnapshot.snapshotItem(i) as Element;
            const id: string | null = node.getAttribute("id");
            const fieldFound = fieldsModel.find((fieldModel) => (fieldModel.id === id));
            if (!fieldFound) {
              fieldsElement.removeChild(node);
              countFieldsRemoved++;
            }
            else {
              fieldsElement.appendChild(node);
              countFieldsAdded++;
            }
        }

        this.repositoryStatistics.Add("Fields.Removed",countFieldsRemoved);
        this.repositoryStatistics.Add("Fields.Added",countFieldsAdded);
    }
    private updateDomGroups(groupsModel: GroupSelectionModel): void {
      const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
      const groupsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      const groupsElement: Element = groupsSnapshot.snapshotItem(0) as Element;
      const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:groups/fixr:group", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      let countGroupsRemoved : number = 0;
      let countGroupsAdded : number = 0;

      for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
          const node: Element = nodesSnapshot.snapshotItem(i) as Element;
          const id: string | null = node.getAttribute("id");
          if (!id || !groupsModel[id]) {
            groupsElement.removeChild(node);
            countGroupsRemoved++;
          }
          else {
            const refs = node.children;
            if (refs.length > 0) {
              for (let i = refs.length - 1; i >= 0; i--) {
                const refName = refs[i].tagName.split(":")[1];
                const refKey = refName.substring(0, refName.length-3);
                if (refKey === "field" || refKey === "group" || refKey === "component") {
                  const refId: string | null = refs[i].getAttribute("id");
                  if (!groupsModel[id].includes(`${refKey}:${refId}`)) {
                    node.removeChild(refs[i]);
                  }
                  else {
                    node.appendChild(refs[i]);
                  }
                }
                else {
                  node.appendChild(refs[i]);
                }
              }
            }
            [].slice.call(node.children).sort(() => (-1)).forEach((val) => { node.appendChild(val); });
            countGroupsAdded++;
          }
      }

      this.repositoryStatistics.Add("Groups.Removed", countGroupsRemoved);
      this.repositoryStatistics.Add("Groups.Added", countGroupsAdded);
  }
    private updateDomComponents(componentsModel: ComponentSelectionModel): void {
      const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
      const componentsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      const componentsElement: Element = componentsSnapshot.snapshotItem(0) as Element;
      const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:components/fixr:component", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      var countComponentsAdded: number = 0;
      var countComponentsRemoved: number = 0;

      for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
        const node: Element = nodesSnapshot.snapshotItem(i) as Element;
        const id: string | null = node.getAttribute("id");
        if (!id || !componentsModel[id]) {
          componentsElement.removeChild(node);
          countComponentsRemoved++;
        }
        else {
          const componentElement = node;
          if (!componentsModel[id].all) {
            const refs = node.children;
            if (refs.length > 0) {
              for (let i = refs.length - 1; i >= 0; i--) {
                const refName = refs[i].tagName.split(":")[1];
                const refKey = refName.substring(0, refName.length-3);
                if (componentsModel[id][refKey] && componentsModel[id][refKey].length > 0) {
                  const refId: string | null = refs[i].getAttribute("id");
                  const found = componentsModel[id][refKey].find((componentModel: IdSelectionModel) => {
                    return componentModel.id === refId
                  });
                  if (!found) {
                    componentElement.removeChild(refs[i]);
                  }
                  else {
                    componentElement.appendChild(refs[i]);
                  }
                }
                else {
                  componentElement.removeChild(refs[i]);
                }
              }
              [].slice.call(node.children).sort(() => (-1)).forEach((val) => { node.appendChild(val); });
            }
          }
          componentsElement.appendChild(componentElement);
          countComponentsAdded++;
        }
      }

      this.repositoryStatistics.Add("Components.Added", countComponentsAdded);
      this.repositoryStatistics.Add("Components.Removed", countComponentsRemoved);
  }
    private updateDomDatatypes(datatypesModel: NameSelectionModel[]): void {
      const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
      const datatypesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:datatypes", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      const datatypesElement: Element = datatypesSnapshot.snapshotItem(0) as Element;
      const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:datatypes/fixr:datatype", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      let countDatatypesRemoved : number = 0;
      let countDatatypesAdded : number = 0;

      for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
          const node: Element = nodesSnapshot.snapshotItem(i) as Element;
          const name: string | null = node.getAttribute("name");
          const datatypeFound = datatypesModel.find((datatypeModel) => (datatypeModel.name === name));
          if (!datatypeFound) {
            datatypesElement.removeChild(node);
            countDatatypesRemoved++;
          }
          else {
            datatypesElement.appendChild(node);
            countDatatypesAdded++;
          }
      }

      this.repositoryStatistics.Add("Datatypes.Removed", countDatatypesRemoved);
      this.repositoryStatistics.Add("Datatypes.Added", countDatatypesAdded);
    }
    private updateDomSections(sectionsModel: NameSelectionModel[]): void {
      const namespaceResolver: XPathNSResolver = new XPathEvaluator().createNSResolver(this.dom);
      const sectionsSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:sections", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      const sectionsElement: Element = sectionsSnapshot.snapshotItem(0) as Element;
      const nodesSnapshot: XPathResult = this.dom.evaluate("/fixr:repository/fixr:sections/fixr:section", this.dom, namespaceResolver, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      let countSectionsRemoved : number = 0;
      let countSectionsAdded : number = 0;

      for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
          const node: Element = nodesSnapshot.snapshotItem(i) as Element;
          const name: string | null = node.getAttribute("name");
          const sectionFound = sectionsModel.find((sectionModel) => (sectionModel.name === name));
          if (!sectionFound) {
            sectionsElement.removeChild(node);
            countSectionsRemoved++;
          }
          else {
            sectionsElement.appendChild(node);
            countSectionsAdded++;
          }
      }

      this.repositoryStatistics.Add("Sections.Removed", countSectionsRemoved);
      this.repositoryStatistics.Add("Sections.Added", countSectionsAdded);
    }
    private extractStructureMembers(memberElement: Element, structuralModel: StructureModel): void {
        let nextElement: Element | null = memberElement;
        while (nextElement) {
            const elementName: string = nextElement.localName;
            let memberId: string | null = nextElement.getAttribute("id");
            if (memberId) {
                const presenceStr: string = nextElement.getAttribute("presence") || "optional";
                const presence: Presence = PresencefromString(presenceStr);
                switch (elementName) {
                    case "fieldRef":
                        const fieldRef: FieldRef = new FieldRef(memberId, structuralModel.scenario, presence);
                        if (presence === Presence.Constant) {
                            const value: string | null = memberElement.getAttribute("value");
                            if (value) {
                                fieldRef.value = value;
                            }
                        }
                        else {
                            const assignElement: Element = memberElement.getElementsByTagName("fixr:assign")[0];
                            if (assignElement) {
                                const assignExpression: string | null = assignElement.childNodes[0].nodeValue;
                                if (assignExpression) {
                                    fieldRef.value = assignExpression;
                                }
                            }
                        }
                        structuralModel.addMember(fieldRef);
                        break;
                    case "componentRef":
                        const componentRef: ComponentRef = new ComponentRef(memberId, structuralModel.scenario, presence);
                        structuralModel.addMember(componentRef);
                        break;
                    case "groupRef":
                        const groupRef: GroupRef = new GroupRef(memberId, structuralModel.scenario, presence);
                        structuralModel.addMember(groupRef);
                        break;
                }
            }
            nextElement = nextElement.nextElementSibling;
        }
    }
}
