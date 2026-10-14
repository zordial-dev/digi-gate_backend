export interface AvailabilityResult {
  is_available: boolean;
  is_lunch: boolean;
  is_on_leave: boolean;
  is_off_duty: boolean;
  availability_status: string;
  status_label: string;
  available_from?: string;
  available_to?: string;
  lunch_from?: string;
  lunch_to?: string;
}

export function computeHostAvailability(person: any, now: Date = new Date()): AvailabilityResult {
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${mm}-${dd}`;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayWeekday = weekdays[now.getDay()];
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;

  const unavailableDates = Array.isArray(person.unavailable_dates) ? person.unavailable_dates : [];
  const dateOverrides = (typeof person.date_overrides === 'object' && person.date_overrides !== null) ? person.date_overrides : {};
  const todayOverride = dateOverrides[todayStr];

  // 1. Check full-day leave
  if (unavailableDates.includes(todayStr) || todayOverride?.type === 'off') {
    return {
      is_available: false,
      is_lunch: false,
      is_on_leave: true,
      is_off_duty: false,
      availability_status: 'On Leave Today',
      status_label: '🔴 Unavailable (On Leave Today)',
    };
  }

  // 2. Check working days (if no custom override for today)
  const workingDays = Array.isArray(person.working_days) && person.working_days.length > 0 
    ? person.working_days 
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  if (!todayOverride && !workingDays.includes(todayWeekday)) {
    return {
      is_available: false,
      is_lunch: false,
      is_on_leave: false,
      is_off_duty: true,
      availability_status: `Off Duty (${todayWeekday})`,
      status_label: `🔴 Off Duty (${todayWeekday})`,
    };
  }

  // 3. Determine active hours for today
  const formatTime = (t: string | undefined, fallback: string) => {
    if (!t) return fallback;
    return String(t).slice(0, 5);
  };

  const availableFrom = formatTime(todayOverride?.available_from || person.available_from, '09:00');
  const availableTo = formatTime(todayOverride?.available_to || person.available_to, '18:00');
  const lunchFrom = formatTime(todayOverride?.lunch_from || person.lunch_from, '13:00');
  const lunchTo = formatTime(todayOverride?.lunch_to || person.lunch_to, '14:00');

  // 4. Check lunch break
  if (lunchFrom && lunchTo && currentTime >= lunchFrom && currentTime < lunchTo) {
    return {
      is_available: false,
      is_lunch: true,
      is_on_leave: false,
      is_off_duty: false,
      availability_status: `On Lunch Break (until ${lunchTo})`,
      status_label: `🥪 On Lunch Break (until ${lunchTo})`,
      available_from: availableFrom,
      available_to: availableTo,
      lunch_from: lunchFrom,
      lunch_to: lunchTo,
    };
  }

  // 5. Check work hours (coming & going time)
  if (currentTime < availableFrom) {
    return {
      is_available: false,
      is_lunch: false,
      is_on_leave: false,
      is_off_duty: false,
      availability_status: `Out of Office (Starts at ${availableFrom})`,
      status_label: `🔴 Out of Office (Starts at ${availableFrom})`,
      available_from: availableFrom,
      available_to: availableTo,
      lunch_from: lunchFrom,
      lunch_to: lunchTo,
    };
  }

  if (currentTime >= availableTo) {
    return {
      is_available: false,
      is_lunch: false,
      is_on_leave: false,
      is_off_duty: false,
      availability_status: `Out of Office (Ended at ${availableTo})`,
      status_label: `🔴 Out of Office (Available ${availableFrom} - ${availableTo})`,
      available_from: availableFrom,
      available_to: availableTo,
      lunch_from: lunchFrom,
      lunch_to: lunchTo,
    };
  }

  // 6. Free and Available!
  return {
    is_available: true,
    is_lunch: false,
    is_on_leave: false,
    is_off_duty: false,
    availability_status: 'Available',
    status_label: '🟢 Available',
    available_from: availableFrom,
    available_to: availableTo,
    lunch_from: lunchFrom,
    lunch_to: lunchTo,
  };
}

export interface OrganisationStatusResult {
  is_open: boolean;
  status_type: 'open' | 'holiday' | 'off_day' | 'closed_hours';
  status_title: string;
  status_message: string;
  holiday_title?: string;
  holiday_date?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
}

export function computeOrganisationStatus(org: any, now: Date = new Date()): OrganisationStatusResult {
  if (!org) {
    return {
      is_open: true,
      status_type: 'open',
      status_title: 'Open for Visitors',
      status_message: 'Organisation is currently open.',
    };
  }

  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${mm}-${dd}`;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayWeekday = weekdays[now.getDay()];
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;

  const formatTime = (t: string | undefined, fallback: string) => {
    if (!t) return fallback;
    return String(t).slice(0, 5);
  };

  const openingTime = formatTime(org.opening_time, '09:00');
  const closingTime = formatTime(org.closing_time, '18:00');

  // 1. Check Holidays
  const holidays = Array.isArray(org.holidays) ? org.holidays : [];
  const todayHoliday = holidays.find((h: any) => {
    if (!h) return false;
    if (typeof h === 'string') return h === todayStr;
    return h.date === todayStr;
  });

  if (todayHoliday) {
    const holidayTitle = typeof todayHoliday === 'object' && todayHoliday.title ? todayHoliday.title : 'Official Holiday';
    return {
      is_open: false,
      status_type: 'holiday',
      status_title: `Closed Today: ${holidayTitle}`,
      status_message: `Organisation is closed today on occasion of ${holidayTitle}.`,
      holiday_title: holidayTitle,
      holiday_date: todayStr,
      opening_time: openingTime,
      closing_time: closingTime,
    };
  }

  // 2. Check Working Days
  const workingDays = Array.isArray(org.working_days) && org.working_days.length > 0
    ? org.working_days
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!workingDays.includes(todayWeekday)) {
    return {
      is_open: false,
      status_type: 'off_day',
      status_title: `Closed Today (${todayWeekday} - Weekly Off)`,
      status_message: `Organisation is closed today (${todayWeekday}). Regular working days are ${workingDays.join(', ')}.`,
      working_days: workingDays,
      opening_time: openingTime,
      closing_time: closingTime,
    };
  }

  // 3. Check Visiting Hours
  if (currentTime < openingTime) {
    return {
      is_open: false,
      status_type: 'closed_hours',
      status_title: 'Closed Right Now',
      status_message: `Visiting hours have not started yet. Today's hours are ${openingTime} to ${closingTime}.`,
      working_days: workingDays,
      opening_time: openingTime,
      closing_time: closingTime,
    };
  }

  if (currentTime >= closingTime) {
    return {
      is_open: false,
      status_type: 'closed_hours',
      status_title: 'Visiting Hours Ended',
      status_message: `Visiting hours have ended for today. Today's hours were ${openingTime} to ${closingTime}.`,
      working_days: workingDays,
      opening_time: openingTime,
      closing_time: closingTime,
    };
  }

  // 4. Open and Accepting Visitors
  return {
    is_open: true,
    status_type: 'open',
    status_title: 'Open for Visitors',
    status_message: `Organisation is open. Visiting hours: ${openingTime} - ${closingTime}.`,
    working_days: workingDays,
    opening_time: openingTime,
    closing_time: closingTime,
  };
}
