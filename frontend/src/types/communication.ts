/**
 * Communication entities: Announcement, Message, Notification, WhatsAppLog.
 * Reference: DATA_MODELS.md §5
 */

import { ID, Role } from './common';
import { User } from './core';

export type AudienceType = 'school' | 'campus' | 'class';

export interface Announcement {
  id: ID;
  schoolId: ID;
  campusId?: ID;
  classId?: ID;
  title: string;
  body: string;
  authorId: ID;
  audience: AudienceType;
  publishAt: string;
  expiresAt?: string;
  viewCount: number;
}

export type NewAnnouncement = Omit<Announcement, 'id' | 'viewCount'> & {
  viewCount?: number;
};

export type AnnouncementStatus = 'active' | 'scheduled' | 'expired';

export interface EnrichedAnnouncement extends Announcement {
  authorName?: string;
  campusName?: string;
  className?: string;
  status: AnnouncementStatus;
}

export interface AnnouncementFilter {
  audience?: AudienceType;
  campusId?: ID;
  classId?: ID;
  status?: AnnouncementStatus;
  search?: string;
}

export interface Message {
  id: ID;
  schoolId: ID;
  threadId: ID;
  senderId: ID;
  recipientId: ID;
  body: string;
  sentAt: string;
  readAt?: string;
}

export type NewMessage = Omit<Message, 'id'>;

export interface MessageThreadSummary {
  threadId: ID;
  otherUser: User;
  lastMessage: Message;
  unreadCount: number;
  studentContext?: {
    studentName?: string;
    className?: string;
    subjectNames?: string[];
  };
}

export interface EligibleRecipient {
  userId: ID;
  user: User;
  role: Role;
  studentName?: string;
  className?: string;
  subjectNames?: string[];
}

export interface DirectMessageInput {
  schoolId: ID;
  senderId: ID;
  recipientId: ID;
  body: string;
  threadId?: ID;
}

export interface AuditThreadSummary {
  threadId: ID;
  teacherUser: User;
  parentUser: User;
  studentName?: string;
  studentRollNumber?: string;
  className?: string;
  campusId?: ID;
  campusName?: string;
  messageCount: number;
  firstMessageAt: string;
  lastMessageAt: string;
  messages: Message[];
}

export interface MessageAuditFilter {
  campusId?: ID;
  search?: string;
  dateRange?: 'all' | '7d' | '30d';
}

export interface MessageAuditStats {
  totalThreads: number;
  totalMessages: number;
  participatingTeachers: number;
  participatingParents: number;
}

export type NotificationType =
  | 'attendance'
  | 'fee'
  | 'homework'
  | 'exam'
  | 'announcement';

export interface Notification {
  id: ID;
  schoolId: ID;
  recipientId: ID;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
}

export type NewNotification = Omit<Notification, 'id' | 'createdAt'> & {
  createdAt?: string;
};

export type WhatsAppStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface WhatsAppLog {
  id: ID;
  schoolId: ID;
  recipientPhone: string;
  recipientName: string;
  template: string;
  body: string;
  trigger: string;
  sentAt: string;
  status: WhatsAppStatus;
}

export type NewWhatsAppLog = Omit<WhatsAppLog, 'id' | 'sentAt'> & {
  sentAt?: string;
};
