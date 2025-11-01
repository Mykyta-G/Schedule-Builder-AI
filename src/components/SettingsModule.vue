<template>
  <div class="module-overlay" :class="{ 'open': isOpen }">
    <div class="module-content">
      <div class="module-header">
        <h2 class="module-title">Inställningar</h2>
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

        <div class="settings-section">
          <h3 class="section-title">Applikationsinställningar</h3>
          
          <div class="form-group">
            <label for="language">Språk</label>
            <select id="language" v-model="settings.language" class="form-input">
              <option value="sv">Svenska</option>
              <option value="en">English</option>
            </select>
          </div>

          <div class="form-group">
            <label for="theme">Tema</label>
            <select id="theme" v-model="settings.theme" class="form-input">
              <option value="light">Ljust</option>
              <option value="dark">Mörkt</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="section-title">OpenAI API</h3>
          
          <div class="form-group">
            <label for="api-key">API-nyckel</label>
            <input
              id="api-key"
              type="password"
              v-model="settings.openaiApiKey"
              class="form-input"
              placeholder="sk-..."
              @blur="saveApiKey"
            />
            <p class="hint">Din nyckel lagras lokalt på denna enhet (localStorage).</p>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="section-title">Supabase-konfiguration</h3>
          
          <div class="form-group">
            <label>Supabase URL</label>
            <input
              type="text"
              :value="supabaseConfig.url || 'Ej konfigurerad'"
              class="form-input"
              readonly
              disabled
            />
            <p class="hint">Konfigureras i .env-filen</p>
          </div>

          <div class="form-group">
            <label>Supabase Anon Key</label>
            <input
              type="text"
              :value="supabaseConfig.anonKey ? '***' + supabaseConfig.anonKey.slice(-4) : 'Ej konfigurerad'"
              class="form-input"
              readonly
              disabled
            />
            <p class="hint">Konfigureras i .env-filen</p>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="section-title">Export/Import</h3>
          
          <div class="form-group">
            <button class="action-btn" @click="exportSettings">Exportera inställningar</button>
            <button class="action-btn" @click="triggerImport">Importera inställningar</button>
            <input
              ref="importInput"
              type="file"
              accept=".json"
              @change="importSettings"
              style="display: none;"
            />
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
import { defineComponent, ref, reactive, onMounted, onUnmounted, watch } from 'vue';

export default defineComponent({
  name: 'SettingsModule',
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const errorMessage = ref('');
    const importInput = ref(null);
    const settings = reactive({
      language: 'sv',
      theme: 'light',
      openaiApiKey: '',
    });
    const supabaseConfig = ref({
      url: '',
      anonKey: '',
    });

    const getDefaultSettings = () => {
      console.log('[SettingsModule] Getting default settings');
      return {
        language: 'sv',
        theme: 'light',
        openaiApiKey: '',
      };
    };

    const loadSettings = () => {
      console.log('[SettingsModule] Loading settings from localStorage...', {
        timestamp: new Date().toISOString()
      });
      try {
        const stored = localStorage.getItem('app_settings');
        if (!stored) {
          console.log('[SettingsModule] No saved settings found, using defaults');
          const defaults = getDefaultSettings();
          Object.assign(settings, defaults);
          return defaults;
        }
        const loadedSettings = JSON.parse(stored);
        Object.assign(settings, loadedSettings);
        console.log('[SettingsModule] Settings loaded successfully', {
          keys: Object.keys(loadedSettings),
          timestamp: new Date().toISOString()
        });
        return loadedSettings;
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error('[SettingsModule] JSON parse error:', {
            error: error.message,
            stored: localStorage.getItem('app_settings')?.substring(0, 100)
          });
          console.warn('[SettingsModule] Clearing corrupted settings, using defaults');
          localStorage.removeItem('app_settings');
          const defaults = getDefaultSettings();
          Object.assign(settings, defaults);
          return defaults;
        } else {
          console.error('[SettingsModule] Failed to load settings:', {
            error: error.message,
            errorName: error.name,
            stack: error.stack
          });
          throw error;
        }
      }
    };

    const saveSettings = () => {
      const dataSize = JSON.stringify(settings).length;
      console.log('[SettingsModule] Saving settings...', {
        size: dataSize,
        keys: Object.keys(settings),
        timestamp: new Date().toISOString()
      });
      try {
        const json = JSON.stringify(settings);
        localStorage.setItem('app_settings', json);
        console.log('[SettingsModule] Settings saved successfully', {
          size: json.length,
          timestamp: new Date().toISOString()
        });
        return { success: true };
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.error('[SettingsModule] localStorage quota exceeded:', {
            error: error.message,
            dataSize: json.length
          });
          throw new Error('Storage quota exceeded. Please reduce data size.');
        } else if (error.name === 'SecurityError') {
          console.error('[SettingsModule] localStorage security error (private mode?):', error);
          throw new Error('Cannot save settings. Check browser privacy settings.');
        } else {
          console.error('[SettingsModule] Failed to save settings:', {
            error: error.message,
            errorName: error.name,
            stack: error.stack
          });
          throw error;
        }
      }
    };

    const loadSupabaseConfig = async () => {
      console.log('[SettingsModule] Loading Supabase configuration...', {
        timestamp: new Date().toISOString()
      });
      try {
        if (!window.api || !window.api.getSupabaseConfig) {
          console.warn('[SettingsModule] window.api.getSupabaseConfig not available');
          return;
        }
        const config = await window.api.getSupabaseConfig();
        supabaseConfig.value = config;
        console.log('[SettingsModule] Supabase configuration loaded', {
          hasUrl: !!config.url,
          hasAnonKey: !!config.anonKey,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[SettingsModule] Failed to load Supabase config:', {
          error: error.message,
          errorType: error.constructor.name,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      }
    };

    const loadApiKey = () => {
      console.log('[SettingsModule] Loading API key from localStorage...');
      try {
        const stored = localStorage.getItem('OPENAI_API_KEY');
        if (stored) {
          settings.openaiApiKey = stored;
          console.log('[SettingsModule] API key loaded from localStorage');
        } else {
          console.log('[SettingsModule] No API key found in localStorage');
        }
      } catch (error) {
        console.error('[SettingsModule] Failed to load API key:', {
          error: error.message,
          stack: error.stack
        });
      }
    };

    const saveApiKey = () => {
      console.log('[SettingsModule] Saving API key to localStorage...');
      try {
        localStorage.setItem('OPENAI_API_KEY', settings.openaiApiKey || '');
        console.log('[SettingsModule] API key saved successfully');
      } catch (error) {
        console.error('[SettingsModule] Failed to save API key:', {
          error: error.message,
          errorName: error.name,
          stack: error.stack
        });
      }
    };

    const exportSettings = () => {
      console.log('[SettingsModule] Exporting settings...', {
        timestamp: new Date().toISOString()
      });
      try {
        const exportData = {
          ...settings,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settings-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('[SettingsModule] Settings exported successfully');
      } catch (error) {
        console.error('[SettingsModule] Failed to export settings:', {
          error: error.message,
          stack: error.stack
        });
        showError('Kunde inte exportera inställningar');
      }
    };

    const triggerImport = () => {
      console.log('[SettingsModule] Triggering import...');
      try {
        if (importInput.value) {
          importInput.value.click();
        }
      } catch (error) {
        console.error('[SettingsModule] Failed to trigger import:', error);
      }
    };

    const importSettings = async (event) => {
      console.log('[SettingsModule] Importing settings...', {
        timestamp: new Date().toISOString()
      });
      try {
        const file = event.target.files?.[0];
        if (!file) {
          console.warn('[SettingsModule] No file selected for import');
          return;
        }
        const text = await file.text();
        const imported = JSON.parse(text);
        Object.assign(settings, imported);
        await saveSettings();
        console.log('[SettingsModule] Settings imported successfully', {
          keys: Object.keys(imported),
          timestamp: new Date().toISOString()
        });
        if (event.target) {
          event.target.value = '';
        }
      } catch (error) {
        console.error('[SettingsModule] Failed to import settings:', {
          error: error.message,
          errorType: error.constructor.name,
          stack: error.stack
        });
        showError('Kunde inte importera inställningar. Kontrollera filformatet.');
      }
    };

    const handleSave = async () => {
      console.log('[SettingsModule] Save button clicked...', {
        timestamp: new Date().toISOString()
      });
      try {
        await saveSettings();
        saveApiKey();
        console.log('[SettingsModule] All settings saved successfully');
        handleClose();
      } catch (error) {
        console.error('[SettingsModule] Failed to save:', {
          error: error.message,
          stack: error.stack
        });
        showError('Kunde inte spara inställningar: ' + error.message);
      }
    };

    const handleClose = () => {
      console.log('[SettingsModule] Close button clicked...', {
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
      console.log('[SettingsModule] Component mounting...', {
        timestamp: new Date().toISOString()
      });
      try {
        loadSettings();
        loadApiKey();
        loadSupabaseConfig();
        console.log('[SettingsModule] Component mounted successfully');
      } catch (error) {
        console.error('[SettingsModule] Mount failed:', error);
        console.error('[SettingsModule] Stack trace:', error.stack);
        console.error('[SettingsModule] Error details:', {
          message: error.message,
          name: error.name
        });
      }
    });

    watch(() => props.isOpen, (newVal) => {
      if (newVal) {
        console.log('[SettingsModule] Module opened...');
        loadSettings();
        loadApiKey();
        loadSupabaseConfig();
      } else {
        console.log('[SettingsModule] Module closed...');
      }
    });

    return {
      errorMessage,
      settings,
      supabaseConfig,
      importInput,
      handleClose,
      handleSave,
      exportSettings,
      triggerImport,
      importSettings,
      saveApiKey,
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

.settings-section {
  margin-bottom: 3vh;
  padding-bottom: 3vh;
  border-bottom: 0.1vh solid #f0f0f0;
}

.settings-section:last-of-type {
  border-bottom: none;
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

.form-input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.hint {
  margin: 0.5vh 0 0 0;
  font-size: 1.2vh;
  color: #6b7280;
}

.action-btn {
  width: 100%;
  padding: 1vh 1.5vh;
  background: #f3f4f6;
  border: 0.1vh solid #e5e7eb;
  border-radius: 0.6vh;
  font-size: 1.3vh;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-bottom: 0.8vh;
  font-family: inherit;
}

.action-btn:hover {
  background: #e5e7eb;
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

