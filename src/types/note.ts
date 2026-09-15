export interface Note {
  id: string;
  title: string;
  contentJSON: unknown;
  preview: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}
