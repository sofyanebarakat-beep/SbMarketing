/* Admin → Client portal → Content calendar.
   Pick a client, then plan their posts on a month / week calendar (rows in
   public.content_items). Upload an image or video, write the caption, set
   channels, date, time and status. Drag a post to another day to reschedule.
   Client answers (approve / reject / change request) show on each post. */
(function(){
  'use strict';
  var config=window.SB_SUPABASE,V=window.SBContentCalendar,SESSION='sb_admin_session',CLIENT_KEY='sb_cc_client',VIEW_KEY='sb_cc_view';
  var page=document.querySelector('[data-view="calendar"]');if(!page||!config||!V)return;
  var $=function(s,r){return (r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));},esc=V.esc;
  var STATUS={idea:'Idea',draft:'Draft',design_in_progress:'In design',ready_for_approval:'Pending approval',approved:'Approved',scheduled:'Scheduled',published:'Published'};
  var SHORT={ready_for_approval:'Pending'};
  var DECISION={approved:'Approved by the client',rejected:'Rejected by the client',changes_requested:'Change requested by the client'};
  var FILTERS=[['all','All'],['draft','Drafts'],['ready_for_approval','Pending approval'],['approved','Approved'],['scheduled','Scheduled'],['published','Published'],['feedback','Needs changes']];
  var LIMITS={instagram:2200,tiktok:2200,facebook:63206,linkedin:3000,youtube:5000,google:1500,pinterest:500};
  var SETUP_SQL='Run supabase/content_calendar.sql in the Supabase SQL Editor to enable post times.';
  var state={clients:[],clientId:'',items:[],view:'month',anchor:new Date(),filter:'all',loaded:false,editing:null,timeSupported:true};
  try{state.clientId=localStorage.getItem(CLIENT_KEY)||'';state.view=localStorage.getItem(VIEW_KEY)==='week'?'week':'month';}catch(e){}

  // ── API (admin session with refresh) ──
  function session(){try{return JSON.parse(localStorage.getItem(SESSION)||'null');}catch(e){return null;}}
  async function refresh(s){var r=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok)return null;var fresh=await r.json();localStorage.setItem(SESSION,JSON.stringify(fresh));return fresh;}
  async function api(path,options,retried){var s=session(),opts=Object.assign({},options||{}),headers=Object.assign({apikey:config.key,Authorization:'Bearer '+(s?s.access_token:config.key)},opts.headers||{});if(opts.body&&!headers['Content-Type'])headers['Content-Type']='application/json';opts.headers=headers;var r=await fetch(config.url+path,opts);
    if(r.status===401&&!retried&&s&&s.refresh_token&&await refresh(s))return api(path,options,true);
    if(!r.ok){var d=await r.json().catch(function(){return{};});throw new Error(d.message||d.error||d.hint||'Request failed');}
    if(r.status===204)return null;var text=await r.text();return text?JSON.parse(text):null;}
  function isSchemaError(e){return /publish_time|media_type|schema cache|column/i.test(String(e&&e.message||''));}

  // ── Data ──
  function normalise(row){return{id:row.id,date:row.publish_date||'',time:(row.publish_time||'').slice(0,5),platforms:V.platformList(row.platform),format:row.content_type||'',topic:row.topic||'',caption:row.caption||'',image:row.visual_url||'',mediaType:row.media_type||'',status:STATUS[row.status]?row.status:'draft',decision:row.client_decision||'',comment:row.client_comment||'',decidedAt:row.decided_at||'',visible:row.client_visible!==false,link:row.publication_url||''};}
  async function loadClients(){state.clients=await api('/rest/v1/clients?select=id,business_name,contact_name,status&order=business_name')||[];renderClientSelect();}
  async function loadItems(){if(!state.clientId){state.items=[];return;}var rows=await api('/rest/v1/content_items?client_id=eq.'+encodeURIComponent(state.clientId)+'&select=*&order=publish_date.asc.nullslast')||[];state.items=rows.map(normalise);state.timeSupported=!rows.length||Object.prototype.hasOwnProperty.call(rows[0],'publish_time');}
  function client(){return state.clients.find(function(c){return c.id===state.clientId;})||null;}

  // ── Rendering ──
  function message(text,isError){var el=$('[data-cc-message]',page);if(el){el.textContent=text||'';el.classList.toggle('is-error',!!isError);}}
  function renderClientSelect(){var sel=$('[data-cc-client]',page);sel.innerHTML='<option value="">Select a client…</option>'+state.clients.map(function(c){return '<option value="'+esc(c.id)+'"'+(c.id===state.clientId?' selected':'')+'>'+esc(c.business_name)+(c.status&&c.status!=='active'?' ('+esc(c.status)+')':'')+'</option>';}).join('');if(state.clientId&&!client())state.clientId='';updateAvatar();}
  function updateAvatar(){var c=client();$('[data-cc-avatar]',page).textContent=c?(c.business_name||'?').trim().charAt(0).toUpperCase():'?';}
  function matches(item){var f=state.filter;if(f==='all')return true;if(f==='feedback')return item.decision==='changes_requested'||item.decision==='rejected';if(f==='draft')return ['idea','draft','design_in_progress'].indexOf(item.status)>-1;return item.status===f;}
  function periodLabel(){if(state.view==='week'){var s=V.weekStart(state.anchor),e=new Date(s);e.setDate(s.getDate()+6);var f=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'});return f.format(s)+' – '+f.format(e)+' '+e.getFullYear();}return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(state.anchor);}
  function renderFilters(){var counts={};FILTERS.forEach(function(f){counts[f[0]]=0;});state.items.forEach(function(i){FILTERS.forEach(function(f){var prev=state.filter;state.filter=f[0];if(matches(i))counts[f[0]]++;state.filter=prev;});});
    $('[data-cc-filters]',page).innerHTML=FILTERS.map(function(f){return '<button type="button" class="cc-filter cc-filter--'+f[0]+(state.filter===f[0]?' is-active':'')+'" data-cc-filter="'+f[0]+'" aria-pressed="'+(state.filter===f[0])+'">'+esc(f[1])+'<b>'+counts[f[0]]+'</b></button>';}).join('');}
  function render(){
    var has=!!state.clientId;$('[data-cc-pick]',page).hidden=has;$('[data-cc-body]',page).hidden=!has;$('[data-cc-new]',page).disabled=!has;
    $$('[data-cc-view]',page).forEach(function(b){b.classList.toggle('is-active',b.dataset.ccView===state.view);b.setAttribute('aria-pressed',b.dataset.ccView===state.view);});
    $('[data-cc-period]',page).textContent=periodLabel();
    if(!has)return;renderFilters();
    var visible=state.items.filter(matches);
    V.render($('[data-cc-board]',page),{items:visible,view:state.view,anchor:state.anchor,locale:'en-GB',editable:true,labels:{add:'Add a post on'},statusLabel:function(i){return SHORT[i.status]||STATUS[i.status];},decisionLabel:function(d){return DECISION[d];}});
    var undated=visible.filter(function(i){return !V.isDate(i.date);}),box=$('[data-cc-unscheduled]',page);box.hidden=!undated.length;
    $('[data-cc-unscheduled-grid]',page).innerHTML=undated.map(function(i){return '<div class="ccv">'+cardFor(i)+'</div>';}).join('');
  }
  function cardFor(i){var tmp=document.createElement('div');V.render(tmp,{items:[Object.assign({},i,{date:'2000-01-01'})],view:'week',anchor:new Date(2000,0,1),editable:false,statusLabel:function(x){return SHORT[x.status]||STATUS[x.status];},decisionLabel:function(d){return DECISION[d];}});var card=tmp.querySelector('.ccv-card');return card?card.outerHTML:'';}

  async function selectClient(id){state.clientId=id;try{localStorage.setItem(CLIENT_KEY,id);}catch(e){}updateAvatar();state.filter='all';state.items=[];render();if(!id)return;message('Loading posts…');try{await loadItems();message('');
      var today=V.iso(new Date()),upcoming=state.items.filter(function(i){return V.isDate(i.date)&&i.date>=today;})[0];state.anchor=upcoming&&state.view==='month'?V.parse(upcoming.date):new Date();render();}
    catch(e){message(/content_items/.test(e.message)?'The content table is missing. Run supabase/client_dashboard_setup.sql in Supabase.':e.message,true);}}

  // ── Editor drawer ──
  var drawer=$('[data-cc-drawer]'),form=$('[data-cc-form]'),pending={image:'',mediaType:''};
  $$('[data-cc-pf-icon]',form).forEach(function(el){el.innerHTML=V.platformIcon(el.dataset.ccPfIcon,16);});
  function formMessage(t,isError){var el=$('[data-cc-form-message]',form);el.textContent=t||'';el.classList.toggle('is-error',!!isError);}
  function setMedia(url,type){pending.image=url||'';pending.mediaType=type||(url&&V.isVideo({image:url})?'video':url?'image':'');var prev=$('[data-cc-preview]',form);$('[data-cc-drop-empty]',form).hidden=!!url;prev.hidden=!url;$('[data-cc-media-remove]',form).hidden=!url;$('[data-cc-image-url]',form).value=url||'';
    prev.innerHTML=url?(pending.mediaType==='video'?'<video src="'+esc(url)+'" controls muted playsinline></video>':'<img src="'+esc(url)+'" alt="">')+'<button type="button" class="cc-replace" data-cc-browse>Replace</button>':'';}
  function updateCount(){var len=form.elements.caption.value.length,chosen=$$('input[name=platforms]:checked',form).map(function(c){return V.platformKey(c.value);}),limit=chosen.reduce(function(m,k){return LIMITS[k]&&LIMITS[k]<m?LIMITS[k]:m;},Infinity),el=$('[data-cc-count]',form);el.textContent=isFinite(limit)?len+' / '+limit:len+' characters';el.classList.toggle('is-over',isFinite(limit)&&len>limit);}
  function syncLinkField(){$('[data-cc-link-field]',form).hidden=form.elements.status.value!=='published';}
  function feedbackHtml(item){if(!item||!item.decision||!DECISION[item.decision])return '';var when=item.decidedAt?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.decidedAt)):'';return '<div class="cc-feedback__box cc-feedback__box--'+esc(item.decision)+'"><div><strong>'+esc(DECISION[item.decision])+'</strong>'+(when?'<small>'+esc(when)+'</small>':'')+(item.comment?'<p>“'+esc(item.comment)+'”</p>':'')+'</div><button type="button" class="secondary" data-cc-ask-again>Ask the client again</button></div>';}
  function openEditor(item,presetDate){
    if(!state.clientId)return;state.editing=item||null;form.reset();formMessage('');var c=client();
    $('[data-cc-form-client]',form).textContent=c?c.business_name:'';$('[data-cc-form-title]',form).textContent=item?'Edit post':'New post';
    $('[data-cc-delete]',form).hidden=!item;$('[data-cc-duplicate]',form).hidden=!item;
    var fb=$('[data-cc-feedback]',form);fb.innerHTML=feedbackHtml(item);fb.hidden=!fb.innerHTML;
    var it=item||{date:presetDate||'',time:'',platforms:['Instagram'],format:'Post',topic:'',caption:'',status:'draft',visible:true,link:''};
    form.elements.date.value=V.isDate(it.date)?it.date.slice(0,10):'';form.elements.time.value=it.time||'';form.elements.topic.value=it.topic;form.elements.caption.value=it.caption;form.elements.status.value=it.status;form.elements.visible.checked=it.visible!==false;form.elements.link.value=it.link||'';
    var fmt=form.elements.format;if(it.format&&!Array.prototype.some.call(fmt.options,function(o){return o.value===it.format;}))fmt.add(new Option(it.format,it.format));fmt.value=it.format||'Post';
    var chosen=it.platforms.map(V.platformKey);$$('input[name=platforms]',form).forEach(function(cb){cb.checked=chosen.indexOf(V.platformKey(cb.value))>-1;});
    setMedia(it.image,it.mediaType);updateCount();syncLinkField();
    $('[data-cc-send]',form).hidden=it.status==='published';
    if(typeof drawer.showModal==='function')drawer.showModal();else drawer.setAttribute('open','');setTimeout(function(){form.elements.topic.focus();},50);
  }
  function closeEditor(){if(drawer.open)drawer.close();state.editing=null;}
  function payloadFromForm(statusOverride){var platforms=$$('input[name=platforms]:checked',form).map(function(c){return c.value;}),status=statusOverride||form.elements.status.value,p={client_id:state.clientId,publish_date:form.elements.date.value||null,platform:platforms.join(', ')||null,content_type:form.elements.format.value||null,topic:form.elements.topic.value.trim(),caption:form.elements.caption.value.trim()||null,visual_url:pending.image||null,status:status,client_visible:form.elements.visible.checked,publication_url:status==='published'?(form.elements.link.value.trim()||null):null,updated_at:new Date().toISOString()};
    if(state.timeSupported){p.publish_time=form.elements.time.value||null;p.media_type=pending.mediaType||null;}return p;}
  async function save(statusOverride){
    var p=payloadFromForm(statusOverride);if(!p.topic){formMessage('Add a title so the post is easy to find in the calendar.',true);form.elements.topic.focus();return;}
    if(statusOverride==='ready_for_approval'&&!p.publish_date){formMessage('Pick a date before sending the post for approval.',true);form.elements.date.focus();return;}
    if(statusOverride==='ready_for_approval'){p.client_visible=true;if(state.editing&&state.editing.decision){p.client_decision=null;p.client_comment=null;p.decided_at=null;}}
    var buttons=$$('.cc-form__foot button',form);buttons.forEach(function(b){b.disabled=true;});formMessage('Saving…');
    try{await write(p);await loadItems();render();closeEditor();message(statusOverride==='ready_for_approval'?'Sent to the client for approval. They will see it in their calendar.':'Post saved.');}
    catch(e){formMessage(e.message,true);}finally{buttons.forEach(function(b){b.disabled=false;});}
  }
  async function write(p){var path=state.editing?'/rest/v1/content_items?id=eq.'+encodeURIComponent(state.editing.id):'/rest/v1/content_items',method=state.editing?'PATCH':'POST';
    try{await api(path,{method:method,headers:{Prefer:'return=minimal'},body:JSON.stringify(p)});}
    catch(e){if(!isSchemaError(e)||!('publish_time' in p))throw e;state.timeSupported=false;delete p.publish_time;delete p.media_type;await api(path,{method:method,headers:{Prefer:'return=minimal'},body:JSON.stringify(p)});message('Saved without the time. '+SETUP_SQL,true);}}
  async function upload(file){
    if(!state.clientId)return;if(!/^(image|video)\//.test(file.type)){formMessage('Choose an image or a video file.',true);return;}if(file.size>50*1024*1024){formMessage('This file is larger than 50 MB.',true);return;}
    var s=session(),name=state.clientId+'/calendar/'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_'),bar=$('[data-cc-progress]',form);bar.hidden=false;formMessage('');
    try{var r=await fetch(config.url+'/storage/v1/object/client-content/'+name.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+(s?s.access_token:config.key),'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
      if(r.status===401&&s&&s.refresh_token&&await refresh(s)){bar.hidden=true;return upload(file);}
      if(!r.ok){var d=await r.json().catch(function(){return{};});throw new Error(/bucket/i.test(d.message||d.error||'')?'The image storage is not set up yet. Run supabase/client_content_storage.sql in Supabase.':(d.message||d.error||'Upload failed'));}
      setMedia(config.url+'/storage/v1/object/public/client-content/'+name.split('/').map(encodeURIComponent).join('/'),file.type.indexOf('video/')===0?'video':'image');}
    catch(e){formMessage(e.message,true);}finally{bar.hidden=true;}
  }
  async function removePost(){if(!state.editing||!confirm('Delete this post? The client will no longer see it.'))return;try{await api('/rest/v1/content_items?id=eq.'+encodeURIComponent(state.editing.id),{method:'DELETE'});await loadItems();render();closeEditor();message('Post deleted.');}catch(e){formMessage(e.message,true);}}
  function duplicate(){var item=state.editing;if(!item)return;openEditor(null,item.date);var copy=Object.assign({},item);form.elements.topic.value=copy.topic+' (copy)';form.elements.caption.value=copy.caption;form.elements.time.value=copy.time;form.elements.format.value=copy.format||'Post';$$('input[name=platforms]',form).forEach(function(cb){cb.checked=copy.platforms.map(V.platformKey).indexOf(V.platformKey(cb.value))>-1;});setMedia(copy.image,copy.mediaType);updateCount();formMessage('Copy ready — change the date, then save.');}
  async function askAgain(){var item=state.editing;if(!item)return;try{await api('/rest/v1/content_items?id=eq.'+encodeURIComponent(item.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({client_decision:null,client_comment:null,decided_at:null,status:'ready_for_approval',client_visible:true,updated_at:new Date().toISOString()})});item.decision='';item.comment='';$('[data-cc-feedback]',form).hidden=true;form.elements.status.value='ready_for_approval';await loadItems();render();formMessage('The client can review this post again.');}catch(e){formMessage(e.message,true);}}
  async function move(id,date){var item=state.items.find(function(i){return i.id===id;});if(!item||item.date===date)return;var old=item.date;item.date=date;render();try{await api('/rest/v1/content_items?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({publish_date:date,updated_at:new Date().toISOString()})});message('“'+item.topic+'” moved to '+new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(V.parse(date))+'.');}catch(e){item.date=old;render();message(e.message,true);}}

  // ── Events ──
  $('[data-cc-client]',page).addEventListener('change',function(e){selectClient(e.target.value);});
  page.addEventListener('click',function(e){
    var t=e.target;
    var nav=t.closest('[data-cc-nav]');if(nav){var step=nav.dataset.ccNav,a=state.anchor;state.anchor=step==='today'?new Date():state.view==='week'?new Date(a.getFullYear(),a.getMonth(),a.getDate()+(step==='next'?7:-7)):new Date(a.getFullYear(),a.getMonth()+(step==='next'?1:-1),1);render();return;}
    var view=t.closest('[data-cc-view]');if(view){state.view=view.dataset.ccView;try{localStorage.setItem(VIEW_KEY,state.view);}catch(err){}render();return;}
    var filter=t.closest('[data-cc-filter]');if(filter){state.filter=filter.dataset.ccFilter;render();return;}
    if(t.closest('[data-cc-new]')){openEditor(null,'');return;}
    var add=t.closest('[data-ccv-add]');if(add){openEditor(null,add.dataset.ccvAdd);return;}
    var open=t.closest('[data-ccv-open]');if(open){var item=state.items.find(function(i){return i.id===open.dataset.ccvOpen;});if(item)openEditor(item);}
  });
  V.enableDrag($('[data-cc-board]',page),move);
  drawer.addEventListener('click',function(e){var t=e.target;if(t===drawer||t.closest('[data-cc-close]')){closeEditor();return;}if(t.closest('[data-cc-browse]')){$('[data-cc-file]',form).click();return;}if(t.closest('[data-cc-media-remove]')){setMedia('','');return;}if(t.closest('[data-cc-delete]')){removePost();return;}if(t.closest('[data-cc-duplicate]')){duplicate();return;}if(t.closest('[data-cc-ask-again]')){askAgain();return;}if(t.closest('[data-cc-send]')){save('ready_for_approval');}});
  drawer.addEventListener('cancel',function(){state.editing=null;});
  form.addEventListener('submit',function(e){e.preventDefault();save();});
  form.addEventListener('input',function(e){if(e.target.name==='caption')updateCount();if(e.target.matches('[data-cc-image-url]'))setMedia(e.target.value.trim(),'');});
  form.addEventListener('change',function(e){if(e.target.name==='platforms')updateCount();if(e.target.name==='status')syncLinkField();if(e.target.matches('[data-cc-file]')&&e.target.files[0]){upload(e.target.files[0]);e.target.value='';}});
  var drop=$('[data-cc-drop]',form);
  drop.addEventListener('click',function(e){if(e.target.closest('[data-cc-drop-empty]')&&!e.target.closest('button'))$('[data-cc-file]',form).click();});
  ['dragenter','dragover'].forEach(function(type){drop.addEventListener(type,function(e){e.preventDefault();drop.classList.add('is-over');});});
  ['dragleave','drop'].forEach(function(type){drop.addEventListener(type,function(e){e.preventDefault();drop.classList.remove('is-over');});});
  drop.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)upload(f);});

  async function show(){
    render();
    if(!state.loaded){try{await loadClients();state.loaded=true;}catch(e){message(e.message,true);return;}}
    if(state.clientId&&client())await selectClient(state.clientId);else{state.clientId='';render();}
  }
  window.SBCalendar={show:show};
  var dash=document.querySelector('[data-dashboard]');if((location.hash==='#calendar'||location.hash==='#content')&&dash&&!dash.hidden)show();
})();
