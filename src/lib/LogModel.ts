/*!
 * Copyright 2019, FIX Protocol Ltd.
 */

import CodesetModel, { CodeModel } from "./CodesetModel";
import { messageScenarioKeysType } from "./ConfigurationFile";
import MessageInstance, { FieldInstance } from "./MessageInstance";
import MessageModel, { FieldContext, FieldModel, FieldRef, GroupModel } from "./MessageModel";
import OrchestraModel from "./OrchestraModel";
import { IsSupported, Presence, StructureMember, StructureModel } from "./StructureModel";
import * as Collections from 'typescript-collections';

/**
 * Updates an OrchestraModel from log messages
 */
export default class LogModel {
    private orchestraModel: OrchestraModel;
    private scenarioKeys: messageScenarioKeysType | undefined = undefined;

    /**
     * @param orchestraModel model to update from logs
     */
    constructor(orchestraModel: OrchestraModel) {
        this.orchestraModel = orchestraModel;
    }
    get model(): OrchestraModel {
        return this.orchestraModel;
    }

    get messageScenarioKeys(): messageScenarioKeysType | undefined {
        return this.scenarioKeys;
    }

    set messageScenarioKeys(keys: messageScenarioKeysType | undefined) {
        this.scenarioKeys = keys;
    }

    /**
     * Returns a message scenario corresponding to a message instance
     * @param message a message instance
     * @returns a message scenario from the model, or a new one if not previously defined,
     * or undefined if there is a failure due to malformed message, etc.
     */
    getMessageScenario(messageInstance: MessageInstance): MessageModel | undefined {
        // Get existing message scenario candidates by msgType
        const messageModels: MessageModel[] = this.model.messages.getByMsgType(messageInstance.msgType);
        // Get pre-defined scenario differentiators by msgType 
        if (this.scenarioKeys) {
            const key = this.scenarioKeys.keys.filter(v => v.msgType === messageInstance.msgType)[0];
            if (key) {
                // Locate the key field values in ths message instance. If a field is not found, represent it as null value.
                const fieldInstances: FieldInstance[] = new Array<FieldInstance>();
                for (let fieldId of key.fieldIds) {
                    const fieldInstance: FieldInstance | undefined = messageInstance.find(field => field.tag === fieldId);
                    if (fieldInstance) {
                        fieldInstances.push(fieldInstance);
                    }
                    else {
                        fieldInstances.push(new FieldInstance(fieldId, null));
                    }
                }
                // Try to match one of the existing message scenarios
                for (let m of messageModels) {
                    let modelKeyFields: FieldInstance[] | undefined = m.keyFields;
                    if (!modelKeyFields) {
                        modelKeyFields = this.orchestraModel.generateKeyFields(m.scenario);
                        m.keyFields = modelKeyFields;
                    }
                    // A match found, return it
                    if (modelKeyFields && FieldInstance.arrayEquals(fieldInstances, modelKeyFields)) {
                        return m;
                    }
                }
                // No matching message scenario so create it by cloning the default scenario            
                const messageIndex = messageModels.findIndex(m => m.scenario === MessageModel.defaultScenario);
                let scenarioToClone: MessageModel;
                if (messageIndex !== -1) {
                    scenarioToClone = messageModels[messageIndex];
                }
                else {
                    // No default scenario, fall back to the first one encountered
                    scenarioToClone = messageModels[0];
                }
                const scenarioName: string | undefined = this.orchestraModel.generateScenarioName(fieldInstances);
                if (scenarioName) {
                    const messageModel: MessageModel = scenarioToClone.clone(scenarioName);
                    messageModel.keyFields = fieldInstances;
                    this.model.messages.add(messageModel);
                    return messageModel;
                }
            }
            // No match found, so return default scenario
            const index = messageModels.findIndex(m => m.scenario === MessageModel.defaultScenario);
            if (index !== -1) {
                const defaultScenario: MessageModel = messageModels[index];
                return defaultScenario;
            }
            else {
                // Default message scenario not found so create it
                if (messageInstance.msgType) {
                    const messageModel: MessageModel = new MessageModel(null, messageInstance.msgType, messageInstance.msgType, MessageModel.defaultScenario);
                    this.model.messages.add(messageModel);
                    return messageModel;
                }
            }
        }
    }
    messageListener = (messageInstance: MessageInstance) => {
        // skip a malformed message
        if (!messageInstance.msgType) {
            return;
        }
        const messageModel: MessageModel | undefined = this.getMessageScenario(messageInstance);
        if (!messageModel) {
            // must be a malformed message
            return;
        }
        let parseState: ParseState = new ParseState();
        for (let fieldInstance of messageInstance) {          
            // find this field in the existing message model or one of its nested components
            let fieldContext: FieldContext | undefined = messageModel.findFieldRef(fieldInstance.tag);
            if (!fieldContext) {
                let groupState: GroupState | undefined  = parseState.advance(fieldInstance);
                let fieldRef: FieldRef = new FieldRef(fieldInstance.tag, FieldModel.defaultScenario, Presence.Optional);
                if (groupState && groupState.instance < groupState.instances) {
                    // if not already in the group and group intance less than numInGroup, add it to the group
                    // todo: warn about unknown field at end of last group instance
                    fieldContext = [fieldRef, groupState.group, undefined];
                    groupState.group.addMember(fieldRef);
                } else {
                    // else add field to message root
                    fieldContext = [fieldRef, messageModel, undefined];
                    messageModel.addMember(fieldRef);
                }
                
                fieldRef.field = this.orchestraModel.fields.getById(fieldInstance.tag, FieldModel.defaultScenario);
                if (!fieldRef.field) {
                    // add a new field of default datatype, no codeset inference
                    // field name must begin with alpha character
                    fieldRef.field = new FieldModel(fieldRef.id, "Field" + fieldRef.id.toString(), FieldModel.defaultDatatype, FieldModel.defaultScenario);
                    this.orchestraModel.fields.add(fieldRef.field);
                }
            }
            else {
                parseState.advanceWithContext(fieldInstance, fieldContext);
                let fieldRef: FieldRef = fieldContext[0];
                if (!fieldRef.field) {
                    // set the field it is already defined for this scenario
                    fieldRef.field = this.model.fields.getById(fieldInstance.tag, messageModel.scenario);
                    if (!fieldRef.field) {
                        // only create a field with this scenario if it has a codeset; otherwise use base scenario.
                        const defaultField: FieldModel | undefined = this.model.fields.getById(fieldInstance.tag, FieldModel.defaultScenario);
                        if (defaultField) {
                            let codesetKey: string = CodesetModel.key(defaultField.datatype, FieldModel.defaultScenario);
                            const defaultCodeset: CodesetModel | undefined = this.model.codesets.get(codesetKey);
                            if (defaultCodeset) {
                                codesetKey = CodesetModel.key(defaultField.datatype, messageModel.scenario);
                                fieldRef.codeset = this.model.codesets.get(codesetKey);
                                if (!fieldRef.codeset) {
                                    // if the codeset exists in base scenario, clone it
                                    fieldRef.codeset = defaultCodeset.clone(messageModel.scenario);
                                    this.model.codesets.set(codesetKey, fieldRef.codeset);
                                }
                                // clone the field for this scenario
                                fieldRef.field = defaultField.clone(messageModel.scenario);
                                this.orchestraModel.fields.add(fieldRef.field);
                            }
                            else {
                                fieldRef.field = defaultField;
                            }
                        }
                    }
                }
            }
            this.incrementUse(fieldContext, fieldInstance);
        }
    }

    private incrementUse(fieldContext: FieldContext, fieldInstance: FieldInstance) {
        let fieldRef: FieldRef = fieldContext[0];
        // increment use of this fieldRef
        fieldRef.use();
        // increment use of the component, group or message containing this fieldRef
        if (fieldContext[1]) {
            const sm: StructureModel = fieldContext[1];
            sm.use();
        }
        // increment use of componentRef or groupRef
        if (fieldContext[2]) {
            const sm: StructureMember = fieldContext[2];
            sm.use();
        }
        if (fieldRef.codeset && fieldInstance.value) {
            let code: CodeModel | undefined = fieldRef.codeset.getByValue(fieldInstance.value);
            if (!code) {
                // add a code not in reference model
                code = new CodeModel(null, fieldInstance.value, fieldInstance.value, IsSupported.Supported);
                fieldRef.codeset.add(code);
            }
            if (code) {
                code.use();
            }
        }
    }
}

class GroupState {
    private _group: GroupModel;
    private _instance: number = 0;
    private _instances: number;

    constructor(group: GroupModel, instances: number) {
        this._group = group;
        this._instances = instances;
    }

    public get group(): GroupModel {
        return this._group;
    }

    public get instance(): number {
        return this._instance;
    }

    public get instances(): number {
        return this._instances;
    }

    public nextInstance(): void {
        this._instance++;
    }
}

class ParseState {
    private groupStack = new Collections.Stack<GroupState>();

    advanceWithContext(fieldInstance: FieldInstance, fieldContext: FieldContext): void {
        // if in a new group not already on stack, push it on the stack
        // if in a group already on stack, pop nested groups
        // if first field of the group, increment group instance
        let lastGroupState: GroupState | undefined = this.groupStack.peek();
        if (fieldContext[1] instanceof GroupModel) {
            let inGroup: GroupModel = fieldContext[1];
            if (!lastGroupState || inGroup !== lastGroupState.group) { 
                let depth: number = 0;  
                this.groupStack.forEach((a: GroupState): boolean | void => {
                    if (a.group !== inGroup) {
                        depth++;
                    } else {
                        return false;
                    }
                }
                );
                for (let i = 0; i < depth; i++) {
                    this.groupStack.pop();
                }
                if (depth === 0) {
                    this.groupStack.push(new GroupState(inGroup, Number(fieldInstance.value)));
                }
            } else {
                let first = lastGroupState.group.members[0];
                if (first instanceof FieldRef) {
                    if (first.id === fieldInstance.tag) {
                        lastGroupState.nextInstance();
                    }
                } 
            }
        } else if (fieldContext[1] instanceof MessageModel) {
            // in the message root, no active group
            this.groupStack.clear();
        }
    }

    advance(fieldInstance: FieldInstance): GroupState | undefined {
        return this.groupStack.peek();
    }
}