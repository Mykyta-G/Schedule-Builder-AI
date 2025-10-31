<template>
  <div>
    <a href="#" @click.prevent="goToHome">Home Page</a>
    <br><br>
    <h1>Creator</h1>
    <p>This is the creator page</p>
    <input v-model="title" type="text" id="ScheduleTitle" placeholder="Schedule Title">
    <input v-model="description" type="text" id="ScheduleDescription" placeholder="Schedule Description">
    <button @click="createSchedule">Create</button>
    <br><br>
    <SimpleSchedule @change="onScheduleChange" />
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import SimpleSchedule from './SimpleSchedule.vue';

export default defineComponent({
  name: 'CreatorPage',
  components: { SimpleSchedule },
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

