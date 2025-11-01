<template>
  <div class="module-overlay" :class="{ 'open': isOpen }">
    <div class="module-content">
      <div class="module-header">
        <h2 class="module-title">Variabler</h2>
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

        <div class="variables-section">
          <div class="section-header">
            <h3 class="section-title">Anpassade variabler</h3>
            <button class="add-btn" @click="startAddVariable">+ Lägg till</button>
          </div>

          <div v-if="isAdding || editingVariableId" class="variable-form">
            <div class="form-group">
              <label for="var-name">Variabelnamn *</label>
              <input
                id="var-name"
                type="text"
                v-model="currentVariable.name"
                class="form-input"
                placeholder="t.ex. school_name"
                :class="{ 'error': validationErrors.name }"
              />
              <span v-if="validationErrors.name" class="error-text">{{ validationErrors.name }}</span>
              <p class="hint">Måste börja med bokstav eller understrek, kan innehålla bokstäver, siffror och understrek</p>
            </div>

            <div class="form-group">
              <label for="var-value">Värde *</label>
              <textarea
                id="var-value"
                v-model="currentVariable.value"
                class="form-input"
                rows="3"
                placeholder="Variabelns värde"
                :class="{ 'error': validationErrors.value }"
              ></textarea>
              <span v-if="validationErrors.value" class="error-text">{{ validationErrors.value }}</span>
            </div>

            <div class="form-group">
              <label for="var-description">Beskrivning</label>
              <input
                id="var-description"
                type="text"
                v-model="currentVariable.description"
                class="form-input"
                placeholder="Beskrivning av variabeln"
              />
            </div>

            <div class="form-actions">
              <button class="save-btn-small" @click="saveVariable">Spara</button>
              <button class="cancel-btn-small" @click="cancelEdit">Avbryt</button>
            </div>
          </div>

          <div class="variables-list">
            <div
              v-for="variable in variables"
              :key="variable.id"
              class="variable-item"
            >
              <div class="variable-content">
                <div class="variable-header">
                  <span class="variable-name">{{ variable.name }}</span>
                  <span class="variable-value">{{ variable.value }}</span>
                </div>
                <div v-if="variable.description" class="variable-description">
                  {{ variable.description }}
                </div>
              </div>
              <div class="variable-actions">
                <button class="edit-btn-small" @click="startEditVariable(variable)" title="Redigera">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="delete-btn-small" @click="deleteVariable(variable.id)" title="Ta bort">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="variables.length === 0 && !isAdding" class="empty-state">
              Inga variabler ännu. Lägg till din första variabel ovan.
            </div>
          </div>
        </div>
      </div>

      <div class="module-footer">
        <button class="close-btn-footer" @click="handleClose">Stäng</button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted, watch } from 'vue';

export default defineComponent({
  name: 'VariablesModule',
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
    const variables = ref([]);
    const isAdding = ref(false);
    const editingVariableId = ref(null);
    const currentVariable = reactive({
      name: '',
      value: '',
      description: '',
    });

    const getDefaultVariables = () => {
      console.log('[VariablesModule] Getting default variables');
      return [];
    };

    const loadVariables = () => {
      console.log('[VariablesModule] Loading variables from localStorage...', {
        timestamp: new Date().toISOString()
      });
      try {
        const stored = localStorage.getItem('app_variables');
        if (!stored) {
          console.log('[VariablesModule] No saved variables found, using defaults');
          const defaults = getDefaultVariables();
          variables.value = defaults;
          return defaults;
        }
        const loadedVariables = JSON.parse(stored);
        variables.value = Array.isArray(loadedVariables) ? loadedVariables : [];
        console.log('[VariablesModule] Variables loaded successfully', {
          count: variables.value.length,
          timestamp: new Date().toISOString()
        });
        return variables.value;
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error('[VariablesModule] JSON parse error:', {
            error: error.message,
            stored: localStorage.getItem('app_variables')?.substring(0, 100)
          });
          console.warn('[VariablesModule] Clearing corrupted variables, using defaults');
          localStorage.removeItem('app_variables');
          const defaults = getDefaultVariables();
          variables.value = defaults;
          return defaults;
        } else {
          console.error('[VariablesModule] Failed to load variables:', {
            error: error.message,
            errorName: error.name,
            stack: error.stack
          });
          throw error;
        }
      }
    };

    const saveVariables = () => {
      const dataSize = JSON.stringify(variables.value).length;
      console.log('[VariablesModule] Saving variables...', {
        count: variables.value.length,
        size: dataSize,
        timestamp: new Date().toISOString()
      });
      try {
        const json = JSON.stringify(variables.value);
        localStorage.setItem('app_variables', json);
        console.log('[VariablesModule] Variables saved successfully', {
          count: variables.value.length,
          size: json.length,
          timestamp: new Date().toISOString()
        });
        return { success: true };
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.error('[VariablesModule] localStorage quota exceeded:', {
            error: error.message,
            dataSize: json.length
          });
          throw new Error('Storage quota exceeded. Please reduce data size.');
        } else if (error.name === 'SecurityError') {
          console.error('[VariablesModule] localStorage security error (private mode?):', error);
          throw new Error('Cannot save variables. Check browser privacy settings.');
        } else {
          console.error('[VariablesModule] Failed to save variables:', {
            error: error.message,
            errorName: error.name,
            stack: error.stack
          });
          throw error;
        }
      }
    };

    const validateVariable = () => {
      console.log('[VariablesModule] Validating variable...', {
        name: currentVariable.name,
        hasValue: !!currentVariable.value,
        timestamp: new Date().toISOString()
      });
      const errors = {};
      
      try {
        if (!currentVariable.name || currentVariable.name.trim().length === 0) {
          console.warn('[VariablesModule] Validation failed: empty variable name');
          errors.name = 'Variabelnamn krävs';
        } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(currentVariable.name)) {
          console.warn('[VariablesModule] Validation failed: invalid variable name format', {
            name: currentVariable.name
          });
          errors.name = 'Variabelnamn måste börja med bokstav eller understrek och innehålla endast alfanumeriska tecken';
        }
        
        if (!currentVariable.value || currentVariable.value.trim().length === 0) {
          console.warn('[VariablesModule] Validation failed: empty variable value');
          errors.value = 'Värde krävs';
        }
        
        Object.assign(validationErrors, errors);
        
        if (Object.keys(errors).length > 0) {
          console.error('[VariablesModule] Variable validation failed:', {
            errors,
            variable: { ...currentVariable }
          });
          return { valid: false, errors };
        }
        
        console.log('[VariablesModule] Variable validation passed');
        return { valid: true, errors: {} };
      } catch (error) {
        console.error('[VariablesModule] Validation error:', {
          error: error.message,
          stack: error.stack,
          variable: Object.keys(currentVariable)
        });
        throw error;
      }
    };

    const startAddVariable = () => {
      console.log('[VariablesModule] Starting to add new variable...');
      try {
        isAdding.value = true;
        editingVariableId.value = null;
        currentVariable.name = '';
        currentVariable.value = '';
        currentVariable.description = '';
        Object.assign(validationErrors, {});
        console.log('[VariablesModule] Add variable form opened');
      } catch (error) {
        console.error('[VariablesModule] Failed to start add variable:', error);
      }
    };

    const startEditVariable = (variable) => {
      console.log('[VariablesModule] Starting to edit variable...', {
        id: variable.id,
        name: variable.name
      });
      try {
        isAdding.value = false;
        editingVariableId.value = variable.id;
        currentVariable.name = variable.name;
        currentVariable.value = variable.value;
        currentVariable.description = variable.description || '';
        Object.assign(validationErrors, {});
        console.log('[VariablesModule] Edit variable form opened');
      } catch (error) {
        console.error('[VariablesModule] Failed to start edit variable:', error);
      }
    };

    const cancelEdit = () => {
      console.log('[VariablesModule] Cancelling edit...');
      try {
        isAdding.value = false;
        editingVariableId.value = null;
        currentVariable.name = '';
        currentVariable.value = '';
        currentVariable.description = '';
        Object.assign(validationErrors, {});
        console.log('[VariablesModule] Edit cancelled');
      } catch (error) {
        console.error('[VariablesModule] Failed to cancel edit:', error);
      }
    };

    const saveVariable = async () => {
      console.log('[VariablesModule] Saving variable...', {
        isAdding: isAdding.value,
        editingId: editingVariableId.value,
        timestamp: new Date().toISOString()
      });
      try {
        const validation = validateVariable();
        if (!validation.valid) {
          console.warn('[VariablesModule] Save cancelled due to validation errors');
          showError('Kontrollera formuläret för fel');
          return;
        }

        if (editingVariableId.value) {
          const index = variables.value.findIndex(v => v.id === editingVariableId.value);
          if (index === -1) {
            throw new Error('Variable not found');
          }
          variables.value[index] = {
            ...variables.value[index],
            name: currentVariable.name.trim(),
            value: currentVariable.value.trim(),
            description: currentVariable.description.trim(),
            updatedAt: new Date().toISOString(),
          };
          console.log('[VariablesModule] Variable updated', {
            id: editingVariableId.value,
            name: currentVariable.name
          });
        } else {
          const newVariable = {
            id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: currentVariable.name.trim(),
            value: currentVariable.value.trim(),
            description: currentVariable.description.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          variables.value.push(newVariable);
          console.log('[VariablesModule] Variable created', {
            id: newVariable.id,
            name: newVariable.name
          });
        }

        await saveVariables();
        cancelEdit();
        console.log('[VariablesModule] Variable saved successfully');
      } catch (error) {
        console.error('[VariablesModule] Failed to save variable:', {
          error: error.message,
          stack: error.stack
        });
        showError('Kunde inte spara variabel: ' + error.message);
      }
    };

    const deleteVariable = async (variableId) => {
      console.log('[VariablesModule] Deleting variable...', {
        id: variableId,
        timestamp: new Date().toISOString()
      });
      try {
        const index = variables.value.findIndex(v => v.id === variableId);
        if (index === -1) {
          console.warn('[VariablesModule] Variable not found for deletion', { id: variableId });
          return;
        }
        const variableName = variables.value[index].name;
        variables.value.splice(index, 1);
        await saveVariables();
        console.log('[VariablesModule] Variable deleted successfully', {
          id: variableId,
          name: variableName
        });
      } catch (error) {
        console.error('[VariablesModule] Failed to delete variable:', {
          error: error.message,
          stack: error.stack
        });
        showError('Kunde inte ta bort variabel: ' + error.message);
      }
    };

    const handleClose = () => {
      console.log('[VariablesModule] Close button clicked...', {
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
      console.log('[VariablesModule] Component mounting...', {
        timestamp: new Date().toISOString()
      });
      try {
        loadVariables();
        console.log('[VariablesModule] Component mounted successfully');
      } catch (error) {
        console.error('[VariablesModule] Mount failed:', error);
        console.error('[VariablesModule] Stack trace:', error.stack);
        console.error('[VariablesModule] Error details:', {
          message: error.message,
          name: error.name
        });
      }
    });

    watch(() => props.isOpen, (newVal) => {
      if (newVal) {
        console.log('[VariablesModule] Module opened...');
        loadVariables();
      } else {
        console.log('[VariablesModule] Module closed...');
        cancelEdit();
      }
    });

    return {
      errorMessage,
      validationErrors,
      variables,
      isAdding,
      editingVariableId,
      currentVariable,
      handleClose,
      startAddVariable,
      startEditVariable,
      cancelEdit,
      saveVariable,
      deleteVariable,
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

.variables-section {
  margin-bottom: 2vh;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2vh;
}

.section-title {
  font-size: 1.5vh;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.add-btn {
  padding: 0.8vh 1.5vh;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 0.6vh;
  font-size: 1.3vh;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: inherit;
}

.add-btn:hover {
  background: #7c3aed;
}

.variable-form {
  background: #f9fafb;
  padding: 2vh;
  border-radius: 0.8vh;
  border: 0.1vh solid #e5e7eb;
  margin-bottom: 2vh;
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
  resize: vertical;
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

.hint {
  margin: 0.5vh 0 0 0;
  font-size: 1.2vh;
  color: #6b7280;
}

.form-actions {
  display: flex;
  gap: 1vh;
  margin-top: 1.5vh;
}

.save-btn-small,
.cancel-btn-small {
  flex: 1;
  padding: 1vh 1.5vh;
  border: none;
  border-radius: 0.6vh;
  font-size: 1.3vh;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.save-btn-small {
  background: #8b5cf6;
  color: white;
}

.save-btn-small:hover {
  background: #7c3aed;
}

.cancel-btn-small {
  background: #e5e7eb;
  color: #374151;
}

.cancel-btn-small:hover {
  background: #d1d5db;
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 1vh;
}

.variable-item {
  background: #f9fafb;
  border: 0.1vh solid #e5e7eb;
  border-radius: 0.8vh;
  padding: 1.5vh;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.variable-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.variable-content {
  flex: 1;
  min-width: 0;
}

.variable-header {
  display: flex;
  gap: 1vh;
  align-items: baseline;
  margin-bottom: 0.5vh;
}

.variable-name {
  font-size: 1.4vh;
  font-weight: 600;
  color: #8b5cf6;
  font-family: monospace;
}

.variable-value {
  font-size: 1.3vh;
  color: #374151;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.variable-description {
  font-size: 1.2vh;
  color: #6b7280;
  margin-top: 0.5vh;
}

.variable-actions {
  display: flex;
  gap: 0.5vh;
  margin-left: 1vh;
}

.edit-btn-small,
.delete-btn-small {
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

.edit-btn-small:hover {
  background: #e5e7eb;
  color: #8b5cf6;
}

.delete-btn-small:hover {
  background: #fee2e2;
  color: #ef4444;
}

.empty-state {
  text-align: center;
  color: #9ca3af;
  font-size: 1.3vh;
  padding: 4vh 2vh;
}

.module-footer {
  padding: 2vh 2.5vh;
  border-top: 0.1vh solid #f0f0f0;
  background: #fafafa;
}

.close-btn-footer {
  width: 100%;
  padding: 1.2vh 2vh;
  background: #e5e7eb;
  color: #374151;
  border: none;
  border-radius: 0.6vh;
  font-size: 1.4vh;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  font-family: inherit;
}

.close-btn-footer:hover {
  background: #d1d5db;
}
</style>

