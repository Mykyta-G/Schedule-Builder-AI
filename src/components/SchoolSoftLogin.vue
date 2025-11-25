<template>
  <div class="schoolsoft-login">
    <!-- School Selector Page (shown when on welcome page) -->
    <div v-if="showSchoolSelector" class="school-selector-page">
      <div class="top-nav">
        <a href="#" @click.prevent="goBack" class="back-link">← Back</a>
      </div>
      
      <div class="content-container">
        <div class="hero-section">
          <h1 class="page-title">Connect to SchoolSoft</h1>
          <p class="page-description">Enter your school's name to access your schedule</p>
          
          <form @submit.prevent="handleSchoolSubmit" class="school-form">
            <div class="input-wrapper">
              <input 
                v-model="schoolName" 
                type="text" 
                class="school-input"
                placeholder="e.g., nti"
                autofocus
              />
              <button type="submit" class="submit-btn" :disabled="!schoolName.trim()">
                <span class="btn-icon">→</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Webview Interface (always rendered, shown after school selection) -->
    <div v-show="!showSchoolSelector" class="webview-interface">
      <div class="top-nav">
        <a href="#" @click.prevent="goBack" class="back-link">← Exit</a>
        
        <div v-if="!isLoggedIn" class="browser-controls">
          <button @click="navBack" class="nav-btn" title="Back">←</button>
          <button @click="navForward" class="nav-btn" title="Forward">→</button>
          <button @click="reload" class="nav-btn" title="Reload">↻</button>
        </div>
      </div>
      
      <div class="webview-container">
        <webview 
          ref="webview" 
          :src="currentUrl" 
          class="webview"
          :class="{ 'webview-hidden': isLoggedIn }"
          allowpopups
          @did-navigate="handleDidNavigate"
          @did-navigate-in-page="handleDidNavigate"
          @did-finish-load="handlePageLoad"
        ></webview>

        <!-- Full-page overlay when logged in -->
        <div v-if="isLoggedIn" class="login-overlay">
          <div class="overlay-content">
            <div class="overlay-hero">
              <h1 class="overlay-title">Ready to Import</h1>
              <p class="overlay-description">Your SchoolSoft schedule is ready to be imported into Schedule Builder AI</p>
            </div>
            <button class="overlay-import-btn" @click="triggerImport" :disabled="isImporting">
              <span class="btn-text">Import Schedule</span>
              <span class="btn-icon">⬇️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, nextTick } from 'vue';

export default defineComponent({
  name: 'SchoolSoftLogin',
  setup() {
    const webview = ref(null);
    const isImporting = ref(false);
    const initialUrl = 'https://sms.schoolsoft.se/';
    const currentUrl = ref(initialUrl);
    const schoolName = ref('');
    const showSchoolSelector = ref(true);
    const isLoggedIn = ref(false);

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

    // Smart URL detection and construction
    const constructSchoolUrl = (input) => {
      if (!input || !input.trim()) {
        return null;
      }

      const trimmed = input.trim();

      // Check if it's already a full URL
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }

      // Check if it contains domain-like patterns (e.g., .se/, .com/, etc.)
      if (trimmed.includes('.se/') || trimmed.includes('.com/') || trimmed.includes('.net/') || trimmed.includes('://')) {
        // If it doesn't start with http, add https://
        if (!trimmed.startsWith('http')) {
          return 'https://' + trimmed;
        }
        return trimmed;
      }

      // Otherwise, treat it as a school name and construct the URL
      // Remove leading/trailing slashes and encode special characters
      const cleanSchoolName = trimmed.replace(/^\/+|\/+$/g, '').replace(/\s+/g, '');
      if (!cleanSchoolName) {
        return null;
      }

      // URL encode the school name to handle special characters
      const encodedSchoolName = encodeURIComponent(cleanSchoolName);
      return `https://sms.schoolsoft.se/${encodedSchoolName}`;
    };


    const handleSchoolSubmit = async () => {
      if (!schoolName.value || !schoolName.value.trim()) {
        return;
      }

      const url = constructSchoolUrl(schoolName.value);
      if (url) {
        currentUrl.value = url;
        showSchoolSelector.value = false;
        
        // Wait for Vue to update DOM and webview to be ready
        await nextTick();
        setTimeout(() => {
          if (webview.value) {
            try {
              webview.value.loadURL(url);
            } catch (error) {
              console.error('Failed to load URL:', error);
            }
          }
        }, 200);
      }
    };

    // Check if URL indicates user is logged in (not on login pages)
    const checkLoginState = (url) => {
      if (!url || !url.includes('sms.schoolsoft.se/')) {
        return false;
      }

      // Check if we're on the welcome page
      const baseUrl = 'https://sms.schoolsoft.se';
      const normalizedUrl = url.replace(/\/$/, '');
      const isWelcomePage = normalizedUrl === baseUrl || normalizedUrl === baseUrl + '/';
      
      if (isWelcomePage) {
        return false;
      }

      // Check if we're on login pages
      const loginPatterns = [
        '/samlLogin.jsp',
        '/login',
        '/Login',
        '/logga-in',
        '/inloggning',
        'usertype=',
        'ajaxlogin='
      ];
      
      const isLoginPage = loginPatterns.some(pattern => url.includes(pattern));
      
      // If not a login page and on a school's domain, assume logged in
      // We'll verify by checking page content
      return !isLoginPage;
    };

    // Check page content to verify login state
    const verifyLoginState = async () => {
      if (!webview.value) return false;
      
      try {
        // Check if schedule elements exist on the page
        const hasSchedule = await webview.value.executeJavaScript(`
          (function() {
            const lessons = document.querySelectorAll('.cal-lesson');
            return lessons.length > 0;
          })();
        `);
        
        return hasSchedule;
      } catch (error) {
        console.error('Error checking login state:', error);
        return false;
      }
    };

    const handleDidNavigate = async (event) => {
      currentUrl.value = event.url;
      
      // Check if we're on the welcome page (base URL with no school identifier)
      const baseUrl = 'https://sms.schoolsoft.se';
      const normalizedUrl = event.url.replace(/\/$/, ''); // Remove trailing slash
      const isWelcomePage = normalizedUrl === baseUrl || normalizedUrl === baseUrl + '/';
      
      if (isWelcomePage) {
        // Still on welcome page, show school selector
        showSchoolSelector.value = true;
        isLoggedIn.value = false;
      } else if (event.url.includes('sms.schoolsoft.se/')) {
        // Navigated to a school's page, hide selector and show webview
        showSchoolSelector.value = false;
        // Reset login state - will be checked when page loads
        isLoggedIn.value = false;
      }
    };

    const handlePageLoad = async () => {
      if (!webview.value) return;
      
      const url = webview.value.getURL();
      if (!url || !url.includes('sms.schoolsoft.se/')) {
        isLoggedIn.value = false;
        return;
      }

      // Check login state after page loads
      const urlIndicatesLogin = checkLoginState(url);
      if (urlIndicatesLogin) {
        // Verify by checking page content
        setTimeout(async () => {
          const verified = await verifyLoginState();
          isLoggedIn.value = verified;
        }, 500);
      } else {
        isLoggedIn.value = false;
      }
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
              
              // Navigate to viewer and pass the schedule data so it's immediately available
              window.dispatchEvent(new CustomEvent('navigate', { 
                detail: { 
                  page: 'viewer',
                  presetId: newSchedule.id,
                  scheduleData: newSchedule // Pass the schedule data so ViewerPage can load it
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
      // Wait for webview to be ready
      setTimeout(() => {
        const wv = webview.value;
        if (wv) {
          wv.addEventListener('did-navigate', handleDidNavigate);
          wv.addEventListener('did-navigate-in-page', handleDidNavigate);
        }
      }, 200);
    });

    return {
      webview,
      isImporting,
      initialUrl,
      currentUrl,
      schoolName,
      showSchoolSelector,
      goBack,
      navBack,
      navForward,
      reload,
      handleDidNavigate,
      handlePageLoad,
      handleSchoolSubmit,
      triggerImport,
      isLoggedIn
    };
  }
});
</script>

<style scoped>
.schoolsoft-login {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  position: relative;
  z-index: 1;
}

/* School Selector Page */
.school-selector-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
  z-index: 1;
}

.top-nav {
  padding: 2vh 3vh;
  display: flex;
  align-items: center;
  z-index: 10;
  position: relative;
}

.back-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.6vh;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #764ba2;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 100%;
  position: relative;
  z-index: 1;
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

.school-form {
  width: 100%;
  max-width: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1vh;
  background: white;
  border-radius: 1.5vh;
  padding: 0.5vh;
  box-shadow: 0 0.5vh 2vh rgba(102, 126, 234, 0.2);
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  box-shadow: 0 0.8vh 3vh rgba(102, 126, 234, 0.35);
  transform: translateY(-0.2vh);
}

.school-input {
  flex: 1;
  padding: 2.5vh 3vh;
  border: none;
  outline: none;
  font-size: 2.2vh;
  color: #2d3748;
  background: transparent;
  font-weight: 500;
  line-height: 1;
  height: 100%;
  display: flex;
  align-items: center;
}

.school-input::placeholder {
  color: #cbd5e0;
  font-weight: 400;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 1.2vh;
  padding: 0 3vh;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 6vh;
  height: 5.5vh;
  flex-shrink: 0;
  box-shadow: 0 0.3vh 1vh rgba(102, 126, 234, 0.3);
}

.submit-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0.5vh 1.5vh rgba(102, 126, 234, 0.4);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  color: white;
  font-size: 2.5vh;
  font-weight: 700;
  line-height: 1;
}

/* Webview Interface */
.webview-interface {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.webview-interface .top-nav {
  padding: 1vh 2vh;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 2vh;
  background: #f8f9fa;
  z-index: 10;
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

.webview-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.webview {
  width: 100%;
  height: 100%;
  border: none;
  transition: opacity 0.3s ease;
}

.webview-hidden {
  opacity: 0;
  pointer-events: none;
}

/* Login Overlay */
.login-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeInUp 0.4s ease-out;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 90vh;
  width: 100%;
  text-align: center;
}

.overlay-hero {
  text-align: center;
  max-width: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 0 6vh 0;
  animation: fadeInUp 0.5s ease-out 0.1s both;
}

.overlay-title {
  font-size: 6.5vh;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 3vh 0;
  letter-spacing: -0.03em;
  line-height: 1.1;
  text-align: center;
}

.overlay-description {
  font-size: 2.2vh;
  color: #718096;
  margin: 0;
  line-height: 1.7;
  max-width: 70vh;
  text-align: center;
}

.overlay-import-btn {
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
  animation: fadeInUp 0.5s ease-out 0.2s both;
}

.overlay-import-btn:hover:not(:disabled) {
  transform: translateY(-0.3vh);
  box-shadow: 0 0.8vh 3vh rgba(102, 126, 234, 0.45);
}

.overlay-import-btn:active:not(:disabled) {
  transform: translateY(-0.1vh);
}

.overlay-import-btn:disabled {
  opacity: 0.8;
  cursor: wait;
  transform: none;
}

.overlay-import-btn .btn-icon {
  font-size: 3.5vh;
  font-weight: 300;
  line-height: 1;
}

.overlay-import-btn .btn-text {
  font-size: 2.2vh;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(3vh);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
