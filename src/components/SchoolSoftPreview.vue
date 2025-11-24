<template>
  <div class="preview-page">
    <div class="top-nav">
      <span class="nav-title">Import Preview</span>
    </div>

    <div class="content-container">
      <div class="summary-card">
        <h2>Found {{ classCount }} Classes</h2>
        <p class="summary-text">Review the classes found in your schedule below.</p>
      </div>

      <div class="classes-list">
        <div v-if="classes.length === 0" class="empty-state">
          No classes found. Please go back and try again.
        </div>
        <div v-else v-for="(cls, index) in classes" :key="index" class="class-item">
          <div class="class-time">{{ cls.day }} {{ cls.startTime }} - {{ cls.endTime }}</div>
          <div class="class-info">
            <div class="class-title">{{ cls.subject || 'Unknown Subject' }}</div>
            <div class="class-details">
              <span v-if="cls.room">📍 {{ cls.room }}</span>
              <span v-if="cls.teacher">👤 {{ cls.teacher }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="cancel-btn" @click="goBack">Cancel</button>
        <button class="confirm-btn" @click="confirmImport" :disabled="classes.length === 0">
          Confirm & Import
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted } from 'vue';

export default defineComponent({
  name: 'SchoolSoftPreview',
  props: {
    initialData: {
      type: Object,
      default: () => ({ classes: [] })
    }
  },
  setup(props) {
    const classes = ref([]);

    const classCount = computed(() => classes.value.length);

    onMounted(() => {
      if (props.initialData && props.initialData.classes) {
        classes.value = props.initialData.classes;
      }
    });

    const goBack = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'schoolsoft-login' } }));
    };

    const confirmImport = async () => {
      try {
        // Save the schedule
        const newSchedule = {
          id: `schoolsoft-${Date.now()}`,
          name: 'Imported Schedule',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          blocks: classes.value.map((cls, idx) => ({
            id: `block-${Date.now()}-${idx}`,
            title: cls.subject,
            room: cls.room,
            teacher: cls.teacher,
            startTime: cls.startTime,
            endTime: cls.endTime,
            day: cls.day,
            // Add other fields as needed for your data model
          }))
        };

        if (window.api && window.api.saveSchedule) {
          const result = await window.api.saveSchedule(newSchedule);
          if (result.success) {
            // Navigate to viewer
            window.dispatchEvent(new CustomEvent('navigate', { 
              detail: { 
                page: 'viewer',
                presetId: newSchedule.id
              } 
            }));
          } else {
            console.error('Failed to save:', result.error);
            alert('Failed to save schedule.');
          }
        }
      } catch (error) {
        console.error('Error saving:', error);
        alert('An error occurred while saving.');
      }
    };

    return {
      classes,
      classCount,
      goBack,
      confirmImport
    };
  }
});
</script>

<style scoped>
.preview-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.top-nav {
  padding: 2vh;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  text-align: center;
}

.nav-title {
  font-weight: 600;
  font-size: 1.8vh;
  color: #2d3748;
}

.content-container {
  flex: 1;
  padding: 3vh;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.summary-card {
  text-align: center;
  margin-bottom: 3vh;
}

.summary-card h2 {
  font-size: 2.5vh;
  color: #2d3748;
  margin: 0 0 1vh 0;
}

.summary-text {
  color: #718096;
  font-size: 1.6vh;
}

.classes-list {
  flex: 1;
  overflow-y: auto;
  background: #fff;
  border-radius: 1.5vh;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  padding: 1vh;
}

.class-item {
  padding: 1.5vh 2vh;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.class-item:last-child {
  border-bottom: none;
}

.class-time {
  font-weight: 600;
  color: #667eea;
  font-size: 1.5vh;
  width: 15vh;
}

.class-info {
  flex: 1;
}

.class-title {
  font-weight: 500;
  color: #2d3748;
  font-size: 1.6vh;
  margin-bottom: 0.5vh;
}

.class-details {
  font-size: 1.3vh;
  color: #718096;
  display: flex;
  gap: 1.5vh;
}

.actions {
  margin-top: 3vh;
  display: flex;
  gap: 2vh;
  justify-content: center;
}

.cancel-btn, .confirm-btn {
  padding: 1.5vh 4vh;
  border-radius: 1vh;
  font-weight: 600;
  font-size: 1.6vh;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #718096;
}

.cancel-btn:hover {
  background: #f7fafc;
}

.confirm-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
