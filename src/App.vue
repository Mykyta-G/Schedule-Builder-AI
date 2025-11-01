<template>
  <div id="app">
    <HomePage v-if="currentPage === 'home'" />
    <PresetSelectionPage v-else-if="currentPage === 'preset-selection'" />
    <CreatorPage v-else-if="currentPage === 'creator'" :preset-id="selectedPresetId" />
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';
import HomePage from './components/HomePage.vue';
import CreatorPage from './components/CreatorPage.vue';
import PresetSelectionPage from './components/PresetSelectionPage.vue';

export default defineComponent({
  name: 'App',
  components: {
    HomePage,
    CreatorPage,
    PresetSelectionPage,
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

