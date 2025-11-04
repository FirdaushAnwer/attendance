(function(){
// Storage keys
const K_STUD = 'att_students_v2' // Changed to v2 to migrate to new format
const K_REC = 'att_records_v1' // {date: {name: true}}
const K_CLASS = 'att_class_v1' // Class/Section name
// Elements
const dateEl = document.getElementById('date')
const classInput = document.getElementById('classInput')
const nameInput = document.getElementById('nameInput')
const usnInput = document.getElementById('usnInput')
const addBtn = document.getElementById('addBtn')
const tbody = document.getElementById('tbody')
const stats = document.getElementById('stats')
const search = document.getElementById('search')
const markAllBtn = document.getElementById('markAll')
const clearDateBtn = document.getElementById('clearDate')
const clearAllBtn = document.getElementById('clearAll')
const exportCsvBtn = document.getElementById('exportCsv')
const exportPdfBtn = document.getElementById('exportPdf')
const importFile = document.getElementById('importFile')

// Utils
const today = () => new Date().toISOString().slice(0,10)
const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || def } catch(e){return def} }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))

// State
let students = load(K_STUD, [])
let records = load(K_REC, {})

// Migrate old format (array of strings) to new format (array of objects)
if(students.length > 0 && typeof students[0] === 'string'){
    students = students.map(name => ({ name, usn: '' }))
    save(K_STUD, students)
}

// Initialize date picker and class input
if (dateEl) dateEl.value = today()
if (classInput) {
    const savedClass = localStorage.getItem(K_CLASS) || ''
    classInput.value = savedClass
    classInput.addEventListener('input', () => {
        localStorage.setItem(K_CLASS, classInput.value)
    })
}

// Render
function render(){
    const d = dateEl.value || today()
    const rec = records[d] || {}
    const q = (search.value || '').toLowerCase()
    tbody.innerHTML = ''
    students.forEach((student, idx) => {
        const name = student.name || student
        const usn = student.usn || ''
        const searchText = (name + ' ' + usn).toLowerCase()
        if (q && searchText.indexOf(q) === -1) return
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
                    const oldName = students[idx].name || students[idx]
                    students[idx] = { name: val, usn: students[idx].usn || '' }
                    // update records: rename key in all dates
                    for (const dd in records) {
                        if (records[dd] && Object.prototype.hasOwnProperty.call(records[dd], oldName)) {
                            const v = records[dd][oldName]
                            delete records[dd][oldName]
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

        // USN cell (editable)
        const tdUsn = document.createElement('td')
        tdUsn.className = 'usn'
        const usnBtn = document.createElement('button')
        usnBtn.className = 'inline-edit'
        usnBtn.textContent = usn || '-'
        usnBtn.title = 'Click to edit USN'
        usnBtn.addEventListener('click', () => {
            const input = document.createElement('input')
            input.type = 'text'
            input.value = usn
            input.style.minWidth = '100px'
            input.placeholder = 'Enter USN'
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') input.blur()
            })
            input.addEventListener('blur', () => {
                const val = input.value.trim().toUpperCase()
                if (val !== usn) {
                    students[idx] = { name: students[idx].name || students[idx], usn: val }
                    save(K_STUD, students)
                }
                render()
            })
            tdUsn.replaceChild(input, usnBtn)
            input.focus()
            input.select()
        })
        tdUsn.appendChild(usnBtn)
        tr.appendChild(tdUsn)

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
function addStudent(name, usn){
    name = (name || '').trim()
    usn = (usn || '').trim().toUpperCase()
    if (!name) return
    // Check if student with same name already exists
    const exists = students.some(s => {
        const sName = s.name || s
        return sName.toLowerCase() === name.toLowerCase()
    })
    if (exists) {
        alert('Student already exists.')
        return
    }
    students.push({ name, usn })
    save(K_STUD, students)
    nameInput.value = ''
    if(usnInput) usnInput.value = ''
    render()
}

addBtn.addEventListener('click', ()=> addStudent(nameInput.value, usnInput?.value || ''))
nameInput.addEventListener('keydown', (e)=> { 
    if (e.key === 'Enter') {
        e.preventDefault()
        addStudent(nameInput.value, usnInput?.value || '')
        nameInput.focus()
    }
})
usnInput?.addEventListener('keydown', (e)=> { 
    if (e.key === 'Enter') {
        e.preventDefault()
        addStudent(nameInput.value, usnInput.value || '')
        nameInput.focus()
    }
})

dateEl.addEventListener('change', render)
search.addEventListener('input', render)

markAllBtn.addEventListener('click', () => {
    const d = dateEl.value || today()
    if (!records[d]) records[d] = {}
    students.forEach(s => {
        const name = s.name || s
        records[d][name] = true
    })
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
    const rows = [['Name','USN','Present','Date']]
    students.forEach(student => {
        const name = student.name || student
        const usn = student.usn || ''
        rows.push([name, usn, rec[name] ? '1' : '0', d])
    })
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

exportPdfBtn.addEventListener('click', () => {
    if (typeof window.jspdf === 'undefined') {
        alert('PDF library not loaded. Please refresh the page.')
        return
    }
    
    const { jsPDF } = window.jspdf
    const d = dateEl.value || today()
    const rec = records[d] || {}
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    })
    
    // Format date for display
    const dateObj = new Date(d)
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })
    
    // Get class/section name
    const className = classInput?.value?.trim() || localStorage.getItem(K_CLASS) || ''
    
    // Header
    pdf.setFontSize(20)
    pdf.setTextColor(6, 182, 212)
    pdf.text('SRI SIDDHARTHA SCHOOL OF ENGINEERING', 105, 15, { align: 'center' })
    
    pdf.setFontSize(16)
    pdf.setTextColor(0, 0, 0)
    pdf.text('Attendance Report', 105, 22, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setTextColor(100, 100, 100)
    if (className) {
        pdf.text(`Class/Section: ${className}`, 105, 28, { align: 'center' })
        pdf.text(`Date: ${formattedDate}`, 105, 34, { align: 'center' })
    } else {
        pdf.text(`Date: ${formattedDate}`, 105, 32, { align: 'center' })
    }
    
    // Statistics
    const total = students.length
    const present = Object.keys(rec).filter(n => rec[n]).length
    const absent = total - present
    pdf.setFontSize(11)
    const statsY = className ? 40 : 38
    pdf.text(`Total Students: ${total} | Present: ${present} | Absent: ${absent}`, 105, statsY, { align: 'center' })
    
    // Table setup
    const startY = className ? 47 : 45
    const colWidths = [80, 50, 25, 25] // Name, USN, Present, Absent
    const headers = ['Student Name', 'USN', 'Present', 'Absent']
    let currentY = startY
    
    // Table header
    pdf.setFontSize(10)
    pdf.setFillColor(6, 182, 212)
    pdf.setTextColor(255, 255, 255)
    pdf.rect(20, currentY - 5, 170, 8, 'F')
    
    let xPos = 20
    headers.forEach((header, idx) => {
        pdf.text(header, xPos + colWidths[idx] / 2, currentY, { align: 'center' })
        xPos += colWidths[idx]
    })
    
    currentY += 8
    pdf.setTextColor(0, 0, 0)
    
    // Table rows
    pdf.setFontSize(9)
    students.forEach((student, idx) => {
        const name = student.name || student
        const usn = student.usn || '-'
        const isPresent = !!rec[name]
        
        // Check if we need a new page
        if (currentY > 270) {
            pdf.addPage()
            currentY = 20
            
            // Redraw header on new page
            pdf.setFontSize(10)
            pdf.setFillColor(6, 182, 212)
            pdf.setTextColor(255, 255, 255)
            pdf.rect(20, currentY - 5, 170, 8, 'F')
            
            xPos = 20
            headers.forEach((header, hIdx) => {
                pdf.text(header, xPos + colWidths[hIdx] / 2, currentY, { align: 'center' })
                xPos += colWidths[hIdx]
            })
            currentY += 8
            pdf.setTextColor(0, 0, 0)
            pdf.setFontSize(9)
        }
        
        // Alternate row color
        if (idx % 2 === 0) {
            pdf.setFillColor(245, 245, 245)
            pdf.rect(20, currentY - 4, 170, 6, 'F')
        }
        
        // Row data
        xPos = 20
        pdf.text(name.substring(0, 30), xPos + 2, currentY) // Name (truncated if too long)
        xPos += colWidths[0]
        
        pdf.setFont('courier')
        pdf.text(usn, xPos + colWidths[1] / 2, currentY, { align: 'center' })
        xPos += colWidths[1]
        
        pdf.setFont('helvetica')
        pdf.text(isPresent ? 'P' : '', xPos + colWidths[2] / 2, currentY, { align: 'center' })
        xPos += colWidths[2]
        
        pdf.text(!isPresent ? 'A' : '', xPos + colWidths[3] / 2, currentY, { align: 'center' })
        
        currentY += 6
    })
    
    // Footer
    const pageCount = pdf.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text(
            `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
            105,
            285,
            { align: 'center' }
        )
    }
    
    // Save PDF
    pdf.save(`attendance-${d}.pdf`)
})

importFile.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
        const text = reader.result
        try {
            // Simple CSV parser: expects header Name,USN,Present,Date or Name,Present,Date
            const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
            if (!lines.length) throw new Error('Empty file')
            const header = lines.shift().split(',').map(h => h.replace(/(^"|"$)/g,'').trim().toLowerCase())
            const idxName = header.findIndex(h=>h.includes('name'))
            const idxUsn = header.findIndex(h=>h.includes('usn'))
            const idxPres = header.findIndex(h=>h.includes('present'))
            const idxDate = header.findIndex(h=>h.includes('date'))
            if (idxName < 0) throw new Error('CSV must contain Name column')
            lines.forEach(line => {
                // naive split
                const cols = line.split(',').map(c=>c.replace(/(^"|"$)/g,'').trim())
                const name = cols[idxName]
                if (!name) return
                const usn = (idxUsn >= 0 && cols[idxUsn]) ? cols[idxUsn].trim().toUpperCase() : ''
                
                // Check if student already exists
                const exists = students.some(s => {
                    const sName = s.name || s
                    return sName.toLowerCase() === name.toLowerCase()
                })
                if (!exists) {
                    students.push({ name, usn })
                } else {
                    // Update USN if student exists but USN is provided
                    const studentIdx = students.findIndex(s => {
                        const sName = s.name || s
                        return sName.toLowerCase() === name.toLowerCase()
                    })
                    if (studentIdx >= 0 && usn && !students[studentIdx].usn) {
                        students[studentIdx] = { name: students[studentIdx].name || students[studentIdx], usn }
                    }
                }
                
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

/* Theme Toggle Functionality */
(function(){
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');
    
    if (!themeToggle || !themeIcon) return;
    
    // Get saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const html = document.documentElement;
    
    function setTheme(theme) {
        if (theme === 'light') {
            html.classList.remove('dark-mode');
            html.classList.add('light-mode');
            themeIcon.textContent = '🌙';
        } else {
            html.classList.remove('light-mode');
            html.classList.add('dark-mode');
            themeIcon.textContent = '☀️';
        }
        localStorage.setItem('theme', theme);
    }
    
    // Apply saved theme on load (or default to dark if html already has dark-mode)
    if(!html.classList.contains('light-mode') && !html.classList.contains('dark-mode')){
        html.classList.add('dark-mode');
    }
    setTheme(savedTheme);
    
    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const currentTheme = html.classList.contains('light-mode') ? 'light' : 'dark';
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
})();

/* Galaxy and Stars Background */
(function(){
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * DPR; canvas.height = h * DPR; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.scale(DPR, DPR);

    let stars = [];
    let galaxies = [];
    let clouds = [];
    let isDarkMode = document.documentElement.classList.contains('dark-mode') || 
                     !document.documentElement.classList.contains('light-mode');

    function rand(min, max){ return Math.random()*(max-min)+min }

    function createStars(){
        stars = [];
        const starCount = Math.floor((w*h)/8000);
        for(let i=0;i<starCount;i++){
            stars.push({
                x: rand(0,w),
                y: rand(0,h),
                radius: rand(0.5, 2),
                opacity: rand(0.3, 1),
                twinkle: Math.random() * Math.PI * 2,
                speed: rand(0.2, 0.8)
            });
        }
    }

    function createClouds(){
        clouds = [];
        const cloudCount = 5 + Math.floor(w/300);
        for(let i=0;i<cloudCount;i++){
            const baseY = rand(h*0.1, h*0.6);
            const size = rand(60, 150);
            const layers = Math.floor(rand(3, 6));
            const puffs = [];
            
            // Pre-calculate puff sizes and offsets
            for(let j=0; j<layers; j++){
                puffs.push({
                    offsetX: (Math.sin(j * 0.8) * size * 0.3),
                    offsetY: (Math.cos(j * 1.2) * size * 0.2),
                    size: size * (0.4 + rand(0, 0.3))
                });
            }
            
            clouds.push({
                x: rand(-w*0.2, w*1.2),
                y: baseY,
                size: size,
                speed: rand(0.1, 0.3),
                opacity: rand(0.3, 0.6),
                puffs: puffs
            });
        }
    }

    function createGalaxies(){
        galaxies = [];
        const galaxyCount = 3 + Math.floor(Math.sqrt(w*h)/800);
        for(let i=0;i<galaxyCount;i++){
            const centerX = rand(w*0.2, w*0.8);
            const centerY = rand(h*0.2, h*0.8);
            const arms = 3 + Math.floor(rand(0, 3));
            const particles = 40 + Math.floor(rand(0, 60));
            
            galaxies.push({
                centerX,
                centerY,
                arms,
                particles: [],
                rotation: rand(0, Math.PI * 2),
                rotationSpeed: rand(0.001, 0.003),
                spiralTightness: rand(0.02, 0.05)
            });

            for(let j=0;j<particles;j++){
                const arm = Math.floor(rand(0, arms));
                const distance = rand(20, 200);
                const angle = (arm * (Math.PI * 2 / arms)) + (distance * galaxies[i].spiralTightness);
                galaxies[i].particles.push({
                    distance,
                    angle,
                    opacity: rand(0.1, 0.4),
                    size: rand(1, 3)
                });
            }
        }
    }

    function create(){
        createStars();
        createGalaxies();
        createClouds();
    }

    function resize(){
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        canvas.width = w * DPR;
        canvas.height = h * DPR;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(DPR,0,0,DPR,0,0);
        create();
    }

    function tick(){
        ctx.clearRect(0,0,w,h);
        
        // Check current theme
        isDarkMode = document.documentElement.classList.contains('dark-mode') || 
                     !document.documentElement.classList.contains('light-mode');

        // Background gradient
        if(isDarkMode){
            const gradient = ctx.createRadialGradient(w*0.5, h*0.3, 0, w*0.5, h*0.5, Math.max(w,h));
            gradient.addColorStop(0, 'rgba(7,16,38,0.95)');
            gradient.addColorStop(0.5, 'rgba(5,10,20,0.98)');
            gradient.addColorStop(1, 'rgba(2,4,8,1)');
            ctx.fillStyle = gradient;
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, 'rgba(135,206,250,0.3)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
            gradient.addColorStop(1, 'rgba(230,240,255,0.4)');
            ctx.fillStyle = gradient;
        }
        ctx.fillRect(0,0,w,h);

        // Draw clouds (only in light mode)
        if(!isDarkMode){
            clouds.forEach(cloud => {
                cloud.x += cloud.speed;
                if(cloud.x > w + cloud.size * 2) {
                    cloud.x = -cloud.size * 2;
                    cloud.y = rand(h*0.1, h*0.6);
                }
                
                // Draw cloud as multiple overlapping circles
                ctx.save();
                ctx.globalAlpha = cloud.opacity;
                
                // Create cloud shape with multiple puffs
                cloud.puffs.forEach(puff => {
                    const cloudGradient = ctx.createRadialGradient(
                        cloud.x + puff.offsetX, 
                        cloud.y + puff.offsetY, 
                        0,
                        cloud.x + puff.offsetX, 
                        cloud.y + puff.offsetY, 
                        puff.size
                    );
                    cloudGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
                    cloudGradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
                    cloudGradient.addColorStop(0.7, 'rgba(240,248,255,0.3)');
                    cloudGradient.addColorStop(1, 'rgba(240,248,255,0)');
                    
                    ctx.fillStyle = cloudGradient;
                    ctx.beginPath();
                    ctx.arc(cloud.x + puff.offsetX, cloud.y + puff.offsetY, puff.size, 0, Math.PI*2);
                    ctx.fill();
                });
                
                ctx.restore();
            });
        }

        // Draw galaxies
        galaxies.forEach(galaxy => {
            galaxy.rotation += galaxy.rotationSpeed;
            galaxy.particles.forEach(particle => {
                const currentAngle = particle.angle + galaxy.rotation;
                const x = galaxy.centerX + Math.cos(currentAngle) * particle.distance;
                const y = galaxy.centerY + Math.sin(currentAngle) * particle.distance;
                
                if(isDarkMode){
                    ctx.fillStyle = `rgba(130,180,255,${particle.opacity})`;
                } else {
                    ctx.fillStyle = `rgba(70,130,200,${particle.opacity * 0.6})`;
                }
                ctx.beginPath();
                ctx.arc(x, y, particle.size, 0, Math.PI*2);
                ctx.fill();
            });
        });

        // Draw stars
        stars.forEach(star => {
            star.twinkle += star.speed * 0.01;
            const twinkleOpacity = Math.abs(Math.sin(star.twinkle)) * 0.5 + 0.5;
            const finalOpacity = star.opacity * twinkleOpacity;
            
            if(isDarkMode){
                ctx.fillStyle = `rgba(255,255,255,${finalOpacity})`;
            } else {
                ctx.fillStyle = `rgba(100,150,255,${finalOpacity * 0.8})`;
            }
            
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI*2);
            ctx.fill();
            
            // Add glow for bright stars
            if(star.opacity > 0.7){
                const glowGradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 3);
                if(isDarkMode){
                    glowGradient.addColorStop(0, `rgba(255,255,255,${finalOpacity * 0.3})`);
                    glowGradient.addColorStop(1, 'transparent');
                } else {
                    glowGradient.addColorStop(0, `rgba(100,150,255,${finalOpacity * 0.2})`);
                    glowGradient.addColorStop(1, 'transparent');
                }
                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI*2);
                ctx.fill();
            }
        });
    }

    let running = true;
    let raf;
    function loop(){ 
        if(!running) return; 
        tick(); 
        raf = requestAnimationFrame(loop); 
    }

    // Watch for theme changes
    const observer = new MutationObserver(() => {
        // Theme changed, background will update on next frame
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    document.addEventListener('visibilitychange', ()=>{ 
        running = !document.hidden; 
        if(running){ loop() } else { if(raf) cancelAnimationFrame(raf) } 
    });

    window.addEventListener('resize', ()=>{ resize() });
    create(); 
    loop();
})();