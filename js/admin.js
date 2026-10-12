(function(){
  'use strict';
  var config=window.SB_SUPABASE,sessionKey='sb_admin_session',leads=[],clients=[],appSettings=null;
  var loginView=document.querySelector('[data-login-view]'),dashboard=document.querySelector('[data-dashboard]'),loginForm=document.querySelector('[data-login-form]'),loginMessage=document.querySelector('[data-login-message]'),dashboardMessage=document.querySelector('[data-dashboard-message]'),tbody=document.querySelector('[data-leads-body]'),empty=document.querySelector('[data-empty]'),search=document.querySelector('[data-search]'),filter=document.querySelector('[data-status-filter]');
  var viewTitle=document.querySelector('[data-view-title]'),tabs=document.querySelectorAll('[data-tab]'),views={leads:document.querySelector('[data-view="leads"]'),clients:document.querySelector('[data-view="clients"]'),settings:document.querySelector('[data-view="settings"]')};
  var clientsBody=document.querySelector('[data-clients-body]'),clientsEmpty=document.querySelector('[data-clients-empty]'),clientsMessage=document.querySelector('[data-clients-message]'),clientSearch=document.querySelector('[data-client-search]'),clientDueFilter=document.querySelector('[data-client-due-filter]');
  var addClientToggle=document.querySelector('[data-add-client-toggle]'),addClientForm=document.querySelector('[data-add-client-form]'),addClientCancel=document.querySelector('[data-add-client-cancel]'),addClientMessage=document.querySelector('[data-add-client-message]');
  var sendDialog=document.querySelector('[data-send-dialog]'),sendForm=document.querySelector('[data-send-form]'),sendClientLabel=document.querySelector('[data-send-client]'),sendMessage=document.querySelector('[data-send-message]'),sendCancel=document.querySelector('[data-send-cancel]'),sendTypeSelect=document.querySelector('[data-send-type]'),sendPreviewBtn=document.querySelector('[data-send-preview]'),previewPane=document.querySelector('[data-preview-pane]'),previewFrame=document.querySelector('[data-preview-frame]'),previewClose=document.querySelector('[data-preview-close]');
  var clientDialog=document.querySelector('[data-client-dialog]'),clientDialogName=document.querySelector('[data-client-dialog-name]'),clientDialogStatus=document.querySelector('[data-client-dialog-status]'),clientDialogClose=document.querySelector('[data-client-dialog-close]'),clientEditForm=document.querySelector('[data-client-edit-form]'),clientEditMessage=document.querySelector('[data-client-edit-message]'),clientDeleteBtn=document.querySelector('[data-client-delete]'),clientDialogSendEmail=document.querySelector('[data-client-send-email]'),clientWhatsappLink=document.querySelector('[data-client-whatsapp]'),clientUnsubscribedNote=document.querySelector('[data-client-unsubscribed]');
  var clientHistoryList=document.querySelector('[data-client-history-list]'),clientHistoryMessage=document.querySelector('[data-client-history-message]'),clientHistoryEmpty=document.querySelector('[data-client-history-empty]');
  var settingsForm=document.querySelector('[data-settings-form]'),settingsMessage=document.querySelector('[data-settings-message]');
  var bulkToggle=document.querySelector('[data-bulk-tip-toggle]'),bulkDialog=document.querySelector('[data-bulk-dialog]'),bulkForm=document.querySelector('[data-bulk-form]'),bulkList=document.querySelector('[data-bulk-client-list]'),bulkActivityFilter=document.querySelector('[data-bulk-activity-filter]'),bulkMessage=document.querySelector('[data-bulk-message]'),bulkCancel=document.querySelector('[data-bulk-cancel]');
  var sendTarget=null,lastMonthMetrics=null,dialogTarget=null;
  // The full metric catalog, grouped the way both the client "which
  // metrics do they track" checklist and the report email organise them.
  // A client's clients.tracked_metrics is just an array of keys from here.
  var METRIC_GROUPS=[
    {title:'Website traffic',metrics:[
      {key:'website_visits',label:'Visits this month',lowerIsBetter:false}
    ]},
    {title:'Google Search',metrics:[
      {key:'google_impressions',label:'Impressions',lowerIsBetter:false},
      {key:'google_clicks',label:'Clicks',lowerIsBetter:false},
      {key:'google_avg_position',label:'Avg. position',lowerIsBetter:true}
    ]},
    {title:'Google Business Profile',metrics:[
      {key:'gbp_views',label:'Profile views',lowerIsBetter:false},
      {key:'gbp_calls',label:'Calls',lowerIsBetter:false},
      {key:'gbp_direction_requests',label:'Direction requests',lowerIsBetter:false},
      {key:'gbp_review_count',label:'Review count',lowerIsBetter:false},
      {key:'gbp_rating',label:'Average rating',lowerIsBetter:false}
    ]},
    {title:'Social media',metrics:[
      {key:'social_followers',label:'Followers',lowerIsBetter:false},
      {key:'social_engagement',label:'Engagement',lowerIsBetter:false},
      {key:'social_posts',label:'Posts published',lowerIsBetter:false}
    ]},
    {title:'Ads',metrics:[
      {key:'ads_spend',label:'Ad spend',lowerIsBetter:false},
      {key:'ads_impressions',label:'Impressions',lowerIsBetter:false},
      {key:'ads_clicks',label:'Clicks',lowerIsBetter:false},
      {key:'ads_roas',label:'ROAS',lowerIsBetter:false},
      {key:'ads_conversions',label:'Conversions',lowerIsBetter:false}
    ]},
    {title:'Leads & sales',metrics:[
      {key:'new_leads',label:'New leads',lowerIsBetter:false},
      {key:'conversion_rate',label:'Conversion rate',lowerIsBetter:false},
      {key:'revenue',label:'Revenue',lowerIsBetter:false}
    ]}
  ];
  var METRIC_BY_KEY={};
  METRIC_GROUPS.forEach(function(g){g.metrics.forEach(function(m){METRIC_BY_KEY[m.key]=m;});});
  var DEFAULT_TRACKED_METRICS=['website_visits','google_impressions','google_clicks','google_avg_position'];
  // Curated list, not exhaustive — covers the countries SB Marketing's
  // client base is realistically in. code = dial code digits (no +).
  var COUNTRIES=[
    {flag:'🇫🇷',name:'France',code:'33'},
    {flag:'🇧🇪',name:'Belgium',code:'32'},
    {flag:'🇨🇭',name:'Switzerland',code:'41'},
    {flag:'🇲🇨',name:'Monaco',code:'377'},
    {flag:'🇱🇺',name:'Luxembourg',code:'352'},
    {flag:'🇮🇹',name:'Italy',code:'39'},
    {flag:'🇪🇸',name:'Spain',code:'34'},
    {flag:'🇵🇹',name:'Portugal',code:'351'},
    {flag:'🇩🇪',name:'Germany',code:'49'},
    {flag:'🇬🇧',name:'United Kingdom',code:'44'},
    {flag:'🇳🇱',name:'Netherlands',code:'31'},
    {flag:'🇲🇦',name:'Morocco',code:'212'},
    {flag:'🇩🇿',name:'Algeria',code:'213'},
    {flag:'🇹🇳',name:'Tunisia',code:'216'},
    {flag:'🇨🇦',name:'Canada',code:'1'},
    {flag:'🇺🇸',name:'United States',code:'1'},
    {flag:'🇦🇪',name:'United Arab Emirates',code:'971'},
    {flag:'🇸🇦',name:'Saudi Arabia',code:'966'}
  ];

  function message(element,text){if(element)element.textContent=text||'';}
  function getSession(){try{return JSON.parse(localStorage.getItem(sessionKey)||'null');}catch(error){return null;}}
  function setSession(value){if(value)localStorage.setItem(sessionKey,JSON.stringify(value));else localStorage.removeItem(sessionKey);}
  function showDashboard(show){loginView.hidden=show;dashboard.hidden=!show;}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];});}
  function safeUrl(value){try{var url=new URL(value);return url.protocol==='http:'||url.protocol==='https:'?url.href:'';}catch(error){return '';}}

  async function request(path,options){var session=getSession(),headers=Object.assign({apikey:config.key,Authorization:'Bearer '+(session?session.access_token:config.key)},options&&options.headers||{}),response=await fetch(config.url+path,Object.assign({},options||{},{headers:headers}));if(response.status===401&&session&&session.refresh_token){var refreshed=await refreshSession(session.refresh_token);if(refreshed)return request(path,options);}if(!response.ok){var details=await response.json().catch(function(){return{};});throw new Error(details.message||details.hint||details.error_description||'Request failed');}if(response.status===204||response.headers.get('content-length')==='0')return null;return response.json();}
  async function refreshSession(token){var response=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:token})});if(!response.ok){setSession(null);showDashboard(false);return null;}var session=await response.json();setSession(session);return session;}

  // ── Edge Functions ──────────────────────────────────────────
  async function invokeFunction(name,payload){var session=getSession(),response=await fetch(config.url+'/functions/v1/'+name,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+(session?session.access_token:config.key),'Content-Type':'application/json'},body:JSON.stringify(payload)});var body=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(body.error||'Request failed ('+response.status+')');return body;}

  // ── Leads ───────────────────────────────────────────────────
  async function loadLeads(){message(dashboardMessage,'Loading leads…');try{leads=await request('/rest/v1/butcher_leads?select=*&order=created_at.desc');render();message(dashboardMessage,'');document.querySelector('[data-last-update]').textContent='Updated '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date());}catch(error){message(dashboardMessage,error.message.indexOf('butcher_leads')>-1?'Database setup required. Run supabase/schema.sql in the Supabase SQL Editor.':error.message);}}
  function render(){var term=search.value.trim().toLowerCase(),status=filter.value,filtered=leads.filter(function(lead){var searchable=[lead.full_name,lead.butcher_shop,lead.email,lead.phone,lead.city_country].join(' ').toLowerCase();return(!term||searchable.indexOf(term)>-1)&&(!status||lead.status===status);});tbody.innerHTML=filtered.map(function(lead){var cleanWebsite=safeUrl(lead.website),website=cleanWebsite?'<a class="website-link" href="'+escapeHtml(cleanWebsite)+'" target="_blank" rel="noopener">Open site ↗</a>':'—';return'<tr><td>'+escapeHtml(new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(lead.created_at)))+'</td><td class="contact"><strong>'+escapeHtml(lead.full_name)+'</strong><a href="mailto:'+escapeHtml(lead.email)+'">'+escapeHtml(lead.email)+'</a><a href="tel:'+escapeHtml(lead.phone)+'">'+escapeHtml(lead.phone)+'</a></td><td class="shop"><strong>'+escapeHtml(lead.butcher_shop)+'</strong><span>'+escapeHtml(lead.has_website||'')+'</span></td><td>'+escapeHtml(lead.city_country)+'</td><td>'+website+'</td><td><span class="lang">'+escapeHtml(lead.language)+'</span></td><td><select class="status-select" data-lead-status="'+escapeHtml(lead.id)+'"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="customer">Customer</option><option value="closed">Closed</option></select></td></tr>';}).join('');filtered.forEach(function(lead,index){tbody.querySelectorAll('[data-lead-status]')[index].value=lead.status||'new';});empty.hidden=filtered.length!==0;document.querySelector('[data-stat-total]').textContent=leads.length;document.querySelector('[data-stat-new]').textContent=leads.filter(function(x){return x.status==='new';}).length;document.querySelector('[data-stat-contacted]').textContent=leads.filter(function(x){return x.status==='contacted';}).length;document.querySelector('[data-stat-customer]').textContent=leads.filter(function(x){return x.status==='customer';}).length;}
  async function updateStatus(id,status,select){select.disabled=true;try{await request('/rest/v1/butcher_leads?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({status:status})});var lead=leads.find(function(item){return item.id===id;});if(lead)lead.status=status;render();}catch(error){message(dashboardMessage,error.message);}finally{select.disabled=false;}}
  function exportCsv(){var fields=['created_at','full_name','butcher_shop','phone','email','city_country','website','has_website','language','status','source_page'],rows=[fields].concat(leads.map(function(lead){return fields.map(function(field){return lead[field]||'';});})),csv=rows.map(function(row){return row.map(function(value){return '"'+String(value).replace(/"/g,'""')+'"';}).join(',');}).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='sb-marketing-leads-'+new Date().toISOString().slice(0,10)+'.csv';link.click();URL.revokeObjectURL(link.href);}

  // ── Phone helpers (WhatsApp, E.164) ────────────────────────────
  function populateCountrySelects(){document.querySelectorAll('.country-select').forEach(function(select){if(select.dataset.populated)return;select.innerHTML=COUNTRIES.map(function(c){return '<option value="'+c.code+'">'+c.flag+' +'+c.code+' '+c.name+'</option>';}).join('');select.dataset.populated='1';});}
  function toE164(countryCode,local){var digits=String(local||'').replace(/\D/g,'').replace(/^0+/,'');if(!digits)return null;return '+'+countryCode+digits;}
  function splitE164(value){if(!value)return{code:'33',local:''};var digits=value.replace(/^\+/,'');var sorted=COUNTRIES.slice().sort(function(a,b){return b.code.length-a.code.length;});for(var i=0;i<sorted.length;i++){if(digits.indexOf(sorted[i].code)===0)return{code:sorted[i].code,local:digits.slice(sorted[i].code.length)};}return{code:'33',local:digits};}
  function fillPhoneField(form,value){var split=splitE164(value);var countrySelect=form.querySelector('[name="whatsapp_country"]'),localInput=form.querySelector('[name="whatsapp_local"]');if(countrySelect)countrySelect.value=split.code;if(localInput)localInput.value=split.local;}
  function readPhoneField(form){var countrySelect=form.querySelector('[name="whatsapp_country"]'),localInput=form.querySelector('[name="whatsapp_local"]');if(!localInput||!localInput.value.trim())return null;return toE164(countrySelect?countrySelect.value:'33',localInput.value);}

  // ── Tracked-metrics checklist (add-client form + client detail form) ──
  function populateTrackedMetricsContainers(){
    document.querySelectorAll('[data-tracked-metrics]').forEach(function(container){
      if(container.dataset.populated)return;
      container.innerHTML=METRIC_GROUPS.map(function(g){
        return '<div class="tracked-metrics__group"><span class="tracked-metrics__group-title">'+escapeHtml(g.title)+'</span>'
          +g.metrics.map(function(m){return '<label class="checkbox-field checkbox-field--compact"><input type="checkbox" value="'+escapeHtml(m.key)+'"> '+escapeHtml(m.label)+'</label>';}).join('')
          +'</div>';
      }).join('');
      container.dataset.populated='1';
    });
  }
  function getCheckedTrackedMetrics(container){return container?Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(function(i){return i.value;}):[];}
  function setTrackedMetricsChecked(container,keys){if(!container)return;var set={};(keys||[]).forEach(function(k){set[k]=true;});container.querySelectorAll('input[type="checkbox"]').forEach(function(i){i.checked=!!set[i.value];});}

  // ── Settings (brand chrome used by the email templates) ───────
  async function loadSettings(){try{var rows=await request('/rest/v1/app_settings?id=eq.default&select=*&limit=1');appSettings=(rows&&rows[0])||null;if(appSettings&&settingsForm){Object.keys(appSettings).forEach(function(key){var field=settingsForm.elements[key];if(field)field.value=appSettings[key]||'';});}}catch(error){message(settingsMessage,error.message.indexOf('app_settings')>-1?'Database setup required. Re-run supabase/clients_schema.sql in the Supabase SQL Editor.':error.message);}}
  async function saveSettings(event){event.preventDefault();var button=settingsForm.querySelector('button[type="submit"]'),data=new FormData(settingsForm),payload={};['company_name','logo_url','logo_part1','logo_part2','footer_tagline_fr','footer_tagline_en','website_url','reply_to_email','instagram_url','facebook_url'].forEach(function(key){payload[key]=String(data.get(key)||'').trim()||null;});button.disabled=true;message(settingsMessage,'Saving…');try{await request('/rest/v1/app_settings?id=eq.default',{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});appSettings=Object.assign({},appSettings,payload);message(settingsMessage,'Saved.');}catch(error){message(settingsMessage,error.message);}finally{button.disabled=false;}}
  function brandingPayload(){if(!appSettings)return undefined;return{companyName:appSettings.company_name||undefined,logoUrl:appSettings.logo_url||undefined,logoPart1:appSettings.logo_part1||undefined,logoPart2:appSettings.logo_part2||undefined,footerTaglineFr:appSettings.footer_tagline_fr||undefined,footerTaglineEn:appSettings.footer_tagline_en||undefined,websiteUrl:appSettings.website_url||undefined,instagramUrl:appSettings.instagram_url||undefined,facebookUrl:appSettings.facebook_url||undefined};}

  // ── Clients: due-status helpers ────────────────────────────────
  // "Due" means no report has gone out yet this calendar month — matches
  // the monthly cadence the whole feature is built around, rather than a
  // rolling 30-day window.
  function isSentThisMonth(client){if(!client.last_report_sent_at)return false;var d=new Date(client.last_report_sent_at),now=new Date();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();}
  function isDue(client){return client.status==='active'&&!isSentThisMonth(client);}
  function dueBadgeHtml(client){if(client.status!=='active')return '<span class="due-badge due-badge--paused">Paused</span>';return isSentThisMonth(client)?'<span class="due-badge due-badge--ok">Sent this month</span>':'<span class="due-badge due-badge--due">Due now</span>';}

  // ── Clients: list ───────────────────────────────────────────────
  async function loadClients(){message(clientsMessage,'Loading clients…');try{clients=await request('/rest/v1/clients?select=*&order=created_at.desc');renderClients();refreshActivityFilterOptions();message(clientsMessage,'');}catch(error){message(clientsMessage,error.message.indexOf('clients')>-1?'Database setup required. Run supabase/clients_schema.sql in the Supabase SQL Editor.':error.message);}}
  function refreshActivityFilterOptions(){if(!bulkActivityFilter)return;var activities=Array.from(new Set(clients.map(function(c){return c.activity;}).filter(Boolean))).sort();var current=bulkActivityFilter.value;bulkActivityFilter.innerHTML='<option value="">All activities</option>'+activities.map(function(a){return '<option value="'+escapeHtml(a)+'">'+escapeHtml(a)+'</option>';}).join('');bulkActivityFilter.value=current;}
  function renderClients(){
    var term=(clientSearch?clientSearch.value:'').trim().toLowerCase(),due=(clientDueFilter?clientDueFilter.value:'');
    var filtered=clients.filter(function(c){
      var searchable=[c.business_name,c.contact_name,c.email,c.activity].join(' ').toLowerCase();
      if(term&&searchable.indexOf(term)===-1)return false;
      if(due==='due')return isDue(c);
      if(due==='sent')return c.status==='active'&&isSentThisMonth(c);
      if(due==='paused')return c.status==='paused';
      return true;
    });
    clientsBody.innerHTML=filtered.map(function(c){
      var lastSent=c.last_report_sent_at?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(c.last_report_sent_at)):'Never';
      return '<tr>'
        +'<td><button type="button" class="link-button" data-client-detail="'+escapeHtml(c.id)+'">'+escapeHtml(c.business_name)+'</button>'+(c.notes?'<span class="muted-note">'+escapeHtml(c.notes)+'</span>':'')+'</td>'
        +'<td class="contact"><strong>'+escapeHtml(c.contact_name||'—')+'</strong><a href="mailto:'+escapeHtml(c.email)+'">'+escapeHtml(c.email)+'</a></td>'
        +'<td>'+escapeHtml(c.activity||'—')+'</td>'
        +'<td><span class="lang">'+escapeHtml(c.language)+'</span></td>'
        +'<td><select class="status-select" data-client-status="'+escapeHtml(c.id)+'"><option value="active">Active</option><option value="paused">Paused</option></select></td>'
        +'<td>'+escapeHtml(lastSent)+'</td>'
        +'<td>'+dueBadgeHtml(c)+'</td>'
        +'<td><button type="button" class="secondary" data-send-email="'+escapeHtml(c.id)+'">Send email</button></td>'
        +'</tr>';
    }).join('');
    filtered.forEach(function(c,index){clientsBody.querySelectorAll('[data-client-status]')[index].value=c.status||'active';});
    clientsEmpty.hidden=filtered.length!==0;
    document.querySelector('[data-client-stat-total]').textContent=clients.length;
    document.querySelector('[data-client-stat-active]').textContent=clients.filter(function(c){return c.status==='active';}).length;
    document.querySelector('[data-client-stat-due]').textContent=clients.filter(isDue).length;
    document.querySelector('[data-client-stat-sent]').textContent=clients.filter(function(c){return c.last_report_sent_at;}).length;
  }
  async function updateClientStatus(id,status,select){select.disabled=true;try{await request('/rest/v1/clients?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({status:status})});var c=clients.find(function(item){return item.id===id;});if(c)c.status=status;renderClients();}catch(error){message(clientsMessage,error.message);}finally{select.disabled=false;}}
  async function addClient(event){
    event.preventDefault();
    var button=addClientForm.querySelector('[data-add-client-submit]'),data=new FormData(addClientForm);
    var payload={
      business_name:String(data.get('business_name')||'').trim(),
      contact_name:String(data.get('contact_name')||'').trim(),
      email:String(data.get('email')||'').trim(),
      whatsapp_number:readPhoneField(addClientForm),
      activity:String(data.get('activity')||'').trim()||null,
      language:data.get('language')||'fr',
      notes:String(data.get('notes')||'').trim()||null,
      marketing_consent:data.get('marketing_consent')==='on',
      tracked_metrics:getCheckedTrackedMetrics(addClientForm.querySelector('[data-tracked-metrics="add"]'))
    };
    message(addClientMessage,'');button.disabled=true;
    try{await request('/rest/v1/clients',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});addClientForm.reset();addClientForm.querySelector('[name="whatsapp_country"]').value='33';setTrackedMetricsChecked(addClientForm.querySelector('[data-tracked-metrics="add"]'),DEFAULT_TRACKED_METRICS);addClientForm.hidden=true;await loadClients();}catch(error){message(addClientMessage,error.message);}finally{button.disabled=false;}
  }

  // ── Clients: detail dialog (edit, history, delete, WhatsApp) ────
  function emailHistorySummary(r){
    if(r.type==='report'){
      var catalogChips=Object.keys(r.highlights||{}).map(function(key){var def=METRIC_BY_KEY[key];var label=def?def.label:key;return '<span class="history-chip">'+escapeHtml(label)+': <strong>'+escapeHtml(r.highlights[key])+'</strong></span>';}).join('');
      var customChips=(r.custom_metrics||[]).filter(function(m){return m.label&&m.value;}).map(function(m){return '<span class="history-chip">'+escapeHtml(m.label)+': <strong>'+escapeHtml(m.value)+'</strong></span>';}).join('');
      var chips=catalogChips+customChips;
      return '<strong>'+escapeHtml(r.month_label||'Report')+'</strong>'+(chips?'<div class="history-item__chips">'+chips+'</div>':'');
    }
    if(r.type==='tip')return '<strong>Tip: '+escapeHtml(r.headline||r.subject)+'</strong>'+(r.body?'<p class="history-item__summary">'+escapeHtml(r.body).slice(0,160)+'</p>':'');
    return '<strong>'+escapeHtml(r.subject||'Message')+'</strong>'+(r.body?'<p class="history-item__summary">'+escapeHtml(r.body).slice(0,160)+'</p>':'');
  }
  function renderHistoryList(reports){
    clientHistoryEmpty.hidden=reports.length!==0;
    clientHistoryList.innerHTML=reports.map(function(r){
      var sent=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(r.sent_at));
      var typeLabel={report:'Report',tip:'Tip',custom:'Custom'}[r.type]||r.type;
      return '<li><div class="history-item__head"><span class="history-type-badge history-type-badge--'+escapeHtml(r.type)+'">'+typeLabel+'</span><span>Sent '+sent+'</span></div>'
        +'<div class="history-item__body">'+emailHistorySummary(r)+'</div>'
        +'</li>';
    }).join('');
  }
  async function loadClientHistory(clientId){message(clientHistoryMessage,'Loading history…');try{var rows=await request('/rest/v1/client_emails?client_id=eq.'+encodeURIComponent(clientId)+'&select=*&order=sent_at.desc');renderHistoryList(rows);message(clientHistoryMessage,'');return rows;}catch(error){message(clientHistoryMessage,error.message.indexOf('client_emails')>-1?'Database setup required. Run supabase/clients_schema.sql in the Supabase SQL Editor.':error.message);return [];}}
  function fillClientEditForm(c){var f=clientEditForm;f.elements.business_name.value=c.business_name||'';f.elements.contact_name.value=c.contact_name||'';f.elements.email.value=c.email||'';f.elements.activity.value=c.activity||'';f.elements.language.value=c.language||'fr';f.elements.status.value=c.status||'active';f.elements.notes.value=c.notes||'';f.elements.marketing_consent.checked=!!c.marketing_consent;fillPhoneField(f,c.whatsapp_number);setTrackedMetricsChecked(f.querySelector('[data-tracked-metrics="edit"]'),c.tracked_metrics&&c.tracked_metrics.length?c.tracked_metrics:DEFAULT_TRACKED_METRICS);clientUnsubscribedNote.hidden=!c.unsubscribed_at;if(c.whatsapp_number){clientWhatsappLink.hidden=false;clientWhatsappLink.href='https://wa.me/'+c.whatsapp_number.replace(/\D/g,'');}else{clientWhatsappLink.hidden=true;}}
  async function openClientDialog(clientId){var c=clients.find(function(x){return x.id===clientId;});if(!c)return;dialogTarget=c;clientDialogName.textContent=c.business_name;clientDialogStatus.textContent=c.status==='active'?'Active':'Paused';clientDialogStatus.className='status-pill status-pill--'+c.status;fillClientEditForm(c);message(clientEditMessage,'');clientDialog.showModal();await loadClientHistory(c.id);}
  async function saveClientEdits(event){
    event.preventDefault();if(!dialogTarget)return;
    var button=clientEditForm.querySelector('button[type="submit"]'),data=new FormData(clientEditForm);
    var payload={
      business_name:String(data.get('business_name')||'').trim(),
      contact_name:String(data.get('contact_name')||'').trim(),
      email:String(data.get('email')||'').trim(),
      whatsapp_number:readPhoneField(clientEditForm),
      activity:String(data.get('activity')||'').trim()||null,
      language:data.get('language')||'fr',
      status:data.get('status')||'active',
      notes:String(data.get('notes')||'').trim()||null,
      marketing_consent:data.get('marketing_consent')==='on',
      tracked_metrics:getCheckedTrackedMetrics(clientEditForm.querySelector('[data-tracked-metrics="edit"]'))
    };
    button.disabled=true;message(clientEditMessage,'Saving…');
    try{await request('/rest/v1/clients?id=eq.'+encodeURIComponent(dialogTarget.id),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});Object.assign(dialogTarget,payload);renderClients();clientDialogName.textContent=payload.business_name;clientDialogStatus.textContent=payload.status==='active'?'Active':'Paused';clientDialogStatus.className='status-pill status-pill--'+payload.status;fillClientEditForm(dialogTarget);message(clientEditMessage,'Saved.');}catch(error){message(clientEditMessage,error.message);}finally{button.disabled=false;}
  }
  async function deleteClient(){if(!dialogTarget)return;if(!confirm('Delete '+dialogTarget.business_name+'? This also removes its email history. This cannot be undone.'))return;clientDeleteBtn.disabled=true;try{await request('/rest/v1/clients?id=eq.'+encodeURIComponent(dialogTarget.id),{method:'DELETE',headers:{Prefer:'return=minimal'}});clients=clients.filter(function(c){return c.id!==dialogTarget.id;});clientDialog.close();renderClients();refreshActivityFilterOptions();}catch(error){message(clientEditMessage,error.message);}finally{clientDeleteBtn.disabled=false;}}

  // ── Send dialog (report / tip / custom) ────────────────────────
  function setSendType(type){
    sendForm.querySelectorAll('[data-send-group]').forEach(function(group){group.hidden=group.dataset.sendGroup!==type;});
    previewPane.hidden=true;
  }
  // Only shows fields for metrics this client actually tracks (falls back
  // to the original core 4 if the client has none configured yet).
  function renderReportMetricsFields(client){
    var container=sendForm.querySelector('[data-report-metrics]');
    var tracked=(client.tracked_metrics&&client.tracked_metrics.length)?client.tracked_metrics:DEFAULT_TRACKED_METRICS;
    var trackedSet={};tracked.forEach(function(k){trackedSet[k]=true;});
    var html='';
    METRIC_GROUPS.forEach(function(g){
      var groupMetrics=g.metrics.filter(function(m){return trackedSet[m.key];});
      if(!groupMetrics.length)return;
      html+='<p class="field-hint">'+escapeHtml(g.title)+'</p>';
      html+='<div class="metric-grid'+(groupMetrics.length===1?' metric-grid--single':'')+'">';
      groupMetrics.forEach(function(m){
        html+='<label>'+escapeHtml(m.label)+'<input type="text" inputmode="'+(m.lowerIsBetter?'decimal':'numeric')+'" data-metric-field="'+escapeHtml(m.key)+'" placeholder="e.g. ..."><span class="field-previous" data-previous="'+escapeHtml(m.key)+'"></span></label>';
      });
      html+='</div>';
    });
    container.innerHTML=html||'<p class="muted-note">This client has no tracked metrics set yet — add some from their profile, or just use the custom metric rows below.</p>';
  }
  function addCustomMetricRow(label,value){
    var list=sendForm.querySelector('[data-custom-metrics-list]'),row=document.createElement('div');
    row.className='custom-metric-row';
    row.innerHTML='<input type="text" class="custom-metric-label" placeholder="Label (e.g. Newsletter signups)" value="'+escapeHtml(label||'')+'"><input type="text" class="custom-metric-value" placeholder="Value" value="'+escapeHtml(value||'')+'"><button type="button" class="icon-button" data-remove-custom-metric aria-label="Remove">✕</button>';
    list.appendChild(row);
  }
  function readCustomMetricRows(){return Array.from(sendForm.querySelectorAll('[data-custom-metrics-list] .custom-metric-row')).map(function(row){return{label:row.querySelector('.custom-metric-label').value.trim(),value:row.querySelector('.custom-metric-value').value.trim()};}).filter(function(m){return m.label&&m.value;});}
  async function openSendDialog(clientId){
    var client=clients.find(function(c){return c.id===clientId;});if(!client)return;
    sendTarget=client;lastMonthMetrics=null;
    sendClientLabel.textContent=client.business_name+' · '+client.email;
    sendForm.reset();
    sendTypeSelect.value='report';
    renderReportMetricsFields(client);
    sendForm.querySelector('[data-custom-metrics-list]').innerHTML='';
    setSendType('report');
    var now=new Date(),defaultMonth=new Intl.DateTimeFormat(client.language==='en'?'en-GB':'fr-FR',{month:'long',year:'numeric'}).format(now);
    sendForm.elements.month_label.value=defaultMonth.charAt(0).toUpperCase()+defaultMonth.slice(1);
    message(sendMessage,'');
    sendDialog.showModal();
    try{
      var history=await request('/rest/v1/client_emails?client_id=eq.'+encodeURIComponent(clientId)+'&type=eq.report&select=highlights&order=sent_at.desc&limit=1');
      if(history&&history.length&&history[0].highlights){
        lastMonthMetrics=history[0].highlights;
        Object.keys(lastMonthMetrics).forEach(function(key){var value=lastMonthMetrics[key];if(!value)return;var span=sendForm.querySelector('[data-previous="'+key+'"]');if(span)span.textContent='Last month: '+value;});
      }
    }catch(error){/* non-fatal: last-month context is a convenience, not required to send */}
  }
  function buildSendPayload(){
    var data=new FormData(sendForm),type=sendTypeSelect.value;
    var payload={type:type,to:sendTarget.email,business_name:sendTarget.business_name,contact_name:sendTarget.contact_name,language:sendTarget.language||'fr',client_id:sendTarget.id,branding:brandingPayload()};
    if(appSettings&&appSettings.reply_to_email)payload.reply_to=appSettings.reply_to_email;
    if(type==='report'){
      var tracked=(sendTarget.tracked_metrics&&sendTarget.tracked_metrics.length)?sendTarget.tracked_metrics:DEFAULT_TRACKED_METRICS;
      var trackedSet={};tracked.forEach(function(k){trackedSet[k]=true;});
      var groups=[],historyPayload={},hasAny=false;
      METRIC_GROUPS.forEach(function(g){
        var groupMetrics=g.metrics.filter(function(m){return trackedSet[m.key];});
        if(!groupMetrics.length)return;
        var metricsOut=[];
        groupMetrics.forEach(function(m){
          var input=sendForm.querySelector('[data-metric-field="'+m.key+'"]'),value=input?input.value.trim():'';
          if(!value)return;
          hasAny=true;
          var previous=lastMonthMetrics&&lastMonthMetrics[m.key]?lastMonthMetrics[m.key]:undefined;
          metricsOut.push({label:m.label,metric:{value:value,previous:previous},lowerIsBetter:!!m.lowerIsBetter});
          historyPayload[m.key]=value;
        });
        if(metricsOut.length)groups.push({title:g.title,metrics:metricsOut});
      });
      var customRows=readCustomMetricRows();
      if(customRows.length)hasAny=true;
      payload.month_label=String(data.get('month_label')||'').trim();
      payload.groups=groups;
      payload.custom_metrics=customRows;
      payload.summary=String(data.get('summary')||'').trim()||undefined;
      payload.report_url=String(data.get('report_url')||'').trim()||undefined;
      payload._hasAny=hasAny;payload._historyPayload=historyPayload;
    }else if(type==='tip'){
      payload.headline=String(data.get('headline')||'').trim();
      payload.body=String(data.get('tip_body')||'').trim();
      payload.cta_label=String(data.get('tip_cta_label')||'').trim()||undefined;
      payload.cta_url=String(data.get('tip_cta_url')||'').trim()||undefined;
      payload._hasAny=!!(payload.headline&&payload.body);
    }else{
      payload.subject=String(data.get('subject')||'').trim();
      payload.body=String(data.get('custom_body')||'').trim();
      payload.cta_label=String(data.get('custom_cta_label')||'').trim()||undefined;
      payload.cta_url=String(data.get('custom_cta_url')||'').trim()||undefined;
      payload._hasAny=!!(payload.subject&&payload.body);
    }
    return payload;
  }
  async function previewSend(){
    var payload=buildSendPayload();
    if(!payload._hasAny){message(sendMessage,'Fill in the content first.');return;}
    message(sendMessage,'Loading preview…');
    try{var result=await invokeFunction('send-client-report',Object.assign({},payload,{preview:true}));previewFrame.srcdoc=result.html;previewPane.hidden=false;message(sendMessage,'');}catch(error){message(sendMessage,error.message);}
  }
  async function sendEmail(event){
    event.preventDefault();if(!sendTarget)return;
    var payload=buildSendPayload();
    if(!payload._hasAny){message(sendMessage,sendTypeSelect.value==='report'?'Fill in at least one metric (visits, impressions, clicks or position).':'Fill in the required fields.');return;}
    var type=payload.type,historyPayload=payload._historyPayload;delete payload._hasAny;delete payload._historyPayload;
    var button=sendForm.querySelector('[data-send-submit]');button.disabled=true;message(sendMessage,'Sending…');
    try{
      await invokeFunction('send-client-report',payload);
      var sentAt=new Date().toISOString();
      var logEntry={client_id:sendTarget.id,type:type,sent_at:sentAt};
      if(type==='report'){logEntry.subject=(sendTarget.language==='en'?sendTarget.business_name+' — '+payload.month_label+' report':sendTarget.business_name+' — Rapport '+payload.month_label);logEntry.month_label=payload.month_label;logEntry.highlights=historyPayload;logEntry.custom_metrics=(payload.custom_metrics&&payload.custom_metrics.length)?payload.custom_metrics:null;}
      else if(type==='tip'){logEntry.subject=payload.headline;logEntry.headline=payload.headline;logEntry.body=payload.body;logEntry.cta_label=payload.cta_label||null;logEntry.cta_url=payload.cta_url||null;}
      else{logEntry.subject=payload.subject;logEntry.body=payload.body;logEntry.cta_label=payload.cta_label||null;logEntry.cta_url=payload.cta_url||null;}
      await request('/rest/v1/client_emails',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(logEntry)});
      if(type==='report'){await request('/rest/v1/clients?id=eq.'+encodeURIComponent(sendTarget.id),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({last_report_sent_at:sentAt})});var c=clients.find(function(item){return item.id===sendTarget.id;});if(c)c.last_report_sent_at=sentAt;renderClients();}
      sendDialog.close();
      if(dialogTarget&&dialogTarget.id===sendTarget.id)loadClientHistory(dialogTarget.id);
    }catch(error){
      message(sendMessage,error.message.indexOf('RESEND_API_KEY')>-1?'Email sending is not configured yet — set RESEND_API_KEY as an Edge Function secret in Supabase.':error.message);
    }finally{button.disabled=false;}
  }

  // ── Bulk tip send ───────────────────────────────────────────────
  function renderBulkList(){
    var activity=bulkActivityFilter.value;
    var candidates=clients.filter(function(c){return c.status==='active'&&c.marketing_consent&&!c.unsubscribed_at&&(!activity||c.activity===activity);});
    bulkList.innerHTML=candidates.length?candidates.map(function(c){return '<label class="bulk-client-row"><input type="checkbox" value="'+escapeHtml(c.id)+'" checked> '+escapeHtml(c.business_name)+' <span class="muted-note">'+escapeHtml(c.email)+(c.activity?' · '+escapeHtml(c.activity):'')+'</span></label>';}).join(''):'<p class="muted-note">No active, subscribed clients match this filter.</p>';
  }
  function openBulkDialog(){bulkForm.reset();refreshActivityFilterOptions();renderBulkList();message(bulkMessage,'');bulkDialog.showModal();}
  async function sendBulkTip(event){
    event.preventDefault();
    var data=new FormData(bulkForm),headline=String(data.get('headline')||'').trim(),body=String(data.get('body')||'').trim(),ctaLabel=String(data.get('cta_label')||'').trim()||undefined,ctaUrl=String(data.get('cta_url')||'').trim()||undefined;
    var checked=Array.from(bulkList.querySelectorAll('input[type="checkbox"]:checked')).map(function(i){return i.value;});
    if(!headline||!body){message(bulkMessage,'Headline and body are required.');return;}
    if(checked.length===0){message(bulkMessage,'Select at least one client.');return;}
    var button=bulkForm.querySelector('[data-bulk-send]');button.disabled=true;
    var okCount=0,failCount=0;
    for(var i=0;i<checked.length;i++){
      var client=clients.find(function(c){return c.id===checked[i];});if(!client)continue;
      message(bulkMessage,'Sending '+(i+1)+' / '+checked.length+'…');
      var payload={type:'tip',to:client.email,business_name:client.business_name,contact_name:client.contact_name,language:client.language||'fr',client_id:client.id,headline:headline,body:body,cta_label:ctaLabel,cta_url:ctaUrl,branding:brandingPayload()};
      if(appSettings&&appSettings.reply_to_email)payload.reply_to=appSettings.reply_to_email;
      try{
        await invokeFunction('send-client-report',payload);
        await request('/rest/v1/client_emails',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({client_id:client.id,type:'tip',subject:headline,headline:headline,body:body,cta_label:ctaLabel||null,cta_url:ctaUrl||null,sent_at:new Date().toISOString()})});
        okCount++;
      }catch(error){failCount++;}
    }
    message(bulkMessage,'Sent to '+okCount+' client'+(okCount===1?'':'s')+(failCount?', '+failCount+' failed':'')+'.');
    button.disabled=false;
    if(!failCount)setTimeout(function(){bulkDialog.close();},1200);
  }

  // ── Tabs ────────────────────────────────────────────────────
  function switchTab(name){if(!views[name])name='leads';tabs.forEach(function(tab){tab.classList.toggle('is-active',tab.dataset.tab===name);});Object.keys(views).forEach(function(key){views[key].hidden=key!==name;});var titles={clients:'Clients',settings:'Settings',leads:'Leads'};viewTitle.textContent=titles[name];document.title=titles[name]+' | SB Marketing Admin';document.querySelector('[data-export]').hidden=name!=='leads';if(name==='clients'&&clients.length===0)loadClients();if(name==='settings'&&!appSettings)loadSettings();}
  // Each section lives at its own hash slug (#leads, #clients, #settings)
  // so it's bookmarkable and supports browser back/forward.
  function applyHash(){switchTab((location.hash||'#leads').replace('#',''));}

  // ── Wiring ──────────────────────────────────────────────────
  populateCountrySelects();
  populateTrackedMetricsContainers();
  setTrackedMetricsChecked(addClientForm.querySelector('[data-tracked-metrics="add"]'),DEFAULT_TRACKED_METRICS);
  loginForm.addEventListener('submit',async function(event){event.preventDefault();var button=loginForm.querySelector('button'),data=new FormData(loginForm),email=String(data.get('email')).trim().toLowerCase();message(loginMessage,'');if(email!==config.adminEmail){message(loginMessage,'This account is not authorised.');return;}button.disabled=true;button.textContent='Signing in…';try{var response=await fetch(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({email:email,password:data.get('password')})}),session=await response.json();if(!response.ok)throw new Error(session.error_description||session.msg||'Unable to sign in');setSession(session);showDashboard(true);loadLeads();applyHash();}catch(error){message(loginMessage,error.message);}finally{button.disabled=false;button.textContent='Sign in';}});
  tbody.addEventListener('change',function(event){var select=event.target.closest('[data-lead-status]');if(select)updateStatus(select.dataset.leadStatus,select.value,select);});
  search.addEventListener('input',render);
  filter.addEventListener('change',render);
  document.querySelector('[data-refresh]').addEventListener('click',function(){loadLeads();if(!views.clients.hidden)loadClients();});
  document.querySelector('[data-export]').addEventListener('click',exportCsv);
  document.querySelector('[data-logout]').addEventListener('click',function(){setSession(null);leads=[];clients=[];showDashboard(false);loginForm.reset();});
  window.addEventListener('hashchange',applyHash);

  clientsBody.addEventListener('change',function(event){var select=event.target.closest('[data-client-status]');if(select)updateClientStatus(select.dataset.clientStatus,select.value,select);});
  clientsBody.addEventListener('click',function(event){
    var sendBtn=event.target.closest('[data-send-email]');if(sendBtn){openSendDialog(sendBtn.dataset.sendEmail);return;}
    var detailBtn=event.target.closest('[data-client-detail]');if(detailBtn)openClientDialog(detailBtn.dataset.clientDetail);
  });
  if(clientSearch)clientSearch.addEventListener('input',renderClients);
  if(clientDueFilter)clientDueFilter.addEventListener('change',renderClients);
  addClientToggle.addEventListener('click',function(){addClientForm.hidden=!addClientForm.hidden;message(addClientMessage,'');});
  addClientCancel.addEventListener('click',function(){addClientForm.hidden=true;addClientForm.reset();});
  addClientForm.addEventListener('submit',addClient);

  sendTypeSelect.addEventListener('change',function(){setSendType(sendTypeSelect.value);});
  sendForm.addEventListener('submit',sendEmail);
  sendCancel.addEventListener('click',function(){sendDialog.close();});
  sendPreviewBtn.addEventListener('click',previewSend);
  previewClose.addEventListener('click',function(){previewPane.hidden=true;});
  sendForm.querySelector('[data-add-custom-metric]').addEventListener('click',function(){addCustomMetricRow();});
  sendForm.querySelector('[data-custom-metrics-list]').addEventListener('click',function(event){var btn=event.target.closest('[data-remove-custom-metric]');if(btn)btn.closest('.custom-metric-row').remove();});

  clientEditForm.addEventListener('submit',saveClientEdits);
  clientDialogClose.addEventListener('click',function(){clientDialog.close();});
  clientDeleteBtn.addEventListener('click',deleteClient);
  clientDialogSendEmail.addEventListener('click',function(){if(!dialogTarget)return;var id=dialogTarget.id;clientDialog.close();openSendDialog(id);});

  settingsForm.addEventListener('submit',saveSettings);

  bulkToggle.addEventListener('click',openBulkDialog);
  bulkCancel.addEventListener('click',function(){bulkDialog.close();});
  bulkActivityFilter.addEventListener('change',renderBulkList);
  bulkForm.addEventListener('submit',sendBulkTip);

  if(!config){message(loginMessage,'Supabase configuration is missing.');return;}var session=getSession();if(session&&session.expires_at*1000>Date.now()){showDashboard(true);loadLeads();applyHash();}else if(session&&session.refresh_token){refreshSession(session.refresh_token).then(function(value){if(value){showDashboard(true);loadLeads();applyHash();}});}else showDashboard(false);
})();
