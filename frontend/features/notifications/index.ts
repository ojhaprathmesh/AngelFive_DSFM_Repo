/**
 * features/notifications/index.ts
 *
 * Public API for the notifications feature.
 */

// Context
export {
  type Notification,
  NotificationProvider,
  useNotifications,
} from "./context/notification-context";

// Components
export { NotificationDropdown } from "./components/notification-dropdown";
