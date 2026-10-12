// SB Marketing admin — "Devis" tab (/admin/#devis).
// Create quotes from the service catalog, export them as PDF (jsPDF,
// lazy-loaded the first time a PDF is needed) and email them to the client
// with the PDF attached (send-devis Edge Function). Tables live in
// supabase/devis_schema.sql. Kept separate from admin.js, which only
// registers the view and calls window.SBDevis.show() when the tab opens.
(function(){
  'use strict';
  var config=window.SB_SUPABASE,sessionKey='sb_admin_session';
  var view=document.querySelector('[data-view="devis"]');
  if(!config||!view)return;

  var JSPDF_URL='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var AUTOTABLE_URL='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
  var LOGO_URL='/images/sb-marketing-email-logo.png';
  var UNITS=['forfait','mois','heure','jour','unité','page'];
  var UNIT_EN={'forfait':'flat fee','mois':'month','heure':'hour','jour':'day','unité':'unit','page':'page'};
  var STATUS_LABELS={draft:'Draft',sent:'Sent',accepted:'Accepted',refused:'Refused'};

  var devisList=[],services=[],settings=null,appSettings=null,clients=[],contacts=[],loaded=false,loading=null,editing=null,pdfUrl=null,logoDataUrl=null;

  function $(selector,root){return(root||document).querySelector(selector);}
  var body=$('[data-devis-body]',view),emptyState=$('[data-devis-empty]',view),listMessage=$('[data-devis-message]',view),searchInput=$('[data-devis-search]',view),statusFilter=$('[data-devis-status-filter]',view);
  var dialog=$('[data-devis-dialog]'),form=$('[data-devis-form]'),formMessage=$('[data-devis-form-message]'),linesBox=$('[data-devis-lines]'),linesEmpty=$('[data-devis-lines-empty]'),summary=$('[data-devis-summary]'),servicePick=$('[data-devis-service-pick]'),sourceSelect=$('[data-devis-source]'),pdfPane=$('[data-devis-pdf-pane]'),pdfFrame=$('[data-devis-pdf-frame]');
  var servicesDialog=$('[data-devis-services-dialog]'),servicesBody=$('[data-devis-services-body]'),servicesMessage=$('[data-devis-services-message]');
  var settingsDialog=$('[data-devis-settings-dialog]'),settingsForm=$('[data-devis-settings-form]'),settingsMessage=$('[data-devis-settings-message]');

  // ── Helpers ─────────────────────────────────────────────────────
  function message(element,text){if(element)element.textContent=text||'';}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];});}
  function getSession(){try{return JSON.parse(localStorage.getItem(sessionKey)||'null');}catch(error){return null;}}
  function num(value){var n=parseFloat(String(value==null?'':value).replace(',','.'));return isFinite(n)?n:0;}
  function round2(n){return Math.round((n+Number.EPSILON)*100)/100;}
  // fr-FR formatting uses narrow no-break spaces, which jsPDF's built-in
  // fonts can't draw — normalise to plain spaces everywhere.
  function plainSpaces(text){return String(text).replace(/[    ]/g,' ');}
  function money(n,lang){return plainSpaces(new Intl.NumberFormat(lang==='en'?'en-GB':'fr-FR',{style:'currency',currency:'EUR'}).format(n||0));}
  function percent(n,lang){return plainSpaces(new Intl.NumberFormat(lang==='en'?'en-GB':'fr-FR',{maximumFractionDigits:2}).format(n||0))+(lang==='en'?'%':' %');}
  function qty(n,lang){return plainSpaces(new Intl.NumberFormat(lang==='en'?'en-GB':'fr-FR',{maximumFractionDigits:2}).format(n||0));}
  function todayIso(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function addDays(iso,days){var d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
  function formatDate(iso,lang){if(!iso)return '';return new Intl.DateTimeFormat(lang==='en'?'en-GB':'fr-FR',{day:'2-digit',month:lang==='en'?'short':'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(String(iso).slice(0,10)+'T00:00:00Z'));}
  function isExpired(d){return d.status==='sent'&&d.valid_until&&d.valid_until<todayIso();}
  function isEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());}
  function uuid(){return(window.crypto&&crypto.randomUUID)?crypto.randomUUID():null;}
  function clientLabel(d){return d.client_company||d.client_name||d.client_email||'—';}

  async function refreshSession(token){var response=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:token})});if(!response.ok)return null;var session=await response.json();localStorage.setItem(sessionKey,JSON.stringify(session));return session;}
  async function request(path,options,retried){
    var session=getSession(),headers=Object.assign({apikey:config.key,Authorization:'Bearer '+(session?session.access_token:config.key)},options&&options.headers||{});
    var response=await fetch(config.url+path,Object.assign({},options||{},{headers:headers}));
    if(response.status===401&&!retried&&session&&session.refresh_token&&await refreshSession(session.refresh_token))return request(path,options,true);
    if(!response.ok){var details=await response.json().catch(function(){return{};});var error=new Error(details.message||details.hint||details.error_description||'Request failed');error.code=details.code;throw error;}
    if(response.status===204||response.headers.get('content-length')==='0')return null;
    return response.json();
  }
  function jsonRequest(path,method,payload,returnRows){return request(path,{method:method,headers:{'Content-Type':'application/json',Prefer:returnRows?'return=representation':'return=minimal'},body:JSON.stringify(payload)});}
  async function invokeFunction(name,payload){
    var session=getSession();
    var response=await fetch(config.url+'/functions/v1/'+name,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+(session?session.access_token:config.key),'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var result=await response.json().catch(function(){return{};});
    if(!response.ok)throw new Error(result.error||(response.status===404?'The send-devis function is not deployed yet.':'Request failed ('+response.status+')'));
    return result;
  }
  function setupHint(error){return /devis/.test(error.message)?'Database setup required. Run supabase/devis_schema.sql in the Supabase SQL Editor.':error.message;}

  // ── Loading ─────────────────────────────────────────────────────
  async function loadAll(){
    message(listMessage,'Loading devis…');
    try{
      var results=await Promise.all([
        request('/rest/v1/devis?select=*&order=created_at.desc'),
        request('/rest/v1/devis_services?select=*&order=sort_order.asc,name.asc'),
        request('/rest/v1/devis_settings?id=eq.default&select=*&limit=1'),
        request('/rest/v1/app_settings?id=eq.default&select=*&limit=1').catch(function(){return [];}),
        request('/rest/v1/clients?select=id,business_name,contact_name,email,whatsapp_number,language&order=business_name.asc').catch(function(){return [];}),
        request('/rest/v1/contact_submissions?select=id,created_at,full_name,company,email,phone,service,language&order=created_at.desc&limit=200').catch(function(){return [];})
      ]);
      devisList=results[0]||[];services=results[1]||[];settings=(results[2]&&results[2][0])||{};appSettings=(results[3]&&results[3][0])||{};clients=results[4]||[];contacts=results[5]||[];
      loaded=true;
      renderList();renderServicePicker();renderSourceOptions();
      message(listMessage,'');
    }catch(error){message(listMessage,setupHint(error));}
  }
  function show(){if(!loaded&&!loading){loading=loadAll().finally(function(){loading=null;});}}

  // ── List ────────────────────────────────────────────────────────
  function renderList(){
    var term=searchInput.value.trim().toLowerCase(),status=statusFilter.value;
    var rows=devisList.filter(function(d){
      var searchable=[d.number,d.client_name,d.client_company,d.client_email,d.title].join(' ').toLowerCase();
      var statusMatch=!status||(status==='expired'?isExpired(d):d.status===status);
      return(!term||searchable.indexOf(term)>-1)&&statusMatch;
    });
    body.innerHTML=rows.map(function(d){
      var lang=d.language||'fr';
      return '<tr>'
        +'<td class="devis-number-cell">'+escapeHtml(d.number)+'</td>'
        +'<td>'+escapeHtml(formatDate(d.issue_date,'en'))+'<span class="muted-note">valid until '+escapeHtml(formatDate(d.valid_until,'en'))+'</span></td>'
        +'<td class="contact"><strong>'+escapeHtml(clientLabel(d))+'</strong>'+(d.client_company&&d.client_name?'<span class="muted-note">'+escapeHtml(d.client_name)+'</span>':'')+(d.client_email?'<a href="mailto:'+escapeHtml(d.client_email)+'">'+escapeHtml(d.client_email)+'</a>':'')+'</td>'
        +'<td>'+escapeHtml(d.title||'—')+'<span class="muted-note">'+(d.items||[]).length+' line'+((d.items||[]).length===1?'':'s')+'</span></td>'
        +'<td><span class="devis-total">'+escapeHtml(money(d.total_ttc,lang))+'</span><span class="muted-note">'+escapeHtml(money(d.total_ht,lang))+' HT</span></td>'
        +'<td><select class="status-select" data-devis-status="'+escapeHtml(d.id)+'">'+Object.keys(STATUS_LABELS).map(function(key){return '<option value="'+key+'"'+(d.status===key?' selected':'')+'>'+STATUS_LABELS[key]+'</option>';}).join('')+'</select>'
          +(isExpired(d)?'<span class="devis-badge">Expired</span>':'')
          +(d.sent_at?'<span class="muted-note">sent '+escapeHtml(formatDate(d.sent_at,'en'))+(d.send_count>1?' ('+d.send_count+'×)':'')+'</span>':'')+'</td>'
        +'<td><div class="devis-row-actions">'
          +'<button type="button" class="secondary" data-devis-edit="'+escapeHtml(d.id)+'">Edit</button>'
          +'<button type="button" class="secondary" data-devis-pdf="'+escapeHtml(d.id)+'">PDF</button>'
          +'<button type="button" class="secondary" data-devis-quick-send="'+escapeHtml(d.id)+'">'+(d.sent_at?'Resend':'Send')+'</button>'
          +'<button type="button" class="secondary" data-devis-duplicate="'+escapeHtml(d.id)+'">Duplicate</button>'
          +'<button type="button" class="danger" data-devis-delete="'+escapeHtml(d.id)+'">Delete</button>'
        +'</div></td></tr>';
    }).join('');
    emptyState.hidden=rows.length!==0;
    var accepted=devisList.filter(function(d){return d.status==='accepted';});
    $('[data-devis-stat-total]',view).textContent=devisList.length;
    $('[data-devis-stat-pending]',view).textContent=devisList.filter(function(d){return d.status==='sent'&&!isExpired(d);}).length;
    $('[data-devis-stat-accepted]',view).textContent=accepted.length;
    $('[data-devis-stat-amount]',view).textContent=money(accepted.reduce(function(sum,d){return sum+num(d.total_ht);},0),'fr').replace(/,00 €$/,' €');
  }
  function findDevis(id){return devisList.find(function(d){return d.id===id;});}
  function upsertLocal(row){var index=devisList.findIndex(function(d){return d.id===row.id;});if(index>-1)devisList[index]=row;else devisList.unshift(row);renderList();}

  async function updateStatus(id,status,select){
    select.disabled=true;
    var patch={status:status,responded_at:(status==='accepted'||status==='refused')?new Date().toISOString():null,updated_at:new Date().toISOString()};
    try{await jsonRequest('/rest/v1/devis?id=eq.'+encodeURIComponent(id),'PATCH',patch);var d=findDevis(id);if(d)Object.assign(d,patch);renderList();}
    catch(error){message(listMessage,error.message);}
    finally{select.disabled=false;}
  }
  async function deleteDevis(id){
    var d=findDevis(id);if(!d||!confirm('Delete devis '+d.number+'? This cannot be undone.'))return;
    try{await request('/rest/v1/devis?id=eq.'+encodeURIComponent(id),{method:'DELETE'});devisList=devisList.filter(function(x){return x.id!==id;});renderList();}
    catch(error){message(listMessage,error.message);}
  }

  // ── Numbering: PREFIX-YEAR-001, per calendar year ───────────────
  function nextNumber(){
    var base=(settings.number_prefix||'DEV').trim()+'-'+new Date().getFullYear()+'-',max=0;
    devisList.forEach(function(d){if(d.number&&d.number.indexOf(base)===0){var n=parseInt(d.number.slice(base.length),10);if(n>max)max=n;}});
    return base+String(max+1).padStart(3,'0');
  }

  // ── Totals ──────────────────────────────────────────────────────
  function computeTotals(d){
    var subtotal=round2((d.items||[]).reduce(function(sum,item){return sum+round2(num(item.quantity)*num(item.unit_price));},0));
    var discount=round2(subtotal*num(d.discount_percent)/100),totalHt=round2(subtotal-discount);
    var vat=d.vat_exempt?0:round2(totalHt*num(d.vat_rate)/100),ttc=round2(totalHt+vat);
    return{subtotal:subtotal,discount:discount,totalHt:totalHt,vat:vat,ttc:ttc,deposit:round2(ttc*num(d.deposit_percent)/100)};
  }

  // ── Editor: service lines ───────────────────────────────────────
  function unitOptions(selected){
    var units=UNITS.slice();if(selected&&units.indexOf(selected)===-1)units.push(selected);
    return units.map(function(u){return '<option value="'+escapeHtml(u)+'"'+(u===selected?' selected':'')+'>'+escapeHtml(u)+'</option>';}).join('');
  }
  function addLine(item){
    item=item||{};
    var row=document.createElement('div');row.className='devis-line';
    row.innerHTML='<div class="devis-line__main">'
      +'<label>Service<input data-f="name" value="'+escapeHtml(item.name||'')+'" placeholder="Service name"></label>'
      +'<label>Qty<input data-f="quantity" type="number" min="0" step="any" value="'+escapeHtml(item.quantity==null?1:item.quantity)+'"></label>'
      +'<label>Unit<select data-f="unit">'+unitOptions(item.unit||'forfait')+'</select></label>'
      +'<label>Unit price HT<input data-f="unit_price" type="number" step="0.01" value="'+escapeHtml(item.unit_price==null?'':item.unit_price)+'"></label>'
      +'<div class="devis-line__total"><span>Total HT</span><strong data-line-total></strong></div>'
      +'<div class="devis-line__tools"><button type="button" class="icon-button" data-line-up aria-label="Move up">↑</button><button type="button" class="icon-button" data-line-remove aria-label="Remove line">✕</button></div>'
      +'</div>'
      +'<textarea data-f="description" rows="2" placeholder="Description shown under the service (optional)">'+escapeHtml(item.description||'')+'</textarea>';
    linesBox.appendChild(row);
    return row;
  }
  function readLines(){
    return Array.from(linesBox.querySelectorAll('.devis-line')).map(function(row){
      function f(name){return row.querySelector('[data-f="'+name+'"]').value;}
      return{name:f('name').trim(),description:f('description').trim(),quantity:num(f('quantity')),unit:f('unit'),unit_price:round2(num(f('unit_price')))};
    }).filter(function(item){return item.name||item.description||item.unit_price;});
  }
  function renderServicePicker(){
    var groups={};
    services.filter(function(s){return s.active!==false;}).forEach(function(s){(groups[s.category||'Autre']=groups[s.category||'Autre']||[]).push(s);});
    servicePick.innerHTML='<option value="">Add a service from the catalog…</option>'+Object.keys(groups).map(function(category){
      return '<optgroup label="'+escapeHtml(category)+'">'+groups[category].map(function(s){return '<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.name)+' — '+escapeHtml(money(s.unit_price,'fr'))+' / '+escapeHtml(s.unit)+'</option>';}).join('')+'</optgroup>';
    }).join('');
  }

  // ── Editor: recipient source (clients + contact requests) ──────────
  function renderSourceOptions(){
    var html='<option value="">Enter details manually…</option>';
    if(clients.length)html+='<optgroup label="Clients">'+clients.map(function(c){return '<option value="client:'+escapeHtml(c.id)+'">'+escapeHtml(c.business_name+(c.contact_name?' — '+c.contact_name:''))+'</option>';}).join('')+'</optgroup>';
    if(contacts.length)html+='<optgroup label="Contact requests">'+contacts.map(function(c){return '<option value="contact:'+escapeHtml(c.id)+'">'+escapeHtml((c.company?c.company+' — ':'')+c.full_name+(c.service?' ('+c.service+')':''))+'</option>';}).join('')+'</optgroup>';
    sourceSelect.innerHTML=html;
  }
  function applySource(value){
    var parts=value.split(':'),el=form.elements;
    if(parts[0]==='client'){
      var c=clients.find(function(x){return x.id===parts[1];});if(!c)return;
      form.dataset.clientId=c.id;
      el.client_name.value=c.contact_name||'';el.client_company.value=c.business_name||'';el.client_email.value=c.email||'';el.client_phone.value=c.whatsapp_number||'';el.language.value=c.language==='en'?'en':'fr';
    }else if(parts[0]==='contact'){
      var s=contacts.find(function(x){return x.id===parts[1];});if(!s)return;
      // A contact who's already a client keeps the link, so the email shows in their history.
      var match=clients.find(function(x){return x.email&&s.email&&x.email.toLowerCase()===s.email.toLowerCase();});
      form.dataset.clientId=match?match.id:'';
      el.client_name.value=s.full_name||'';el.client_company.value=s.company||'';el.client_email.value=s.email||'';el.client_phone.value=s.phone||'';el.language.value=s.language==='en'?'en':'fr';
      if(!el.title.value.trim()&&s.service&&s.service!=='Autre')el.title.value=s.service;
    }
    refreshEditor();
  }

  // ── Editor: read / fill ─────────────────────────────────────────
  function readForm(){
    var el=form.elements,vatMode=el.vat_mode.value;
    var d={
      client_id:form.dataset.clientId||null,
      client_name:el.client_name.value.trim()||null,client_company:el.client_company.value.trim()||null,client_email:el.client_email.value.trim()||null,
      client_phone:el.client_phone.value.trim()||null,client_address:el.client_address.value.trim()||null,client_siret:el.client_siret.value.trim()||null,client_vat:el.client_vat.value.trim()||null,
      language:el.language.value==='en'?'en':'fr',
      title:el.title.value.trim()||null,intro:el.intro.value.trim()||null,
      issue_date:el.issue_date.value||todayIso(),valid_until:el.valid_until.value||null,
      items:readLines(),
      discount_percent:Math.min(100,Math.max(0,num(el.discount_percent.value))),
      vat_exempt:vatMode==='exempt',vat_rate:vatMode==='exempt'?0:num(vatMode),
      deposit_percent:Math.min(100,Math.max(0,num(el.deposit_percent.value))),
      payment_terms:el.payment_terms.value.trim()||null,notes:el.notes.value.trim()||null,
      email_message:el.email_message.value.trim()||null
    };
    var t=computeTotals(d);
    d.subtotal_ht=t.subtotal;d.total_ht=t.totalHt;d.total_vat=t.vat;d.total_ttc=t.ttc;
    return d;
  }
  function vatModeFor(d){if(d.vat_exempt)return 'exempt';var rate=String(num(d.vat_rate));return['20','10','5.5','0'].indexOf(rate)>-1?rate:'20';}
  function fillForm(d){
    var el=form.elements;
    ['client_name','client_company','client_email','client_phone','client_address','client_siret','client_vat','title','intro','issue_date','valid_until','payment_terms','notes'].forEach(function(key){el[key].value=d[key]==null?'':d[key];});
    el.language.value=d.language==='en'?'en':'fr';
    el.discount_percent.value=num(d.discount_percent);el.deposit_percent.value=num(d.deposit_percent);el.vat_mode.value=vatModeFor(d);
    form.dataset.clientId=d.client_id||'';
    linesBox.innerHTML='';(d.items||[]).forEach(addLine);
    // The saved message counts as "edited" so reopening never overwrites it.
    el.email_message.value=d.email_message||'';el.email_message.dataset.edited=d.email_message?'1':'';
    el.email_subject.value='';el.email_subject.dataset.edited='';
  }
  function emptyDevis(){
    var exempt=!!settings.vat_exempt;
    return{language:'fr',issue_date:todayIso(),valid_until:addDays(todayIso(),num(settings.validity_days)||30),items:[],discount_percent:0,vat_exempt:exempt,vat_rate:exempt?0:(settings.default_vat_rate==null?20:num(settings.default_vat_rate)),deposit_percent:num(settings.default_deposit_percent),payment_terms:settings.default_payment_terms||'',notes:settings.default_notes||''};
  }

  // ── Editor: email text (auto-written until the admin edits it) ─────
  function companyName(){return appSettings.company_name||settings.legal_name||'SB Marketing';}
  function replyAddress(){return settings.email||appSettings.reply_to_email||'';}
  function defaultSubject(d,number){return d.language==='en'?'Your quote '+number+' — '+companyName():'Votre devis '+number+' — '+companyName();}
  function defaultMessage(d,number){
    var t=computeTotals(d),lang=d.language,valid=formatDate(d.valid_until,lang);
    if(lang==='en'){
      return ['Please find attached our quote no. '+number+(d.title?' for “'+d.title+'”':'')+'.',
        'Total: '+money(t.ttc,lang)+(d.vat_exempt?' (VAT not applicable)':' incl. VAT ('+money(t.totalHt,lang)+' excl. VAT)')+'.'+(t.deposit?'\nA '+percent(d.deposit_percent,lang)+' deposit ('+money(t.deposit,lang)+') is due on signature.':'')+(valid?'\nThis quote is valid until '+valid+'.':''),
        'To accept it, just click the button below or send us the signed quote marked “Approved”. We’re happy to answer any question or adjust anything.',
        'Speak soon,\nThe '+companyName()+' team'].join('\n\n');
    }
    return ['Veuillez trouver ci-joint notre devis n° '+number+(d.title?' pour « '+d.title+' »':'')+'.',
      'Montant total : '+money(t.ttc,lang)+(d.vat_exempt?' (TVA non applicable)':' TTC ('+money(t.totalHt,lang)+' HT)')+'.'+(t.deposit?'\nUn acompte de '+percent(d.deposit_percent,lang)+' ('+money(t.deposit,lang)+') est demandé à la signature.':'')+(valid?'\nCe devis est valable jusqu’au '+valid+'.':''),
      'Pour l’accepter, cliquez simplement sur le bouton ci-dessous ou retournez-nous le devis signé avec la mention « Bon pour accord ». Nous restons à votre disposition pour toute question ou ajustement.',
      'À très bientôt,\nL’équipe '+companyName()].join('\n\n');
  }
  function currentNumber(){return editing&&editing.number?editing.number:nextNumber();}

  function refreshEditor(){
    var d=readForm(),t=computeTotals(d),lang=d.language;
    linesBox.querySelectorAll('.devis-line').forEach(function(row){row.querySelector('[data-line-total]').textContent=money(round2(num(row.querySelector('[data-f="quantity"]').value)*num(row.querySelector('[data-f="unit_price"]').value)),lang);});
    linesEmpty.hidden=linesBox.children.length>0;
    var rows=[['Subtotal HT',money(t.subtotal,lang)]];
    if(t.discount)rows.push(['Discount ('+percent(d.discount_percent,lang)+')','− '+money(t.discount,lang)],['Total HT',money(t.totalHt,lang)]);
    rows.push([d.vat_exempt?'VAT (not applicable)':'VAT ('+percent(d.vat_rate,lang)+')',money(t.vat,lang)]);
    summary.innerHTML=rows.map(function(r){return '<dt>'+escapeHtml(r[0])+'</dt><dd>'+escapeHtml(r[1])+'</dd>';}).join('')
      +'<dt class="is-total">'+(d.vat_exempt?'Total':'Total TTC')+'</dt><dd class="is-total">'+escapeHtml(money(t.ttc,lang))+'</dd>'
      +(t.deposit?'<dt>Deposit on signature ('+escapeHtml(percent(d.deposit_percent,lang))+')</dt><dd>'+escapeHtml(money(t.deposit,lang))+'</dd>':'');
    var number=currentNumber(),el=form.elements;
    if(!el.email_message.dataset.edited)el.email_message.value=defaultMessage(d,number);
    if(!el.email_subject.dataset.edited)el.email_subject.value=defaultSubject(d,number);
  }

  function openEditor(d,isCopy){
    if(!loaded){message(listMessage,'Still loading — try again in a moment.');return;}
    editing=(d&&!isCopy)?d:null;
    var data=d?Object.assign({},d):emptyDevis();
    if(isCopy){data.issue_date=todayIso();data.valid_until=addDays(todayIso(),num(settings.validity_days)||30);data.email_message=null;}
    form.reset();fillForm(data);sourceSelect.value='';
    $('[data-devis-dialog-title]').textContent=editing?'Edit devis':(isCopy?'Duplicate devis':'New devis');
    $('[data-devis-number]').textContent=editing?editing.number+' · '+STATUS_LABELS[editing.status]:nextNumber()+' (assigned on save)';
    closePdfPreview();message(formMessage,'');
    refreshEditor();
    dialog.showModal();
  }

  // ── Save / send ─────────────────────────────────────────────────
  async function saveDevis(){
    var d=readForm(),now=new Date().toISOString();
    if(editing){
      d.updated_at=now;
      var rows=await jsonRequest('/rest/v1/devis?id=eq.'+encodeURIComponent(editing.id),'PATCH',d,true);
      editing=rows[0];
    }else{
      for(var attempt=0;;attempt++){
        d.number=nextNumber();
        try{var created=await jsonRequest('/rest/v1/devis','POST',d,true);editing=created[0];break;}
        catch(error){
          // Number taken (e.g. created from another tab) — reload and retry once.
          if(error.code!=='23505'||attempt>0)throw error;
          devisList=await request('/rest/v1/devis?select=*&order=created_at.desc');
        }
      }
    }
    upsertLocal(editing);
    $('[data-devis-number]').textContent=editing.number+' · '+STATUS_LABELS[editing.status];
    return editing;
  }
  function validateForSend(d){
    if(!isEmail(d.client_email))return 'Add a valid client email to send the devis.';
    if(!d.client_name&&!d.client_company)return 'Add the client’s name or company.';
    return validateForPdf(d);
  }
  function validateForPdf(d){
    if(!d.items.length)return 'Add at least one service.';
    if(d.items.some(function(i){return !i.name;}))return 'Every line needs a service name.';
    return '';
  }
  function acceptUrl(d){
    var reply=replyAddress();if(!reply)return null;
    var t=computeTotals(d),en=d.language==='en';
    var subject=en?'Approved — quote '+d.number:'Bon pour accord — devis '+d.number;
    var text=en?'Hello,\n\nI accept quote no. '+d.number+' for a total of '+money(t.ttc,'en')+'.\n\nBest regards,\n'+(d.client_name||''):'Bonjour,\n\nJ’accepte le devis n° '+d.number+' d’un montant de '+money(t.ttc,'fr')+(d.vat_exempt?'':' TTC')+'.\n\nCordialement,\n'+(d.client_name||'');
    return 'mailto:'+reply+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);
  }
  function brandingPayload(){
    var a=appSettings||{};
    return{companyName:a.company_name||undefined,logoUrl:a.logo_url||undefined,logoPart1:a.logo_part1||undefined,logoPart2:a.logo_part2||undefined,footerTaglineFr:a.footer_tagline_fr||undefined,footerTaglineEn:a.footer_tagline_en||undefined,websiteUrl:a.website_url||undefined,instagramUrl:a.instagram_url||undefined,facebookUrl:a.facebook_url||undefined,phone:a.phone||undefined,whatsappNumber:a.whatsapp_number||undefined};
  }

  // Sends an already-saved devis row: builds the PDF, emails it, then
  // marks the row sent and logs the email in the client's history.
  async function sendSaved(d,subject,text){
    var pdf=await buildPdf(d),emailId=d.client_id?uuid():null,en=d.language==='en';
    var result=await invokeFunction('send-devis',{
      to:d.client_email,business_name:d.client_company||d.client_name,contact_name:d.client_name||undefined,language:d.language,
      subject:subject,body:text,cta_label:en?'✅ Accept the quote':'✅ Accepter le devis',cta_url:acceptUrl(d)||undefined,
      branding:brandingPayload(),reply_to:replyAddress()||undefined,
      view_online_url:emailId?'https://www.sbmarketing.fr/view-email/?id='+emailId:undefined,
      pdf_base64:pdf.output('datauristring').split(',')[1],filename:pdfFilename(d)
    });
    var now=new Date().toISOString();
    var patch={status:d.status==='accepted'?'accepted':'sent',sent_at:now,send_count:(d.send_count||0)+1,email_message:text,updated_at:now};
    await jsonRequest('/rest/v1/devis?id=eq.'+encodeURIComponent(d.id),'PATCH',patch);
    Object.assign(d,patch);upsertLocal(d);
    if(d.client_id){
      var entry={client_id:d.client_id,type:'custom',subject:subject,body:text,sent_at:now,rendered_html:result.html||null};
      if(emailId)entry.id=emailId;
      // History is a nice-to-have — never report a sent devis as failed because of it.
      await jsonRequest('/rest/v1/client_emails','POST',entry).catch(function(){});
    }
    return d;
  }
  function sendErrorText(error){return error.message.indexOf('RESEND_API_KEY')>-1?'Email sending is not configured yet — set RESEND_API_KEY as an Edge Function secret in Supabase.':error.message;}

  async function onSubmitSend(event){
    event.preventDefault();
    var d=readForm(),problem=validateForSend(d);if(problem){message(formMessage,problem);return;}
    var button=$('[data-devis-send]');button.disabled=true;
    try{
      message(formMessage,'Saving…');
      var subject=form.elements.email_subject.value.trim(),text=form.elements.email_message.value.trim();
      var saved=await saveDevis();
      if(!form.elements.email_subject.dataset.edited)subject=defaultSubject(saved,saved.number);
      if(!form.elements.email_message.dataset.edited)text=defaultMessage(saved,saved.number);
      message(formMessage,'Generating PDF and sending…');
      await sendSaved(saved,subject,text);
      dialog.close();
      message(listMessage,'');
      flash('Devis '+saved.number+' sent to '+saved.client_email+'.');
    }catch(error){message(formMessage,sendErrorText(error));}
    finally{button.disabled=false;}
  }
  async function onSaveDraft(){
    var button=$('[data-devis-save]');button.disabled=true;message(formMessage,'Saving…');
    try{var saved=await saveDevis();message(formMessage,'Saved as '+saved.number+'.');}
    catch(error){message(formMessage,setupHint(error));}
    finally{button.disabled=false;}
  }
  async function quickSend(id){
    var d=findDevis(id);if(!d)return;
    if(!isEmail(d.client_email)){openEditor(d);message(formMessage,'Add a valid client email, then click “Save & send”.');return;}
    if(!confirm((d.sent_at?'Resend':'Send')+' devis '+d.number+' to '+d.client_email+'?'))return;
    message(listMessage,'Sending '+d.number+'…');
    try{await sendSaved(d,defaultSubject(d,d.number),d.email_message||defaultMessage(d,d.number));message(listMessage,'');flash('Devis '+d.number+' sent to '+d.client_email+'.');}
    catch(error){message(listMessage,sendErrorText(error));}
  }
  function flash(text){listMessage.style.color='#1a7f3c';message(listMessage,text);setTimeout(function(){if(listMessage.textContent===text){message(listMessage,'');}listMessage.style.color='';},6000);}

  // ── PDF ─────────────────────────────────────────────────────────
  function loadScript(src){return new Promise(function(resolve,reject){var existing=document.querySelector('script[src="'+src+'"]');if(existing&&existing.dataset.loaded){resolve();return;}var s=existing||document.createElement('script');s.src=src;s.onload=function(){s.dataset.loaded='1';resolve();};s.onerror=function(){reject(new Error('Could not load the PDF library — check your connection.'));};if(!existing)document.head.appendChild(s);});}
  async function loadPdfLibs(){if(!(window.jspdf&&window.jspdf.jsPDF))await loadScript(JSPDF_URL);if(!window.jspdf.jsPDF.API.autoTable)await loadScript(AUTOTABLE_URL);}
  async function loadLogo(){
    if(logoDataUrl!==null)return logoDataUrl;
    try{var blob=await(await fetch(LOGO_URL)).blob();logoDataUrl=await new Promise(function(resolve){var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=function(){resolve('');};reader.readAsDataURL(blob);});}
    catch(error){logoDataUrl='';}
    return logoDataUrl;
  }
  function slug(text){return String(text||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);}
  function pdfFilename(d){return(d.language==='en'?'Quote-':'Devis-')+d.number+(clientLabel(d)!=='—'?'-'+slug(clientLabel(d)):'')+'.pdf';}

  var PDF_COPY={
    fr:{doc:'DEVIS',no:'N°',date:'Date du devis',valid:'Valable jusqu’au',ref:'Référence',from:'ÉMETTEUR',to:'CLIENT',object:'Objet',desc:'Désignation',qty:'Qté',unit:'Unité',pu:'P.U. HT',total:'Total HT',subtotal:'Sous-total HT',discount:'Remise',totalHt:'Total HT',vat:'TVA',ttc:'Total TTC',net:'Net à payer',deposit:'Acompte à la signature',payment:'Conditions de paiement',bank:'Coordonnées bancaires',notes:'Conditions',sign:'Bon pour accord',signHint:'Date, signature et cachet du client, précédés de la mention « Bon pour accord »',page:'Page',siret:'SIRET',vatNo:'TVA intracom.'},
    en:{doc:'QUOTE',no:'No.',date:'Quote date',valid:'Valid until',ref:'Reference',from:'FROM',to:'CLIENT',object:'Subject',desc:'Description',qty:'Qty',unit:'Unit',pu:'Unit price',total:'Amount',subtotal:'Subtotal (excl. VAT)',discount:'Discount',totalHt:'Total excl. VAT',vat:'VAT',ttc:'Total incl. VAT',net:'Total due',deposit:'Deposit due on signature',payment:'Payment terms',bank:'Bank details',notes:'Terms & conditions',sign:'Approval',signHint:'Date, signature and company stamp, preceded by “Approved”',page:'Page',siret:'SIRET',vatNo:'VAT no.'}
  };

  async function buildPdf(d){
    await loadPdfLibs();
    var logo=await loadLogo();
    var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'mm',format:'a4'});
    var lang=d.language==='en'?'en':'fr',L=PDF_COPY[lang],t=computeTotals(d),s=settings||{};
    var NAVY=[4,16,33],GOLD=[242,201,76],TEXT=[17,28,43],MUTED=[107,114,128],LIGHT=[245,246,248],LINE=[228,231,236];
    var left=16,right=194,width=right-left,bottomLimit=276,y;
    function txt(value){return plainSpaces(value==null?'':value);}
    function font(size,style,color){doc.setFont('helvetica',style||'normal');doc.setFontSize(size);doc.setTextColor.apply(doc,color||TEXT);}
    function ensure(height){if(y+height>bottomLimit){doc.addPage();y=20;}}
    function lines(value,maxWidth){return doc.splitTextToSize(txt(value),maxWidth);}

    // Header band (the logo artwork is gold on navy, so it sits on navy)
    doc.setFillColor.apply(doc,NAVY);doc.rect(0,0,210,36,'F');
    if(logo){try{doc.addImage(logo,'PNG',left,11,56,56*164/740);}catch(error){}}
    else{font(18,'bold',GOLD);doc.text(txt(companyName()),left,21);}
    font(24,'bold',GOLD);doc.text(L.doc,right,19,{align:'right'});
    font(10,'normal',[255,255,255]);doc.text(L.no+' '+txt(d.number),right,26.5,{align:'right'});
    doc.setFillColor.apply(doc,GOLD);doc.rect(0,36,210,1.2,'F');

    // Issuer (left) and client box (right)
    y=48;
    var issuer=[s.legal_form,s.address,s.siret?L.siret+' '+s.siret:'',s.vat_number?L.vatNo+' '+s.vat_number:'',[s.email,s.phone].filter(Boolean).join(' · '),s.website].filter(Boolean).join('\n');
    font(7.5,'bold',MUTED);doc.text(L.from,left,y);
    font(11,'bold');doc.text(txt(s.legal_name||companyName()),left,y+6);
    font(9,'normal',MUTED);var issuerLines=lines(issuer,84);doc.text(issuerLines,left,y+11.5,{lineHeightFactor:1.35});
    var issuerBottom=y+11.5+issuerLines.length*4.3;

    var boxX=110,boxW=right-boxX;
    var clientDetail=[d.client_company?d.client_name:'',d.client_address,d.client_email,d.client_phone,d.client_siret?L.siret+' '+d.client_siret:'',d.client_vat?L.vatNo+' '+d.client_vat:''].filter(Boolean).join('\n');
    font(9,'normal');var clientLines=lines(clientDetail,boxW-10);
    var boxH=Math.max(26,15+clientLines.length*4.3+4);
    doc.setFillColor.apply(doc,LIGHT);doc.roundedRect(boxX,y-5,boxW,boxH,2.5,2.5,'F');
    font(7.5,'bold',MUTED);doc.text(L.to,boxX+5,y);
    font(11,'bold');doc.text(lines(d.client_company||d.client_name||'',boxW-10)[0]||'',boxX+5,y+6);
    font(9,'normal',TEXT);doc.text(clientLines,boxX+5,y+11.5,{lineHeightFactor:1.35});
    y=Math.max(issuerBottom,y-5+boxH)+8;

    // Date strip
    doc.setDrawColor.apply(doc,LINE);doc.setLineWidth(.3);doc.roundedRect(left,y,width,14,2,2,'S');
    [[L.date,formatDate(d.issue_date,lang)],[L.valid,formatDate(d.valid_until,lang)||'—'],[L.ref,d.number]].forEach(function(cell,i){
      var x=left+5+i*(width/3);font(7.5,'bold',MUTED);doc.text(txt(cell[0]).toUpperCase(),x,y+5.5);font(10,'bold');doc.text(txt(cell[1]),x,y+10.8);
    });
    y+=22;

    // Object + intro
    if(d.title){font(11,'bold');var titleLines=lines(L.object+' : '+d.title,width);doc.text(titleLines,left,y);y+=titleLines.length*5+1.5;}
    if(d.intro){font(9.5,'normal',TEXT);var introLines=lines(d.intro,width);ensure(introLines.length*4.5);doc.text(introLines,left,y+1,{lineHeightFactor:1.4});y+=introLines.length*4.6+3;}
    y+=2;

    // Services table — name row (bold) + optional description row, striped per service
    var bodyRows=[];
    d.items.forEach(function(item,index){
      var fill=index%2?[250,250,251]:[255,255,255];
      var unit=lang==='en'?(UNIT_EN[item.unit]||item.unit):item.unit;
      bodyRows.push([{content:txt(item.name),styles:{fontStyle:'bold',fillColor:fill,cellPadding:{top:3.2,bottom:item.description?1:3.2,left:3,right:3}}},{content:qty(item.quantity,lang),styles:{fillColor:fill}},{content:txt(unit),styles:{fillColor:fill}},{content:money(item.unit_price,lang),styles:{fillColor:fill}},{content:money(round2(num(item.quantity)*num(item.unit_price)),lang),styles:{fillColor:fill,fontStyle:'bold'}}]);
      if(item.description)bodyRows.push([{content:txt(item.description),colSpan:5,styles:{fillColor:fill,textColor:MUTED,fontSize:8.5,cellPadding:{top:0,bottom:3.2,left:3,right:60}}}]);
    });
    doc.autoTable({
      startY:y,theme:'plain',margin:{left:left,right:210-right,bottom:24,top:20},
      head:[[L.desc,{content:L.qty,styles:{halign:'right'}},L.unit,{content:L.pu,styles:{halign:'right'}},{content:L.total,styles:{halign:'right'}}]],
      body:bodyRows,
      headStyles:{fillColor:NAVY,textColor:[255,255,255],fontStyle:'bold',fontSize:8.5,cellPadding:3.2},
      bodyStyles:{fontSize:9.5,textColor:TEXT,cellPadding:3.2,valign:'top'},
      columnStyles:{1:{halign:'right',cellWidth:16},2:{cellWidth:22},3:{halign:'right',cellWidth:28},4:{halign:'right',cellWidth:30}},
      didDrawPage:function(){doc.setDrawColor.apply(doc,LINE);}
    });
    y=doc.lastAutoTable.finalY;
    doc.setDrawColor.apply(doc,LINE);doc.setLineWidth(.3);doc.line(left,y,right,y);
    y+=7;

    // Bottom block — right: totals then signature box; left: payment
    // terms, bank details and conditions. Kept on one page together.
    var totalRows=[[L.subtotal,money(t.subtotal,lang)]];
    if(t.discount)totalRows.push([L.discount+' ('+percent(d.discount_percent,lang)+')','- '+money(t.discount,lang)],[L.totalHt,money(t.totalHt,lang)]);
    if(!d.vat_exempt)totalRows.push([L.vat+' ('+percent(d.vat_rate,lang)+')',money(t.vat,lang)]);
    var leftBlocks=[];
    if(d.payment_terms)leftBlocks.push([L.payment,d.payment_terms]);
    if(s.iban)leftBlocks.push([L.bank,'IBAN '+s.iban+(s.bic?'\nBIC '+s.bic:'')]);
    if(d.notes)leftBlocks.push([L.notes,d.notes]);
    font(9,'normal');
    leftBlocks.forEach(function(b){b[2]=lines(b[1],92);});
    var leftH=leftBlocks.reduce(function(h,b){return h+5.5+b[2].length*4.1+5;},0);
    var signH=26,rightH=totalRows.length*6+10+(d.vat_exempt?6:0)+(t.deposit?8.5:0)+5+signH;
    ensure(Math.max(leftH,rightH));
    var tx=118,tw=right-tx,ty=y;
    totalRows.forEach(function(r){font(9.5,'normal',MUTED);doc.text(txt(r[0]),tx+3,ty+4);font(9.5,'bold');doc.text(txt(r[1]),right-3,ty+4,{align:'right'});ty+=6;});
    doc.setFillColor.apply(doc,NAVY);doc.roundedRect(tx,ty,tw,10,2,2,'F');
    font(10.5,'bold',[255,255,255]);doc.text(d.vat_exempt?L.net:L.ttc,tx+3,ty+6.6);font(11.5,'bold',GOLD);doc.text(money(t.ttc,lang),right-3,ty+6.6,{align:'right'});
    ty+=10;
    if(d.vat_exempt){font(8,'italic',MUTED);doc.text(txt(s.vat_exempt_mention||'TVA non applicable, art. 293 B du CGI'),right,ty+4.5,{align:'right'});ty+=6;}
    if(t.deposit){font(9,'normal',MUTED);doc.text(txt(L.deposit+' ('+percent(d.deposit_percent,lang)+')'),tx+3,ty+6);font(9.5,'bold');doc.text(money(t.deposit,lang),right-3,ty+6,{align:'right'});ty+=8.5;}
    ty+=5;
    doc.setDrawColor.apply(doc,LINE);doc.setLineWidth(.4);doc.roundedRect(tx,ty,tw,signH,2,2,'S');
    font(10,'bold');doc.text(L.sign,tx+4,ty+6.5);
    font(7.5,'normal',MUTED);doc.text(lines(L.signHint,tw-8),tx+4,ty+11.5,{lineHeightFactor:1.3});
    var py=y;
    leftBlocks.forEach(function(b){
      font(7.5,'bold',MUTED);doc.text(txt(b[0]).toUpperCase(),left,py+3);
      font(9,'normal',TEXT);doc.text(b[2],left,py+8.5,{lineHeightFactor:1.3});
      py+=5.5+b[2].length*4.1+5;
    });

    // Footer on every page
    var footer=[s.legal_name||companyName(),s.legal_form,s.siret?L.siret+' '+s.siret:'',s.vat_number?L.vatNo+' '+s.vat_number:''].filter(Boolean).join(' · ');
    var footer2=[String(s.address||'').replace(/\s*\n\s*/g,', '),s.email,s.website].filter(Boolean).join(' · ');
    var pages=doc.getNumberOfPages();
    for(var p=1;p<=pages;p++){
      doc.setPage(p);
      doc.setDrawColor.apply(doc,LINE);doc.setLineWidth(.3);doc.line(left,282,right,282);
      font(7.5,'normal',MUTED);
      doc.text(txt(footer),105,286.5,{align:'center',maxWidth:150});
      if(footer2)doc.text(txt(footer2),105,290.5,{align:'center',maxWidth:150});
      doc.text(L.page+' '+p+' / '+pages,right,286.5,{align:'right'});
    }
    doc.setProperties({title:(lang==='en'?'Quote ':'Devis ')+d.number,author:s.legal_name||companyName(),subject:d.title||''});
    return doc;
  }

  // Editor PDF actions work on unsaved changes too: they render the form
  // as-is (with a provisional number for a brand-new devis).
  function editorSnapshot(){var d=readForm();d.number=currentNumber();return d;}
  function closePdfPreview(){pdfPane.hidden=true;if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}pdfFrame.removeAttribute('src');}
  async function previewPdf(){
    var d=editorSnapshot(),problem=validateForPdf(d);if(problem){message(formMessage,problem);return;}
    message(formMessage,'Generating PDF…');
    try{var doc=await buildPdf(d);closePdfPreview();pdfUrl=URL.createObjectURL(doc.output('blob'));pdfFrame.src=pdfUrl;pdfPane.hidden=false;message(formMessage,'');pdfPane.scrollIntoView({behavior:'smooth',block:'nearest'});}
    catch(error){message(formMessage,error.message);}
  }
  async function downloadFromEditor(){
    var d=editorSnapshot(),problem=validateForPdf(d);if(problem){message(formMessage,problem);return;}
    try{(await buildPdf(d)).save(pdfFilename(d));message(formMessage,'');}catch(error){message(formMessage,error.message);}
  }
  async function downloadRow(id){
    var d=findDevis(id);if(!d)return;
    try{(await buildPdf(d)).save(pdfFilename(d));}catch(error){message(listMessage,error.message);}
  }

  // ── Service catalog dialog ──────────────────────────────────────
  function serviceRowHtml(s){
    return '<tr data-service-id="'+escapeHtml(s.id||'')+'">'
      +'<td><input data-s="category" value="'+escapeHtml(s.category||'')+'" list="devis-category-options"></td>'
      +'<td><input data-s="name" value="'+escapeHtml(s.name||'')+'" placeholder="Service name"></td>'
      +'<td><textarea data-s="description" rows="1">'+escapeHtml(s.description||'')+'</textarea></td>'
      +'<td><select data-s="unit">'+unitOptions(s.unit||'forfait')+'</select></td>'
      +'<td><input data-s="unit_price" type="number" step="0.01" min="0" value="'+escapeHtml(s.unit_price==null?'':s.unit_price)+'"></td>'
      +'<td><input data-s="active" type="checkbox"'+(s.active===false?'':' checked')+' aria-label="Active"></td>'
      +'<td><button type="button" class="icon-button" data-service-remove aria-label="Delete service">✕</button></td></tr>';
  }
  function openServices(){
    if(!loaded){message(listMessage,'Still loading — try again in a moment.');return;}
    var categories=Array.from(new Set(services.map(function(s){return s.category;}).filter(Boolean)));
    var datalist=document.getElementById('devis-category-options');
    if(!datalist){datalist=document.createElement('datalist');datalist.id='devis-category-options';document.body.appendChild(datalist);}
    datalist.innerHTML=categories.map(function(c){return '<option value="'+escapeHtml(c)+'">';}).join('');
    servicesBody.innerHTML=services.map(serviceRowHtml).join('');
    message(servicesMessage,'');servicesDialog.showModal();
  }
  async function saveServices(){
    var dirty=Array.from(servicesBody.querySelectorAll('tr.is-dirty')),button=$('[data-devis-services-save]');
    if(!dirty.length){message(servicesMessage,'No changes to save.');return;}
    button.disabled=true;message(servicesMessage,'Saving…');
    try{
      var maxOrder=services.reduce(function(m,s){return Math.max(m,s.sort_order||0);},0);
      for(var i=0;i<dirty.length;i++){
        var row=dirty[i],id=row.dataset.serviceId;
        function v(name){return row.querySelector('[data-s="'+name+'"]');}
        var payload={category:v('category').value.trim()||'Autre',name:v('name').value.trim(),description:v('description').value.trim()||null,unit:v('unit').value,unit_price:round2(num(v('unit_price').value)),active:v('active').checked};
        if(!payload.name)throw new Error('Every service needs a name.');
        if(id)await jsonRequest('/rest/v1/devis_services?id=eq.'+encodeURIComponent(id),'PATCH',payload);
        else{payload.sort_order=(maxOrder+=10);var created=await jsonRequest('/rest/v1/devis_services','POST',payload,true);row.dataset.serviceId=created[0].id;}
        row.classList.remove('is-dirty');
      }
      services=await request('/rest/v1/devis_services?select=*&order=sort_order.asc,name.asc');
      renderServicePicker();message(servicesMessage,'Saved.');
    }catch(error){message(servicesMessage,error.message);}
    finally{button.disabled=false;}
  }
  async function removeService(row){
    var id=row.dataset.serviceId;
    if(!id){row.remove();return;}
    if(!confirm('Delete this service from the catalog? Existing devis keep their lines.'))return;
    try{await request('/rest/v1/devis_services?id=eq.'+encodeURIComponent(id),{method:'DELETE'});services=services.filter(function(s){return s.id!==id;});row.remove();renderServicePicker();}
    catch(error){message(servicesMessage,error.message);}
  }

  // ── Settings dialog ─────────────────────────────────────────────
  var SETTINGS_TEXT=['legal_name','legal_form','address','siret','vat_number','email','phone','website','iban','bic','number_prefix','vat_exempt_mention','default_payment_terms','default_notes'];
  var SETTINGS_NUMBERS=['validity_days','default_vat_rate','default_deposit_percent'];
  function openSettings(){
    if(!loaded){message(listMessage,'Still loading — try again in a moment.');return;}
    SETTINGS_TEXT.concat(SETTINGS_NUMBERS).forEach(function(key){settingsForm.elements[key].value=settings[key]==null?'':settings[key];});
    settingsForm.elements.vat_exempt.checked=!!settings.vat_exempt;
    message(settingsMessage,'');settingsDialog.showModal();
  }
  async function saveSettings(event){
    event.preventDefault();
    var payload={updated_at:new Date().toISOString(),vat_exempt:settingsForm.elements.vat_exempt.checked};
    SETTINGS_TEXT.forEach(function(key){payload[key]=settingsForm.elements[key].value.trim()||null;});
    SETTINGS_NUMBERS.forEach(function(key){payload[key]=num(settingsForm.elements[key].value);});
    if(!payload.legal_name)payload.legal_name='SB Marketing';
    if(!payload.number_prefix)payload.number_prefix='DEV';
    if(!payload.vat_exempt_mention)payload.vat_exempt_mention='TVA non applicable, art. 293 B du CGI';
    if(payload.validity_days<1)payload.validity_days=30;
    var button=settingsForm.querySelector('button[type="submit"]');button.disabled=true;message(settingsMessage,'Saving…');
    try{await jsonRequest('/rest/v1/devis_settings?id=eq.default','PATCH',payload);settings=Object.assign({},settings,payload);message(settingsMessage,'Saved.');}
    catch(error){message(settingsMessage,error.message);}
    finally{button.disabled=false;}
  }

  // ── Wiring ──────────────────────────────────────────────────────
  searchInput.addEventListener('input',renderList);
  statusFilter.addEventListener('change',renderList);
  $('[data-devis-new]',view).addEventListener('click',function(){openEditor(null);});
  $('[data-devis-services-open]',view).addEventListener('click',openServices);
  $('[data-devis-settings-open]',view).addEventListener('click',openSettings);
  body.addEventListener('change',function(event){var select=event.target.closest('[data-devis-status]');if(select)updateStatus(select.dataset.devisStatus,select.value,select);});
  body.addEventListener('click',function(event){
    var b;
    if((b=event.target.closest('[data-devis-edit]')))openEditor(findDevis(b.dataset.devisEdit));
    else if((b=event.target.closest('[data-devis-pdf]')))downloadRow(b.dataset.devisPdf);
    else if((b=event.target.closest('[data-devis-quick-send]')))quickSend(b.dataset.devisQuickSend);
    else if((b=event.target.closest('[data-devis-duplicate]')))openEditor(findDevis(b.dataset.devisDuplicate),true);
    else if((b=event.target.closest('[data-devis-delete]')))deleteDevis(b.dataset.devisDelete);
  });

  form.addEventListener('submit',onSubmitSend);
  form.addEventListener('input',function(event){
    if(event.target.name==='email_message'||event.target.name==='email_subject'){event.target.dataset.edited=event.target.value.trim()?'1':'';return;}
    refreshEditor();
  });
  form.addEventListener('change',function(event){if(event.target.name==='language'||event.target.name==='vat_mode'||event.target.dataset.f==='unit')refreshEditor();});
  sourceSelect.addEventListener('change',function(){if(sourceSelect.value)applySource(sourceSelect.value);});
  servicePick.addEventListener('change',function(){
    var s=services.find(function(x){return x.id===servicePick.value;});servicePick.value='';if(!s)return;
    addLine({name:s.name,description:s.description,quantity:1,unit:s.unit,unit_price:s.unit_price});refreshEditor();
  });
  $('[data-devis-add-line]').addEventListener('click',function(){var row=addLine({quantity:1,unit:'forfait'});refreshEditor();row.querySelector('[data-f="name"]').focus();});
  linesBox.addEventListener('click',function(event){
    var row=event.target.closest('.devis-line');if(!row)return;
    if(event.target.closest('[data-line-remove]')){row.remove();refreshEditor();}
    else if(event.target.closest('[data-line-up]')&&row.previousElementSibling){linesBox.insertBefore(row,row.previousElementSibling);}
  });
  $('[data-devis-save]').addEventListener('click',onSaveDraft);
  $('[data-devis-preview]').addEventListener('click',previewPdf);
  $('[data-devis-download]').addEventListener('click',downloadFromEditor);
  $('[data-devis-pdf-close]').addEventListener('click',closePdfPreview);
  $('[data-devis-close]').addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('close',function(){closePdfPreview();editing=null;});

  servicesBody.addEventListener('input',function(event){var row=event.target.closest('tr');if(row)row.classList.add('is-dirty');});
  servicesBody.addEventListener('change',function(event){var row=event.target.closest('tr');if(row)row.classList.add('is-dirty');});
  servicesBody.addEventListener('click',function(event){if(event.target.closest('[data-service-remove]'))removeService(event.target.closest('tr'));});
  $('[data-devis-services-add]').addEventListener('click',function(){servicesBody.insertAdjacentHTML('beforeend',serviceRowHtml({category:'',unit:'forfait',active:true}));var row=servicesBody.lastElementChild;row.classList.add('is-dirty');row.querySelector('[data-s="name"]').focus();});
  $('[data-devis-services-save]').addEventListener('click',saveServices);
  $('[data-devis-services-close]').addEventListener('click',function(){if(servicesBody.querySelector('tr.is-dirty')&&!confirm('Discard unsaved catalog changes?'))return;servicesDialog.close();});

  settingsForm.addEventListener('submit',saveSettings);
  $('[data-devis-settings-close]').addEventListener('click',function(){settingsDialog.close();});

  var refreshButton=document.querySelector('[data-refresh]');
  if(refreshButton)refreshButton.addEventListener('click',function(){if(!view.hidden){loaded=false;show();}});
  var logoutButton=document.querySelector('[data-logout]');
  if(logoutButton)logoutButton.addEventListener('click',function(){loaded=false;devisList=[];services=[];clients=[];contacts=[];body.innerHTML='';});

  window.SBDevis={show:show,openNew:function(){show();(loading||Promise.resolve()).then(function(){openEditor(null);});}};
  // admin.js may have already opened #devis before this script loaded.
  if(!view.hidden)show();
})();
