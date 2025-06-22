import React, { useEffect, useState } from 'react';
import { useNotification, Notification } from '../../context/NotificationContext';
import { CommandStatus } from '../../types';
import { Bell, AlertTriangle, CheckCircle, Package, Search, Truck, Zap, XCircle } from 'lucide-react';

const getNotificationStyle = (notification: Notification) => {
  const baseClasses = 'bg-white border rounded-md p-4 shadow-lg w-full transform transition-all duration-500 ease-in-out';
  let specificClasses = '';
  let icon: React.ReactNode = <Bell className="h-5 w-5 text-gray-400" />;

  switch (notification.type) {
    case 'success':
      specificClasses = 'bg-green-50 border-green-200 text-green-800';
      icon = <CheckCircle className="h-5 w-5 text-green-400" />;
      break;
    case 'error':
      specificClasses = 'bg-red-50 border-red-200 text-red-800';
      icon = <AlertTriangle className="h-5 w-5 text-red-400" />;
      break;
    case 'info':
      specificClasses = 'bg-blue-50 border-blue-200 text-blue-800';
      icon = <Bell className="h-5 w-5 text-blue-400" />;
      break;
    case 'status_update':
      switch (notification.status) {
        case 'validated':
            specificClasses = 'bg-blue-50 border-blue-200 text-blue-800';
            icon = <CheckCircle className="h-5 w-5 text-blue-400" />;
            break;
        case 'in-production':
            specificClasses = 'bg-yellow-50 border-yellow-200 text-yellow-800';
            icon = <Package className="h-5 w-5 text-yellow-400" />;
            break;
        case 'quality-check':
            specificClasses = 'bg-purple-50 border-purple-200 text-purple-800';
            icon = <Search className="h-5 w-5 text-purple-400" />;
            break;
        case 'ready':
            specificClasses = 'bg-teal-50 border-teal-200 text-teal-800';
            icon = <Zap className="h-5 w-5 text-teal-400" />;
            break;
        case 'shipped':
            specificClasses = 'bg-indigo-50 border-indigo-200 text-indigo-800';
            icon = <Truck className="h-5 w-5 text-indigo-400" />;
            break;
        case 'delivered':
            specificClasses = 'bg-emerald-50 border-emerald-200 text-emerald-800';
            icon = <CheckCircle className="h-5 w-5 text-emerald-400" />;
            break;
        case 'canceled':
            specificClasses = 'bg-red-50 border-red-200 text-red-800';
            icon = <XCircle className="h-5 w-5 text-red-400" />;
            break;
        default:
            specificClasses = 'bg-gray-50 border-gray-200 text-gray-800';
            icon = <Bell className="h-5 w-5 text-gray-400" />;
      }
      break;
  }
  return { baseClasses, specificClasses, icon };
};

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [fadingOut, setFadingOut] = useState<Set<number>>(new Set());

  // Effect to make new notifications appear
  useEffect(() => {
    const newIds = notifications.map(n => n.id).filter(id => !visible.has(id));
    if (newIds.length > 0) {
      const timer = setTimeout(() => {
        setVisible(prev => new Set([...prev, ...newIds]));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [notifications, visible]);

  // Effect to make notifications disappear
  useEffect(() => {
    const timers = notifications.map(n => {
      return setTimeout(() => {
        setFadingOut(prev => new Set(prev).add(n.id));
        const removalTimer = setTimeout(() => {
          removeNotification(n.id);
          setVisible(prev => {
            const newSet = new Set(prev);
            newSet.delete(n.id);
            return newSet;
          });
          setFadingOut(prev => {
            const newSet = new Set(prev);
            newSet.delete(n.id);
            return newSet;
          });
        }, 500); // match transition duration
        return removalTimer;
      }, 5000); // 5 seconds visible
    });

    return () => timers.forEach(t => t && clearTimeout(t));
  }, [notifications, removeNotification]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
      {notifications.map((notification) => {
        const { baseClasses, specificClasses, icon } = getNotificationStyle(notification);
        const isVisible = visible.has(notification.id) && !fadingOut.has(notification.id);
        
        return (
          <div
            key={notification.id}
            className={`${baseClasses} ${specificClasses} ${
              isVisible
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-full'
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {icon}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );
}; 