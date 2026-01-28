import translations from './locales.js';

class TodaysTrashApp {
    constructor() {
        this.state = {
            lang: 'en',
            items: [],
            lastVisitDate: null
        };

        this.elements = {
            title: document.getElementById('app-title'),
            slogan: document.getElementById('app-slogan'),
            countdownLabel: document.getElementById('countdown-label'),
            countdownTimer: document.getElementById('countdown-timer'),
            input: document.getElementById('trash-input'),
            charCount: document.getElementById('char-count'),
            btnThrow: document.getElementById('btn-throw'),
            trashList: document.getElementById('trash-list'),
            emptyState: document.getElementById('empty-state-message'),
            footerPrivacy: document.getElementById('footer-privacy'),
            modal: document.getElementById('confirmation-modal'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('modal-body'),
            btnCancel: document.getElementById('btn-cancel'),
            btnConfirm: document.getElementById('btn-confirm'),
            currentYear: document.getElementById('current-year')
        };

        this.PARTICLE_COUNT = 100;
        this.todayDateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    }

    init() {
        this.detectLanguage();
        this.loadData();
        this.applyTranslations();
        this.setupEventListeners();
        this.startTimer();
        this.render();

        this.elements.currentYear.textContent = new Date().getFullYear();
    }

    detectLanguage() {
        const browserLang = navigator.language.split('-')[0]; // e.g., 'en-US' -> 'en'
        const fullLang = navigator.language; // e.g., 'zh-CN'

        // Check for exact match first (for zh-CN vs zh-TW)
        if (translations[fullLang]) {
            this.state.lang = fullLang;
        } else if (translations[browserLang]) {
            this.state.lang = browserLang;
        } else {
            this.state.lang = 'en'; // Fallback
        }
    }

    applyTranslations() {
        const t = translations[this.state.lang];

        this.elements.title.textContent = t.title;
        this.elements.slogan.innerHTML = t.slogan;
        this.elements.input.placeholder = t.placeholder;
        this.elements.btnThrow.textContent = t.button_throw;
        this.elements.countdownLabel.textContent = t.countdown_label;
        this.elements.emptyState.textContent = t.empty_state;
        this.elements.footerPrivacy.innerHTML = t.footer_privacy;

        this.elements.modalTitle.textContent = t.modal_title;
        this.elements.modalBody.innerHTML = t.modal_body;
        this.elements.btnCancel.textContent = t.modal_cancel;
        this.elements.btnConfirm.textContent = t.modal_confirm;

        document.title = `${t.title} - ${t.slogan.replace('<br>', ' ')}`;
        document.querySelector('meta[name="description"]').setAttribute('content', t.slogan.replace('<br>', ' '));
    }

    loadData() {
        const dateKey = localStorage.getItem('todays_trash_date');
        const items = localStorage.getItem('todays_trash_items');

        if (dateKey !== this.todayDateStr) {
            // New day or first visit
            this.clearAllData();
        } else {
            if (items) {
                this.state.items = JSON.parse(items);
            }
        }
        this.state.lastVisitDate = this.todayDateStr;
        localStorage.setItem('todays_trash_date', this.todayDateStr);
    }

    saveData() {
        localStorage.setItem('todays_trash_items', JSON.stringify(this.state.items));
        localStorage.setItem('todays_trash_date', this.todayDateStr);
    }

    clearAllData() {
        this.state.items = [];
        localStorage.removeItem('todays_trash_items');
        localStorage.setItem('todays_trash_date', this.todayDateStr);
        this.render();
    }

    setupEventListeners() {
        // Input validation and char count
        this.elements.input.addEventListener('input', () => {
            const currentLength = this.elements.input.value.length;
            this.elements.charCount.textContent = `${currentLength} / 300`;
            this.elements.btnThrow.disabled = currentLength === 0;

            // Visual cue for nearing limit
            if (currentLength >= 280) {
                this.elements.charCount.style.color = 'var(--danger-color)';
            } else {
                this.elements.charCount.style.color = '';
            }
        });

        // Open Modal
        this.elements.btnThrow.addEventListener('click', () => {
            if (this.elements.input.value.trim().length === 0) return;
            this.openModal();
        });

        // Modal Actions
        this.elements.btnCancel.addEventListener('click', () => this.closeModal());
        this.elements.btnConfirm.addEventListener('click', () => this.handleConfirmThrow());

        // Close modal on outside click
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });
    }

    openModal() {
        this.elements.modal.classList.remove('hidden');
    }

    closeModal() {
        this.elements.modal.classList.add('hidden');
    }

    handleConfirmThrow() {
        const text = this.elements.input.value;
        const newItem = {
            id: crypto.randomUUID(),
            text: text,
            createdAt: Date.now()
        };

        this.state.items.unshift(newItem); // Add to top
        this.saveData();

        // Visual effects
        this.createParticles();
        this.closeModal();
        this.elements.input.value = '';
        this.elements.charCount.textContent = '0 / 300';
        this.elements.btnThrow.disabled = true;

        this.render();
    }

    render() {
        this.elements.trashList.innerHTML = '';

        if (this.state.items.length === 0) {
            this.elements.emptyState.classList.remove('hidden');
        } else {
            this.elements.emptyState.classList.add('hidden');

            this.state.items.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'trash-card';
                card.style.animationDelay = `${index * 0.05}s`; // Staggered animation

                const p = document.createElement('p');
                p.textContent = item.text;

                const time = document.createElement('span');
                time.className = 'trash-timestamp';
                time.textContent = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                card.appendChild(p);
                card.appendChild(time);
                this.elements.trashList.appendChild(card);
            });
        }
    }

    startTimer() {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const diff = tomorrow - now;

            if (diff <= 0) {
                // Midnight passed
                this.todayDateStr = new Date().toLocaleDateString('en-CA');
                this.clearAllData();
                return;
            }

            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            this.elements.countdownTimer.textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    createParticles() {
        // Simple canvas-based confetti/crumbling effect
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.getElementById('particles-container').appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const particles = [];
        const xStart = window.innerWidth / 2;
        const yStart = window.innerHeight / 2; // Center of screen (approx where modal was)

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: xStart,
                y: yStart,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.0,
                color: `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`,
                size: Math.random() * 3 + 1
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let activeParticles = false;

            particles.forEach(p => {
                if (p.life > 0) {
                    activeParticles = true;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.2; // Gravity
                    p.life -= 0.02;

                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            if (activeParticles) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        };

        animate();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const app = new TodaysTrashApp();
    app.init();
});
