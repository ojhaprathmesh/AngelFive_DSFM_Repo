/**
 * contexts/notification-context.tsx — backward-compatibility re-export shim
 *
 * The notification context has moved to:
 *   features/notifications/context/notification-context.tsx
 *
 * @deprecated Import from "@/features/notifications" instead.
 */
export {
  type Notification,
  NotificationProvider,
  useNotifications,
} from "@/features/notifications/context/notification-context";
