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
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
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
      
      // Special handling for principal/teacher pages - be more lenient
      const isPrincipalOrTeacher = url.includes('right_teacher_startpage.jsp') || 
                                   url.includes('right_principal_startpage.jsp') ||
                                   url.includes('/teacher/') ||
                                   url.includes('/principal/') ||
                                   url.includes('/rektor/');
      
      // For principals/teachers, if URL contains their startpage, definitely logged in
      if (isPrincipalOrTeacher && !isLoginPage) {
        return true;
      }
      
      // If not a login page and on a school's domain, assume logged in
      // We'll verify by checking page content
      return !isLoginPage;
    };

    // Check page content to verify login state
    const verifyLoginState = async () => {
      if (!webview.value) return false;
      
      try {
        const url = webview.value.getURL();
        
        // First, check URL patterns for logged-in pages
        // SchoolSoft uses patterns like: right_student_startpage.jsp, right_teacher_startpage.jsp, right_principal_startpage.jsp
        const loggedInUrlPatterns = [
          'right_student_startpage.jsp',
          'right_teacher_startpage.jsp',
          'right_principal_startpage.jsp',
          'right_',
          'startpage.jsp'
        ];
        
        const urlIndicatesLoggedIn = loggedInUrlPatterns.some(pattern => url.includes(pattern));
        
        // Check page content for logged-in indicators
        const pageChecks = await webview.value.executeJavaScript(`
          (function() {
            // Check for student schedule elements
            const studentLessons = document.querySelectorAll('.cal-lesson');
            
            // Check for alternative schedule/calendar elements (teacher/principal pages might use different selectors)
            const calendarElements = document.querySelectorAll('.calendar, .schedule, [class*="cal-"], [class*="schedule"]');
            
            // Check for navigation menus (indicates logged-in dashboard)
            const navMenus = document.querySelectorAll('nav, .navigation, [class*="nav"], [class*="menu"]');
            
            // Check for absence of login forms
            const loginForms = document.querySelectorAll('form[action*="login"], form[action*="Login"], input[type="password"]');
            
            // Check for user-specific content (not login page)
            const userContent = document.querySelectorAll('[class*="user"], [class*="profile"], [id*="user"]');
            
            return {
              hasStudentSchedule: studentLessons.length > 0,
              hasCalendarElements: calendarElements.length > 0,
              hasNavMenus: navMenus.length > 0,
              hasNoLoginForms: loginForms.length === 0,
              hasUserContent: userContent.length > 0
            };
          })();
        `);
        
        // If URL indicates logged-in page, be more lenient with content checks
        if (urlIndicatesLoggedIn) {
          // Check if this is a principal/teacher page
          const isPrincipalOrTeacher = url.includes('right_teacher_startpage.jsp') || 
                                       url.includes('right_principal_startpage.jsp') ||
                                       url.includes('/teacher/') ||
                                       url.includes('/principal/') ||
                                       url.includes('/rektor/');
          
          // For principals/teachers, be even more lenient
          if (isPrincipalOrTeacher) {
            // For principals/teachers, if URL pattern matches, accept with minimal checks
            // They might be on a dashboard that doesn't show schedule immediately
            if (pageChecks.hasNoLoginForms) {
              console.log('Login verified: Principal/Teacher URL pattern + no login forms');
              return true;
            }
            
            // Also check for common principal/teacher page elements
            const hasPrincipalTeacherContent = await webview.value.executeJavaScript(`
              (function() {
                // Check for common SchoolSoft logged-in page elements
                const hasSidebar = document.querySelector('.sidebar, [class*="sidebar"], [id*="sidebar"]');
                const hasMainContent = document.querySelector('.main-content, [class*="main"], [id*="main"]');
                const hasTabs = document.querySelector('.tabs, [class*="tab"], [id*="tab"]');
                const hasMenu = document.querySelector('.menu, [class*="menu"], [id*="menu"]');
                
                return hasSidebar || hasMainContent || hasTabs || hasMenu;
              })();
            `);
            
            if (hasPrincipalTeacherContent) {
              console.log('Login verified: Principal/Teacher page structure detected');
              return true;
            }
          }
          
          // For logged-in URLs, accept if we have any positive indicators
          const hasAnyLoggedInIndicator = 
            pageChecks.hasStudentSchedule ||
            pageChecks.hasCalendarElements ||
            (pageChecks.hasNavMenus && pageChecks.hasNoLoginForms) ||
            pageChecks.hasUserContent;
          
          if (hasAnyLoggedInIndicator) {
            console.log('Login verified: URL pattern + page content match');
            return true;
          }
          
          // Even if no schedule found, if URL pattern matches and no login forms, assume logged in
          // (user might need to navigate to schedule page manually)
          if (pageChecks.hasNoLoginForms && pageChecks.hasNavMenus) {
            console.log('Login verified: URL pattern matches, no login forms detected');
            return true;
          }
        }
        
        // Fallback: check for student schedule elements (original behavior)
        if (pageChecks.hasStudentSchedule) {
          console.log('Login verified: Student schedule elements found');
          return true;
        }
        
        console.log('Login not verified:', { urlIndicatesLoggedIn, pageChecks });
        return false;
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
        
        // For principals/teachers, also check login state after navigation
        // (they might navigate between pages after login)
        const isPrincipalOrTeacher = event.url.includes('right_teacher_startpage.jsp') || 
                                     event.url.includes('right_principal_startpage.jsp') ||
                                     event.url.includes('/teacher/') ||
                                     event.url.includes('/principal/') ||
                                     event.url.includes('/rektor/');
        
        if (isPrincipalOrTeacher) {
          // Wait a bit for page to load, then check login state
          setTimeout(async () => {
            const verified = await verifyLoginState();
            if (verified) {
              isLoggedIn.value = true;
              console.log('Login detected after navigation for principal/teacher');
            }
          }, 1500);
        }
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
      
      // For principals/teachers, be more aggressive with detection
      const isPrincipalOrTeacher = url.includes('right_teacher_startpage.jsp') || 
                                   url.includes('right_principal_startpage.jsp') ||
                                   url.includes('/teacher/') ||
                                   url.includes('/principal/') ||
                                   url.includes('/rektor/');
      
      if (urlIndicatesLogin || isPrincipalOrTeacher) {
        // For principals/teachers, wait a bit longer for page to fully load
        const delay = isPrincipalOrTeacher ? 1500 : 500;
        
        // Verify by checking page content (with retry for principals/teachers)
        setTimeout(async () => {
          let verified = await verifyLoginState();
          
          // If not verified and it's a principal/teacher, retry after a longer delay
          if (!verified && isPrincipalOrTeacher) {
            console.log('First check failed for principal/teacher, retrying after longer delay...');
            setTimeout(async () => {
              verified = await verifyLoginState();
              isLoggedIn.value = verified;
              
              if (!verified) {
                console.warn('Login not verified for teacher/principal after retry.');
                console.log('Current URL:', url);
                console.log('This might be normal if you need to navigate to a schedule page first.');
              } else {
                console.log('Login verified for principal/teacher on retry!');
              }
            }, 2000);
          } else {
            isLoggedIn.value = verified;
            
            // Log helpful information if login not verified
            if (!verified) {
              const urlLower = url.toLowerCase();
              if (urlLower.includes('teacher') || urlLower.includes('principal') || urlLower.includes('rektor')) {
                console.warn('Login not verified for teacher/principal. User may need to navigate to schedule page.');
                console.log('Current URL:', url);
              } else {
                console.warn('Login not verified. Make sure you are on a schedule page with visible lessons.');
              }
            }
          }
        }, delay);
      } else {
        isLoggedIn.value = false;
        console.log('URL does not indicate logged-in state:', url);
      }
    };

    const triggerImport = async () => {
      if (!webview.value) return;
      
      isImporting.value = true;
      
      try {
        const url = webview.value.getURL();
        
        // Detect if user is principal/teacher - they should import ALL data
        const isPrincipalOrTeacher = url.includes('right_teacher_startpage.jsp') || 
                                     url.includes('right_principal_startpage.jsp') ||
                                     url.includes('/teacher/') ||
                                     url.includes('/principal/') ||
                                     url.includes('/rektor/');
        
        if (isPrincipalOrTeacher) {
          console.log('Principal/Teacher detected - collecting comprehensive data...');
          
          // For principals/teachers, try to navigate to week view to get more data
          // First, get current page
          let allClasses = [];
          let allTeachers = new Set();
          let allStudents = new Set();
          
          // Try to navigate to week view if not already there
          const currentUrl = webview.value.getURL();
          if (!currentUrl.includes('view=week')) {
            try {
              // Try to click week view button or navigate to week view
              await webview.value.executeJavaScript(`
                (function() {
                  const weekLink = document.querySelector('a[href*="view=week"], a[href*="week="]');
                  if (weekLink) {
                    weekLink.click();
                    return true;
                  }
                  return false;
                })();
              `);
              
              // Wait for navigation
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (e) {
              console.log('Could not navigate to week view, continuing with current page');
            }
          }
          
          // Parse current page
          if (!window.api || !window.api.parseSchoolSoft) {
            throw new Error('parseSchoolSoft API not available');
          }
          
          let html = await webview.value.executeJavaScript('document.body.innerHTML');
          let result = await window.api.parseSchoolSoft({ html, url: webview.value.getURL() });
          
          if (result && result.success && result.data) {
            allClasses = result.data.classes || [];
            (result.data.teachers || []).forEach(t => allTeachers.add(t.initials));
            (result.data.studentGroups || []).forEach(s => allStudents.add(s.className));
            
            console.log(`Initial parse: ${allClasses.length} classes, ${allTeachers.size} teachers, ${allStudents.size} students`);
          }
          
          // Try to get data from multiple weeks (if week view is available)
          try {
            const weekLinks = await webview.value.executeJavaScript(`
              (function() {
                const links = Array.from(document.querySelectorAll('a[href*="week="], a[href*="view=week"]'));
                return links.slice(0, 4).map(l => l.href); // Get up to 4 weeks
              })();
            `);
            
            if (weekLinks && weekLinks.length > 0) {
              for (const weekUrl of weekLinks.slice(0, 3)) { // Limit to 3 additional weeks
                try {
                  await webview.value.loadURL(weekUrl);
                  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for load
                  
                  html = await webview.value.executeJavaScript('document.body.innerHTML');
                  result = await window.api.parseSchoolSoft({ html, url: weekUrl });
                  
                  if (result && result.success && result.data) {
                    allClasses = [...allClasses, ...(result.data.classes || [])];
                    (result.data.teachers || []).forEach(t => allTeachers.add(t.initials));
                    (result.data.studentGroups || []).forEach(s => allStudents.add(s.className));
                    console.log(`Week ${weekUrl}: Added ${result.data.classes?.length || 0} classes`);
                  }
                } catch (e) {
                  console.log(`Error parsing week ${weekUrl}:`, e);
                }
              }
              
              // Navigate back to original page
              await webview.value.loadURL(url);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (e) {
            console.log('Could not parse multiple weeks:', e);
          }
          
          // Combine all data
          result = {
            success: true,
            data: {
              ...result.data,
              classes: allClasses,
              teachers: Array.from(allTeachers).map(t => ({ initials: t, subjects: [], classes: [] })),
              studentGroups: Array.from(allStudents).map(s => ({ className: s, subjects: [], teachers: [] }))
            }
          };
          
          console.log(`Final combined: ${allClasses.length} classes, ${allTeachers.size} teachers, ${allStudents.size} students`);
        } else {
          // For students, just parse current page
          const html = await webview.value.executeJavaScript('document.body.innerHTML');
          if (window.api && window.api.parseSchoolSoft) {
            result = await window.api.parseSchoolSoft({ html, url });
          } else {
            throw new Error('parseSchoolSoft API not available');
          }
        }
        
        if (window.api && window.api.parseSchoolSoft && result) {
          
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
              // UNIQUENESS KEY: distinct for every single lesson instance
              // This prevents grouping, ensuring 1 template = 1 specific lesson on the calendar
              const key = `${cls.subject}|${cls.teacher}|${cls.room}|${cls.day}|${cls.startTime}|${cls.endTime}`;
              
              if (!lessonGroups[key]) {
                lessonGroups[key] = {
                  subject: cls.subject,
                  teacher: cls.teacher,
                  room: cls.room,
                  day: cls.day, // Capture Day
                  startTime: cls.startTime, // Capture Time
                  count: 0,
                  totalDuration: 0,
                  classes: []
                };
              }
              
              lessonGroups[key].classes.push(cls);
              
              // Calculate duration in minutes
              const [startH, startM] = cls.startTime.split(':').map(Number);
              const [endH, endM] = cls.endTime.split(':').map(Number);
              const duration = (endH * 60 + endM) - (startH * 60 + startM);
              
              lessonGroups[key].count++;
              lessonGroups[key].totalDuration += duration;
            });
            
            // Calculate date range and weeks
            // Use T12:00:00 to avoid timezone shifts (e.g. UTC midnight being previous day locally)
            const dates = flatClasses.map(c => c.date ? new Date(c.date + 'T12:00:00') : null).filter(d => d && !isNaN(d.getTime()));
            let startDate = new Date();
            let endDate = new Date();
            let numberOfWeeks = 1;

            if (dates.length > 0) {
              const minTime = Math.min(...dates.map(d => d.getTime()));
              const maxTime = Math.max(...dates.map(d => d.getTime()));

              
              // Align startDate to the Monday of that week to ensure consistent weekIndex calculation
              const firstDate = new Date(minTime);
              const day = firstDate.getDay(); // 0 is Sunday
              // Calculate difference to get to Monday (if Sunday (0), subtract 6 days. If Mon (1), subtract 0. If Tue (2), subtract 1...)
              // Monday is 1. 
              // If day is 0 (Sun), we want previous Monday (-6 days)
              // If day is 1 (Mon), we want same day (0 days)
              // If day is 2 (Tue), we want previous Monday (-1 day)
              const diffToMonday = day === 0 ? -6 : 1 - day;
              firstDate.setDate(firstDate.getDate() + diffToMonday);
              startDate = new Date(firstDate);
              startDate.setHours(0, 0, 0, 0); // Normalize time
              
              endDate = new Date(maxTime);
              
              // Calculate weeks span (add 1 day to include the last day, then divide by 7 days)
              // We use Math.max(1, ...) to avoid division by zero or invalid weeks
              const daySpan = (maxTime - minTime) / (1000 * 60 * 60 * 24) + 1;
              numberOfWeeks = Math.max(1, Math.ceil(daySpan / 7));
              
              console.log('Detected date range:', {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
                daySpan,
                numberOfWeeks
              });
            }

            // Detect overlaps and build simultaneous groups
            let hasOverlaps = false;
            const timeMap = {}; // key: "day|startTime|endTime", value: [{ templateIndex, occurrenceIndex }]
            
            // We need to map each flatClass to its templateIndex and occurrenceIndex
            // Re-iterate flatClasses and match with lessonGroups order
            const groupKeys = Object.keys(lessonGroups);
            const groupCounters = {}; // key: groupKey, value: currentOccurrenceIndex
            
            flatClasses.forEach(cls => {
              const key = `${cls.subject}|${cls.teacher}|${cls.room}|${cls.day}|${cls.startTime}|${cls.endTime}`;
              const templateIndex = groupKeys.indexOf(key);
              
              if (groupCounters[key] === undefined) {
                groupCounters[key] = 0;
              }
              const occurrenceIndex = groupCounters[key]++;
              
              const timeKey = `${cls.day}|${cls.startTime}|${cls.endTime}`;
              if (!timeMap[timeKey]) {
                timeMap[timeKey] = [];
              }
              timeMap[timeKey].push({ templateIndex, occurrenceIndex });
            });
            
            const simultaneousGroups = [];
            Object.values(timeMap).forEach(group => {
              if (group.length > 1) {
                hasOverlaps = true;
                simultaneousGroups.push(group);
              }
            });
            
            if (hasOverlaps) {
                console.log('Schedule has overlaps, enabling allowClassOverlap and simultaneousSessions', {
                  count: simultaneousGroups.length
                });
            }

            // Extract exact time slots from the imported classes
            // This ensures the solver uses the EXACT lesson times instead of a generic grid
            const uniqueSlots = {};
            flatClasses.forEach(cls => {
                const key = `${cls.startTime}-${cls.endTime}`;
                if (!uniqueSlots[key]) {
                    uniqueSlots[key] = {
                        start: cls.startTime,
                        end: cls.endTime
                    };
                }
            });
            const toMinutes = (t) => {
              const [h, m] = t.split(':').map(Number);
              return h * 60 + m;
            };
            const exactTimeSlots = Object.values(uniqueSlots).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
            console.log('Extracted exact time slots:', exactTimeSlots);


            const lessonTemplates = Object.values(lessonGroups).map(group => {
              // DON'T create fixedSessions - we want Z3 to rebuild from scratch
              // Just provide the lesson metadata and let Z3 optimize
              
              return {
                subject: group.subject,
                class: result.data.studentClass || 'My Class', 
                teacher: group.teacher,
                preferredRoom: group.room,
                sessionsPerWeek: 1, // Always 1 since we ungrouped everything
                durationMinutes: Math.round(group.totalDuration / group.count) || 60,
                // LOCK to original time
                fixedDay: group.day,
                fixedTime: group.startTime
              };
            });


            // ========== CAPACITY CHECK: Pre-flight validation ===========
            // Calculate if schedule is mathematically possible before sending to Z3
            const totalWeeks = numberOfWeeks;
            const daysPerWeek = 5; // Monday-Friday
            const slotsPerDay = exactTimeSlots.length;
            const availableCapacity = totalWeeks * daysPerWeek * slotsPerDay;
            
            const requiredSessions = lessonTemplates.reduce((sum, t) => 
              sum + (t.sessionsPerWeek * totalWeeks), 0
            );
            
            const utilizationPercent = (requiredSessions / availableCapacity * 100).toFixed(1);
            const isFeasible = requiredSessions <= availableCapacity;
            
            console.log('📊 Schedule Capacity Check:', {
              totalWeeks,
              daysPerWeek,
              slotsPerDay,
              availableCapacity,
              requiredSessions,
              utilizationPercent: utilizationPercent + '%',
              isFeasible,
              lessonTemplatesCount: lessonTemplates.length,
              exactTimeSlotsCount: exactTimeSlots.length
            });
            
            if (!isFeasible) {
              const overage = requiredSessions - availableCapacity;
              alert(
                `⚠️ Schedule has too many lessons!\n\n` +
                `Required: ${requiredSessions} sessions\n` +
                `Available: ${availableCapacity} time slots\n` +
                `Overage: ${overage} sessions (${(overage / availableCapacity * 100).toFixed(1)}%)\n\n` +
                `The schedule cannot be built because there are more lessons than available time slots.\n\n` +
                `Suggestions:\n` +
                `• Reduce the number of lessons per week\n` +
                `• Increase the time range (start earlier or end later)\n` +
                `• Extend the number of weeks in the term`
              );
              isImporting.value = false;
              return; // Don't proceed with import
            }
            
            // Warn if utilization is very high (>90%)
            if (utilizationPercent > 90) {
              console.warn(`⚠️ High schedule utilization: ${utilizationPercent}% - Z3 may struggle to find solution`);
            }
            // ========== END CAPACITY CHECK ===========



            const newSchedule = {
              id: `schoolsoft-${Date.now()}`,
              name: `Imported Schedule ${new Date().toLocaleDateString()}`,
              lastModified: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              // Data for ViewerPage/Creator Mode
              classes: [{ name: result.data.studentClass || 'My Class' }],
              teachers: [...new Set(flatClasses.map(c => c.teacher))].map(t => ({ name: t })),
              classrooms: [...new Set(flatClasses.map(c => c.room))].map(r => ({ name: r })),
              subjects: [...new Set(flatClasses.map(c => c.subject))].map(s => ({ name: s })),
              lessonTemplates: lessonTemplates,
              timeSlots: exactTimeSlots, // Also populate top-level timeSlots
              // Add term configuration for Z3 solver (ViewerPage expects 'term', not 'termConfig')
              term: {
                name: 'Imported Term',
                startDate: startDate.toISOString().split('T')[0], // Use detected start date
                endDate: endDate.toISOString().split('T')[0], // Use detected end date
                // Force a full term (20 weeks) if we imported a short duration (e.g. 1 week view)
                // This allows the schedule to be reused for the whole semester
                weeks: numberOfWeeks < 4 ? 20 : numberOfWeeks,
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                dailySlots: exactTimeSlots, // Use exact slots for the term
                useExactSlots: true // Flag to tell ViewerPage to use these slots exactly
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
              })),
              // Relaxed constraints for imported schedules
              // IMPORTANT: Don't use bypassConstraints - it causes conflicts!
              // Instead, use very relaxed limits while keeping conflict prevention
              constraints: {
                // Very high limits (essentially unlimited)
                maxClassSessionsPerDay: 20,
                maxTeacherSessionsPerDay: 20,
                maxClassIdleMinutes: 999,
                maxTeacherIdleMinutes: 999,
                // Disable optimizations
                disableSubjectSpread: true,
                disableTransitionBuffers: true,
                physicalEducationBufferMinutes: 1,
                // Disable lunch (not needed for imports)
                lunchBreak: {
                  enabled: false
                }
                // bypassConstraints: false (default) - KEEP conflict prevention!
              }
            };

            if (window.api.saveSchedule) {
              await window.api.saveSchedule(newSchedule);
              
              // Navigate to viewer and auto-build the schedule
              window.dispatchEvent(new CustomEvent('navigate', { 
                detail: { 
                  page: 'viewer',
                  presetId: newSchedule.id,
                  scheduleData: newSchedule, // Pass the schedule data so ViewerPage can load it
                  autoBuild: true // NEW: Auto-trigger schedule building
                } 
              }));
            }
          } else {
            console.error('Parsing failed:', result.error);
            
            // Provide user-friendly error messages based on role and error type
            let errorMessage = 'Could not find schedule data.';
            
            if (result.userRole) {
              if (result.userRole === 'teacher' || result.userRole === 'principal') {
                errorMessage = `No schedule data found for ${result.userRole} account.\n\n` +
                  `Please make sure you:\n` +
                  `1. Are logged into SchoolSoft\n` +
                  `2. Navigate to your schedule/calendar page\n` +
                  `3. Ensure lessons are visible on the page\n\n` +
                  `Note: Teachers and principals may need to navigate to a specific schedule view.`;
              } else {
                errorMessage = `Could not find schedule data. Please make sure you are on the schedule page with lessons visible.`;
              }
            } else if (result.error) {
              // Use the error message from the parser if available
              errorMessage = result.error;
            } else {
              errorMessage = 'Could not find schedule data. Please make sure you are on the schedule page.';
            }
            
            alert(errorMessage);
          }
        } else {
          console.error('parseSchoolSoft API not available');
          alert('Import functionality is not available. Please refresh the page and try again.');
        }
      } catch (error) {
        console.error('Import failed:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to import schedule.';
        
        if (error.message) {
          if (error.message.includes('timeout') || error.message.includes('network')) {
            errorMessage = 'Import timed out. Please check your internet connection and try again.';
          } else if (error.message.includes('parse') || error.message.includes('JSON')) {
            errorMessage = 'Failed to parse schedule data. Please make sure you are on a valid schedule page.';
          } else {
            errorMessage = `Import error: ${error.message}`;
          }
        }
        
        alert(errorMessage);
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
