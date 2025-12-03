import { ref } from 'vue'

export interface Notification {
  id: string
  text: string
  color: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

const notifications = ref<Notification[]>([])

export function useNotify() {
  function notify(
    text: string,
    color: Notification['color'] = 'success',
    timeout: number = 4000
  ) {
    const id = Math.random().toString(36).substring(2, 9)
    notifications.value.push({
      id,
      text,
      color,
      timeout
    })

    // Автоматическое удаление
    if (timeout > 0) {
      setTimeout(() => {
        remove(id)
      }, timeout)
    }

    return id
  }

  function remove(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function success(text: string, timeout?: number) {
    return notify(text, 'success', timeout)
  }

  function error(text: string, timeout?: number) {
    return notify(text, 'error', timeout)
  }

  function warning(text: string, timeout?: number) {
    return notify(text, 'warning', timeout)
  }

  function info(text: string, timeout?: number) {
    return notify(text, 'info', timeout)
  }

  return {
    notifications,
    notify,
    success,
    error,
    warning,
    info,
    remove
  }
}

