<template>
  <div class="chat-wrapper">
    <div class="chat-header">
      <div class="chat-title">Assistant</div>
      <div class="chat-actions">
        <button class="small-btn" @click="toggleSettings">Settings</button>
      </div>
    </div>

    <div v-if="showSettings" class="settings-panel">
      <label class="settings-row">
        <span>OpenAI API Key</span>
        <input
          type="password"
          v-model="apiKey"
          @blur="persistKey"
          placeholder="sk-..."
        >
      </label>
      <p class="hint">Your key is stored locally in this device (localStorage).</p>
    </div>

    <div ref="messagesEl" class="messages">
      <div
        v-for="(m, idx) in messages"
        :key="idx"
        class="message"
        :class="m.role === 'user' ? 'user' : 'assistant'"
      >
        <div class="bubble">
          {{ m.content }}
        </div>
      </div>
      <div v-if="isLoading" class="message assistant">
        <div class="bubble typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>
    </div>

    <div class="composer">
      <textarea
        ref="inputEl"
        v-model="input"
        class="input"
        rows="1"
        placeholder="Ask anything…"
        @input="autoResize"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="send-btn" :disabled="!canSend" @click="send">Send</button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed, onMounted, nextTick } from 'vue';

export default defineComponent({
  name: 'ChatWindow',
  setup() {
    const messages = ref([
      { role: 'assistant', content: 'Hi! I can help you plan and refine your schedule. What would you like to build?' }
    ]);
    const input = ref('');
    const inputEl = ref(null);
    const isLoading = ref(false);
    const messagesEl = ref(null);
    const showSettings = ref(false);
    const apiKey = ref(localStorage.getItem('OPENAI_API_KEY') || '');

    const persistKey = () => {
      localStorage.setItem('OPENAI_API_KEY', apiKey.value || '');
    };

    const scrollToBottom = async () => {
      await nextTick();
      const el = messagesEl.value;
      if (el) el.scrollTop = el.scrollHeight;
    };

    const canSend = computed(() => input.value.trim().length > 0 && !isLoading.value);

    const autoResize = async () => {
      await nextTick();
      const el = inputEl.value;
      if (!el) return;
      el.style.height = 'auto';
      const maxPx = Math.max(window.innerHeight * 0.2, 120); // cap at 20vh
      el.style.height = Math.min(el.scrollHeight, maxPx) + 'px';
      if (messagesEl.value) {
        messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
      }
    };

    const send = async () => {
      const content = input.value.trim();
      if (!content) return;
      messages.value.push({ role: 'user', content });
      input.value = '';
      await scrollToBottom();

      isLoading.value = true;
      try {
        const key = apiKey.value.trim();
        if (!key) {
          // Fallback assistant if no API key
          await new Promise(r => setTimeout(r, 300));
          messages.value.push({ role: 'assistant', content: 'Add your OpenAI API key in Settings to get AI responses.' });
          isLoading.value = false;
          await scrollToBottom();
          return;
        }

        // Use Electron IPC to send chat request
        if (!window.api || !window.api.chat) {
          throw new Error('IPC chat handler not available');
        }

        const chatMessages = messages.value.map(m => ({ role: m.role, content: m.content }));
        
        const result = await window.api.chat({
          apiKey: key,
          messages: chatMessages
        });

        if (result.error) {
          messages.value.push({ 
            role: 'assistant', 
            content: `Error: ${result.error}` 
          });
        } else {
          messages.value.push({ 
            role: 'assistant', 
            content: result.content || 'No response from AI.' 
          });
        }
      } catch (err) {
        console.error('Chat error:', err);
        messages.value.push({ 
          role: 'assistant', 
          content: 'Sorry, I could not reach the AI right now. Please check your API key and connection.' 
        });
      } finally {
        isLoading.value = false;
        await scrollToBottom();
      }
    };

    const toggleSettings = () => {
      showSettings.value = !showSettings.value;
    };

    onMounted(async () => {
      await scrollToBottom();
      await autoResize();
    });

    return {
      messages,
      input,
      isLoading,
      messagesEl,
      canSend,
      send,
      inputEl,
      autoResize,
      showSettings,
      toggleSettings,
      apiKey,
      persistKey,
    };
  },
});
</script>

<style scoped>
.chat-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-left: 0.1vh solid #f0f0f0;
  box-shadow: -0.2vh 0 1vh rgba(0, 0, 0, 0.04);
}

.chat-header {
  padding: 2vh 2.5vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 0.1vh solid #f0f0f0;
  background: #fafafa;
}

.chat-title {
  font-weight: 700;
  color: #1a1a1a;
  font-size: 1.75vh;
}

.small-btn {
  background: #f3f4f6;
  border: none;
  border-radius: 0.8vh;
  padding: 0.8vh 1.3vh;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: background 0.2s ease;
}

.small-btn:hover {
  background: #e5e7eb;
}

.settings-panel {
  padding: 1.5vh 2.5vh;
  border-bottom: 0.1vh solid #f0f0f0;
  background: #ffffff;
}

.settings-row {
  display: flex;
  flex-direction: column;
  gap: 0.8vh;
}

.settings-row input {
  padding: 1vh 1.3vh;
  border: 0.1vh solid #e5e7eb;
  border-radius: 1vh;
  font-size: 0.875rem;
}

.hint {
  margin: 1vh 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.messages {
  flex: 1;
  padding: 2vh;
  overflow-y: auto;
  background: #ffffff;
}

.messages::-webkit-scrollbar {
  width: 0.8vh;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 0.4vh;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.message { display: flex; margin-bottom: 1.3vh; }
.message.user { justify-content: flex-end; }
.message.assistant { justify-content: flex-start; }

.bubble {
  max-width: 80%;
  padding: 1.3vh 1.5vh;
  border-radius: 1.5vh;
  font-size: 0.875rem;
  line-height: 1.35;
  word-break: break-word;
}

.message.user .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-top-right-radius: 0.5vh;
}

.message.assistant .bubble {
  background: #f9fafb;
  border: 0.1vh solid #f0f0f0;
  color: #1f2937;
  border-top-left-radius: 0.5vh;
  box-shadow: 0 0.1vh 0.2vh rgba(0, 0, 0, 0.03);
}

.typing { display: inline-flex; gap: 0.5vh; align-items: center; }
.dot { width: 0.8vh; height: 0.8vh; background: #9ca3af; border-radius: 50%; animation: blink 1.2s infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%, 80%, 100% { opacity: 0.2 } 40% { opacity: 1 } }

.composer {
  padding: 1.5vh 2vh;
  border-top: 0.1vh solid #f0f0f0;
  display: flex;
  gap: 1vh;
  background: #fafafa;
}

.input {
  flex: 1;
  resize: none;
  padding: 0.5vh 1vh;
  border: 0.1vh solid #e5e7eb;
  border-radius: 1.2vh;
  font-size: 0.95rem;
  line-height: 1.5;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  max-height: 20vh;
  overflow-y: auto;
  caret-color: #111827;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 0.3vh rgba(102, 126, 234, 0.1);
}

.input::placeholder {
  color: #9ca3af;
}

.send-btn {
  padding: 0 2.5vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 1.2vh;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-0.1vh);
  box-shadow: 0 0.3vh 1vh rgba(102, 126, 234, 0.3);
}

.send-btn:disabled { 
  opacity: 0.5; 
  cursor: not-allowed;
  transform: none;
}
</style>