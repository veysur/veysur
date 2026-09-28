import React, { useMemo, useState } from 'react'
import { Bell, Download, Loader2, AlertTriangle, Clock, X } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import { Badge } from 'component/shadcn/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from 'component/shadcn/dropdown-menu'
import { cn } from 'common/cn'

import { useNotifications } from './hook/useNotifications'
import { useDismissNotification } from './hook/useDismissNotification'
import { useMarkNotificationRead } from './hook/useMarkNotificationRead'
import type {
  NotificationListItem,
  DataTransferJobStatus,
} from './model/api/NotificationApi'

const STATUS_LABEL: Record<DataTransferJobStatus, string> = {
  pending: 'Queued',
  processing: 'Preparing your file…',
  completed: 'Ready',
  failed: 'Failed',
}

const jobStatusOf = (notification: NotificationListItem): DataTransferJobStatus => {
  if (notification.dataTransferJobStatus) return notification.dataTransferJobStatus
  if (notification.level === 'success') return 'completed'
  if (notification.level === 'error') return 'failed'
  return 'pending'
}

const isSettled = (notification: NotificationListItem) => {
  const jobStatus = jobStatusOf(notification)
  return jobStatus === 'completed' || jobStatus === 'failed'
}

export const DataTransferNotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false)
  const { notifications } = useNotifications()
  const { dismissNotification } = useDismissNotification()
  const { markRead } = useMarkNotificationRead()

  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.status === 'unread')
      .length,
    [notifications],
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      notifications
        .filter((notification) => notification.status === 'unread')
        .forEach((notification) => markRead(notification.notificationId))
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger tooltip="Notifications" asChild>
        <Button
          variant="link"
          size="icon-sm"
          className="relative text-header-foreground/70 hover:text-primary"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Exports &amp; imports</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="text-muted-foreground px-2 py-3 text-sm">
            No recent exports or imports.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const jobStatus = jobStatusOf(notification)
              return (
                <div
                  key={notification.notificationId}
                  className="flex items-start justify-between gap-2 px-2 py-2 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{notification.title}</span>
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs',
                        jobStatus === 'failed'
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                      )}
                    >
                      {jobStatus === 'pending' && <Clock className="h-3 w-3" />}
                      {jobStatus === 'processing' && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      {jobStatus === 'failed' && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {jobStatus === 'failed' && notification.message
                        ? notification.message
                        : STATUS_LABEL[jobStatus]}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {jobStatus === 'completed' && notification.downloadUrl && (
                      <a
                        href={notification.downloadUrl}
                        download={notification.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    )}
                    {isSettled(notification) && (
                      <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={(event) => {
                          event.stopPropagation()
                          void dismissNotification(notification.notificationId)
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DataTransferNotificationBell
