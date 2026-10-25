const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');
const currentYear = document.getElementById('currentYear');
const inquiryDialog = document.getElementById('inquiryDialog');
const inquiryForm = document.getElementById('inquiryForm');
const inquiryFrame = document.getElementById('inquiryResponse');
const formStatus = document.getElementById('formStatus');
const submitInquiry = document.getElementById('submitInquiry');

// Paste the deployed Apps Script Web App URL here to enable form delivery.
const PROJECT_INQUIRY_ENDPOINT = '';

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

const inquiryTriggers = document.querySelectorAll('[data-open-inquiry]');
const closeInquiryButtons = document.querySelectorAll('[data-close-inquiry]');
const inquirySuccess = document.getElementById('inquirySuccess');
const successMessage = document.getElementById('successMessage');
const sendAnotherInquiry = document.getElementById('sendAnotherInquiry');
let lastInquiryTrigger = null;
let submissionTimeout = null;

const createRequestId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const requestIdField = document.getElementById('inquiryRequestId');
if (requestIdField) requestIdField.value = createRequestId();

const setFormStatus = (message, state = 'error') => {
    formStatus.textContent = message;
    formStatus.dataset.state = state;
};

const resetInquiryForm = () => {
    inquiryForm.reset();
    requestIdField.value = createRequestId();
    inquiryForm.hidden = false;
    inquirySuccess.hidden = true;
    inquiryForm.classList.remove('is-submitting');
    submitInquiry.disabled = false;
    setFormStatus('');
};

inquiryTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
        lastInquiryTrigger = trigger;
        inquiryDialog.showModal();
    });
});

closeInquiryButtons.forEach((button) => {
    button.addEventListener('click', () => inquiryDialog.close());
});

inquiryDialog?.addEventListener('close', () => {
    lastInquiryTrigger?.focus();
});

sendAnotherInquiry?.addEventListener('click', resetInquiryForm);

const deadlineField = inquiryForm?.querySelector('[name="deadline"]');
if (deadlineField) {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
    deadlineField.min = localDate;
}

inquiryForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!inquiryForm.reportValidity()) return;

    if (!PROJECT_INQUIRY_ENDPOINT) {
        setFormStatus('The form is ready, but delivery is not connected yet. Deploy google-apps-script.gs and add its Web App URL in script.js.');
        return;
    }

    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(PROJECT_INQUIRY_ENDPOINT)) {
        setFormStatus('The inquiry form endpoint is invalid. Check the Apps Script Web App URL in script.js.');
        return;
    }

    if (!requestIdField.value) requestIdField.value = createRequestId();
    inquiryForm.action = PROJECT_INQUIRY_ENDPOINT;
    inquiryForm.classList.add('is-submitting');
    submitInquiry.disabled = true;
    setFormStatus('Sending your inquiry…', 'pending');
    inquiryForm.submit();

    window.clearTimeout(submissionTimeout);
    submissionTimeout = window.setTimeout(() => {
        inquiryForm.classList.remove('is-submitting');
        submitInquiry.disabled = false;
        setFormStatus('No confirmation arrived. Check your connection and try sending again.');
    }, 30000);
});

window.addEventListener('message', (event) => {
    if (event.source !== inquiryFrame?.contentWindow) return;

    const response = event.data;
    if (response?.type !== 'portfolio-inquiry' || response.requestId !== requestIdField.value) return;

    window.clearTimeout(submissionTimeout);
    inquiryForm.classList.remove('is-submitting');
    submitInquiry.disabled = false;

    if (!response.ok) {
        setFormStatus(response.message || 'The inquiry could not be saved. Please try again or email me directly.');
        return;
    }

    inquiryForm.hidden = true;
    inquirySuccess.hidden = false;
    successMessage.textContent = response.emailSent
        ? 'Your details are saved, and I’ve been notified. I’ll get back to you soon.'
        : 'Your details are saved, but the email notification could not be sent. I’ll still receive your inquiry in the project sheet.';
});

const closeNavigation = () => {
    navMenu?.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'Open navigation');
};

navToggle?.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isExpanded));
    navToggle.setAttribute('aria-label', isExpanded ? 'Open navigation' : 'Close navigation');
    navMenu?.classList.toggle('is-open', !isExpanded);
});

navLinks.forEach((link) => {
    link.addEventListener('click', closeNavigation);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeNavigation();
    }
});

const sections = document.querySelectorAll('main section[id]');
if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            navLinks.forEach((link) => {
                const isCurrent = link.getAttribute('href') === `#${entry.target.id}`;
                link.classList.toggle('active', isCurrent);
            });
        });
    }, { rootMargin: '-35% 0px -55% 0px' });

    sections.forEach((section) => sectionObserver.observe(section));
}

const revealTargets = document.querySelectorAll(
    '.intro-grid > *, .service-card, .project-card, .process-step, .stack-group, .contact-card'
);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add('is-visible');
            entry.target.addEventListener('animationend', () => {
                entry.target.classList.remove('scroll-reveal', 'is-visible');
            }, { once: true });
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -45px 0px' });

    revealTargets.forEach((target) => {
        target.classList.add('scroll-reveal');
        revealObserver.observe(target);
    });
}
