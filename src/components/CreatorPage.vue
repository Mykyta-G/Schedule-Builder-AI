<template>
  <div class="creator-page">
    <div class="top-nav">
      <a href="#" @click.prevent="goToHome">← Home</a>
    </div>
    <div class="creator-layout">
      <Sidebar />
      <div class="schedule-section">
        <SimpleSchedule @change="onScheduleChange" />
      </div>
      <button 
        class="chat-toggle-btn" 
        :class="{ 'active': isChatOpen }"
        @click="toggleChat"
        :title="isChatOpen ? 'Hide Assistant' : 'Show Assistant'"
      >
        <span class="toggle-icon">{{ isChatOpen ? '←' : '→' }}</span>
      </button>
      <div class="chat-section" :class="{ 'open': isChatOpen }">
        <ChatWindow />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import SimpleSchedule from './SimpleSchedule.vue';
import ChatWindow from './ChatWindow.vue';
import Sidebar from './Sidebar.vue';

export default defineComponent({
  name: 'CreatorPage',
  components: { SimpleSchedule, ChatWindow, Sidebar },
  setup() {
    const title = ref('');
    const description = ref('');
    const schedule = ref({});
    const isChatOpen = ref(false);

    const goToHome = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
    };

    const toggleChat = () => {
      isChatOpen.value = !isChatOpen.value;
    };

    const createSchedule = async () => {
      if (!title.value || !description.value) return;

      const res = await window.api.createSchedule({
        title: title.value,
        description: description.value,
        schedule: schedule.value,
      });

      console.log(res);

      title.value = '';
      description.value = '';
      schedule.value = {};
    };

    const onScheduleChange = (payload) => {
      schedule.value = payload;
    };

    return {
      title,
      description,
      goToHome,
      createSchedule,
      onScheduleChange,
      isChatOpen,
      toggleChat,
    };
  },
});
</script>

<style scoped>
.creator-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-nav {
  padding: 1.5vh 2vh;
  border-bottom: 0.1vh solid #f0f0f0;
  background: #fff;
}

.top-nav a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.5vh;
  transition: color 0.2s ease;
}

.top-nav a:hover {
  color: #764ba2;
}

.creator-layout {
  flex: 1;
  display: flex;
  gap: 0;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.schedule-section {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-toggle-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 4vh;
  height: 8vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 1vh 0 0 1vh;
  color: white;
  font-size: 2vh;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -0.3vh 0 1.5vh rgba(0, 0, 0, 0.15);
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.chat-toggle-btn:not(.active) {
  right: 0;
}

.chat-toggle-btn.active {
  right: 42vh;
}

.chat-toggle-btn:hover {
  box-shadow: -0.5vh 0 2vh rgba(0, 0, 0, 0.2);
}

.chat-toggle-btn:not(.active):hover {
  transform: translateY(-50%) translateX(-5%);
}

.chat-toggle-btn.active:hover {
  transform: translateY(-50%) translateX(5%);
}

.toggle-icon {
  display: block;
  transition: transform 0.3s ease;
  font-weight: 600;
}

.chat-section {
  position: fixed;
  right: 0;
  top: 6vh;
  bottom: 0;
  width: 42vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafafa;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(0);
  z-index: 99;
  box-shadow: -0.2vh 0 1vh rgba(0, 0, 0, 0.1);
}

.chat-section:not(.open) {
  transform: translateX(100%);
}
</style>

