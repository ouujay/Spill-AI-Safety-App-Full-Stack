// hooks/useNotifications.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { getNotifications, markNotificationsRead, markAllNotificationsRead } from '../api/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  
  const pollIntervalRef = useRef(null);
  const isPollingRef = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
        setPage(1);
      }

      const response = await getNotifications(pageNum, 20);
      
      if (reset || pageNum === 1) {
        setNotifications(response.items);
      } else {
        setNotifications(prev => [...prev, ...response.items]);
      }
      
      setUnreadCount(response.unread_count);
      setHasMore(response.has_more);
      
      if (!reset) {
        setPage(pageNum + 1);
      }
      
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh notifications
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(1, true);
  }, [fetchNotifications]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchNotifications(page, false);
    }
  }, [hasMore, loading, page, fetchNotifications]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds) => {
    try {
      await markNotificationsRead(notificationIds);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notificationIds.includes(notif.id) 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      
      // Update unread count
      const markedCount = notifications.filter(n => 
        notificationIds.includes(n.id) && !n.is_read
      ).length;
      setUnreadCount(prev => Math.max(0, prev - markedCount));
      
    } catch (err) {
      console.error('Error marking notifications as read:', err);
      throw err;
    }
  }, [notifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
      
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  // Poll for notifications when app is active
  const startPolling = useCallback(() => {
    if (isPollingRef.current) return;
    
    isPollingRef.current = true;
    pollIntervalRef.current = setInterval(() => {
      fetchNotifications(1, true);
    }, 60000); // Poll every 60 seconds
  }, [fetchNotifications]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        startPolling();
        // Refresh notifications when app becomes active
        fetchNotifications(1, true);
      } else {
        stopPolling();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Start polling if app is active
    if (AppState.currentState === 'active') {
      startPolling();
    }

    return () => {
      subscription?.remove();
      stopPolling();
    };
  }, [startPolling, stopPolling, fetchNotifications]);

  // Initial load
  useEffect(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  };
}