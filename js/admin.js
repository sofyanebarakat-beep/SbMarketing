(function(){
  'use strict';
  var config=window.SB_SUPABASE,sessionKey='sb_admin_session',leads=[],contacts=[],clients=[],appSettings=null;
  var loginView=document.querySelector('[data-login-view]'),dashboard=document.querySelector('[data-dashboard]'),loginForm=document.querySelector('[data-login-form]'),loginMessage=document.querySelector('[data-login-message]'),dashboardMessage=document.querySelector('[data-dashboard-message]'),tbody=document.querySelector('[data-leads-body]'),empty=document.querySelector('[data-empty]'),search=document.querySelector('[data-search]'),filter=document.querySelector('[data-status-filter]');
  var viewTitle=document.querySelector('[data-view-title]'),tabs=document.querySelectorAll('[data-tab]'),views={leads:document.querySelector('[data-view="leads"]'),contacts:document.querySelector('[data-view="contacts"]'),clients:document.querySelector('[data-view="clients"]'),settings:document.querySelector('[data-view="settings"]')};
  var clientsBody=document.querySelector('[data-clients-body]'),clientsEmpty=document.querySelector('[data-clients-empty]'),clientsMessage=document.querySelector('[data-clients-message]'),clientSearch=document.querySelector('[data-client-search]'),clientDueFilter=document.querySelector('[data-client-due-filter]');
  var addClientToggle=document.querySelector('[data-add-client-toggle]'),addClientForm=document.querySelector('[data-add-client-form]'),addClientCancel=document.querySelector('[data-add-client-cancel]'),addClientMessage=document.querySelector('[data-add-client-message]');
  var sendDialog=document.querySelector('[data-send-dialog]'),sendForm=document.querySelector('[data-send-form]'),sendClientLabel=document.querySelector('[data-send-client]'),sendMessage=document.querySelector('[data-send-message]'),sendCancel=document.querySelector('[data-send-cancel]'),sendTypeSelect=document.querySelector('[data-send-type]'),sendPreviewBtn=document.querySelector('[data-send-preview]'),previewPane=document.querySelector('[data-preview-pane]'),previewFrame=document.querySelector('[data-preview-frame]'),previewClose=document.querySelector('[data-preview-close]');
  var clientDialog=document.querySelector('[data-client-dialog]'),clientDialogName=document.querySelector('[data-client-dialog-name]'),clientDialogStatus=document.querySelector('[data-client-dialog-status]'),clientDialogClose=document.querySelector('[data-client-dialog-close]'),clientEditForm=document.querySelector('[data-client-edit-form]'),clientEditMessage=document.querySelector('[data-client-edit-message]'),clientDeleteBtn=document.querySelector('[data-client-delete]'),clientDialogSendEmail=document.querySelector('[data-client-send-email]'),clientWhatsappLink=document.querySelector('[data-client-whatsapp]'),clientUnsubscribedNote=document.querySelector('[data-client-unsubscribed]');
  var clientHistoryList=document.querySelector('[data-client-history-list]'),clientHistoryMessage=document.querySelector('[data-client-history-message]'),clientHistoryEmpty=document.querySelector('[data-client-history-empty]');
  var settingsForm=document.querySelector('[data-settings-form]'),settingsMessage=document.querySelector('[data-settings-message]');
  var bulkToggle=document.querySelector('[data-bulk-tip-toggle]'),bulkDialog=document.querySelector('[data-bulk-dialog]'),bulkForm=document.querySelector('[data-bulk-form]'),bulkList=document.querySelector('[data-bulk-client-list]'),bulkActivityFilter=document.querySelector('[data-bulk-activity-filter]'),bulkMessage=document.querySelector('[data-bulk-message]'),bulkCancel=document.querySelector('[data-bulk-cancel]');
  var templateSelect=document.querySelector('[data-template-select]'),templateSaveBtn=document.querySelector('[data-template-save]');
  var previewMobileToggle=document.querySelector('[data-preview-mobile-toggle]');
  var assetPicker=document.querySelector('[data-asset-picker]'),assetPickerGrid=document.querySelector('[data-asset-picker-grid]'),assetPickerMessage=document.querySelector('[data-asset-picker-message]'),assetUploadInput=document.querySelector('[data-asset-upload-input]');
  var sendTarget=null,lastMonthMetrics=null,dialogTarget=null,templates=[],templatesLoaded=false,assetLibrary=null,assetPickerTarget=null;
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
  // Columns added by the latest supabase/clients_schema.sql (phone,
  // whatsapp_number, rendered_html…) may not exist yet on a database that
  // hasn't been migrated — PostgREST then rejects the whole request with a
  // "column ... does not exist" error. Rather than let that break saving
  // everything else, retry once without the newer fields.
  async function patchWithColumnFallback(path,payload,dropKeys){
    try{await request(path,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});return payload;}
    catch(error){
      if(!/column/i.test(error.message))throw error;
      var fallback=Object.assign({},payload);dropKeys.forEach(function(k){delete fallback[k];});
      await request(path,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(fallback)});
      return fallback;
    }
  }
  async function postWithColumnFallback(path,payload,dropKeys){
    try{await request(path,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});return payload;}
    catch(error){
      if(!/column/i.test(error.message))throw error;
      var fallback=Object.assign({},payload);dropKeys.forEach(function(k){delete fallback[k];});
      await request(path,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(fallback)});
      return fallback;
    }
  }
  async function saveSettings(event){event.preventDefault();var button=settingsForm.querySelector('button[type="submit"]'),data=new FormData(settingsForm),payload={};['company_name','logo_url','logo_part1','logo_part2','footer_tagline_fr','footer_tagline_en','website_url','reply_to_email','instagram_url','facebook_url','phone','whatsapp_number'].forEach(function(key){payload[key]=String(data.get(key)||'').trim()||null;});button.disabled=true;message(settingsMessage,'Saving…');try{var saved=await patchWithColumnFallback('/rest/v1/app_settings?id=eq.default',payload,['phone','whatsapp_number']);appSettings=Object.assign({},appSettings,saved);message(settingsMessage,saved===payload?'Saved.':'Saved (phone/WhatsApp need the latest database update first — run supabase/clients_schema.sql).');}catch(error){message(settingsMessage,error.message);}finally{button.disabled=false;}}
  function brandingPayload(){if(!appSettings)return undefined;return{companyName:appSettings.company_name||undefined,logoUrl:appSettings.logo_url||undefined,logoPart1:appSettings.logo_part1||undefined,logoPart2:appSettings.logo_part2||undefined,footerTaglineFr:appSettings.footer_tagline_fr||undefined,footerTaglineEn:appSettings.footer_tagline_en||undefined,websiteUrl:appSettings.website_url||undefined,instagramUrl:appSettings.instagram_url||undefined,facebookUrl:appSettings.facebook_url||undefined,phone:appSettings.phone||undefined,whatsappNumber:appSettings.whatsapp_number||undefined};}

  // ── Image library (Storage-backed "email-assets" bucket) ───────
  // Public bucket so the images are reachable from the sent emails; only
  // the admin's session can upload/list (RLS in clients_schema.sql).
  function storagePublicUrl(path){return config.url+'/storage/v1/object/public/email-assets/'+path;}
  async function uploadAsset(file){
    var session=getSession(),safeName=Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
    var response=await fetch(config.url+'/storage/v1/object/email-assets/'+encodeURIComponent(safeName),{
      method:'POST',
      headers:{apikey:config.key,Authorization:'Bearer '+(session?session.access_token:config.key),'Content-Type':file.type||'application/octet-stream'},
      body:file
    });
    if(!response.ok){var details=await response.json().catch(function(){return{};});throw new Error(details.message||'Upload failed');}
    return{path:safeName,url:storagePublicUrl(safeName)};
  }
  async function listAssets(){
    var session=getSession();
    var response=await fetch(config.url+'/storage/v1/object/list/email-assets',{
      method:'POST',
      headers:{apikey:config.key,Authorization:'Bearer '+(session?session.access_token:config.key),'Content-Type':'application/json'},
      body:JSON.stringify({limit:60,sortBy:{column:'created_at',order:'desc'}})
    });
    if(!response.ok)return [];
    var items=await response.json().catch(function(){return [];});
    return(items||[]).filter(function(i){return i.name&&i.id;}).map(function(i){return{path:i.name,url:storagePublicUrl(i.name)};});
  }
  function renderAssetGrid(){
    assetPickerGrid.innerHTML=(assetLibrary&&assetLibrary.length)
      ?assetLibrary.map(function(a){return '<button type="button" class="asset-thumb" data-asset-pick="'+escapeHtml(a.url)+'"><img src="'+escapeHtml(a.url)+'" alt="" loading="lazy"></button>';}).join('')
      :'<p class="muted-note">No uploads yet — add one above.</p>';
  }
  async function openAssetPicker(form,targetName){
    assetPickerTarget={form:form,name:targetName};
    message(assetPickerMessage,'');
    assetPicker.showModal();
    if(!assetLibrary){
      assetPickerGrid.innerHTML='<p class="muted-note">Loading…</p>';
      assetLibrary=await listAssets().catch(function(){return [];});
    }
    renderAssetGrid();
  }

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

  // ── "Recommend us on WhatsApp" banner ─────────────────────────
  // Ready-made messages the client can forward to someone with a business.
  // The edge function appends the offer line and the tagged contact-page
  // link itself. Message choice, best first: the client's own result this
  // month (reports), then one aimed at businesses like theirs (from
  // clients.activity), then general ones.
  var SHARE_MESSAGES={
    fr:{
      result:"Salut ! Je travaille avec SB Marketing et ce mois-ci j'ai eu {r} 📈 Si tu veux les mêmes résultats pour ton entreprise, ils proposent un audit gratuit 👇",
      general:[
        "Salut ! Je travaille avec SB Marketing pour la communication de mon entreprise et les résultats sont vraiment au rendez-vous. Ils offrent un audit gratuit de tes réseaux sociaux et de ton site, je te le conseille !",
        "J'ai pensé à toi ! SB Marketing gère ma pub en ligne et ça marche vraiment. Ils font un audit gratuit, ça ne coûte rien de regarder 👇",
        "Depuis que je travaille avec SB Marketing, j'ai plus d'appels de clients chaque mois. Si tu veux la même chose pour ton entreprise, leur audit est gratuit 👇",
        "Tu cherches plus de clients en ce moment ? Moi j'ai trouvé la bonne agence : SB Marketing. Audit gratuit ici 👇",
        "Hello ! L'agence SB Marketing à Nice s'occupe de mes réseaux sociaux et de ma visibilité sur Google, je recommande vivement. Leur audit est gratuit 👇",
        "Bonjour, je vous recommande SB Marketing, notre agence de marketing digital à Nice. Ils proposent un audit gratuit et sans engagement de votre présence en ligne."
      ],
      cats:{
        food:["Salut ! Toi qui as un commerce de bouche, je te conseille SB Marketing : grâce à eux, plus de clients me trouvent sur Google et Instagram et passent en boutique. Leur audit est gratuit 👇","Tu as un resto ou une boutique ? SB Marketing m'aide à être mieux trouvé sur Google et Instagram. Je te conseille leur audit gratuit !"],
        beauty:["Coucou ! Pour ton salon, je te recommande SB Marketing : ils gèrent mon Instagram et ma fiche Google, et mon agenda se remplit beaucoup mieux. Audit gratuit ici 👇","Hello ! Si tu veux plus de rendez-vous dans ton salon, regarde SB Marketing, ils font des merveilles pour le mien. Leur audit est offert 👇"],
        health:["Bonjour, je vous recommande SB Marketing pour la visibilité de votre cabinet : plus de patients nous trouvent sur Google depuis qu'ils s'en occupent. Leur audit est gratuit 👇"],
        realestate:["Salut ! Pour ton agence, je te recommande SB Marketing : ils gèrent notre visibilité en ligne et on reçoit plus de demandes de vendeurs et d'acheteurs. Audit gratuit 👇"],
        trades:["Salut ! Toi qui es artisan, je te conseille SB Marketing : depuis qu'ils s'occupent de ma fiche Google et de mon site, j'ai plus de demandes de devis. Leur audit est gratuit 👇","Hello ! Si tu veux plus de chantiers, regarde SB Marketing, ils m'apportent des demandes de devis chaque mois. Audit gratuit et sans engagement 👇"],
        retail:["Coucou ! Pour ta boutique, je te recommande SB Marketing : ils boostent ma visibilité sur Instagram et Google et j'ai plus de passage. Leur audit est gratuit 👇"]
      }
    },
    en:{
      result:"Hi! I work with SB Marketing and this month I got {r} 📈 If you want the same results for your business, they offer a free audit 👇",
      general:[
        "Hi! I work with SB Marketing for my business's marketing and the results have been great. They offer a free audit of your social media and website, I really recommend them!",
        "Hey! Looking for more customers? SB Marketing in Nice handles my social media and Google visibility, highly recommended. Their audit is free 👇",
        "Hello, I'd like to recommend SB Marketing, the agency running our digital marketing. Professional and responsive, and they offer a free audit to see what could be improved for you."
      ],
      cats:{
        food:["Hi! Since you run a food business, I recommend SB Marketing: thanks to them more customers find me on Google and Instagram and come into the shop. Their audit is free 👇"],
        beauty:["Hey! For your salon, I recommend SB Marketing: they run my Instagram and Google profile and my bookings have really picked up. Free audit here 👇"],
        health:["Hello, I recommend SB Marketing for your practice's visibility: more patients find us on Google since they took over. Their audit is free 👇"],
        realestate:["Hi! For your agency, I recommend SB Marketing: they handle our online visibility and we get more seller and buyer enquiries. Free audit 👇"],
        trades:["Hi! As a tradesperson, you should check out SB Marketing: since they took over my Google profile and website, I get more quote requests. Free audit 👇"],
        retail:["Hey! For your shop, I recommend SB Marketing: they boost my visibility on Instagram and Google and I get more foot traffic. Their audit is free 👇"]
      }
    }
  };
  // How each metric reads in "this month I got …". Metrics that aren't
  // something to boast about (ad spend, posts, rating, position) are left out.
  var SHARE_RESULT_PHRASES={
    website_visits:{fr:'+{p} % de visites sur mon site',en:'{p}% more website visits'},
    google_impressions:{fr:'+{p} % de vues sur Google',en:'{p}% more views on Google'},
    google_clicks:{fr:'+{p} % de clics depuis Google',en:'{p}% more clicks from Google'},
    gbp_views:{fr:'+{p} % de vues sur ma fiche Google',en:'{p}% more views on my Google profile'},
    gbp_calls:{fr:'+{p} % d’appels depuis Google',en:'{p}% more calls from Google'},
    gbp_direction_requests:{fr:'+{p} % de demandes d’itinéraire vers chez moi',en:'{p}% more direction requests'},
    gbp_review_count:{fr:'+{p} % d’avis Google',en:'{p}% more Google reviews'},
    social_followers:{fr:'+{p} % d’abonnés',en:'{p}% more followers'},
    social_engagement:{fr:'+{p} % d’engagement sur mes réseaux',en:'{p}% more engagement on social media'},
    ads_impressions:{fr:'+{p} % de vues sur mes pubs',en:'{p}% more views on my ads'},
    ads_clicks:{fr:'+{p} % de clics sur mes pubs',en:'{p}% more clicks on my ads'},
    ads_conversions:{fr:'+{p} % de conversions grâce aux pubs',en:'{p}% more conversions from ads'},
    new_leads:{fr:'+{p} % de nouveaux prospects',en:'{p}% more new leads'},
    revenue:{fr:'+{p} % de chiffre d’affaires',en:'{p}% more revenue'}
  };
  var SHARE_CATEGORIES=[
    ['food',/bouch|butch|boulang|baker|patiss|pâtiss|resto|restaurant|traiteur|cater|caf[eé]|[eé]pic|grocer|food|pizz|snack|fromag|primeur/],
    ['beauty',/coiff|hair|barb|beaut|esth[eé]t|salon|spa\b|ongl|nail|make ?up|maquill|institut/],
    ['health',/m[eé]dec|dent|kin[eé]|ost[eé]o|clini|sant[eé]|health|pharm|psy|doctor|cabinet/],
    ['realestate',/immo|real estate/],
    ['trades',/artisan|plomb|plumb|[eé]lectric|btp|r[eé]nov|clim|chauff|menuis|ma[cç]on|construct|peint|paint|trade/],
    ['retail',/boutique|magasin|shop|retail|store|commerce|v[eê]tement|fleur|florist/]
  ];
  var SHARE_STORAGE_KEY='sb_share_banner';
  function readShareStore(){try{return JSON.parse(localStorage.getItem(SHARE_STORAGE_KEY))||{};}catch(error){return{};}}
  function writeShareStore(patch){try{localStorage.setItem(SHARE_STORAGE_KEY,JSON.stringify(Object.assign(readShareStore(),patch)));}catch(error){}}
  function shareCategory(activity){var text=String(activity||'').toLowerCase();for(var i=0;i<SHARE_CATEGORIES.length;i++){if(SHARE_CATEGORIES[i][1].test(text))return SHARE_CATEGORIES[i][0];}return null;}
  function parseMetricNumber(value){if(!value)return null;var n=parseFloat(String(value).replace(/[^\d.,-]/g,'').replace(',','.'));return isFinite(n)?n:null;}
  // Compares what's typed in the report form with last month's numbers,
  // the same way the email's trend badges do.
  function reportGrowth(){
    var growth={up:0,down:0,best:null};
    if(!sendTarget||sendTypeSelect.value!=='report'||!lastMonthMetrics)return growth;
    sendForm.querySelectorAll('[data-metric-field]').forEach(function(input){
      var key=input.dataset.metricField,meta=METRIC_BY_KEY[key],cur=parseMetricNumber(input.value),prev=parseMetricNumber(lastMonthMetrics[key]);
      if(!meta||cur===null||prev===null||prev===0)return;
      var pct=(cur-prev)/Math.abs(prev)*100;if(Math.abs(pct)<1)return;
      var improved=meta.lowerIsBetter?pct<0:pct>0;
      if(key==='ads_spend')return;
      if(improved)growth.up++;else growth.down++;
      if(improved&&SHARE_RESULT_PHRASES[key]&&(!growth.best||pct>growth.best.pct))growth.best={key:key,pct:pct};
    });
    return growth;
  }
  function shareSuggestions(lang,activity,growth){
    var set=SHARE_MESSAGES[lang==='en'?'en':'fr'],list=[];
    if(growth&&growth.best)list.push(set.result.replace('{r}',SHARE_RESULT_PHRASES[growth.best.key][lang==='en'?'en':'fr'].replace('{p}',String(Math.round(growth.best.pct)))));
    var cat=shareCategory(activity);if(cat)list=list.concat(set.cats[cat]);
    return list.concat(set.general);
  }
  // A block's context: the language and activity it writes for, and
  // whether it's the single-send dialog (where report results apply).
  function shareContext(block){return{lang:block.dataset.lang||'fr',activity:block.dataset.activity||'',single:block.dataset.single==='1'};}
  function shareGrowth(block){var ctx=shareContext(block);return ctx.single?reportGrowth():null;}
  function shareIncluded(block,growth){
    var mode=block.querySelector('[data-share-mode]').value;
    if(mode==='off')return false;if(mode==='always')return true;
    return !growth||growth.up+growth.down===0||growth.up>growth.down;
  }
  function refreshShare(block){
    var ctx=shareContext(block),growth=shareGrowth(block),list=shareSuggestions(ctx.lang,ctx.activity,growth),textarea=block.querySelector('[data-share-message]'),status=block.querySelector('[data-share-status]'),mode=block.querySelector('[data-share-mode]').value;
    if(block.dataset.edited!=='1')textarea.value=list[Number(block.dataset.idx||0)%list.length];
    block.querySelector('[data-share-fields]').hidden=mode==='off';
    var included=shareIncluded(block,growth),isReport=ctx.single&&sendTypeSelect.value==='report';
    status.className='share-banner__status '+(included?'is-on':'is-off');
    if(mode==='off')status.textContent='Not included in this email.';
    else if(mode==='always')status.textContent='✅ Included in this email.';
    else if(!isReport)status.textContent='✅ Included'+(ctx.single?' in this email.':' in every email.');
    else if(!growth.up&&!growth.down)status.textContent='✅ Included (nothing to compare with last month yet).';
    else if(included)status.textContent='✅ Included: '+growth.up+' metric'+(growth.up>1?'s':'')+' up this month'+(growth.best?' — the message quotes the best one.':'.');
    else status.textContent='⏸ Hidden this month: results are down ('+growth.down+' down, '+growth.up+' up). Choose “Always” to include it anyway.';
  }
  function initShareBlock(block,lang,activity){
    var stored=readShareStore();
    block.dataset.lang=lang==='en'?'en':'fr';block.dataset.activity=activity||'';block.dataset.idx='0';block.dataset.edited='0';
    block.querySelector('[data-share-mode]').value=stored.mode||'auto';
    block.querySelector('[data-share-offer]').value=stored.offer||'';
    block.querySelector('[data-share-reward]').value=stored.reward||'';
    refreshShare(block);
  }
  function wireShareBlock(block){
    var textarea=block.querySelector('[data-share-message]');
    block.querySelector('[data-share-mode]').addEventListener('change',function(event){writeShareStore({mode:event.target.value});refreshShare(block);});
    block.querySelector('[data-share-offer]').addEventListener('change',function(event){writeShareStore({offer:event.target.value.trim()});});
    block.querySelector('[data-share-reward]').addEventListener('change',function(event){writeShareStore({reward:event.target.value.trim()});});
    textarea.addEventListener('input',function(){block.dataset.edited='1';});
    block.querySelector('[data-share-suggest]').addEventListener('click',function(){block.dataset.edited='0';block.dataset.idx=String(Number(block.dataset.idx||0)+1);refreshShare(block);});
  }
  // Single send: whatever is in the box. Bulk: the box is used as-is only
  // if it was edited or picked; otherwise each client gets the best message
  // for their own language and business type.
  function readShare(block,lang,activity,businessName){
    var ctx=shareContext(block),growth=shareGrowth(block);
    if(!shareIncluded(block,growth))return undefined;
    lang=lang==='en'?'en':'fr';
    var custom=block.dataset.edited==='1'||block.dataset.idx!=='0',message;
    if(ctx.single||(custom&&lang===ctx.lang))message=block.querySelector('[data-share-message]').value.trim();
    else message=shareSuggestions(lang,activity,null)[0];
    if(!message)return undefined;
    return{message:message,ref:businessName,offer:block.querySelector('[data-share-offer]').value.trim()||undefined,reward:block.querySelector('[data-share-reward]').value.trim()||undefined};
  }

  // ── Send dialog (report / tip / custom) ────────────────────────
  function setSendType(type){
    sendForm.querySelectorAll('[data-send-group]').forEach(function(group){group.hidden=group.dataset.sendGroup!==type;});
    var shareBlock=sendForm.querySelector('[data-share-banner]');if(shareBlock.dataset.lang)refreshShare(shareBlock);
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

  // ── Rich content extras (banner, image, video, before/after, testimonial, links, PDF) ──
  function addExtraLinkRow(label,url){
    var list=sendForm.querySelector('[data-extra-links-list]'),row=document.createElement('div');
    row.className='custom-metric-row';
    row.innerHTML='<input type="text" class="extra-link-label" placeholder="Button label (e.g. Book a call)" value="'+escapeHtml(label||'')+'"><input type="url" class="extra-link-url" placeholder="https://..." value="'+escapeHtml(url||'')+'"><button type="button" class="icon-button" data-remove-extra-link aria-label="Remove">✕</button>';
    list.appendChild(row);
  }
  function readExtraLinks(){return Array.from(sendForm.querySelectorAll('[data-extra-links-list] .custom-metric-row')).map(function(row){return{label:row.querySelector('.extra-link-label').value.trim(),url:row.querySelector('.extra-link-url').value.trim()};}).filter(function(l){return l.label&&l.url;});}
  function readExtras(){
    var data=new FormData(sendForm),extras={};
    var bannerUrl=String(data.get('extra_banner_url')||'').trim();
    if(bannerUrl)extras.bannerUrl=bannerUrl,extras.bannerAlt=String(data.get('extra_banner_alt')||'').trim()||undefined;
    var imageUrl=String(data.get('extra_image_url')||'').trim();
    if(imageUrl)extras.image={url:imageUrl,caption:String(data.get('extra_image_caption')||'').trim()||undefined};
    var videoUrl=String(data.get('extra_video_url')||'').trim(),videoThumb=String(data.get('extra_video_thumb')||'').trim();
    if(videoUrl&&videoThumb)extras.video={url:videoUrl,thumbnailUrl:videoThumb,caption:String(data.get('extra_video_caption')||'').trim()||undefined};
    var beforeUrl=String(data.get('extra_before_url')||'').trim(),afterUrl=String(data.get('extra_after_url')||'').trim();
    if(beforeUrl&&afterUrl)extras.beforeAfter={beforeUrl:beforeUrl,afterUrl:afterUrl,beforeLabel:String(data.get('extra_before_label')||'').trim()||undefined,afterLabel:String(data.get('extra_after_label')||'').trim()||undefined};
    var quote=String(data.get('extra_testimonial_quote')||'').trim();
    if(quote)extras.testimonial={quote:quote,author:String(data.get('extra_testimonial_author')||'').trim()||undefined,rating:Number(data.get('extra_testimonial_rating'))||undefined};
    var links=readExtraLinks();if(links.length)extras.links=links;
    return Object.keys(extras).length?extras:undefined;
  }
  function readAttachment(){
    var data=new FormData(sendForm),url=String(data.get('attachment_url')||'').trim(),filename=String(data.get('attachment_filename')||'').trim();
    return(url&&filename)?{url:url,filename:filename}:undefined;
  }

  // ── Saved email templates ───────────────────────────────────────
  var TEMPLATE_FIELD_NAMES=['month_label','summary','report_url','headline','tip_body','tip_cta_label','tip_cta_url','subject','custom_body','custom_cta_label','custom_cta_url','extra_banner_url','extra_banner_alt','extra_image_url','extra_image_caption','extra_video_url','extra_video_thumb','extra_video_caption','extra_before_url','extra_after_url','extra_before_label','extra_after_label','extra_testimonial_quote','extra_testimonial_author','extra_testimonial_rating','attachment_url','attachment_filename'];
  async function loadTemplates(){try{templates=await request('/rest/v1/email_templates?select=*&order=created_at.desc');}catch(error){templates=[];}templatesLoaded=true;templateSelect.innerHTML='<option value="">Start from a template…</option>'+templates.map(function(tpl){return '<option value="'+escapeHtml(tpl.id)+'">'+escapeHtml(tpl.name)+'</option>';}).join('');}
  function captureTemplatePayload(){
    var data=new FormData(sendForm),payload={type:sendTypeSelect.value};
    TEMPLATE_FIELD_NAMES.forEach(function(key){var v=data.get(key);if(v)payload[key]=String(v);});
    var customMetrics=readCustomMetricRows();if(customMetrics.length)payload.custom_metrics=customMetrics;
    var links=readExtraLinks();if(links.length)payload.extra_links=links;
    return payload;
  }
  function applyTemplatePayload(payload){
    sendTypeSelect.value=payload.type||'report';setSendType(sendTypeSelect.value);
    TEMPLATE_FIELD_NAMES.forEach(function(key){var field=sendForm.elements[key];if(field)field.value=payload[key]||'';});
    sendForm.querySelector('[data-custom-metrics-list]').innerHTML='';
    (payload.custom_metrics||[]).forEach(function(m){addCustomMetricRow(m.label,m.value);});
    sendForm.querySelector('[data-extra-links-list]').innerHTML='';
    (payload.extra_links||[]).forEach(function(l){addExtraLinkRow(l.label,l.url);});
  }
  async function openSendDialog(clientId){
    var client=clients.find(function(c){return c.id===clientId;});if(!client)return;
    sendTarget=client;lastMonthMetrics=null;
    sendClientLabel.textContent=client.business_name+' · '+client.email;
    sendForm.reset();
    sendTypeSelect.value='report';
    renderReportMetricsFields(client);
    sendForm.querySelector('[data-custom-metrics-list]').innerHTML='';
    sendForm.querySelector('[data-extra-links-list]').innerHTML='';
    sendForm.querySelector('.extras-details').open=false;
    previewPane.classList.remove('is-mobile');
    templateSelect.value='';
    if(!templatesLoaded)loadTemplates();
    setSendType('report');
    initShareBlock(sendForm.querySelector('[data-share-banner]'),client.language,client.activity);
    var now=new Date(),defaultMonth=new Intl.DateTimeFormat(client.language==='en'?'en-GB':'fr-FR',{month:'long',year:'numeric'}).format(now);
    sendForm.elements.month_label.value=defaultMonth.charAt(0).toUpperCase()+defaultMonth.slice(1);
    message(sendMessage,'');
    sendDialog.showModal();
    try{
      var history=await request('/rest/v1/client_emails?client_id=eq.'+encodeURIComponent(clientId)+'&type=eq.report&select=highlights&order=sent_at.desc&limit=1');
      if(history&&history.length&&history[0].highlights){
        lastMonthMetrics=history[0].highlights;
        Object.keys(lastMonthMetrics).forEach(function(key){var value=lastMonthMetrics[key];if(!value)return;var span=sendForm.querySelector('[data-previous="'+key+'"]');if(span)span.textContent='Last month: '+value;});
        refreshShare(sendForm.querySelector('[data-share-banner]'));
      }
    }catch(error){/* non-fatal: last-month context is a convenience, not required to send */}
  }
  function buildSendPayload(){
    var data=new FormData(sendForm),type=sendTypeSelect.value;
    var payload={type:type,to:sendTarget.email,business_name:sendTarget.business_name,contact_name:sendTarget.contact_name,language:sendTarget.language||'fr',client_id:sendTarget.id,branding:brandingPayload()};
    if(appSettings&&appSettings.reply_to_email)payload.reply_to=appSettings.reply_to_email;
    payload.referral=readShare(sendForm.querySelector('[data-share-banner]'),payload.language,sendTarget.activity,sendTarget.business_name);
    payload.extras=readExtras();
    payload.attachment=readAttachment();
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
    var emailId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():null;
    if(emailId)payload.extras=Object.assign({},payload.extras,{viewOnlineUrl:'https://www.sbmarketing.fr/view-email/?id='+emailId});
    var type=payload.type,historyPayload=payload._historyPayload;delete payload._hasAny;delete payload._historyPayload;
    var button=sendForm.querySelector('[data-send-submit]');button.disabled=true;message(sendMessage,'Sending…');
    try{
      var result=await invokeFunction('send-client-report',payload);
      var sentAt=new Date().toISOString();
      var logEntry={client_id:sendTarget.id,type:type,sent_at:sentAt,rendered_html:result.html||null};
      if(emailId)logEntry.id=emailId;
      if(type==='report'){logEntry.subject=(sendTarget.language==='en'?sendTarget.business_name+' — '+payload.month_label+' report':sendTarget.business_name+' — Rapport '+payload.month_label);logEntry.month_label=payload.month_label;logEntry.highlights=historyPayload;logEntry.custom_metrics=(payload.custom_metrics&&payload.custom_metrics.length)?payload.custom_metrics:null;}
      else if(type==='tip'){logEntry.subject=payload.headline;logEntry.headline=payload.headline;logEntry.body=payload.body;logEntry.cta_label=payload.cta_label||null;logEntry.cta_url=payload.cta_url||null;}
      else{logEntry.subject=payload.subject;logEntry.body=payload.body;logEntry.cta_label=payload.cta_label||null;logEntry.cta_url=payload.cta_url||null;}
      await postWithColumnFallback('/rest/v1/client_emails',logEntry,['rendered_html','id']);
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
  function openBulkDialog(){bulkForm.reset();refreshActivityFilterOptions();initShareBlock(bulkForm.querySelector('[data-share-banner]'),'fr','');renderBulkList();message(bulkMessage,'');bulkDialog.showModal();}
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
      var payload={type:'tip',to:client.email,business_name:client.business_name,contact_name:client.contact_name,language:client.language||'fr',client_id:client.id,headline:headline,body:body,cta_label:ctaLabel,cta_url:ctaUrl,branding:brandingPayload(),referral:readShare(bulkForm.querySelector('[data-share-banner]'),client.language,client.activity,client.business_name)};
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

  // ── Contact requests (native form on /contact/ and /en/contact/) ──
  var contactsBody=document.querySelector('[data-contacts-body]'),contactsEmpty=document.querySelector('[data-contacts-empty]'),contactSearch=document.querySelector('[data-contact-search]'),contactFilter=document.querySelector('[data-contact-status-filter]'),contactMessage=document.querySelector('[data-contact-message]'),contactsLoaded=false;
  async function loadContacts(){message(contactMessage,'Loading contact requests…');try{contacts=await request('/rest/v1/contact_submissions?select=*&order=created_at.desc');contactsLoaded=true;renderContacts();message(contactMessage,'');}catch(error){message(contactMessage,error.message.indexOf('contact_submissions')>-1?'Database setup required. Run supabase/contact_schema.sql in the Supabase SQL Editor.':error.message);}}
  function renderContacts(){var term=contactSearch.value.trim().toLowerCase(),status=contactFilter.value,filtered=contacts.filter(function(item){var searchable=[item.full_name,item.company,item.email,item.phone,item.service,item.message,item.country].join(' ').toLowerCase();return(!term||searchable.indexOf(term)>-1)&&(!status||item.status===status);});contactsBody.innerHTML=filtered.map(function(item){var text=item.message||'',preview=text.length>90?text.slice(0,90)+'…':text;return'<tr><td>'+escapeHtml(new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.created_at)))+'</td><td class="contact"><strong>'+escapeHtml(item.full_name)+'</strong><a href="mailto:'+escapeHtml(item.email)+'">'+escapeHtml(item.email)+'</a>'+(item.phone?'<a href="tel:'+escapeHtml(item.phone.replace(/[^+\d]/g,''))+'">'+escapeHtml(item.phone)+'</a>':'')+'</td><td class="shop"><strong>'+escapeHtml(item.company||'—')+'</strong><span>'+escapeHtml(item.country||'')+'</span>'+(referredBy(item.source_page)?'<span class="referral-tag">🤝 Referred by '+escapeHtml(referredBy(item.source_page))+'</span>':'')+'</td><td>'+escapeHtml(item.service)+'</td><td class="message-cell">'+(text.length>90?'<details><summary>'+escapeHtml(preview)+'</summary><p>'+escapeHtml(text)+'</p></details>':escapeHtml(text))+'</td><td><span class="lang">'+escapeHtml(item.language)+'</span></td><td><select class="status-select" data-contact-status="'+escapeHtml(item.id)+'"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="customer">Customer</option><option value="closed">Closed</option></select></td></tr>';}).join('');filtered.forEach(function(item,index){contactsBody.querySelectorAll('[data-contact-status]')[index].value=item.status||'new';});contactsEmpty.hidden=filtered.length!==0;document.querySelector('[data-contact-stat-total]').textContent=contacts.length;['new','contacted','customer'].forEach(function(key){document.querySelector('[data-contact-stat-'+key+']').textContent=contacts.filter(function(x){return x.status===key;}).length;});}
  // ref=<client-slug> comes from the WhatsApp share banner in client emails.
  function referredBy(sourcePage){try{return new URL(sourcePage||'','https://www.sbmarketing.fr').searchParams.get('ref');}catch(error){return null;}}
  async function updateContactStatus(id,status,select){select.disabled=true;try{await request('/rest/v1/contact_submissions?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({status:status})});var item=contacts.find(function(x){return x.id===id;});if(item)item.status=status;renderContacts();}catch(error){message(contactMessage,error.message);}finally{select.disabled=false;}}
  function exportContactsCsv(){var fields=['created_at','full_name','company','email','phone','country','service','message','language','status','source_page'],rows=[fields].concat(contacts.map(function(item){return fields.map(function(field){return item[field]||'';});})),csv=rows.map(function(row){return row.map(function(value){return '"'+String(value).replace(/"/g,'""')+'"';}).join(',');}).join('\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='sb-marketing-contact-requests-'+new Date().toISOString().slice(0,10)+'.csv';link.click();URL.revokeObjectURL(link.href);}

  // ── Tabs ────────────────────────────────────────────────────
  function switchTab(name){if(!views[name])name='leads';tabs.forEach(function(tab){tab.classList.toggle('is-active',tab.dataset.tab===name);});Object.keys(views).forEach(function(key){views[key].hidden=key!==name;});var titles={clients:'Clients',settings:'Settings',leads:'Leads',contacts:'Contact requests'};viewTitle.textContent=titles[name];document.title=titles[name]+' | SB Marketing Admin';document.querySelector('[data-export]').hidden=name!=='leads'&&name!=='contacts';if(name==='contacts'&&!contactsLoaded)loadContacts();if(name==='clients'&&clients.length===0)loadClients();if(name==='settings'&&!appSettings)loadSettings();}
  // Each section lives at its own hash slug (#leads, #contacts, #clients, #settings)
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
  document.querySelector('[data-refresh]').addEventListener('click',function(){loadLeads();if(!views.contacts.hidden)loadContacts();if(!views.clients.hidden)loadClients();});
  document.querySelector('[data-export]').addEventListener('click',function(){if(!views.contacts.hidden)exportContactsCsv();else exportCsv();});
  contactsBody.addEventListener('change',function(event){var select=event.target.closest('[data-contact-status]');if(select)updateContactStatus(select.dataset.contactStatus,select.value,select);});
  contactSearch.addEventListener('input',renderContacts);
  contactFilter.addEventListener('change',renderContacts);
  document.querySelector('[data-logout]').addEventListener('click',function(){setSession(null);leads=[];contacts=[];contactsLoaded=false;clients=[];showDashboard(false);loginForm.reset();});
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

  wireShareBlock(sendForm.querySelector('[data-share-banner]'));
  wireShareBlock(bulkForm.querySelector('[data-share-banner]'));
  sendForm.addEventListener('input',function(event){if(event.target.matches('[data-metric-field]'))refreshShare(sendForm.querySelector('[data-share-banner]'));});
  bulkActivityFilter.addEventListener('change',function(){var block=bulkForm.querySelector('[data-share-banner]');block.dataset.activity=bulkActivityFilter.value;if(block.dataset.edited!=='1')block.dataset.idx='0';refreshShare(block);});
  sendTypeSelect.addEventListener('change',function(){setSendType(sendTypeSelect.value);});
  sendForm.addEventListener('submit',sendEmail);
  sendCancel.addEventListener('click',function(){sendDialog.close();});
  sendPreviewBtn.addEventListener('click',previewSend);
  previewClose.addEventListener('click',function(){previewPane.hidden=true;});
  sendForm.querySelector('[data-add-custom-metric]').addEventListener('click',function(){addCustomMetricRow();});
  sendForm.querySelector('[data-custom-metrics-list]').addEventListener('click',function(event){var btn=event.target.closest('[data-remove-custom-metric]');if(btn)btn.closest('.custom-metric-row').remove();});
  sendForm.querySelector('[data-add-extra-link]').addEventListener('click',function(){addExtraLinkRow();});
  sendForm.querySelector('[data-extra-links-list]').addEventListener('click',function(event){var btn=event.target.closest('[data-remove-extra-link]');if(btn)btn.closest('.custom-metric-row').remove();});
  previewMobileToggle.addEventListener('click',function(){previewPane.classList.toggle('is-mobile');});

  templateSelect.addEventListener('change',function(){var tpl=templates.find(function(t){return t.id===templateSelect.value;});if(tpl)applyTemplatePayload(tpl.payload);});
  templateSaveBtn.addEventListener('click',async function(){
    var name=prompt('Template name?');if(!name)return;
    var payload=captureTemplatePayload();
    templateSaveBtn.disabled=true;
    try{await request('/rest/v1/email_templates',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({name:name,type:payload.type,payload:payload})});await loadTemplates();message(sendMessage,'Template saved.');}catch(error){message(sendMessage,error.message);}finally{templateSaveBtn.disabled=false;}
  });

  document.addEventListener('click',function(event){var pickBtn=event.target.closest('[data-pick-asset]');if(!pickBtn)return;openAssetPicker(pickBtn.closest('form'),pickBtn.dataset.pickAsset);});
  assetPickerGrid.addEventListener('click',function(event){var btn=event.target.closest('[data-asset-pick]');if(!btn||!assetPickerTarget)return;assetPickerTarget.form.elements[assetPickerTarget.name].value=btn.dataset.assetPick;assetPicker.close();});
  document.querySelector('[data-asset-picker-close]').addEventListener('click',function(){assetPicker.close();});
  assetUploadInput.addEventListener('change',async function(){
    var file=assetUploadInput.files[0];if(!file||!assetPickerTarget)return;
    message(assetPickerMessage,'Uploading…');
    try{
      var asset=await uploadAsset(file);
      assetLibrary=[{path:asset.path,url:asset.url}].concat(assetLibrary||[]);
      assetPickerTarget.form.elements[assetPickerTarget.name].value=asset.url;
      message(assetPickerMessage,'');
      assetPicker.close();
    }catch(error){message(assetPickerMessage,error.message);}
    finally{assetUploadInput.value='';}
  });

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
