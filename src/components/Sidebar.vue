<template>
  <div class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <h2 class="sidebar-title">Verktyg</h2>
      <div class="header-icons">
        <button class="icon-btn" @click="navigateTo('settings')" title="Inställningar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button class="icon-btn" @click="navigateTo('profile')" title="Profil">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>
        <button class="icon-btn" @click="navigateTo('variables')" title="Variabler">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 12h16M4 17h16"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <!-- Month calendar -->
    <div class="calendar-section">
      <h3 class="section-title">Kalender</h3>
      <div class="calendar">
        <div class="calendar-header">
          <div class="calendar-month">{{ currentMonthName }} {{ currentYear }}</div>
        </div>
        <div class="calendar-weekdays">
          <div
            v-for="day in weekdays"
            :key="day"
            class="calendar-weekday"
          >
            {{ day }}
          </div>
        </div>
        <div class="calendar-days">
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            class="calendar-day"
            :class="{
              'other-month': day.otherMonth,
              'today': day.isToday,
              'selected': day.isSelected
            }"
            @click="selectCalendarDay(day)"
          >
            {{ day.day }}
          </div>
        </div>
      </div>
    </div>

    <!-- Block form -->
    <div class="block-form">
      <h3 class="section-title">Skapa block</h3>
      <div class="form-group">
        <label for="lesson-input">Lektioner</label>
        <input
          id="lesson-input"
          v-model="newBlock.title"
          type="text"
          placeholder="T.ex. Matematik"
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label for="room-input">Sal</label>
        <input
          id="room-input"
          v-model="newBlock.room"
          type="text"
          placeholder="T.ex. A101"
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label for="teacher-input">Lärare</label>
        <input
          id="teacher-input"
          v-model="newBlock.teacher"
          type="text"
          placeholder="T.ex. Andersson"
          class="form-input"
        />
      </div>
      <button
        class="add-block-btn"
        @click="createBlock"
        :disabled="!canCreateBlock"
      >
        Lägg till block
      </button>
    </div>

    <!-- Old schedules dropdown -->
    <div class="schedules-section">
      <h3 class="section-title">Gamla scheman</h3>
      <div class="dropdown-wrapper">
        <input
          v-model="scheduleFilter"
          type="text"
          placeholder="Sök schema..."
          class="schedule-search-input"
          @input="filterSchedules"
        />
        <select
          v-model="activeSchemaId"
          @change="onScheduleChange"
          class="schedule-dropdown"
        >
          <option value="">-- Välj schema --</option>
          <option
            v-for="schedule in filteredSchedules"
            :key="schedule.id"
            :value="schedule.id"
          >
            {{ schedule.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Global search -->
    <div class="search-section">
      <h3 class="section-title">Sök</h3>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Sök i allt..."
        class="search-input"
        @input="handleSearch"
      />
    </div>

    <!-- Block list -->
    <div class="blocks-section">
      <h3 class="section-title">Block ({{ activeSchemaBlocks.length }})</h3>
      <div class="blocks-list" ref="blocksListRef">
        <div
          v-for="block in activeSchemaBlocks"
          :key="block.id"
          :ref="el => setBlockRef(el, block.id)"
          :data-block-id="block.id"
          :data-block-type="block.title"
          class="block-item"
          :class="{ 'is-highlighted': highlightedBlockId === block.id }"
        >
          <div v-if="editingBlockId !== block.id" class="block-content">
            <div class="block-row">
              <span class="block-label">Lektioner:</span>
              <span class="block-value">{{ block.title || '-' }}</span>
            </div>
            <div class="block-row">
              <span class="block-label">Sal:</span>
              <span class="block-value">{{ block.room || '-' }}</span>
            </div>
            <div class="block-row">
              <span class="block-label">Lärare:</span>
              <span class="block-value">{{ block.teacher || '-' }}</span>
            </div>
            <button class="edit-btn" @click="startEditBlock(block)">
              Redigera
            </button>
          </div>
          <div v-else class="block-edit">
            <div class="form-group">
              <label>Lektioner</label>
              <input
                v-model="editingBlock.title"
                type="text"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Sal</label>
              <input
                v-model="editingBlock.room"
                type="text"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Lärare</label>
              <input
                v-model="editingBlock.teacher"
                type="text"
                class="form-input"
              />
            </div>
            <div class="edit-actions">
              <button class="save-btn" @click="saveBlockEdit">Spara</button>
              <button class="cancel-btn" @click="cancelEditBlock">Avbryt</button>
            </div>
          </div>
        </div>
        <div v-if="activeSchemaBlocks.length === 0" class="empty-state">
          Inga block ännu. Skapa ditt första block ovan.
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

export default defineComponent({
  name: 'Sidebar',
  setup() {
    // State
    const errorMessage = ref('');
    const newBlock = reactive({
      title: '',
      room: '',
      teacher: ''
    });
    const schedules = ref([]);
    const activeSchemaId = ref('');
    const activeSchema = ref(null);
    const activeSchemaBlocks = ref([]);
    const scheduleFilter = ref('');
    const filteredSchedules = ref([]);
    const searchQuery = ref('');
    const editingBlockId = ref(null);
    const editingBlock = reactive({
      id: null,
      title: '',
      room: '',
      teacher: ''
    });
    const highlightedBlockId = ref(null);
    const blocksListRef = ref(null);
    const blockRefs = ref({});

    // Calendar
    const currentDate = ref(new Date());
    const selectedScheduleDay = ref(null); // Day name like 'Monday', 'Tuesday', etc.
    const selectedCalendarDate = ref(null); // Date object for the selected day
    
    const currentMonthName = computed(() => {
      const months = [
        'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
        'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
      ];
      return months[currentDate.value.getMonth()];
    });
    const currentYear = computed(() => currentDate.value.getFullYear());
    const weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

    // Map day names to day of week index (Monday = 0, Tuesday = 1, etc.)
    const dayNameToIndex = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 0
    };

    // Get date for a given day name in current week
    const getDateForDayName = (dayName) => {
      const today = new Date();
      const dayIndex = dayNameToIndex[dayName];
      if (dayIndex === undefined) return null;
      
      const todayDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentMonday = new Date(today);
      const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
      currentMonday.setDate(today.getDate() + mondayOffset);
      
      const targetDate = new Date(currentMonday);
      const offset = dayIndex === 0 ? 6 : dayIndex - 1; // Map Sunday (0) to 6
      targetDate.setDate(currentMonday.getDate() + offset);
      
      return targetDate;
    };

    const calendarDays = computed(() => {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      // Start Monday of the week containing the first day
      const startDate = new Date(firstDay);
      const dayOfWeek = firstDay.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(firstDay.getDate() - mondayOffset);
      
      // End Sunday of the week containing the last day
      const endDate = new Date(lastDay);
      const lastDayOfWeek = lastDay.getDay();
      const sundayOffset = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
      endDate.setDate(lastDay.getDate() + sundayOffset);
      
      const today = new Date();
      const days = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dayDate = new Date(current);
        const isToday = dayDate.toDateString() === today.toDateString();
        const isSelected = selectedCalendarDate.value && 
          dayDate.toDateString() === selectedCalendarDate.value.toDateString();
        
        days.push({
          day: current.getDate(),
          otherMonth: current.getMonth() !== month,
          isToday,
          isSelected,
          date: new Date(dayDate)
        });
        current.setDate(current.getDate() + 1);
      }
      
      return days;
    });

    // Computed
    const canCreateBlock = computed(() => {
      return activeSchemaId.value && (newBlock.title.trim() || newBlock.room.trim() || newBlock.teacher.trim());
    });

    // Methods
    const navigateTo = (page) => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page } }));
    };

    const showError = (message) => {
      errorMessage.value = message;
      setTimeout(() => {
        errorMessage.value = '';
      }, 5000);
    };

    const loadSchedules = async () => {
      try {
        if (!window.api || !window.api.listSchedules) {
          showError('IPC API inte tillgänglig');
          return;
        }
        const result = await window.api.listSchedules();
        schedules.value = result || [];
        filteredSchedules.value = schedules.value;
      } catch (error) {
        console.error('Error loading schedules:', error);
        showError('Kunde inte ladda scheman');
      }
    };

    const loadSchema = async (scheduleId) => {
      if (!scheduleId) {
        activeSchema.value = null;
        activeSchemaBlocks.value = [];
        return;
      }

      try {
        if (!window.api || !window.api.readSchedule) {
          showError('IPC API inte tillgänglig');
          return;
        }
        const schema = await window.api.readSchedule(scheduleId);
        if (schema) {
          activeSchema.value = schema;
          activeSchemaBlocks.value = schema.blocks || [];
        } else {
          // Create new schema if it doesn't exist
          activeSchema.value = {
            id: scheduleId,
            name: scheduleId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            blocks: []
          };
          activeSchemaBlocks.value = [];
          await saveSchema(activeSchema.value);
        }
      } catch (error) {
        console.error('Error loading schema:', error);
        showError('Kunde inte ladda schema');
      }
    };

    const saveSchema = async (schema) => {
      try {
        if (!window.api || !window.api.saveSchedule) {
          showError('IPC API inte tillgänglig');
          return;
        }
        const result = await window.api.saveSchedule(schema);
        if (!result.success) {
          showError(result.error || 'Kunde inte spara schema');
        }
      } catch (error) {
        console.error('Error saving schema:', error);
        showError('Kunde inte spara schema');
      }
    };

    const createBlock = async () => {
      if (!activeSchemaId.value) {
        showError('Välj ett schema först');
        return;
      }

      if (!newBlock.title.trim() && !newBlock.room.trim() && !newBlock.teacher.trim()) {
        showError('Fyll i minst ett fält');
        return;
      }

      const block = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: newBlock.title.trim() || '',
        room: newBlock.room.trim() || '',
        teacher: newBlock.teacher.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      activeSchemaBlocks.value.unshift(block);
      if (activeSchema.value) {
        activeSchema.value.blocks = activeSchemaBlocks.value;
        activeSchema.value.updatedAt = new Date().toISOString();
        await saveSchema(activeSchema.value);
      }

      // Reset form
      newBlock.title = '';
      newBlock.room = '';
      newBlock.teacher = '';
    };

    const startEditBlock = (block) => {
      editingBlockId.value = block.id;
      editingBlock.id = block.id;
      editingBlock.title = block.title || '';
      editingBlock.room = block.room || '';
      editingBlock.teacher = block.teacher || '';
    };

    const cancelEditBlock = () => {
      editingBlockId.value = null;
      editingBlock.id = null;
      editingBlock.title = '';
      editingBlock.room = '';
      editingBlock.teacher = '';
    };

    const saveBlockEdit = async () => {
      const blockIndex = activeSchemaBlocks.value.findIndex(b => b.id === editingBlock.id);
      if (blockIndex === -1) {
        showError('Block hittades inte');
        return;
      }

      const updatedBlock = {
        ...activeSchemaBlocks.value[blockIndex],
        title: editingBlock.title.trim() || '',
        room: editingBlock.room.trim() || '',
        teacher: editingBlock.teacher.trim() || '',
        updatedAt: new Date().toISOString()
      };

      activeSchemaBlocks.value[blockIndex] = updatedBlock;
      if (activeSchema.value) {
        activeSchema.value.blocks = activeSchemaBlocks.value;
        activeSchema.value.updatedAt = new Date().toISOString();
        await saveSchema(activeSchema.value);
      }

      cancelEditBlock();
    };

    const onScheduleChange = async () => {
      await loadSchema(activeSchemaId.value);
    };

    const filterSchedules = () => {
      const query = scheduleFilter.value.toLowerCase().trim();
      if (!query) {
        filteredSchedules.value = schedules.value;
        return;
      }
      filteredSchedules.value = schedules.value.filter(s =>
        s.name.toLowerCase().includes(query)
      );
    };

    let searchTimeout = null;
    const handleSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch();
      }, 200);
    };

    const performSearch = async () => {
      const query = searchQuery.value.toLowerCase().trim();
      if (!query) {
        highlightedBlockId.value = null;
        return;
      }

      // Search in schedule names (use full list, not filtered)
      const scheduleMatch = schedules.value.find(s =>
        s.name.toLowerCase().includes(query)
      );

      // Search in current blocks
      const blockMatch = activeSchemaBlocks.value.find(block =>
        (block.title && block.title.toLowerCase().includes(query)) ||
        (block.room && block.room.toLowerCase().includes(query)) ||
        (block.teacher && block.teacher.toLowerCase().includes(query))
      );

      if (blockMatch) {
        highlightedBlockId.value = blockMatch.id;
        nextTick(() => {
          scrollToHighlightedBlock(blockMatch.id);
        });
      } else if (scheduleMatch) {
        // If only schedule match, switch to that schedule
        activeSchemaId.value = scheduleMatch.id;
        await loadSchema(scheduleMatch.id);
        // After loading, search for blocks in the new schedule
        nextTick(() => {
          const newBlockMatch = activeSchemaBlocks.value.find(block =>
            (block.title && block.title.toLowerCase().includes(query)) ||
            (block.room && block.room.toLowerCase().includes(query)) ||
            (block.teacher && block.teacher.toLowerCase().includes(query))
          );
          if (newBlockMatch) {
            highlightedBlockId.value = newBlockMatch.id;
            nextTick(() => {
              scrollToHighlightedBlock(newBlockMatch.id);
            });
          }
        });
      }
    };

    const scrollToHighlightedBlock = (blockId) => {
      const blockRef = blockRefs.value[blockId];
      if (blockRef && blocksListRef.value) {
        blockRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Remove highlight after 2.5s
      setTimeout(() => {
        if (highlightedBlockId.value === blockId) {
          highlightedBlockId.value = null;
        }
      }, 2500);
    };

    const setBlockRef = (el, blockId) => {
      if (el) {
        blockRefs.value[blockId] = el;
      }
    };

    // Select day from calendar and sync with SimpleSchedule
    const selectCalendarDay = (dayInfo) => {
      if (dayInfo.otherMonth) return; // Don't select days from other months
      
      selectedCalendarDate.value = dayInfo.date;
      
      // Map calendar date to day name
      const dayIndex = dayInfo.date.getDay();
      const dayNameMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNameMap[dayIndex];
      
      // Only update if it's a weekday (Monday-Friday)
      const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      if (weekdayNames.includes(dayName)) {
        selectedScheduleDay.value = dayName;
        // Emit event to SimpleSchedule to select this day
        window.dispatchEvent(new CustomEvent('schedule-select-day', { 
          detail: { day: dayName } 
        }));
      }
    };

    // Listen for day selection from SimpleSchedule
    const handleScheduleDaySelect = (event) => {
      const dayName = event.detail?.day;
      if (dayName && dayName !== selectedScheduleDay.value) {
        selectedScheduleDay.value = dayName;
        const dateForDay = getDateForDayName(dayName);
        if (dateForDay) {
          selectedCalendarDate.value = dateForDay;
          // If the selected day is in a different month, update currentDate
          if (dateForDay.getMonth() !== currentDate.value.getMonth()) {
            currentDate.value = new Date(dateForDay);
          }
        }
      }
    };

    // Lifecycle
    onMounted(async () => {
      await loadSchedules();
      
      // Listen for day selection events from SimpleSchedule
      window.addEventListener('schedule-day-selected', handleScheduleDaySelect);
      
      // Initial sync - if SimpleSchedule has a default day, update calendar
      // This will be handled when SimpleSchedule emits its initial selection
      setTimeout(() => {
        // Trigger initial sync by emitting default day if needed
        const defaultDay = 'Monday'; // SimpleSchedule default
        const dateForDay = getDateForDayName(defaultDay);
        if (dateForDay) {
          selectedScheduleDay.value = defaultDay;
          selectedCalendarDate.value = dateForDay;
        }
      }, 100);
    });

    onUnmounted(() => {
      window.removeEventListener('schedule-day-selected', handleScheduleDaySelect);
    });

    watch(activeSchemaId, (newId) => {
      if (newId) {
        loadSchema(newId);
      }
    });

    return {
      errorMessage,
      newBlock,
      schedules,
      activeSchemaId,
      activeSchemaBlocks,
      scheduleFilter,
      filteredSchedules,
      searchQuery,
      editingBlockId,
      editingBlock,
      highlightedBlockId,
      blocksListRef,
      currentMonthName,
      currentYear,
      weekdays,
      calendarDays,
      canCreateBlock,
      navigateTo,
      createBlock,
      startEditBlock,
      cancelEditBlock,
      saveBlockEdit,
      onScheduleChange,
      filterSchedules,
      handleSearch,
      setBlockRef,
      selectCalendarDay
    };
  },
});
</script>

<style scoped>
.sidebar {
  width: 320px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.header-icons {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: #f3f4f6;
  color: #1a1a1a;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 16px;
}

.block-form {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #8b5cf6;
}

.add-block-btn {
  width: 100%;
  padding: 10px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-top: 8px;
}

.add-block-btn:hover:not(:disabled) {
  background: #7c3aed;
}

.add-block-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.schedules-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.dropdown-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schedule-search-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.schedule-dropdown {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.search-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.blocks-section {
  margin-bottom: 24px;
  flex: 1;
  min-height: 0;
}

.blocks-list {
  max-height: 400px;
  overflow-y: auto;
}

.block-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.block-item.is-highlighted {
  background: #fef3c7;
  border-color: #f59e0b;
  animation: highlightPulse 0.5s ease;
}

@keyframes highlightPulse {
  0%, 100% { background: #fef3c7; }
  50% { background: #fde68a; }
}

.block-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.block-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.block-label {
  font-weight: 500;
  color: #6b7280;
  min-width: 70px;
}

.block-value {
  color: #1a1a1a;
  flex: 1;
}

.edit-btn {
  margin-top: 8px;
  padding: 6px 12px;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.2s ease;
}

.edit-btn:hover {
  background: #7c3aed;
}

.block-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.save-btn,
.cancel-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn {
  background: #10b981;
  color: white;
}

.save-btn:hover {
  background: #059669;
}

.cancel-btn {
  background: #e5e7eb;
  color: #374151;
}

.cancel-btn:hover {
  background: #d1d5db;
}

.empty-state {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  padding: 24px;
}

.calendar-section {
  margin-bottom: 24px;
}

.calendar {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.calendar-header {
  margin-bottom: 12px;
  text-align: center;
}

.calendar-month {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.calendar-weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  padding: 4px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #1a1a1a;
  border-radius: 4px;
  transition: background 0.2s ease, border 0.2s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.calendar-day.other-month {
  color: #d1d5db;
  cursor: default;
}

.calendar-day.today {
  background: #fee2e2;
  color: #991b1b;
  font-weight: 600;
  border-color: #ef4444;
}

.calendar-day.selected {
  background: #8b5cf6;
  color: white;
  font-weight: 600;
  border-color: #7c3aed;
}

.calendar-day.selected.today {
  background: #7c3aed;
  border-color: #6d28d9;
}

.calendar-day:hover:not(.other-month):not(.selected) {
  background: #e5e7eb;
}
</style>

