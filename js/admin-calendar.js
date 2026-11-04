/* Admin → Client portal → Content calendar.
   Pick a client, then plan their posts on a month / week calendar (rows in
   public.content_items): carousel media upload, channels, date, time, caption
   (templates, hashtag groups, AI assistant), approval deadline, internal notes,
   results, weekly repeat. Preview as Instagram / Facebook / Story, version
   history, conversation with the client, inbox + attention banner across
   clients, copy a week to another client, per-client tone and summary emails. */
(function(){
  'use strict';
  var config=window.SB_SUPABASE,V=window.SBContentCalendar,SESSION='sb_admin_session',CLIENT_KEY='sb_cc_client',VIEW_KEY='sb_cc_view';
  var page=document.querySelector('[data-view="calendar"]');if(!page||!config||!V)return;
  var $=function(s,r){return (r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));},esc=V.esc;
  var STATUS={idea:'Idea',draft:'Draft',design_in_progress:'In design',ready_for_approval:'Pending approval',approved:'Approved',scheduled:'Scheduled',published:'Published'};
  var SHORT={ready_for_approval:'Pending'};
  var DECISION={approved:'Approved by the client',rejected:'Rejected by the client',changes_requested:'Change requested by the client'};
  var FILTERS=[['all','All'],['draft','Drafts'],['ready_for_approval','Pending approval'],['approved','Approved'],['scheduled','Scheduled'],['published','Published'],['feedback','Needs changes'],['messages','New messages']];
  var LIMITS={instagram:2200,tiktok:2200,facebook:63206,linkedin:3000,youtube:5000,google:1500,pinterest:500};
  var METRICS=[['reach','Reach'],['likes','Likes'],['comments','Comments'],['shares','Shares'],['saves','Saves'],['clicks','Link clicks']];
  var PRO_KEYS=['media','approval_deadline','internal_notes','metrics'],TIME_KEYS=['publish_time','media_type'];
  var SETUP_PRO='Run supabase/content_calendar_pro.sql in Supabase to save carousels, deadlines, notes and results.';
  var state={clients:[],clientId:'',items:[],view:'month',anchor:new Date(),filter:'all',loaded:false,editing:null,timeSupported:true,proSupported:true,chatSupported:true,templates:null,threadRows:[],pv:{network:'',index:0},attention:{unread:[],waiting:[]}};
  try{state.clientId=localStorage.getItem(CLIENT_KEY)||'';state.view=localStorage.getItem(VIEW_KEY)==='week'?'week':'month';}catch(e){}

  // ── API (admin session with refresh) ──
  function session(){try{return JSON.parse(localStorage.getItem(SESSION)||'null');}catch(e){return null;}}
  async function refresh(s){var r=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok)return null;var fresh=await r.json();localStorage.setItem(SESSION,JSON.stringify(fresh));return fresh;}
  async function api(path,options,retried){var s=session(),opts=Object.assign({},options||{}),headers=Object.assign({apikey:config.key,Authorization:'Bearer '+(s?s.access_token:config.key)},opts.headers||{});if(opts.body&&!headers['Content-Type'])headers['Content-Type']='application/json';opts.headers=headers;var r=await fetch(config.url+path,opts);
    if(r.status===401&&!retried&&s&&s.refresh_token&&await refresh(s))return api(path,options,true);
    if(!r.ok){var d=await r.json().catch(function(){return{};});throw new Error(d.message||d.error||d.hint||'Request failed');}
    if(r.status===204)return null;var text=await r.text();return text?JSON.parse(text):null;}
  function isSchemaError(e){return /column|schema cache|does not exist/i.test(String(e&&e.message||''));}
  function iso(d){return V.iso(d);}
  function addDays(dateStr,n){var d=V.parse(dateStr);d.setDate(d.getDate()+n);return iso(d);}
  var fmtDay=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}),fmtWhen=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'});

  // ── Data ──
  function normalise(row){var media=Array.isArray(row.media)?row.media.filter(function(m){return m&&m.url;}):[];if(!media.length&&row.visual_url)media=[{url:row.visual_url,type:row.media_type||(V.isVideo({image:row.visual_url})?'video':'image')}];
    return{id:row.id,date:row.publish_date||'',time:(row.publish_time||'').slice(0,5),platforms:V.platformList(row.platform),format:row.content_type||'',topic:row.topic||'',caption:row.caption||'',image:media[0]?media[0].url:'',mediaType:media[0]?media[0].type:'',media:media,status:STATUS[row.status]?row.status:'draft',decision:row.client_decision||'',comment:row.client_comment||'',decidedAt:row.decided_at||'',visible:row.client_visible!==false,link:row.publication_url||'',deadline:row.approval_deadline||'',notes:row.internal_notes||'',metrics:row.metrics||{},seenAt:row.client_seen_at||'',sentAt:row.sent_for_approval_at||'',commentCount:0,unread:0};}
  async function loadClients(){state.clients=await api('/rest/v1/clients?select=*&order=business_name')||[];renderClientSelect();}
  async function loadItems(){if(!state.clientId){state.items=[];return;}var rows=await api('/rest/v1/content_items?client_id=eq.'+encodeURIComponent(state.clientId)+'&select=*&order=publish_date.asc.nullslast')||[];state.items=rows.map(normalise);
    if(rows.length){state.timeSupported=Object.prototype.hasOwnProperty.call(rows[0],'publish_time');state.proSupported=Object.prototype.hasOwnProperty.call(rows[0],'approval_deadline');}await loadCommentCounts();}
  async function loadCommentCounts(){try{var rows=await api('/rest/v1/content_comments?client_id=eq.'+encodeURIComponent(state.clientId)+'&select=content_id,author,seen_by_agency')||[];state.chatSupported=true;var map={};rows.forEach(function(r){var m=map[r.content_id]=map[r.content_id]||{count:0,unread:0};m.count++;if(r.author==='client'&&!r.seen_by_agency)m.unread++;});state.items.forEach(function(i){var m=map[i.id];i.commentCount=m?m.count:0;i.unread=m?m.unread:0;});}catch(e){state.chatSupported=false;}}
  function client(id){id=id||state.clientId;return state.clients.find(function(c){return c.id===id;})||null;}
  function clientName(id){var c=client(id);return c?c.business_name:'—';}

  // ── Rendering ──
  function message(text,isError){var el=$('[data-cc-message]',page);if(el){el.textContent=text||'';el.classList.toggle('is-error',!!isError);}}
  function renderClientSelect(){var sel=$('[data-cc-client]',page);sel.innerHTML='<option value="">Select a client…</option>'+state.clients.map(function(c){return '<option value="'+esc(c.id)+'"'+(c.id===state.clientId?' selected':'')+'>'+esc(c.business_name)+(c.status&&c.status!=='active'?' ('+esc(c.status)+')':'')+'</option>';}).join('');if(state.clientId&&!client())state.clientId='';updateAvatar();}
  function updateAvatar(){var c=client();$('[data-cc-avatar]',page).textContent=c?(c.business_name||'?').trim().charAt(0).toUpperCase():'?';}
  function matches(item,f){f=f||state.filter;if(f==='all')return true;if(f==='feedback')return item.decision==='changes_requested'||item.decision==='rejected';if(f==='messages')return item.unread>0;if(f==='draft')return ['idea','draft','design_in_progress'].indexOf(item.status)>-1;return item.status===f;}
  function periodLabel(){if(state.view==='week'){var s=V.weekStart(state.anchor),e=new Date(s);e.setDate(s.getDate()+6);return fmtDay.format(s)+' – '+fmtDay.format(e)+' '+e.getFullYear();}return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(state.anchor);}
  function renderFilters(){$('[data-cc-filters]',page).innerHTML=FILTERS.map(function(f){var n=state.items.filter(function(i){return matches(i,f[0]);}).length;return '<button type="button" class="cc-filter cc-filter--'+f[0]+(state.filter===f[0]?' is-active':'')+'" data-cc-filter="'+f[0]+'" aria-pressed="'+(state.filter===f[0])+'">'+esc(f[1])+'<b>'+n+'</b></button>';}).join('');}
  function cardOptions(){return{locale:'en-GB',statusLabel:function(i){return SHORT[i.status]||STATUS[i.status];},decisionLabel:function(d){return DECISION[d];},unreadLabel:'New message from the client',
    deadlineText:function(i){return 'Approve by '+fmtDay.format(V.parse(i.deadline));},
    extraHtml:function(i){var flags='';if(i.notes)flags+='<span title="Internal note: '+esc(i.notes)+'">📝</span>';if(i.status==='ready_for_approval'&&i.seenAt&&!i.decision)flags+='<span title="Seen by the client '+esc(fmtWhen.format(new Date(i.seenAt)))+'">👁 Seen</span>';return flags?'<span class="ccv-flags">'+flags+'</span>':'';}};}
  function render(){
    var has=!!state.clientId;$('[data-cc-pick]',page).hidden=has;$('[data-cc-body]',page).hidden=!has;$('[data-cc-new]',page).disabled=!has;$('[data-cc-settings-open]',page).disabled=!has;
    var copy=$('[data-cc-copy-open]',page);copy.hidden=state.view!=='week';copy.disabled=!has;
    $$('[data-cc-view]',page).forEach(function(b){b.classList.toggle('is-active',b.dataset.ccView===state.view);b.setAttribute('aria-pressed',b.dataset.ccView===state.view);});
    $('[data-cc-period]',page).textContent=periodLabel();renderAttention();
    if(!has)return;renderFilters();
    var visible=state.items.filter(function(i){return matches(i);});
    V.render($('[data-cc-board]',page),Object.assign(cardOptions(),{items:visible,view:state.view,anchor:state.anchor,editable:true,labels:{add:'Add a post on'}}));
    var undated=visible.filter(function(i){return !V.isDate(i.date);}),box=$('[data-cc-unscheduled]',page);box.hidden=!undated.length;
    $('[data-cc-unscheduled-grid]',page).innerHTML=undated.map(function(i){return '<div class="ccv">'+cardFor(i)+'</div>';}).join('');
  }
  function cardFor(i){var tmp=document.createElement('div');V.render(tmp,Object.assign(cardOptions(),{items:[Object.assign({},i,{date:'2000-01-03'})],view:'week',anchor:new Date(2000,0,3),editable:false}));var card=tmp.querySelector('.ccv-card');return card?card.outerHTML:'';}

  async function selectClient(id,keepAnchor){state.clientId=id;try{localStorage.setItem(CLIENT_KEY,id);}catch(e){}renderClientSelect();state.filter='all';state.items=[];render();if(!id)return;message('Loading posts…');try{await loadItems();message('');
      if(!keepAnchor){var today=iso(new Date()),upcoming=state.items.filter(function(i){return V.isDate(i.date)&&i.date>=today;})[0];state.anchor=upcoming&&state.view==='month'?V.parse(upcoming.date):new Date();}render();}
    catch(e){message(/content_items/.test(e.message)?'The content table is missing. Run supabase/client_dashboard_setup.sql in Supabase.':e.message,true);}}

  // ── Attention banner, inbox and bell (all clients) ──
  async function loadAttention(){
    try{var unread=await api('/rest/v1/content_comments?author=eq.client&seen_by_agency=eq.false&select=id,body,kind,created_at,client_id,content_id,author_name,pin_x&order=created_at.desc&limit=200')||[];state.attention.unread=unread;}catch(e){state.attention.unread=[];}
    try{var cutoff=new Date(Date.now()-3*864e5).toISOString(),waiting=await api('/rest/v1/content_items?status=eq.ready_for_approval&client_decision=is.null&select=*')||[];
      state.attention.waiting=waiting.filter(function(r){var sent=r.sent_for_approval_at||r.updated_at||r.created_at;return sent&&sent<cutoff;});}catch(e){state.attention.waiting=[];}
    var ids=state.attention.unread.map(function(m){return m.content_id;}).filter(function(v,i,a){return a.indexOf(v)===i;});state.attention.topics={};
    if(ids.length){try{(await api('/rest/v1/content_items?id=in.('+ids.map(encodeURIComponent).join(',')+')&select=id,topic,publish_date,client_id')||[]).forEach(function(r){state.attention.topics[r.id]=r;});}catch(e){}}
    renderAttention();updateBell();}
  function renderAttention(){var box=$('[data-cc-attention]',page);if(!box)return;var per={};
    state.attention.unread.forEach(function(m){(per[m.client_id]=per[m.client_id]||{unread:0,waiting:0}).unread++;});
    state.attention.waiting.forEach(function(r){(per[r.client_id]=per[r.client_id]||{unread:0,waiting:0}).waiting++;});
    var ids=Object.keys(per);box.hidden=!ids.length;
    box.innerHTML='<strong>Needs your attention</strong>'+ids.map(function(id){var p=per[id],bits=[];if(p.waiting)bits.push(p.waiting+' waiting > 3 days');if(p.unread)bits.push(p.unread+' unread message'+(p.unread>1?'s':''));return '<button type="button" class="cc-attention__chip" data-cc-attention-client="'+esc(id)+'" data-cc-attention-filter="'+(p.unread?'messages':'ready_for_approval')+'"><b>'+esc(clientName(id))+'</b> '+esc(bits.join(' · '))+'</button>';}).join('');
    var count=state.attention.unread.length,badge=$('[data-cc-inbox-count]',page);if(badge){badge.textContent=count;badge.hidden=!count;}}
  function updateBell(){var dot=$('.topbar-bell i');if(dot)dot.hidden=!state.attention.unread.length;var bell=$('.topbar-bell');if(bell)bell.setAttribute('aria-label',state.attention.unread.length?state.attention.unread.length+' unread client messages':'Client messages');}
  var inbox=$('[data-cc-inbox]');
  function openInbox(){var list=state.attention.unread,body=$('[data-cc-inbox-body]',inbox);
    body.innerHTML=list.length?list.map(function(m){var t=state.attention.topics[m.content_id]||{};return '<button type="button" class="cc-inbox__row" data-cc-inbox-item="'+esc(m.content_id)+'" data-client="'+esc(m.client_id)+'"><span class="cc-inbox__avatar">'+esc(clientName(m.client_id).charAt(0))+'</span><span class="cc-inbox__main"><strong>'+esc(clientName(m.client_id))+'</strong><small>'+esc(t.topic||'Post')+(t.publish_date?' · '+esc(fmtDay.format(V.parse(t.publish_date))):'')+'</small><span>'+(m.kind&&m.kind!=='message'?'<em>'+esc(DECISION[m.kind]||m.kind)+'</em> ':'')+(m.pin_x!==null&&m.pin_x!==undefined?'📍 ':'')+esc(m.body||'')+'</span></span><time>'+esc(fmtWhen.format(new Date(m.created_at)))+'</time></button>';}).join(''):'<p class="cc-inbox__empty">No unread client messages. 🎉</p>';
    if(typeof inbox.showModal==='function'&&!inbox.open)inbox.showModal();else inbox.setAttribute('open','');}
  if(inbox)inbox.addEventListener('click',async function(e){if(e.target===inbox||e.target.closest('[data-cc-inbox-close]')){inbox.close();return;}var row=e.target.closest('[data-cc-inbox-item]');if(!row)return;inbox.close();if(state.clientId!==row.dataset.client)await selectClient(row.dataset.client);var item=state.items.find(function(i){return i.id===row.dataset.ccInboxItem;});if(item){if(V.isDate(item.date)){state.anchor=V.parse(item.date);render();}openEditor(item);}});
  document.addEventListener('click',function(e){var bell=e.target.closest('.topbar-bell');if(!bell)return;e.preventDefault();if(location.hash!=='#calendar')location.hash='#calendar';setTimeout(openInbox,80);});

  // ── Editor drawer ──
  var drawer=$('[data-cc-drawer]'),form=$('[data-cc-form]'),pending={media:[]};
  $$('[data-cc-pf-icon]',form).forEach(function(el){el.innerHTML=V.platformIcon(el.dataset.ccPfIcon,16);});
  $('[data-cc-metrics]',form).innerHTML=METRICS.map(function(m){return '<label class="cc-field">'+m[1]+'<input type="number" min="0" step="1" name="m_'+m[0]+'" inputmode="numeric"></label>';}).join('');
  function formMessage(t,isError){var el=$('[data-cc-form-message]',form);el.textContent=t||'';el.classList.toggle('is-error',!!isError);}
  function renderMedia(){var list=pending.media,strip=$('[data-cc-media-strip]',form),has=list.length>0;$('[data-cc-drop-empty-title]',form).textContent=has?'Add more images or videos':'Drop images or videos here';$('[data-cc-drop]',form).classList.toggle('has-media',has);
    strip.hidden=!has;strip.innerHTML=list.map(function(m,i){return '<div class="cc-thumb'+(i===0?' is-cover':'')+'">'+(m.type==='video'?'<video src="'+esc(m.url)+'#t=0.5" muted playsinline preload="metadata"></video><i class="ccv-play"></i>':'<img src="'+esc(m.url)+'" alt="">')+(i===0?'<span class="cc-thumb__cover">Cover</span>':'')
      +'<div class="cc-thumb__tools"><button type="button" data-cc-media-move="'+i+'" data-dir="-1" aria-label="Move left"'+(i===0?' disabled':'')+'>‹</button><button type="button" data-cc-media-move="'+i+'" data-dir="1" aria-label="Move right"'+(i===list.length-1?' disabled':'')+'>›</button><button type="button" data-cc-media-delete="'+i+'" aria-label="Remove">✕</button></div></div>';}).join('')
      +(list.length>1?'<p class="cc-thumb__hint">Carousel of '+list.length+' — the first one is the cover.</p>':'');
    if(currentPane==='preview')renderPreview();}
  function addMedia(url,type){url=String(url||'').trim();if(!url)return;pending.media.push({url:url,type:type||(V.isVideo({image:url})?'video':'image')});renderMedia();}
  function updateCount(){var len=form.elements.caption.value.length,chosen=$$('input[name=platforms]:checked',form).map(function(c){return V.platformKey(c.value);}),limit=chosen.reduce(function(m,k){return LIMITS[k]&&LIMITS[k]<m?LIMITS[k]:m;},Infinity),el=$('[data-cc-count]',form);el.textContent=isFinite(limit)?len+' / '+limit:len+' characters';el.classList.toggle('is-over',isFinite(limit)&&len>limit);}
  function syncStatusFields(){var published=form.elements.status.value==='published';$('[data-cc-link-field]',form).hidden=!published;$('[data-cc-results]',form).hidden=!published;}
  function feedbackHtml(item){if(!item||!item.decision||!DECISION[item.decision])return '';var when=item.decidedAt?fmtWhen.format(new Date(item.decidedAt)):'';return '<div class="cc-feedback__box cc-feedback__box--'+esc(item.decision)+'"><div><strong>'+esc(DECISION[item.decision])+'</strong>'+(when?'<small>'+esc(when)+'</small>':'')+(item.comment?'<p>“'+esc(item.comment)+'”</p>':'')+'</div><button type="button" class="secondary" data-cc-ask-again>Ask the client again</button></div>';}

  // Tabs: edit / preview / history
  var currentPane='edit';
  function showPane(name){currentPane=name;$$('[data-cc-tab]',form).forEach(function(b){var on=b.dataset.ccTab===name;b.classList.toggle('is-active',on);b.setAttribute('aria-selected',on);});$$('[data-cc-pane]',form).forEach(function(p){p.hidden=p.dataset.ccPane!==name;});if(name==='preview')renderPreview();if(name==='history')loadHistory();}
  function formItem(){var platforms=$$('input[name=platforms]:checked',form).map(function(c){return c.value;});return{id:state.editing?state.editing.id:'new',date:form.elements.date.value,time:form.elements.time.value,platforms:platforms,format:form.elements.format.value,topic:form.elements.topic.value,caption:form.elements.caption.value,media:pending.media,image:pending.media[0]?pending.media[0].url:'',metrics:readMetrics()};}
  function renderPreview(){var item=formItem(),nets=V.previewNetworks(item);if(nets.indexOf(state.pv.network)<0)state.pv.network=nets[0];
    $('[data-cc-pv-tabs]',form).innerHTML=nets.map(function(n){return '<button type="button" data-cc-pv-net="'+n+'" class="'+(n===state.pv.network?'is-active':'')+'">'+V.platformIcon(n==='story'?'instagram':n,14)+(n==='story'?'Story / Reel':n==='facebook'?'Facebook':'Instagram')+'</button>';}).join('');
    $('[data-cc-pv]',form).innerHTML=V.previewHtml(item,{network:state.pv.network,index:state.pv.index,name:clientName(),locale:'en-GB',pins:V.pinsFrom(state.threadRows),labels:{likes:'likes',likesPlaceholder:'Liked by your followers',comments:'comments',like:'Like',comment:'Comment',share:'Share'}});}
  async function loadHistory(){var box=$('[data-cc-history]',form),item=state.editing;if(!item){box.innerHTML='<p class="cc-muted">Save the post first. Earlier versions appear here once the client has seen it and you change the text or visuals.</p>';return;}
    box.innerHTML='<p class="cc-muted">Loading…</p>';
    try{var rows=await api('/rest/v1/content_versions?content_id=eq.'+encodeURIComponent(item.id)+'&select=*&order=created_at.desc')||[];state.versions=rows;$('[data-cc-history-count]',form).textContent=rows.length||'';
      box.innerHTML=rows.length?rows.map(function(v,n){var media=V.mediaList({media:v.media,image:v.visual_url});return '<article class="cc-version"><header><strong>Version from '+esc(fmtWhen.format(new Date(v.created_at)))+'</strong><button type="button" class="secondary" data-cc-restore="'+n+'">Restore into the editor</button></header><div class="cc-version__body">'+(media.length?'<div class="cc-version__media">'+media.slice(0,4).map(function(m){return m.type==='video'?'<video src="'+esc(m.url)+'#t=0.5" muted></video>':'<img src="'+esc(m.url)+'" alt="">';}).join('')+'</div>':'')+'<p>'+esc(v.caption||'(no caption)')+'</p></div></article>';}).join(''):'<p class="cc-muted">No earlier versions yet. When you change the caption or visuals of a post the client has already received, the previous version is kept here and the client can compare before / after.</p>';}
    catch(e){box.innerHTML='<p class="cc-muted">'+esc(isSchemaError(e)?SETUP_PRO:e.message)+'</p>';}}
  function restoreVersion(n){var v=(state.versions||[])[n];if(!v)return;form.elements.caption.value=v.caption||'';pending.media=V.mediaList({media:v.media,image:v.visual_url});renderMedia();updateCount();showPane('edit');formMessage('Earlier version restored in the editor — Save to keep it.');}

  // ── Conversation on the post ──
  var KINDS={approved:'Post approved',rejected:'Post rejected',changes_requested:'Change requested',sent_for_approval:'Sent for approval'},poller=null;
  function stopPolling(){if(poller){clearInterval(poller);poller=null;}}
  function threadMessage(t,isError){var el=$('[data-cc-thread-msg]',form);if(el){el.textContent=t||'';el.classList.toggle('is-error',!!isError);}}
  async function loadThread(item,quiet){var box=$('[data-cc-thread]',form);if(!item||!box)return;
    try{var rows=await api('/rest/v1/content_comments?content_id=eq.'+encodeURIComponent(item.id)+'&select=*&order=created_at.asc')||[];if(state.editing!==item)return;state.threadRows=rows;var atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<40;
      box.innerHTML=V.threadHtml(rows,{viewer:'agency',locale:'en-GB',labels:{empty:'No messages yet. Write to the client about this post.',you:'You (SB Marketing)',kinds:KINDS,pinned:'Pinned on the picture — see Preview'}});if(!quiet||atBottom)box.scrollTop=box.scrollHeight;
      var unseen=rows.some(function(r){return r.author==='client'&&!r.seen_by_agency;});
      if(unseen){await api('/rest/v1/content_comments?content_id=eq.'+encodeURIComponent(item.id)+'&author=eq.client&seen_by_agency=eq.false',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({seen_by_agency:true})});state.attention.unread=state.attention.unread.filter(function(m){return m.content_id!==item.id;});renderAttention();updateBell();}
      if(item.unread||item.commentCount!==rows.length){item.unread=0;item.commentCount=rows.length;render();}
      if(currentPane==='preview')renderPreview();}
    catch(e){if(!quiet)box.innerHTML='<p class="ccv-thread__empty">Messages could not be loaded: '+esc(e.message)+'</p>';}}
  async function sendThread(){var item=state.editing,field=$('[data-cc-thread-input]',form),body=String(field.value||'').trim(),button=$('[data-cc-thread-send]',form);if(!item||!body)return;button.disabled=true;threadMessage('');
    try{await api('/rest/v1/content_comments',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({content_id:item.id,client_id:state.clientId,author:'agency',author_name:'SB Marketing',kind:'message',body:body,seen_by_agency:true})});field.value='';await loadThread(item);}
    catch(e){threadMessage('Message not sent: '+e.message,true);}finally{button.disabled=false;field.focus();}}
  async function logEvent(contentId,kind){if(!state.chatSupported||!contentId)return;try{await api('/rest/v1/content_comments',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({content_id:contentId,client_id:state.clientId,author:'agency',author_name:'SB Marketing',kind:kind,body:'',seen_by_agency:true})});}catch(e){}}

  function readMetrics(){var m={};METRICS.forEach(function(x){var v=form.elements['m_'+x[0]].value;if(v!=='')m[x[0]]=Number(v);});return m;}
  function openEditor(item,presetDate){
    if(!state.clientId)return;state.editing=item||null;state.threadRows=[];state.pv={network:'',index:0};form.reset();formMessage('');closeMenus();$('[data-cc-ai-result]',form).hidden=true;var c=client();
    $('[data-cc-form-client]',form).textContent=c?c.business_name:'';$('[data-cc-form-title]',form).textContent=item?'Edit post':'New post';
    var seen=$('[data-cc-seen]',form);seen.textContent=item&&item.seenAt?'👁 Seen by the client on '+fmtWhen.format(new Date(item.seenAt)):item&&item.status==='ready_for_approval'?'Not opened by the client yet':'';seen.hidden=!seen.textContent;
    $('[data-cc-delete]',form).hidden=!item;$('[data-cc-duplicate]',form).hidden=!item;$('[data-cc-history-count]',form).textContent='';
    var fb=$('[data-cc-feedback]',form);fb.innerHTML=feedbackHtml(item);fb.hidden=!fb.innerHTML;
    var it=item||{date:presetDate||'',time:'',platforms:['Instagram'],format:'Post',topic:'',caption:'',status:'draft',visible:true,link:'',media:[],deadline:'',notes:'',metrics:{}};
    form.elements.date.value=V.isDate(it.date)?it.date.slice(0,10):'';form.elements.time.value=it.time||'';form.elements.topic.value=it.topic;form.elements.caption.value=it.caption;form.elements.status.value=it.status;form.elements.visible.checked=it.visible!==false;form.elements.link.value=it.link||'';
    form.elements.deadline.value=it.deadline||'';form.elements.notes.value=it.notes||'';form.elements.repeat.value='0';
    METRICS.forEach(function(x){var v=(it.metrics||{})[x[0]];form.elements['m_'+x[0]].value=v===undefined||v===null?'':v;});
    var fmt=form.elements.format;if(it.format&&!Array.prototype.some.call(fmt.options,function(o){return o.value===it.format;}))fmt.add(new Option(it.format,it.format));fmt.value=it.format||'Post';
    var chosen=it.platforms.map(V.platformKey);$$('input[name=platforms]',form).forEach(function(cb){cb.checked=chosen.indexOf(V.platformKey(cb.value))>-1;});
    pending.media=(it.media||[]).map(function(m){return{url:m.url,type:m.type};});renderMedia();updateCount();syncStatusFields();showPane('edit');
    var openedWithUnread=!!(item&&item.unread),thread=$('[data-cc-thread-section]',form);thread.hidden=!item||!state.chatSupported;threadMessage('');$('[data-cc-thread-input]',form).value='';stopPolling();
    if(item&&state.chatSupported){$('[data-cc-thread]',form).innerHTML='<p class="ccv-thread__empty">Loading…</p>';loadThread(item).then(function(){if(openedWithUnread)thread.scrollIntoView({block:'nearest'});});poller=setInterval(function(){if(!drawer.open||state.editing!==item){stopPolling();return;}loadThread(item,true);},15000);}
    $('[data-cc-send]',form).hidden=it.status==='published';
    if(typeof drawer.showModal==='function')drawer.showModal();else drawer.setAttribute('open','');setTimeout(function(){form.elements.topic.focus({preventScroll:true});$('.cc-form__body',form).scrollTop=0;},50);
  }
  function closeEditor(){stopPolling();closeMenus();if(drawer.open)drawer.close();state.editing=null;}
  function payloadFromForm(statusOverride){var platforms=$$('input[name=platforms]:checked',form).map(function(c){return c.value;}),status=statusOverride||form.elements.status.value,first=pending.media[0]||null,
      p={client_id:state.clientId,publish_date:form.elements.date.value||null,platform:platforms.join(', ')||null,content_type:form.elements.format.value||null,topic:form.elements.topic.value.trim(),caption:form.elements.caption.value.trim()||null,visual_url:first?first.url:null,status:status,client_visible:form.elements.visible.checked,publication_url:status==='published'?(form.elements.link.value.trim()||null):null,updated_at:new Date().toISOString()};
    if(state.timeSupported){p.publish_time=form.elements.time.value||null;p.media_type=first?first.type:null;}
    if(state.proSupported){p.media=pending.media;p.approval_deadline=form.elements.deadline.value||null;p.internal_notes=form.elements.notes.value.trim()||null;p.metrics=readMetrics();}
    return p;}
  async function save(statusOverride){
    var p=payloadFromForm(statusOverride);if(!p.topic){formMessage('Add a title so the post is easy to find in the calendar.',true);showPane('edit');form.elements.topic.focus();return;}
    if(statusOverride==='ready_for_approval'&&!p.publish_date){formMessage('Pick a date before sending the post for approval.',true);showPane('edit');form.elements.date.focus();return;}
    if(statusOverride==='ready_for_approval'){p.client_visible=true;if(state.editing&&state.editing.decision){p.client_decision=null;p.client_comment=null;p.decided_at=null;}
      if(state.proSupported&&!p.approval_deadline){var today=iso(new Date()),d=addDays(p.publish_date,-2);p.approval_deadline=d>today?d:addDays(today,1)>p.publish_date?p.publish_date:addDays(today,1);}}
    var repeat=Number(form.elements.repeat.value)||0;if(repeat>1&&!p.publish_date){formMessage('Pick a date to repeat the post every week.',true);return;}
    var buttons=$$('.cc-form__foot button',form);buttons.forEach(function(b){b.disabled=true;});formMessage('Saving…');
    try{var savedId=await write(p,state.editing);if(statusOverride==='ready_for_approval')await logEvent(savedId,'sent_for_approval');
      var copies=0;for(var k=1;k<repeat;k++){var cp=Object.assign({},p,{publish_date:addDays(p.publish_date,7*k)});if(cp.approval_deadline)cp.approval_deadline=addDays(cp.approval_deadline,7*k);delete cp.client_decision;delete cp.client_comment;delete cp.decided_at;await write(cp,null);copies++;}
      await loadItems();render();closeEditor();message((statusOverride==='ready_for_approval'?'Sent to the client for approval. They will get one email with today’s posts.':'Post saved.')+(copies?' '+copies+' weekly cop'+(copies>1?'ies':'y')+' created.':''));}
    catch(e){formMessage(e.message,true);}finally{buttons.forEach(function(b){b.disabled=false;});}
  }
  async function write(p,target){var path=target?'/rest/v1/content_items?id=eq.'+encodeURIComponent(target.id):'/rest/v1/content_items',method=target?'PATCH':'POST',opts=function(){return{method:method,headers:{Prefer:'return=representation'},body:JSON.stringify(p)};},rows;
    try{rows=await api(path,opts());}
    catch(e){if(!isSchemaError(e))throw e;var stripped=false;PRO_KEYS.concat(TIME_KEYS).forEach(function(k){if(k in p){delete p[k];stripped=true;}});if(!stripped)throw e;state.proSupported=false;rows=await api(path,opts());message('Saved, but some fields were skipped. '+SETUP_PRO,true);}
    return rows&&rows[0]&&rows[0].id||(target&&target.id)||'';}
  async function uploadFile(file,clientId){
    if(!/^(image|video)\//.test(file.type))throw new Error('“'+file.name+'” is not an image or a video.');if(file.size>50*1024*1024)throw new Error('“'+file.name+'” is larger than 50 MB.');
    var s=session(),name=clientId+'/calendar/'+Date.now()+'-'+Math.random().toString(36).slice(2,6)+'-'+file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_'),path=name.split('/').map(encodeURIComponent).join('/');
    var r=await fetch(config.url+'/storage/v1/object/client-content/'+path,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+(s?s.access_token:config.key),'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
    if(r.status===401&&s&&s.refresh_token&&await refresh(s))return uploadFile(file,clientId);
    if(!r.ok){var d=await r.json().catch(function(){return{};});throw new Error(/bucket/i.test(d.message||d.error||'')?'The image storage is not set up yet. Run supabase/client_content_storage.sql in Supabase.':(d.message||d.error||'Upload failed'));}
    return{url:config.url+'/storage/v1/object/public/client-content/'+path,type:file.type.indexOf('video/')===0?'video':'image'};}
  async function upload(files){if(!state.clientId||!files.length)return;var bar=$('[data-cc-progress]',form);bar.hidden=false;formMessage('');
    try{for(var i=0;i<files.length;i++){$('[data-cc-progress-text]',form).textContent='Uploading '+(i+1)+' / '+files.length+'…';pending.media.push(await uploadFile(files[i],state.clientId));renderMedia();}}
    catch(e){formMessage(e.message,true);}finally{bar.hidden=true;}}
  async function removePost(){if(!state.editing||!confirm('Delete this post? The client will no longer see it.'))return;try{await api('/rest/v1/content_items?id=eq.'+encodeURIComponent(state.editing.id),{method:'DELETE'});await loadItems();render();closeEditor();message('Post deleted.');}catch(e){formMessage(e.message,true);}}
  function duplicate(){var item=state.editing;if(!item)return;var copy=Object.assign({},item);openEditor(null,item.date);form.elements.topic.value=copy.topic+' (copy)';form.elements.caption.value=copy.caption;form.elements.time.value=copy.time;form.elements.format.value=copy.format||'Post';form.elements.notes.value=copy.notes||'';$$('input[name=platforms]',form).forEach(function(cb){cb.checked=copy.platforms.map(V.platformKey).indexOf(V.platformKey(cb.value))>-1;});pending.media=copy.media.slice();renderMedia();updateCount();formMessage('Copy ready — change the date, then save.');}
  async function askAgain(){var item=state.editing;if(!item)return;try{await api('/rest/v1/content_items?id=eq.'+encodeURIComponent(item.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({client_decision:null,client_comment:null,decided_at:null,status:'ready_for_approval',client_visible:true,updated_at:new Date().toISOString()})});await logEvent(item.id,'sent_for_approval');item.decision='';item.comment='';$('[data-cc-feedback]',form).hidden=true;form.elements.status.value='ready_for_approval';await loadItems();render();await loadThread(state.editing);formMessage('The client can review this post again.');}catch(e){formMessage(e.message,true);}}
  async function move(id,date){var item=state.items.find(function(i){return i.id===id;});if(!item||item.date===date)return;var old=item.date;item.date=date;render();try{await api('/rest/v1/content_items?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({publish_date:date,updated_at:new Date().toISOString()})});message('“'+item.topic+'” moved to '+new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(V.parse(date))+'.');}catch(e){item.date=old;render();message(e.message,true);}}

  // ── Templates & hashtag groups ──
  async function loadTemplates(){if(state.templates)return state.templates;try{state.templates=await api('/rest/v1/content_templates?select=*&order=name')||[];}catch(e){state.templates=null;throw e;}return state.templates;}
  function closeMenus(){$$('[data-cc-menu]',form).forEach(function(m){m.hidden=true;});}
  function insertAtCursor(text){var ta=form.elements.caption,start=ta.selectionStart,end=ta.selectionEnd,v=ta.value,sep=start>0&&!/\s$/.test(v.slice(0,start))?(text.charAt(0)==='#'?'\n\n':' '):'';ta.value=v.slice(0,start)+sep+text+v.slice(end);ta.focus();ta.selectionStart=ta.selectionEnd=start+sep.length+text.length;updateCount();}
  async function openMenu(kind){var menu=$('[data-cc-menu="'+kind+'"]',form);if(!menu.hidden){menu.hidden=true;return;}closeMenus();menu.hidden=false;menu.innerHTML='<p class="cc-muted">Loading…</p>';
    try{var list=(await loadTemplates()).filter(function(t){return t.kind===kind&&(!t.client_id||t.client_id===state.clientId);});
      menu.innerHTML=(list.length?list.map(function(t){return '<div class="cc-menu__row"><button type="button" class="cc-menu__item" data-cc-template="'+esc(t.id)+'"><strong>'+esc(t.name)+(t.client_id?' <small>· this client</small>':'')+'</strong><span>'+esc(t.body.slice(0,90))+'</span></button><button type="button" class="cc-menu__del" data-cc-template-del="'+esc(t.id)+'" aria-label="Delete">✕</button></div>';}).join(''):'<p class="cc-muted">'+(kind==='hashtags'?'No hashtag groups yet.':'No templates yet.')+'</p>')
        +'<button type="button" class="cc-menu__add" data-cc-template-save="'+kind+'">＋ '+(kind==='hashtags'?'Save the #hashtags of this caption as a group':'Save this caption as a template')+'</button>';}
    catch(e){menu.innerHTML='<p class="cc-muted">'+esc(isSchemaError(e)?SETUP_PRO:e.message)+'</p>';}}
  async function saveTemplate(kind){var body=kind==='hashtags'?(form.elements.caption.value.match(/#[\wÀ-ÿ-]+/g)||[]).join(' '):form.elements.caption.value.trim();if(!body){formMessage(kind==='hashtags'?'Add some #hashtags to the caption first.':'Write a caption first.',true);return;}
    var name=prompt(kind==='hashtags'?'Name of this hashtag group (e.g. Butcher – Nice):':'Template name (e.g. Weekend promo):');if(!name)return;var forClient=confirm('Keep it for '+clientName()+' only?\n\nOK = this client only · Cancel = all clients');
    try{await api('/rest/v1/content_templates',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({kind:kind,name:name.trim(),body:body,client_id:forClient?state.clientId:null})});state.templates=null;closeMenus();formMessage((kind==='hashtags'?'Hashtag group':'Template')+' saved.');}catch(e){formMessage(isSchemaError(e)?SETUP_PRO:e.message,true);}}
  async function deleteTemplate(id){if(!confirm('Delete this template?'))return;try{await api('/rest/v1/content_templates?id=eq.'+encodeURIComponent(id),{method:'DELETE'});state.templates=null;var open=$('[data-cc-menu]:not([hidden])',form);if(open){open.hidden=true;openMenu(open.dataset.ccMenu);}}catch(e){formMessage(e.message,true);}}

  // ── Caption assistant (supabase/functions/caption-assistant) ──
  async function assistant(mode){var c=client()||{},btns=$$('[data-cc-ai]',form),box=$('[data-cc-ai-result]',form);if(mode==='rewrite'&&!form.elements.caption.value.trim()){formMessage('Write a caption first, then ask for a rewrite.',true);return;}
    btns.forEach(function(b){b.disabled=true;});box.hidden=false;box.innerHTML='<p class="cc-muted">✨ Writing in '+esc(c.business_name||'the client')+'’s tone…</p>';
    var examples=state.items.filter(function(i){return i.caption&&(!state.editing||i.id!==state.editing.id);}).slice(-5).map(function(i){return i.caption;});
    try{var s=session(),r=await fetch(config.url+'/functions/v1/caption-assistant',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+(s?s.access_token:config.key),'Content-Type':'application/json'},body:JSON.stringify({mode:mode,business_name:c.business_name,activity:c.activity||'',language:c.language==='en'?'en':'fr',tone:c.brand_tone||'',examples:examples,topic:form.elements.topic.value,format:form.elements.format.value,platforms:$$('input[name=platforms]:checked',form).map(function(x){return x.value;}),caption:form.elements.caption.value,instructions:$('[data-cc-ai-hint]',form).value})});
      var data=await r.json().catch(function(){return{};});if(!r.ok||!data.caption)throw new Error(data.error||(r.status===404?'The caption assistant is not deployed yet: run “supabase functions deploy caption-assistant” and add the ANTHROPIC_API_KEY secret.':'The assistant is unavailable.'));
      box.innerHTML='<div class="cc-ai__text"></div><div class="cc-ai__actions"><button type="button" data-cc-ai-use>Use this caption</button><button type="button" class="secondary" data-cc-ai="'+mode+'">Try again</button><button type="button" class="secondary" data-cc-ai-dismiss>Dismiss</button></div>';$('.cc-ai__text',box).textContent=data.caption;}
    catch(e){box.innerHTML='<p class="form-message is-error">'+esc(e.message)+'</p>';}finally{btns.forEach(function(b){b.disabled=false;});}}

  // ── Copy a week to another client ──
  var copyDlg=$('[data-cc-copy]');
  function openCopy(){var s=V.weekStart(state.anchor),inWeek=weekItems();$('[data-cc-copy-summary]',copyDlg).textContent=inWeek.length+' post'+(inWeek.length!==1?'s':'')+' from '+clientName()+', week of '+fmtDay.format(s)+'.';
    $('[data-cc-copy-client]',copyDlg).innerHTML=state.clients.map(function(c){return '<option value="'+esc(c.id)+'"'+(c.id===state.clientId?' selected':'')+'>'+esc(c.business_name)+'</option>';}).join('');
    $('[data-cc-copy-week]',copyDlg).value=iso(s);$('[data-cc-copy-msg]',copyDlg).textContent='';copyDlg.showModal();}
  function weekItems(){var s=iso(V.weekStart(state.anchor)),e=addDays(s,6);return state.items.filter(function(i){return V.isDate(i.date)&&i.date>=s&&i.date<=e;});}
  async function runCopy(){var target=$('[data-cc-copy-client]',copyDlg).value,start=$('[data-cc-copy-week]',copyDlg).value,msg=$('[data-cc-copy-msg]',copyDlg),items=weekItems();if(!target||!start||!items.length){msg.textContent=items.length?'Choose a client and a week.':'There are no posts in this week.';return;}
    var shift=Math.round((V.weekStart(V.parse(start))-V.weekStart(state.anchor))/864e5),btn=$('[data-cc-copy-run]',copyDlg),done=0;btn.disabled=true;msg.textContent='Copying…';
    try{for(var i=0;i<items.length;i++){var it=items[i],p={client_id:target,publish_date:addDays(it.date,shift),platform:it.platforms.join(', ')||null,content_type:it.format||null,topic:it.topic,caption:it.caption||null,visual_url:it.image||null,status:it.status==='published'?'draft':(it.status==='ready_for_approval'||it.status==='approved'||it.status==='scheduled'?'draft':it.status),client_visible:true,updated_at:new Date().toISOString()};
        if(state.timeSupported){p.publish_time=it.time||null;p.media_type=it.mediaType||null;}if(state.proSupported){p.media=it.media;p.internal_notes=it.notes||null;}await write(p,null);done++;}
      copyDlg.close();if(target===state.clientId){await loadItems();render();}message(done+' post'+(done>1?'s':'')+' copied to '+clientName(target)+' as drafts.');}
    catch(e){msg.textContent=e.message;}finally{btn.disabled=false;}}
  if(copyDlg){copyDlg.addEventListener('click',function(e){if(e.target===copyDlg||e.target.closest('[data-cc-copy-close]'))copyDlg.close();if(e.target.closest('[data-cc-copy-run]'))runCopy();});}

  // ── Client settings: tone of voice + summary emails ──
  var setDlg=$('[data-cc-settings]');
  function openSettings(){var c=client();if(!c)return;$('[data-cc-settings-name]',setDlg).textContent=c.business_name;$('[data-cc-settings-email]',setDlg).textContent=c.email||'—';
    setDlg.querySelector('[name=tone]').value=c.brand_tone||'';setDlg.querySelector('[name=digest]').value=c.calendar_digest||'off';$('[data-cc-settings-msg]',setDlg).textContent='';setDlg.showModal();}
  async function saveSettings(){var c=client(),msg=$('[data-cc-settings-msg]',setDlg),body={brand_tone:setDlg.querySelector('[name=tone]').value.trim()||null,calendar_digest:setDlg.querySelector('[name=digest]').value};
    try{await api('/rest/v1/clients?id=eq.'+encodeURIComponent(c.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});Object.assign(c,body);setDlg.close();message('Settings saved for '+c.business_name+'.');}catch(e){msg.textContent=isSchemaError(e)?SETUP_PRO:e.message;}}
  if(setDlg){setDlg.addEventListener('click',function(e){if(e.target===setDlg||e.target.closest('[data-cc-settings-close]'))setDlg.close();if(e.target.closest('[data-cc-settings-save]'))saveSettings();});}

  // ── Events ──
  $('[data-cc-client]',page).addEventListener('change',function(e){selectClient(e.target.value);});
  page.addEventListener('click',function(e){
    var t=e.target;
    var nav=t.closest('[data-cc-nav]');if(nav){var step=nav.dataset.ccNav,a=state.anchor;state.anchor=step==='today'?new Date():state.view==='week'?new Date(a.getFullYear(),a.getMonth(),a.getDate()+(step==='next'?7:-7)):new Date(a.getFullYear(),a.getMonth()+(step==='next'?1:-1),1);render();return;}
    var view=t.closest('[data-cc-view]');if(view){state.view=view.dataset.ccView;try{localStorage.setItem(VIEW_KEY,state.view);}catch(err){}render();return;}
    var filter=t.closest('[data-cc-filter]');if(filter){state.filter=filter.dataset.ccFilter;render();return;}
    var att=t.closest('[data-cc-attention-client]');if(att){var f=att.dataset.ccAttentionFilter;(state.clientId===att.dataset.ccAttentionClient?Promise.resolve():selectClient(att.dataset.ccAttentionClient)).then(function(){state.filter=f;render();});return;}
    if(t.closest('[data-cc-inbox-open]')){openInbox();return;}
    if(t.closest('[data-cc-copy-open]')){openCopy();return;}
    if(t.closest('[data-cc-settings-open]')){openSettings();return;}
    if(t.closest('[data-cc-new]')){openEditor(null,'');return;}
    var add=t.closest('[data-ccv-add]');if(add){openEditor(null,add.dataset.ccvAdd);return;}
    var open=t.closest('[data-ccv-open]');if(open){var item=state.items.find(function(i){return i.id===open.dataset.ccvOpen;});if(item)openEditor(item);}
  });
  V.enableDrag($('[data-cc-board]',page),move);
  drawer.addEventListener('click',function(e){var t=e.target;
    if(t===drawer||t.closest('[data-cc-close]')){closeEditor();return;}
    if(!t.closest('.cc-menu')&&!t.closest('[data-cc-menu-open]'))closeMenus();
    var tab=t.closest('[data-cc-tab]');if(tab){showPane(tab.dataset.ccTab);return;}
    var net=t.closest('[data-cc-pv-net]');if(net){state.pv.network=net.dataset.ccPvNet;state.pv.index=0;renderPreview();return;}
    var stp=t.closest('[data-pv-step]');if(stp){state.pv.index+=Number(stp.dataset.pvStep);renderPreview();return;}
    if(t.closest('[data-cc-browse]')){$('[data-cc-file]',form).click();return;}
    if(t.closest('[data-cc-media-add]')){var inp=$('[data-cc-image-url]',form);addMedia(inp.value,'');inp.value='';return;}
    var mv=t.closest('[data-cc-media-move]');if(mv){var i=Number(mv.dataset.ccMediaMove),j=i+Number(mv.dataset.dir),list=pending.media;if(j>=0&&j<list.length){var tmp=list[i];list[i]=list[j];list[j]=tmp;renderMedia();}return;}
    var del=t.closest('[data-cc-media-delete]');if(del){pending.media.splice(Number(del.dataset.ccMediaDelete),1);renderMedia();return;}
    var menuOpen=t.closest('[data-cc-menu-open]');if(menuOpen){openMenu(menuOpen.dataset.ccMenuOpen);return;}
    var tpl=t.closest('[data-cc-template]');if(tpl){var found=(state.templates||[]).find(function(x){return x.id===tpl.dataset.ccTemplate;});if(found){if(found.kind==='caption'&&!form.elements.caption.value.trim())form.elements.caption.value=found.body;else insertAtCursor(found.body);updateCount();}closeMenus();return;}
    var tdel=t.closest('[data-cc-template-del]');if(tdel){deleteTemplate(tdel.dataset.ccTemplateDel);return;}
    var tsave=t.closest('[data-cc-template-save]');if(tsave){saveTemplate(tsave.dataset.ccTemplateSave);return;}
    var ai=t.closest('[data-cc-ai]');if(ai){assistant(ai.dataset.ccAi);return;}
    if(t.closest('[data-cc-ai-use]')){form.elements.caption.value=$('.cc-ai__text',form).textContent;updateCount();$('[data-cc-ai-result]',form).hidden=true;formMessage('Caption updated — review it, then save.');return;}
    if(t.closest('[data-cc-ai-dismiss]')){$('[data-cc-ai-result]',form).hidden=true;return;}
    var rs=t.closest('[data-cc-restore]');if(rs){restoreVersion(Number(rs.dataset.ccRestore));return;}
    if(t.closest('[data-cc-delete]')){removePost();return;}
    if(t.closest('[data-cc-duplicate]')){duplicate();return;}
    if(t.closest('[data-cc-ask-again]')){askAgain();return;}
    if(t.closest('[data-cc-thread-send]')){sendThread();return;}
    if(t.closest('[data-cc-send]')){save('ready_for_approval');}
  });
  drawer.addEventListener('cancel',function(){stopPolling();state.editing=null;});
  drawer.addEventListener('close',stopPolling);
  form.addEventListener('submit',function(e){e.preventDefault();save();});
  form.addEventListener('keydown',function(e){if(e.target.matches('[data-cc-thread-input]')&&e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();sendThread();}if(e.target.matches('[data-cc-image-url]')&&e.key==='Enter'){e.preventDefault();addMedia(e.target.value,'');e.target.value='';}});
  form.addEventListener('input',function(e){if(e.target.name==='caption')updateCount();});
  form.addEventListener('change',function(e){if(e.target.name==='platforms')updateCount();if(e.target.name==='status')syncStatusFields();if(e.target.matches('[data-cc-file]')&&e.target.files.length){upload(Array.prototype.slice.call(e.target.files));e.target.value='';}});
  var drop=$('[data-cc-drop]',form);
  drop.addEventListener('click',function(e){if(e.target.closest('[data-cc-drop-empty]')&&!e.target.closest('button'))$('[data-cc-file]',form).click();});
  ['dragenter','dragover'].forEach(function(type){drop.addEventListener(type,function(e){e.preventDefault();drop.classList.add('is-over');});});
  ['dragleave','drop'].forEach(function(type){drop.addEventListener(type,function(e){e.preventDefault();drop.classList.remove('is-over');});});
  drop.addEventListener('drop',function(e){var files=e.dataTransfer&&e.dataTransfer.files;if(files&&files.length)upload(Array.prototype.slice.call(files));});

  async function show(){
    render();
    if(!state.loaded){try{await loadClients();state.loaded=true;}catch(e){message(e.message,true);return;}}
    if(state.clientId&&client())await selectClient(state.clientId,false);else{state.clientId='';render();}
    loadAttention();
  }
  window.SBCalendar={show:show,openInbox:openInbox};
  // Keep the bell / attention banner fresh while the admin is signed in.
  function tick(){var dash=document.querySelector('[data-dashboard]');if(dash&&!dash.hidden&&session()){if(!state.loaded)loadClients().then(function(){state.loaded=true;loadAttention();}).catch(function(){});else loadAttention();}}
  setTimeout(tick,1500);setInterval(tick,60000);
  var dash=document.querySelector('[data-dashboard]');if((location.hash==='#calendar'||location.hash==='#content')&&dash&&!dash.hidden)show();
})();
