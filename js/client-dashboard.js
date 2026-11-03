(function(){
  'use strict';
  var config=window.SB_SUPABASE,loading=document.querySelector('[data-portal-loading]'),error=document.querySelector('[data-portal-error]'),content=document.querySelector('[data-portal-content]'),accessToken=new URLSearchParams(location.search).get('token');
  function text(selector,value){var element=document.querySelector(selector);if(element)element.textContent=value||'';}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];});}
  function fail(){loading.hidden=true;error.hidden=false;}
  var T={en:{navDashboard:'Dashboard',dashboard:'Your marketing dashboard',navAnalytics:'Website analytics',navCalendar:'Content calendar',navContact:'Contact SB Marketing',period:'Reporting period',analytics:'Website analytics',analyticsCopy:'How your website performed over the period.',calendar:'Content calendar',calendarCopy:'Click a publication to approve it, reject it or ask for a change.',topPages:'Most visited pages',sources:'Where visitors come from',devices:'Devices',engagement:'Engagement',visitsChart:'Daily visits — last 30 days',noAnalytics:'Your website figures will be added here soon.',noCalendar:'Your upcoming publications will appear here soon.',noList:'Not available yet.',updated:'Updated: ',vs:'vs last month',footer:'Private dashboard prepared by',greeting:'Welcome',
      demo:'Example data',demoNote:'Example figures shown while your real website statistics are being connected.',today:'Today',prev:'Previous month',next:'Next month',noDate:'Not scheduled yet',more:'more',
      weekdays:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],visits:'visits',
      approve:'Approve',reject:'Reject',change:'Request a change',send:'Send',cancel:'Cancel',commentChange:'What should we change?',commentReject:'Why does this not work for you? (optional)',commentRequired:'Please describe the change you want.',saving:'Sending…',saved:'Thank you — your answer was sent to SB Marketing.',saveError:'Your answer could not be sent. Please try again or contact us.',previewOnly:'Admin preview — answers are disabled here.',cannotAnswer:'This publication is already live.',noId:'This publication can be answered once SB Marketing saves the calendar again.',yourAnswer:'Your answer',changeAnswer:'Change my answer',caption:'Caption',openLink:'View the publication',
      decisions:{approved:'Approved',rejected:'Rejected',changes_requested:'Change requested'},
      labels:{visitors:'Unique visitors',sessions:'Sessions',visits:'Visits',page_views:'Page views',avg_duration:'Avg. visit time',contacts:'Calls & enquiries'},
      engage:{bounce:'Bounce rate',pages_per_session:'Pages per session',new_visitors:'New visitors',contacts:'Calls & enquiries'},
      statuses:{planned:'Planned',in_design:'In design',ready:'Ready',published:'Published'}},
    fr:{navDashboard:'Tableau de bord',dashboard:'Votre tableau de bord marketing',navAnalytics:'Statistiques du site',navCalendar:'Calendrier de contenu',navContact:'Contacter SB Marketing',period:'Période du rapport',analytics:'Statistiques du site',analyticsCopy:'Les performances de votre site sur la période.',calendar:'Calendrier de contenu',calendarCopy:'Cliquez sur une publication pour l’approuver, la refuser ou demander une modification.',topPages:'Pages les plus visitées',sources:'D’où viennent vos visiteurs',devices:'Appareils',engagement:'Engagement',visitsChart:'Visites par jour — 30 derniers jours',noAnalytics:'Les chiffres de votre site seront ajoutés ici prochainement.',noCalendar:'Vos prochaines publications apparaîtront ici prochainement.',noList:'Pas encore disponible.',updated:'Mis à jour : ',vs:'vs mois dernier',footer:'Tableau de bord privé préparé par',greeting:'Bonjour',
      demo:'Données d’exemple',demoNote:'Chiffres d’exemple affichés en attendant la connexion de vos vraies statistiques.',today:'Aujourd’hui',prev:'Mois précédent',next:'Mois suivant',noDate:'Pas encore programmé',more:'de plus',
      weekdays:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'],visits:'visites',
      approve:'Approuver',reject:'Refuser',change:'Demander une modification',send:'Envoyer',cancel:'Annuler',commentChange:'Que devons-nous modifier ?',commentReject:'Pourquoi cela ne vous convient pas ? (facultatif)',commentRequired:'Merci de décrire la modification souhaitée.',saving:'Envoi…',saved:'Merci — votre réponse a été envoyée à SB Marketing.',saveError:'Votre réponse n’a pas pu être envoyée. Réessayez ou contactez-nous.',previewOnly:'Aperçu admin — les réponses sont désactivées ici.',cannotAnswer:'Cette publication est déjà en ligne.',noId:'Vous pourrez répondre dès que SB Marketing aura réenregistré le calendrier.',yourAnswer:'Votre réponse',changeAnswer:'Modifier ma réponse',caption:'Texte',openLink:'Voir la publication',
      decisions:{approved:'Approuvé',rejected:'Refusé',changes_requested:'Modification demandée'},
      labels:{visitors:'Visiteurs uniques',sessions:'Sessions',visits:'Visites',page_views:'Pages vues',avg_duration:'Durée moyenne',contacts:'Appels et demandes'},
      engage:{bounce:'Taux de rebond',pages_per_session:'Pages par session',new_visitors:'Nouveaux visiteurs',contacts:'Appels et demandes'},
      statuses:{planned:'Prévu',in_design:'En création',ready:'Prêt',published:'Publié'}}};
  var ICONS={visitors:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',sessions:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',visits:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',page_views:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',avg_duration:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',contacts:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'};
  function icon(key){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[key]||ICONS.visits)+'</svg>';}
  function legacyStatus(value){var v=String(value||'').toLowerCase();if(/publi|done|termin|live/.test(v))return 'published';if(/ready|prêt|approved|scheduled/.test(v))return 'ready';if(/design|draft|cours|progress|création/.test(v))return 'in_design';return 'planned';}
  function number(value){var n=parseFloat(String(value||'').replace(/[^\d.,-]/g,'').replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:0;}
  function barList(items,labelKey,valueKey,t){if(!items||!items.length)return '<p class="cd-muted">'+t.noList+'</p>';var max=Math.max.apply(null,items.map(function(i){return number(i[valueKey]);}).concat([1]));return '<ul class="cd-bars">'+items.map(function(i){var pct=Math.max(4,Math.round(number(i[valueKey])/max*100));return '<li><div><span>'+escapeHtml(i[labelKey])+'</span><strong>'+escapeHtml(i[valueKey]||'')+'</strong></div><i style="width:'+pct+'%"></i></li>';}).join('')+'</ul>';}
  function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function locale(lang){return lang==='fr'?'fr-FR':'en-GB';}
  function longDate(value,lang){if(!/^\d{4}-\d{2}-\d{2}/.test(value||''))return value||'';return new Intl.DateTimeFormat(locale(lang),{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(value.slice(0,10)+'T12:00:00'));}

  // ── Demo analytics (shown only while the client has no figures saved, always labelled) ──
  function demoAnalytics(lang){
    var days=[],base=[38,42,35,47,51,44,29,33,46,52,49,55,58,41,36,48,57,61,54,63,45,40,59,66,62,70,64,52,48,68],start=new Date();start.setDate(start.getDate()-29);
    base.forEach(function(v,i){var d=new Date(start);d.setDate(start.getDate()+i);days.push({date:iso(d),visits:v});});
    return{kpis:{visitors:{value:'1 086',change:'+12%'},sessions:{value:'1 524',change:'+9%'},page_views:{value:'3 962',change:'+15%'},avg_duration:{value:'1 min 48',change:'-4%'}},
      daily:days,
      top_pages:[{page:lang==='fr'?'Accueil':'Home',visits:'1 240'},{page:lang==='fr'?'Nos produits':'Our products',visits:'780'},{page:lang==='fr'?'Horaires & accès':'Opening hours',visits:'512'},{page:'Contact',visits:'298'}],
      sources:[{source:'Google',share:'58%'},{source:'Instagram',share:'21%'},{source:lang==='fr'?'Accès direct':'Direct',share:'14%'},{source:'Facebook',share:'7%'}],
      devices:[{device:'Mobile',share:'68%'},{device:lang==='fr'?'Ordinateur':'Desktop',share:'27%'},{device:lang==='fr'?'Tablette':'Tablet',share:'5%'}],
      engagement:{bounce:'41 %',pages_per_session:'2,6',new_visitors:'72 %',contacts:'24'}};
  }
  function demoBadge(t,show){return show?'<span class="cd-demo">'+escapeHtml(t.demo)+'</span>':'';}

  // Accessible single-series area chart with hover crosshair + tooltip.
  function visitsChart(root,days,t,lang){
    if(!days||!days.length){root.innerHTML='<p class="cd-muted">'+t.noList+'</p>';return;}
    var W=1000,H=260,pad={t:16,r:8,b:28,l:40},max=Math.max.apply(null,days.map(function(d){return d.visits;})),top=Math.ceil(max/20)*20||20,n=days.length;
    function x(i){return pad.l+(W-pad.l-pad.r)*(n===1?0.5:i/(n-1));}
    function y(v){return pad.t+(H-pad.t-pad.b)*(1-v/top);}
    var line=days.map(function(d,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(d.visits).toFixed(1);}).join(' '),area=line+' L'+x(n-1).toFixed(1)+' '+y(0)+' L'+x(0).toFixed(1)+' '+y(0)+' Z';
    var grid=[0,top/2,top].map(function(v){return '<line x1="'+pad.l+'" x2="'+(W-pad.r)+'" y1="'+y(v)+'" y2="'+y(v)+'" class="cd-chart__grid"/><text x="'+(pad.l-10)+'" y="'+(y(v)+4)+'" class="cd-chart__axis" text-anchor="end">'+v+'</text>';}).join('');
    var fmt=new Intl.DateTimeFormat(locale(lang),{day:'numeric',month:'short'}),ticks=days.map(function(d,i){return (i%7===0&&n-1-i>=4)||i===n-1?'<text x="'+x(i)+'" y="'+(H-6)+'" class="cd-chart__axis" text-anchor="'+(i===0?'start':i===n-1?'end':'middle')+'">'+escapeHtml(fmt.format(new Date(d.date+'T12:00:00')))+'</text>':'';}).join('');
    root.innerHTML='<div class="cd-chart__plot"><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="'+escapeHtml(t.visitsChart)+'">'+grid+'<path d="'+area+'" class="cd-chart__area"/><path d="'+line+'" class="cd-chart__line" vector-effect="non-scaling-stroke"/>'+ticks+'</svg><i class="cd-chart__cross" hidden></i><i class="cd-chart__dot" hidden></i><div class="cd-chart__tip" role="status" hidden></div></div>'
      +'<table class="sr-only"><caption>'+escapeHtml(t.visitsChart)+'</caption><tbody>'+days.map(function(d){return '<tr><th>'+escapeHtml(d.date)+'</th><td>'+d.visits+'</td></tr>';}).join('')+'</tbody></table>';
    var plot=root.querySelector('.cd-chart__plot'),cross=plot.querySelector('.cd-chart__cross'),dot=plot.querySelector('.cd-chart__dot'),tip=plot.querySelector('.cd-chart__tip'),long=new Intl.DateTimeFormat(locale(lang),{weekday:'short',day:'numeric',month:'long'});
    function show(clientX){var r=plot.getBoundingClientRect(),rel=(clientX-r.left)/r.width*W,i=Math.round((rel-pad.l)/(W-pad.l-pad.r)*(n-1));i=Math.max(0,Math.min(n-1,i));var px=x(i)/W*100,py=y(days[i].visits)/H*100;
      cross.hidden=dot.hidden=tip.hidden=false;cross.style.left=dot.style.left=px+'%';dot.style.top=py+'%';tip.innerHTML='<span>'+escapeHtml(long.format(new Date(days[i].date+'T12:00:00')))+'</span><strong>'+days[i].visits+' '+escapeHtml(t.visits)+'</strong>';tip.style.left=Math.min(Math.max(px,12),88)+'%';}
    function hide(){cross.hidden=dot.hidden=tip.hidden=true;}
    plot.addEventListener('pointermove',function(e){show(e.clientX);});plot.addEventListener('pointerleave',hide);
  }

  function renderAnalytics(data,t,lang){
    var demo=demoAnalytics(lang),saved=data.analytics||{};if(!data.analytics&&data.metrics&&data.metrics.website_visits)saved={visits:{value:data.metrics.website_visits}};
    var savedKeys=Object.keys(t.labels).filter(function(k){return saved[k]&&saved[k].value;}),useDemoKpis=!savedKeys.length,kpis=useDemoKpis?demo.kpis:saved,keys=useDemoKpis?Object.keys(demo.kpis):savedKeys;
    var anyDemo=false;function mark(flag){if(flag)anyDemo=true;return flag;}
    document.querySelector('[data-metrics-badge]').innerHTML=demoBadge(t,mark(useDemoKpis));
    document.querySelector('[data-metrics]').innerHTML=keys.map(function(k){var m=kpis[k],change=String(m.change||''),dir=/^-|−/.test(change)?'down':(change?'up':'');return '<article class="metric-card"><span class="metric-card__icon">'+icon(k)+'</span><div><span>'+escapeHtml(t.labels[k])+'</span><strong>'+escapeHtml(m.value)+'</strong>'+(change?'<small class="metric-change metric-change--'+dir+'" title="'+escapeHtml(t.vs)+'">'+(dir==='down'?'▼ ':'▲ ')+escapeHtml(change.replace(/^[+\-−]/,''))+'</small>':'')+'</div></article>';}).join('');
    var daily=Array.isArray(data.daily_visits)&&data.daily_visits.length?data.daily_visits:null;
    document.querySelector('[data-chart-badge]').innerHTML=demoBadge(t,mark(!daily));visitsChart(document.querySelector('[data-visits-chart]'),daily||demo.daily,t,lang);
    var pages=data.top_pages&&data.top_pages.length?data.top_pages:null,sources=data.sources&&data.sources.length?data.sources:null,devices=data.devices&&data.devices.length?data.devices:null;
    document.querySelector('[data-top-pages-badge]').innerHTML=demoBadge(t,mark(!pages));document.querySelector('[data-top-pages]').innerHTML=barList(pages||demo.top_pages,'page','visits',t);
    document.querySelector('[data-sources-badge]').innerHTML=demoBadge(t,mark(!sources));document.querySelector('[data-sources]').innerHTML=barList(sources||demo.sources,'source','share',t);
    document.querySelector('[data-devices-badge]').innerHTML=demoBadge(t,mark(!devices));document.querySelector('[data-devices]').innerHTML=barList(devices||demo.devices,'device','share',t);
    var engagement=data.engagement||null;
    document.querySelector('[data-engagement-badge]').innerHTML=demoBadge(t,mark(!engagement));
    var eng=engagement||demo.engagement;document.querySelector('[data-engagement]').innerHTML='<dl class="cd-stats">'+Object.keys(t.engage).filter(function(k){return eng[k];}).map(function(k){return '<div><dt>'+escapeHtml(t.engage[k])+'</dt><dd>'+escapeHtml(eng[k])+'</dd></div>';}).join('')+'</dl>';
    document.querySelector('[data-demo-note]').hidden=!anyDemo;
  }

  // ── Content calendar ──
  var state={items:[],feedback:{},month:null,lang:'en',t:T.en,canAnswer:false,current:null};
  function decisionOf(item){return item.id&&state.feedback[item.id]?state.feedback[item.id]:null;}
  function chipHtml(item,index){var t=state.t,fb=decisionOf(item);return '<button type="button" class="cd-chip cd-chip--'+item.status+'" data-open-post="'+index+'">'+(item.image?'<img src="'+escapeHtml(item.image)+'" alt="" loading="lazy">':'<b>'+escapeHtml((item.platform||'•').charAt(0))+'</b>')+'<span>'+escapeHtml(item.topic||item.platform||'—')+'</span>'+(fb?'<em class="cd-decision cd-decision--'+fb.decision+'" title="'+escapeHtml(t.decisions[fb.decision])+'"></em>':'')+'</button>';}
  function renderCalendar(){
    var t=state.t,lang=state.lang,m=state.month,first=new Date(m.getFullYear(),m.getMonth(),1),offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(1-offset);
    var last=new Date(m.getFullYear(),m.getMonth()+1,0),cells=Math.ceil((offset+last.getDate())/7)*7,today=iso(new Date()),byDay={};
    state.items.forEach(function(item,i){if(/^\d{4}-\d{2}-\d{2}/.test(item.date)){var k=item.date.slice(0,10);(byDay[k]=byDay[k]||[]).push(i);}});
    text('[data-cal-month]',new Intl.DateTimeFormat(locale(lang),{month:'long',year:'numeric'}).format(first));
    document.querySelector('[data-cal-weekdays]').innerHTML=t.weekdays.map(function(d){return '<span>'+d+'</span>';}).join('');
    var dayFmt=new Intl.DateTimeFormat(locale(lang),{weekday:'long',day:'numeric',month:'long'}),html='';
    for(var c=0;c<cells;c++){var d=new Date(start);d.setDate(start.getDate()+c);var key=iso(d),list=byDay[key]||[],out=d.getMonth()!==m.getMonth();
      html+='<div class="cd-cal__cell'+(out?' is-out':'')+(key===today?' is-today':'')+(list.length?'':' is-empty')+'"><span class="cd-cal__day">'+d.getDate()+'</span><span class="cd-cal__full">'+escapeHtml(dayFmt.format(d))+'</span>'+list.map(function(i){return chipHtml(state.items[i],i);}).join('')+'</div>';}
    document.querySelector('[data-cal-grid]').innerHTML=html;
    var monthHasPosts=Object.keys(byDay).some(function(k){return k.slice(0,7)===iso(first).slice(0,7);});document.querySelector('[data-cal-empty]').hidden=monthHasPosts;
    document.querySelector('[data-cal-empty]').textContent=state.items.length?(lang==='fr'?'Aucune publication ce mois-ci.':'No publications this month.'):t.noCalendar;
    var undated=state.items.map(function(item,i){return{item:item,i:i};}).filter(function(x){return !/^\d{4}-\d{2}-\d{2}/.test(x.item.date);});
    var box=document.querySelector('[data-cal-undated]');box.hidden=!undated.length;box.innerHTML=undated.length?'<h3>'+escapeHtml(t.noDate)+'</h3><div class="cd-undated">'+undated.map(function(x){return chipHtml(x.item,x.i);}).join('')+'</div>':'';
  }
  function initialMonth(){var today=iso(new Date()),dated=state.items.filter(function(i){return /^\d{4}-\d{2}-\d{2}/.test(i.date);}).map(function(i){return i.date.slice(0,10);}).sort(),pick=dated.find(function(d){return d>=today;})||dated[dated.length-1];var d=pick?new Date(pick+'T12:00:00'):new Date();return new Date(d.getFullYear(),d.getMonth(),1);}
  var dialog=document.querySelector('[data-post-dialog]');
  function openPost(index){
    var item=state.items[index],t=state.t,fb=decisionOf(item);if(!item)return;state.current=index;
    var reason=!state.canAnswer?t.previewOnly:item.status==='published'?t.cannotAnswer:!item.id?t.noId:'',canAnswer=!reason;
    dialog.querySelector('[data-post-body]').innerHTML=(item.image?'<div class="cd-dialog__media"><img src="'+escapeHtml(item.image)+'" alt=""></div>':'')
      +'<div class="cd-dialog__info"><div class="cd-post__meta"><span class="cd-post__date">'+escapeHtml(longDate(item.date,state.lang)||t.noDate)+'</span><span class="status status--'+item.status+'">'+escapeHtml(t.statuses[item.status])+'</span></div>'
      +'<h2 id="cd-post-title">'+escapeHtml(item.topic||'—')+'</h2><div class="cd-post__tags">'+(item.platform?'<span class="channel">'+escapeHtml(item.platform)+'</span>':'')+(item.format?'<span class="cd-post__format">'+escapeHtml(item.format)+'</span>':'')+'</div>'
      +(item.caption?'<h4>'+escapeHtml(t.caption)+'</h4><p class="cd-dialog__caption">'+escapeHtml(item.caption)+'</p>':'')+(item.link?'<a class="cd-dialog__link" href="'+escapeHtml(item.link)+'" target="_blank" rel="noopener">'+escapeHtml(t.openLink)+' ↗</a>':'')
      +(fb?'<div class="cd-answer cd-answer--'+fb.decision+'"><span>'+escapeHtml(t.yourAnswer)+'</span><strong>'+escapeHtml(t.decisions[fb.decision])+'</strong>'+(fb.comment?'<p>'+escapeHtml(fb.comment)+'</p>':'')+'</div>':'')
      +(canAnswer?'<div class="cd-actions" data-actions><button type="button" class="cd-btn cd-btn--approve" data-decide="approved">'+escapeHtml(t.approve)+'</button><button type="button" class="cd-btn cd-btn--ghost" data-decide="changes_requested">'+escapeHtml(t.change)+'</button><button type="button" class="cd-btn cd-btn--reject" data-decide="rejected">'+escapeHtml(t.reject)+'</button></div>'
        +'<form class="cd-comment" data-comment-form hidden><label><span data-comment-label></span><textarea name="comment" rows="3" maxlength="2000"></textarea></label><div><button type="button" class="cd-btn cd-btn--ghost" data-comment-cancel>'+escapeHtml(t.cancel)+'</button><button type="submit" class="cd-btn">'+escapeHtml(t.send)+'</button></div></form>'
        :'<p class="cd-note">'+escapeHtml(reason)+'</p>')
      +'<p class="cd-feedback-msg" data-feedback-msg role="status"></p></div>';
    if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();else dialog.setAttribute('open','');
  }
  function feedbackMsg(value,isError){var el=dialog.querySelector('[data-feedback-msg]');if(el){el.textContent=value;el.classList.toggle('is-error',!!isError);}}
  async function submitDecision(decision,comment){
    var item=state.items[state.current],t=state.t;if(!item||!item.id)return;
    if(decision==='changes_requested'&&!comment){feedbackMsg(t.commentRequired,true);return;}
    dialog.querySelectorAll('.cd-btn').forEach(function(b){b.disabled=true;});feedbackMsg(t.saving);
    try{var response=await fetch(config.url+'/rest/v1/rpc/respond_to_calendar_item',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify({access_token:accessToken,item_id:item.id,decision:decision,comment_text:comment||null})});
      if(!response.ok)throw new Error('failed');var entry=await response.json();state.feedback[item.id]=entry&&entry.decision?entry:{decision:decision,comment:comment||null};renderCalendar();openPost(state.current);feedbackMsg(t.saved);}
    catch(e){dialog.querySelectorAll('.cd-btn').forEach(function(b){b.disabled=false;});feedbackMsg(t.saveError,true);}
  }
  if(dialog){
    dialog.addEventListener('click',function(event){
      if(event.target===dialog||event.target.closest('[data-post-close]')){dialog.close?dialog.close():dialog.removeAttribute('open');return;}
      var decide=event.target.closest('[data-decide]');
      if(decide){var d=decide.dataset.decide;if(d==='approved'){submitDecision('approved',null);return;}var form=dialog.querySelector('[data-comment-form]');form.hidden=false;form.dataset.decision=d;dialog.querySelector('[data-actions]').hidden=true;form.querySelector('[data-comment-label]').textContent=d==='rejected'?state.t.commentReject:state.t.commentChange;form.querySelector('textarea').focus();return;}
      if(event.target.closest('[data-comment-cancel]')){dialog.querySelector('[data-comment-form]').hidden=true;dialog.querySelector('[data-actions]').hidden=false;feedbackMsg('');}
    });
    dialog.addEventListener('submit',function(event){var form=event.target.closest('[data-comment-form]');if(!form)return;event.preventDefault();submitDecision(form.dataset.decision,String(form.elements.comment.value||'').trim());});
  }
  document.addEventListener('click',function(event){
    var open=event.target.closest('[data-open-post]');if(open){openPost(Number(open.dataset.openPost));return;}
    var nav=event.target.closest('[data-cal-nav]');if(nav&&state.month){var step=nav.dataset.calNav;state.month=step==='today'?new Date(new Date().getFullYear(),new Date().getMonth(),1):new Date(state.month.getFullYear(),state.month.getMonth()+(step==='next'?1:-1),1);renderCalendar();}
  });

  // ── Pages (hash routing: #analytics, #calendar) ──
  var PAGES=['analytics','calendar'];
  function showPage(){var name=(location.hash||'').replace('#','');if(PAGES.indexOf(name)<0)name='analytics';
    document.querySelectorAll('[data-page]').forEach(function(page){page.hidden=page.dataset.page!==name;});
    document.querySelectorAll('.cd-nav a[href^="#"]').forEach(function(link){link.classList.toggle('is-active',link.getAttribute('href')==='#'+name);});
    var t=state.t;text('[data-page-title]',name==='calendar'?t.calendar:t.analytics);window.scrollTo(0,0);}
  window.addEventListener('hashchange',showPage);

  function render(result,options){
    var data=result.dashboard||{},lang=result.language==='fr'?'fr':'en',t=T[lang];document.documentElement.lang=lang;document.title=result.business_name+' | SB Marketing';
    state.lang=lang;state.t=t;state.canAnswer=!!(options&&options.canAnswer);
    document.querySelectorAll('[data-i18n]').forEach(function(el){var key=el.getAttribute('data-i18n');if(typeof t[key]==='string')el.textContent=t[key];});
    document.querySelectorAll('[data-i18n-label]').forEach(function(el){var key=el.getAttribute('data-i18n-label');if(t[key])el.setAttribute('aria-label',t[key]);});
    var foot=document.querySelector('footer');if(foot)foot.innerHTML=escapeHtml(t.footer)+' <strong>SB Marketing</strong> · <a href="mailto:contact@sbmarketing.fr">contact@sbmarketing.fr</a>';
    var person=result.contact_name||result.business_name||'';document.querySelectorAll('[data-client-name]').forEach(function(el){el.textContent=result.business_name||'';});text('[data-side-business]',result.business_name);text('[data-top-name]',person);document.querySelectorAll('[data-avatar]').forEach(function(el){el.textContent=(person.trim().charAt(0)||'•');});var sidebar=document.querySelector('[data-sidebar]');if(sidebar)sidebar.hidden=false;
    text('[data-period]',data.period||'—');text('[data-updated]',data.updated_label?t.updated+data.updated_label:'');
    renderAnalytics(data,t,lang);
    // Calendar: posts uploaded in the admin dashboard editor, plus client-visible content items.
    state.feedback=result.calendar_feedback||{};
    state.items=(data.calendar||[]).map(function(i){return{id:i.id||'',date:i.date||'',platform:i.platform||i.channel||'',format:i.format||i.type||'',topic:i.topic||'',caption:i.caption||'',image:i.image||i.visual_url||'',status:legacyStatus(i.status),link:i.link||i.publication_url||''};})
      .concat((result.content||[]).map(function(i){return{id:'',date:i.date||'',platform:i.platform||'',format:i.type||'',topic:i.topic||'',caption:i.caption||'',image:i.visual_url||'',status:legacyStatus(i.status),link:i.publication_url||''};}))
      .sort(function(a,b){return String(a.date||'9999').localeCompare(String(b.date||'9999'));});
    state.month=initialMonth();renderCalendar();
    loading.hidden=true;content.hidden=false;showPage();
  }

  var previewId=new URLSearchParams(location.search).get('preview');
  if(previewId&&config){loadPreview(previewId);return;}
  if(!accessToken||!config){fail();return;}
  fetch(config.url+'/rest/v1/rpc/get_client_dashboard',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify({access_token:accessToken})}).then(function(response){if(!response.ok)throw new Error('Request failed');return response.json();}).then(function(result){if(!result)throw new Error('Not found');render(result,{canAnswer:true});}).catch(fail);
  // Admin preview: opened from /admin/ with ?preview=<client id>. Uses the
  // admin's own signed-in session (same browser), so drafts can be checked
  // before publishing. Clients never get this link.
  function adminSession(){try{return JSON.parse(localStorage.getItem('sb_admin_session')||'null');}catch(e){return null;}}
  function previewFail(message){loading.hidden=true;error.hidden=false;var title=error.querySelector('h1'),copy=error.querySelector('p'),link=error.querySelector('a');if(title)title.textContent='Admin preview unavailable';if(copy)copy.textContent=message;if(link){link.href='/admin/';link.textContent='Open the admin';}}
  async function adminGet(path,session){var response=await fetch(config.url+path,{headers:{apikey:config.key,Authorization:'Bearer '+session.access_token}});if(response.status===401&&session.refresh_token){var refresh=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});if(!refresh.ok)throw new Error('session');var fresh=await refresh.json();localStorage.setItem('sb_admin_session',JSON.stringify(fresh));Object.assign(session,fresh);return adminGet(path,session);}if(!response.ok)throw new Error('request');return response.json();}
  async function loadPreview(id){
    var session=adminSession();if(!session||!session.access_token){previewFail('Sign in to the SB Marketing admin in this browser, then open the dashboard again.');return;}
    var q=encodeURIComponent(id);
    try{
      var rows=await adminGet('/rest/v1/clients?id=eq.'+q+'&select=*',session);
      if(!rows||!rows.length){previewFail('This client could not be found.');return;}
      var c=rows[0],contentRows=await adminGet('/rest/v1/content_items?client_id=eq.'+q+'&client_visible=eq.true&select=publish_date,platform,content_type,topic,caption,visual_url,status,publication_url&order=publish_date.asc',session).catch(function(){return[];});
      render({business_name:c.business_name,contact_name:c.contact_name,language:c.language,dashboard:c.portal_draft_data||c.dashboard_data||{},calendar_feedback:c.calendar_feedback||{},
        content:(contentRows||[]).map(function(i){return{date:i.publish_date,platform:i.platform,type:i.content_type,topic:i.topic,caption:i.caption,visual_url:i.visual_url,status:i.status,publication_url:i.publication_url};})},{canAnswer:false});
      var banner=document.createElement('div');banner.className='portal-preview-banner';banner.innerHTML='<strong>Admin preview</strong><span>'+(c.portal_draft_data?'Previewing the saved draft — the client still sees the last published version.':c.portal_enabled?'Published — the client sees this dashboard through their private link.':'Draft — not visible to the client until you publish it in the admin.')+'</span><a href="/admin/">Back to admin</a>';
      document.querySelector('.portal-main').prepend(banner);document.title='Preview · '+c.business_name+' | SB Marketing';
    }catch(e){previewFail(e.message==='session'?'Your admin session has expired. Sign in to the admin again, then reopen this dashboard.':'The dashboard could not be loaded. Check that you are signed in to the admin with the SB Marketing account.');}
  }
})();
