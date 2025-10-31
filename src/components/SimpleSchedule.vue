<template>
  <div class="schedule-wrapper">
    <!-- Header with view toggle -->
    <div class="schedule-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="schedule-title">Schedule</h2>
          <p class="schedule-subtitle">Organize your weekly activities</p>
        </div>
        <div class="header-actions">
          <div class="view-toggle">
            <button 
              class="view-btn" 
              :class="{ active: viewMode === 'day' }"
              @click="viewMode = 'day'"
            >
              Day
            </button>
            <button 
              class="view-btn" 
              :class="{ active: viewMode === 'week' }"
              @click="viewMode = 'week'"
            >
              Week
            </button>
          </div>
          <button class="add-item-btn" @click="addItem">
            <span class="btn-icon">+</span>
            New Event
          </button>
        </div>
      </div>
    </div>

    <!-- Days header - shows all days for week view, single day for day view -->
    <div class="days-header">
      <div 
        v-for="day in displayDays" 
        :key="day" 
        class="day-header" 
        :class="{ selected: viewMode === 'day' || (viewMode === 'week' && selectedDay === day) }"
        @click="selectDay(day)"
      >
        <div class="day-name">{{ getShortDayName(day) }}</div>
        <div class="day-date">{{ getDayDate(day) }}</div>
      </div>
    </div>

    <!-- Schedule content -->
    <div class="schedule-container">
      <div class="schedule-scroll">
        <div class="schedule-content">
          <!-- Time markers column -->
          <div class="time-markers">
            <div v-for="hour in fullDayHours" :key="hour" class="time-marker">
              {{ formatHourDisplay(hour) }}
            </div>
          </div>

          <!-- Schedule grid - single column for day, multiple for week -->
          <div class="schedule-grid" :class="{ 'week-view': viewMode === 'week' }">
            <!-- Grid lines -->
            <div class="grid-lines">
              <div v-for="hour in fullDayHours" :key="hour" class="grid-line" 
                :style="{ top: `${(hour - startHour) * pixelsPerHour}px` }">
              </div>
            </div>

            <!-- Day columns for week view, single column for day view -->
            <div 
              v-for="day in displayDays" 
              :key="day" 
              class="day-column"
              @dragover.prevent="handleDragOver($event, day)"
              @drop="onDrop($event, day)"
            >
              <!-- Schedule items for this day -->
              <div
                v-for="item in schedules[day]"
                :key="item.id"
                class="scheduled-item"
                :style="{
                  top: `${(item.startMinutes - startHour * 60) * pixelsPerMinute}px`,
                  height: `${item.duration * pixelsPerMinute}px`,
                  backgroundColor: getItemColor(item)
                }"
                draggable="true"
                @dragstart="startDragScheduledItem($event, item, day)"
              >
                <div
                  class="resize-handle top"
                  @mousedown.stop="startResize($event, item, 'top')"
                ></div>
                <div class="scheduled-item-content">
                  <div class="item-time">{{ getTimeRange(item) }}</div>
                  <input
                    class="item-name-input"
                    v-model="item.name"
                    @input="emitChange"
                    placeholder="Event name"
                    @focus.stop
                  >
                  <div class="item-actions" v-if="expandedItem === item.id">
                    <div class="time-controls">
                      <label>
                        <span>Start</span>
                        <input 
                          type="time" 
                          :value="minutesToTime(item.startMinutes)" 
                          @input="onStartTimeChange(item, $event.target.value)"
                          @click.stop
                        >
                      </label>
                      <label>
                        <span>End</span>
                        <input 
                          type="time" 
                          :value="minutesToTime(item.startMinutes + item.duration)" 
                          @input="onEndTimeChange(item, $event.target.value)"
                          @click.stop
                        >
                      </label>
                    </div>
                    <button class="delete-btn" @click.stop="removeItem(item.id, day)">Delete</button>
                  </div>
                  <button 
                    class="expand-btn" 
                    v-if="expandedItem !== item.id"
                    @click.stop="expandedItem = item.id"
                  >
                    ⋮
                  </button>
                </div>
                <div
                  class="resize-handle bottom"
                  @mousedown.stop="startResize($event, item, 'bottom')"
                ></div>
              </div>
              
              <!-- Drag placeholder for this day -->
              <div 
                v-if="isDragging && dragDay === day"
                class="drag-placeholder"
                :class="{ visible: isDragging }"
                :style="placeholderStyle"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';

export default defineComponent({
  name: 'SimpleSchedule',
  emits: ['change'],
  setup(_, { emit }) {
    const days = ref(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const selectedDay = ref('Monday');
    const viewMode = ref('week'); // 'day' or 'week'
    const expandedItem = ref(null);

    // Timeline config
    const startHour = 8;
    const endHour = 18;
    const pixelsPerHour = 60;
    const pixelsPerMinute = pixelsPerHour / 60;
    const fullDayHours = computed(() => {
      const result = [];
      for (let h = startHour; h <= endHour; h++) result.push(h);
      return result;
    });

    // Display days based on view mode
    const displayDays = computed(() => {
      return viewMode.value === 'week' ? days.value : [selectedDay.value];
    });

    // Schedules per day
    const schedules = reactive({});
    for (const d of days.value) schedules[d] = [];

    // Color palette for items (matching the design)
    const colors = [
      'rgba(139, 92, 246, 0.15)', // purple
      'rgba(59, 130, 246, 0.15)', // light blue
      'rgba(34, 197, 94, 0.15)', // green
      'rgba(236, 72, 153, 0.15)', // pink
      'rgba(245, 158, 11, 0.15)', // orange
    ];
    const borderColors = [
      '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899', '#f59e0b'
    ];

    const getItemColor = (item) => {
      const index = item.colorIndex || (item.id % colors.length);
      return colors[index];
    };

    const getItemBorderColor = (item) => {
      const index = item.colorIndex || (item.id % borderColors.length);
      return borderColors[index];
    };

    const formatHour = (hour) => `${hour.toString().padStart(2, '0')}:00`;

    const formatHourDisplay = (hour) => {
      if (hour === 0) return '12 AM';
      if (hour < 12) return `${hour} AM`;
      if (hour === 12) return '12 PM';
      return `${hour - 12} PM`;
    };

    const minutesToTime = (mins) => {
      const hh = Math.floor(mins / 60).toString().padStart(2, '0');
      const mm = (mins % 60).toString().padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const timeToMinutes = (timeStr) => {
      const [hh, mm] = timeStr.split(':').map((v) => parseInt(v, 10));
      return hh * 60 + mm;
    };

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    const normalizeItem = (item) => {
      item.duration = Math.max(15, Math.round(item.duration / 5) * 5);
      item.startMinutes = Math.round(item.startMinutes / 5) * 5;
      const minStart = startHour * 60;
      const maxStart = endHour * 60 - item.duration;
      item.startMinutes = clamp(item.startMinutes, minStart, maxStart);
      emitChange();
    };

    const getShortDayName = (day) => {
      return day.substring(0, 3).toUpperCase();
    };

    const getDayDate = (day) => {
      // Simple date display - you can enhance this with actual dates
      const dayIndex = days.value.indexOf(day);
      return dayIndex + 1;
    };

    const addItem = () => {
      const day = viewMode.value === 'day' ? selectedDay.value : 'Monday';
      const defaults = {
        id: Date.now() + Math.random(),
        name: '',
        startMinutes: startHour * 60 + 60,
        duration: 60,
      };
      schedules[day].push(defaults);
      expandedItem.value = defaults.id;
      emitChange();
    };

    const removeItem = (id, day) => {
      const list = schedules[day];
      const idx = list.findIndex((i) => i.id === id);
      if (idx !== -1) list.splice(idx, 1);
      if (expandedItem.value === id) expandedItem.value = null;
      emitChange();
    };

    const onStartTimeChange = (item, time) => {
      const newStartMinutes = timeToMinutes(time);
      const endMinutes = item.startMinutes + item.duration;
      
      if (newStartMinutes < endMinutes) {
        item.startMinutes = newStartMinutes;
        item.duration = endMinutes - newStartMinutes;
        normalizeItem(item);
      } else {
        item.startMinutes = newStartMinutes;
        item.duration = 15;
        normalizeItem(item);
      }
    };

    const onEndTimeChange = (item, time) => {
      const endMinutes = timeToMinutes(time);
      const newDuration = endMinutes - item.startMinutes;
      
      if (newDuration >= 15) {
        item.duration = newDuration;
        normalizeItem(item);
      } else {
        item.duration = 15;
        normalizeItem(item);
      }
    };

    const getTimeRange = (item) => {
      const s = item.startMinutes;
      const e = item.startMinutes + item.duration;
      const sh = Math.floor(s / 60);
      const sm = s % 60;
      const eh = Math.floor(e / 60);
      const em = e % 60;
      
      const format = (h, m) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
      };
      
      return `${format(sh, sm)} - ${format(eh, em)}`;
    };

    const selectDay = (day) => { 
      selectedDay.value = day;
      if (viewMode.value === 'day') {
        // Stay in day view
      }
      // Emit event for Sidebar calendar sync
      window.dispatchEvent(new CustomEvent('schedule-day-selected', { 
        detail: { day } 
      }));
    };

    // Listen for day selection from Sidebar calendar
    const handleCalendarDaySelect = (event) => {
      const dayName = event.detail?.day;
      if (dayName && days.value.includes(dayName)) {
        selectedDay.value = dayName;
      }
    };

    // Drag and drop
    const isDragging = ref(false);
    const draggedItem = ref(null);
    const dragStartY = ref(0);
    const dragDay = ref(null);
    const placeholderStyle = reactive({
      top: '0px',
      height: '60px',
      left: '0px',
      right: '0px',
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: '#8b5cf6',
      opacity: 0
    });

    const startDragScheduledItem = (evt, item, day) => {
      evt.dataTransfer.dropEffect = 'move';
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('itemData', JSON.stringify(item));
      evt.dataTransfer.setData('type', 'scheduled');
      evt.dataTransfer.setData('day', day);
      
      const dragImage = document.createElement('div');
      dragImage.style.opacity = '0';
      document.body.appendChild(dragImage);
      evt.dataTransfer.setDragImage(dragImage, 0, 0);
      setTimeout(() => document.body.removeChild(dragImage), 0);
      
      const rect = evt.target.getBoundingClientRect();
      const offsetY = evt.clientY - rect.top;
      
      draggedItem.value = { id: item.id, duration: item.duration };
      dragDay.value = day;
      isDragging.value = true;
      dragStartY.value = offsetY;
      
      const scheduleEl = document.querySelector('.schedule-scroll');
      if (scheduleEl) {
        const itemTop = (item.startMinutes - startHour * 60) * pixelsPerMinute;
        placeholderStyle.top = `${itemTop}px`;
        placeholderStyle.height = `${item.duration * pixelsPerMinute}px`;
        placeholderStyle.opacity = 1;
      }
    };

    const handleDragOver = (evt, day) => {
      evt.preventDefault();
      
      if (!isDragging.value) {
        isDragging.value = true;
      }
      
      const scheduleEl = document.querySelector('.schedule-scroll');
      if (!scheduleEl) return;
      
      const rect = evt.currentTarget.getBoundingClientRect();
      const y = evt.clientY - rect.top + scheduleEl.scrollTop;
      
      let snapY;
      if (dragStartY.value > 0) {
        const adjustedY = y - dragStartY.value;
        snapY = Math.max(0, Math.round(adjustedY / 5) * 5);
      } else {
        snapY = Math.max(0, Math.round(y / 5) * 5);
      }
      
      const newStartMinutes = startHour * 60 + (snapY / pixelsPerMinute);
      const maxStart = endHour * 60 - (draggedItem.value?.duration || 60);
      const clampedMinutes = Math.min(Math.max(startHour * 60, newStartMinutes), maxStart);
      
      placeholderStyle.top = `${(clampedMinutes - startHour * 60) * pixelsPerMinute}px`;
      dragDay.value = day;
    };

    const onDrop = (evt, day) => {
      isDragging.value = false;
      const type = evt.dataTransfer.getData('type');
      const itemData = JSON.parse(evt.dataTransfer.getData('itemData'));
      const sourceDay = evt.dataTransfer.getData('day');
      
      const placeholderTop = parseFloat(placeholderStyle.top);
      const newStartMinutes = startHour * 60 + (placeholderTop / pixelsPerMinute);
      
      if (type === 'scheduled') {
        // Remove from source day
        if (sourceDay && sourceDay !== day) {
          const sourceList = schedules[sourceDay];
          const sourceIdx = sourceList.findIndex(item => item.id === itemData.id);
          if (sourceIdx !== -1) sourceList.splice(sourceIdx, 1);
        }
        
        // Add to target day
        const item = schedules[day].find(item => item.id === itemData.id) || itemData;
        const maxTop = (endHour * 60) - item.duration;
        item.startMinutes = Math.min(Math.max(startHour * 60, newStartMinutes), maxTop);
        normalizeItem(item);
        
        // Add to day if not already there
        if (!schedules[day].includes(item)) {
          schedules[day].push(item);
        }
      }
      
      dragStartY.value = 0;
      draggedItem.value = null;
      dragDay.value = null;
      placeholderStyle.opacity = 0;
      emitChange();
    };

    // Resize functionality
    const resizing = ref(false);
    const resizingItem = ref(null);
    const resizingDirection = ref(null);
    const resizingStartY = ref(0);
    const resizingStartHeight = ref(0);
    const resizingStartTop = ref(0);
    const resizingItemId = ref(null);

    const startResize = (evt, item, direction) => {
      resizing.value = true;
      resizingItem.value = item;
      resizingDirection.value = direction;
      resizingStartY.value = evt.clientY;
      resizingStartHeight.value = item.duration;
      resizingStartTop.value = item.startMinutes;
      resizingItemId.value = item.id;
      evt.preventDefault();
    };

    const handleResize = (evt) => {
      if (!resizing.value || !resizingItem.value) return;

      const deltaY = evt.clientY - resizingStartY.value;

      if (resizingDirection.value === 'bottom') {
        let newHeight = Math.round((resizingStartHeight.value + deltaY) / 5) * 5;
        newHeight = Math.max(15, newHeight);
        const maxHeight = (endHour * 60) - resizingItem.value.startMinutes;
        const clampedHeight = Math.min(newHeight, maxHeight);
        
        resizingItem.value.duration = clampedHeight;
        
        // Update in all days (item might be shared)
        for (const day of days.value) {
          const originalItem = schedules[day].find(item => item.id === resizingItemId.value);
          if (originalItem) {
            originalItem.duration = clampedHeight;
          }
        }
      } else {
        let newTopMinutes = Math.round((resizingStartTop.value + deltaY) / 5) * 5;
        let newHeight = resizingStartHeight.value + (resizingStartTop.value - newTopMinutes);
        
        if (newHeight < 15) {
          newTopMinutes = resizingItem.value.startMinutes + resizingItem.value.duration - 15;
          newHeight = 15;
        }

        const minStart = startHour * 60;
        if (newTopMinutes >= minStart) {
          resizingItem.value.startMinutes = newTopMinutes;
          resizingItem.value.duration = newHeight;
          
          for (const day of days.value) {
            const originalItem = schedules[day].find(item => item.id === resizingItemId.value);
            if (originalItem) {
              originalItem.startMinutes = newTopMinutes;
              originalItem.duration = newHeight;
            }
          }
        }
      }

      emitChange();
    };

    const stopResize = () => {
      if (resizing.value && resizingItem.value) {
        normalizeItem(resizingItem.value);
      }
      resizing.value = false;
      resizingItem.value = null;
      resizingItemId.value = null;
    };

    onMounted(() => {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', stopResize);
      // Listen for day selection from Sidebar calendar
      window.addEventListener('schedule-select-day', handleCalendarDaySelect);
      // Close expanded item when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.scheduled-item')) {
          expandedItem.value = null;
        }
      });
      // Emit initial selected day to sync with Sidebar calendar
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('schedule-day-selected', { 
          detail: { day: selectedDay.value } 
        }));
      }, 50);
    });

    onUnmounted(() => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
      window.removeEventListener('schedule-select-day', handleCalendarDaySelect);
    });

    const emitChange = () => {
      const payload = {};
      for (const d of days.value) {
        payload[d] = schedules[d].map((i) => ({
          id: i.id,
          name: i.name,
          startMinutes: i.startMinutes,
          duration: i.duration,
        }));
      }
      emit('change', payload);
    };

    watch([], () => {}, { immediate: true });
    emitChange();

    return {
      days,
      selectedDay,
      viewMode,
      displayDays,
      schedules,
      expandedItem,
      startHour,
      endHour,
      pixelsPerHour,
      pixelsPerMinute,
      fullDayHours,
      addItem,
      removeItem,
      onStartTimeChange,
      onEndTimeChange,
      normalizeItem,
      selectDay,
      getShortDayName,
      getDayDate,
      formatHour,
      formatHourDisplay,
      minutesToTime,
      getTimeRange,
      getItemColor,
      startDragScheduledItem,
      handleDragOver,
      onDrop,
      isDragging,
      dragDay,
      placeholderStyle,
      startResize,
      emitChange,
    };
  },
});
</script>

<style scoped>
.schedule-wrapper {
  overflow: hidden;
  padding: 1rem;
  margin-top: -1.5rem;
}

.schedule-header {
  padding: 24px 32px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  flex: 1;
}

.schedule-title {
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
}

.schedule-subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.view-toggle {
  display: flex;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
}

.view-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  color: #1a1a1a;
}

.view-btn.active {
  background: #fff;
  color: #1a1a1a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.add-item-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.add-item-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-icon {
  font-size: 18px;
  font-weight: 300;
}

.days-header {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.day-header {
  flex: 1;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-right: 1px solid #f0f0f0;
}

.day-header:last-child {
  border-right: none;
}

.day-header:hover {
  background: #f9fafb;
}

.day-header.selected {
  background: #f3f4f6;
  position: relative;
}

.day-header.selected::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.day-name {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.day-header.selected .day-name {
  color: #1a1a1a;
}

.day-date {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.schedule-container {
  height: 600px;
  overflow: hidden;
}

.schedule-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.schedule-scroll::-webkit-scrollbar {
  width: 8px;
}

.schedule-scroll::-webkit-scrollbar-track {
  background: #f9fafb;
}

.schedule-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.schedule-scroll::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.schedule-content {
  position: relative;
  min-height: 600px;
  display: flex;
}

.time-markers {
  width: 80px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  position: sticky;
  left: 0;
  z-index: 10;
}

.time-marker {
  height: 60px;
  padding-right: 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
  border-top: 1px solid #f3f4f6;
}

.schedule-grid {
  flex: 1;
  position: relative;
  display: flex;
}

.schedule-grid.week-view .day-column {
  flex: 1;
  border-right: 1px solid #f0f0f0;
  position: relative;
}

.schedule-grid:not(.week-view) .day-column {
  width: 100%;
  position: relative;
}

.day-column:last-child {
  border-right: none;
}

.grid-lines {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100%;
  pointer-events: none;
}

.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #f3f4f6;
}

.scheduled-item {
  position: absolute;
  left: 8px;
  right: 8px;
  margin: 2px 0;
  background: rgba(139, 92, 246, 0.1);
  border-left: 3px solid #8b5cf6;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: move;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  z-index: 5;
  min-height: 40px;
}

.scheduled-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.scheduled-item-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-time {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.item-name-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  padding: 4px 0;
  outline: none;
  min-width: 0;
}

.item-name-input::placeholder {
  color: #9ca3af;
  font-weight: 500;
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.time-controls {
  display: flex;
  gap: 8px;
}

.time-controls label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.time-controls input[type="time"] {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
}

.expand-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  color: #6b7280;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.scheduled-item:hover .expand-btn {
  opacity: 1;
}

.delete-btn {
  padding: 6px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.delete-btn:hover {
  background: #dc2626;
}

.resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  z-index: 10;
}

.resize-handle:hover {
  background: rgba(139, 92, 246, 0.2);
}

.resize-handle.top {
  top: 0;
  border-radius: 8px 8px 0 0;
}

.resize-handle.bottom {
  bottom: 0;
  border-radius: 0 0 8px 8px;
}

.drag-placeholder {
  position: absolute;
  left: 8px;
  right: 8px;
  background: rgba(139, 92, 246, 0.15);
  border: 2px dashed #8b5cf6;
  border-radius: 8px;
  pointer-events: none;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.drag-placeholder.visible {
  opacity: 1;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .view-toggle {
    width: 100%;
  }
  
  .view-btn {
    flex: 1;
  }
}
</style>
