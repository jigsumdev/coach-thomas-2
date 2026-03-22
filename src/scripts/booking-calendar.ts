type SelectedDate = {
  d: number;
  m: number;
  y: number;
};

type SelectedSlot = {
  h: number;
  label: string;
  m: number;
};

type BookingCalendarApi = {
  reset: () => void;
};

type Copy = {
  availableTimes: string;
  atWord: string;
  bookingError: string;
  bookingSubmitting: string;
  bookingSuccess: string;
  chooseDateFirst: string;
  noSlots: string;
  selectedPrefix: string;
};

const BOOKING = {
  availability: {
    0: [{ start: '09:00', end: '18:00' }],
    1: [{ start: '14:00', end: '21:00' }],
    2: [{ start: '08:00', end: '16:00' }],
    3: [
      { start: '08:00', end: '11:00' },
      { start: '14:00', end: '21:00' },
    ],
    4: [{ start: '08:00', end: '21:00' }],
    5: [{ start: '12:00', end: '15:00' }],
    6: [{ start: '09:00', end: '18:00' }],
  } as Record<number, Array<{ end: string; start: string }>>,
  blockedDates: [] as string[],
  endpoint: '/api/booking',
  maxMonthsAhead: 3,
  maxPayloadBytes: 10 * 1024,
  maxPathLength: 200,
  minAdvanceHours: 24,
  slotMinutes: 60,
};

function setElementVisible(element: HTMLElement | null, isVisible: boolean): void {
  if (!element) {
    return;
  }
  element.hidden = !isVisible;
}

function clearElement(element: Element): void {
  element.replaceChildren();
}

function dateKey(year: number, month: number, day: number): string {
  const pad = (value: number) => (value < 10 ? `0${value}` : String(value));
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function getJsonSizeInBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

function isFrenchDocument(): boolean {
  return document.documentElement.lang.toLowerCase().startsWith('fr');
}

function getCopy(): Copy {
  if (isFrenchDocument()) {
    return {
      availableTimes: 'Heures disponibles',
      atWord: 'a',
      bookingError: 'Impossible d’envoyer la demande. Reessaie dans un instant.',
      bookingSubmitting: 'Envoi...',
      bookingSuccess:
        'Demande envoyee. Merci! Je te contacte rapidement pour confirmer.',
      chooseDateFirst: 'Choisis d’abord une date.',
      noSlots:
        'Aucun horaire disponible pour cette date. Choisis une autre journee.',
      selectedPrefix: 'Selection :',
    };
  }

  return {
    availableTimes: 'Available times',
    atWord: 'at',
    bookingError: 'Could not send your request. Please try again in a moment.',
    bookingSubmitting: 'Sending...',
    bookingSuccess:
      'Request sent. Thanks! I will reach out soon to confirm your booking.',
    chooseDateFirst: 'Please choose a date first.',
    noSlots: 'No time slots are available for this date. Please choose another day.',
    selectedPrefix: 'Selected:',
  };
}

export function initBookingCalendar(): BookingCalendarApi | null {
  const locale = isFrenchDocument() ? 'fr-CA' : 'en-CA';
  const copy = getCopy();
  const calGridElement = document.getElementById('cal-grid') as HTMLElement | null;
  const calTitleElement = document.getElementById('cal-title') as HTMLElement | null;
  const calPickerElement = document.getElementById('cal-picker') as HTMLElement | null;
  const calDescElement = document.getElementById('cal-desc') as HTMLElement | null;
  const calSlotsElement = document.getElementById('cal-slots') as HTMLElement | null;
  const calSlotsLabelElement = document.getElementById(
    'cal-slots-label',
  ) as HTMLElement | null;
  const calSlotsGridElement = document.getElementById(
    'cal-slots-grid',
  ) as HTMLElement | null;
  const calBackElement = document.getElementById('cal-back') as HTMLButtonElement | null;
  const calDoneElement = document.getElementById('cal-done') as HTMLButtonElement | null;
  const calPrevElement = document.getElementById('cal-prev') as HTMLButtonElement | null;
  const calNextElement = document.getElementById('cal-next') as HTMLButtonElement | null;
  const calSelectedLabel = document.getElementById('cal-selected-label') as HTMLElement | null;
  const bookingFormWrapElement = document.getElementById(
    'booking-form-wrap',
  ) as HTMLElement | null;
  const bookingSummaryElement = document.getElementById(
    'booking-summary',
  ) as HTMLElement | null;
  const bookingStatusElement = document.getElementById('booking-status') as HTMLElement | null;
  const bookingFormElement = document.getElementById('bookingForm') as HTMLFormElement | null;
  const bookingErrorElement = document.getElementById(
    'booking-form-error',
  ) as HTMLElement | null;

  if (
    !calGridElement ||
    !calTitleElement ||
    !calPickerElement ||
    !calDescElement ||
    !calSlotsElement ||
    !calSlotsLabelElement ||
    !calSlotsGridElement ||
    !calBackElement ||
    !calDoneElement ||
    !calPrevElement ||
    !calNextElement ||
    !bookingFormWrapElement ||
    !bookingSummaryElement ||
    !bookingStatusElement ||
    !bookingFormElement ||
    !bookingErrorElement
  ) {
    return null;
  }

  const calGrid = calGridElement;
  const calTitle = calTitleElement;
  const calPicker = calPickerElement;
  const calDesc = calDescElement;
  const calSlots = calSlotsElement;
  const calSlotsLabel = calSlotsLabelElement;
  const calSlotsGrid = calSlotsGridElement;
  const calBack = calBackElement;
  const calDone = calDoneElement;
  const calPrev = calPrevElement;
  const calNext = calNextElement;
  const bookingFormWrap = bookingFormWrapElement;
  const bookingSummary = bookingSummaryElement;
  const bookingStatus = bookingStatusElement;
  const bookingForm = bookingFormElement;
  const bookingError = bookingErrorElement;

  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  let selectedDate: SelectedDate | null = null;
  let selectedSlot: SelectedSlot | null = null;

  function setStatus(message: string, isError = false): void {
    bookingStatus.textContent = message;
    bookingStatus.hidden = false;
    bookingStatus.style.borderColor = isError ? 'rgba(248,113,113,.6)' : '';
    bookingStatus.style.color = isError ? '#fecaca' : '';
  }

  function hideStatus(): void {
    bookingStatus.hidden = true;
    bookingStatus.textContent = '';
    bookingStatus.style.borderColor = '';
    bookingStatus.style.color = '';
  }

  function hideFormError(): void {
    bookingError.hidden = true;
    bookingError.textContent = '';
  }

  function showFormError(message: string): void {
    bookingError.textContent = message;
    bookingError.hidden = false;
  }

  function formatMonthYear(year: number, month: number): string {
    return new Date(year, month, 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  }

  function getAvailabilityRanges(
    year: number,
    month: number,
    day: number,
  ): Array<{ end: string; start: string }> {
    const date = new Date(year, month, day);
    return BOOKING.availability[date.getDay()] || [];
  }

  function getSlotsForDate(
    year: number,
    month: number,
    day: number,
    cutoff: Date,
  ): SelectedSlot[] {
    const slots: SelectedSlot[] = [];
    const ranges = getAvailabilityRanges(year, month, day);

    for (const range of ranges) {
      const startMinutes = parseTimeToMinutes(range.start);
      const endMinutes = parseTimeToMinutes(range.end);

      for (
        let totalMinutes = startMinutes;
        totalMinutes < endMinutes;
        totalMinutes += BOOKING.slotMinutes
      ) {
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const slotTime = new Date(year, month, day, hour, minute);
        if (slotTime <= cutoff) {
          continue;
        }

        slots.push({
          h: hour,
          label: slotTime.toLocaleTimeString(locale, {
            hour: '2-digit',
            hour12: false,
            minute: '2-digit',
          }),
          m: minute,
        });
      }
    }

    return slots;
  }

  function isOff(year: number, month: number, day: number): boolean {
    if (BOOKING.blockedDates.includes(dateKey(year, month, day))) {
      return true;
    }

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() + BOOKING.minAdvanceHours);
    return getSlotsForDate(year, month, day, cutoff).length === 0;
  }

  function updateNavButtons(): void {
    calPrev.disabled = viewYear === now.getFullYear() && viewMonth === now.getMonth();

    const maxDate = new Date(now.getFullYear(), now.getMonth() + BOOKING.maxMonthsAhead, 1);
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    calNext.disabled = nextDate > maxDate;
  }

  function updateSelectedLabel(): void {
    if (!selectedDate || !calSelectedLabel) {
      if (calSelectedLabel) {
        calSelectedLabel.textContent = '';
        setElementVisible(calSelectedLabel, false);
      }
      return;
    }

    const selectedDateValue = new Date(selectedDate.y, selectedDate.m, selectedDate.d);
    calSelectedLabel.textContent = `${copy.selectedPrefix} ${selectedDateValue.toLocaleDateString(
      locale,
      {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        year: 'numeric',
      },
    )}`;
    setElementVisible(calSelectedLabel, true);
  }

  function onDayClick(event: Event): void {
    const button = event.currentTarget as HTMLButtonElement;
    if (button.classList.contains('cal-day--off')) {
      return;
    }

    selectedDate = {
      d: Number.parseInt(button.dataset.day || '', 10),
      m: Number.parseInt(button.dataset.month || '', 10),
      y: Number.parseInt(button.dataset.year || '', 10),
    };
    selectedSlot = null;

    if (button.dataset.other === '1') {
      viewYear = selectedDate.y;
      viewMonth = selectedDate.m;
    }

    renderCalendar();
  }

  function renderCalendar(): void {
    calTitle.textContent = formatMonthYear(viewYear, viewMonth);
    clearElement(calGrid);

    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = new Date();
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

    for (let index = 0; index < startOffset; index += 1) {
      const day = daysInPrevMonth - startOffset + index + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cal-day cal-day--other-month';
      button.textContent = String(day);

      if (isOff(prevYear, prevMonth, day)) {
        button.classList.add('cal-day--off');
      } else {
        button.dataset.year = String(prevYear);
        button.dataset.month = String(prevMonth);
        button.dataset.day = String(day);
        button.dataset.other = '1';
        button.addEventListener('click', onDayClick);
      }

      calGrid.appendChild(button);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cal-day';
      button.textContent = String(day);

      if (isOff(viewYear, viewMonth, day)) {
        button.classList.add('cal-day--off');
      } else {
        button.dataset.year = String(viewYear);
        button.dataset.month = String(viewMonth);
        button.dataset.day = String(day);
        button.addEventListener('click', onDayClick);
      }

      if (
        today.getFullYear() === viewYear &&
        today.getMonth() === viewMonth &&
        today.getDate() === day
      ) {
        button.classList.add('cal-day--today');
      }

      if (
        selectedDate &&
        selectedDate.y === viewYear &&
        selectedDate.m === viewMonth &&
        selectedDate.d === day
      ) {
        button.classList.add('cal-day--sel');
      }

      calGrid.appendChild(button);
    }

    const totalCells = 7 * 6;
    const filled = startOffset + daysInMonth;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    let nextDay = 1;

    for (let index = filled; index < totalCells; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cal-day cal-day--other-month';
      button.textContent = String(nextDay);

      if (isOff(nextYear, nextMonth, nextDay)) {
        button.classList.add('cal-day--off');
      } else {
        button.dataset.year = String(nextYear);
        button.dataset.month = String(nextMonth);
        button.dataset.day = String(nextDay);
        button.dataset.other = '1';
        button.addEventListener('click', onDayClick);
      }

      calGrid.appendChild(button);
      nextDay += 1;
    }

    updateSelectedLabel();
    updateNavButtons();
    calDone.disabled = !selectedDate;
  }

  function showTimeSlots(): void {
    if (!selectedDate) {
      showFormError(copy.chooseDateFirst);
      return;
    }

    hideFormError();
    setElementVisible(calDesc, false);
    setElementVisible(calPicker, false);
    setElementVisible(calSlots, true);
    setElementVisible(bookingFormWrap, false);

    const date = new Date(selectedDate.y, selectedDate.m, selectedDate.d);
    calSlotsLabel.textContent = `${copy.availableTimes} - ${date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    })}`;
    clearElement(calSlotsGrid);

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() + BOOKING.minAdvanceHours);
    const slots = getSlotsForDate(
      selectedDate.y,
      selectedDate.m,
      selectedDate.d,
      cutoff,
    );

    for (const slot of slots) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot-btn';
      button.textContent = slot.label;
      button.dataset.hour = String(slot.h);
      button.dataset.minute = String(slot.m);
      button.addEventListener('click', (event) => {
        const slotButton = event.currentTarget as HTMLButtonElement;
        selectedSlot = {
          h: Number.parseInt(slotButton.dataset.hour || '', 10),
          label: slotButton.textContent || '',
          m: Number.parseInt(slotButton.dataset.minute || '', 10),
        };

        calSlotsGrid.querySelectorAll('.slot-btn').forEach((el) => {
          el.classList.remove('slot-btn--sel');
        });
        slotButton.classList.add('slot-btn--sel');
        showBookingForm();
      });
      calSlotsGrid.appendChild(button);
    }

    if (!calSlotsGrid.children.length) {
      const message = document.createElement('p');
      message.className = 'text-sm text-white/60';
      message.textContent = copy.noSlots;
      calSlotsGrid.appendChild(message);
    }
  }

  function showBookingForm(): void {
    if (!selectedDate || !selectedSlot) {
      return;
    }

    const date = new Date(selectedDate.y, selectedDate.m, selectedDate.d);
    const dateLabel = date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
      year: 'numeric',
    });

    bookingSummary.textContent = `${dateLabel} ${copy.atWord} ${selectedSlot.label}`;
    setElementVisible(calSlots, false);
    setElementVisible(bookingFormWrap, true);
  }

  function reset(): void {
    selectedDate = null;
    selectedSlot = null;
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    bookingForm.reset();
    hideFormError();
    hideStatus();
    setElementVisible(calDesc, true);
    setElementVisible(calPicker, true);
    setElementVisible(calSlots, false);
    setElementVisible(bookingFormWrap, false);
    renderCalendar();
  }

  calDone.addEventListener('click', showTimeSlots);
  calBack.addEventListener('click', () => {
    selectedSlot = null;
    setElementVisible(calDesc, false);
    setElementVisible(calPicker, true);
    setElementVisible(calSlots, false);
    setElementVisible(bookingFormWrap, false);
  });

  calPrev.addEventListener('click', () => {
    if (viewYear > now.getFullYear() || viewMonth > now.getMonth()) {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      selectedDate = null;
      selectedSlot = null;
      renderCalendar();
    }
  });

  calNext.addEventListener('click', () => {
    const maxDate = new Date(now.getFullYear(), now.getMonth() + BOOKING.maxMonthsAhead, 1);
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    if (nextDate <= maxDate) {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      selectedDate = null;
      selectedSlot = null;
      renderCalendar();
    }
  });

  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormError();
    hideStatus();

    if (!selectedDate || !selectedSlot || !bookingForm.reportValidity()) {
      return;
    }

    const submitBtn = document.getElementById('bookSubmit') as HTMLButtonElement | null;
    if (!submitBtn) {
      return;
    }

    const originalText = submitBtn.textContent ?? '';
    submitBtn.disabled = true;
    submitBtn.textContent = copy.bookingSubmitting;

    const date = new Date(selectedDate.y, selectedDate.m, selectedDate.d);
    const payload = {
      date: date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        year: 'numeric',
      }),
      email:
        (document.getElementById('bookEmail') as HTMLInputElement | null)?.value.trim() ?? '',
      name:
        (document.getElementById('bookName') as HTMLInputElement | null)?.value.trim() ?? '',
      note:
        (document.getElementById('bookNote') as HTMLTextAreaElement | null)?.value.trim() ?? '',
      sourcePath: window.location.pathname,
      time: selectedSlot.label,
    };

    if (payload.sourcePath.length > BOOKING.maxPathLength) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      showFormError(copy.bookingError);
      return;
    }

    if (getJsonSizeInBytes(payload) > BOOKING.maxPayloadBytes) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      showFormError(copy.bookingError);
      return;
    }

    try {
      const response = await fetch(BOOKING.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseBody: Record<string, unknown> = {};
      if (responseText) {
        try {
          responseBody = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          responseBody = { error: responseText };
        }
      }

      if (!response.ok) {
        const errorMessage =
          typeof responseBody?.error === 'string' ? responseBody.error : copy.bookingError;
        throw new Error(errorMessage);
      }

      setStatus(copy.bookingSuccess);
      reset();
      setStatus(copy.bookingSuccess);
    } catch (error) {
      showFormError(error instanceof Error ? error.message : copy.bookingError);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  renderCalendar();
  return { reset };
}
