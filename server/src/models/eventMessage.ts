// EventMessage型定義
export type EventMessage = {
  id: number;
  eventId: number;
  text: string;
  type?: 'notice' | 'info' | 'important' | 'alert';
  createdAt?: string;
  updatedAt?: string;
};
