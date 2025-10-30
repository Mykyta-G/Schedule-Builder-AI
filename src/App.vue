<template>
  <div id="app">
    <HomePage v-if="currentPage === 'home'" />
    <CreatorPage v-else-if="currentPage === 'creator'" />
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';
import HomePage from './components/HomePage.vue';
import CreatorPage from './components/CreatorPage.vue';

export default defineComponent({
  name: 'App',
  components: {
    HomePage,
    CreatorPage,
  },
  setup() {
    const currentPage = ref('home');

    onMounted(() => {
      // Listen for navigation events
      window.addEventListener('navigate', (event) => {
        currentPage.value = event.detail.page;
      });
    });

    return {
      currentPage,
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

