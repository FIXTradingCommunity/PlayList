// DOM DATA
export type DomData = SectionData | CategoryData | MessageData |
ComponentData | FieldData | CodesetData | DatatypeData;

// SECTION DATA
export interface SectionData {
  type: string;
  name: string;
  elements: {
    type: string;
    name: string;
    attributes: {
      name: string;
      displayOrder: string;
      FIXMLFileName: string;
      updated?: string;
      updatedEP?: string;
    };
    elements: {
      type: string;
      name: string;
      elements: {
        type: string;
        name: string;
        attributes: {
          purpose: string;
        };
        elements: {
          type: string;
          text: string;
        }[];
      }[];
    }[];
  }[];
}
// CATEGORY DATA
export interface CategoryData {
  type: string;
  name: string;
  elements: {
    type: string;
    name: string;
    attributes: {
      FIXMLFileName: string;
      componentType: string;
      section?: string;
      name: string;
      includeFile?: string;
      added?: string;
      addedEP?: string;
    };
    elements?: {
      type: string;
      name: string;
      elements: {
        type: string;
        name: string;
        attributes: {
          purpose: string;
        };
        elements: {
          type: string;
          text: string;
        }[];
      }[];
    }[];
  }[];
}

// MESSAGE DATA
export interface MessageData {
  type: string;
  name: string;
  attributes: {
    latestEP: string;
  };
  elements: {
    type: string;
    name: string;
    attributes: {
      name: string;
      id: string;
      msgType: string;
      category: string;
      added: string;
      abbrName: string;
      updated?: string;
      updatedEP?: string;
      addedEP?: string;
    };
    elements: {
      type: string;
      name: string;
      elements: {
        type: string;
        name: string;
        attributes: {
          id?: string;
          presence?: string;
          added?: string;
          purpose?: string;
          addedEP?: string;
          issue?: string;
          updated?: string;
          updatedEP?: string;
          deprecated?: string;
          deprecatedEP?: string;
        };
        elements?: {
          type: string;
          name?: string;
          elements?: {
            type: string;
            name: string;
            elements?: {
              type: string;
              text: string;
            }[];
          }[];
          text?: string;
        }[];
      }[];
    }[];
  }[];
}

// COMPONENT DATA
export interface ComponentData {
  type: string;
  name: string;
  attributes: {
    latestEP: string;
  };
  elements: {
    type: string;
    name: string;
    attributes: {
      name: string;
      id: string;
      category: string;
      added: string;
      updated?: string;
      updatedEP?: string;
      abbrName: string;
      deprecated?: string;
      deprecatedEP?: string;
      addedEP?: string;
    };
    elements: {
      type: string;
      name: string;
      attributes?: {
        id: string;
        added: string;
        updated?: string;
        updatedEP?: string;
        addedEP?: string;
        deprecated?: string;
        presence?: string;
        deprecatedEP?: string;
      };
      elements: {
        type: string;
        name: string;
        elements?: {
          type: string;
          name?: string;
          elements?: {
            type: string;
            text: string;
          }[];
          text?: string;
        }[];
        attributes?: {
          purpose: string;
        };
      }[];
    }[];
  }[];
}

// FIELD DATA
export interface FieldData {
  type: string;
  name: string;
  attributes: {
    latestEP: string;
  };
  elements: {
    type: string;
    name: string;
    attributes: {
      added: string;
      id: string;
      name: string;
      type: string;
      abbrName?: string;
      issue?: string;
      baseCategory?: string;
      baseCategoryAbbrName?: string;
      updated?: string;
      updatedEP?: string;
      unionDataType?: string;
      discriminatorId?: string;
      deprecated?: string;
      lengthId?: string;
      deprecatedEP?: string;
      addedEP?: string;
    };
    elements: {
      type: string;
      name: string;
      elements: {
        type: string;
        name: string;
        attributes: {
          purpose: string;
        };
        elements?: {
          type: string;
          text: string;
        }[];
      }[];
    }[];
  }[];
}

// CODESET DATA
export interface CodesetData {
  type: string;
  name: string;
  elements: {
    type: string;
    name: string;
    attributes: {
      name: string;
      id: string;
      type: string;
    };
    elements: {
      type: string;
      name: string;
      attributes?: {
        name: string;
        id: string;
        value: string;
        sort?: string;
        added?: string;
        updated?: string;
        updatedEP?: string;
        addedEP?: string;
        deprecated?: string;
        group?: string;
        deprecatedEP?: string;
        issue?: string;
      };
      elements: {
        type: string;
        name: string;
        elements?: {
          type: string;
          name: string;
          attributes: {
            purpose: string;
          };
          elements: {
            type: string;
            text: string;
          }[];
        }[];
        attributes?: {
          purpose: string;
        };
      }[];
    }[];
  }[];
}

// DATATYPE DATA
export interface DatatypeData {
  type: string;
  name: string;
  elements: {
    type: string;
    name: string;
    attributes: {
      name: string;
      added: string;
      issue?: string;
      updated?: string;
      updatedEP?: string;
      baseType?: string;
      addedEP?: string;
    };
    elements: {
      type: string;
      name: string;
      attributes?: {
        standard: string;
        base: string;
        builtin: string;
        pattern?: string;
        minInclusive?: string;
      };
      elements?: {
        type: string;
        name: string;
        attributes: {
          purpose: string;
        };
        elements: {
          type: string;
          text: string;
        }[];
      }[];
    }[];
  }[];
}

// SECTIONS INDEXES FOR MAPPING
export interface SectionIndexes {
  [key: string]: SectionIndex;
}

interface SectionIndex {
  value: number;
  categories: CategoriesForSectionsIndexes;
  modelKey: string;
}

interface CategoriesForSectionsIndexes {
  [key: string]: number;
}

// CATEGORIES INDEXES FOR MAPPING
export interface CategoryIndexes {
  [key: string]: CategoryIndex;
}

interface CategoryIndex {
  sectionName: string;
  sectionIndex: number;
  modelKey: string;
}

// TREE CONTROL NODES
export type TreeControl = (FourChildrenTC | ThreeChildrenTC | TwoChildrenTC | OneChildrenTC)[];

export interface FourChildrenTC {
  value: string;
  label: string;
  children: {
    value: string;
    label: string;
    children: {
      value: string;
      label: string;
      children: {
        value: string;
        label: string;
        children: {
          value: string;
          label: string;
        }[];
      }[];
    }[];
  }[];
}

export interface ThreeChildrenTC {
  value: string;
  label: string;
  children: {
    value: string;
    label: string;
    children: {
      value: string;
      label: string;
      children: {
        value: string;
        label: string;
      }[];
    }[];
  }[];
}

export interface TwoChildrenTC {
  value: string;
  label: string;
  children: {
    value: string;
    label: string;
    children: {
      value: string;
      label: string;
    }[];
  }[];
}

export interface OneChildrenTC {
  value: string;
  label: string;
  children: {
    value: string;
    label: string;
  }[];
}
