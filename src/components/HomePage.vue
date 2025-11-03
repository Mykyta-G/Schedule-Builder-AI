<template>
  <div class="home-page">
    <div class="content-container">
      <div class="hero-section">
        <h1 class="page-title">{{ appTitle }}</h1>
        <p class="page-description">Create and manage your schedules with ease. Import data from Schoolsoft or Skola24, or build your schedule manually.</p>
        <button class="cta-button" @click="goToCreator">
          <span class="btn-text">Lets go!</span>
          <span class="btn-icon">🚀</span>
        </button>
      </div>
    </div>
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
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'creator' } }));
    };

    return {
      appTitle,
      goToCreator,
    };
  },
});
</script>

<style scoped>
.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafafa;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 100%;
}

.hero-section {
  text-align: center;
  max-width: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0;
}

.page-title {
  font-size: 6.5vh;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 3vh 0;
  letter-spacing: -0.03em;
  line-height: 1.1;
  text-align: center;
}

.page-description {
  font-size: 2.2vh;
  color: #718096;
  margin: 0 0 6vh 0;
  line-height: 1.7;
  max-width: 70vh;
  text-align: center;
}

.cta-button {
  padding: 3.5vh 8vh;
  border: none;
  border-radius: 1.5vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 2.2vh;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2vh;
  box-shadow: 0 0.5vh 2vh rgba(102, 126, 234, 0.35);
  margin: 0 auto;
}

.cta-button:hover {
  transform: translateY(-0.3vh);
  box-shadow: 0 0.8vh 3vh rgba(102, 126, 234, 0.45);
}

.cta-button:active {
  transform: translateY(-0.1vh);
}

.btn-icon {
  font-size: 3.5vh;
  font-weight: 300;
  line-height: 1;
}

.btn-text {
  font-size: 2.2vh;
}
</style>
