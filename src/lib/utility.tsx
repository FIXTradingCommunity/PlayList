import {
  TreeControl,
  SectionIndexes,
  CategoryIndexes,
  OneChildrenTC,
  TwoChildrenTC,
  FourChildrenTC,
  DomData,
  SectionData,
  CategoryData,
  MessageData,
  ComponentData,
  FieldData,
  CodesetData,
  DatatypeData
} from './utilityTypes';

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
        sectionsIndexes[name.toLowerCase()] = { value: index, categories: {} };
        sectionsObject.children.push({
          value: name.toLowerCase(),
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
            const sectionIndex = sectionsIndexes[sectionName].value;
            const newIndex = Object.keys(sectionsIndexes[sectionName].categories).length;
            sectionsIndexes[sectionName].categories[name.toLowerCase()] = newIndex;
            categoriesIndexes[name.toLowerCase()] = {
              sectionName,
              sectionIndex
            };
            const categoryName = `Category ${name}`;
            sectionsObject.children[sectionIndex].children.push({
              value: categoryName.toLowerCase(),
              label: categoryName,
              children: []
            });
          }
        });

        // MAP MESSAGES
        if (messages && messages.elements) {
          messages.elements.forEach((message) => {
            const { name, category, msgType } = message.attributes;
            const { sectionIndex, sectionName } = categoriesIndexes[category.toLowerCase()];
            const categoryIndex = sectionsIndexes[sectionName].categories[category.toLowerCase()];
            const messageName = `Message ${name} - Type ${msgType}`;
            const messageStructure = message.elements.find((msg) => {
              return msg.name === "fixr:structure"
            });
            if (messageStructure) {
              const newMessage: OneChildrenTC = {
                value: messageName.toLowerCase(),
                label: messageName,
                children: messageStructure.elements.map((ref) => {
                  const refName = `${Utility.capitalize(ref.name.split(":")[1])} ${ref.attributes.id}`
                  return {
                    value: refName.toLowerCase(),
                    label: refName
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
            const { name, category } = component.attributes;
            if (categoriesIndexes[category.toLowerCase()]) {
              const { sectionIndex, sectionName } = categoriesIndexes[category.toLowerCase()];
              const categoryIndex = sectionsIndexes[sectionName].categories[category.toLowerCase()];
              const componentName = `Component ${name}`;
              const newComponent: OneChildrenTC = {
                value: componentName.toLowerCase(),
                label: componentName,
                children: component.elements.filter(({ name }) => {
                  return name !== "fixr:annotation"
                }).map((ref) => {
                  const refName = `${Utility.capitalize(ref.name.split(":")[1])} ${ref.attributes && ref.attributes.id}`
                  return {
                    value: refName.toLowerCase(),
                    label: refName
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
          const { name, type } = field.attributes;
          const fieldName = `${name} - Type ${type}`;
          return {
            value: fieldName.toLowerCase(),
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
          return {
            value: name.toLowerCase(),
            label: name,
            children: codeset.elements
              .map((code) => {
                if (code.attributes) {
                  const { name, value } = code.attributes;
                  const codeName: string = `${name} - Value: ${value}`;
                  return {
                    value: codeName.toLowerCase(),
                    label: codeName,
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
          return {
            value: datatypeName.toLowerCase(),
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
