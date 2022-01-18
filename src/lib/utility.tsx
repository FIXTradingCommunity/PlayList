import {
  CategoryData,
  CodesetData,
  ComponentData,
  DatatypeData,
  DomData,
  FieldData,
  GroupData,
  MessageData,
  OneChildrenTC,
  SectionData,
  TreeControl,
  TwoChildrenTC,
  SelectionModel,
  ThreeChildrenTC
} from './types';
import uniq from 'lodash/uniq';

export default class Utility {
  public static FN(val: string | null): string {
    if (val) {
      return val;
    }
    return "";
  }

  public static ClearObjProps(obj: { [x: string]: any }) {
    Object.keys(obj).forEach(key => {
      delete obj[key];
    });
  }

  public static Log(obj: any) {
    // tslint:disable-next-line:no-console
    console.log(obj);
  }

  public static GetMOPublicKey(): string {
    const pk =
      "-----BEGIN PUBLIC KEY-----\n" +
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzIKQ+V528e3nGaOL72XA\n" +
      "avmL2HAXwdG5+0Cg2X+ezPfSn2U+DxbYOKFyHXfdCj4ocgF1MKk1ECUDhMlZ6vsl\n" +
      "m7ZPuq9Nus6cYeBxSFdKXaC+vI0hpghkGwAl7a6YT4HAbZ3qs+T7My5gaeuXI1j+\n" +
      "8KBOXK8VRDormzQlI0Q+qbfqUSMCNBMsknxFWfgxvvXSBqEOV2Yq0hbp+JSrsB1S\n" +
      "9DefmvNmxUKLDQ65MmInZ7HqfE+ocWt6H0ba9zISCgjSEs4m0fY6fr99EhuQ9vKX\n" +
      "GcxQfvu2qAOHz0te4yQ67xoUGWzMCmZG3TUTfYz+kFVCSJSrmSnTzkppffio7ooA\n" +
      "owIDAQAB\n" +
      "-----END PUBLIC KEY-----\n";

    return pk;
  }

  public static mapOrchestraDom(data: any) {
    const sections: SectionData | undefined = data.find(
      (data: DomData) => data.name === 'fixr:sections'
    );
    const categories: CategoryData | undefined = data.find(
      (data: DomData) => data.name === 'fixr:categories'
    );
    const messages: MessageData | undefined = data.find(
      (data: DomData) => data.name === 'fixr:messages'
    );
    const components: ComponentData | undefined = data.find(
      (data: DomData) => data.name === 'fixr:components'
    );
    const fields: FieldData | undefined = data.find(
      (data: DomData) => data.name === 'fixr:fields'
    );
    const codesets: CodesetData | undefined = data.find(
      (data: DomData) => data.name === 'fixr:codeSets'
    );
    const datatypes: DatatypeData | undefined = data.find(
      (data: DomData) => data.name === 'fixr:datatypes'
    );
    const groups: GroupData = data.find(
      (data: DomData) => data.name === 'fixr:groups'
    );

    const fieldNames = fields && fields.elements && fields.elements.reduce((fields: { [key: string]: string }, field) => {
      const { id, name, type } = field.attributes;
      fields[id] = `${name}(${id}) - Type ${type}`;
      return fields;
    }, {});
    const componentNames = components && components.elements && components.elements.reduce((components: { [key: string]: string }, component) => {
      const { id, name } = component.attributes;
      components[id] = `${name} - Component`;
      return components;
    }, {});
    const groupNames = groups && groups.elements && groups.elements.reduce((groups: { [key: string]: string }, group) => {
      const { id, name } = group.attributes;
      groups[id] = `${name} - Group`;
      return groups;
    }, {});
    
    return {
      sections,
      categories,
      messages,
      components,
      fields,
      codesets,
      datatypes,
      groups,
      fieldNames,
      componentNames,
      groupNames
    }
  }

  public static groupSelectedItems(selectedItems: Array<string>, groupList: any) {
    // parse selected keys into array of items
    const itemList: string[] = [];
    selectedItems.forEach((selectedItem) => {
      const items = selectedItem.split("->");
      items.forEach((item) => {
        itemList.push(item);
      });
    });
    const newItemList = uniq(itemList);

    // divide items according to their types
    const dataModel = newItemList.reduce((data: SelectionModel, newItem) => {
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
          if (splittedCodeset.length > 1) {
            const codesetName = splittedCodeset[0].split(':')[1];
            const codeName = splittedCodeset[1].split(':')[1];
            if (data.codesets[codesetName]) {
              data.codesets[codesetName].push({ "codeName": codeName })
            }
            else {
              data.codesets[codesetName] = [{ "codeName": codeName }];
            }
          }
          break;
        case "group":
          const splittedGroup = newItem.split('-');
          const groupName = splittedGroup[0].split(':')[1];
          if (!data.groups[groupName]) {
            data.groups[groupName] = splittedGroup.length > 1 ? [splittedGroup[1]] : [];
          }
          else if (splittedGroup.length > 1) {
            data.groups[groupName].push(splittedGroup[1]);
          }
          const foundGroup = groupList.elements.find((group: any) => (group.attributes.id === groupName));
          if (foundGroup) {
            const numInGroup = foundGroup.elements.find((ref: any) => (ref.name === "fixr:numInGroup"));
            if (numInGroup) {
              data.fields.push({ "id": numInGroup.attributes.id });
              if (!data.datatypes.includes({ "name": "NumInGroup" })) {
                data.datatypes.push({ "name": "NumInGroup" }, { "name": "int" });
              }
            }
          }
          break;
        case "message":
          const splittedMessage = newItem.split('-');
          if (splittedMessage.length > 1) {
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
                data.components[componentName] = { all: false };
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
      groups: {},
      messages: {},
      components: {}
    });
    return dataModel;
  }

  public static createInitialTree(data: { [key: string]: any }) {
    const res: TreeControl = [];
    const mappedKeys: { [key: string]: Array<string> } = {};
    const {
      categories,
      messages,
      components,
      fields,
      codesets,
      datatypes,
      groups,
      fieldNames,
      componentNames,
      groupNames
    } = data;

    const getReferencesNames = (referenceType: string, referenceId: string) => {
      switch(referenceType) {
        case 'fieldRef':
          return fieldNames[referenceId];
        case 'componentRef':
          return componentNames[referenceId];
        case 'groupRef':
          return groupNames[referenceId];
        default:
          break;
      }
    }

    // MAP CATEGORIES
    if (categories && categories.elements) {
      const categoriesObject: ThreeChildrenTC = {
        value: 'Messages',
        label: 'MESSAGES',
        children: []
      };
      const categoriesIndexes: any = {};
      categories.elements.forEach((category: any) => {
        const { name, section } = category.attributes;
        if (name !== 'Common' && name !== 'Fields' && name !== 'ImplFields') {
          const categoryKey = `section:${section}->category:${name}`;
          categoriesIndexes[name] = { index: categoriesObject.children.length, key: categoryKey };
        }
      });
      // MAP MESSAGES
      if (messages && messages.elements) {
        messages.elements.forEach((message: any) => {
          const { name, category, msgType } = message.attributes;
          const { key } = categoriesIndexes[category];
          const messageKey = `${key}->message:${name}`;
          const messageName = `${name}(35=${msgType})`;
          const messageStructure = message.elements.find((msg: any) => {
            return msg.name === "fixr:structure"
          });

          if (messageStructure) {
            const newMessageChildren = messageStructure.elements.filter((msgStc: any) => 
              msgStc.name === "fixr:fieldRef" || msgStc.name === "fixr:groupRef" || msgStc.name === "fixr:componentRef"
            ).map((ref: any) => {
              const refName = ref.name.split(":")[1];
              const refKey = `${refName.toLowerCase().substring(0, refName.length-3)}:${ref.attributes.id}`;
              const refValue = `${messageKey}-${refKey}->${refKey}`;
              return {
                value: refValue,
                label: getReferencesNames(refName, ref.attributes.id || ''),
                className: ref.attributes.deprecated && 'deprecatedItem'
              }
            });
            if (newMessageChildren.length > 0) {
              const newMessage: OneChildrenTC = {
                value: messageKey,
                label: messageName,
                children: newMessageChildren
              };
              categoriesObject.children.push(newMessage as any);
            }
          }
        });
      }
      
      categoriesObject.children.sort((a: any, b: any) => a.label > b.label ? 1 : a.label < b.label ? -1 : 0);
      categoriesObject.children.forEach((message: any) => {
        message.children.sort((a: any, b: any) => a.label > b.label ? 1 : a.label < b.label ? -1 : 0)
      })
      res.push(categoriesObject);
    }
  
    // MAP GROUPS
    if (groups && groups.elements) {
      const groupsObject: TwoChildrenTC = {
        value: 'Groups',
        label: 'GROUPS',
        children: []
      };
      groups.elements.forEach((group: any) => {
        const { id, name, deprecated } = group.attributes;
        const groupKey = `group:${id}`;
        const newGroupChildren = group.elements.filter((grp: any) => 
          grp.name === "fixr:fieldRef" || grp.name === "fixr:groupRef" || grp.name === "fixr:componentRef"
        ).map((ref: any) => {
          const refName = ref.name.split(":")[1];
          const refKey = `${refName.toLowerCase().substring(0, refName.length-3)}:${ref.attributes && ref.attributes.id}`;
          const refValue = `${groupKey}-${refKey}->${refKey}`;
          if (mappedKeys[groupKey]) {
            mappedKeys[groupKey].push(refKey, refValue);
          } 
          else {
            mappedKeys[groupKey] = [refKey, refValue];
          }
          return {
            value: refValue,
            label: getReferencesNames(refName, ref.attributes ? ref.attributes.id : ''),
            className: ref.attributes.deprecated && 'deprecatedItem'
          }
        });
        if (newGroupChildren.length > 0) {
          groupsObject.children.push({
            value: groupKey,
            label: name,
            children: newGroupChildren,
            className: deprecated && 'deprecatedItem'
          });
        }
      });

      groupsObject.children.sort((a: any, b: any) => {
        if (a.label > b.label) { return 1 };
        if (a.label < b.label) { return -1 };
        return 0;
      });

      res.push(groupsObject);
    }

    // MAP COMPONENTS
    if (components && components.elements) {
      const componentsObject: TwoChildrenTC = {
        value: 'Components',
        label: 'COMPONENTS',
        children: []
      };
      components.elements.forEach((component: any) => {
        const { id, name, deprecated } = component.attributes;
        const componentKey = `component:${id}`;
        const newComponentChildren = component.elements.filter((cmp: any) => 
          cmp.name === "fixr:fieldRef" || cmp.name === "fixr:groupRef" || cmp.name === "fixr:componentRef"
        ).map((ref: any) => {
          const refName = ref.name.split(":")[1];
          const refKey = `${refName.toLowerCase().substring(0, refName.length-3)}:${ref.attributes && ref.attributes.id}`;
          const refValue = `${componentKey}-${refKey}->${refKey}`;
          if (mappedKeys[componentKey]) {
            mappedKeys[componentKey].push(refKey, refValue);
          } 
          else {
            mappedKeys[componentKey] = [refKey, refValue];
          }
          return {
            value: refValue,
            label: getReferencesNames(refName, ref.attributes ? ref.attributes.id : ''),
            className: ref.attributes.deprecated && 'deprecatedItem'
          }
        });
        if (newComponentChildren.length > 0) {
          componentsObject.children.push({
            value: componentKey,
            label: name,
            children: newComponentChildren,
            className: deprecated && 'deprecatedItem'
          });
        }
      });

      componentsObject.children.sort((a: any, b: any) => {
        if (a.label > b.label) { return 1 };
        if (a.label < b.label) { return -1 };
        return 0;
      });

      res.push(componentsObject);
    }

    // MAP FIELDS
    if (fields && fields.elements) {
      const fieldsObject = this.createFieldNodes(fields, codesets, mappedKeys).fieldsOut;
      res.push(fieldsObject);
    }

    // MAP CODESETS
    if (codesets && codesets.elements) {
      const codesetsObject: TwoChildrenTC = {
        value: 'Codesets',
        label: 'CODESETS',
        children: codesets.elements.map((codeset: any) => {
          const { name, type } = codeset.attributes;
          const codesetKey = `codeset:${name}`;
          return {
            value: codesetKey,
            label: `${name} - Type ${type}`,
            children: codeset.elements
              .map((code: any) => {
                if (code.attributes) {
                  const { name, value, deprecated } = code.attributes;
                  const codeKey = `${codesetKey}-code:${name}`;
                  if (mappedKeys[codesetKey]) {
                    mappedKeys[codesetKey].push(codeKey);
                  } 
                  else {
                    mappedKeys[codesetKey] = [codeKey];
                  }
                  return {
                    value: codeKey,
                    label: `${value}=${name}`,
                    className: deprecated && 'deprecatedItem'
                  };
                } else {
                  return {
                    value: '',
                    label: ''
                  };
                }
              })
              .filter((data: any) => {
                return data.value !== '';
              })
          };
        })
      };

      codesetsObject.children.sort((a: any, b: any) => {
        if (a.label > b.label) { return 1 };
        if (a.label < b.label) { return -1 };
        return 0;
      });
      codesetsObject.children.forEach((codeset: any) => {
        codeset.children.sort((a: any, b: any) => {
          const rexSort1 = a.label.split('=')[0];
          const rexSort2 = b.label.split('=')[0];
          if (!isNaN(rexSort1) && !isNaN(rexSort2)) {
            return rexSort1 - rexSort2;
          }
          else if (isNaN(rexSort1) && isNaN(rexSort2)) {
            if (a.label > b.label) { return 1 };
            if (a.label < b.label) { return -1 };
          }
          else if (!isNaN(rexSort1)) {
            return -1;
          }
          else {
            return 1;
          }
          return 0;
        });
      });

      res.push(codesetsObject);
    }

    // MAP DATATYPES
    if (datatypes && datatypes.elements) {
      const datatypesObject: OneChildrenTC = {
        value: 'Datatypes',
        label: 'DATATYPES',
        children: datatypes.elements.filter((datatype: any) => (
          datatype.attributes.name !== "NumInGroup"
        )).map((datatype: any) => {
          const { name, baseType } = datatype.attributes;
          const datatypeName = baseType
            ? `${name} - Base Type ${baseType}`
            : name;
          const datatypeKey = `datatype:${name}`;
          return {
            value: datatypeKey,
            label: datatypeName,
            disabled: true
          };
        })
      };

      datatypesObject.children.sort((a: any, b: any) => {
        if (a.label > b.label) { return 1 };
        if (a.label < b.label) { return -1 };
        return 0;
      });

      res.push(datatypesObject);
    }

    return {
      initialTree: res,
      mappedKeys
    };
  }

  public static createFieldNodes = (fields: any, codesets: any, mappedKeys: any, checkedFields: any = []) => {
    const fieldsList: TwoChildrenTC['children'] = [{
      value: 'tags:1-999',
      label: 'Tags 1-999',
      disabled: true,
      children: []
    }, {
      value: 'tags:1000-1999',
      label: 'Tags 1000-1999',
      disabled: true,
      children: []
    }, {
      value: 'tags:2000-2999',
      label: 'Tags 2000-2999',
      disabled: true,
      children: []
    }, {
      value: 'tags:3000-3999',
      label: 'Tags 3000-3999',
      disabled: true,
      children: []
    }, {
      value: 'tags:4000-4999',
      label: 'Tags 4000-4999',
      disabled: true,
      children: []
    }, {
      value: 'tags:5000-9999',
      label: 'Tags 5000-9999',
      disabled: true,
      children: []
    }, {
      value: 'tags:10000-19999',
      label: 'Tags 10000-19999',
      disabled: true,
      children: []
    }, {
      value: 'tags:20000-39999',
      label: 'Tags 20000-39999',
      disabled: true,
      children: []
    }, {
      value: 'tags:40000-49999',
      label: 'Tags 40000-49999',
      disabled: true,
      children: []
    }];
    
    fields.elements.forEach((field: any) => {
      const { id, name, type, deprecated } = field.attributes;
      if (type !== 'NumInGroup') {
        const fieldKey = `field:${id}`;
        let typeRef;
        let mapKeys = [];
        if (type.includes('CodeSet')) {
          const codeset = codesets.elements.find((cset: any) => cset.attributes.name === type);
          typeRef = `${codeset.attributes.name} - Type ${codeset.attributes.type}`;
          mapKeys.push(`codeset:${type}`, `datatype:${codeset.attributes.type}`)
        }
        else {
          typeRef = `Type ${type}`;
          mapKeys.push(`datatype:${type}`);
        }
        if (mappedKeys[fieldKey]) {
          mappedKeys[fieldKey].push(...mapKeys);
        } 
        else {
          mappedKeys[fieldKey] = [...mapKeys];
        }

        const fieldName = `${name}(${id}) - ${typeRef}`;
        const fieldNode = {
          value: fieldKey,
          label: fieldName,
          disabled: true,
          className: deprecated && 'deprecatedItem'
        };

          if (id >= 1 && id <= 999) fieldsList[0].children.push(fieldNode)
          else if (id >= 1000 && id <= 1999) fieldsList[1].children.push(fieldNode)
          else if (id >= 2000 && id <= 2999) fieldsList[2].children.push(fieldNode)
          else if (id >= 3000 && id <= 3999) fieldsList[3].children.push(fieldNode)
          else if (id >= 4000 && id <= 4999) fieldsList[4].children.push(fieldNode)
          else if (id >= 5000 && id <= 5999) fieldsList[5].children.push(fieldNode)
          else if (id >= 10000 && id <= 19999) fieldsList[6].children.push(fieldNode)
          else if (id >= 20000 && id <= 39999) fieldsList[7].children.push(fieldNode)
          else if (id >= 40000 && id <= 49999) fieldsList[8].children.push(fieldNode)
        // }
      }
    });

    const fieldsOut: TwoChildrenTC = {
      value: 'FieldsOut',
      label: 'FIELDS',
      showCheckbox: false,
      children: fieldsList.filter((fieldNode: any) => (fieldNode.children.length > 0))
    };
    fieldsOut.children.forEach((fieldGroup: any) => {
      fieldGroup.children.sort((a: any, b: any) => (
        a.value.split(':')[1] - b.value.split(':')[1]
      ));
    })

    return { fieldsOut };
  }

  public static capitalize = (word: string) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  };
}
