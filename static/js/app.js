/** static/js/app.js */
const DOM = {
    input: document.getElementById('narrative-input'),
    style: document.getElementById('style-select'),
    btn: document.getElementById('generate-btn'),
    wrapper: document.getElementById('storyboard-wrapper'),
    container: document.getElementById('scroll-container'),
    next: document.getElementById('next-btn'),
    prev: document.getElementById('prev-btn'),
    download: document.getElementById('download-btn'),
    overlay: document.getElementById('pdf-overlay')
};

let cachedScenes = [];

// Initialize Scroll Controls
DOM.prev.onclick = () => DOM.container.scrollBy({ left: -800, behavior: 'smooth' });
DOM.next.onclick = () => DOM.container.scrollBy({ left: 800, behavior: 'smooth' });

async function handleGenerate() {
    const narrative = DOM.input.value.trim() || DOM.input.placeholder;
    const style = DOM.style.value;

    DOM.btn.disabled = true;
    DOM.btn.innerHTML = `<span class="animate-spin mr-2">◌</span> Preparing AI...`;
    
    // UI Reset
    DOM.wrapper.classList.remove('hidden');
    DOM.container.innerHTML = '';
    cachedScenes = [];

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ narrative, style })
        });

        const reader = response.body.getReader();
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
                const data = JSON.parse(chunk.slice(6));
                
                if (data.type === 'planning') {
                    renderSkeletons(data.total);
                } else if (data.type === 'scene') {
                    renderScene(data);
                } else if (data.type === 'done') {
                    DOM.download.classList.remove('hidden');
                }
            }
        }
    } catch (e) {
        console.error(e);
        alert("Generation failed. Check console.");
    } finally {
        DOM.btn.disabled = false;
        DOM.btn.innerText = "Generate Storyboard";
    }
}

function renderSkeletons(count) {
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = "snap-center shrink-0 w-[85vw] lg:w-[1000px] h-[500px] glass rounded-3xl overflow-hidden flex flex-col md:flex-row skeleton";
        div.id = `panic-scene-${i}`;
        DOM.container.appendChild(div);
    }
}

function renderScene(data) {
    cachedScenes[data.index] = data;
    const el = document.getElementById(`panic-scene-${data.index}`);
    if (!el) return;

    el.classList.remove('skeleton');
    el.innerHTML = `
        <div class="w-full md:w-[60%] h-full relative group bg-black/40">
            <img src="${data.image_url}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div class="absolute bottom-6 left-6 flex gap-2">
                <span class="bg-indigo-600 text-[10px] font-bold px-2 py-1 rounded">SCENE ${data.index + 1}</span>
            </div>
        </div>
        <div class="w-full md:w-[40%] p-8 flex flex-col justify-center gap-6 overflow-y-auto">
            <h3 class="text-2xl font-bold text-white">${data.scene_title}</h3>
            <div class="p-4 bg-white/5 rounded-xl border-l-2 border-indigo-500">
                <p class="text-sm text-slate-400 italic leading-relaxed">"${data.speaker_notes}"</p>
            </div>
        </div>
    `;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// PDF Logic using standard high-res draw
DOM.download.onclick = async () => {
    DOM.overlay.classList.remove('hidden');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4');
    const [pW, pH] = [pdf.internal.pageSize.width, pdf.internal.pageSize.height];

    for (let i = 0; i < cachedScenes.length; i++) {
        if (i > 0) pdf.addPage();
        const s = cachedScenes[i];
        
        pdf.setFillColor(3, 7, 18);
        pdf.rect(0,0,pW,pH,'F');

        const img = await new Promise(r => {
            const i = new Image(); i.crossOrigin="anonymous"; i.onload=()=>r(i); i.src=s.image_url;
        });

        const canvas = document.createElement('canvas');
        canvas.width=img.width; canvas.height=img.height;
        canvas.getContext('2d').drawImage(img,0,0);
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 20, 10, pW-40, pH*0.6);

        pdf.setTextColor(255);
        pdf.setFontSize(20);
        pdf.text(s.scene_title, 20, pH*0.75);
        pdf.setFontSize(12);
        const split = pdf.splitTextToSize(`Script: ${s.speaker_notes}`, pW-40);
        pdf.text(split, 20, pH*0.85);
    }
    pdf.save('Pitch_Visualizer_Export.pdf');
    DOM.overlay.classList.add('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    // Reveal app after delay for "warm up" effect
    setTimeout(() => {
        const loader = document.getElementById('warming-up-overlay');
        loader.style.opacity = '0';
        setTimeout(() => loader.style.visibility = 'hidden', 1000);
    }, 2500);
});

DOM.btn.onclick = handleGenerate;
