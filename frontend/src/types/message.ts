export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
  };
}
