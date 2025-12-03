<script setup lang="ts">
import { useNotify } from './notify'

const { notifications, remove } = useNotify()
</script>

<template>
  <div class="notification-container">
    <transition-group name="notification" tag="div">
      <v-snackbar
        v-for="notification in notifications"
        :key="notification.id"
        :model-value="true"
        :color="notification.color"
        location="top"
        :timeout="notification.timeout"
        elevation="8"
        class="notification-item"
        @update:model-value="() => remove(notification.id)"
      >
        {{ notification.text }}
        <template v-slot:actions>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="remove(notification.id)"
          ></v-btn>
        </template>
      </v-snackbar>
    </transition-group>
  </div>
</template>

<style scoped>
.notification-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  pointer-events: none;
}

.notification-item {
  pointer-events: all;
  margin-bottom: 8px;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>

