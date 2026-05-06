"use client";

import React, { useState } from "react";
import { 
  Bell, 
  Check, 
  Trash2, 
  ChevronRight, 
  Search, 
  Filter, 
  MoreHorizontal,
  Archive,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
  Activity,
  Shield,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotifications, Notification } from "@/contexts/notification-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, archiveNotification, refresh, loading } = useNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "watchlist" | "market" | "dsfm">("all");

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || 
                          (filter === "unread" && n.status === "unread") || 
                          (filter === n.category);
    return matchesSearch && matchesFilter;
  });

  const getIcon = (category: string, priority: string) => {
    switch (category) {
      case 'watchlist': return <Bell className="h-5 w-5" />;
      case 'market': return <TrendingUp className="h-5 w-5" />;
      case 'dsfm': return <Activity className="h-5 w-5" />;
      case 'security': return <Shield className="h-5 w-5" />;
      default:
        if (priority === 'critical' || priority === 'high') return <AlertCircle className="h-5 w-5" />;
        return <Info className="h-5 w-5" />;
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
    <div className="container mx-auto p-4 lg:p-8 space-y-6 max-w-5xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-muted-foreground mt-1">Manage your alerts, market updates, and system messages.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => markAllAsRead()}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white dark:bg-gray-950 overflow-hidden">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full md:w-auto">
              <TabsList className="bg-gray-100 dark:bg-gray-900">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
                <TabsTrigger value="market">Market</TabsTrigger>
                <TabsTrigger value="dsfm">DSFM</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search notifications..." 
                className="pl-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-primary" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4 opacity-20" />
              <p>Fetching your notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-gray-50 dark:bg-gray-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="h-10 w-10 text-gray-300 dark:text-gray-700" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No notifications found</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                {searchQuery || filter !== "all" 
                  ? "We couldn't find any notifications matching your current filters."
                  : "You're all caught up! When you get new alerts, they'll show up here."}
              </p>
              {(searchQuery || filter !== "all") && (
                <Button variant="link" onClick={() => {setSearchQuery(""); setFilter("all");}} className="mt-4">
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredNotifications.map((n) => (
                <div 
                  key={n.id}
                  className={cn(
                    "group flex flex-col sm:flex-row p-6 transition-all hover:bg-gray-50/50 dark:hover:bg-gray-900/30",
                    n.status === 'unread' && "bg-blue-50/20 dark:bg-blue-900/5 relative"
                  )}
                >
                  {n.status === 'unread' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <div className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-0 sm:mr-6 shadow-sm transition-transform group-hover:scale-105",
                    getPriorityColor(n.priority, n.status)
                  )}>
                    {getIcon(n.category, n.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "text-base font-bold",
                          n.status === 'unread' ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
                        )}>
                          {n.title}
                        </h3>
                        <Badge variant="outline" className="capitalize text-[10px] py-0 h-5 border-gray-200 dark:border-gray-800">
                          {n.category}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-400 font-medium flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
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
                      "text-sm leading-relaxed mb-4",
                      n.status === 'unread' ? "text-gray-700 dark:text-gray-300" : "text-gray-500"
                    )}>
                      {n.message}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {n.action && (
                        <Button 
                          asChild 
                          size="sm" 
                          variant={n.status === 'unread' ? 'default' : 'outline'}
                          className="h-8 text-xs font-semibold"
                          onClick={() => n.status === 'unread' && markAsRead(n.id)}
                        >
                          <Link href={n.action.url}>
                            {n.action.type === 'navigate' ? 'Take Action' : 'Open Link'}
                            <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
                          </Link>
                        </Button>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {n.status === 'unread' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => markAsRead(n.id)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Mark as read
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => archiveNotification(n.id)}
                        >
                          <Archive className="h-3.5 w-3.5 mr-1.5" />
                          Archive
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 sm:ml-4 opacity-0 group-hover:opacity-100 transition-opacity flex sm:flex-col gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => archiveNotification(n.id)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete forever
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-center text-xs text-gray-400 pb-8">
        <p>Notifications are automatically archived after 30 days of inactivity.</p>
      </div>
    </div>
  );
}
