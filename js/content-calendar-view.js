/* Shared content-calendar view (admin "Content calendar" + client "Calendrier de contenu").
   Month / week grid with post cards: platform icons + time, status pill, media, caption.
   Items are plain objects:
   {id, date:'YYYY-MM-DD', time:'HH:MM', platforms:['Instagram',…], format, topic, caption,
    image, mediaType, status, decision, comment}
   Rendering only — data loading and saving stay in each page's own script. */
(function(){
  'use strict';
  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function parse(s){return new Date(String(s).slice(0,10)+'T12:00:00');}
  function isDate(s){return /^\d{4}-\d{2}-\d{2}/.test(s||'');}

  // Simple, generic channel glyphs (drawn here, coloured per network).
  var PLATFORMS={
    instagram:{label:'Instagram',color:'#e1306c',svg:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>'},
    facebook:{label:'Facebook',color:'#1877f2',svg:'<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3h2v9h3v-9h2.5l.5-3H12V6.8c0-.5.3-.8.8-.8H15z" fill="currentColor" stroke="none"/>'},
    tiktok:{label:'TikTok',color:'#111111',svg:'<path d="M14 3v11.5a3.5 3.5 0 1 1-3-3.46M14 3c.4 2.6 2.1 4.2 5 4.5"/>'},
    linkedin:{label:'LinkedIn',color:'#0a66c2',svg:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v6M8 7.5v.01M12 16v-6M12 12.5c0-1.4 1-2.5 2.3-2.5S16 11 16 12.5V16"/>'},
    youtube:{label:'YouTube',color:'#ff0000',svg:'<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.5 9.5v5l4-2.5z" fill="currentColor" stroke="none"/>'},
    google:{label:'Google',color:'#4285f4',svg:'<path d="M20 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.5a4 4 0 0 1-1.7 2.6v2.1h2.8c1.6-1.5 2.4-3.7 2.4-6.3z"/><path d="M12 20.5c2.3 0 4.2-.8 5.6-2l-2.8-2.1a5.1 5.1 0 0 1-7.6-2.7H4.3v2.2A8.5 8.5 0 0 0 12 20.5zM7.2 13.7a5 5 0 0 1 0-3.4V8.1H4.3a8.5 8.5 0 0 0 0 7.8zM12 6.9c1.3 0 2.5.5 3.4 1.3l2.5-2.5A8.5 8.5 0 0 0 4.3 8.1l2.9 2.2A5.1 5.1 0 0 1 12 6.9z"/>'},
    pinterest:{label:'Pinterest',color:'#e60023',svg:'<circle cx="12" cy="12" r="9"/><path d="M11 9.5c0-1.4 1-2.5 2.4-2.5s2.4 1 2.4 2.6c0 2-1.2 3.6-2.8 3.6-.8 0-1.4-.6-1.2-1.4M11.5 12l-1.6 7"/>'},
    website:{label:'Website',color:'#041021',svg:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'},
    email:{label:'Email',color:'#6f7182',svg:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'}
  };
  function platformKey(name){var k=String(name||'').toLowerCase().replace(/[^a-z]/g,'');if(k==='site'||k==='siteweb'||k==='blog'||k==='web')return 'website';if(k==='mail'||k==='newsletter')return 'email';if(k.indexOf('google')===0)return 'google';return PLATFORMS[k]?k:'';}
  function platformList(value){return (Array.isArray(value)?value:String(value||'').split(/[,;/+|]/)).map(function(s){return String(s).trim();}).filter(Boolean);}
  function platformIcon(name,size){var key=platformKey(name),p=PLATFORMS[key];if(!p)return '<span class="ccv-pf ccv-pf--text" title="'+esc(name)+'">'+esc(String(name).charAt(0).toUpperCase())+'</span>';return '<span class="ccv-pf" style="color:'+p.color+'" title="'+esc(p.label)+'"><svg viewBox="0 0 24 24" width="'+(size||14)+'" height="'+(size||14)+'" aria-hidden="true">'+p.svg+'</svg></span>';}
  function platformIcons(value){return platformList(value).map(function(n){return platformIcon(n);}).join('');}

  var STATUS_ICON={idea:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',draft:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',design_in_progress:'<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-4.9-4.5-8.9-10-8.9z"/>',ready_for_approval:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',approved:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',scheduled:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',published:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'};
  function statusPill(status,label){return '<span class="ccv-status ccv-status--'+esc(status)+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+(STATUS_ICON[status]||STATUS_ICON.draft)+'</svg>'+esc(label)+'</span>';}
  function isVideo(item){return item.mediaType==='video'||/\.(mp4|mov|webm|m4v)(\?|$)/i.test(item.image||'');}
  function mediaHtml(item){
    if(!item.image)return '<div class="ccv-media ccv-media--empty ccv-tone-'+(Math.abs(hash(item.topic||item.id||''))%5)+'"><span>'+esc(item.format||item.topic||'')+'</span></div>';
    if(isVideo(item))return '<div class="ccv-media ccv-media--video"><video src="'+esc(item.image)+'#t=0.5" muted playsinline preload="metadata"></video><i class="ccv-play" aria-hidden="true"></i></div>';
    return '<div class="ccv-media"><img src="'+esc(item.image)+'" alt="" loading="lazy"></div>';
  }
  function hash(s){var h=0;s=String(s);for(var i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return h;}
  var DECISION_ICON={approved:'✓',rejected:'✕',changes_requested:'✎'};
  function cardHtml(item,o){
    var label=o.statusLabel?o.statusLabel(item):item.status,dec=item.decision&&DECISION_ICON[item.decision]?'<span class="ccv-decision ccv-decision--'+esc(item.decision)+'" title="'+esc(o.decisionLabel?o.decisionLabel(item.decision):item.decision)+(item.comment?': '+esc(item.comment):'')+'">'+DECISION_ICON[item.decision]+'</span>':'';
    return '<div role="button" tabindex="0" class="ccv-card ccv-card--'+esc(item.status)+'" data-ccv-open="'+esc(item.id)+'"'+(o.draggable?' draggable="true" data-ccv-drag="'+esc(item.id)+'"':'')+'>'
      +'<span class="ccv-card__top"><span class="ccv-pfs">'+(platformIcons(item.platforms)||'<span class="ccv-pf ccv-pf--text">•</span>')+'</span>'+(item.time?'<span class="ccv-time">'+esc(item.time)+'</span>':'')+'</span>'
      +'<span class="ccv-card__status">'+statusPill(item.status,label)+dec+(item.commentCount||item.comment?'<span class="ccv-comment'+(item.unread?' is-unread':'')+'" title="'+esc(item.unread?(o.unreadLabel||'New message'):(item.comment||''))+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'+(item.commentCount?'<b>'+item.commentCount+'</b>':'')+'</span>':'')+'</span>'
      +mediaHtml(item)
      +'<span class="ccv-caption"><i class="ccv-dot ccv-dot--'+esc(item.status)+'"></i><span>'+esc(item.caption||item.topic||'—')+'</span></span>'
      +'</div>';
  }
  function byDay(items){var map={};items.forEach(function(i){if(isDate(i.date)){var k=i.date.slice(0,10);(map[k]=map[k]||[]).push(i);}});Object.keys(map).forEach(function(k){map[k].sort(function(a,b){return String(a.time||'99').localeCompare(String(b.time||'99'));});});return map;}
  function weekStart(d){var s=new Date(d.getFullYear(),d.getMonth(),d.getDate());s.setDate(s.getDate()-((s.getDay()+6)%7));return s;}

  // render(root, {items, view:'month'|'week', anchor:Date, locale, weekdays:[7], today, editable, labels:{add, empty}, statusLabel(item), decisionLabel(d)})
  function render(root,o){
    var view=o.view==='week'?'week':'month',anchor=o.anchor||new Date(),today=o.today||iso(new Date()),map=byDay(o.items||[]),start,cells;
    if(view==='week'){start=weekStart(anchor);cells=7;}
    else{var first=new Date(anchor.getFullYear(),anchor.getMonth(),1);start=weekStart(first);var last=new Date(anchor.getFullYear(),anchor.getMonth()+1,0);cells=Math.ceil((((first.getDay()+6)%7)+last.getDate())/7)*7;}
    var dayFmt=new Intl.DateTimeFormat(o.locale||'en-GB',{weekday:'long',day:'numeric',month:'long'}),html='<div class="ccv ccv--'+view+(o.editable?' ccv--editable':'')+'"><div class="ccv-head">'+(o.weekdays||['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).map(function(w,i){var d=new Date(start);d.setDate(start.getDate()+i);return '<span>'+esc(w)+(view==='week'?' <b>'+d.getDate()+'</b>':'')+'</span>';}).join('')+'</div><div class="ccv-grid">',hasAny=false;
    for(var c=0;c<cells;c++){var d=new Date(start);d.setDate(start.getDate()+c);var key=iso(d),list=map[key]||[],out=view==='month'&&d.getMonth()!==anchor.getMonth();if(list.length&&!out)hasAny=true;
      html+='<div class="ccv-cell'+(out?' is-out':'')+(key===today?' is-today':'')+(key<today?' is-past':'')+(list.length?'':' is-empty')+'" data-ccv-day="'+key+'">'
        +'<div class="ccv-cell__head"><span class="ccv-day">'+d.getDate()+'</span><span class="ccv-full">'+esc(dayFmt.format(d))+'</span>'+(o.editable?'<button type="button" class="ccv-add" data-ccv-add="'+key+'" aria-label="'+esc((o.labels&&o.labels.add)||'Add')+' '+esc(dayFmt.format(d))+'">+</button>':'')+'</div>'
        +list.map(function(i){return cardHtml(i,{statusLabel:o.statusLabel,decisionLabel:o.decisionLabel,unreadLabel:o.unreadLabel,draggable:o.editable});}).join('')+'</div>';}
    html+='</div></div>';
    root.innerHTML=html;
    if(!root.__ccvKeys){root.__ccvKeys=true;root.addEventListener('keydown',function(e){var card=e.target.closest&&e.target.closest('[data-ccv-open]');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();card.click();}});}
    return{hasAny:hasAny,start:start,end:(function(){var e=new Date(start);e.setDate(start.getDate()+cells-1);return e;})()};
  }


  // Conversation thread on a post. messages: [{author:'client'|'agency', author_name, kind, body, created_at}]
  // o: {viewer:'client'|'agency', locale, labels:{empty, you, kinds:{approved, rejected, changes_requested, sent_for_approval}}}
  var KIND_ICON={approved:'✓',rejected:'✕',changes_requested:'✎',sent_for_approval:'➜'};
  function threadHtml(messages,o){
    var L=o.labels||{},kinds=L.kinds||{},time=new Intl.DateTimeFormat(o.locale||'en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    if(!messages||!messages.length)return '<p class="ccv-thread__empty">'+esc(L.empty||'No messages yet.')+'</p>';
    return messages.map(function(m){var when=m.created_at?time.format(new Date(m.created_at)):'',mine=m.author===o.viewer,name=mine?(L.you||'You'):(m.author_name||'');
      if(m.kind&&m.kind!=='message')return '<div class="ccv-event ccv-event--'+esc(m.kind)+'"><span class="ccv-event__icon">'+(KIND_ICON[m.kind]||'•')+'</span><div><strong>'+esc(kinds[m.kind]||m.kind)+'</strong> · '+esc(name)+(m.body?'<p>'+esc(m.body)+'</p>':'')+'<small>'+esc(when)+'</small></div></div>';
      return '<div class="ccv-msg'+(mine?' ccv-msg--mine':'')+' ccv-msg--'+esc(m.author)+'"><div class="ccv-msg__bubble">'+esc(m.body).replace(/\n/g,'<br>')+'</div><small>'+esc(name)+(when?' · '+esc(when):'')+'</small></div>';}).join('');
  }

  // Drag a card onto another day (admin). onMove(id, 'YYYY-MM-DD').
  function enableDrag(root,onMove){
    if(root.__ccvDrag)return;root.__ccvDrag=true;var dragged=null;
    root.addEventListener('dragstart',function(e){var card=e.target.closest&&e.target.closest('[data-ccv-drag]');if(!card)return;dragged=card.dataset.ccvDrag;card.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',dragged);}catch(err){}});
    root.addEventListener('dragend',function(e){var card=e.target.closest&&e.target.closest('[data-ccv-drag]');if(card)card.classList.remove('is-dragging');root.querySelectorAll('.is-drop').forEach(function(el){el.classList.remove('is-drop');});dragged=null;});
    root.addEventListener('dragover',function(e){var cell=e.target.closest&&e.target.closest('[data-ccv-day]');if(!cell||!dragged)return;e.preventDefault();root.querySelectorAll('.is-drop').forEach(function(el){if(el!==cell)el.classList.remove('is-drop');});cell.classList.add('is-drop');});
    root.addEventListener('drop',function(e){var cell=e.target.closest&&e.target.closest('[data-ccv-day]');if(!cell||!dragged)return;e.preventDefault();cell.classList.remove('is-drop');var id=dragged;dragged=null;onMove(id,cell.dataset.ccvDay);});
  }

  window.SBContentCalendar={render:render,threadHtml:threadHtml,enableDrag:enableDrag,platformIcon:platformIcon,platformIcons:platformIcons,platformList:platformList,platformKey:platformKey,statusPill:statusPill,PLATFORMS:PLATFORMS,iso:iso,parse:parse,isDate:isDate,weekStart:weekStart,isVideo:isVideo,esc:esc};
})();
