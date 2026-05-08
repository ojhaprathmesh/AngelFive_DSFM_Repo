"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Shield,
  Trash2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Notification,
  useNotifications,
} from "@/contexts/notification-context";
import { cn } from "@/lib/utils";

export function NotificationDropdown() {
  const {
    notifications,
    stats,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    loading,
  } = useNotifications();

  const getIcon = (category: string, priority: string) => {
    switch (category) {
      case "watchlist":
        return <Bell className="h-4 w-4" />;
      case "market":
        return <TrendingUp className="h-4 w-4" />;
      case "dsfm":
        return <Activity className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      default:
        if (priority === "critical" || priority === "high")
          return <AlertCircle className="h-4 w-4" />;
        return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string, status: string) => {
    if (status === "read") return "text-gray-400 bg-gray-100 dark:bg-gray-800";
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-100 dark:bg-red-900/30";
      case "high":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
      case "medium":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      default:
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="touch-target group relative"
        >
          <Bell className="group-hover:text-primary h-5 w-5 transition-colors" />
          {stats.unreadCount > 0 && (
            <Badge className="animate-in zoom-in absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 p-0 text-[9.75px] duration-300 hover:bg-red-600">
              {stats.unreadCount > 9 ? "9+" : stats.unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 overflow-hidden p-0 sm:w-96"
        align="end"
      >
        <div className="flex items-center justify-between bg-gray-50 p-4 dark:bg-gray-900/50">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {stats.unreadCount > 0 && (
              <Badge variant="secondary" className="h-4 text-[10px]">
                {stats.unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => markAllAsRead()}
              disabled={stats.unreadCount === 0}
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="text-muted-foreground flex h-full items-center justify-center p-8 text-sm">
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-[300px] flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                All caught up!
              </p>
              <p className="mt-1 text-xs text-gray-400">
                You have no new notifications.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50",
                    n.status === "unread" &&
                      "bg-blue-50/30 dark:bg-blue-900/10",
                  )}
                >
                  <div
                    className={cn(
                      "mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                      getPriorityColor(n.priority, n.status),
                    )}
                  >
                    {getIcon(n.category, n.priority)}
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <div className="mb-1 flex items-center justify-between">
                      <p
                        className={cn(
                          "truncate text-sm font-semibold",
                          n.status === "unread"
                            ? "text-gray-900 dark:text-gray-100"
                            : "text-gray-500",
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="ml-2 text-[10px] whitespace-nowrap text-gray-400">
                        {(() => {
                          try {
                            const ts = n.createdAt;
                            if (!ts) return "";
                            const ms = ts.seconds
                              ? ts.seconds * 1000
                              : ts._seconds
                                ? ts._seconds * 1000
                                : typeof ts === "string"
                                  ? new Date(ts).getTime()
                                  : typeof ts === "number"
                                    ? ts
                                    : null;
                            if (!ms || isNaN(ms)) return "";
                            return formatDistanceToNow(new Date(ms), {
                              addSuffix: true,
                            });
                          } catch {
                            return "";
                          }
                        })()}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "line-clamp-2 text-xs leading-relaxed",
                        n.status === "unread"
                          ? "text-gray-600 dark:text-gray-400"
                          : "text-gray-400",
                      )}
                    >
                      {n.message}
                    </p>

                    {n.action && (
                      <Link
                        href={n.action.url}
                        className="text-primary mt-2 inline-flex items-center text-[10px] font-medium hover:underline"
                        onClick={() =>
                          n.status === "unread" && markAsRead(n.id)
                        }
                      >
                        {n.action.type === "navigate"
                          ? "View details"
                          : "Open link"}
                        <ChevronRight className="ml-0.5 h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  <div className="absolute top-4 right-2 flex flex-col space-y-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {n.status === "unread" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-green-500"
                        onClick={() => markAsRead(n.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() => archiveNotification(n.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator className="m-0" />
        <Link href="/dashboard/notifications" className="block w-full">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-primary h-11 w-full rounded-none text-xs font-medium transition-colors"
          >
            View all notifications
          </Button>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
