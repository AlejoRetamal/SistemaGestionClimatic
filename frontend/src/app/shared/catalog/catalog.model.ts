export type FieldValue = string | number | null;
export interface CatalogRow {
  id: number;
  [key: string]: FieldValue;
}
export interface CatalogOption {
  value: number | string;
  label: string;
}
export interface CatalogField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  required?: boolean;
  max?: number;
  min?: number;
  options?: CatalogOption[];
  lookup?: 'maquinas' | 'tareas';
}
export interface CatalogDefinition {
  endpoint: string;
  path: string;
  title: string;
  singular: string;
  newLabel: string;
  description?: string;
  links?: { label: string; path: string }[];
  fields: CatalogField[];
  columns: { key: string; label: string }[];
}
