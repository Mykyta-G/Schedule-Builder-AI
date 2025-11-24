<template>
  <div class="schoolsoft-login">
    <div class="top-nav">
      <a href="#" @click.prevent="goBack" class="back-link">← Exit</a>
      
      <div class="browser-controls">
        <button @click="navBack" class="nav-btn" title="Back">←</button>
        <button @click="navForward" class="nav-btn" title="Forward">→</button>
        <button @click="reload" class="nav-btn" title="Reload">↻</button>
        <form @submit.prevent="navigateToUrl" class="url-form">
          <input 
            v-model="currentUrl" 
            type="text" 
            class="url-input"
            placeholder="Enter school URL (e.g. https://sms.schoolsoft.se/engelska)"
          />
          <button type="submit" class="go-btn">Go</button>
        </form>
      </div>
    </div>
    
    <div class="webview-container">
      <webview 
        ref="webview" 
        :src="initialUrl" 
        class="webview"
        allowpopups
        @did-navigate="handleDidNavigate"
        @did-navigate-in-page="handleDidNavigate"
      ></webview>

      <!-- Floating Action Button for Import -->
      <button class="fab-import-btn" @click="triggerImport" :disabled="isImporting">
        <div class="fab-content">
          <span class="fab-icon">⬇️</span>
          <span class="fab-text" v-if="!isImporting">IMPORT SCHEDULE</span>
          <span class="fab-text" v-else>IMPORTING...</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
  name: 'SchoolSoftLogin',
  setup() {
    const webview = ref(null);
    const isImporting = ref(false);
    const initialUrl = 'https://sms.schoolsoft.se/';
    const currentUrl = ref(initialUrl);

    const goBack = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'creator' } }));
    };

    const navBack = () => {
      if (webview.value && webview.value.canGoBack()) {
        webview.value.goBack();
      }
    };

    const navForward = () => {
      if (webview.value && webview.value.canGoForward()) {
        webview.value.goForward();
      }
    };

    const reload = () => {
      if (webview.value) {
        webview.value.reload();
      }
    };

    const navigateToUrl = () => {
      if (webview.value && currentUrl.value) {
        let url = currentUrl.value;
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        webview.value.loadURL(url);
      }
    };

    const handleDidNavigate = (event) => {
      currentUrl.value = event.url;
    };

    const triggerImport = async () => {
      if (!webview.value) return;
      
      isImporting.value = true;
      
      try {
        const html = await webview.value.executeJavaScript('document.body.innerHTML');
        const url = webview.value.getURL();
        
        if (window.api && window.api.parseSchoolSoft) {
          const result = await window.api.parseSchoolSoft({ html, url });
          
          if (result.success) {
            // DIRECT NAVIGATION TO VIEWER
            // Transform flat class list into structured data for ViewerPage
            const flatClasses = result.data.classes;
            
            // Extract unique entities
            const uniqueSubjects = [...new Set(flatClasses.map(c => c.subject).filter(Boolean))];
            const uniqueTeachers = [...new Set(flatClasses.map(c => c.teacher).filter(Boolean))];
            const uniqueRooms = [...new Set(flatClasses.map(c => c.room).filter(Boolean))];
            
            // Create lesson templates based on frequency
            // Group by Subject + Teacher + Room
            const lessonGroups = {};
            flatClasses.forEach(cls => {
              const key = `${cls.subject}|${cls.teacher}|${cls.room}`;
              if (!lessonGroups[key]) {
                lessonGroups[key] = {
                  subject: cls.subject,
                  teacher: cls.teacher,
                  room: cls.room,
                  count: 0,
                  totalDuration: 0
                };
              }
              
              // Calculate duration in minutes
              const [startH, startM] = cls.startTime.split(':').map(Number);
              const [endH, endM] = cls.endTime.split(':').map(Number);
              const duration = (endH * 60 + endM) - (startH * 60 + startM);
              
              lessonGroups[key].count++;
              lessonGroups[key].totalDuration += duration;
            });
            
            const lessonTemplates = Object.values(lessonGroups).map(group => ({
              subject: group.subject,
              class: result.data.studentClass || 'My Class', 
              teacher: group.teacher,
              preferredRoom: group.room,
              sessionsPerWeek: group.count,
              durationMinutes: Math.round(group.totalDuration / group.count) || 60
            }));

            const newSchedule = {
              id: `schoolsoft-${Date.now()}`,
              name: 'Imported SchoolSoft Schedule',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              // Data for ViewerPage/Creator Mode
              classes: [{ name: result.data.studentClass || 'My Class' }],
              teachers: uniqueTeachers.map(name => ({ name })),
              classrooms: uniqueRooms.map(name => ({ name })),
              subjects: uniqueSubjects.map(name => ({ name })),
              lessonTemplates: lessonTemplates,
              timeSlots: [
                { day: 'Monday', start: '08:00', end: '17:00' },
                { day: 'Tuesday', start: '08:00', end: '17:00' },
                { day: 'Wednesday', start: '08:00', end: '17:00' },
                { day: 'Thursday', start: '08:00', end: '17:00' },
                { day: 'Friday', start: '08:00', end: '17:00' }
            ],
              // Add term configuration for Z3 solver (ViewerPage expects 'term', not 'termConfig')
              term: {
                name: 'Imported Term',
                startDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD
                endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +6 months
                weeks: 26,
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                dailySlots: [
                  { start: '08:00', end: '09:00' },
                  { start: '09:15', end: '10:15' },
                  { start: '10:30', end: '11:30' },
                  { start: '11:45', end: '12:45' },
                  { start: '13:00', end: '14:00' },
                  { start: '14:15', end: '15:15' }
                ]
              },
              // Also keep the raw blocks for reference if needed
              blocks: flatClasses.map((cls, idx) => ({
                id: `block-${Date.now()}-${idx}`,
                title: cls.subject,
                room: cls.room,
                teacher: cls.teacher,
                startTime: cls.startTime,
                endTime: cls.endTime,
                day: cls.day,
              }))
            };

            if (window.api.saveSchedule) {
              await window.api.saveSchedule(newSchedule);
              
              window.dispatchEvent(new CustomEvent('navigate', { 
                detail: { 
                  page: 'viewer',
                  presetId: newSchedule.id
                } 
              }));
            }
          } else {
            console.error('Parsing failed:', result.error);
            alert('Could not find schedule data. Please make sure you are on the schedule page.');
          }
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import. Please try again.');
      } finally {
        isImporting.value = false;
      }
    };

    onMounted(() => {
      const wv = webview.value;
      if (wv) {
        wv.addEventListener('did-navigate', handleDidNavigate);
        wv.addEventListener('did-navigate-in-page', handleDidNavigate);
      }
    });

    return {
      webview,
      isImporting,
      initialUrl,
      currentUrl,
      goBack,
      navBack,
      navForward,
      reload,
      navigateToUrl,
      handleDidNavigate,
      triggerImport
    };
  }
});
</script>

<style scoped>
.schoolsoft-login {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.top-nav {
  padding: 1vh 2vh;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 2vh;
  background: #f8f9fa;
  z-index: 10;
}

.back-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.6vh;
  white-space: nowrap;
}

.browser-controls {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1vh;
}

.nav-btn {
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 0.5vh;
  padding: 0.5vh 1vh;
  cursor: pointer;
  color: #4a5568;
  font-size: 1.4vh;
}

.nav-btn:hover {
  background: #edf2f7;
}

.url-form {
  flex: 1;
  display: flex;
  gap: 1vh;
}

.url-input {
  flex: 1;
  padding: 0.8vh 1.5vh;
  border: 1px solid #e2e8f0;
  border-radius: 0.5vh;
  font-size: 1.4vh;
  color: #2d3748;
  background: #fff;
}

.url-input:focus {
  outline: none;
  border-color: #667eea;
}

.go-btn {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.5vh;
  padding: 0 2vh;
  font-size: 1.4vh;
  cursor: pointer;
}

.go-btn:hover {
  background: #5a67d8;
}

.webview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.webview {
  width: 100%;
  height: 100%;
  border: none;
}

.fab-import-btn {
  position: absolute;
  bottom: 4vh;
  right: 4vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 2vh 4vh;
  border-radius: 4vh;
  cursor: pointer;
  box-shadow: 0 0.5vh 2vh rgba(102, 126, 234, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
}

.fab-import-btn:hover:not(:disabled) {
  transform: translateY(-0.5vh) scale(1.05);
  box-shadow: 0 1vh 3vh rgba(102, 126, 234, 0.5);
}

.fab-import-btn:disabled {
  opacity: 0.8;
  cursor: wait;
  transform: scale(0.95);
}

.fab-content {
  display: flex;
  align-items: center;
  gap: 1.5vh;
}

.fab-icon {
  font-size: 2.5vh;
}

.fab-text {
  font-size: 1.8vh;
  font-weight: 700;
  letter-spacing: 0.05em;
}
</style>
