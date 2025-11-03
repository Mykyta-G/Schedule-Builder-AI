<template>
  <div id="app">
    <HomePage v-if="currentPage === 'home'" />
    <CreatorPage v-else-if="currentPage === 'creator'" />
    <ViewerPage v-else-if="currentPage === 'viewer'" :preset-id="selectedPresetId" />
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';
import HomePage from './components/HomePage.vue';
import CreatorPage from './components/CreatorPage.vue';
import ViewerPage from './components/ViewerPage.vue';

export default defineComponent({
  name: 'App',
  components: {
    HomePage,
    CreatorPage,
    ViewerPage,
  },
  setup() {
    const currentPage = ref('home');
    const selectedPresetId = ref(null);

    onMounted(() => {
      // Listen for navigation events
      window.addEventListener('navigate', (event) => {
        currentPage.value = event.detail.page;
        selectedPresetId.value = event.detail.presetId || null;
      });
    });

    return {
      currentPage,
      selectedPresetId,
    };
  },
});
</script>

<style>
@import './main.css';

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}
</style>

