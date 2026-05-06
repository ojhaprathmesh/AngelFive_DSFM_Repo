"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import { toast } from "sonner";

export interface Notification {
  id: string;
  userId: string;
  eventType: string;
  title: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read';
  metadata?: Record<string, any>;
  action?: {
    type: 'navigate' | 'external';
    url: string;
  };
  createdAt: any;
  expiresAt: any;
  readAt: any;
  archived: boolean;
}

interface NotificationStats {
  unreadCount: number;
  lastNotificationAt: any;
}

interface NotificationContextType {
  notifications: Notification[];
  stats: NotificationStats;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ unreadCount: 0, lastNotificationAt: null });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/notifications/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.status === "success") {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching notification stats:", error);
    }
  }, [firebaseUser]);

  const fetchNotifications = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.status === "success") {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  const markAsRead = async (id: string) => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
        setStats(prev => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
        setStats(prev => ({ ...prev, unreadCount: 0 }));
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const archiveNotification = async (id: string) => {
    if (!firebaseUser) return;
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const archivedNotification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (archivedNotification?.status === 'unread') {
          setStats(prev => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }));
        }
      }
    } catch (error) {
      console.error("Error archiving notification:", error);
    }
  };

  useEffect(() => {
    if (!firebaseUser) {
      setNotifications([]);
      setStats({ unreadCount: 0, lastNotificationAt: null });
      setLoading(false);
      return;
    }

    fetchStats();
    fetchNotifications();

    // Set up SSE for real-time updates
    let eventSource: EventSource | null = null;

    const setupSSE = async () => {
      try {
        const token = await firebaseUser.getIdToken();
        eventSource = new EventSource(`/api/notifications/stream?token=${token}`);

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'stats') {
            setStats(data.stats);
          } else if (data.type === 'notifications') {
            // Check for new notifications to show toast
            const newNotifications = data.notifications.filter(
              (n: Notification) => !notifications.some(existing => existing.id === n.id) && n.status === 'unread'
            );
            
            if (newNotifications.length > 0) {
              newNotifications.forEach((n: Notification) => {
                toast(n.title, {
                  description: n.message,
                  action: n.action ? {
                    label: "View",
                    onClick: () => window.location.href = n.action!.url
                  } : undefined
                });
              });
            }
            
            setNotifications(data.notifications);
          }
        };

        eventSource.onerror = (err) => {
          console.error("SSE Error:", err);
          eventSource?.close();
          // Attempt to reconnect after a delay
          setTimeout(setupSSE, 5000);
        };
      } catch (error) {
        console.error("Error setting up notification SSE:", error);
      }
    };

    setupSSE();

    return () => {
      eventSource?.close();
    };
  }, [firebaseUser, fetchNotifications, fetchStats]);


  const value = {
    notifications,
    stats,
    loading,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    refresh: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
