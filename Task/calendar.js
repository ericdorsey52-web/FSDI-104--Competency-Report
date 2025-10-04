    // CONFIG: point this to your API. Example expected endpoints:
    // GET  {API_BASE}/tasks           -> returns JSON array of tasks
    // POST {API_BASE}/tasks           -> accepts task JSON, returns created task
    // DELETE {API_BASE}/tasks         -> deletes all tasks (optional)
    const API_BASE = 'https://your-api.example.com'; // <-- change me
    const USER_ID = 'user-123'; // optional user scoping

    // Utility - format date
    function formatMonthYear(date){
      return date.toLocaleString(undefined,{month:'long',year:'numeric'});
    }
    function ymd(date){
      const yy = date.getFullYear();
      const mm = String(date.getMonth()+1).padStart(2,'0');
      const dd = String(date.getDate()).padStart(2,'0');
      return `${yy}-${mm}-${dd}`;
    }

    // State
    const state = {
      viewDate: new Date(),
      tasks: [] // loaded from server
    };

    // DOM build
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    weekdays.forEach(d=>$('#weekdays').append('<div class="weekday">'+d+'</div>'));

    function renderCalendar(){
      const view = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth(), 1);
      $('#monthLabel').text(formatMonthYear(view));

      // first day index
      const startDay = new Date(view.getFullYear(), view.getMonth(), 1).getDay();

      // days in month
      const nextMonth = new Date(view.getFullYear(), view.getMonth()+1, 1);
      const daysInMonth = (new Date(nextMonth - 1)).getDate();

      // build grid including leading blanks
      $('#calendar').empty();
      const totalCells = Math.ceil((startDay + daysInMonth)/7)*7;
      for(let i=0;i<totalCells;i++){
        const cell = $('<div class="day"></div>');
        const dayNum = i - startDay + 1;
        if(i >= startDay && dayNum <= daysInMonth){
          const cellDate = new Date(view.getFullYear(), view.getMonth(), dayNum);
          const dateStr = ymd(cellDate);
          cell.append('<div class="date">'+dayNum+'</div>');
          const tasksFor = state.tasks.filter(t=>t.date===dateStr);
          const tasksWrap = $('<div class="tasks"></div>');
          tasksFor.slice(0,4).forEach(t=>{
            const pill = $('<div class="task-pill"></div>').text((t.time?t.time+' — ':'')+t.title);
            pill.on('click', ()=>openTaskModal(t));
            tasksWrap.append(pill);
          });
          if(tasksFor.length>4){
            tasksWrap.append('<div class="muted small">+'+(tasksFor.length-4)+' more</div>');
          }
          cell.append(tasksWrap);
          cell.on('click', ()=>selectDate(dateStr));
        } else {
          cell.css('background','#fbfcfe');
        }
        $('#calendar').append(cell);
      }
    }

    function selectDate(dateStr){
      $('#selectedDate').text(dateStr);
      $('#taskDate').val(dateStr);
      $('#title').focus();
      renderTasksForDay(dateStr);
    }

    function renderTasksForDay(dateStr){
      const list = $('#tasksForDay'); list.empty();
      const tasksFor = state.tasks.filter(t=>t.date===dateStr);
      if(tasksFor.length===0) list.append('<div class="muted">No tasks</div>');
      tasksFor.forEach(t=>{
        const el = $('<div style="border:1px solid #eef3ff;padding:8px;border-radius:8px;margin-bottom:8px"></div>');
        el.append('<div style="font-weight:600">'+escapeHtml(t.title)+'</div>');
        if(t.time) el.append('<div class="small muted">'+t.time+'</div>');
        if(t.description) el.append('<div class="muted small">'+escapeHtml(t.description)+'</div>');
        list.append(el);
      });
    }

    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m];}); }

    // TASK MODEL: create a task object
    function createTaskObject({title,date,time,description}){
      return {
        id: 'local-'+Date.now()+Math.floor(Math.random()*999),
        title: title||'Untitled',
        date: date, // yyyy-mm-dd
        time: time||'',
        description: description||'',
        userId: USER_ID,
        createdAt: new Date().toISOString()
      };
    }

    // Server API interactions
    function loadTasks(){
      // attempt to fetch from server
      $.ajax({url:API_BASE+'/tasks',method:'GET',dataType:'json'})
        .done(function(data){
          if(Array.isArray(data)){
            state.tasks = data;
            renderCalendar();
            const today = ymd(new Date());
            selectDate(today);
          } else {
            console.warn('Unexpected tasks payload, falling back to localStorage');
            loadLocal();
          }
        })
        .fail(function(){
          console.warn('Failed to load tasks from server, using localStorage fallback');
          loadLocal();
        });
    }

    function saveTaskToServer(task, cb){
      $.ajax({url:API_BASE+'/tasks',method:'POST',contentType:'application/json',data:JSON.stringify(task),dataType:'json'})
        .done(function(created){
          // if server returns object, replace local id
          if(created && created.id){
            // replace task id in state
            const idx = state.tasks.findIndex(t=>t.id===task.id);
            if(idx>-1) state.tasks[idx] = created;
            else state.tasks.push(created);
          } else {
            // push the original task
            state.tasks.push(task);
          }
          persistLocal();
          renderCalendar();
          if(cb) cb(null,task);
        })
        .fail(function(err){
          // fallback: save locally and keep id
          state.tasks.push(task);
          persistLocal();
          renderCalendar();
          if(cb) cb(err,task);
        });
    }

    function deleteAllOnServer(cb){
      $.ajax({url:API_BASE+'/tasks',method:'DELETE'})
        .done(function(){ state.tasks = []; persistLocal(); renderCalendar(); if(cb) cb(null); })
        .fail(function(err){ if(cb) cb(err); });
    }

    // Local fallback storage
    function persistLocal(){ localStorage.setItem('calendar.tasks', JSON.stringify(state.tasks)); }
    function loadLocal(){ const raw = localStorage.getItem('calendar.tasks'); state.tasks = raw?JSON.parse(raw):[]; renderCalendar(); const today=ymd(new Date()); selectDate(today);} 

    // UI: open task modal (view details)
    function openTaskModal(task){
      const root = $('#modalRoot');
      const modal = $('<div class="modal-backdrop"></div>');
      const box = $('<div class="modal"></div>');
      box.append('<h3>'+escapeHtml(task.title)+'</h3>');
      box.append('<div class="muted small">Date: '+task.date+(task.time?(' • '+task.time):'')+'</div>');
      if(task.description) box.append('<p style="margin-top:12px">'+escapeHtml(task.description)+'</p>');
      const closeBtn = $('<div style="margin-top:12px;text-align:right"><button>Close</button></div>');
      closeBtn.find('button').on('click', ()=>{ modal.remove(); root.hide(); });
      box.append(closeBtn);
      modal.append(box);
      root.empty().append(modal).show();
      modal.on('click', function(e){ if(e.target===this){ modal.remove(); root.hide(); } });
    }

    // Form handling
    $('#taskForm').on('submit', function(e){
      e.preventDefault();
      const title = $('#title').val().trim();
      const date = $('#taskDate').val();
      const time = $('#time').val();
      const description = $('#description').val().trim();
      if(!date){ alert('Select a date by clicking a day on the calendar'); return; }
      const task = createTaskObject({title,date,time,description});
      saveTaskToServer(task, function(err){
        if(err){ console.warn('Saved locally due to server error'); }
        // clear form
        $('#title').val(''); $('#time').val(''); $('#description').val('');
        renderTasksForDay(date);
      });
    });

    $('#prev').on('click', function(){ state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth()-1,1); renderCalendar(); });
    $('#next').on('click', function(){ state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth()+1,1); renderCalendar(); });
    $('#refresh').on('click', function(){ loadTasks(); });

    $('#deleteAll').on('click', function(){ if(!confirm('Delete ALL tasks on server? This cannot be undone.')) return; deleteAllOnServer(function(err){ if(err) alert('Failed to delete on server'); else alert('All tasks deleted.'); }); });

    // bootstrap
    $(function(){
      // set default selected date
      const today = new Date();
      state.viewDate = new Date(today.getFullYear(), today.getMonth(), 1);
      renderCalendar();
      selectDate(ymd(today));
      // try load
      loadTasks();
    });