<script setup lang="ts">
import TheSidebar from '@/widgets/TheSidebar.vue'
</script>

<template>
  <div class="app-layout">
    <TheSidebar />
    
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f7fa;
}

.main-content {
  flex: 1;
  margin-left: 280px;
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}

/* Адаптивность */
@media (max-width: 960px) {
  .main-content {
    margin-left: 0;
  }
}
</style>