(function(){
// Storage keys
const K_STUD = 'att_students_v1'
const K_REC = 'att_records_v1' // {date: {name: true}}
// Elements
const dateEl = document.getElementById('date')
const nameInput = document.getElementById('nameInput')
const addBtn = document.getElementById('addBtn')
const tbody = document.getElementById('tbody')
const stats = document.getElementById('stats')
const search = document.getElementById('search')
const markAllBtn = document.getElementById('markAll')
const clearDateBtn = document.getElementById('clearDate')
const clearAllBtn = document.getElementById('clearAll')
const exportCsvBtn = document.getElementById('exportCsv')
const importFile = document.getElementById('importFile')

// Utils
const today = () => new Date().toISOString().slice(0,10)
const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || def } catch(e){return def} }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))

// State
let students = load(K_STUD, [])
let records = load(K_REC, {})

// Initialize date picker
if (dateEl) dateEl.value = today()

// Render
function render(){
    const d = dateEl.value || today()
    const rec = records[d] || {}
    const q = (search.value || '').toLowerCase()
    tbody.innerHTML = ''
    students.forEach((name, idx) => {
        if (q && name.toLowerCase().indexOf(q) === -1) return
        const present = !!rec[name]
        const tr = document.createElement('tr')
        // name cell (editable)
        const tdName = document.createElement('td')
        tdName.className = 'name'
        const nameBtn = document.createElement('button')
        nameBtn.className = 'inline-edit'
        nameBtn.textContent = name
        nameBtn.title = 'Click to edit name'
        nameBtn.addEventListener('click', () => {
            const input = document.createElement('input')
            input.type = 'text'
            input.value = name
            input.style.minWidth = '200px'
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur()
            })
            input.addEventListener('blur', () => {
                const val = input.value.trim()
                if (val && val !== name) {
                    students[idx] = val
                    // update records: rename key in all dates
                    for (const dd in records) {
                        if (records[dd] && Object.prototype.hasOwnProperty.call(records[dd], name)) {
                            const v = records[dd][name]
                            delete records[dd][name]
                            records[dd][val] = v
                        }
                    }
                    save(K_STUD, students)
                    save(K_REC, records)
                }
                render()
            })
            tdName.replaceChild(input, nameBtn)
            input.focus()
            input.select()
        })
        tdName.appendChild(nameBtn)
        tr.appendChild(tdName)

        // present checkbox
        const tdPres = document.createElement('td')
        tdPres.className = 'present'
        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.checked = present
        cb.addEventListener('change', () => {
            if (!records[d]) records[d] = {}
            if (cb.checked) records[d][name] = true
            else delete records[d][name]
            save(K_REC, records)
            renderStats()
        })
        tdPres.appendChild(cb)
        tr.appendChild(tdPres)

        // actions
        const tdAct = document.createElement('td')
        tdAct.className = 'actions'
        const removeBtn = document.createElement('button')
        removeBtn.className = 'ghost small'
        removeBtn.textContent = 'Remove'
        removeBtn.addEventListener('click', () => {
            if (!confirm('Remove "'+name+'" from roster?')) return
            // remove from students and all records
            students.splice(idx,1)
            for (const dd in records) {
                if (records[dd] && Object.prototype.hasOwnProperty.call(records[dd], name)) {
                    delete records[dd][name]
                }
            }
            save(K_STUD, students)
            save(K_REC, records)
            render()
        })
        tdAct.appendChild(removeBtn)
        tr.appendChild(tdAct)
        tbody.appendChild(tr)
    })
    renderStats()
}

function renderStats(){
    const d = dateEl.value || today()
    const rec = records[d] || {}
    const total = students.length
    const present = Object.keys(rec).filter(n => rec[n]).length
    stats.textContent = `${present} present / ${total} total`
}

// Actions
function addStudent(name){
    name = (name || '').trim()
    if (!name) return
    if (students.includes(name)) {
        alert('Student already exists.')
        return
    }
    students.push(name)
    save(K_STUD, students)
    nameInput.value = ''
    render()
}

addBtn.addEventListener('click', ()=> addStudent(nameInput.value))
nameInput.addEventListener('keydown', (e)=> { if (e.key === 'Enter') addStudent(nameInput.value) })

dateEl.addEventListener('change', render)
search.addEventListener('input', render)

markAllBtn.addEventListener('click', () => {
    const d = dateEl.value || today()
    if (!records[d]) records[d] = {}
    students.forEach(s => records[d][s] = true)
    save(K_REC, records)
    render()
})

clearDateBtn.addEventListener('click', () => {
    const d = dateEl.value || today()
    if (!records[d] || Object.keys(records[d]).length === 0) { alert('No attendance recorded for this date.'); return; }
    if (!confirm('Clear attendance for ' + d + '?')) return
    delete records[d]
    save(K_REC, records)
    render()
})

clearAllBtn.addEventListener('click', () => {
    if (!confirm('This will remove all students and all attendance records. Continue?')) return
    localStorage.removeItem(K_STUD)
    localStorage.removeItem(K_REC)
    students = []
    records = {}
    render()
})

exportCsvBtn.addEventListener('click', () => {
    const d = dateEl.value || today()
    const rec = records[d] || {}
    const rows = [['Name','Present','Date']]
    students.forEach(name => rows.push([name, rec[name] ? '1' : '0', d]))
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""') }"`).join(',')).join('\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${d}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
})

importFile.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
        const text = reader.result
        try {
            // Simple CSV parser: expects header Name,Present,Date or Name,Present
            const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
            if (!lines.length) throw new Error('Empty file')
            const header = lines.shift().split(',').map(h => h.replace(/(^"|"$)/g,'').trim().toLowerCase())
            const idxName = header.findIndex(h=>h.includes('name'))
            const idxPres = header.findIndex(h=>h.includes('present'))
            const idxDate = header.findIndex(h=>h.includes('date'))
            if (idxName < 0) throw new Error('CSV must contain Name column')
            lines.forEach(line => {
                // naive split
                const cols = line.split(',').map(c=>c.replace(/(^"|"$)/g,'').trim())
                const name = cols[idxName]
                if (!name) return
                if (!students.includes(name)) students.push(name)
                const date = (idxDate >= 0 && cols[idxDate]) ? cols[idxDate] : dateEl.value || today()
                if (!records[date]) records[date] = {}
                const pres = (idxPres >= 0) ? (cols[idxPres] && cols[idxPres] !== '0' && cols[idxPres].toLowerCase() !== 'false' ? true : false) : true
                if (pres) records[date][name] = true
            })
            save(K_STUD, students)
            save(K_REC, records)
            alert('Import complete')
            render()
        } catch(err){
            alert('Import failed: ' + err.message)
        }
    }
    reader.readAsText(f)
    importFile.value = ''
})

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'f') { e.preventDefault(); search.focus(); search.select(); }
    }
})

// initial render
render()
// expose for testing in console (optional)
window.attendance = { students, records }

})();

/* Animated background - particles with connecting lines */
(function(){
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * DPR; canvas.height = h * DPR; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.scale(DPR, DPR);

    const config = {
        count: Math.floor((w*h)/60000) + 25, // particle density
        maxDist: Math.min(220, Math.max(90, Math.sqrt(w*h)/6)),
        speed: 0.25 + Math.min(0.9, Math.sqrt(w*h)/600),
        color: 'rgba(6,182,212,0.9)',
        lineColor: 'rgba(130,224,245,0.14)'
    };

        // butterflies config (small number, lightweight shapes)
        const bfConfig = {
            count: Math.max(3, Math.floor(Math.sqrt(w*h)/900)),
            speed: 0.6,
            wingFreq: 0.14,
            color1: 'rgba(255,200,120,0.95)',
            color2: 'rgba(255,150,200,0.95)'
        };

    let particles = [];
    let butterflies = [];

    function rand(min, max){ return Math.random()*(max-min)+min }

    function create(){
        particles = [];
        for(let i=0;i<config.count;i++){
            particles.push({
                x: rand(0,w), y: rand(0,h),
                vx: rand(-config.speed, config.speed), vy: rand(-config.speed, config.speed),
                r: rand(1,2.6)
            })
        }
                // butterflies
                butterflies = [];
                for (let i=0;i<bfConfig.count;i++){
                    butterflies.push({
                        x: rand(0,w), y: rand(h*0.1,h*0.6),
                        vx: rand(-bfConfig.speed, bfConfig.speed),
                        vy: rand(-0.2,0.2),
                        phase: Math.random()*Math.PI*2,
                        size: rand(6,12),
                        wing: Math.random()*Math.PI*2
                    })
                }
    }

    function resize(){
        w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight;
        canvas.width = w * DPR; canvas.height = h * DPR; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.setTransform(DPR,0,0,DPR,0,0);
        config.maxDist = Math.min(220, Math.max(90, Math.sqrt(w*h)/6));
        create();
    }

    function tick(){
        ctx.clearRect(0,0,w,h);
        // subtle radial gradient
        const g = ctx.createLinearGradient(0,0,w,h);
        g.addColorStop(0,'rgba(7,16,38,0.18)');
        g.addColorStop(1,'rgba(7,16,34,0.24)');
        ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

        // update and draw points
        for(let i=0;i<particles.length;i++){
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;
            if (p.x < -10) p.x = w+10; if (p.x > w+10) p.x = -10;
            if (p.y < -10) p.y = h+10; if (p.y > h+10) p.y = -10;
            ctx.beginPath(); ctx.fillStyle = config.color; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
        }

        // lines
        for(let i=0;i<particles.length;i++){
            const a = particles[i];
            for(let j=i+1;j<particles.length;j++){
                const b = particles[j];
                const dx = a.x-b.x, dy = a.y-b.y; const d = Math.sqrt(dx*dx+dy*dy);
                if (d < config.maxDist){
                    const alpha = 1 - (d / config.maxDist);
                    ctx.strokeStyle = `rgba(130,224,245,${(alpha*0.12)})`;
                    ctx.lineWidth = 1 * (alpha*0.9);
                    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
                }
            }
        }

        // draw butterflies on top
        for (let i=0;i<butterflies.length;i++){
            const b = butterflies[i];
            // gentle natural motion
            b.phase += 0.01 + (Math.random()-0.5)*0.008;
            b.wing += bfConfig.wingFreq + (Math.random()-0.5)*0.02;
            b.x += b.vx + Math.sin(b.phase)*0.25;
            b.y += b.vy + Math.cos(b.phase)*0.12;
            // keep in bounds with soft wrap
            if (b.x < -20) b.x = w+20; if (b.x > w+20) b.x = -20;
            if (b.y < 20) b.y = 20; if (b.y > h-20) b.y = h-20;

            // draw butterfly as two colored wings with rotation
            const s = b.size;
            const flap = Math.abs(Math.sin(b.wing))*0.9 + 0.2; // 0.2..1.1
            const angle = Math.atan2(b.vy, b.vx || 0.0001);
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(angle);
            // left wing
            ctx.beginPath();
            ctx.ellipse(-s*0.3, 0, s*0.8*flap, s*0.45*flap, -0.3, 0, Math.PI*2);
            ctx.fillStyle = bfConfig.color1; ctx.fill();
            // right wing
            ctx.beginPath();
            ctx.ellipse(s*0.3, 0, s*0.8*flap, s*0.45*flap, 0.3, 0, Math.PI*2);
            ctx.fillStyle = bfConfig.color2; ctx.fill();
            // body
            ctx.beginPath(); ctx.fillStyle = 'rgba(30,30,40,0.9)'; ctx.ellipse(0,0,s*0.2,s*0.6,0,0,Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }

    let running = true; let raf;
    function loop(){ if(!running) return; tick(); raf = requestAnimationFrame(loop); }

    // pause when hidden to save CPU
    document.addEventListener('visibilitychange', ()=>{ running = !document.hidden; if(running){ loop() } else { if(raf) cancelAnimationFrame(raf) } });

    window.addEventListener('resize', ()=>{ resize() });
    create(); loop();

})();