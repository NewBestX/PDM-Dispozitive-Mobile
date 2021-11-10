export interface ItemProps {
  _id?: string;
  titlu: string;
  regizor: string;
  dataAparitiei: Date;
  durata: number;
  vazut: boolean;
  lastEditDate: Date;
  hasLocalEdits?: boolean;
  photo?: any;
  location?: {long: number, lat: number};
}
