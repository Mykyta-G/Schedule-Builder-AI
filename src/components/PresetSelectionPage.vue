<template>
  <div class="preset-selection-page">
    <div class="top-nav">
      <a href="#" @click.prevent="goToHome">← Home</a>
    </div>
    <div class="content-container">
      <h1 class="page-title">Schedule Presets</h1>
      <p class="page-description">Create a new schedule preset or modify an existing one</p>
      
      <div class="options-container">
        <button class="option-btn create-btn" @click="createNewPreset">
          <span class="btn-icon">+</span>
          <span class="btn-text">Create New Schedule Preset</span>
        </button>
        
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
            <div class="dropdown" :style="dropdownStyle" v-if="showDropdown && filteredPresets.length > 0">
              <div
                v-for="preset in filteredPresets"
                :key="preset.id"
                @click="selectPreset(preset)"
                class="dropdown-item"
              >
                <div class="preset-name">{{ preset.name || preset.id }}</div>
                <div class="preset-date">{{ formatDate(preset.updatedAt || preset.createdAt) }}</div>
              </div>
            </div>
            <div class="dropdown empty-dropdown" :style="dropdownStyle" v-if="showDropdown && filteredPresets.length === 0 && searchQuery">
              <div class="dropdown-item no-results">No presets found</div>
            </div>
            <div class="dropdown empty-dropdown" :style="dropdownStyle" v-if="showDropdown && presets.length === 0 && !searchQuery">
              <div class="dropdown-item no-results">No presets available. Create a new one to get started.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, computed, nextTick } from 'vue';

export default defineComponent({
  name: 'PresetSelectionPage',
  setup() {
    const searchQuery = ref('');
    const showDropdown = ref(false);
    const presets = ref([]);
    const filteredPresets = ref([]);
    const dropdownWrapper = ref(null);
    const dropdownMaxHeight = ref('50vh');

    const goToHome = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
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

      const query = searchQuery.value.toLowerCase();
      filteredPresets.value = presets.value.filter(preset => {
        const name = (preset.name || preset.id || '').toLowerCase();
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
        
        // Calculate available space in pixels, leaving margin
        const margin = 20; // 20px margin
        const availableSpacePx = Math.min(spaceBelow - margin, spaceAbove - margin, viewportHeight * 0.5);
        
        // Convert to vh units or use pixels
        const availableSpaceVh = (availableSpacePx / viewportHeight) * 100;
        dropdownMaxHeight.value = `${Math.max(20, Math.min(availableSpaceVh, 50))}vh`;
      });
    };

    const handleFocus = () => {
      showDropdown.value = true;
      calculateMaxHeight();
    };

    const handleBlur = () => {
      // Delay to allow click events to fire
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
          page: 'creator',
          presetId: preset.id
        } 
      }));
    };

    const createNewPreset = () => {
      // Generate a new preset ID with timestamp
      const newPresetId = `schema-${Date.now()}`;
      window.dispatchEvent(new CustomEvent('navigate', { 
        detail: { 
          page: 'creator',
          presetId: newPresetId
        } 
      }));
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
      goToHome,
      filterPresets,
      handleFocus,
      handleBlur,
      selectPreset,
      createNewPreset,
      formatDate,
    };
  },
});
</script>

<style scoped>
.preset-selection-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafafa;
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

.options-container {
  width: 100%;
  max-width: 60vh;
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

.btn-icon {
  font-size: 2.5vh;
  font-weight: 300;
  line-height: 1;
}

.btn-text {
  font-size: 1.8vh;
}

.modify-section {
  margin-top: 2vh;
}

.section-label {
  display: block;
  font-size: 1.5vh;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 1.5vh;
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
  /* Enable smooth scrolling and touch support */
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  /* Ensure scrollbar is visible and styled */
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
</style>

