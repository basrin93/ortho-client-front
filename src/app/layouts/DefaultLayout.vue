<script setup lang="ts">
import { ref } from 'vue'
import { useDisplay } from 'vuetify'
import TheSidebar from '@/widgets/TheSidebar.vue'

const { mobile } = useDisplay()
const sidebarRef = ref<InstanceType<typeof TheSidebar> | null>(null)

const toggleMenu = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleDrawer()
  }
}
</script>

<template>
  <div class="app-layout">
    <TheSidebar ref="sidebarRef" />
    
    <!-- Кнопка меню для мобильных -->
    <v-btn
      v-if="mobile"
      class="menu-button"
      icon="mdi-menu"
      color="primary"
      variant="flat"
      @click="toggleMenu"
    ></v-btn>
    
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

/* Кнопка меню для мобильных */
.menu-button {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Адаптивность */
@media (max-width: 960px) {
  .main-content {
    margin-left: 0;
    width: 100%;
  }
  
  .menu-button {
    display: block;
  }
}

@media (min-width: 961px) {
  .menu-button {
    display: none;
  }
}
</style>