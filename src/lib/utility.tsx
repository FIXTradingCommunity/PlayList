import {
  CategoryData,
  CategoryIndexes,
  CodesetData,
  ComponentData,
  DatatypeData,
  DomData,
  FieldData,
  GroupData,
  FourChildrenTC,
  MessageData,
  OneChildrenTC,
  SectionData,
  SectionIndexes,
  TreeControl,
  TwoChildrenTC
} from './types';

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
    const res: TreeControl = [];
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

    const fieldNames = fields && fields.elements.reduce((fields: any, field) => {
      const { id, name, type } = field.attributes;
      fields[id] = `Field ${name}(${id}) - Type ${type}`;
      return fields;
    }, {});
    const componentNames = components && components.elements.reduce((components: any, component) => {
      const { id, name } = component.attributes;
      components[id] = `Component ${name}`;
      return components;
    }, {});
    const groupNames = groups && groups.elements.reduce((groups: any, group: any) => {
      const { id, name } = group.attributes;
      groups[id] = `Group ${name}`;
      return groups;
    }, {});

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
  
    // MAP SECTIONS
    if (sections && sections.elements) {
      const sectionsIndexes: SectionIndexes = {};
      const categoriesIndexes: CategoryIndexes = {};
      const sectionsObject: FourChildrenTC = {
        value: 'sections',
        label: 'Sections',
        children: []
      };
      sections.elements.forEach((section, index) => {
        const { name } = section.attributes;
        const sectionKey = `section:${name}`;
        sectionsIndexes[name.toLowerCase()] = { value: index, categories: {}, modelKey: sectionKey };
        sectionsObject.children.push({
          value: sectionKey,
          label: name,
          children: []
        });
      });

      // MAP CATEGORIES
      if (categories && categories.elements) {
        categories.elements.forEach((category) => {
          const { name, section } = category.attributes;
          if (section) {
            const sectionName = section.toLowerCase();
            const { value, modelKey } = sectionsIndexes[sectionName];
            const newIndex = Object.keys(sectionsIndexes[sectionName].categories).length;
            sectionsIndexes[sectionName].categories[name.toLowerCase()] = newIndex;
            const categoryKey = `${modelKey}->category:${name}`;
            categoriesIndexes[name.toLowerCase()] = {
              sectionName,
              sectionIndex: value,
              modelKey: categoryKey
            };
            sectionsObject.children[value].children.push({
              value: categoryKey,
              label: `Category ${name}`,
              children: []
            });
          }
        });

        // MAP MESSAGES
        if (messages && messages.elements) {
          messages.elements.forEach((message) => {
            const { name, category, msgType } = message.attributes;
            const { sectionIndex, sectionName, modelKey } = categoriesIndexes[category.toLowerCase()];
            const categoryIndex = sectionsIndexes[sectionName].categories[category.toLowerCase()];
            const messageKey = `${modelKey}->message:${name}`;
            const messageStructure = message.elements.find((msg) => {
              return msg.name === "fixr:structure"
            });
            if (messageStructure) {
              const newMessage: OneChildrenTC = {
                value: messageKey,
                label: `Message ${name} - Type ${msgType}`,
                children: messageStructure.elements.map((ref) => {
                  const refName = ref.name.split(":")[1];
                  const refKey = `${refName.toLowerCase().substring(0, refName.length-3)}:${ref.attributes.id}`;
                  return {
                    value: `${messageKey}-${refKey}->${refKey}`,
                    label: getReferencesNames(refName, ref.attributes.id || '')
                  }
                })
              };
              sectionsObject.children[sectionIndex].children[categoryIndex].children.push(newMessage);
            }
          });
        }

        // MAP COMPONENTS
        if (components && components.elements) {
          components.elements.forEach((component) => {
            const { id, name, category } = component.attributes;
            if (categoriesIndexes[category.toLowerCase()]) {
              const { sectionIndex, sectionName, modelKey } = categoriesIndexes[category.toLowerCase()];
              const categoryIndex = sectionsIndexes[sectionName].categories[category.toLowerCase()];
              const componentKey = `${modelKey}->component:${id}`;
              const newComponent: OneChildrenTC = {
                value: componentKey,
                label: `Component ${name}`,
                children: component.elements.filter(({ name }) => {
                  return name !== "fixr:annotation"
                }).map((ref) => {
                  const refName = ref.name.split(":")[1];
                  const refKey = `${refName.toLowerCase().substring(0, refName.length-3)}:${ref.attributes && ref.attributes.id}`;
                  return {
                    value: `${componentKey}-${refKey}->${refKey}`,
                    label: getReferencesNames(refName, ref.attributes && ref.attributes.id || '')
                  }
                })
              }
              sectionsObject.children[sectionIndex].children[
                categoryIndex
              ].children.push(newComponent);
            }
          });
        }
      }
      res.push(sectionsObject);
    }

    // MAP FIELDS
    if (fields && fields.elements) {
      const fieldsObject: OneChildrenTC = {
        value: 'fields',
        label: 'Fields',
        children: fields.elements.map((field) => {
          const { id, name, type } = field.attributes;
          const fieldName = `${name} - Type ${type}`;
          return {
            value: `field:${id}`,
            label: fieldName,
          };
        })
      };
      res.push(fieldsObject);
    }

    // MAP CODESETS
    if (codesets && codesets.elements) {
      const codesetsObject: TwoChildrenTC = {
        value: 'codesets',
        label: 'Codesets',
        children: codesets.elements.map((codeset) => {
          const { name } = codeset.attributes;
          const codesetKey = `codeset:${name}`;
          return {
            value: codesetKey,
            label: name,
            children: codeset.elements
              .map((code) => {
                if (code.attributes) {
                  const { name, value } = code.attributes;
                  const codeKey = `${codesetKey}-code:${name}`;
                  return {
                    value: codeKey,
                    label: `${name} - Value: ${value}`
                  };
                } else {
                  return {
                    value: '',
                    label: ''
                  };
                }
              })
              .filter((data) => {
                return data.value !== '';
              })
          };
        })
      };
      res.push(codesetsObject);
    }

    // MAP DATATYPES
    if (datatypes && datatypes.elements) {
      const datatypesObject: OneChildrenTC = {
        value: 'datatypes',
        label: 'Datatypes',
        children: datatypes.elements.map((datatype) => {
          const { name, baseType } = datatype.attributes;
          const datatypeName = baseType
            ? `Datatype ${name} - Type ${baseType}`
            : `Datatype ${name}`;
          const datatypeKey = `datatype:${name}`;
          return {
            value: datatypeKey,
            label: datatypeName
          };
        })
      };
      res.push(datatypesObject);
    }

    return res;
  }

  public static capitalize = (word: string) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  };
}
