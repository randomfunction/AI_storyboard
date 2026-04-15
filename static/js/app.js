// ─── DOM References ───
const DOM = {
    input: document.getElementById('narrative-input'),
    style: document.getElementById('style-select'),
    btn: document.getElementById('generate-btn'),
    wrapper: document.getElementById('storyboard-wrapper'),
    container: document.getElementById('scroll-container'),
    next: document.getElementById('next-btn'),
    prev: document.getElementById('prev-btn'),
    download: document.getElementById('download-btn'),
    overlay: document.getElementById('pdf-overlay'),
    features: document.getElementById('features-section'),
    counter: document.getElementById('scene-counter'),
    themeBtn: document.getElementById('theme-toggle'),
    iconMoon: document.getElementById('theme-icon-moon'),
    iconSun: document.getElementById('theme-icon-sun'),
    archBtn: document.getElementById('arch-btn'),
    archModal: document.getElementById('arch-modal'),
    closeArch: document.getElementById('close-arch')
};

let cachedScenes = [];
let currentSlide = 0;

// ═══════════════════════════════════════════════════════
//  THEME SYSTEM
// ═══════════════════════════════════════════════════════
function getPreferredTheme() {
    const stored = localStorage.getItem('pv-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pv-theme', theme);
    if (theme === 'light') {
        DOM.iconMoon.style.display = 'none';
        DOM.iconSun.style.display = 'block';
    } else {
        DOM.iconMoon.style.display = 'block';
        DOM.iconSun.style.display = 'none';
    }
}

DOM.themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

// Initialize theme
applyTheme(getPreferredTheme());


// ═══════════════════════════════════════════════════════
//  CAROUSEL NAVIGATION
// ═══════════════════════════════════════════════════════
function scrollToSlide(index) {
    const cards = DOM.container.querySelectorAll('.scene-card, .skeleton-card');
    if (cards[index]) {
        cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        currentSlide = index;
        updateCounter();
    }
}

DOM.prev.addEventListener('click', () => {
    currentSlide = Math.max(0, currentSlide - 1);
    scrollToSlide(currentSlide);
});

DOM.next.addEventListener('click', () => {
    const total = DOM.container.children.length;
    currentSlide = Math.min(total - 1, currentSlide + 1);
    scrollToSlide(currentSlide);
});

function updateCounter() {
    const total = cachedScenes.filter(Boolean).length || DOM.container.children.length;
    if (total > 0) {
        DOM.counter.textContent = `${currentSlide + 1} / ${total}`;
    }
}


// ═══════════════════════════════════════════════════════
//  SSE STREAMING GENERATION
// ═══════════════════════════════════════════════════════
async function handleGenerate() {
    const narrative = DOM.input.value.trim() || DOM.input.placeholder;
    const style = DOM.style.value;

    // UI state: loading
    DOM.btn.disabled = true;
    DOM.btn.innerHTML = `
        <svg style="width:18px;height:18px;animation:spin 1s linear infinite" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"></path>
        </svg>
        Generating...
    `;

    // Hide features, show storyboard
    if (DOM.features) DOM.features.style.display = 'none';
    DOM.wrapper.style.display = 'flex';
    DOM.wrapper.style.flexDirection = 'column';
    DOM.container.innerHTML = '';
    DOM.download.style.display = 'none';
    cachedScenes = [];
    currentSlide = 0;

    try {
        const res = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ narrative, style })
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop();

            for (const chunk of chunks) {
                if (!chunk.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(chunk.slice(6));

                    if (data.type === 'planning') {
                        renderSkeletons(data.total);
                    } else if (data.type === 'scene') {
                        renderScene(data);
                    } else if (data.type === 'done') {
                        DOM.download.style.display = 'flex';
                    } else if (data.type === 'error') {
                        showError(data.msg || 'Generation failed');
                    }
                } catch (parseErr) {
                    console.warn('SSE parse error:', parseErr);
                }
            }
        }
    } catch (e) {
        console.error('Stream error:', e);
        showError('Connection lost. Please try again.');
    } finally {
        DOM.btn.disabled = false;
        DOM.btn.innerHTML = `
            <svg style="width:18px;height:18px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Generate Storyboard
        `;
    }
}

function showError(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'padding:2rem;text-align:center;color:var(--text-secondary);font-size:0.9rem';
    el.textContent = `⚠ ${msg}`;
    DOM.container.appendChild(el);
}


// ═══════════════════════════════════════════════════════
//  SKELETON & SCENE RENDERING
// ═══════════════════════════════════════════════════════
function renderSkeletons(count) {
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'skeleton-card skeleton';
        card.id = `scene-slot-${i}`;
        card.style.cssText = `
            scroll-snap-align: center;
            flex-shrink: 0;
            width: min(85vw, 960px);
            height: 480px;
            border-radius: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 1rem;
        `;
        card.innerHTML = `
            <svg style="width:32px;height:32px;color:var(--text-muted);animation:spin 1.5s linear infinite" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.2"></circle>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.6"></path>
            </svg>
            <span style="font-size:0.8rem;font-weight:500;letter-spacing:0.05em" class="text-muted">Synthesizing Scene ${i + 1}...</span>
        `;
        DOM.container.appendChild(card);
    }
    updateCounter();
}

function renderScene(data) {
    cachedScenes[data.index] = data;

    const el = document.getElementById(`scene-slot-${data.index}`);
    if (!el) return;

    el.className = 'scene-card animate-fade-slide';
    el.style.cssText = `
        scroll-snap-align: center;
        flex-shrink: 0;
        width: min(85vw, 960px);
        height: 480px;
        display: flex;
        flex-direction: row;
    `;

    el.innerHTML = `
        <!-- Image Panel -->
        <div style="width:60%;height:100%;position:relative;overflow:hidden;background:#000">
            <img
                src="${data.image_url}"
                alt="${data.scene_title}"
                style="width:100%;height:100%;object-fit:cover;transition:transform 0.8s cubic-bezier(0.4,0,0.2,1);opacity:0"
                onload="this.style.opacity='1'"
                onmouseover="this.style.transform='scale(1.05)'"
                onmouseout="this.style.transform='scale(1)'"
            />
            <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 45%)"></div>
            <div style="position:absolute;bottom:1.25rem;left:1.25rem;display:flex;gap:0.5rem;align-items:center">
                <span class="scene-badge">Scene ${data.index + 1}</span>
            </div>
        </div>

        <!-- Content Panel -->
        <div style="width:40%;height:100%;padding:2rem;display:flex;flex-direction:column;justify-content:center;gap:1.5rem;overflow-y:auto;background:var(--bg-elevated);transition:var(--theme-transition)">
            <h3 style="font-size:1.5rem;font-weight:800;line-height:1.2;letter-spacing:-0.02em" class="text-primary">
                ${data.scene_title}
            </h3>

            <div class="notes-block">
                <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.625rem">
                    <svg style="width:14px;height:14px;color:var(--brand-400)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                    </svg>
                    <span style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase" class="gradient-text">Presenter Script</span>
                </div>
                <p style="font-size:0.875rem;line-height:1.7;font-style:italic" class="text-secondary">
                    "${data.speaker_notes}"
                </p>
            </div>
        </div>
    `;

    // Auto-scroll to this new scene
    currentSlide = data.index;
    scrollToSlide(data.index);
    updateCounter();
}


// ═══════════════════════════════════════════════════════
//  PDF EXPORT
// ═══════════════════════════════════════════════════════
async function handleExport() {
    if (!cachedScenes.filter(Boolean).length) return;

    DOM.overlay.style.display = 'flex';

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pW = pdf.internal.pageSize.width;
        const pH = pdf.internal.pageSize.height;

        for (let i = 0; i < cachedScenes.length; i++) {
            if (!cachedScenes[i]) continue;
            if (i > 0) pdf.addPage();
            const s = cachedScenes[i];

            // Background
            pdf.setFillColor(9, 9, 11);
            pdf.rect(0, 0, pW, pH, 'F');

            // Image
            try {
                const img = await new Promise((resolve, reject) => {
                    const el = new Image();
                    el.crossOrigin = 'anonymous';
                    el.onload = () => resolve(el);
                    el.onerror = reject;
                    el.src = s.image_url;
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/jpeg', 0.85);

                const maxH = pH * 0.58;
                const maxW = pW - 40;
                const ratio = Math.min(maxW / img.width, maxH / img.height);
                const w = img.width * ratio;
                const h = img.height * ratio;
                pdf.addImage(imgData, 'JPEG', (pW - w) / 2, 12, w, h);

                // Title
                let y = 12 + h + 12;
                pdf.setTextColor(250, 250, 250);
                pdf.setFontSize(20);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Scene ${i + 1}: ${s.scene_title}`, 20, y);

                // Notes
                pdf.setDrawColor(99, 102, 241);
                pdf.setLineWidth(0.8);
                pdf.line(20, y + 6, 20, y + 28);

                pdf.setTextColor(161, 161, 170);
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(12);
                const lines = pdf.splitTextToSize(`"${s.speaker_notes}"`, pW - 50);
                pdf.text(lines, 25, y + 12);
            } catch {
                pdf.setTextColor(200, 100, 100);
                pdf.text(`[Image unavailable for Scene ${i + 1}]`, 20, 40);
            }
        }

        pdf.save('Pitch_Visualizer_Pro_Export.pdf');
    } catch (err) {
        console.error('PDF export error:', err);
        alert('Export failed. See console for details.');
    } finally {
        DOM.overlay.style.display = 'none';
    }
}


// ═══════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Loader dismiss
    setTimeout(() => {
        const loader = document.getElementById('warming-up-overlay');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.visibility = 'hidden';
                loader.remove();
            }, 800);
        }
    }, 2200);
});

// Keyboard nav
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') DOM.prev.click();
    if (e.key === 'ArrowRight') DOM.next.click();
});

// Bind handlers
DOM.btn.addEventListener('click', handleGenerate);
DOM.download.addEventListener('click', handleExport);

// ═══════════════════════════════════════════════════════
//  ARCHITECTURE MODAL
// ═══════════════════════════════════════════════════════

if (DOM.archBtn) {
    DOM.archBtn.addEventListener('click', () => {
        DOM.archModal.style.display = 'flex';
    });

    DOM.closeArch.addEventListener('click', () => DOM.archModal.style.display = 'none');

    DOM.archModal.addEventListener('click', (e) => {
        if (e.target === DOM.archModal) DOM.archModal.style.display = 'none';
    });
}
