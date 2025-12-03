<template>
  <div class="home-page">
    <div class="content-container">
      <div class="hero-section">
        <h1 class="page-title">{{ appTitle }}</h1>
        <p class="page-description">Create and manage your schedules with ease. Import data from Schoolsoft or Skola24, or build your schedule manually.</p>
        <div class="button-wrapper" ref="dropdownWrapper">
          <button class="cta-button" @click="handleButtonClick">
            <span class="btn-text">Lets go!</span>
            <span class="btn-icon">🚀</span>
            <span class="dropdown-arrow" @click.stop="toggleDropdown" :class="{ 'open': showDropdown }">▼</span>
          </button>
          <div class="dropdown" :style="dropdownStyle" v-if="showDropdown">
            <div class="search-container">
              <input
                type="text"
                v-model="searchQuery"
                @input="filterPresets"
                placeholder="Search presets..."
                class="search-input"
                @click.stop
              />
            </div>
            <div class="dropdown-list" :style="{ maxHeight: dropdownMaxHeight }">
              <div v-if="filteredPresets.length > 0">
                <div
                  v-for="preset in filteredPresets"
                  :key="preset.id"
                  class="dropdown-item"
                >
                  <div class="preset-content" @mousedown.prevent="selectPreset(preset)">
                    <div class="preset-name">{{ preset.name || preset.id }}</div>
                    <div class="preset-date">{{ formatDate(preset.updatedAt || preset.createdAt) }}</div>
                  </div>
                  <button 
                    class="preset-delete-btn" 
                    @click.stop="deletePreset(preset.id)"
                    title="Delete preset"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div v-else-if="presets.length === 0" class="dropdown-item no-results">
                No presets available. Create a new one to get started.
              </div>
              <div v-else class="dropdown-item no-results">
                No presets found
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted, computed, nextTick } from 'vue';

export default defineComponent({
  name: 'HomePage',
  setup() {
    const appTitle = ref('Schedule Builder AI');
    const showDropdown = ref(false);
    const presets = ref([]);
    const filteredPresets = ref([]);
    const dropdownWrapper = ref(null);
    const dropdownMaxHeight = ref('50vh');
    const searchQuery = ref('');

    onMounted(() => {
      if (window.api && window.api.title) {
        appTitle.value = window.api.title;
      }
      loadPresets();
    });

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

    const calculateMaxHeight = () => {
      if (!dropdownWrapper.value) return;
      
      nextTick(() => {
        const buttonElement = dropdownWrapper.value?.querySelector('.cta-button');
        if (!buttonElement) return;
        
        const buttonRect = buttonElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        
        // Account for search container height (~6vh) and margins
        const searchContainerHeight = 6;
        const margin = 20;
        const availableSpacePx = Math.min(spaceBelow - margin - searchContainerHeight, spaceAbove - margin - searchContainerHeight, viewportHeight * 0.5);
        const availableSpaceVh = (availableSpacePx / viewportHeight) * 100;
        dropdownMaxHeight.value = `${Math.max(20, Math.min(availableSpaceVh, 50))}vh`;
      });
    };

    const filterPresets = () => {
      if (!searchQuery.value.trim()) {
        filteredPresets.value = [...presets.value];
        return;
      }

      const query = searchQuery.value.toLowerCase().trim();
      filteredPresets.value = presets.value.filter(preset => {
        const name = String(preset.name || '').toLowerCase();
        const id = String(preset.id || '').toLowerCase();
        return name.includes(query) || id.includes(query);
      });
    };

    const toggleDropdown = async (event) => {
      event?.stopPropagation();
      showDropdown.value = !showDropdown.value;
      if (showDropdown.value) {
        // Refresh the presets list when opening the dropdown
        await loadPresets();
        calculateMaxHeight();
        searchQuery.value = '';
        filteredPresets.value = [...presets.value];
      }
    };

    const handleButtonClick = (event) => {
      // If clicking on the dropdown arrow or its children, toggle dropdown instead
      const clickedElement = event.target;
      if (clickedElement.classList.contains('dropdown-arrow') || 
          clickedElement.closest('.dropdown-arrow')) {
        event.stopPropagation();
        toggleDropdown(event);
        return;
      }
      // Otherwise create new schedule
      event.stopPropagation();
      goToCreator();
    };

    const selectPreset = (preset) => {
      showDropdown.value = false;
      window.dispatchEvent(new CustomEvent('navigate', { 
        detail: { 
          page: 'viewer',
          presetId: preset.id
        } 
      }));
    };

    const deletePreset = async (presetId) => {
      const preset = presets.value.find(p => p.id === presetId);
      const presetName = preset?.name || presetId;
      
      if (!confirm(`Are you sure you want to delete "${presetName}"?`)) {
        return;
      }

      try {
        if (!window.api || !window.api.deleteSchedule) {
          alert('Delete API not available');
          return;
        }

        const result = await window.api.deleteSchedule(presetId);
        
        if (result && result.success) {
          // Reload the presets list
          await loadPresets();
        } else {
          alert(result?.error || 'Failed to delete preset');
        }
      } catch (error) {
        console.error('Error deleting preset:', error);
        alert('An error occurred while deleting');
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

    const dropdownStyle = computed(() => {
      return {
        maxHeight: dropdownMaxHeight.value,
      };
    });

    const goToCreator = async () => {
      try {
        // Generate auto name based on current date/time
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        const timeStr = now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        const autoName = `Schedule ${dateStr} ${timeStr}`;
        
        const newPresetId = `schema-${Date.now()}`;
        
        const newSchedule = {
          id: newPresetId,
          name: autoName,
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
            presetName: autoName
          } 
        }));
      } catch (error) {
        console.error('Error creating schedule:', error);
      }
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      // Don't close if clicking on the button or dropdown
      if (dropdownWrapper.value && dropdownWrapper.value.contains(event.target)) {
        return;
      }
      showDropdown.value = false;
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      appTitle,
      goToCreator,
      handleButtonClick,
      showDropdown,
      presets,
      filteredPresets,
      dropdownWrapper,
      dropdownStyle,
      toggleDropdown,
      selectPreset,
      deletePreset,
      formatDate,
      searchQuery,
      filterPresets,
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
  background: transparent;
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

.button-wrapper {
  position: relative;
  display: inline-block;
}

.cta-button {
  padding: 3.5vh 8vh;
  padding-right: 4vh;
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
  position: relative;
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

.dropdown-arrow {
  font-size: 1.5vh;
  transition: transform 0.3s ease;
  cursor: pointer;
  padding-left: 1vh;
  border-left: 0.15vh solid rgba(255, 255, 255, 0.3);
  padding-left: 1.5vh;
  margin-left: 1vh;
  display: flex;
  align-items: center;
  height: 100%;
}

.dropdown-arrow:hover {
  opacity: 0.9;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  top: calc(100% + 1vh);
  left: 50%;
  transform: translateX(-50%);
  min-width: 40vh;
  max-width: 60vh;
  width: max-content;
  background: #fff;
  border: 0.2vh solid #e2e8f0;
  border-radius: 1.2vh;
  box-shadow: 0 0.4vh 1.5vh rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.search-container {
  padding: 1.5vh;
  border-bottom: 0.1vh solid #e2e8f0;
  background: #f7fafc;
}

.search-input {
  width: 100%;
  padding: 1.5vh 2vh;
  border: 0.15vh solid #cbd5e0;
  border-radius: 0.8vh;
  font-size: 1.6vh;
  color: #2d3748;
  background: #fff;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 0.2vh rgba(102, 126, 234, 0.1);
}

.search-input::placeholder {
  color: #a0aec0;
}

.dropdown-list {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
  flex: 1;
  min-height: 0;
}

.dropdown-list::-webkit-scrollbar {
  width: 0.8vh;
}

.dropdown-list::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 0.5vh;
}

.dropdown-list::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 0.5vh;
}

.dropdown-list::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
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
  padding: 2vh 2.5vh;
  transition: background-color 0.2s ease;
  border-bottom: 0.1vh solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1vh;
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

.preset-content {
  flex: 1;
  cursor: pointer;
  min-width: 0;
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

.preset-delete-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 2.4vh;
  line-height: 1;
  cursor: pointer;
  padding: 0.8vh 1.2vh;
  border-radius: 0.6vh;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 0;
  font-weight: 300;
}

.dropdown-item:hover .preset-delete-btn {
  opacity: 1;
}

.preset-delete-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.no-results {
  color: #a0aec0;
  font-style: italic;
  cursor: default;
  text-align: center;
  padding: 3vh 2vh;
}

.no-results:hover {
  background-color: #fff;
}
</style>
