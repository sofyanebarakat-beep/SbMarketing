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
  // Media list (carousel): item.media [{url,type}] or the single image.
  function mediaList(item){var list=Array.isArray(item.media)?item.media.filter(function(m){return m&&m.url;}):[];if(!list.length&&item.image)list=[{url:item.image,type:isVideo(item)?'video':'image'}];return list.map(function(m){return{url:m.url,type:m.type||(/\.(mp4|mov|webm|m4v)(\?|$)/i.test(m.url)?'video':'image')};});}
  function mediaHtml(item){
    var list=mediaList(item),badge=list.length>1?'<i class="ccv-multi" title="'+list.length+'"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>'+list.length+'</i>':'';
    if(list.length){var first=list[0];return first.type==='video'?'<div class="ccv-media ccv-media--video"><video src="'+esc(first.url)+'#t=0.5" muted playsinline preload="metadata"></video><i class="ccv-play" aria-hidden="true"></i>'+badge+'</div>':'<div class="ccv-media"><img src="'+esc(first.url)+'" alt="" loading="lazy">'+badge+'</div>';}
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
      +(o.deadlineText&&item.status==='ready_for_approval'&&!item.decision&&item.deadline?'<span class="ccv-deadline'+(item.deadline<iso(new Date())?' is-late':'')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'+esc(o.deadlineText(item))+'</span>':'')
      +(item.status==='published'?metricsLine(item.metrics):'')
      +(o.extraHtml?o.extraHtml(item):'')
      +'</div>';
  }
  function compact(n){n=Number(n);if(!isFinite(n))return '';return n>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':n>=1e3?(n/1e3).toFixed(1).replace('.0','')+'k':String(n);}
  var METRIC_ICON={reach:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',likes:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',comments:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',clicks:'<path d="m9 9 5 12 1.8-5.2L21 14z"/><path d="M7.2 2.2 8 5.1M5.1 8l-2.9-.8M14 4.1 12 6M6 12l-1.9 2"/>'};
  function metricsLine(m){m=m||{};var keys=['reach','likes','comments','clicks'].filter(function(k){return m[k]!==undefined&&m[k]!==null&&m[k]!=='';});if(!keys.length)return '';return '<span class="ccv-metrics">'+keys.map(function(k){return '<span title="'+k+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+METRIC_ICON[k]+'</svg>'+esc(compact(m[k]))+'</span>';}).join('')+'</span>';}

  // Social preview (Instagram feed / Facebook / Story-Reel), with optional pins on the media.
  // o: {network, name, locale, index, pins:[{n,x,y,media_index}], labels:{likes, likesPlaceholder, comments, like, comment, share, place}}
  var SVG=function(p,size){return '<svg viewBox="0 0 24 24" width="'+(size||22)+'" height="'+(size||22)+'" aria-hidden="true">'+p+'</svg>';};
  var IG_ICONS={heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',comment:'<path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 21l2.2-5.4A8.4 8.4 0 1 1 21 11.5z"/>',send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',save:'<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',like:'<path d="M7 10v11H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7"/>',share:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>'};
  function previewMedia(item,o){var list=mediaList(item),i=Math.max(0,Math.min(o.index||0,list.length-1)),m=list[i];
    var media=!m?'<div class="pv-media pv-media--empty ccv-tone-'+(Math.abs(hash(item.topic||item.id||''))%5)+'"><span>'+esc(item.format||item.topic||'')+'</span></div>'
      :'<div class="pv-media" data-pv-media data-index="'+i+'">'+(m.type==='video'?'<video src="'+esc(m.url)+'" muted playsinline controls preload="metadata"></video>':'<img src="'+esc(m.url)+'" alt="">')
        +'<div class="pv-pins">'+(o.pins||[]).filter(function(p){return (p.media_index||0)===i;}).map(function(p){return '<span class="pv-pin" style="left:'+(p.x*100)+'%;top:'+(p.y*100)+'%" title="'+esc(p.body||'')+'">'+p.n+'</span>';}).join('')+'</div>'
        +(list.length>1?'<button type="button" class="pv-nav pv-nav--prev" data-pv-step="-1" aria-label="Previous"'+(i===0?' hidden':'')+'>‹</button><button type="button" class="pv-nav pv-nav--next" data-pv-step="1" aria-label="Next"'+(i===list.length-1?' hidden':'')+'>›</button><span class="pv-count">'+(i+1)+'/'+list.length+'</span>':'')+'</div>';
    var dots=list.length>1?'<div class="pv-dots">'+list.map(function(x,n){return '<i class="'+(n===i?'is-on':'')+'"></i>';}).join('')+'</div>':'';
    return{media:media,dots:dots};}
  function previewHtml(item,o){
    o=o||{};var L=o.labels||{},name=o.name||'',avatar='<span class="pv-avatar">'+esc((name||'?').trim().charAt(0).toUpperCase())+'</span>',parts=previewMedia(item,o),caption=String(item.caption||''),m=item.metrics||{};
    var likes=m.likes?compact(m.likes)+' '+(L.likes||'likes'):(L.likesPlaceholder||'');
    var when=isDate(item.date)?new Intl.DateTimeFormat(o.locale||'en-GB',{day:'numeric',month:'long'}).format(parse(item.date)):'';
    if(o.network==='story')return '<div class="pv pv--story"><div class="pv-story-bars"><i></i></div><div class="pv-story-head">'+avatar+'<strong>'+esc(name)+'</strong><small>'+esc(item.time||'')+'</small></div>'+parts.media+(caption?'<div class="pv-story-caption">'+esc(caption)+'</div>':'')+'<div class="pv-story-side">'+SVG(IG_ICONS.heart,26)+SVG(IG_ICONS.comment,26)+SVG(IG_ICONS.send,26)+'</div></div>';
    if(o.network==='facebook')return '<div class="pv pv--facebook"><div class="pv-head">'+avatar+'<div><strong>'+esc(name)+'</strong><small>'+esc(when)+(item.time?' · '+esc(item.time):'')+' · 🌐</small></div></div>'+(caption?'<p class="pv-fb-text">'+esc(caption)+'</p>':'')+parts.media+parts.dots
      +'<div class="pv-fb-stats"><span>👍❤️ '+esc(m.likes?compact(m.likes):'')+'</span><span>'+esc(m.comments?compact(m.comments)+' '+(L.comments||'comments'):'')+'</span></div><div class="pv-fb-actions"><span>'+SVG(IG_ICONS.like,18)+esc(L.like||'Like')+'</span><span>'+SVG(IG_ICONS.comment,18)+esc(L.comment||'Comment')+'</span><span>'+SVG(IG_ICONS.share,18)+esc(L.share||'Share')+'</span></div></div>';
    return '<div class="pv pv--instagram"><div class="pv-head">'+avatar+'<div><strong>'+esc(name)+'</strong><small>'+esc(L.place||'')+'</small></div><span class="pv-more">•••</span></div>'+parts.media
      +'<div class="pv-ig-actions">'+SVG(IG_ICONS.heart)+SVG(IG_ICONS.comment)+SVG(IG_ICONS.send)+parts.dots+'<span class="pv-save">'+SVG(IG_ICONS.save)+'</span></div>'
      +(likes?'<div class="pv-likes">'+esc(likes)+'</div>':'')+(caption?'<p class="pv-caption"><strong>'+esc(name)+'</strong> '+esc(caption).replace(/(#[\wÀ-ÿ-]+)/g,'<span class="pv-tag">$1</span>')+'</p>':'')+'<div class="pv-date">'+esc(when)+'</div></div>';
  }
  // Which previews fit a post: story/reel formats → vertical first, then the feed networks.
  function previewNetworks(item){var nets=platformList(item.platforms).map(platformKey),out=[];if(/story|reel|short|vid/i.test(item.format||'')||nets.indexOf('tiktok')>-1)out.push('story');if(nets.indexOf('instagram')>-1||!nets.length)out.push('instagram');if(nets.indexOf('facebook')>-1)out.push('facebook');if(!out.length)out.push('instagram');return out;}

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
        +list.map(function(i){return cardHtml(i,{statusLabel:o.statusLabel,decisionLabel:o.decisionLabel,unreadLabel:o.unreadLabel,deadlineText:o.deadlineText,extraHtml:o.extraHtml,draggable:o.editable});}).join('')+'</div>';}
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
    var pinNo=0;messages=messages.map(function(m){return m.pin_x!==null&&m.pin_x!==undefined&&m.kind==='message'?Object.assign({},m,{_pin:++pinNo}):m;});
    return messages.map(function(m){var when=m.created_at?time.format(new Date(m.created_at)):'',mine=m.author===o.viewer,name=mine?(L.you||'You'):(m.author_name||'');
      if(m.kind&&m.kind!=='message')return '<div class="ccv-event ccv-event--'+esc(m.kind)+'"><span class="ccv-event__icon">'+(KIND_ICON[m.kind]||'•')+'</span><div><strong>'+esc(kinds[m.kind]||m.kind)+'</strong> · '+esc(name)+(m.body?'<p>'+esc(m.body)+'</p>':'')+'<small>'+esc(when)+'</small></div></div>';
      return '<div class="ccv-msg'+(mine?' ccv-msg--mine':'')+' ccv-msg--'+esc(m.author)+'"><div class="ccv-msg__bubble">'+(m._pin?'<span class="ccv-msg__pin" title="'+esc(L.pinned||'Pinned on the picture')+'">'+m._pin+'</span>':'')+esc(m.body).replace(/\n/g,'<br>')+'</div><small>'+esc(name)+(when?' · '+esc(when):'')+'</small></div>';}).join('');
  }

  // Drag a card onto another day (admin). onMove(id, 'YYYY-MM-DD').
  function enableDrag(root,onMove){
    if(root.__ccvDrag)return;root.__ccvDrag=true;var dragged=null;
    root.addEventListener('dragstart',function(e){var card=e.target.closest&&e.target.closest('[data-ccv-drag]');if(!card)return;dragged=card.dataset.ccvDrag;card.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',dragged);}catch(err){}});
    root.addEventListener('dragend',function(e){var card=e.target.closest&&e.target.closest('[data-ccv-drag]');if(card)card.classList.remove('is-dragging');root.querySelectorAll('.is-drop').forEach(function(el){el.classList.remove('is-drop');});dragged=null;});
    root.addEventListener('dragover',function(e){var cell=e.target.closest&&e.target.closest('[data-ccv-day]');if(!cell||!dragged)return;e.preventDefault();root.querySelectorAll('.is-drop').forEach(function(el){if(el!==cell)el.classList.remove('is-drop');});cell.classList.add('is-drop');});
    root.addEventListener('drop',function(e){var cell=e.target.closest&&e.target.closest('[data-ccv-day]');if(!cell||!dragged)return;e.preventDefault();cell.classList.remove('is-drop');var id=dragged;dragged=null;onMove(id,cell.dataset.ccvDay);});
  }

  function pinsFrom(messages){var n=0;return (messages||[]).filter(function(m){return m.pin_x!==null&&m.pin_x!==undefined&&m.kind==='message';}).map(function(m){return{n:++n,x:Number(m.pin_x),y:Number(m.pin_y),media_index:m.media_index||0,body:m.body};});}
  window.SBContentCalendar={render:render,previewHtml:previewHtml,previewNetworks:previewNetworks,pinsFrom:pinsFrom,mediaList:mediaList,metricsLine:metricsLine,compact:compact,threadHtml:threadHtml,enableDrag:enableDrag,platformIcon:platformIcon,platformIcons:platformIcons,platformList:platformList,platformKey:platformKey,statusPill:statusPill,PLATFORMS:PLATFORMS,iso:iso,parse:parse,isDate:isDate,weekStart:weekStart,isVideo:isVideo,esc:esc};
})();
