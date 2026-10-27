export type RiderShiftSchedule = { date: string; start_time: string; end_time: string };

export function getPhilippineClock(now: Date): { date: string; time: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function isOutsideShiftHours(schedule: RiderShiftSchedule, now: Date = new Date()): boolean {
  const clock = getPhilippineClock(now);
  return clock.date !== schedule.date || clock.time < schedule.start_time || clock.time >= schedule.end_time;
}
