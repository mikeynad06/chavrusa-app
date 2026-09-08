import type { Topic, Location, Timezone } from './request';
import type { StudyRequest } from './request';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  whatsappNumber: string | null;
  location: Location;
  timezone: Timezone;
  isSubscribed: boolean;
  preferredTopics: { id: string; topic: Topic }[];
  subscribedLocations: { id: string; location: string }[];
  requests: StudyRequest[];
}
