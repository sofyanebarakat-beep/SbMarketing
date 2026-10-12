// Client-facing devis page: /devis/?id=…&t=…
// Reads the devis through the get_public_devis RPC (the id + secret token
// from the email link — no login), lets the client tick optional lines,
// sign with finger/mouse and accept (accept_devis) or refuse
// (refuse_devis), and download it as PDF or image. Totals are always
// recomputed by the database on acceptance.
(function(){
  'use strict';
  var config=window.SB_SUPABASE,Core=window.SBDevisCore;
  var params=new URLSearchParams(location.search),id=params.get('id'),token=params.get('t');
  var data=null,devis=null,lang='fr',hasInk=false;
  function $(selector){return document.querySelector(selector);}

  var T={
    fr:{quote:'Devis',from:'Émetteur',client:'Client',date:'Date',valid:'Valable jusqu’au',downloadPdf:'Télécharger le PDF',downloadImg:'Télécharger en image',acceptTitle:'Accepter le devis',acceptHint:'Indiquez votre nom et signez dans le cadre ci-dessous (au doigt ou à la souris).',name:'Nom et prénom',padHint:'Signez ici',clear:'Effacer',accept:'Accepter et signer',refuseToggle:'Je ne souhaite pas donner suite',refuseReason:'Une raison ? (facultatif)',refuse:'Refuser le devis',
      consent:function(n){return 'J’ai lu le devis '+n+' et je l’accepte (« Bon pour accord »). Ma signature électronique a la même valeur qu’une signature manuscrite.';},
      subtotal:'Sous-total HT',discount:'Remise',totalHt:'Total HT',vat:'TVA',ttc:'Total TTC',net:'Total',deposit:'Acompte à la signature',once:'Dont ponctuel',monthly:'Dont mensuel',perMonth:'/ mois',sectionSub:'Sous-total',
      option:'Option',addOption:'Ajouter cette option',optionsNote:'Cochez les options que vous souhaitez ajouter : le total se met à jour.',payment:'Conditions de paiement',bank:'Coordonnées bancaires',notes:'Conditions',
      accepted:function(name,when){return '✅ Devis accepté et signé par '+name+' le '+when+'. Merci pour votre confiance !';},refused:'Ce devis a été refusé. N’hésitez pas à nous contacter si vous souhaitez en discuter.',expired:function(when){return 'Ce devis a expiré le '+when+'. Contactez-nous pour en obtenir une version à jour.';},
      superseded:'Ce devis a été remplacé par une nouvelle version.',seeNewer:function(n){return 'Voir le devis '+n+' →';},
      needName:'Merci d’indiquer votre nom.',needSign:'Merci de signer dans le cadre.',needConsent:'Merci de cocher la case d’acceptation.',signing:'Signature en cours…',refusing:'Envoi…',confirmRefuse:'Confirmer le refus de ce devis ?',refusedDone:'Votre réponse a bien été enregistrée. Merci.',
      generating:'Préparation du fichier…',invalidTitle:'Lien invalide',invalid:'Ce lien de devis n’existe pas ou n’est plus valide. Contactez-nous si vous pensez qu’il s’agit d’une erreur.',contact:'Nous contacter',signedBy:'Signé par'},
    en:{quote:'Quote',from:'From',client:'Client',date:'Date',valid:'Valid until',downloadPdf:'Download PDF',downloadImg:'Download as image',acceptTitle:'Accept the quote',acceptHint:'Type your name and sign in the box below (finger or mouse).',name:'Full name',padHint:'Sign here',clear:'Clear',accept:'Accept and sign',refuseToggle:'I don’t wish to go ahead',refuseReason:'Any reason? (optional)',refuse:'Decline the quote',
      consent:function(n){return 'I have read quote '+n+' and accept it (“Approved”). My electronic signature has the same value as a handwritten one.';},
      subtotal:'Subtotal (excl. VAT)',discount:'Discount',totalHt:'Total excl. VAT',vat:'VAT',ttc:'Total incl. VAT',net:'Total',deposit:'Deposit due on signature',once:'One-off',monthly:'Monthly',perMonth:'/ month',sectionSub:'Subtotal',
      option:'Option',addOption:'Add this option',optionsNote:'Tick the options you’d like to add — the total updates.',payment:'Payment terms',bank:'Bank details',notes:'Terms & conditions',
      accepted:function(name,when){return '✅ Quote accepted and signed by '+name+' on '+when+'. Thank you for your trust!';},refused:'This quote was declined. Feel free to contact us if you’d like to discuss it.',expired:function(when){return 'This quote expired on '+when+'. Contact us for an updated version.';},
      superseded:'This quote has been replaced by a newer version.',seeNewer:function(n){return 'See quote '+n+' →';},
      needName:'Please enter your name.',needSign:'Please sign in the box.',needConsent:'Please tick the acceptance box.',signing:'Signing…',refusing:'Sending…',confirmRefuse:'Decline this quote?',refusedDone:'Your answer has been recorded. Thank you.',
      generating:'Preparing the file…',invalidTitle:'Invalid link',invalid:'This quote link doesn’t exist or is no longer valid. Contact us if you think this is a mistake.',contact:'Contact us',signedBy:'Signed by'}
  };
  function t(key){return T[lang][key];}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}

  async function rpc(name,payload){
    var response=await fetch(config.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var body=await response.json().catch(function(){return null;});
    if(!response.ok)throw new Error((body&&(body.message||body.hint))||'Erreur ('+response.status+')');
    return body;
  }

  function showError(){
    $('[data-loading]').hidden=true;$('[data-doc]').hidden=true;$('[data-error]').hidden=false;
    $('[data-error-title]').textContent=t('invalidTitle');$('[data-error-text]').textContent=t('invalid');$('[data-error-contact]').textContent=t('contact');
    if(lang==='en')$('[data-error-contact]').href='/en/contact/';
  }

  function isExpired(){return devis.status==='sent'&&devis.valid_until&&devis.valid_until<Core.todayIso();}
  function canSign(){return devis.status==='sent'&&!isExpired();}

  // ── Render ──────────────────────────────────────────────────────
  function render(){
    var s=data.settings||{},brand=data.brand||{};
    document.documentElement.lang=lang;
    document.title=t('quote')+' '+devis.number+' | '+(s.legal_name||brand.company_name||'SB Marketing');
    document.querySelectorAll('[data-t]').forEach(function(el){var v=T[lang][el.dataset.t];if(typeof v==='string')el.textContent=v;});
    var site=String(s.website||brand.website_url||'www.sbmarketing.fr').replace(/^https?:\/\//,'').replace(/\/$/,'');
    $('[data-site-link]').textContent=site;$('[data-site-link]').href='https://'+site;

    $('[data-number]').textContent=t('quote')+' '+devis.number;
    $('[data-title]').textContent=devis.title||'';
    $('[data-meta]').innerHTML='<dt>'+t('date')+'</dt><dd>'+escapeHtml(Core.formatDate(devis.issue_date,lang))+'</dd>'
      +(devis.valid_until?'<dt>'+t('valid')+'</dt><dd>'+escapeHtml(Core.formatDate(devis.valid_until,lang))+'</dd>':'');

    var issuer=[s.legal_form,s.address,s.siret?'SIRET '+s.siret:'',s.vat_number?(lang==='en'?'VAT ':'TVA ')+s.vat_number:'',s.email,s.phone||brand.phone,site].filter(Boolean);
    $('[data-issuer]').innerHTML='<strong>'+escapeHtml(s.legal_name||brand.company_name||'SB Marketing')+'</strong>'+escapeHtml(issuer.join('\n'));
    var client=[devis.client_company?devis.client_name:'',devis.client_address,devis.client_email,devis.client_phone,devis.client_siret?'SIRET '+devis.client_siret:'',devis.client_vat?(lang==='en'?'VAT ':'TVA ')+devis.client_vat:''].filter(Boolean);
    $('[data-client]').innerHTML='<strong>'+escapeHtml(Core.clientLabel(devis))+'</strong>'+escapeHtml(client.join('\n'));

    $('[data-intro]').hidden=!devis.intro;$('[data-intro]').textContent=devis.intro||'';
    renderLines();renderTotals();

    var blocks=[];
    if(devis.payment_terms)blocks.push([t('payment'),devis.payment_terms]);
    if(s.iban)blocks.push([t('bank'),'IBAN '+s.iban+(s.bic?'\nBIC '+s.bic:'')]);
    if(devis.notes)blocks.push([t('notes'),devis.notes]);
    $('[data-conditions]').hidden=!blocks.length;
    $('[data-conditions]').innerHTML=blocks.map(function(b){return '<div><span class="dp-label">'+escapeHtml(b[0])+'</span><p>'+escapeHtml(b[1])+'</p></div>';}).join('');

    renderBanner();
    $('[data-sign]').hidden=!canSign();
    $('[data-consent-text]').textContent=T[lang].consent(devis.number);
    $('[data-footer]').textContent=[s.legal_name||brand.company_name,s.siret?'SIRET '+s.siret:'',site].filter(Boolean).join(' · ');
    $('[data-loading]').hidden=true;$('[data-doc]').hidden=false;
    if(canSign())setupPad();
  }

  function renderBanner(){
    var banner=$('[data-banner]'),html='',cls='dp-banner';
    if(devis.status==='accepted'){
      cls+=' dp-banner--ok';
      html='<div class="dp-signed">'+(devis.signature_data?'<img src="'+escapeHtml(devis.signature_data)+'" alt="Signature">':'')+'<span>'+escapeHtml(T[lang].accepted(devis.signed_name||'',Core.formatDateTime(devis.signed_at||devis.responded_at,lang)))+'</span></div>';
    }else if(devis.status==='refused'){cls+=' dp-banner--no';html=escapeHtml(t('refused'));}
    else if(devis.status==='superseded'){html=escapeHtml(t('superseded'))+(data.newer?' <a href="?id='+encodeURIComponent(data.newer.id)+'&t='+encodeURIComponent(data.newer.t)+'">'+escapeHtml(T[lang].seeNewer(data.newer.number))+'</a>':'');}
    else if(isExpired()){html=escapeHtml(T[lang].expired(Core.formatDate(devis.valid_until,lang)));}
    banner.className=cls;banner.innerHTML=html;banner.hidden=!html;
  }

  function renderLines(){
    var html='',section=null,editable=canSign(),hasOptions=false;
    function closeSection(){if(section&&section.count)html+='<div class="dp-sub"><span>'+escapeHtml(t('sectionSub')+' '+section.name)+'</span><span>'+escapeHtml(Core.money(Core.round2(section.total),lang))+'</span></div>';section=null;}
    (devis.items||[]).forEach(function(item,index){
      if(Core.isSection(item)){closeSection();section={name:item.name||'',total:0,count:0};html+='<div class="dp-section">'+escapeHtml(item.name)+'</div>';return;}
      var counted=Core.isCounted(item),total=Core.lineTotal(item);
      if(section&&counted){section.total+=total;section.count++;}
      if(item.optional)hasOptions=true;
      var calc=[];
      if(item.quantity!=null&&item.quantity!==''&&item.unit_price!=null&&item.unit_price!=='')calc.push(Core.qty(item.quantity,lang)+' '+Core.unitLabel(item.unit,lang)+' × '+Core.money(item.unit_price,lang));
      if(Core.num(item.discount_percent)>0)calc.push('-'+Core.percent(item.discount_percent,lang));
      if(item.billing==='monthly')calc.push(t('monthly').toLowerCase());
      var optionHtml=item.optional?(editable?'<label class="dp-opt"><input type="checkbox" data-option="'+index+'"'+(item.selected?' checked':'')+'> '+escapeHtml(t('addOption'))+'</label>':'<span class="dp-opt">'+escapeHtml(t('option'))+'</span>'):'';
      html+='<div class="dp-line'+(item.optional?' dp-line--option':'')+(counted?'':' dp-line--off')+'">'
        +'<div><div class="dp-line__name">'+escapeHtml(item.name)+'</div>'+(calc.length?'<div class="dp-line__calc">'+escapeHtml(calc.join(' · '))+'</div>':'')+optionHtml+'</div>'
        +'<div class="dp-line__total">'+escapeHtml(Core.money(total,lang))+'</div>'
        +(item.description?'<div class="dp-line__desc">'+escapeHtml(item.description)+'</div>':'')
        +'</div>';
    });
    closeSection();
    $('[data-lines]').innerHTML=html;
    $('[data-options-note]').hidden=!(hasOptions&&editable);
    $('[data-options-note]').textContent=t('optionsNote');
  }

  function renderTotals(){
    var tt=Core.computeTotals(devis),rows=[[t('subtotal'),Core.money(tt.subtotal,lang)]];
    if(tt.discount)rows.push([t('discount')+' ('+Core.percent(devis.discount_percent,lang)+')','- '+Core.money(tt.discount,lang)],[t('totalHt'),Core.money(tt.totalHt,lang)]);
    if(!devis.vat_exempt)rows.push([t('vat')+' ('+Core.percent(devis.vat_rate,lang)+')',Core.money(tt.vat,lang)]);
    var html=rows.map(function(r){return '<dt>'+escapeHtml(r[0])+'</dt><dd>'+escapeHtml(r[1])+'</dd>';}).join('');
    html+='<dt class="is-total">'+escapeHtml(devis.vat_exempt?t('net'):t('ttc'))+'</dt><dd class="is-total">'+escapeHtml(Core.money(tt.ttc,lang))+'</dd>';
    if(devis.vat_exempt&&data.settings&&data.settings.vat_exempt_mention)html+='<dt class="is-small" style="grid-column:1/-1;text-align:right">'+escapeHtml(data.settings.vat_exempt_mention)+'</dt>';
    if(tt.deposit)html+='<dt class="is-small">'+escapeHtml(t('deposit')+' ('+Core.percent(devis.deposit_percent,lang)+')')+'</dt><dd class="is-small">'+escapeHtml(Core.money(tt.deposit,lang))+'</dd>';
    if(tt.monthlyTotal>0){
      if(tt.once)html+='<dt class="is-small">'+escapeHtml(t('once'))+'</dt><dd class="is-small">'+escapeHtml(Core.money(tt.once,lang))+' HT</dd>';
      html+='<dt class="is-small">'+escapeHtml(t('monthly'))+'</dt><dd class="is-small">'+escapeHtml(Core.money(tt.monthlyPerMonth,lang)+' HT '+t('perMonth'))+'</dd>';
    }
    $('[data-totals]').innerHTML=html;
    $('[data-accept-total]').textContent=Core.money(tt.ttc,lang)+(devis.vat_exempt?'':(lang==='en'?' incl. VAT':' TTC'));
  }

  // ── Signature pad ───────────────────────────────────────────────
  var padReady=false;
  function setupPad(){
    if(padReady)return;padReady=true;
    var canvas=$('[data-pad]'),ctx=canvas.getContext('2d'),drawing=false,last=null;
    function size(){var ratio=Math.min(window.devicePixelRatio||1,2),rect=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));ctx.setTransform(ratio,0,0,ratio,0,0);ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#041021';hasInk=false;$('[data-pad-hint]').hidden=false;}
    function point(event){var rect=canvas.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};}
    canvas.addEventListener('pointerdown',function(event){drawing=true;last=point(event);canvas.setPointerCapture(event.pointerId);ctx.beginPath();ctx.arc(last.x,last.y,1.1,0,Math.PI*2);ctx.fillStyle='#041021';ctx.fill();hasInk=true;$('[data-pad-hint]').hidden=true;});
    canvas.addEventListener('pointermove',function(event){if(!drawing)return;var p=point(event);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;});
    ['pointerup','pointercancel','pointerleave'].forEach(function(type){canvas.addEventListener(type,function(){drawing=false;});});
    $('[data-pad-clear]').addEventListener('click',size);
    window.addEventListener('resize',function(){if(!hasInk)size();});
    size();
  }

  // ── Actions ─────────────────────────────────────────────────────
  async function accept(){
    var msg=$('[data-sign-msg]'),name=$('[data-sign-name]').value.trim();
    msg.className='dp-msg';
    if(name.length<2){msg.textContent=t('needName');return;}
    if(!hasInk){msg.textContent=t('needSign');return;}
    if(!$('[data-sign-consent]').checked){msg.textContent=t('needConsent');return;}
    var selected=[];(devis.items||[]).forEach(function(item,i){if(item.optional&&item.selected)selected.push(i);});
    var button=$('[data-accept]');button.disabled=true;msg.textContent=t('signing');
    try{
      await rpc('accept_devis',{p_id:id,p_token:token,p_name:name,p_signature:$('[data-pad]').toDataURL('image/png'),p_selected:selected});
      await load();
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(error){msg.textContent=error.message;button.disabled=false;}
  }
  async function refuse(){
    if(!confirm(t('confirmRefuse')))return;
    var msg=$('[data-sign-msg]'),button=$('[data-refuse]');button.disabled=true;msg.className='dp-msg';msg.textContent=t('refusing');
    try{await rpc('refuse_devis',{p_id:id,p_token:token,p_reason:$('[data-refuse-reason]').value});await load();msg.textContent='';}
    catch(error){msg.textContent=error.message;button.disabled=false;}
  }
  async function download(format){
    var msg=$('[data-download-msg]');msg.className='dp-msg is-ok';msg.textContent=t('generating');
    try{
      var doc=await Core.buildPdf(Object.assign({},devis,{public_token:token}),{settings:data.settings,brand:data.brand,kind:'devis'});
      await Core.exportDoc(doc,Core.fileBase(devis,'devis'),format==='png'?'stacked':'pdf');
      msg.textContent='';
    }catch(error){msg.className='dp-msg';msg.textContent=error.message;}
  }

  async function load(){
    var result=await rpc('get_public_devis',{p_id:id,p_token:token});
    if(!result||!result.devis){showError();return;}
    data=result;devis=result.devis;lang=devis.language==='en'?'en':'fr';
    render();
  }

  $('[data-lines]').addEventListener('change',function(event){
    var box=event.target.closest('[data-option]');if(!box)return;
    var item=devis.items[Number(box.dataset.option)];item.selected=box.checked;
    item.total=Core.lineTotal(item);
    renderLines();renderTotals();
  });
  $('[data-accept]').addEventListener('click',accept);
  $('[data-refuse]').addEventListener('click',refuse);
  document.querySelectorAll('[data-download]').forEach(function(button){button.addEventListener('click',function(){download(button.dataset.download);});});

  if(navigator.language&&/^en/i.test(navigator.language))lang='en';
  if(!config||!Core||!id||!token){showError();return;}
  load().catch(showError);
})();
