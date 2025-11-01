<template>
  <div class="hero-container">
    <br><br>
    <h1 id="title" class="hero-title">{{ appTitle }}</h1>
    <p class="hero-description">This is a schedule builder using AI</p>
    <a href="#" @click.prevent="goToCreator">Creator Page</a>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
  name: 'HomePage',
  setup() {
    const appTitle = ref('Schedule Builder AI');

    onMounted(() => {
      if (window.api && window.api.title) {
        appTitle.value = window.api.title;
      }
    });

    const goToCreator = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'preset-selection' } }));
    };

    return {
      appTitle,
      goToCreator,
    };
  },
});
</script>

