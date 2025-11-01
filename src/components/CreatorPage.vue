<template>
  <div class="creator-page">
    <div class="top-nav">
      <a href="#" @click.prevent="goToHome">← Home</a>
    </div>
    <div class="creator-layout">
      <Sidebar :initial-preset-id="presetId" />
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
      <SettingsModule :is-open="isSettingsOpen" @close="closeSettings" />
      <ProfileModule :is-open="isProfileOpen" @close="closeProfile" />
      <VariablesModule :is-open="isVariablesOpen" @close="closeVariables" />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import SimpleSchedule from './SimpleSchedule.vue';
import ChatWindow from './ChatWindow.vue';
import Sidebar from './Sidebar.vue';
import SettingsModule from './SettingsModule.vue';
import ProfileModule from './ProfileModule.vue';
import VariablesModule from './VariablesModule.vue';

export default defineComponent({
  name: 'CreatorPage',
  components: { 
    SimpleSchedule, 
    ChatWindow, 
    Sidebar,
    SettingsModule,
    ProfileModule,
    VariablesModule,
  },
  props: {
    presetId: {
      type: String,
      default: null,
    },
  },
  setup(props) {
    const title = ref('');
    const description = ref('');
    const schedule = ref({});
    const isChatOpen = ref(false);
    const isSettingsOpen = ref(false);
    const isProfileOpen = ref(false);
    const isVariablesOpen = ref(false);

    const goToHome = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'preset-selection' } }));
    };

    const toggleChat = () => {
      isChatOpen.value = !isChatOpen.value;
    };

    const handleOpenModule = (moduleName) => {
      console.log(`[CreatorPage] Opening module: ${moduleName}`, {
        timestamp: new Date().toISOString(),
        previousState: {
          isSettingsOpen: isSettingsOpen.value,
          isProfileOpen: isProfileOpen.value,
          isVariablesOpen: isVariablesOpen.value
        }
      });
      try {
        if (moduleName === 'settings') {
          isSettingsOpen.value = true;
          console.log('[CreatorPage] Settings module opened');
        } else if (moduleName === 'profile') {
          isProfileOpen.value = true;
          console.log('[CreatorPage] Profile module opened');
        } else if (moduleName === 'variables') {
          isVariablesOpen.value = true;
          console.log('[CreatorPage] Variables module opened');
        } else {
          console.warn(`[CreatorPage] Unknown module name: ${moduleName}`);
          throw new Error(`Unknown module: ${moduleName}`);
        }
      } catch (error) {
        console.error(`[CreatorPage] Failed to open module ${moduleName}:`, error);
        console.error('[CreatorPage] Error context:', {
          module: moduleName,
          error: error.message,
          stack: error.stack
        });
      }
    };

    const closeSettings = () => {
      console.log('[CreatorPage] Closing settings module...', {
        timestamp: new Date().toISOString()
      });
      isSettingsOpen.value = false;
    };

    const closeProfile = () => {
      console.log('[CreatorPage] Closing profile module...', {
        timestamp: new Date().toISOString()
      });
      isProfileOpen.value = false;
    };

    const closeVariables = () => {
      console.log('[CreatorPage] Closing variables module...', {
        timestamp: new Date().toISOString()
      });
      isVariablesOpen.value = false;
    };

    const setupEventListeners = () => {
      console.log('[CreatorPage] Setting up module event listeners...', {
        timestamp: new Date().toISOString()
      });

      try {
        const moduleOpenHandler = (event) => {
          console.log('[CreatorPage] Received module-open event:', {
            module: event.detail?.module,
            detail: event.detail,
            timestamp: new Date().toISOString()
          });

          try {
            if (!event.detail || !event.detail.module) {
              console.warn('[CreatorPage] Invalid module-open event: missing module name', event.detail);
              return;
            }
            handleOpenModule(event.detail.module);
          } catch (error) {
            console.error('[CreatorPage] Error handling module-open event:', {
              error: error.message,
              module: event.detail?.module,
              stack: error.stack
            });
          }
        };

        window.addEventListener('module-open', moduleOpenHandler);
        console.log('[CreatorPage] Event listeners setup complete');

        return moduleOpenHandler;
      } catch (error) {
        console.error('[CreatorPage] Failed to setup event listeners:', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    };

    const cleanupEventListeners = (handler) => {
      console.log('[CreatorPage] Cleaning up event listeners...', {
        timestamp: new Date().toISOString()
      });
      try {
        if (handler) {
          window.removeEventListener('module-open', handler);
          console.log('[CreatorPage] Event listeners cleaned up successfully');
        } else {
          console.warn('[CreatorPage] No handler provided for cleanup');
        }
      } catch (error) {
        console.error('[CreatorPage] Error during cleanup:', {
          error: error.message,
          stack: error.stack
        });
      }
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

    let eventHandler = null;

    onMounted(() => {
      console.log('[CreatorPage] Component mounting...', {
        timestamp: new Date().toISOString()
      });
      try {
        eventHandler = setupEventListeners();
        console.log('[CreatorPage] Component mounted successfully');
      } catch (error) {
        console.error('[CreatorPage] Mount failed:', error);
        console.error('[CreatorPage] Stack trace:', error.stack);
      }
    });

    onUnmounted(() => {
      console.log('[CreatorPage] Component unmounting...');
      try {
        cleanupEventListeners(eventHandler);
        console.log('[CreatorPage] Component unmounted successfully');
      } catch (error) {
        console.error('[CreatorPage] Unmount cleanup error:', error);
      }
    });

    return {
      title,
      description,
      goToHome,
      createSchedule,
      onScheduleChange,
      isChatOpen,
      toggleChat,
      isSettingsOpen,
      isProfileOpen,
      isVariablesOpen,
      closeSettings,
      closeProfile,
      closeVariables,
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

