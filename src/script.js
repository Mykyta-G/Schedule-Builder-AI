const title_el = document.getElementById('title');
if (title_el) title_el.innerText = api.title;

const schedule_title_el = document.getElementById('ScheduleTitle');
const schedule_description_el = document.getElementById('ScheduleDescription');
const submit_schedule_el = document.getElementById('submit-schedule');

submit_schedule_el.addEventListener('click', async () => {
    const title = schedule_title_el.value;
    const description = schedule_description_el.value;

    const res = await api.createSchedule({
        title,
        description
    });

    console.log(res);

    schedule_title_el.value = '';
    schedule_description_el.value = '';
});