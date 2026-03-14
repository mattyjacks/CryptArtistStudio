// ============================================================================
// CryptArtist Studio - Unified Notification Hub
// Central notification system for all programs. Aggregates notifications,
// supports priorities, categories, and cross-program notification routing.
// Programs can subscribe to notifications from other programs.
// ============================================================================

import { interopBus } from "./interop";
import type { InteropProgram } from "./interop";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationLevel = "info" | "success" | "warning" | "error" | "critical";
export type NotificationCategory =
  | "ai"
  | "media"
  | "code"
  | "game"
  | "recording"
  | "agent"
  | "system"
  | "pipeline"
  | "security"
  | "update"
  | "donation"
  | "image"
  | "build"
  | "luck";

export interface Notification {
  /** Unique notification ID */
  id: string;
  /** Notification title */
  title: string;
  /** Notification message body */
  message: string;
  /** Severity level */
  level: NotificationLevel;
  /** Category for filtering */
  category: NotificationCategory;
  /** Source program */
  source: InteropProgram;
  /** When the notification was created */
  timestamp: number;
  /** Whether the user has seen this */
  read: boolean;
  /** Whether this notification has been dismissed */
  dismissed: boolean;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action callback identifier */
  actionId?: string;
  /** Optional navigation target (program route) */
  navigateTo?: string;
  /** Auto-dismiss after ms (0 = manual dismiss only) */
  autoDismissMs?: number;
  /** Group key for collapsing similar notifications */
  groupKey?: string;
}

export type NotificationHandler = (notification: Notification) => void;

// ---------------------------------------------------------------------------
// Notification Hub
// ---------------------------------------------------------------------------

class NotificationHub {
  private notifications: Notification[] = [];
  private handlers: { id: string; handler: NotificationHandler }[] = [];
  private maxNotifications = 100;
  private counter = 0;
  private handlerCounter = 0;

  /**
   * Push a new notification.
   */
  push(
    title: string,
    message: string,
    level: NotificationLevel,
    category: NotificationCategory,
    source: InteropProgram,
    options?: {
      actionLabel?: string;
      actionId?: string;
      navigateTo?: string;
      autoDismissMs?: number;
      groupKey?: string;
    }
  ): string {
    // If there's a groupKey, collapse with existing
    if (options?.groupKey) {
      const existing = this.notifications.find(
        (n) => n.groupKey === options.groupKey && !n.dismissed
      );
      if (existing) {
        existing.message = message;
        existing.timestamp = Date.now();
        existing.read = false;
        this.notifyHandlers(existing);
        return existing.id;
      }
    }

    const notification: Notification = {
      id: `notif-${++this.counter}-${Date.now()}`,
      title,
      message,
      level,
      category,
      source,
      timestamp: Date.now(),
      read: false,
      dismissed: false,
      ...options,
    };

    this.notifications.unshift(notification);
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    logger.info("Notifications", `[${level}] ${source}: ${title}`);

    // Broadcast via interop bus
    interopBus.emit("system:notification", source, {
      notificationId: notification.id,
      title,
      level,
      category,
      source,
    });

    this.notifyHandlers(notification);

    // Auto-dismiss if configured
    if (notification.autoDismissMs && notification.autoDismissMs > 0) {
      setTimeout(() => this.dismiss(notification.id), notification.autoDismissMs);
    }

    return notification.id;
  }

  /**
   * Subscribe to new notifications.
   */
  subscribe(handler: NotificationHandler): () => void {
    const entry = { id: `nh-${++this.handlerCounter}`, handler };
    this.handlers.push(entry);
    return () => {
      this.handlers = this.handlers.filter((h) => h.id !== entry.id);
    };
  }

  /**
   * Mark a notification as read.
   */
  markRead(id: string): void {
    const n = this.notifications.find((n) => n.id === id);
    if (n) n.read = true;
  }

  /**
   * Mark all notifications as read.
   */
  markAllRead(): void {
    for (const n of this.notifications) n.read = true;
  }

  /**
   * Dismiss a notification.
   */
  dismiss(id: string): void {
    const n = this.notifications.find((n) => n.id === id);
    if (n) {
      n.dismissed = true;
      n.read = true;
    }
  }

  /**
   * Dismiss all notifications.
   */
  dismissAll(): void {
    for (const n of this.notifications) {
      n.dismissed = true;
      n.read = true;
    }
  }

  /**
   * Get all active (non-dismissed) notifications.
   */
  getActive(filter?: {
    level?: NotificationLevel;
    category?: NotificationCategory;
    source?: InteropProgram;
    unreadOnly?: boolean;
  }): Notification[] {
    let items = this.notifications.filter((n) => !n.dismissed);
    if (filter?.level) items = items.filter((n) => n.level === filter.level);
    if (filter?.category) items = items.filter((n) => n.category === filter.category);
    if (filter?.source) items = items.filter((n) => n.source === filter.source);
    if (filter?.unreadOnly) items = items.filter((n) => !n.read);
    return items;
  }

  /**
   * Get unread count.
   */
  getUnreadCount(source?: InteropProgram): number {
    let items = this.notifications.filter((n) => !n.read && !n.dismissed);
    if (source) items = items.filter((n) => n.source === source);
    return items.length;
  }

  /**
   * Get all notifications (including dismissed) for history.
   */
  getAll(limit?: number): Notification[] {
    return limit ? this.notifications.slice(0, limit) : [...this.notifications];
  }

  private notifyHandlers(notification: Notification): void {
    for (const { handler } of this.handlers) {
      try {
        handler(notification);
      } catch (err) {
        logger.error("Notifications", `Handler error: ${err}`);
      }
    }
  }
}

// Global singleton
export const notificationHub = new NotificationHub();

// ---------------------------------------------------------------------------
// Convenience functions for common notification patterns
// ---------------------------------------------------------------------------

export function notifyInfo(source: InteropProgram, title: string, message: string, options?: { navigateTo?: string; autoDismissMs?: number }) {
  return notificationHub.push(title, message, "info", "system", source, { autoDismissMs: 5000, ...options });
}

export function notifySuccess(source: InteropProgram, title: string, message: string, options?: { navigateTo?: string; autoDismissMs?: number }) {
  return notificationHub.push(title, message, "success", "system", source, { autoDismissMs: 4000, ...options });
}

export function notifyWarning(source: InteropProgram, title: string, message: string, options?: { navigateTo?: string }) {
  return notificationHub.push(title, message, "warning", "system", source, options);
}

export function notifyError(source: InteropProgram, title: string, message: string, options?: { navigateTo?: string }) {
  return notificationHub.push(title, message, "error", "system", source, options);
}

export function notifyAI(source: InteropProgram, title: string, message: string) {
  return notificationHub.push(title, message, "info", "ai", source, { autoDismissMs: 6000, groupKey: `ai-${source}` });
}

export function notifyPipeline(title: string, message: string, level: NotificationLevel = "info") {
  return notificationHub.push(title, message, level, "pipeline", "system", { groupKey: "pipeline" });
}
