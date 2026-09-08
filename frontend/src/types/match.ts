import type { Topic } from './request';

export interface Match {
  id: string;
  createdAt: string;
  matchedUserId: string;
  matchedUser: {
    id: string;
    name: string;
  };
  request: {
    id: string;
    topic: Topic;
    seferOrTopic: string | null;
    description: string;
    requesterId: string;
    requester: {
      id: string;
      name: string;
    };
  };
}
