// SB Marketing admin — "Devis" tab (/admin/#devis), with its "Factures"
// sub-tab. Quotes are built from free "désignation" lines (sections,
// options, monthly lines, line discounts) or the service catalog, exported
// as PDF / PNG / JPG, shared on WhatsApp, and emailed with a link to the
// client's /devis/ page where they can tick options and sign online.
// Accepted quotes become deposit / balance / full invoices.
// Totals + PDF/image rendering live in js/devis-core.js (shared with the
// public page); tables in supabase/devis_schema.sql. admin.js only
// registers the view and calls window.SBDevis.show() when the tab opens.
(function(){
  'use strict';
  var config=window.SB_SUPABASE,Core=window.SBDevisCore,sessionKey='sb_admin_session';
  var view=document.querySelector('[data-view="devis"]');
  if(!config||!Core||!view)return;

  var UNITS=['forfait','mois','heure','jour','unité','page'];
  var STATUS_LABELS={draft:'Draft',sent:'Sent',accepted:'Accepted',refused:'Refused',superseded:'Replaced'};
  var FACTURE_STATUS={unpaid:'Unpaid',paid:'Paid',cancelled:'Cancelled'};
  var FACTURE_KIND={deposit:'Deposit',balance:'Balance',full:'Full'};
  // Columns the editor writes (everything else — status, signature,
  // tracking — is managed by the send flow or the client's page).
  var DEVIS_FIELDS=['client_id','client_name','client_company','client_email','client_phone','client_address','client_siret','client_vat','language','title','intro','issue_date','valid_until','items','discount_percent','vat_rate','vat_exempt','deposit_percent','payment_terms','notes','email_message','cover_page','reminders_enabled','reminder_days','attach_cgv','attach_portfolio','subtotal_ht','total_ht','total_vat','total_ttc'];
  var TEMPLATE_FIELDS=['language','title','intro','items','discount_percent','vat_rate','vat_exempt','deposit_percent','payment_terms','notes','cover_page','attach_cgv','attach_portfolio'];

  var devisList=[],factures=[],services=[],templates=[],settings={},appSettings={},clients=[],contacts=[];
  var loaded=false,loading=null,editing=null,pdfUrl=null,invoiceSource=null;
  var num=Core.num,round2=Core.round2,money=Core.money,percent=Core.percent,todayIso=Core.todayIso,addDays=Core.addDays,formatDate=Core.formatDate,formatDateTime=Core.formatDateTime,computeTotals=Core.computeTotals,autoLineTotal=Core.autoLineTotal,isSection=Core.isSection,isCounted=Core.isCounted;

  function $(selector,root){return(root||document).querySelector(selector);}
  var body=$('[data-devis-body]',view),emptyState=$('[data-devis-empty]',view),listMessage=$('[data-devis-message]',view),searchInput=$('[data-devis-search]',view),statusFilter=$('[data-devis-status-filter]',view);
  var factureBody=$('[data-facture-body]',view),factureEmpty=$('[data-facture-empty]',view),factureMessage=$('[data-facture-message]',view),factureSearch=$('[data-facture-search]',view),factureFilter=$('[data-facture-status-filter]',view);
  var dialog=$('[data-devis-dialog]'),form=$('[data-devis-form]'),formMessage=$('[data-devis-form-message]'),linesBox=$('[data-devis-lines]'),linesEmpty=$('[data-devis-lines-empty]'),summary=$('[data-devis-summary]'),servicePick=$('[data-devis-service-pick]'),sourceSelect=$('[data-devis-source]'),templateSelect=$('[data-devis-template]'),pdfPane=$('[data-devis-pdf-pane]'),pdfFrame=$('[data-devis-pdf-frame]');
  var factureDialog=$('[data-facture-dialog]'),factureForm=$('[data-facture-form]'),factureFormMessage=$('[data-facture-form-message]');
  var servicesDialog=$('[data-devis-services-dialog]'),servicesBody=$('[data-devis-services-body]'),servicesMessage=$('[data-devis-services-message]');
  var settingsDialog=$('[data-devis-settings-dialog]'),settingsForm=$('[data-devis-settings-form]'),settingsMessage=$('[data-devis-settings-message]');

  // ── Helpers ─────────────────────────────────────────────────────
  function message(element,text){if(element)element.textContent=text||'';}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];});}
  function getSession(){try{return JSON.parse(localStorage.getItem(sessionKey)||'null');}catch(error){return null;}}
  function isExpired(d){return d.status==='sent'&&d.valid_until&&d.valid_until<todayIso();}
  function isEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());}
  function uuid(){return(window.crypto&&crypto.randomUUID)?crypto.randomUUID():null;}
  function clientLabel(d){return Core.clientLabel(d)||'—';}
  function pick(source,keys){var out={};keys.forEach(function(k){if(source[k]!==undefined)out[k]=source[k];});return out;}
  function flash(element,text){element.style.color='#1a7f3c';message(element,text);setTimeout(function(){if(element.textContent===text)message(element,'');element.style.color='';},6000);}
  function companyName(){return appSettings.company_name||settings.legal_name||'SB Marketing';}
  function replyAddress(){return settings.email||appSettings.reply_to_email||'';}
  function pdfCtx(kind,extra){return Object.assign({settings:settings,brand:appSettings,kind:kind||'devis'},extra||{});}
  function closeMenus(except){document.querySelectorAll('.devis-menu[open]').forEach(function(menu){if(menu!==except)menu.open=false;});}

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
    if(!response.ok)throw new Error(result.error||(response.status===404?'The '+name+' function is not deployed yet.':'Request failed ('+response.status+')'));
    return result;
  }
  async function uploadAsset(file){
    var session=getSession(),safeName='devis-'+Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
    var response=await fetch(config.url+'/storage/v1/object/email-assets/'+encodeURIComponent(safeName),{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+(session?session.access_token:config.key),'Content-Type':file.type||'application/octet-stream'},body:file});
    if(!response.ok){var details=await response.json().catch(function(){return{};});throw new Error(details.message||'Upload failed');}
    return config.url+'/storage/v1/object/public/email-assets/'+safeName;
  }
  function setupHint(error){return /devis|factures|column/.test(error.message)?'Database update required. Run supabase/devis_schema.sql in the Supabase SQL Editor ('+error.message+').':error.message;}
  function sendErrorText(error){return error.message.indexOf('RESEND_API_KEY')>-1?'Email sending is not configured yet — set RESEND_API_KEY as an Edge Function secret in Supabase.':error.message;}

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
        request('/rest/v1/contact_submissions?select=id,created_at,full_name,company,email,phone,service,language&order=created_at.desc&limit=200').catch(function(){return [];}),
        request('/rest/v1/factures?select=*&order=created_at.desc'),
        request('/rest/v1/devis_templates?select=*&order=name.asc')
      ]);
      devisList=results[0]||[];services=results[1]||[];settings=(results[2]&&results[2][0])||{};appSettings=(results[3]&&results[3][0])||{};
      clients=results[4]||[];contacts=results[5]||[];factures=results[6]||[];templates=results[7]||[];
      loaded=true;
      renderList();renderFactures();renderServicePicker();renderSourceOptions();renderTemplateOptions();
      message(listMessage,'');
    }catch(error){message(listMessage,setupHint(error));}
  }
  function show(){if(!loaded&&!loading){loading=loadAll().finally(function(){loading=null;});}}
  function setSubtab(name){
    view.querySelectorAll('[data-devis-subtab]').forEach(function(b){b.classList.toggle('is-active',b.dataset.devisSubtab===name);});
    view.querySelectorAll('[data-devis-pane]').forEach(function(p){p.hidden=p.dataset.devisPane!==name;});
  }

  // ── Devis list ──────────────────────────────────────────────────
  function statusChips(d){
    var chips=[];
    if(isExpired(d))chips.push(['warn','Expired']);
    if(d.version>1)chips.push(['muted','v'+d.version]);
    if(d.status==='accepted'&&d.signed_at)chips.push(['ok','✍️ Signed by '+(d.signed_name||'client')+' · '+formatDateTime(d.signed_at,'en')]);
    if(d.status==='refused'&&d.refused_reason)chips.push(['no','“'+d.refused_reason.slice(0,60)+(d.refused_reason.length>60?'…':'')+'”']);
    if(d.first_viewed_at)chips.push(['','👁 Opened '+formatDateTime(d.last_viewed_at||d.first_viewed_at,'en')+(d.view_count>1?' ('+d.view_count+'×)':'')]);
    else if(d.status==='sent')chips.push(['muted','Not opened yet']);
    if(d.sent_at)chips.push(['muted','Sent '+formatDate(d.sent_at,'en')+(d.send_count>1?' ('+d.send_count+'×)':'')]);
    if(d.expiry_reminder_sent_at||d.reminder_sent_at)chips.push(['muted','⏰ Reminder sent']);
    var invoices=factures.filter(function(f){return f.devis_id===d.id&&f.status!=='cancelled';});
    if(invoices.length)chips.push(['ok','💶 '+invoices.map(function(f){return f.number;}).join(', ')]);
    return chips.map(function(c){return '<span class="devis-chip'+(c[0]?' devis-chip--'+c[0]:'')+'">'+escapeHtml(c[1])+'</span>';}).join('');
  }
  function exportMenuHtml(attr,id,withWhatsapp){
    return '<details class="devis-menu"><summary class="secondary">Export ▾</summary><div class="devis-menu__list">'
      +'<button type="button" '+attr+'="'+escapeHtml(id)+'" data-format="pdf">📄 PDF</button>'
      +'<button type="button" '+attr+'="'+escapeHtml(id)+'" data-format="png">🖼 Image PNG</button>'
      +'<button type="button" '+attr+'="'+escapeHtml(id)+'" data-format="jpeg">🖼 Image JPG</button>'
      +'<button type="button" '+attr+'="'+escapeHtml(id)+'" data-format="stacked">🧷 All pages in one image</button>'
      +(withWhatsapp?'<hr><button type="button" data-devis-wa="'+escapeHtml(id)+'">💬 Send on WhatsApp</button>':'')
      +'</div></details>';
  }
  function renderList(){
    var term=searchInput.value.trim().toLowerCase(),status=statusFilter.value;
    var rows=devisList.filter(function(d){
      var searchable=[d.number,d.client_name,d.client_company,d.client_email,d.title].join(' ').toLowerCase();
      var match=!status?d.status!=='superseded'
        :status==='expired'?isExpired(d)
        :status==='viewed'?(d.status==='sent'&&!!d.first_viewed_at)
        :d.status===status;
      return(!term||searchable.indexOf(term)>-1)&&match;
    });
    body.innerHTML=rows.map(function(d){
      var lang=d.language||'fr',lineCount=(d.items||[]).filter(function(i){return !isSection(i);}).length;
      var canInvoice=d.status==='accepted',canClient=d.status==='accepted'&&!d.client_id;
      return '<tr>'
        +'<td class="devis-number-cell">'+escapeHtml(d.number)+'</td>'
        +'<td>'+escapeHtml(formatDate(d.issue_date,'en'))+'<span class="muted-note">valid until '+escapeHtml(formatDate(d.valid_until,'en'))+'</span></td>'
        +'<td class="contact"><strong>'+escapeHtml(clientLabel(d))+'</strong>'+(d.client_company&&d.client_name?'<span class="muted-note">'+escapeHtml(d.client_name)+'</span>':'')+(d.client_email?'<a href="mailto:'+escapeHtml(d.client_email)+'">'+escapeHtml(d.client_email)+'</a>':'')+'</td>'
        +'<td>'+escapeHtml(d.title||'—')+'<span class="muted-note">'+lineCount+' line'+(lineCount===1?'':'s')+'</span></td>'
        +'<td><span class="devis-total">'+escapeHtml(money(d.total_ttc,lang))+'</span><span class="muted-note">'+escapeHtml(money(d.total_ht,lang))+' HT</span></td>'
        +'<td><select class="status-select" data-devis-status="'+escapeHtml(d.id)+'">'+Object.keys(STATUS_LABELS).map(function(key){return '<option value="'+key+'"'+(d.status===key?' selected':'')+'>'+STATUS_LABELS[key]+'</option>';}).join('')+'</select>'+statusChips(d)+'</td>'
        +'<td><div class="devis-row-actions">'
          +'<button type="button" class="secondary" data-devis-edit="'+escapeHtml(d.id)+'">Edit</button>'
          +exportMenuHtml('data-devis-export',d.id,true)
          +'<button type="button" class="secondary" data-devis-quick-send="'+escapeHtml(d.id)+'">'+(d.sent_at?'Resend':'Send')+'</button>'
          +'<details class="devis-menu"><summary class="secondary">More ▾</summary><div class="devis-menu__list">'
            +'<button type="button" data-devis-copy-link="'+escapeHtml(d.id)+'">🔗 Copy client link</button>'
            +'<button type="button" data-devis-open-link="'+escapeHtml(d.id)+'">↗ Open client page</button>'
            +(canInvoice?'<button type="button" data-devis-invoice="'+escapeHtml(d.id)+'">💶 Create invoice</button>':'')
            +(canClient?'<button type="button" data-devis-make-client="'+escapeHtml(d.id)+'">➕ Add to Clients</button>':'')
            +'<button type="button" data-devis-version="'+escapeHtml(d.id)+'">🆕 New version</button>'
            +'<button type="button" data-devis-duplicate="'+escapeHtml(d.id)+'">📋 Duplicate</button>'
            +'<hr><button type="button" class="is-danger" data-devis-delete="'+escapeHtml(d.id)+'">🗑 Delete</button>'
          +'</div></details>'
        +'</div></td></tr>';
    }).join('');
    emptyState.hidden=rows.length!==0;
    renderStats();
  }
  function renderStats(){
    var live=devisList.filter(function(d){return d.status!=='superseded';});
    var decided=live.filter(function(d){return d.status==='accepted'||d.status==='refused';});
    var accepted=live.filter(function(d){return d.status==='accepted';});
    var sentOnce=live.filter(function(d){return d.sent_at;});
    var month=todayIso().slice(0,7);
    var signedMonth=accepted.filter(function(d){return String(d.responded_at||d.signed_at||'').slice(0,7)===month;}).reduce(function(s,d){return s+num(d.total_ht);},0);
    var pipeline=live.filter(function(d){return d.status==='sent'&&!isExpired(d);});
    $('[data-devis-stat-total]',view).textContent=live.length;
    $('[data-devis-stat-pending]',view).textContent=pipeline.length;
    $('[data-devis-stat-rate]',view).textContent=decided.length?Math.round(accepted.length/decided.length*100)+' %':'—';
    $('[data-devis-stat-month]',view).textContent=money(signedMonth,'fr').replace(/,00 €$/,' €');
    var nonDraft=live.filter(function(d){return d.status!=='draft';});
    var avg=nonDraft.length?nonDraft.reduce(function(s,d){return s+num(d.total_ttc);},0)/nonDraft.length:0;
    var opened=sentOnce.filter(function(d){return d.first_viewed_at;}).length;
    var counts={};
    nonDraft.forEach(function(d){(d.items||[]).forEach(function(i){if(!isSection(i)&&i.name){var key=i.name.trim();counts[key]=(counts[key]||0)+1;}});});
    var top=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];}).slice(0,5);
    $('[data-devis-insights]',view).innerHTML=
      '<article>Average devis (TTC)<strong>'+escapeHtml(money(avg,'fr').replace(/,00 €$/,' €'))+'</strong></article>'
      +'<article>Open rate<strong>'+(sentOnce.length?Math.round(opened/sentOnce.length*100)+' %':'—')+'</strong></article>'
      +'<article class="is-wide">Most quoted services'+(top.length?'<ol>'+top.map(function(n){return '<li>'+escapeHtml(n)+' <span class="muted-note" style="display:inline">('+counts[n]+')</span></li>';}).join('')+'</ol>':'<strong>—</strong>')+'</article>';
  }
  function findDevis(id){return devisList.find(function(d){return d.id===id;});}
  function upsertLocal(row){var index=devisList.findIndex(function(d){return d.id===row.id;});if(index>-1)devisList[index]=row;else devisList.unshift(row);renderList();}

  async function updateStatus(id,status,select){
    select.disabled=true;
    var patch={status:status,responded_at:(status==='accepted'||status==='refused')?new Date().toISOString():null,updated_at:new Date().toISOString()};
    try{
      await jsonRequest('/rest/v1/devis?id=eq.'+encodeURIComponent(id),'PATCH',patch);
      var d=findDevis(id);if(d)Object.assign(d,patch);renderList();
      if(d&&status==='accepted'&&!d.client_id&&isEmail(d.client_email)&&!clients.some(function(c){return(c.email||'').toLowerCase()===d.client_email.toLowerCase();})&&confirm(clientLabel(d)+' accepted. Add them to your Clients list (for monthly reports)?'))await makeClient(d);
    }
    catch(error){message(listMessage,error.message);}
    finally{select.disabled=false;}
  }
  async function deleteDevis(id){
    var d=findDevis(id);if(!d)return;
    if(factures.some(function(f){return f.devis_id===id;})){message(listMessage,'This devis has invoices — it can’t be deleted (mark it refused or replaced instead).');return;}
    if(!confirm('Delete devis '+d.number+'? This cannot be undone.'))return;
    try{await request('/rest/v1/devis?id=eq.'+encodeURIComponent(id),{method:'DELETE'});devisList=devisList.filter(function(x){return x.id!==id;});renderList();}
    catch(error){message(listMessage,error.message);}
  }

  // ── Numbering: PREFIX-YEAR-001, per calendar year ───────────────
  function nextNumber(list,prefix){
    var base=String(prefix).trim()+'-'+new Date().getFullYear()+'-',max=0;
    list.forEach(function(d){if(d.number&&d.number.indexOf(base)===0){var n=parseInt(d.number.slice(base.length),10);if(n>max)max=n;}});
    return base+String(max+1).padStart(3,'0');
  }
  function nextDevisNumber(){return nextNumber(devisList,settings.number_prefix||'DEV');}
  function nextFactureNumber(){return nextNumber(factures,settings.invoice_prefix||'FAC');}

  // ── Editor: lines ───────────────────────────────────────────────
  function unitOptions(selected){
    var units=UNITS.slice();if(selected&&units.indexOf(selected)===-1)units.push(selected);
    return units.map(function(u){return '<option value="'+escapeHtml(u)+'"'+(u===selected?' selected':'')+'>'+escapeHtml(u)+'</option>';}).join('');
  }
  var TOOLS='<div class="devis-line__tools"><button type="button" class="icon-button" data-line-up aria-label="Move up">↑</button><button type="button" class="icon-button" data-line-remove aria-label="Remove line">✕</button></div>';
  function addSection(name){
    var row=document.createElement('div');row.className='devis-line devis-line--section';row.dataset.type='section';
    row.innerHTML='<div class="devis-line__main"><label>Section<input data-f="name" value="'+escapeHtml(name||'')+'" placeholder="Ex. Site web, Réseaux sociaux, Publicité…"></label>'+TOOLS+'</div>';
    linesBox.appendChild(row);return row;
  }
  function addLine(item){
    item=item||{};
    if(isSection(item))return addSection(item.name);
    var row=document.createElement('div');row.className='devis-line'+(item.optional?' is-option':'');row.dataset.type='item';
    var manual=item.total!=null&&item.total!==''&&Math.abs(num(item.total)-autoLineTotal(item))>0.004;
    row.dataset.manual=manual?'1':'';
    row.innerHTML='<div class="devis-line__main">'
      +'<label>Désignation<input data-f="name" value="'+escapeHtml(item.name||'')+'" placeholder="Ex. Création du site vitrine"></label>'
      +'<label>Qty<input data-f="quantity" type="number" min="0" step="any" value="'+escapeHtml(item.quantity==null?'':item.quantity)+'" placeholder="1"></label>'
      +'<label>Unit<select data-f="unit">'+unitOptions(item.unit||'forfait')+'</select></label>'
      +'<label>Unit price HT<input data-f="unit_price" type="number" step="0.01" value="'+escapeHtml(item.unit_price==null?'':item.unit_price)+'" placeholder="0,00"></label>'
      +'<label>Total HT<input data-f="total" type="number" step="0.01" value="'+escapeHtml(manual?item.total:'')+'" placeholder="0,00" title="Filled from qty × price — type to set your own"></label>'
      +TOOLS+'</div>'
      +'<textarea data-f="description" rows="2" placeholder="Description shown under the line (optional)">'+escapeHtml(item.description||'')+'</textarea>'
      +'<div class="devis-line__flags">'
        +'<label class="checkbox-field"><input type="checkbox" data-f="optional"'+(item.optional?' checked':'')+'> Option (client can add it)</label>'
        +'<label class="checkbox-field"><input type="checkbox" data-f="monthly"'+(item.billing==='monthly'?' checked':'')+'> Monthly</label>'
        +'<label class="inline">Line discount %<input data-f="discount_percent" type="number" min="0" max="100" step="0.5" value="'+escapeHtml(num(item.discount_percent)?item.discount_percent:'')+'" placeholder="0"></label>'
      +'</div>';
    linesBox.appendChild(row);
    return row;
  }
  function readLines(){
    return Array.from(linesBox.querySelectorAll('.devis-line')).map(function(row){
      function f(name){return row.querySelector('[data-f="'+name+'"]');}
      if(row.dataset.type==='section')return{type:'section',name:f('name').value.trim()};
      var item={type:'item',name:f('name').value.trim(),description:f('description').value.trim(),
        quantity:f('quantity').value===''?null:num(f('quantity').value),unit:f('unit').value,
        unit_price:f('unit_price').value===''?null:round2(num(f('unit_price').value)),
        discount_percent:Math.min(100,Math.max(0,num(f('discount_percent').value))),
        optional:f('optional').checked,selected:false,billing:f('monthly').checked?'monthly':'once'};
      item.total=row.dataset.manual&&f('total').value!==''?round2(num(f('total').value)):autoLineTotal(item);
      return item;
    }).filter(function(item){return isSection(item)?!!item.name:(item.name||item.description||item.unit_price||item.total);});
  }
  function renderServicePicker(){
    var groups={};
    services.filter(function(s){return s.active!==false;}).forEach(function(s){(groups[s.category||'Autre']=groups[s.category||'Autre']||[]).push(s);});
    servicePick.innerHTML='<option value="">…or pick from the catalog</option>'+Object.keys(groups).map(function(category){
      return '<optgroup label="'+escapeHtml(category)+'">'+groups[category].map(function(s){return '<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.name)+' — '+escapeHtml(money(s.unit_price,'fr'))+' / '+escapeHtml(s.unit)+'</option>';}).join('')+'</optgroup>';
    }).join('');
  }
  function renderTemplateOptions(){
    templateSelect.innerHTML='<option value="">Start from scratch…</option>'+templates.map(function(t){return '<option value="'+escapeHtml(t.id)+'">'+escapeHtml(t.name)+'</option>';}).join('');
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
      email_message:el.email_message.dataset.edited?el.email_message.value.trim()||null:null,
      cover_page:el.cover_page.checked,reminders_enabled:el.reminders_enabled.checked,reminder_days:el.reminder_days.value?Math.max(1,Math.round(num(el.reminder_days.value))):null,
      attach_cgv:el.attach_cgv.checked,attach_portfolio:el.attach_portfolio.checked
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
    el.cover_page.checked=!!d.cover_page;el.reminders_enabled.checked=d.reminders_enabled!==false;el.reminder_days.value=d.reminder_days||'';el.reminder_days.placeholder=String(settings.reminder_days||5);
    el.attach_cgv.checked=!!d.attach_cgv;el.attach_portfolio.checked=!!d.attach_portfolio;
    form.dataset.clientId=d.client_id||'';
    linesBox.innerHTML='';(d.items||[]).forEach(addLine);
    // A saved message counts as "edited" so reopening never overwrites it.
    el.email_message.value=d.email_message||'';el.email_message.dataset.edited=d.email_message?'1':'';
    el.email_subject.value='';el.email_subject.dataset.edited='';
  }
  function emptyDevis(){
    var exempt=!!settings.vat_exempt;
    return{language:'fr',issue_date:todayIso(),valid_until:addDays(todayIso(),num(settings.validity_days)||30),items:[],discount_percent:0,vat_exempt:exempt,vat_rate:exempt?0:(settings.default_vat_rate==null?20:num(settings.default_vat_rate)),deposit_percent:num(settings.default_deposit_percent),payment_terms:settings.default_payment_terms||'',notes:settings.default_notes||'',cover_page:!!settings.default_cover_page,attach_cgv:!!settings.default_attach_cgv&&!!settings.cgv_url,attach_portfolio:false,reminders_enabled:true};
  }

  // ── Email text (auto-written until the admin edits it) ─────────────
  function defaultSubject(d,number){return d.language==='en'?'Your quote '+number+' — '+companyName():'Votre devis '+number+' — '+companyName();}
  function defaultMessage(d,number){
    var t=computeTotals(d),lang=d.language,valid=formatDate(d.valid_until,lang);
    if(lang==='en'){
      return ['Please find attached our quote no. '+number+(d.title?' for “'+d.title+'”':'')+'.',
        'Total: '+money(t.ttc,lang)+(d.vat_exempt?' (VAT not applicable)':' incl. VAT ('+money(t.totalHt,lang)+' excl. VAT)')+'.'+(t.monthlyTotal?'\nIncluding '+money(t.monthlyPerMonth,lang)+' excl. VAT per month.':'')+(t.deposit?'\nA '+percent(d.deposit_percent,lang)+' deposit ('+money(t.deposit,lang)+') is due on signature.':'')+(valid?'\nThis quote is valid until '+valid+'.':''),
        'You can review it'+(t.options?', choose the options':'')+' and sign it online in one click with the button below. We’re happy to answer any question or adjust anything.',
        'Speak soon,\nThe '+companyName()+' team'].join('\n\n');
    }
    return ['Veuillez trouver ci-joint notre devis n° '+number+(d.title?' pour « '+d.title+' »':'')+'.',
      'Montant total : '+money(t.ttc,lang)+(d.vat_exempt?' (TVA non applicable)':' TTC ('+money(t.totalHt,lang)+' HT)')+'.'+(t.monthlyTotal?'\nDont '+money(t.monthlyPerMonth,lang)+' HT par mois.':'')+(t.deposit?'\nUn acompte de '+percent(d.deposit_percent,lang)+' ('+money(t.deposit,lang)+') est demandé à la signature.':'')+(valid?'\nCe devis est valable jusqu’au '+valid+'.':''),
      'Vous pouvez le consulter'+(t.options?', choisir les options':'')+' et le signer en ligne en un clic grâce au bouton ci-dessous. Nous restons à votre disposition pour toute question ou ajustement.',
      'À très bientôt,\nL’équipe '+companyName()].join('\n\n');
  }
  function currentNumber(){return editing&&editing.number?editing.number:nextDevisNumber();}

  function refreshEditor(){
    var d=readForm(),t=computeTotals(d),lang=d.language;
    linesBox.querySelectorAll('.devis-line[data-type="item"]').forEach(function(row){
      row.classList.toggle('is-option',row.querySelector('[data-f="optional"]').checked);
      if(row.dataset.manual)return;
      var get=function(n){return row.querySelector('[data-f="'+n+'"]').value;};
      row.querySelector('[data-f="total"]').value=get('unit_price')===''?'':autoLineTotal({quantity:get('quantity'),unit_price:get('unit_price'),discount_percent:get('discount_percent')}).toFixed(2);
    });
    linesEmpty.hidden=linesBox.children.length>0;
    var rows=[['Subtotal HT',money(t.subtotal,lang)]];
    if(t.discount)rows.push(['Discount ('+percent(d.discount_percent,lang)+')','− '+money(t.discount,lang)],['Total HT',money(t.totalHt,lang)]);
    rows.push([d.vat_exempt?'VAT (not applicable)':'VAT ('+percent(d.vat_rate,lang)+')',money(t.vat,lang)]);
    summary.innerHTML=rows.map(function(r){return '<dt>'+escapeHtml(r[0])+'</dt><dd>'+escapeHtml(r[1])+'</dd>';}).join('')
      +'<dt class="is-total">'+(d.vat_exempt?'Total':'Total TTC')+'</dt><dd class="is-total">'+escapeHtml(money(t.ttc,lang))+'</dd>'
      +(t.deposit?'<dt>Deposit on signature ('+escapeHtml(percent(d.deposit_percent,lang))+')</dt><dd>'+escapeHtml(money(t.deposit,lang))+'</dd>':'')
      +(t.monthlyTotal?'<dt>One-off + monthly</dt><dd>'+escapeHtml(money(t.once,lang)+' + '+money(t.monthlyPerMonth,lang)+' / mois')+' HT</dd>':'')
      +(t.options?'<dt>Options (not counted)</dt><dd>'+escapeHtml(money(t.options,lang))+' HT</dd>':'');
    var number=currentNumber(),el=form.elements;
    if(!el.email_message.dataset.edited)el.email_message.value=defaultMessage(d,number);
    if(!el.email_subject.dataset.edited)el.email_subject.value=defaultSubject(d,number);
    $('[data-attach-cgv-row]').hidden=!settings.cgv_url;
    $('[data-attach-portfolio-row]').hidden=!settings.portfolio_pdf_url;
  }

  function openEditor(d,isCopy){
    if(!loaded){message(listMessage,'Still loading — try again in a moment.');return;}
    editing=(d&&!isCopy)?d:null;
    var data=d?Object.assign({},d):emptyDevis();
    if(isCopy){data.issue_date=todayIso();data.valid_until=addDays(todayIso(),num(settings.validity_days)||30);data.email_message=null;data.items=(data.items||[]).map(function(i){return Object.assign({},i,{selected:false});});}
    form.reset();fillForm(data);sourceSelect.value='';templateSelect.value='';
    templateSelect.hidden=!!editing;
    $('[data-devis-dialog-title]').textContent=editing?'Edit devis':(isCopy?'Duplicate devis':'New devis');
    $('[data-devis-number]').textContent=editing?editing.number+' · '+STATUS_LABELS[editing.status]:nextDevisNumber()+' (assigned on save)';
    closePdfPreview();message(formMessage,'');
    if(editing&&editing.status==='accepted')message(formMessage,'This devis was accepted'+(editing.signed_at?' and signed online':'')+' — changing it now changes a signed document. Prefer “New version”.');
    refreshEditor();
    dialog.showModal();
  }

  // ── Save / send ─────────────────────────────────────────────────
  async function saveDevis(){
    var d=pick(readForm(),DEVIS_FIELDS),now=new Date().toISOString();
    if(editing&&editing.id){
      d.updated_at=now;
      var rows=await jsonRequest('/rest/v1/devis?id=eq.'+encodeURIComponent(editing.id),'PATCH',d,true);
      editing=rows[0];
    }else{
      if(editing&&editing.parent_id){d.parent_id=editing.parent_id;d.version=editing.version;}
      for(var attempt=0;;attempt++){
        d.number=editing&&editing.number?editing.number:nextDevisNumber();
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
  function validateForPdf(d){
    if(!d.items.some(function(i){return !isSection(i);}))return 'Add at least one désignation.';
    if(d.items.some(function(i){return !isSection(i)&&!i.name;}))return 'Every line needs a désignation.';
    return '';
  }
  function validateForSend(d){
    if(!isEmail(d.client_email))return 'Add a valid client email to send the devis.';
    if(!d.client_name&&!d.client_company)return 'Add the client’s name or company.';
    return validateForPdf(d);
  }
  function acceptMailto(d){
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
  function extraAttachments(d){
    var files=[],en=d.language==='en',name=Core.plainSpaces(companyName()).replace(/\s+/g,'-');
    if(d.attach_cgv&&settings.cgv_url)files.push({filename:(en?'Terms-':'CGV-')+name+'.pdf',url:settings.cgv_url});
    if(d.attach_portfolio&&settings.portfolio_pdf_url)files.push({filename:'Portfolio-'+name+'.pdf',url:settings.portfolio_pdf_url});
    return files;
  }
  async function logClientEmail(clientId,emailId,subject,text,html){
    if(!clientId)return;
    var entry={client_id:clientId,type:'custom',subject:subject,body:text,sent_at:new Date().toISOString(),rendered_html:html||null};
    if(emailId)entry.id=emailId;
    // History is a nice-to-have — never report a sent document as failed because of it.
    await jsonRequest('/rest/v1/client_emails','POST',entry).catch(function(){});
  }
  // When a later version goes out, the earlier ones are marked replaced
  // (their client page then points to the new one).
  async function supersedeOlderVersions(d){
    if(!d.parent_id)return;
    var root=d.parent_id;
    await jsonRequest('/rest/v1/devis?or=(id.eq.'+root+',parent_id.eq.'+root+')&id=neq.'+d.id+'&status=in.(draft,sent)','PATCH',{status:'superseded',updated_at:new Date().toISOString()});
    devisList.forEach(function(x){if(x.id!==d.id&&(x.id===root||x.parent_id===root)&&(x.status==='draft'||x.status==='sent'))x.status='superseded';});
  }
  async function markSent(d,extra){
    var now=new Date().toISOString();
    var patch=Object.assign({status:d.status==='accepted'?'accepted':'sent',sent_at:now,send_count:(d.send_count||0)+1,updated_at:now},extra||{});
    await jsonRequest('/rest/v1/devis?id=eq.'+encodeURIComponent(d.id),'PATCH',patch);
    Object.assign(d,patch);
    await supersedeOlderVersions(d);
    upsertLocal(d);
  }

  // Sends an already-saved devis row: builds the PDF, emails it with the
  // online link, then marks the row sent and logs the email in history.
  async function sendSaved(d,subject,text){
    var asSent=Object.assign({},d,{status:d.status==='accepted'?'accepted':'sent'});
    var pdf=await Core.buildPdf(asSent,pdfCtx('devis')),emailId=d.client_id?uuid():null,en=d.language==='en',link=Core.publicUrl(d);
    var result=await invokeFunction('send-devis',{
      to:d.client_email,business_name:d.client_company||d.client_name,contact_name:d.client_name||undefined,language:d.language,
      subject:subject,body:text,
      cta_label:link?(en?'✅ View & sign online':'✅ Voir et signer en ligne'):(en?'✅ Accept the quote':'✅ Accepter le devis'),
      cta_url:link||acceptMailto(d)||undefined,
      branding:brandingPayload(),reply_to:replyAddress()||undefined,
      view_online_url:emailId?'https://www.sbmarketing.fr/view-email/?id='+emailId:undefined,
      pdf_base64:pdf.output('datauristring').split(',')[1],filename:Core.fileBase(d,'devis')+'.pdf',
      extra_attachments:extraAttachments(d)
    });
    await markSent(d,{email_message:text});
    await logClientEmail(d.client_id,emailId,subject,text,result.html);
    return d;
  }

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
      flash(listMessage,'Devis '+saved.number+' sent to '+saved.client_email+'.');
    }catch(error){message(formMessage,sendErrorText(error));}
    finally{button.disabled=false;}
  }
  async function onSaveDraft(){
    var problem=validateForPdf(readForm());if(problem&&!confirm(problem+' Save anyway?'))return;
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
    try{await sendSaved(d,defaultSubject(d,d.number),d.email_message||defaultMessage(d,d.number));flash(listMessage,'Devis '+d.number+' sent to '+d.client_email+'.');}
    catch(error){message(listMessage,sendErrorText(error));}
  }

  // ── Export (PDF / PNG / JPG / one image) and WhatsApp ───────────────
  function editorSnapshot(){var d=Object.assign({},editing||{},readForm());d.number=currentNumber();return d;}
  function closePdfPreview(){pdfPane.hidden=true;if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}pdfFrame.removeAttribute('src');}
  async function previewPdf(){
    var d=editorSnapshot(),problem=validateForPdf(d);if(problem){message(formMessage,problem);return;}
    message(formMessage,'Generating PDF…');
    try{var doc=await Core.buildPdf(d,pdfCtx('devis'));closePdfPreview();pdfUrl=URL.createObjectURL(doc.output('blob'));pdfFrame.src=pdfUrl;pdfPane.hidden=false;message(formMessage,'');pdfPane.scrollIntoView({behavior:'smooth',block:'nearest'});}
    catch(error){message(formMessage,error.message);}
  }
  async function exportDevis(d,format,messageEl){
    var problem=validateForPdf(d);if(problem){message(messageEl,problem);return;}
    message(messageEl,format==='pdf'?'Generating PDF…':'Generating image…');
    try{await Core.exportDoc(await Core.buildPdf(d,pdfCtx('devis')),Core.fileBase(d,'devis'),format);message(messageEl,'');}
    catch(error){message(messageEl,error.message);}
  }
  function whatsappText(d){
    var t=computeTotals(d),en=d.language==='en',link=Core.publicUrl(d),name=d.client_name||d.client_company||'';
    return en
      ?'Hello'+(name?' '+name:'')+', here is our quote '+d.number+(d.title?' for “'+d.title+'”':'')+': '+money(t.ttc,'en')+(d.vat_exempt?'':' incl. VAT')+'.'+(link?'\nYou can view and sign it online here: '+link:'')+'\n'+companyName()
      :'Bonjour'+(name?' '+name:'')+', voici notre devis '+d.number+(d.title?' pour « '+d.title+' »':'')+' : '+money(t.ttc,'fr')+(d.vat_exempt?'':' TTC')+'.'+(link?'\nVous pouvez le consulter et le signer en ligne ici : '+link:'')+'\n'+companyName();
  }
  // On phones the image goes straight into WhatsApp through the share
  // sheet; on desktop it's downloaded and WhatsApp Web opens with the text.
  async function shareWhatsapp(d,messageEl){
    var problem=validateForPdf(d);if(problem){message(messageEl,problem);return;}
    var probe=typeof File==='function'?new File([''],'x.png',{type:'image/png'}):null;
    var canShareFiles=!!(probe&&navigator.canShare&&navigator.canShare({files:[probe]}));
    var digits=Core.whatsappDigits(d.client_phone),win=canShareFiles?null:window.open('about:blank','_blank');
    message(messageEl,'Preparing the image…');
    try{
      var blobs=await Core.renderImages(await Core.buildPdf(Object.assign({},d,{status:d.status==='draft'?'sent':d.status}),pdfCtx('devis')),{format:'png',stacked:true});
      var filename=Core.fileBase(d,'devis')+'.png',text=whatsappText(d);
      if(canShareFiles){await navigator.share({files:[new File([blobs[0]],filename,{type:'image/png'})],text:text});}
      else{Core.downloadBlob(blobs[0],filename);var url='https://wa.me/'+digits+'?text='+encodeURIComponent(text);if(win)win.location.href=url;else window.open(url,'_blank');}
      // Sharing counts as sending: the online link only works once it's sent.
      if(d.id&&d.status==='draft')await markSent(d);
      message(messageEl,canShareFiles?'':'Image downloaded — attach it in the WhatsApp chat that just opened.');
    }catch(error){if(win)win.close();if(error&&error.name==='AbortError'){message(messageEl,'');return;}message(messageEl,error.message);}
  }
  async function editorWhatsapp(){
    var problem=validateForPdf(readForm());if(problem){message(formMessage,problem);return;}
    try{message(formMessage,'Saving…');var saved=await saveDevis();await shareWhatsapp(saved,formMessage);}
    catch(error){message(formMessage,error.message);}
  }
  async function copyLink(d){
    if(d.status==='draft'){message(listMessage,'Drafts aren’t visible online — send it (email or WhatsApp) first.');return;}
    var link=Core.publicUrl(d);if(!link){message(listMessage,setupHint(new Error('public_token column missing')));return;}
    try{await navigator.clipboard.writeText(link);flash(listMessage,'Client link for '+d.number+' copied.');}
    catch(error){prompt('Client link:',link);}
  }

  // ── Templates ───────────────────────────────────────────────────
  async function saveTemplate(){
    var d=readForm();if(!d.items.length){message(formMessage,'Add some lines before saving a template.');return;}
    var name=prompt('Template name (e.g. Pack boucherie)?',d.title||'');if(!name)return;
    try{
      var rows=await jsonRequest('/rest/v1/devis_templates','POST',{name:name.trim(),payload:pick(d,TEMPLATE_FIELDS)},true);
      templates.push(rows[0]);templates.sort(function(a,b){return a.name.localeCompare(b.name);});renderTemplateOptions();
      flash(formMessage,'Template “'+name+'” saved.');
    }catch(error){message(formMessage,setupHint(error));}
  }
  function applyTemplate(id){
    var tpl=templates.find(function(t){return t.id===id;});if(!tpl)return;
    var current=readForm(),p=tpl.payload||{};
    fillForm(Object.assign({},current,p,{items:(p.items||[]).map(function(i){return Object.assign({},i);}),email_message:null}));
    refreshEditor();
  }

  // ── Versions ────────────────────────────────────────────────────
  function newVersion(d){
    var root=d.parent_id||d.id,family=devisList.filter(function(x){return x.id===root||x.parent_id===root;});
    var version=family.reduce(function(m,x){return Math.max(m,x.version||1);},1)+1;
    var rootRow=findDevis(root)||d;
    var number=String(rootRow.number).replace(/-v\d+$/,'')+'-v'+version;
    openEditor(Object.assign({},d,{email_message:null}),true);
    // Not saved yet: saveDevis() creates it with this number / parent.
    editing={parent_id:root,version:version,number:number,status:'draft'};
    $('[data-devis-dialog-title]').textContent='New version (v'+version+')';
    $('[data-devis-number]').textContent=number+' · the earlier version is marked “replaced” when you send this one';
    refreshEditor();
  }

  // ── Clients link ────────────────────────────────────────────────
  async function makeClient(d){
    var digits=Core.whatsappDigits(d.client_phone);
    var payload={business_name:d.client_company||d.client_name||d.client_email,contact_name:d.client_name||null,email:d.client_email,language:d.language==='en'?'en':'fr',notes:'Devis '+d.number+' accepté',whatsapp_number:digits?'+'+digits:null};
    try{
      var rows=await jsonRequest('/rest/v1/clients','POST',payload,true),client=rows[0];
      clients.push(client);renderSourceOptions();
      await jsonRequest('/rest/v1/devis?id=eq.'+encodeURIComponent(d.id),'PATCH',{client_id:client.id});
      d.client_id=client.id;renderList();
      flash(listMessage,clientLabel(d)+' added to Clients — open the Clients tab to set their tracked metrics.');
    }catch(error){message(listMessage,error.message);}
  }

  // ── Factures ────────────────────────────────────────────────────
  function isOverdue(f){return f.status==='unpaid'&&f.due_date&&f.due_date<todayIso();}
  function findFacture(id){return factures.find(function(f){return f.id===id;});}
  function devisNumberFor(f){var d=findDevis(f.devis_id);return d?d.number:'';}
  function renderFactures(){
    var term=factureSearch.value.trim().toLowerCase(),status=factureFilter.value;
    var rows=factures.filter(function(f){
      var searchable=[f.number,f.client_name,f.client_company,f.client_email,f.title,devisNumberFor(f)].join(' ').toLowerCase();
      var match=!status||(status==='overdue'?isOverdue(f):f.status===status);
      return(!term||searchable.indexOf(term)>-1)&&match;
    });
    factureBody.innerHTML=rows.map(function(f){
      var lang=f.language||'fr';
      return '<tr>'
        +'<td class="devis-number-cell">'+escapeHtml(f.number)+(devisNumberFor(f)?'<span class="muted-note">'+escapeHtml(devisNumberFor(f))+'</span>':'')+'</td>'
        +'<td>'+escapeHtml(formatDate(f.issue_date,'en'))+'</td>'
        +'<td class="contact"><strong>'+escapeHtml(clientLabel(f))+'</strong>'+(f.client_email?'<a href="mailto:'+escapeHtml(f.client_email)+'">'+escapeHtml(f.client_email)+'</a>':'')+'</td>'
        +'<td>'+escapeHtml(FACTURE_KIND[f.kind]||f.kind)+'</td>'
        +'<td><span class="devis-total">'+escapeHtml(money(f.amount_due,lang))+'</span><span class="muted-note">'+escapeHtml(money(f.total_ht,lang))+' HT'+(num(f.deposit_deducted)?' · deposit −'+escapeHtml(money(f.deposit_deducted,lang)):'')+'</span></td>'
        +'<td>'+escapeHtml(formatDate(f.due_date,'en'))+(isOverdue(f)?'<span class="devis-chip devis-chip--no">Overdue</span>':'')+'</td>'
        +'<td><select class="status-select" data-facture-status="'+escapeHtml(f.id)+'">'+Object.keys(FACTURE_STATUS).map(function(k){return '<option value="'+k+'"'+(f.status===k?' selected':'')+'>'+FACTURE_STATUS[k]+'</option>';}).join('')+'</select>'
          +(f.paid_at?'<span class="devis-chip devis-chip--ok">Paid '+escapeHtml(formatDate(f.paid_at,'en'))+'</span>':'')
          +(f.sent_at?'<span class="devis-chip devis-chip--muted">Sent '+escapeHtml(formatDate(f.sent_at,'en'))+'</span>':'')+'</td>'
        +'<td><div class="devis-row-actions">'+exportMenuHtml('data-facture-export',f.id,false)
          +'<button type="button" class="secondary" data-facture-send="'+escapeHtml(f.id)+'">'+(f.sent_at?'Resend':'Send')+'</button></div></td>'
        +'</tr>';
    }).join('');
    factureEmpty.hidden=rows.length!==0;
    var month=todayIso().slice(0,7),year=todayIso().slice(0,4),live=factures.filter(function(f){return f.status!=='cancelled';});
    $('[data-facture-stat-due]',view).textContent=money(live.filter(function(f){return f.status==='unpaid';}).reduce(function(s,f){return s+num(f.amount_due);},0),'fr');
    $('[data-facture-stat-overdue]',view).textContent=live.filter(isOverdue).length;
    $('[data-facture-stat-paid]',view).textContent=money(live.filter(function(f){return f.status==='paid'&&String(f.paid_at||'').slice(0,7)===month;}).reduce(function(s,f){return s+num(f.amount_due);},0),'fr');
    $('[data-facture-stat-year]',view).textContent=money(live.filter(function(f){return String(f.issue_date).slice(0,4)===year;}).reduce(function(s,f){return s+num(f.amount_due);},0),'fr');
  }
  async function updateFactureStatus(id,status,select){
    var f=findFacture(id);if(!f)return;
    if(status==='cancelled'&&!confirm('Cancel invoice '+f.number+'? It stays in the list (numbering must stay continuous) but no longer counts.')){select.value=f.status;return;}
    select.disabled=true;
    var patch={status:status,paid_at:status==='paid'?(f.paid_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};
    try{await jsonRequest('/rest/v1/factures?id=eq.'+encodeURIComponent(id),'PATCH',patch);Object.assign(f,patch);renderFactures();renderList();}
    catch(error){message(factureMessage,error.message);select.value=f.status;}
    finally{select.disabled=false;}
  }
  function activeInvoices(d){return factures.filter(function(f){return f.devis_id===d.id&&f.status!=='cancelled';});}
  function invoiceOptions(d){
    var t=computeTotals(d),active=activeInvoices(d);
    var hasDeposit=active.some(function(f){return f.kind==='deposit';}),hasFinal=active.some(function(f){return f.kind==='balance'||f.kind==='full';});
    var deducted=active.filter(function(f){return f.kind==='deposit';}).reduce(function(s,f){return s+num(f.total_ttc);},0);
    return[
      {kind:'deposit',label:'Deposit invoice ('+percent(d.deposit_percent,'en')+')',amount:t.deposit,enabled:t.deposit>0&&!hasDeposit&&!hasFinal},
      {kind:'balance',label:'Balance invoice (total − deposit)',amount:round2(t.ttc-deducted),enabled:hasDeposit&&!hasFinal},
      {kind:'full',label:'Full invoice',amount:t.ttc,enabled:!hasDeposit&&!hasFinal}
    ];
  }
  function openInvoiceDialog(d){
    invoiceSource=d;
    var options=invoiceOptions(d),first=options.find(function(o){return o.enabled;});
    if(!first){message(listMessage,'Devis '+d.number+' is already fully invoiced.');return;}
    $('[data-facture-devis]').textContent=d.number+' · '+clientLabel(d)+' · '+money(d.total_ttc,d.language);
    $('[data-facture-kinds]').innerHTML=options.map(function(o){return '<label class="facture-kind'+(o.enabled?'':' is-disabled')+'"><input type="radio" name="kind" value="'+o.kind+'"'+(o.enabled?'':' disabled')+(o===first?' checked':'')+'> '+escapeHtml(o.label)+'<strong>'+escapeHtml(money(o.amount,d.language))+'</strong></label>';}).join('');
    factureForm.elements.issue_date.value=todayIso();
    factureForm.elements.due_date.value=addDays(todayIso(),settings.invoice_payment_days==null?30:num(settings.invoice_payment_days));
    factureForm.elements.payment_terms.value=d.language==='en'?'Payment by bank transfer by the due date.':'Paiement par virement bancaire à réception, au plus tard à l’échéance.';
    message(factureFormMessage,'');
    factureDialog.showModal();
  }
  function invoiceDraft(d,kind){
    var en=d.language==='en',t=computeTotals(d),items,discount=num(d.discount_percent),deducted=0;
    if(kind==='deposit'){
      var ht=d.vat_exempt?t.deposit:round2(t.deposit/(1+num(d.vat_rate)/100));
      items=[{type:'item',name:en?percent(d.deposit_percent,'en')+' deposit on quote '+d.number:'Acompte de '+percent(d.deposit_percent,'fr')+' sur le devis '+d.number,description:d.title||'',quantity:1,unit:'forfait',unit_price:ht,total:ht,billing:'once'}];
      discount=0;
    }else{
      items=(d.items||[]).filter(function(i){return isSection(i)||isCounted(i);}).map(function(i){return Object.assign({},i,{optional:false,selected:false});});
      if(kind==='balance')deducted=round2(activeInvoices(d).filter(function(f){return f.kind==='deposit';}).reduce(function(s,f){return s+num(f.total_ttc);},0));
    }
    var f={devis_id:d.id,kind:kind,client_id:d.client_id||null,client_name:d.client_name,client_company:d.client_company,client_email:d.client_email,client_phone:d.client_phone,client_address:d.client_address,client_siret:d.client_siret,client_vat:d.client_vat,language:d.language,title:d.title,items:items,discount_percent:discount,vat_rate:d.vat_rate,vat_exempt:d.vat_exempt};
    var ft=computeTotals(f);
    f.subtotal_ht=ft.subtotal;f.total_ht=ft.totalHt;f.total_vat=ft.vat;f.total_ttc=ft.ttc;f.deposit_deducted=deducted;f.amount_due=round2(ft.ttc-deducted);
    return f;
  }
  async function createInvoice(andSend){
    var d=invoiceSource,kindInput=factureForm.querySelector('input[name="kind"]:checked');if(!d||!kindInput)return;
    var f=invoiceDraft(d,kindInput.value);
    f.issue_date=factureForm.elements.issue_date.value||todayIso();f.due_date=factureForm.elements.due_date.value||null;f.payment_terms=factureForm.elements.payment_terms.value.trim()||null;
    var buttons=factureForm.querySelectorAll('button');buttons.forEach(function(b){b.disabled=true;});message(factureFormMessage,'Creating…');
    try{
      var created=null;
      for(var attempt=0;attempt<2&&!created;attempt++){
        f.number=nextFactureNumber();
        try{created=(await jsonRequest('/rest/v1/factures','POST',f,true))[0];}
        catch(error){if(error.code!=='23505'||attempt>0)throw error;factures=await request('/rest/v1/factures?select=*&order=created_at.desc');}
      }
      factures.unshift(created);renderFactures();renderList();
      if(andSend){message(factureFormMessage,'Sending…');await sendFacture(created);}
      factureDialog.close();setSubtab('factures');
      flash(factureMessage,'Invoice '+created.number+' created'+(andSend?' and sent to '+created.client_email:'')+'.');
    }catch(error){message(factureFormMessage,sendErrorText(error));}
    finally{buttons.forEach(function(b){b.disabled=false;});}
  }
  function factureEmail(f){
    var en=f.language==='en',lang=f.language,iban=settings.iban?'IBAN '+settings.iban+(settings.bic?' · BIC '+settings.bic:''):'';
    var subject=(en?'Invoice ':'Facture ')+f.number+' — '+companyName();
    var text=en
      ?['Please find attached invoice no. '+f.number+(f.title?' for “'+f.title+'”':'')+'.','Amount due: '+money(f.amount_due,lang)+(f.due_date?', by '+formatDate(f.due_date,lang):'')+'.'+(iban?'\nBank transfer: '+iban:''),'Thank you for your trust,\nThe '+companyName()+' team'].join('\n\n')
      :['Veuillez trouver ci-joint la facture n° '+f.number+(f.title?' pour « '+f.title+' »':'')+'.','Montant à régler : '+money(f.amount_due,lang)+(f.due_date?', avant le '+formatDate(f.due_date,lang):'')+'.'+(iban?'\nVirement : '+iban:''),'Merci pour votre confiance,\nL’équipe '+companyName()].join('\n\n');
    return{subject:subject,text:text};
  }
  async function sendFacture(f){
    if(!isEmail(f.client_email))throw new Error('This invoice has no valid client email.');
    var pdf=await Core.buildPdf(f,pdfCtx('facture',{devisNumber:devisNumberFor(f)})),mail=factureEmail(f),emailId=f.client_id?uuid():null;
    var result=await invokeFunction('send-devis',{to:f.client_email,business_name:f.client_company||f.client_name,contact_name:f.client_name||undefined,language:f.language,subject:mail.subject,body:mail.text,branding:brandingPayload(),reply_to:replyAddress()||undefined,view_online_url:emailId?'https://www.sbmarketing.fr/view-email/?id='+emailId:undefined,pdf_base64:pdf.output('datauristring').split(',')[1],filename:Core.fileBase(f,'facture')+'.pdf'});
    var patch={sent_at:new Date().toISOString(),send_count:(f.send_count||0)+1,updated_at:new Date().toISOString()};
    await jsonRequest('/rest/v1/factures?id=eq.'+encodeURIComponent(f.id),'PATCH',patch);
    Object.assign(f,patch);renderFactures();
    await logClientEmail(f.client_id,emailId,mail.subject,mail.text,result.html);
  }
  async function quickSendFacture(id){
    var f=findFacture(id);if(!f)return;
    if(!confirm((f.sent_at?'Resend':'Send')+' invoice '+f.number+' to '+(f.client_email||'?')+'?'))return;
    message(factureMessage,'Sending '+f.number+'…');
    try{await sendFacture(f);flash(factureMessage,'Invoice '+f.number+' sent to '+f.client_email+'.');}
    catch(error){message(factureMessage,sendErrorText(error));}
  }
  async function exportFacture(f,format){
    message(factureMessage,'Generating…');
    try{await Core.exportDoc(await Core.buildPdf(f,pdfCtx('facture',{devisNumber:devisNumberFor(f)})),Core.fileBase(f,'facture'),format);message(factureMessage,'');}
    catch(error){message(factureMessage,error.message);}
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
        var row=dirty[i],id=row.dataset.serviceId,v=function(name){return row.querySelector('[data-s="'+name+'"]');};
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
  var SETTINGS_TEXT=['legal_name','legal_form','address','siret','vat_number','email','phone','website','iban','bic','number_prefix','vat_exempt_mention','default_payment_terms','default_notes','cgv_url','portfolio_pdf_url','notify_email','invoice_prefix','invoice_legal_text'];
  var SETTINGS_NUMBERS=['validity_days','default_vat_rate','default_deposit_percent','reminder_days','expiry_reminder_days','invoice_payment_days'];
  var SETTINGS_BOOLS=['vat_exempt','default_cover_page','default_attach_cgv'];
  function openSettings(){
    if(!loaded){message(listMessage,'Still loading — try again in a moment.');return;}
    var el=settingsForm.elements;
    SETTINGS_TEXT.concat(SETTINGS_NUMBERS).forEach(function(key){el[key].value=settings[key]==null?'':settings[key];});
    SETTINGS_BOOLS.forEach(function(key){el[key].checked=!!settings[key];});
    el.accent_color.value=/^#[0-9a-f]{6}$/i.test(settings.accent_color||'')?settings.accent_color:'#f2c94c';
    el.portfolio_images.value=(Array.isArray(settings.portfolio_images)?settings.portfolio_images:[]).join('\n');
    message(settingsMessage,'');settingsDialog.showModal();
  }
  async function saveSettings(event){
    event.preventDefault();
    var el=settingsForm.elements,payload={updated_at:new Date().toISOString(),accent_color:el.accent_color.value||'#f2c94c'};
    SETTINGS_TEXT.forEach(function(key){payload[key]=el[key].value.trim()||null;});
    SETTINGS_NUMBERS.forEach(function(key){payload[key]=num(el[key].value);});
    SETTINGS_BOOLS.forEach(function(key){payload[key]=el[key].checked;});
    payload.portfolio_images=el.portfolio_images.value.split(/\s*\n\s*/).map(function(u){return u.trim();}).filter(function(u){return /^https?:\/\//.test(u);}).slice(0,4);
    if(!payload.legal_name)payload.legal_name='SB Marketing';
    if(!payload.number_prefix)payload.number_prefix='DEV';
    if(!payload.invoice_prefix)payload.invoice_prefix='FAC';
    if(!payload.vat_exempt_mention)payload.vat_exempt_mention='TVA non applicable, art. 293 B du CGI';
    if(payload.validity_days<1)payload.validity_days=30;
    if(payload.reminder_days<1)payload.reminder_days=5;
    if(payload.expiry_reminder_days<1)payload.expiry_reminder_days=3;
    var button=settingsForm.querySelector('button[type="submit"]');button.disabled=true;message(settingsMessage,'Saving…');
    try{await jsonRequest('/rest/v1/devis_settings?id=eq.default','PATCH',payload);settings=Object.assign({},settings,payload);message(settingsMessage,'Saved.');}
    catch(error){message(settingsMessage,setupHint(error));}
    finally{button.disabled=false;}
  }
  async function onSettingsUpload(input){
    var file=input.files[0],target=input.dataset.devisUpload;if(!file)return;
    message(settingsMessage,'Uploading '+file.name+'…');
    try{
      var url=await uploadAsset(file),field=settingsForm.elements[target];
      if(target==='portfolio_images')field.value=(field.value.trim()?field.value.trim()+'\n':'')+url;else field.value=url;
      message(settingsMessage,'Uploaded — click “Save settings” to keep it.');
    }catch(error){message(settingsMessage,error.message);}
    finally{input.value='';}
  }

  // ── Wiring ──────────────────────────────────────────────────────
  view.querySelectorAll('[data-devis-subtab]').forEach(function(b){b.addEventListener('click',function(){setSubtab(b.dataset.devisSubtab);});});
  searchInput.addEventListener('input',renderList);
  statusFilter.addEventListener('change',renderList);
  factureSearch.addEventListener('input',renderFactures);
  factureFilter.addEventListener('change',renderFactures);
  $('[data-devis-new]',view).addEventListener('click',function(){openEditor(null);});
  $('[data-devis-services-open]',view).addEventListener('click',openServices);
  $('[data-devis-settings-open]',view).addEventListener('click',openSettings);
  document.addEventListener('click',function(event){closeMenus(event.target.closest('.devis-menu'));});

  body.addEventListener('change',function(event){var select=event.target.closest('[data-devis-status]');if(select)updateStatus(select.dataset.devisStatus,select.value,select);});
  body.addEventListener('click',function(event){
    var b=event.target.closest('button');if(!b)return;
    var ds=b.dataset,d;
    if(b.closest('.devis-menu__list'))closeMenus();
    if(ds.devisEdit)openEditor(findDevis(ds.devisEdit));
    else if(ds.devisExport&&(d=findDevis(ds.devisExport)))exportDevis(d,ds.format,listMessage);
    else if(ds.devisWa&&(d=findDevis(ds.devisWa)))shareWhatsapp(d,listMessage);
    else if(ds.devisQuickSend)quickSend(ds.devisQuickSend);
    else if(ds.devisCopyLink&&(d=findDevis(ds.devisCopyLink)))copyLink(d);
    else if(ds.devisOpenLink&&(d=findDevis(ds.devisOpenLink))){if(d.status==='draft')message(listMessage,'Drafts aren’t visible online — send it first.');else if(Core.publicUrl(d))window.open(Core.publicUrl(d),'_blank','noopener');}
    else if(ds.devisInvoice&&(d=findDevis(ds.devisInvoice)))openInvoiceDialog(d);
    else if(ds.devisMakeClient&&(d=findDevis(ds.devisMakeClient)))makeClient(d);
    else if(ds.devisVersion&&(d=findDevis(ds.devisVersion)))newVersion(d);
    else if(ds.devisDuplicate)openEditor(findDevis(ds.devisDuplicate),true);
    else if(ds.devisDelete)deleteDevis(ds.devisDelete);
  });
  factureBody.addEventListener('change',function(event){var select=event.target.closest('[data-facture-status]');if(select)updateFactureStatus(select.dataset.factureStatus,select.value,select);});
  factureBody.addEventListener('click',function(event){
    var b=event.target.closest('button');if(!b)return;var f;
    if(b.closest('.devis-menu__list'))closeMenus();
    if(b.dataset.factureExport&&(f=findFacture(b.dataset.factureExport)))exportFacture(f,b.dataset.format);
    else if(b.dataset.factureSend)quickSendFacture(b.dataset.factureSend);
  });

  form.addEventListener('submit',onSubmitSend);
  form.addEventListener('input',function(event){
    if(event.target.name==='email_message'||event.target.name==='email_subject'){event.target.dataset.edited=event.target.value.trim()?'1':'';return;}
    // Typing a line total keeps it; changing qty, price or discount recalculates it.
    var line=event.target.closest('.devis-line'),field=event.target.dataset.f;
    if(line&&field==='total')line.dataset.manual=event.target.value.trim()?'1':'';
    else if(line&&(field==='quantity'||field==='unit_price'||field==='discount_percent'))line.dataset.manual='';
    refreshEditor();
  });
  form.addEventListener('change',function(event){if(event.target.matches('select,input[type="checkbox"]')&&event.target!==sourceSelect&&event.target!==templateSelect&&event.target!==servicePick)refreshEditor();});
  sourceSelect.addEventListener('change',function(){if(sourceSelect.value)applySource(sourceSelect.value);});
  templateSelect.addEventListener('change',function(){if(templateSelect.value)applyTemplate(templateSelect.value);});
  $('[data-devis-template-save]').addEventListener('click',saveTemplate);
  servicePick.addEventListener('change',function(){
    var s=services.find(function(x){return x.id===servicePick.value;});servicePick.value='';if(!s)return;
    addLine({name:s.name,description:s.description,quantity:1,unit:s.unit,unit_price:s.unit_price,billing:s.unit==='mois'?'monthly':'once'});refreshEditor();
  });
  $('[data-devis-add-line]').addEventListener('click',function(){var row=addLine({unit:'forfait'});refreshEditor();row.querySelector('[data-f="name"]').focus();});
  $('[data-devis-add-section]').addEventListener('click',function(){var row=addSection('');refreshEditor();row.querySelector('[data-f="name"]').focus();});
  linesBox.addEventListener('click',function(event){
    var row=event.target.closest('.devis-line');if(!row)return;
    if(event.target.closest('[data-line-remove]')){row.remove();refreshEditor();}
    else if(event.target.closest('[data-line-up]')&&row.previousElementSibling){linesBox.insertBefore(row,row.previousElementSibling);refreshEditor();}
  });
  $('[data-devis-save]').addEventListener('click',onSaveDraft);
  $('[data-devis-preview]').addEventListener('click',previewPdf);
  $('[data-editor-export]').addEventListener('click',function(event){var b=event.target.closest('[data-export-format]');if(!b)return;closeMenus();exportDevis(editorSnapshot(),b.dataset.exportFormat,formMessage);});
  $('[data-devis-whatsapp]').addEventListener('click',editorWhatsapp);
  $('[data-devis-pdf-close]').addEventListener('click',closePdfPreview);
  $('[data-devis-close]').addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('close',function(){closePdfPreview();closeMenus();editing=null;});

  factureForm.addEventListener('submit',function(event){event.preventDefault();createInvoice(true);});
  $('[data-facture-create]').addEventListener('click',function(){createInvoice(false);});
  $('[data-facture-close]').addEventListener('click',function(){factureDialog.close();});

  servicesBody.addEventListener('input',function(event){var row=event.target.closest('tr');if(row)row.classList.add('is-dirty');});
  servicesBody.addEventListener('change',function(event){var row=event.target.closest('tr');if(row)row.classList.add('is-dirty');});
  servicesBody.addEventListener('click',function(event){if(event.target.closest('[data-service-remove]'))removeService(event.target.closest('tr'));});
  $('[data-devis-services-add]').addEventListener('click',function(){servicesBody.insertAdjacentHTML('beforeend',serviceRowHtml({category:'',unit:'forfait',active:true}));var row=servicesBody.lastElementChild;row.classList.add('is-dirty');row.querySelector('[data-s="name"]').focus();});
  $('[data-devis-services-save]').addEventListener('click',saveServices);
  $('[data-devis-services-close]').addEventListener('click',function(){if(servicesBody.querySelector('tr.is-dirty')&&!confirm('Discard unsaved catalog changes?'))return;servicesDialog.close();});

  settingsForm.addEventListener('submit',saveSettings);
  settingsForm.querySelectorAll('[data-devis-upload]').forEach(function(input){input.addEventListener('change',function(){onSettingsUpload(input);});});
  $('[data-accent-reset]').addEventListener('click',function(){settingsForm.elements.accent_color.value='#f2c94c';});
  $('[data-devis-settings-close]').addEventListener('click',function(){settingsDialog.close();});

  var refreshButton=document.querySelector('[data-refresh]');
  if(refreshButton)refreshButton.addEventListener('click',function(){if(!view.hidden){loaded=false;show();}});
  var logoutButton=document.querySelector('[data-logout]');
  if(logoutButton)logoutButton.addEventListener('click',function(){loaded=false;devisList=[];factures=[];services=[];templates=[];clients=[];contacts=[];body.innerHTML='';factureBody.innerHTML='';});

  window.SBDevis={show:show,openNew:function(){show();(loading||Promise.resolve()).then(function(){openEditor(null);});}};
  // admin.js may have already opened #devis before this script loaded.
  if(!view.hidden)show();
})();
