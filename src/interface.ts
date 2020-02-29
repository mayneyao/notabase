export interface BlockValue {
  id: string;
  version?: number;
  type?: string;
  view_ids?: string[];
  collection_id?: string;
  permissions?: any;
  created_time: number;
  last_edited_time: number;
  parent_id: string;
  parent_table: string;
  alive?: boolean;
  created_by_table?: string;
  created_by_id?: string;
  last_edited_by_table?: string;
  last_edited_by_id?: string;
  properties?: {
    [key: string]: any;
  }
}

export interface TableProperty {
  width: number;
  visible: boolean;
  property: string;
}

export interface Format {
  table_wrap: boolean;
  table_properties: TableProperty[];
}

export interface Aggregation {
  property: string;
  aggregator: string;
}

export interface Query2 {
  aggregations: Aggregation[];
}


export interface Permission2 {
  role: string;
  type: string;
  user_id: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  icon: string;
}


export interface RecordMap {
  collection: ICollection;
  collection_view: CollectionView;
  block: Block;
  space: any;
}

export interface IQueryCollection {
  result: Result;
  recordMap: RecordMap;
}


export interface AggregationResult {
  type: string;
  value: number;
}

export interface Result {
  type: "table";
  blockIds: string[];
  aggregationResults?: AggregationResult[];
  total: number;
}



// FieldType
export enum FieldType {
  multi_select = 'multi_select',
  phone_number = 'phone_number',
  date = 'date',
  file = 'file',
  email = 'email',
  url = 'url',
  text = 'text',
  select = 'select',
  checkbox = 'checkbox',
  relation = 'relation',
  title = 'title',
  person = 'person',
}


// Schema
export interface SchemaBase {
  name: string;
  type: FieldType;
}

export enum SelectOptionColor {
  pink = 'pink',
}

export interface SelectOption {
  id: string;
  color?: SelectOptionColor;
  value: string;
}

export interface SelectSchema extends SchemaBase {
  options: SelectOption[];
}

export interface RelationSchema extends SchemaBase {
  property: string;
  collection_id: string;
}

export type Schema = SchemaBase | RelationSchema | SelectSchema

export interface CollectionSchema {
  [key: string]: Schema;
}


export interface CollectionValue {
  role: string;
  value: {
    id: string;
    version: number;// 对应快照，notion 的版本控制粒度更细，在 Record 级别控制
    type: "table";
    name: any[]; // FIXME: 这里不确定
    scheme: CollectionSchema;
    parent_id: string;
    parent_table: 'block';
    alive: boolean;
  }
}

export interface ICollection {
  [key: string]: CollectionValue;
}

export interface CollectionView {
  [key: string]: {
    role: string;
    value: {
      id: string;
      version: number;
      type: string; // FIXME: 枚举
      name: string;
      query?: any;
      format?: Format;
      parent_id: string;
      parent_table: "block";
      alive: boolean;
      page_sort: string[];
      query2?: Query2;
    }
  }
}

export interface Block {
  [key: string]: {
    role: string;
    value: BlockValue;
  }
}