<template>
  <div class="module-overlay" :class="{ 'open': isOpen }">
    <div class="module-content">
      <div class="module-header">
        <h2 class="module-title">Profil</h2>
        <button class="close-btn" @click="handleClose" title="Stäng">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="module-body">
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="profile-section">
          <div class="avatar-container">
            <div class="avatar-placeholder">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <button class="avatar-change-btn" @click="triggerAvatarChange">Ändra bild</button>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              @change="handleAvatarChange"
              style="display: none;"
            />
          </div>
        </div>

        <div class="profile-section">
          <h3 class="section-title">Personlig information</h3>
          
          <div class="form-group">
            <label for="name">Namn *</label>
            <input
              id="name"
              type="text"
              v-model="profile.name"
              class="form-input"
              placeholder="Ditt namn"
              :class="{ 'error': validationErrors.name }"
            />
            <span v-if="validationErrors.name" class="error-text">{{ validationErrors.name }}</span>
          </div>

          <div class="form-group">
            <label for="email">E-post</label>
            <input
              id="email"
              type="email"
              v-model="profile.email"
              class="form-input"
              placeholder="din@epost.se"
              :class="{ 'error': validationErrors.email }"
            />
            <span v-if="validationErrors.email" class="error-text">{{ validationErrors.email }}</span>
          </div>

          <div class="form-group">
            <label for="phone">Telefonnummer</label>
            <input
              id="phone"
              type="tel"
              v-model="profile.phone"
              class="form-input"
              placeholder="+46 70 123 45 67"
            />
          </div>
        </div>

        <div class="profile-section">
          <h3 class="section-title">Användarinställningar</h3>
          
          <div class="form-group">
            <label for="notifications">Notifikationer</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="profile.notifications.email"
                />
                <span>E-postnotifikationer</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="profile.notifications.schedule"
                />
                <span>Schema-uppdateringar</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="timezone">Tidszon</label>
            <select id="timezone" v-model="profile.timezone" class="form-input">
              <option value="Europe/Stockholm">Europe/Stockholm (CET)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="module-footer">
        <button class="save-btn" @click="handleSave">Spara</button>
        <button class="cancel-btn" @click="handleClose">Avbryt</button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted, watch } from 'vue';

export default defineComponent({
  name: 'ProfileModule',
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const errorMessage = ref('');
    const validationErrors = reactive({});
    const avatarInput = ref(null);
    const profile = reactive({
      name: '',
      email: '',
      phone: '',
      avatar: null,
      timezone: 'Europe/Stockholm',
      notifications: {
        email: false,
        schedule: true,
      },
    });

    const getDefaultProfile = () => {
      console.log('[ProfileModule] Getting default profile');
      return {
        name: '',
        email: '',
        phone: '',
        avatar: null,
        timezone: 'Europe/Stockholm',
        notifications: {
          email: false,
          schedule: true,
        },
      };
    };

    const loadProfile = () => {
      console.log('[ProfileModule] Loading profile from localStorage...', {
        timestamp: new Date().toISOString()
      });
      try {
        const stored = localStorage.getItem('user_profile');
        if (!stored) {
          console.log('[ProfileModule] No saved profile found, using defaults');
          const defaults = getDefaultProfile();
          Object.assign(profile, defaults);
          return defaults;
        }
        const loadedProfile = JSON.parse(stored);
        Object.assign(profile, loadedProfile);
        console.log('[ProfileModule] Profile loaded successfully', {
          keys: Object.keys(loadedProfile),
          timestamp: new Date().toISOString()
        });
        return loadedProfile;
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error('[ProfileModule] JSON parse error:', {
            error: error.message,
            stored: localStorage.getItem('user_profile')?.substring(0, 100)
          });
          console.warn('[ProfileModule] Clearing corrupted profile, using defaults');
          localStorage.removeItem('user_profile');
          const defaults = getDefaultProfile();
          Object.assign(profile, defaults);
          return defaults;
        } else {
          console.error('[ProfileModule] Failed to load profile:', {
            error: error.message,
            errorName: error.name,
            stack: error.stack
          });
          throw error;
        }
      }
    };

    const saveProfile = () => {
      const dataSize = JSON.stringify(profile).length;
      console.log('[ProfileModule] Saving profile...', {
        size: dataSize,
        keys: Object.keys(profile),
        timestamp: new Date().toISOString()
      });
      try {
        const json = JSON.stringify(profile);
        localStorage.setItem('user_profile', json);
        console.log('[ProfileModule] Profile saved successfully', {
          size: json.length,
          timestamp: new Date().toISOString()
        });
        return { success: true };
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.error('[ProfileModule] localStorage quota exceeded:', {
            error: error.message,
            dataSize: json.length
          });
          throw new Error('Storage quota exceeded. Please reduce data size.');
        } else if (error.name === 'SecurityError') {
          console.error('[ProfileModule] localStorage security error (private mode?):', error);
          throw new Error('Cannot save profile. Check browser privacy settings.');
        } else {
          console.error('[ProfileModule] Failed to save profile:', {
            error: error.message,
            errorName: error.name,
            stack: error.stack
          });
          throw error;
        }
      }
    };

    const validateForm = () => {
      console.log('[ProfileModule] Validating form data...', {
        fields: Object.keys(profile),
        timestamp: new Date().toISOString()
      });
      const errors = {};
      
      try {
        if (!profile.name || profile.name.trim().length < 2) {
          console.warn('[ProfileModule] Validation failed: name too short', {
            name: profile.name,
            length: profile.name?.length || 0
          });
          errors.name = 'Namn måste vara minst 2 tecken';
        }
        if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
          console.warn('[ProfileModule] Validation failed: invalid email format', {
            email: profile.email
          });
          errors.email = 'Ogiltigt e-postformat';
        }
        
        Object.assign(validationErrors, errors);
        
        if (Object.keys(errors).length > 0) {
          console.error('[ProfileModule] Form validation failed:', {
            errors,
            formData: { ...profile, password: '***' }
          });
          return { valid: false, errors };
        }
        
        console.log('[ProfileModule] Form validation passed');
        return { valid: true, errors: {} };
      } catch (error) {
        console.error('[ProfileModule] Validation error:', {
          error: error.message,
          stack: error.stack,
          formData: Object.keys(profile)
        });
        throw error;
      }
    };

    const triggerAvatarChange = () => {
      console.log('[ProfileModule] Triggering avatar change...');
      try {
        if (avatarInput.value) {
          avatarInput.value.click();
        }
      } catch (error) {
        console.error('[ProfileModule] Failed to trigger avatar change:', error);
      }
    };

    const handleAvatarChange = (event) => {
      console.log('[ProfileModule] Handling avatar change...');
      try {
        const file = event.target.files?.[0];
        if (!file) {
          console.warn('[ProfileModule] No file selected for avatar');
          return;
        }
        if (!file.type.startsWith('image/')) {
          console.warn('[ProfileModule] Invalid file type for avatar', { type: file.type });
          showError('Endast bildfiler är tillåtna');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          console.warn('[ProfileModule] Avatar file too large', { size: file.size });
          showError('Bilden är för stor. Max storlek är 5MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          profile.avatar = e.target?.result;
          console.log('[ProfileModule] Avatar loaded successfully', { size: file.size });
        };
        reader.onerror = (error) => {
          console.error('[ProfileModule] Failed to read avatar file:', error);
          showError('Kunde inte läsa bildfilen');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('[ProfileModule] Failed to handle avatar change:', {
          error: error.message,
          errorType: error.constructor.name,
          stack: error.stack
        });
        showError('Kunde inte ändra profilbild');
      }
    };

    const handleSave = async () => {
      console.log('[ProfileModule] Save button clicked...', {
        timestamp: new Date().toISOString()
      });
      try {
        const validation = validateForm();
        if (!validation.valid) {
          console.warn('[ProfileModule] Save cancelled due to validation errors');
          showError('Kontrollera formuläret för fel');
          return;
        }
        await saveProfile();
        console.log('[ProfileModule] Profile saved successfully');
        handleClose();
      } catch (error) {
        console.error('[ProfileModule] Failed to save:', {
          error: error.message,
          stack: error.stack
        });
        showError('Kunde inte spara profil: ' + error.message);
      }
    };

    const handleClose = () => {
      console.log('[ProfileModule] Close button clicked...', {
        timestamp: new Date().toISOString()
      });
      emit('close');
    };

    const showError = (message) => {
      errorMessage.value = message;
      setTimeout(() => {
        errorMessage.value = '';
      }, 5000);
    };

    onMounted(() => {
      console.log('[ProfileModule] Component mounting...', {
        timestamp: new Date().toISOString()
      });
      try {
        loadProfile();
        console.log('[ProfileModule] Component mounted successfully');
      } catch (error) {
        console.error('[ProfileModule] Mount failed:', error);
        console.error('[ProfileModule] Stack trace:', error.stack);
        console.error('[ProfileModule] Error details:', {
          message: error.message,
          name: error.name
        });
      }
    });

    watch(() => props.isOpen, (newVal) => {
      if (newVal) {
        console.log('[ProfileModule] Module opened...');
        loadProfile();
      } else {
        console.log('[ProfileModule] Module closed...');
      }
    });

    return {
      errorMessage,
      validationErrors,
      profile,
      avatarInput,
      handleClose,
      handleSave,
      triggerAvatarChange,
      handleAvatarChange,
    };
  },
});
</script>

<style scoped>
.module-overlay {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 42vh;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 98;
  background: #ffffff;
  box-shadow: -0.2vh 0 1vh rgba(0, 0, 0, 0.1);
}

.module-overlay.open {
  transform: translateX(0);
}

.module-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.module-header {
  padding: 2vh 2.5vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 0.1vh solid #f0f0f0;
  background: #fafafa;
}

.module-title {
  font-weight: 700;
  color: #1a1a1a;
  font-size: 1.75vh;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5vh;
  border-radius: 0.4vh;
  transition: background 0.2s ease, color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #1a1a1a;
}

.module-body {
  flex: 1;
  padding: 2vh;
  overflow-y: auto;
  background: #ffffff;
}

.module-body::-webkit-scrollbar {
  width: 0.8vh;
}

.module-body::-webkit-scrollbar-track {
  background: transparent;
}

.module-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 0.4vh;
}

.module-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 1vh 1.5vh;
  border-radius: 0.6vh;
  font-size: 1.3vh;
  margin-bottom: 2vh;
}

.profile-section {
  margin-bottom: 3vh;
  padding-bottom: 3vh;
  border-bottom: 0.1vh solid #f0f0f0;
}

.profile-section:last-of-type {
  border-bottom: none;
}

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5vh;
}

.avatar-placeholder {
  width: 12vh;
  height: 12vh;
  border-radius: 50%;
  background: #f3f4f6;
  border: 0.2vh solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  overflow: hidden;
}

.avatar-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-change-btn {
  padding: 0.8vh 1.5vh;
  background: #f3f4f6;
  border: 0.1vh solid #e5e7eb;
  border-radius: 0.6vh;
  font-size: 1.3vh;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: inherit;
}

.avatar-change-btn:hover {
  background: #e5e7eb;
}

.section-title {
  font-size: 1.5vh;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1.5vh 0;
}

.form-group {
  margin-bottom: 1.5vh;
}

.form-group label {
  display: block;
  font-size: 1.3vh;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.5vh;
}

.form-input {
  width: 100%;
  padding: 1vh 1.3vh;
  border: 0.1vh solid #e5e7eb;
  border-radius: 0.6vh;
  font-size: 1.4vh;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #8b5cf6;
}

.form-input.error {
  border-color: #ef4444;
}

.error-text {
  display: block;
  color: #ef4444;
  font-size: 1.2vh;
  margin-top: 0.3vh;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 1vh;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.8vh;
  font-size: 1.3vh;
  color: #374151;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 1.5vh;
  height: 1.5vh;
  cursor: pointer;
}

.module-footer {
  padding: 2vh 2.5vh;
  border-top: 0.1vh solid #f0f0f0;
  background: #fafafa;
  display: flex;
  gap: 1vh;
}

.save-btn,
.cancel-btn {
  flex: 1;
  padding: 1.2vh 2vh;
  border: none;
  border-radius: 0.6vh;
  font-size: 1.4vh;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.save-btn {
  background: #8b5cf6;
  color: white;
}

.save-btn:hover {
  background: #7c3aed;
}

.cancel-btn {
  background: #e5e7eb;
  color: #374151;
}

.cancel-btn:hover {
  background: #d1d5db;
}
</style>

