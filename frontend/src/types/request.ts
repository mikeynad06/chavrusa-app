export type Topic =
  | 'GEMARA'
  | 'HALACHA'
  | 'TANACH'
  | 'MACHSHAVA'
  | 'MUSSAR'
  | 'CHASSIDUT'
  | 'MISHNAH'
  | 'PARSHA'
  | 'MIDRASH'
  | 'OTHER';

export type LearningStyle =
  | 'IYUN'
  | 'BEKIYUT'
  | 'DISCUSSION'
  | 'SHIUR_REVIEW'
  | 'TEXT_FOCUSED'
  | 'FLEXIBLE';

export type LearningLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ANY';

export type LearningModality = 'IN_PERSON' | 'ONLINE' | 'EITHER';

export type Language = 'ENGLISH' | 'HEBREW' | 'EITHER';

export type RequestStatus = 'OPEN' | 'MATCHED' | 'CLOSED' | 'EXPIRED';

export type Location =
  | 'JERUSALEM'
  | 'TEL_AVIV'
  | 'RAMAT_BEIT_SHEMESH'
  | 'TEANECK'
  | 'NEW_YORK'
  | 'LONDON'
  | 'OTHER';

export type TimeSlot = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'FLEXIBLE';

export type Timezone = 'ISRAEL' | 'EST' | 'PST' | 'GMT';

export interface StudyRequest {
  id: string;
  topic: Topic;
  seferOrTopic: string | null;
  style: LearningStyle;
  level: LearningLevel;
  modality: LearningModality;
  language: Language;
  description: string;
  location: Location | null;
  timeSlot: TimeSlot;
  timezone: Timezone;
  status: RequestStatus;
  createdAt: string;
  requesterId: string;
  requester: {
    id: string;
    name: string;
  };
}
