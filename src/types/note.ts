export interface Note {
  id: string;
  title: string;
  contentJSON: unknown;
  preview: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  /** Present when the note is shared via link (capability URL). */
  share?: { token: string; ownerSecret: string };
}
