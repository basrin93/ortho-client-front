<script setup lang="ts">
import { useTheme } from 'vuetify'

const theme = useTheme()

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}
</script>

<template>
  <v-app-bar elevation="1">
    <v-app-bar-title>Ortho CRM 🦷</v-app-bar-title>
    <v-spacer></v-spacer>
    <v-btn icon="mdi-theme-light-dark" @click="toggleTheme" title="Сменить тему"></v-btn>
  </v-app-bar>
</template>