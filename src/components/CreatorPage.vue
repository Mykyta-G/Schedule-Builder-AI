<template>
  <div class="creator-page">
    <Sidebar />
    <div class="creator-content">
      <a href="#" @click.prevent="goToHome" class="home-link">Home Page</a>
      <SimpleSchedule @change="onScheduleChange" />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import SimpleSchedule from './SimpleSchedule.vue';
import Sidebar from './Sidebar.vue';

export default defineComponent({
  name: 'CreatorPage',
  components: { SimpleSchedule, Sidebar },
  setup() {
    const title = ref('');
    const description = ref('');
    const schedule = ref({});

    const goToHome = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
    };

    const createSchedule = async () => {
      if (!title.value || !description.value) return;

      const res = await window.api.createSchedule({
        title: title.value,
        description: description.value,
        schedule: schedule.value,
      });

      console.log(res);

      title.value = '';
      description.value = '';
      schedule.value = {};
    };

    const onScheduleChange = (payload) => {
      schedule.value = payload;
    };

    return {
      title,
      description,
      goToHome,
      createSchedule,
      onScheduleChange,
    };
  },
});
</script>

<style scoped>
.creator-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.creator-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.home-link {
  display: inline-block;
  margin-bottom: 16px;
  color: #8b5cf6;
  text-decoration: none;
}

.home-link:hover {
  text-decoration: underline;
}
</style>

