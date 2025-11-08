<template>
  <div class="creator-page">
    <div class="top-nav">
      <a href="#" @click.prevent="goToHome">← Home</a>
    </div>
    <div class="creator-layout">
      <div class="content-section">
        <div class="content-container">
          <h1 class="page-title">Create New Schedule</h1>
          <p class="page-description">Import data or create a new preset</p>
          
          <div class="preset-options">
            <div v-if="!showCreateForm">
              <button class="option-btn create-btn" @click="showCreateForm = true">
                <span class="btn-icon">+</span>
                <span class="btn-text">Create New Schedule Preset</span>
              </button>
            </div>
            
            <div v-else class="create-form">
              <label class="form-label">Preset Name</label>
              <input
                v-model="newPresetName"
                type="text"
                placeholder="Enter preset name..."
                class="name-input"
                @keyup.enter="createNewPreset"
              />
              <button class="option-btn lets-go-btn" @click="createNewPreset">
                <span class="btn-text">Let's go</span>
              </button>
            </div>
            
            <div class="modify-section">
              <label class="section-label">Modify Past/Existing Preset</label>
              <div class="dropdown-wrapper" ref="dropdownWrapper">
                <input
                  type="text"
                  v-model="searchQuery"
                  @focus="handleFocus"
                  @blur="handleBlur"
                  @input="filterPresets"
                  placeholder="Search for a schedule preset..."
                  class="search-input"
                />
                <div class="dropdown" :style="dropdownStyle" v-if="showDropdown">
                  <div v-if="filteredPresets.length > 0">
                    <div
                      v-for="preset in filteredPresets"
                      :key="preset.id"
                      @mousedown.prevent="selectPreset(preset)"
                      class="dropdown-item"
                    >
                      <div class="preset-name">{{ preset.name || preset.id }}</div>
                      <div class="preset-date">{{ formatDate(preset.updatedAt || preset.createdAt) }}</div>
                    </div>
                  </div>
                  <div v-else-if="searchQuery.trim() !== ''" class="dropdown-item no-results">
                    No presets found
                  </div>
                  <div v-else-if="presets.length === 0" class="dropdown-item no-results">
                    No presets available. Create a new one to get started.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="divider">
            <span class="divider-text">OR</span>
          </div>

          <div class="import-options">
            <button class="import-btn schoolsoft-btn" @click="importFromSchoolsoft">
              <div class="btn-content">
                <img :src="schoolsoftIcon" alt="Schoolsoft" class="btn-icon" />
                <div class="btn-text-group">
                  <span class="btn-title">Import from Schoolsoft</span>
                  <span class="btn-description">Import data from Schoolsoft</span>
                </div>
              </div>
            </button>
            
            <button class="import-btn skola24-btn" @click="importFromSkola24">
              <div class="btn-content">
                <img :src="skola24Icon" alt="Skola24" class="btn-icon" />
                <div class="btn-text-group">
                  <span class="btn-title">Import from Skola24</span>
                  <span class="btn-description">Import data from Skola24</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, computed, nextTick } from 'vue';
import schoolsoftIcon from '../assets/icons/unnamed.webp';
import skola24Icon from '../assets/icons/skola.png';

export default defineComponent({
  name: 'CreatorPage',
  setup() {
    const searchQuery = ref('');
    const showDropdown = ref(false);
    const presets = ref([]);
    const filteredPresets = ref([]);
    const dropdownWrapper = ref(null);
    const dropdownMaxHeight = ref('50vh');
    const showCreateForm = ref(false);
    const newPresetName = ref('');

    const goToHome = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
    };

    const importFromSchoolsoft = () => {
      // TODO: Implement Schoolsoft import
      console.log('Import from Schoolsoft clicked');
    };

    const importFromSkola24 = () => {
      // TODO: Implement Skola24 import
      console.log('Import from Skola24 clicked');
    };

    const loadPresets = async () => {
      try {
        if (window.api && window.api.listSchedules) {
          const scheduleList = await window.api.listSchedules();
          presets.value = scheduleList || [];
          filteredPresets.value = [...presets.value];
        }
      } catch (error) {
        console.error('Error loading presets:', error);
      }
    };

    const filterPresets = () => {
      if (!searchQuery.value.trim()) {
        filteredPresets.value = [...presets.value];
        return;
      }

      const query = searchQuery.value.toLowerCase().trim();
      filteredPresets.value = presets.value.filter(preset => {
        const name = String(preset.name || '').toLowerCase();
        return name.includes(query);
      });
    };

    const calculateMaxHeight = () => {
      if (!dropdownWrapper.value) return;
      
      nextTick(() => {
        const inputElement = dropdownWrapper.value?.querySelector('.search-input');
        if (!inputElement) return;
        
        const inputRect = inputElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - inputRect.bottom;
        const spaceAbove = inputRect.top;
        
        const margin = 20;
        const availableSpacePx = Math.min(spaceBelow - margin, spaceAbove - margin, viewportHeight * 0.5);
        const availableSpaceVh = (availableSpacePx / viewportHeight) * 100;
        dropdownMaxHeight.value = `${Math.max(20, Math.min(availableSpaceVh, 50))}vh`;
      });
    };

    const handleFocus = () => {
      showDropdown.value = true;
      calculateMaxHeight();
      filteredPresets.value = [...presets.value];
      if (searchQuery.value.trim()) {
        filterPresets();
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        showDropdown.value = false;
      }, 200);
    };

    const dropdownStyle = computed(() => {
      return {
        maxHeight: dropdownMaxHeight.value,
      };
    });

    const selectPreset = (preset) => {
      window.dispatchEvent(new CustomEvent('navigate', { 
        detail: { 
          page: 'viewer',
          presetId: preset.id
        } 
      }));
    };

    const createNewPreset = async () => {
      if (!newPresetName.value.trim()) {
        return;
      }
      
      try {
        const newPresetId = `schema-${Date.now()}`;
        const presetName = newPresetName.value.trim();
        
        const newSchedule = {
          id: newPresetId,
          name: presetName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          blocks: []
        };
        
        if (window.api && window.api.saveSchedule) {
          const result = await window.api.saveSchedule(newSchedule);
          if (!result || !result.success) {
            console.error('Failed to save schedule:', result?.error);
            return;
          }
        } else {
          console.error('saveSchedule API not available');
          return;
        }
        
        window.dispatchEvent(new CustomEvent('navigate', { 
          detail: { 
            page: 'viewer',
            presetId: newPresetId,
            presetName: presetName
          } 
        }));
      } catch (error) {
        console.error('Error creating preset:', error);
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    onMounted(() => {
      loadPresets();
    });

    return {
      searchQuery,
      showDropdown,
      presets,
      filteredPresets,
      dropdownWrapper,
      dropdownStyle,
      showCreateForm,
      newPresetName,
      goToHome,
      importFromSchoolsoft,
      importFromSkola24,
      filterPresets,
      handleFocus,
      handleBlur,
      selectPreset,
      createNewPreset,
      formatDate,
      schoolsoftIcon,
      skola24Icon,
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
  background: transparent;
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

.content-section {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4vh;
  max-width: 80vh;
  margin: 0 auto;
  width: 100%;
}

.page-title {
  font-size: 3.5vh;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 1vh 0;
  text-align: center;
}

.page-description {
  font-size: 1.6vh;
  color: #718096;
  margin: 0 0 5vh 0;
  text-align: center;
}

.preset-options {
  width: 100%;
  max-width: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.option-btn {
  width: 100%;
  padding: 2.5vh 3vh;
  border: none;
  border-radius: 1.2vh;
  font-size: 1.8vh;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5vh;
  margin-bottom: 3vh;
}

.create-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 0.4vh 1.5vh rgba(102, 126, 234, 0.3);
}

.create-btn:hover {
  transform: translateY(-0.2vh);
  box-shadow: 0 0.6vh 2vh rgba(102, 126, 234, 0.4);
}

.option-btn .btn-icon {
  font-size: 2.5vh;
  font-weight: 300;
  line-height: 1;
}

.option-btn .btn-text {
  font-size: 1.8vh;
}

.modify-section {
  margin-top: 2vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.section-label {
  display: block;
  font-size: 1.5vh;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 1.5vh;
  width: 100%;
  text-align: center;
}

.dropdown-wrapper {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 2vh 2.5vh;
  border: 0.2vh solid #e2e8f0;
  border-radius: 1.2vh;
  font-size: 1.7vh;
  color: #2d3748;
  background: #fff;
  transition: all 0.2s ease;
  box-sizing: border-box;
  text-align: center;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 0.3vh rgba(102, 126, 234, 0.1);
}

.search-input::placeholder {
  color: #a0aec0;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5vh;
  background: #fff;
  border: 0.2vh solid #e2e8f0;
  border-radius: 1.2vh;
  box-shadow: 0 0.4vh 1.5vh rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 100;
  max-height: 50vh;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.dropdown::-webkit-scrollbar {
  width: 0.8vh;
}

.dropdown::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 0.5vh;
}

.dropdown::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 0.5vh;
}

.dropdown::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.dropdown-item {
  padding: 1.8vh 2.5vh;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 0.1vh solid #f0f0f0;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: #f7fafc;
}

.dropdown-item:active {
  background-color: #edf2f7;
}

.preset-name {
  font-size: 1.7vh;
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 0.5vh;
}

.preset-date {
  font-size: 1.4vh;
  color: #718096;
}

.no-results {
  color: #a0aec0;
  font-style: italic;
  cursor: default;
}

.no-results:hover {
  background-color: #fff;
}

.create-form {
  margin-bottom: 3vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-label {
  display: block;
  font-size: 1.5vh;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 1.5vh;
  width: 100%;
  text-align: center;
}

.name-input {
  width: 100%;
  padding: 2vh 2.5vh;
  border: 0.2vh solid #e2e8f0;
  border-radius: 1.2vh;
  font-size: 1.7vh;
  color: #2d3748;
  background: #fff;
  transition: all 0.2s ease;
  box-sizing: border-box;
  margin-bottom: 2vh;
  text-align: center;
}

.name-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 0.3vh rgba(102, 126, 234, 0.1);
}

.name-input::placeholder {
  color: #a0aec0;
}

.lets-go-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 0.4vh 1.5vh rgba(102, 126, 234, 0.3);
  width: 100%;
}

.lets-go-btn:hover {
  transform: translateY(-0.2vh);
  box-shadow: 0 0.6vh 2vh rgba(102, 126, 234, 0.4);
}

.divider {
  width: 100%;
  max-width: 60vh;
  display: flex;
  align-items: center;
  margin: 2vh 0 4vh 0;
  text-align: center;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 0.1vh solid #e2e8f0;
}

.divider-text {
  padding: 0 2vh;
  font-size: 1.4vh;
  color: #a0aec0;
  font-weight: 500;
}

.import-options {
  width: 100%;
  max-width: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3vh;
}

.import-btn {
  width: 70%;
  padding: 2.5vh 3vh;
  border: 0.2vh solid #e2e8f0;
  border-radius: 1.2vh;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  box-shadow: 0 0.2vh 0.8vh rgba(0, 0, 0, 0.05);
}

.import-btn:hover {
  transform: translateY(-0.2vh);
  box-shadow: 0 0.4vh 1.5vh rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 2.2vh;
}

.btn-icon {
  width: 3.5vh;
  height: 3.5vh;
  flex-shrink: 0;
  object-fit: contain;
}

.btn-text-group {
  display: flex;
  flex-direction: column;
  gap: 0.5vh;
  flex: 1;
}

.btn-title {
  font-size: 1.8vh;
  font-weight: 600;
  color: #2d3748;
  display: block;
}

.btn-description {
  font-size: 1.4vh;
  color: #718096;
  display: block;
}

.schoolsoft-btn:hover {
  border-color: #4a90e2;
}

.schoolsoft-btn:hover .btn-title {
  color: #4a90e2;
}

.skola24-btn:hover {
  border-color: #48bb78;
}

.skola24-btn:hover .btn-title {
  color: #48bb78;
}
</style>
