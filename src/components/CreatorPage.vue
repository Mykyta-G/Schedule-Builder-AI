<template>
  <div>
    <a href="#" @click.prevent="goToHome">Home Page</a>
    <br><br>
    <h1>Creator</h1>
    <p>This is the creator page</p>
    <input v-model="title" type="text" id="ScheduleTitle" placeholder="Schedule Title">
    <input v-model="description" type="text" id="ScheduleDescription" placeholder="Schedule Description">
    <button @click="createSchedule">Create</button>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'CreatorPage',
  setup() {
    const title = ref('');
    const description = ref('');

    const goToHome = () => {
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'home' } }));
    };

    const createSchedule = async () => {
      if (!title.value || !description.value) return;

      const res = await window.api.createSchedule({
        title: title.value,
        description: description.value,
      });

      console.log(res);

      title.value = '';
      description.value = '';
    };

    return {
      title,
      description,
      goToHome,
      createSchedule,
    };
  },
});
</script>

