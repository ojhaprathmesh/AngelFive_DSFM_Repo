"use client";

import React from "react";
import { 
  Bell, 
  Check, 
  Trash2, 
  ChevronRight, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Shield,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications, Notification } from "@/contexts/notification-context";
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
import { cn } from "@/lib/utils";
import Link from "next/link";

export function NotificationDropdown() {
  const { notifications, stats, markAsRead, markAllAsRead, archiveNotification, loading } = useNotifications();

  const getIcon = (category: string, priority: string) => {
    switch (category) {
      case 'watchlist': return <Bell className="h-4 w-4" />;
      case 'market': return <TrendingUp className="h-4 w-4" />;
      case 'dsfm': return <Activity className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      default:
        if (priority === 'critical' || priority === 'high') return <AlertCircle className="h-4 w-4" />;
        return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string, status: string) => {
    if (status === 'read') return "text-gray-400 bg-gray-100 dark:bg-gray-800";
    switch (priority) {
      case 'critical': return "text-red-600 bg-red-100 dark:bg-red-900/30";
      case 'high': return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
      case 'medium': return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      default: return "text-green-600 bg-green-100 dark:bg-green-900/30";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative touch-target group">
          <Bell className="h-5 w-5 transition-colors group-hover:text-primary" />
          {stats.unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[9.75px] bg-red-500 hover:bg-red-600 animate-in zoom-in duration-300">
              {stats.unreadCount > 9 ? '9+' : stats.unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 sm:w-96 p-0 overflow-hidden" align="end">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {stats.unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4">
                {stats.unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs px-2"
              onClick={() => markAllAsRead()}
              disabled={stats.unreadCount === 0}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-full p-8 text-muted-foreground text-sm">
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] p-8 text-center">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <p className="font-medium text-sm text-gray-600 dark:text-gray-400">All caught up!</p>
              <p className="text-xs text-gray-400 mt-1">You have no new notifications.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((n) => (
                <div 
                  key={n.id}
                  className={cn(
                    "flex p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50 relative group",
                    n.status === 'unread' && "bg-blue-50/30 dark:bg-blue-900/10"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3",
                    getPriorityColor(n.priority, n.status)
                  )}>
                    {getIcon(n.category, n.priority)}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className={cn(
                        "text-sm font-semibold truncate",
                        n.status === 'unread' ? "text-gray-900 dark:text-gray-100" : "text-gray-500"
                      )}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                        {(() => {
                          try {
                            const ts = n.createdAt;
                            if (!ts) return '';
                            const ms = ts.seconds ? ts.seconds * 1000
                              : ts._seconds ? ts._seconds * 1000
                              : typeof ts === 'string' ? new Date(ts).getTime()
                              : typeof ts === 'number' ? ts
                              : null;
                            if (!ms || isNaN(ms)) return '';
                            return formatDistanceToNow(new Date(ms), { addSuffix: true });
                          } catch { return ''; }
                        })()}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs line-clamp-2 leading-relaxed",
                      n.status === 'unread' ? "text-gray-600 dark:text-gray-400" : "text-gray-400"
                    )}>
                      {n.message}
                    </p>
                    
                    {n.action && (
                      <Link 
                        href={n.action.url}
                        className="inline-flex items-center text-[10px] font-medium text-primary mt-2 hover:underline"
                        onClick={() => n.status === 'unread' && markAsRead(n.id)}
                      >
                        {n.action.type === 'navigate' ? 'View details' : 'Open link'}
                        <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Link>
                    )}
                  </div>
                  
                  <div className="absolute right-2 top-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {n.status === 'unread' && (
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
          <Button variant="ghost" className="w-full h-11 text-xs rounded-none font-medium text-muted-foreground hover:text-primary transition-colors">
            View all notifications
          </Button>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
