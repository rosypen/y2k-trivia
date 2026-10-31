/* =====================================================================
   RESULTS SCREEN ✧ Frutiger Aero edition
   - Results.show(players, opts)        → big-screen (host) reveal show
   - Results.showPlayer(opts)           → per-player reveal on phones
   - Results.REVEAL_MS                  → how long the host show takes
   Sounds are synthesized with the Web Audio API (no audio files).
   All player-provided text is inserted with textContent (never innerHTML).
   ===================================================================== */
(function () {
    'use strict';

    const IMG = 'img/results/';

    // Host reveal timeline (ms from start)
    const T = {
        title: 200,
        drum1: 1400,
        third: 3000,
        second: 4600,
        drum2: 6000,
        first: 8300,
        losers: 10800,
    };
    const REVEAL_MS = T.losers + 300;

    const ROASTS = [
        'Moved to the Recycle Bin 🗑️',
        '404: trivia skills not found',
        'Have you tried turning your brain off and on again?',
        'Error: winning.exe has stopped working',
        'Loading talent… ▓▓░░░░░░ 23%',
        "It's giving dial-up",
        'Please insert Disk 2 to continue',
        'Your answers were too ahead of their time',
        'Low battery. Please charge your brain 🔋',
    ];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // -----------------------------------------------------------------
    // SOUND ✧ tiny Web Audio synth
    // -----------------------------------------------------------------
    const Sfx = (() => {
        let ctx = null;
        let master = null;
        let noiseBuf = null;
        let muted = false;
        try { muted = localStorage.getItem('y2k-results-muted') === '1'; } catch (e) { /* private mode */ }

        function ensure() {
            if (!ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                ctx = new AC();
                newMaster();
                noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
                const d = noiseBuf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }
        function newMaster() {
            const comp = ctx.createDynamicsCompressor();
            comp.connect(ctx.destination);
            master = ctx.createGain();
            master.gain.value = muted ? 0 : 0.7;
            master.connect(comp);
        }
        // Cut everything currently scheduled (used by skip / replay)
        function stopAll() {
            if (!ctx || !master) return;
            const old = master;
            old.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
            setTimeout(() => old.disconnect(), 300);
            newMaster();
        }
        function setMuted(m) {
            muted = m;
            try { localStorage.setItem('y2k-results-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
            if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05);
        }

        // Browsers only allow audio after a user gesture: unlock on first tap/click.
        const unlock = () => ensure();
        window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
        window.addEventListener('keydown', unlock, { capture: true, passive: true });

        function tone(freq, at, dur, o = {}) {
            const c = ensure(); if (!c) return;
            const t0 = c.currentTime + at;
            const osc = c.createOscillator();
            const g = c.createGain();
            osc.type = o.type || 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t0 + (o.glideTime || dur));
            if (o.detune) osc.detune.value = o.detune;
            let node = osc;
            if (o.lowpass) {
                const f = c.createBiquadFilter();
                f.type = 'lowpass'; f.frequency.value = o.lowpass; f.Q.value = o.q || 0.7;
                osc.connect(f); node = f;
            }
            if (o.vibrato) {
                const lfo = c.createOscillator(); const lg = c.createGain();
                lfo.frequency.value = o.vibrato.rate; lg.gain.value = o.vibrato.depth;
                lfo.connect(lg); lg.connect(osc.frequency);
                lfo.start(t0 + (o.vibrato.delay || 0)); lfo.stop(t0 + dur + 0.1);
            }
            const peak = o.gain ?? 0.3;
            const a = o.attack ?? 0.01;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(peak, t0 + a);
            // hold until the release starts (never before the attack has finished)
            if (o.sustain) g.gain.setValueAtTime(peak, Math.max(t0 + a, t0 + dur - (o.release ?? 0.2)));
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            node.connect(g); g.connect(master);
            osc.start(t0); osc.stop(t0 + dur + 0.05);
        }

        function noise(at, dur, o = {}) {
            const c = ensure(); if (!c) return;
            const t0 = c.currentTime + at;
            const src = c.createBufferSource();
            src.buffer = noiseBuf; src.loop = true;
            const f = c.createBiquadFilter();
            f.type = o.filter || 'bandpass';
            f.frequency.setValueAtTime(o.freq || 1800, t0);
            if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, t0 + dur);
            f.Q.value = o.q ?? 0.8;
            const g = c.createGain();
            const peak = o.gain ?? 0.3;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack ?? 0.003));
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            src.connect(f); f.connect(g); g.connect(master);
            src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
        }

        const N = { C4: 261.63, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, Fs5: 739.99, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.5, G6: 1567.98 };

        return {
            unlock: ensure, stopAll, setMuted,
            get muted() { return muted; },

            whoosh() { noise(0, 0.7, { freq: 300, sweepTo: 4000, q: 1.2, gain: 0.25, attack: 0.25 }); },

            drumroll(dur = 1.6) {
                let t = 0;
                while (t < dur) {
                    const p = t / dur;
                    noise(t, 0.07, { freq: 1700 + p * 600, q: 0.7, gain: 0.08 + p * 0.32 });
                    if (Math.random() < 0.35) tone(95 + Math.random() * 20, t, 0.12, { gain: 0.08 + p * 0.15 });
                    t += 0.085 - p * 0.05;
                }
            },

            cymbal(at = 0) {
                noise(at, 1.8, { filter: 'highpass', freq: 5500, q: 0.4, gain: 0.35 });
                noise(at, 0.5, { freq: 3000, q: 0.5, gain: 0.25 });
                tone(70, at, 0.35, { gain: 0.5, glideTo: 40 });
            },

            // Glassy "Aero" bell arpeggio
            chime(level = 3) {
                const sets = { 3: [N.C5, N.E5, N.G5], 2: [N.D5, N.Fs5, N.A5, N.D6], 1: [N.C5, N.E5, N.G5, N.C6, N.E6] };
                (sets[level] || sets[3]).forEach((f, i) => {
                    const at = i * 0.09;
                    tone(f, at, 1.4, { gain: 0.22 });
                    tone(f * 2.01, at, 0.8, { gain: 0.06 });
                    tone(f * 3.98, at, 0.4, { gain: 0.025 });
                });
            },

            fanfare(at = 0) {
                const brass = (f, s, d, g = 0.16) => {
                    tone(f, at + s, d, { type: 'sawtooth', lowpass: 2400, gain: g, attack: 0.03, sustain: true, release: 0.15, vibrato: { rate: 5.5, depth: 4, delay: 0.15 } });
                    tone(f, at + s, d, { type: 'square', lowpass: 1600, gain: g * 0.35, attack: 0.03, detune: 6, sustain: true });
                };
                // ta-ta-ta TAAAA
                brass(N.G4, 0.00, 0.14); brass(N.G4, 0.16, 0.14); brass(N.G4, 0.32, 0.14);
                brass(N.C5, 0.48, 0.5);
                brass(N.A4, 1.00, 0.18); brass(N.B4, 1.18, 0.18);
                // big chord
                [N.C5, N.E5, N.G5, N.C6].forEach(f => brass(f, 1.38, 1.6, 0.11));
                // sparkly glissando on top
                [N.C6, N.D6, N.E6, N.G6, N.C6 * 2].forEach((f, i) => tone(f, at + 1.4 + i * 0.06, 0.6, { gain: 0.06 }));
            },

            pop(at = 0) {
                const f = 380 + Math.random() * 300;
                tone(f, at, 0.09, { gain: 0.45, glideTo: f * 3, glideTime: 0.07 });
            },

            sparkle(at = 0) {
                [N.E6, N.G6, N.C6 * 2, N.E6 * 2].forEach((f, i) => tone(f, at + i * 0.07, 0.5, { gain: 0.05 }));
            },

            // wah wah wah waaaah
            sadTrombone(at = 0) {
                const notes = [[N.G4, 0, 0.42], [N.Fs4, 0.46, 0.42], [N.F4, 0.92, 0.42], [N.E4, 1.38, 1.5]];
                notes.forEach(([f, s, d], i) => {
                    const last = i === notes.length - 1;
                    tone(f / 2, at + s, d, {
                        type: 'sawtooth', lowpass: 900, q: 2, gain: 0.22, attack: 0.05, sustain: true, release: 0.2,
                        glideTo: f / 2 * (last ? 0.94 : 0.985), glideTime: d,
                        vibrato: last ? { rate: 6, depth: 6, delay: 0.25 } : undefined,
                    });
                });
            },

            crumple() {
                for (let i = 0; i < 9; i++) {
                    noise(i * 0.045 + Math.random() * 0.03, 0.05, { freq: 900 + Math.random() * 3000, q: 1.5, gain: 0.18 });
                }
                tone(160, 0.45, 0.25, { gain: 0.3, glideTo: 60 });
            },
        };
    })();

    // -----------------------------------------------------------------
    // FX ✧ canvas confetti / sparkles / bubble bursts
    // -----------------------------------------------------------------
    const AERO = ['#3fb6ff', '#7be13a', '#ffd23f', '#ff7ab8', '#ffffff', '#2fd0ff', '#b7ff6a'];
    const GOLD = ['#ffd84a', '#fff3a8', '#f5b400', '#ffffff', '#3fb6ff', '#7be13a'];
    const SILVER = ['#ffffff', '#dfe9f2', '#b8c7d6', '#3fb6ff'];
    const BRONZE = ['#ffd9b0', '#f0a060', '#db7d33', '#ffffff', '#7be13a'];

    function createFx(canvas) {
        const g = canvas.getContext('2d');
        const parts = [];
        let raf = null, w = 0, h = 0, dpr = 1, rainUntil = 0, rainPalette = AERO;

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = canvas.clientWidth; h = canvas.clientHeight;
            canvas.width = w * dpr; canvas.height = h * dpr;
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);

        function add(p) { parts.push(p); if (!raf) raf = requestAnimationFrame(loop); }

        function confetti(x, y, n, palette = AERO, power = 1) {
            for (let i = 0; i < n; i++) {
                const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
                const sp = (6 + Math.random() * 10) * power;
                add({
                    kind: Math.random() < 0.25 ? 'dot' : 'rect',
                    x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
                    w: 7 + Math.random() * 8, h: 4 + Math.random() * 5,
                    rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
                    color: pick(palette), life: 1, decay: 0.004 + Math.random() * 0.004,
                    flip: Math.random() * Math.PI,
                });
            }
        }
        function sparkles(x, y, n, spread = 120) {
            for (let i = 0; i < n; i++) {
                add({
                    kind: 'star', x: x + (Math.random() - 0.5) * spread * 2, y: y + (Math.random() - 0.5) * spread,
                    vx: 0, vy: -0.3 - Math.random() * 0.6, size: 6 + Math.random() * 12,
                    life: 1, decay: 0.012 + Math.random() * 0.012, phase: Math.random() * 6,
                });
            }
        }
        function bubbles(x, y, n) {
            for (let i = 0; i < n; i++) {
                add({
                    kind: 'bubble', x: x + (Math.random() - 0.5) * 160, y: y + Math.random() * 40,
                    vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 4, r: 6 + Math.random() * 22,
                    life: 1, decay: 0.004 + Math.random() * 0.004, phase: Math.random() * 6,
                });
            }
        }
        function rain(ms, palette = AERO) { rainUntil = performance.now() + ms; rainPalette = palette; if (!raf) raf = requestAnimationFrame(loop); }

        function star(x, y, r) {
            g.beginPath();
            for (let i = 0; i < 8; i++) {
                const rr = i % 2 ? r * 0.28 : r;
                const a = (i / 8) * Math.PI * 2;
                g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
            }
            g.closePath(); g.fill();
        }

        function loop(now) {
            g.clearRect(0, 0, w, h);
            if (now < rainUntil && Math.random() < 0.6) {
                add({
                    kind: 'rect', x: Math.random() * w, y: -20, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
                    w: 7 + Math.random() * 7, h: 4 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
                    color: pick(rainPalette), life: 1, decay: 0.002, flip: Math.random() * 6,
                });
            }
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.life -= p.decay;
                if (p.life <= 0 || p.y > h + 40 || p.y < -200) { parts.splice(i, 1); continue; }
                g.globalAlpha = Math.min(1, p.life * 2);
                if (p.kind === 'rect' || p.kind === 'dot') {
                    p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985;
                    p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.flip += 0.15;
                    g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
                    g.fillStyle = p.color;
                    if (p.kind === 'dot') { g.beginPath(); g.arc(0, 0, p.h, 0, Math.PI * 2); g.fill(); }
                    else {
                        const sy = Math.abs(Math.cos(p.flip));
                        g.fillRect(-p.w / 2, -p.h / 2 * sy, p.w, p.h * sy);
                        g.fillStyle = 'rgba(255,255,255,0.55)';
                        g.fillRect(-p.w / 2, -p.h / 2 * sy, p.w, p.h * sy * 0.35);
                    }
                    g.restore();
                } else if (p.kind === 'star') {
                    p.y += p.vy; p.phase += 0.2;
                    g.fillStyle = '#fff';
                    g.shadowColor = '#fff6b0'; g.shadowBlur = 12;
                    star(p.x, p.y, p.size * (0.6 + 0.4 * Math.sin(p.phase)));
                    g.shadowBlur = 0;
                } else if (p.kind === 'bubble') {
                    p.vy *= 0.99; p.phase += 0.08;
                    p.x += p.vx + Math.sin(p.phase) * 0.6; p.y += p.vy;
                    const grd = g.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.4, p.r * 0.05, p.x, p.y, p.r);
                    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
                    grd.addColorStop(0.2, 'rgba(255,255,255,0.15)');
                    grd.addColorStop(0.85, 'rgba(140,220,255,0.25)');
                    grd.addColorStop(1, 'rgba(255,255,255,0.8)');
                    g.fillStyle = grd;
                    g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
                }
            }
            g.globalAlpha = 1;
            raf = (parts.length || now < rainUntil) ? requestAnimationFrame(loop) : null;
        }

        return {
            confetti, sparkles, bubbles, rain,
            destroy() { window.removeEventListener('resize', resize); if (raf) cancelAnimationFrame(raf); parts.length = 0; },
        };
    }

    // -----------------------------------------------------------------
    // DOM helpers
    // -----------------------------------------------------------------
    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }
    function img(name, cls) {
        const i = el('img', cls);
        i.src = IMG + name;
        i.alt = '';
        i.draggable = false;
        return i;
    }
    const initial = name => (Array.from((name || '?').trim())[0] || '?').toUpperCase();
    const fmt = n => `${Number(n || 0).toLocaleString()} pts`;

    // Sort by score (desc), then name so the order is stable
    function rankPlayers(players) {
        const arr = Array.isArray(players)
            ? players.slice()
            : Object.keys(players || {}).map(id => ({ id, ...players[id] }));
        arr.forEach(p => { p.score = Number(p.score) || 0; p.name = String(p.name ?? '???'); });
        arr.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        arr.forEach((p, i) => {
            p.position = i + 1;
            p.tied = arr.some(q => q !== p && q.score === p.score);
        });
        return arr;
    }

    // The shared Frutiger Aero backdrop
    function buildScene(root) {
        root.appendChild(el('div', 'rz-sky'));
        root.appendChild(el('div', 'rz-rays'));
        root.appendChild(el('div', 'rz-sun'));
        root.appendChild(el('div', 'rz-aurora rz-a1'));
        root.appendChild(el('div', 'rz-aurora rz-a2'));
        const bubbles = el('div', 'rz-bubbles');
        for (let i = 0; i < 26; i++) {
            const b = el('span', 'rz-bubble');
            const s = 14 + Math.random() * 70;
            b.style.setProperty('--x', `${Math.random() * 100}%`);
            b.style.setProperty('--s', `${s}px`);
            b.style.setProperty('--d', `${9 + Math.random() * 12}s`);
            b.style.setProperty('--delay', `${-Math.random() * 20}s`);
            bubbles.appendChild(b);
        }
        root.appendChild(bubbles);
        root.appendChild(img('fish.svg', 'rz-fish rz-f1'));
        root.appendChild(img('fish.svg', 'rz-fish rz-f2'));
        root.appendChild(img('hills.svg', 'rz-hills'));
        const canvas = el('canvas', 'rz-fx');
        root.appendChild(canvas);
        return canvas;
    }

    // -----------------------------------------------------------------
    // HOST ✧ the big-screen show
    // -----------------------------------------------------------------
    let host = null; // { root, fx, timers, players, opts }

    function clearTimers() {
        if (host) host.timers.forEach(clearTimeout);
        if (host) host.timers = [];
    }
    function at(ms, fn) { host.timers.push(setTimeout(fn, ms)); }

    function buildPlace(p, pos) {
        const place = el('div', `rz-place rz-p${pos}`);
        if (!p) { place.classList.add('rz-empty'); place.appendChild(el('div', 'rz-block')); return place; }
        if (pos === 1) place.appendChild(img('crown.svg', 'rz-crown'));
        const card = el('div', 'rz-card rz-glass');
        const orb = el('div', 'rz-orb', initial(p.name));
        card.appendChild(orb);
        card.appendChild(el('div', 'rz-name', p.name));
        card.appendChild(el('div', 'rz-score', fmt(p.score)));
        if (p.tied) card.appendChild(el('div', 'rz-tie', 'tied on points!'));
        place.appendChild(card);
        const block = el('div', 'rz-block');
        block.appendChild(el('div', 'rz-num', String(pos)));
        if (pos === 1) block.appendChild(img('trophy.svg', 'rz-trophy'));
        place.appendChild(block);
        return place;
    }

    function show(players, opts = {}) {
        hide();
        const ranked = rankPlayers(players);
        const [p1, p2, p3] = ranked;
        const losers = ranked.slice(3);

        const root = el('div', 'rz-root rz-host');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', 'Results');
        const canvas = buildScene(root);

        const stage = el('div', 'rz-stage');
        const title = el('h1', 'rz-title');
        title.setAttribute('aria-label', 'Results');
        Array.from('RESULTS').forEach((ch, i) => {
            const s = el('span', null, ch);
            s.style.setProperty('--i', i);
            s.setAttribute('aria-hidden', 'true');
            title.appendChild(s);
        });
        stage.appendChild(title);
        const subtitle = el('p', 'rz-subtitle', ranked.length ? 'And the top three are…' : 'Nobody played?! 🫧');
        stage.appendChild(subtitle);

        // podium order: 2 · 1 · 3
        const podium = el('div', 'rz-podium');
        const places = { 2: buildPlace(p2, 2), 1: buildPlace(p1, 1), 3: buildPlace(p3, 3) };
        podium.append(places[2], places[1], places[3]);
        stage.appendChild(podium);

        // Recycle Bin of losers
        const losersBox = el('div', 'rz-losers rz-glass' + (losers.length > 8 ? ' rz-many' : ''));
        const head = el('div', 'rz-losers-head');
        const bin = img('recycle-bin.svg', 'rz-bin');
        head.appendChild(bin);
        const titles = el('div');
        titles.appendChild(el('div', 'rz-losers-title', losers.length ? 'LOSERS' : 'NO LOSERS'));
        titles.appendChild(el('div', 'rz-losers-sub', losers.length ? pick(ROASTS) : 'Everyone made the podium ✨'));
        head.appendChild(titles);
        head.appendChild(el('div', 'rz-spacer'));
        const emptyBtn = el('button', 'rz-btn rz-grey rz-small', '🗑️ Empty Recycle Bin');
        emptyBtn.type = 'button';
        if (!losers.length) emptyBtn.style.display = 'none';
        head.appendChild(emptyBtn);
        losersBox.appendChild(head);
        const list = el('div', 'rz-loser-list');
        losers.forEach((p, i) => {
            const chip = el('div', 'rz-loser');
            chip.style.setProperty('--i', i);
            chip.appendChild(el('span', 'rz-mini', initial(p.name)));
            chip.appendChild(el('span', 'rz-rank', `#${p.position}`));
            chip.appendChild(el('span', null, p.name));
            chip.appendChild(el('span', 'rz-pts', fmt(p.score)));
            list.appendChild(chip);
        });
        if (!losers.length) list.appendChild(el('div', 'rz-empty-msg', 'The Recycle Bin is empty 🫧'));
        losersBox.appendChild(list);
        if (losers.length || ranked.length) stage.appendChild(losersBox);
        root.appendChild(stage);

        // Controls
        const controls = el('div', 'rz-controls rz-glass');
        const soundLabel = () => (Sfx.muted ? '🔇 Off' : '🔊 On');
        const soundBtn = el('button', 'rz-btn rz-grey', soundLabel());
        soundBtn.type = 'button';
        soundBtn.title = 'Sound on/off';
        const skipBtn = el('button', 'rz-btn rz-grey', '⏭ Skip');
        skipBtn.type = 'button';
        const replayBtn = el('button', 'rz-btn', '↻ Replay');
        replayBtn.type = 'button';
        const newBtn = el('button', 'rz-btn rz-green', '✧ New Game');
        newBtn.type = 'button';
        controls.append(soundBtn, skipBtn, replayBtn, newBtn);
        root.appendChild(controls);

        document.body.appendChild(root);
        const fx = createFx(canvas);
        host = { root, fx, timers: [], players, opts, places, list, bin, subtitle, skipBtn, losers, p1, done: false };

        soundBtn.onclick = () => { Sfx.setMuted(!Sfx.muted); soundBtn.textContent = soundLabel(); };
        skipBtn.onclick = () => skip();
        replayBtn.onclick = () => { Sfx.stopAll(); show(players, { ...opts, replay: true }); };
        newBtn.onclick = () => (opts.onNewGame ? opts.onNewGame() : location.reload());
        emptyBtn.onclick = () => emptyRecycleBin(emptyBtn);

        if (opts.instant) { skip(true); return; }
        runTimeline();
    }

    function centerOf(node) {
        const r = node.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top };
    }

    function revealPlace(pos, quiet) {
        const place = host.places[pos];
        if (!place || place.classList.contains('rz-empty')) return;
        place.classList.add('rz-in');
        if (pos === 1) place.classList.add('rz-crowned');
        if (quiet) return;
        const palette = pos === 1 ? GOLD : pos === 2 ? SILVER : BRONZE;
        host.timers.push(setTimeout(() => {
            const c = centerOf(place.querySelector('.rz-card') || place);
            host.fx.confetti(c.x, c.top + 40, pos === 1 ? 160 : 70, palette, pos === 1 ? 1.25 : 0.9);
            host.fx.sparkles(c.x, c.top + 60, pos === 1 ? 24 : 10);
            if (pos === 1) host.fx.bubbles(c.x, c.y + 120, 26);
        }, 450));
    }

    function runTimeline() {
        const r = host.root;
        const has = pos => host.places[pos] && !host.places[pos].classList.contains('rz-empty');
        Sfx.whoosh();
        at(T.title, () => r.classList.add('rz-s-title'));
        at(T.drum1, () => { r.classList.add('rz-drumroll'); if (has(3) || has(2)) Sfx.drumroll(1.55); });
        at(T.third, () => { if (has(3)) { Sfx.cymbal(); Sfx.chime(3); revealPlace(3); } });
        at(T.second, () => { if (has(2)) { Sfx.chime(2); revealPlace(2); } });
        at(T.drum2, () => {
            if (!has(1)) return;
            host.subtitle.textContent = 'And the champion is…';
            Sfx.drumroll(2.25);
        });
        at(T.first, () => {
            r.classList.remove('rz-drumroll');
            if (!has(1)) return;
            Sfx.cymbal(); Sfx.fanfare(0.05);
            revealPlace(1);
            r.classList.add('rz-winner-revealed');
            host.subtitle.textContent = `👑 ${host.p1.name} takes the crown!`;
            host.fx.rain(4500, GOLD);
        });
        at(T.losers, () => {
            r.classList.add('rz-s-losers');
            if (host.losers.length) {
                Sfx.sadTrombone(0.2);
                host.losers.slice(0, 14).forEach((_, i) => Sfx.pop(0.5 + i * 0.16));
            } else {
                Sfx.sparkle(0.2);
            }
        });
        at(REVEAL_MS + 2500, () => { host.done = true; host.skipBtn.style.display = 'none'; });
    }

    // Jump straight to the final state (also tells phones to reveal now)
    function skip(silent) {
        if (!host) return;
        clearTimers();
        Sfx.stopAll();
        const r = host.root;
        r.classList.add('rz-done', 'rz-s-title', 'rz-s-losers', 'rz-winner-revealed');
        r.classList.remove('rz-drumroll');
        [3, 2, 1].forEach(pos => revealPlace(pos, true));
        if (host.p1) host.subtitle.textContent = `👑 ${host.p1.name} takes the crown!`;
        host.skipBtn.style.display = 'none';
        host.done = true;
        if (!silent) {
            const c = host.places[1] ? centerOf(host.places[1]) : { x: innerWidth / 2, top: innerHeight / 3 };
            host.fx.confetti(c.x, c.top + 40, 120, GOLD, 1.1);
            Sfx.chime(1);
        }
        if (host.opts.onSkip) host.opts.onSkip();
    }

    function emptyRecycleBin(btn) {
        const chips = Array.from(host.list.querySelectorAll('.rz-loser'));
        if (!chips.length) return;
        btn.disabled = true;
        const b = centerOf(host.bin);
        chips.forEach(chip => {
            const c = centerOf(chip);
            chip.style.setProperty('--tx', `${b.x - c.x}px`);
            chip.style.setProperty('--ty', `${b.y - c.y}px`);
            chip.classList.add('rz-trashed');
        });
        Sfx.crumple();
        host.timers.push(setTimeout(() => host.bin.classList.add('rz-gulp'), 500));
        host.timers.push(setTimeout(() => {
            host.list.textContent = '';
            host.list.appendChild(el('div', 'rz-empty-msg', 'Recycle Bin emptied. Losers permanently deleted 🫧'));
            btn.style.display = 'none';
            Sfx.sparkle();
        }, 600 + chips.length * 80 + 700));
    }

    function hide() {
        if (!host) return;
        clearTimers();
        host.fx.destroy();
        host.root.remove();
        host = null;
    }

    // -----------------------------------------------------------------
    // PLAYER ✧ the phone reveal
    // -----------------------------------------------------------------
    let player = null; // { root, fx, card, revealAt, revealed, timer, players }

    function showPlayer({ players, playerId, revealAt, now = () => Date.now() }) {
        if (!player) {
            const root = el('div', 'rz-root rz-player');
            const canvas = buildScene(root);
            const stage = el('div', 'rz-stage');
            root.appendChild(stage);
            document.body.appendChild(root);
            player = { root, stage, fx: createFx(canvas), revealAt: null, revealed: false, timer: null };
        }
        player.players = players;
        player.playerId = playerId;
        if (player.revealed) return;              // already showing the final placement
        if (player.revealAt === revealAt) return; // already counting down to this reveal

        player.revealAt = revealAt;
        clearTimeout(player.timer);
        const wait = Math.max(0, (revealAt || 0) - now());
        if (wait > 0) {
            setCard(drumCard());
            player.timer = setTimeout(revealPlayer, wait);
        } else {
            revealPlayer();
        }
    }

    function setCard(card) {
        player.stage.textContent = '';
        player.stage.appendChild(card);
    }

    function drumCard() {
        const card = el('div', 'rz-pcard rz-glass');
        card.appendChild(el('div', 'rz-drum', '🥁'));
        card.appendChild(el('h2', null, 'Drumroll…'));
        card.appendChild(el('p', null, 'Eyes on the big screen! 👀'));
        return card;
    }

    function revealPlayer() {
        player.revealed = true;
        const ranked = rankPlayers(player.players);
        const me = ranked.find(p => p.id === player.playerId);
        const card = el('div', 'rz-pcard rz-glass');
        const total = ranked.length;

        if (!me) {
            card.appendChild(el('h2', null, 'RESULTS'));
            card.appendChild(el('p', null, 'Check the big screen for the final standings ✨'));
            setCard(card);
            return;
        }

        const pos = me.position;
        if (pos === 1) {
            card.appendChild(img('crown.svg', 'rz-pimg'));
            card.appendChild(el('h2', null, 'WINNER!'));
            card.appendChild(el('p', null, `${me.name}, you're #1 👑`));
        } else if (pos <= 3) {
            const orb = el('div', `rz-orb`, String(pos));
            const colors = pos === 2 ? ['#ffffff', '#b8cadb', '#5f7389'] : ['#fff0e0', '#f09450', '#8d4512'];
            orb.style.setProperty('--o1', colors[0]); orb.style.setProperty('--o2', colors[1]); orb.style.setProperty('--o3', colors[2]);
            card.appendChild(orb);
            card.appendChild(el('h2', null, pos === 2 ? '2ND PLACE!' : '3RD PLACE!'));
            card.appendChild(el('p', null, pos === 2 ? 'So close you can taste it ✨' : 'Podium energy 💅'));
        } else {
            card.classList.add('rz-is-loser', 'rz-sag');
            card.appendChild(img('recycle-bin.svg', 'rz-pimg'));
            card.appendChild(el('h2', null, 'LOSER'));
            card.appendChild(el('p', null, pick(ROASTS)));
        }
        const score = el('div', 'rz-score', `#${pos} of ${total} · ${fmt(me.score)}`);
        card.appendChild(score);
        if (pos <= 3 && me.tied) card.appendChild(el('div', 'rz-tie', 'tied on points!'));
        setCard(card);

        // celebrate (or don't)
        setTimeout(() => {
            const w = innerWidth, h = innerHeight;
            if (pos === 1) {
                Sfx.cymbal(); Sfx.fanfare(0.05);
                player.fx.confetti(w / 2, h * 0.35, 140, GOLD, 1.1);
                player.fx.sparkles(w / 2, h * 0.3, 18);
                player.fx.rain(4000, GOLD);
            } else if (pos <= 3) {
                Sfx.chime(pos);
                player.fx.confetti(w / 2, h * 0.35, 70, pos === 2 ? SILVER : BRONZE, 0.9);
            } else {
                Sfx.sadTrombone(0.1);
            }
        }, 250);
    }

    function hidePlayer() {
        if (!player) return;
        clearTimeout(player.timer);
        player.fx.destroy();
        player.root.remove();
        player = null;
    }

    window.Results = { show, skip: () => skip(), hide, showPlayer, hidePlayer, rankPlayers, Sfx, REVEAL_MS };
})();
