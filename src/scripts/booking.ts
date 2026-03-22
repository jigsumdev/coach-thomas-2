import { createWidget } from '@typeform/embed';
import '@typeform/embed/build/css/widget.css';

import { initBookingCalendar } from './booking-calendar';

/** Same form as https://se5bihyh1g4.typeform.com/to/Qvam8lc4 — embedded in-page before the calendar. */
const TYPEFORM_FORM_ID = 'Qvam8lc4';
const SESSION_TYPEFORM_DONE = 'forge-signin-typeform-done';

let initialized = false;

export async function initBooking(): Promise<void> {
  if (initialized) {
    return;
  }

  const ctaElement = document.getElementById('js-typeform-cta');
  const modalElement = document.getElementById('booking-modal');
  const closeButtonElement = document.getElementById('booking-modal-close');
  const backdropElement = document.getElementById('booking-modal-backdrop');
  const typeformStep = document.getElementById('typeform-step');
  const bookingCalendarStep = document.getElementById('booking-calendar-step');
  const typeformContainer = document.getElementById('typeform-container');
  const titleTypeform = document.getElementById('booking-modal-title-typeform');
  const titleCalendar = document.getElementById('booking-modal-title-calendar');
  const bookingDialog = document.getElementById('booking-dialog');

  if (
    !ctaElement ||
    !modalElement ||
    !closeButtonElement ||
    !backdropElement ||
    !typeformStep ||
    !bookingCalendarStep ||
    !typeformContainer ||
    !titleTypeform ||
    !titleCalendar ||
    !bookingDialog
  ) {
    return;
  }

  const cta = ctaElement as HTMLAnchorElement;
  const modal = modalElement;
  const closeButton = closeButtonElement as HTMLButtonElement;
  const backdrop = backdropElement;
  const tfStepEl = typeformStep;
  const calStepEl = bookingCalendarStep;
  const tfContainerEl = typeformContainer;
  const tfTitleEl = titleTypeform;
  const calTitleEl = titleCalendar;
  const dialogEl = bookingDialog;

  const calendarApi = initBookingCalendar();
  if (!calendarApi) {
    return;
  }
  const bookingCalendarApi = calendarApi;

  let typeformWidget: ReturnType<typeof createWidget> | null = null;

  function hasCompletedTypeform(): boolean {
    try {
      return sessionStorage.getItem(SESSION_TYPEFORM_DONE) === '1';
    } catch {
      return false;
    }
  }

  function setTypeformCompleted(): void {
    try {
      sessionStorage.setItem(SESSION_TYPEFORM_DONE, '1');
    } catch {
      /* ignore */
    }
  }

  function showCalendarStep(): void {
    tfStepEl.hidden = true;
    calStepEl.hidden = false;
    tfTitleEl.hidden = true;
    calTitleEl.hidden = false;
    dialogEl.setAttribute('aria-labelledby', 'booking-modal-title-calendar');
  }

  function showTypeformStep(): void {
    tfStepEl.hidden = false;
    calStepEl.hidden = true;
    tfTitleEl.hidden = false;
    calTitleEl.hidden = true;
    dialogEl.setAttribute('aria-labelledby', 'booking-modal-title-typeform');
  }

  function mountTypeform(): void {
    if (typeformWidget) {
      return;
    }
    typeformWidget = createWidget(TYPEFORM_FORM_ID, {
      container: tfContainerEl,
      autoResize: true,
      inlineOnMobile: true,
      onSubmit: () => {
        setTypeformCompleted();
        if (typeformWidget) {
          typeformWidget.unmount();
          typeformWidget = null;
        }
        tfContainerEl.replaceChildren();
        showCalendarStep();
        bookingCalendarApi.reset();
      },
    });
  }

  function openModal(): void {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (hasCompletedTypeform()) {
      showCalendarStep();
      bookingCalendarApi.reset();
    } else {
      showTypeformStep();
      mountTypeform();
    }
  }

  function closeModal(): void {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  cta.addEventListener('click', (event) => {
    event.preventDefault();
    openModal();
  });

  closeButton.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });

  initialized = true;
}
