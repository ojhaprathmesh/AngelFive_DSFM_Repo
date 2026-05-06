import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { firebaseFirestore } from '../config/firebase';
import { AppEventPayload, appEvents, AppEventType } from './event-emitter';

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private setupEventListeners() {
    // Listen to all events and generate notifications
    Object.values(AppEventType).forEach((eventType) => {
      appEvents.on(eventType, async (payload: AppEventPayload) => {
        try {
          await this.createNotification(payload);
        } catch (error) {
          console.error(`[NotificationService] Error creating notification for event ${eventType}:`, error);
        }
      });
    });
  }

  public async createNotification(payload: AppEventPayload) {
    const { 
      userId, 
      type, 
      title, 
      message, 
      category, 
      priority, 
      metadata = {}, 
      action, 
      dedupeKey,
      expiresInHours = 24 * 7 // Default 1 week
    } = payload;

    const notificationsRef = firebaseFirestore
      .collection('users')
      .doc(userId)
      .collection('notifications');

    // Handle deduplication if dedupeKey is provided
    if (dedupeKey) {
      const existing = await notificationsRef
        .where('dedupeKey', '==', dedupeKey)
        .where('status', '==', 'unread')
        .limit(1)
        .get();

      if (!existing.empty) {
        // Update existing notification instead of creating a new one
        const docId = existing.docs[0].id;
        await notificationsRef.doc(docId).update({
          message,
          createdAt: FieldValue.serverTimestamp(),
          metadata: { ...existing.docs[0].data().metadata, ...metadata }
        });
        return docId;
      }
    }

    const createdAt = FieldValue.serverTimestamp();
    const expiresAt = Timestamp.fromMillis(Date.now() + expiresInHours * 60 * 60 * 1000);

    const notificationData = {
      userId,
      eventType: type,
      title,
      message,
      category,
      priority,
      status: 'unread',
      metadata,
      action,
      dedupeKey,
      createdAt,
      expiresAt,
      readAt: null,
      archived: false,
    };

    const docRef = await notificationsRef.add(notificationData);

    // Update stats
    await this.updateNotificationStats(userId, 1);

    return docRef.id;
  }

  private async updateNotificationStats(userId: string, unreadDelta: number) {
    const statsRef = firebaseFirestore
      .collection('users')
      .doc(userId)
      .collection('notification_stats')
      .doc('current');

    try {
      await firebaseFirestore.runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(statsRef);
        
        if (!statsDoc.exists) {
          transaction.set(statsRef, {
            unreadCount: Math.max(0, unreadDelta),
            lastNotificationAt: FieldValue.serverTimestamp(),
          });
        } else {
          const currentCount = statsDoc.data()?.unreadCount || 0;
          transaction.update(statsRef, {
            unreadCount: Math.max(0, currentCount + unreadDelta),
            lastNotificationAt: FieldValue.serverTimestamp(),
          });
        }
      });
    } catch (error) {
      console.error(`[NotificationService] Error updating stats for user ${userId}:`, error);
    }
  }

  public async markAsRead(userId: string, notificationId: string) {
    const docRef = firebaseFirestore
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId);

    const doc = await docRef.get();
    if (doc.exists && doc.data()?.status === 'unread') {
      await docRef.update({
        status: 'read',
        readAt: FieldValue.serverTimestamp(),
      });
      await this.updateNotificationStats(userId, -1);
    }
  }

  public async markAllAsRead(userId: string) {
    const notificationsRef = firebaseFirestore
      .collection('users')
      .doc(userId)
      .collection('notifications');

    const unreadOnes = await notificationsRef
      .where('status', '==', 'unread')
      .get();

    if (unreadOnes.empty) return;

    const batch = firebaseFirestore.batch();
    unreadOnes.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'read',
        readAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // Reset unread count
    const statsRef = firebaseFirestore
      .collection('users')
      .doc(userId)
      .collection('notification_stats')
      .doc('current');
    
    await statsRef.set({ unreadCount: 0 }, { merge: true });
  }

  public async archiveNotification(userId: string, notificationId: string) {
    const docRef = firebaseFirestore
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId);

    const doc = await docRef.get();
    if (doc.exists) {
      const isUnread = doc.data()?.status === 'unread';
      await docRef.update({
        archived: true,
        archivedAt: FieldValue.serverTimestamp(),
      });
      
      if (isUnread) {
        await this.updateNotificationStats(userId, -1);
      }
    }
  }
}

export const notificationService = NotificationService.getInstance();
