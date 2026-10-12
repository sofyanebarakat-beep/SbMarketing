// SB Marketing — shared devis/facture engine, used by the admin
// (js/admin-devis.js) and by the client's public page (/devis/).
// Totals rules, the PDF layout (jsPDF) and the image export (pdf.js) live
// here once, so the admin, the client page and the database
// (devis_compute_totals in supabase/devis_schema.sql) all agree.
// Libraries are loaded from cdnjs the first time they're needed.
(function(){
  'use strict';
  var JSPDF_URL='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var AUTOTABLE_URL='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
  var PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var PDFJS_WORKER_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  // The PDF uses jsPDF's built-in (non-embedded) Helvetica; pdf.js draws it
  // from these font files so images look identical on every device.
  var PDFJS_FONTS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/';
  var LOGO_URL='/images/sb-marketing-email-logo.png';
  var UNIT_EN={'forfait':'flat fee','mois':'month','heure':'hour','jour':'day','unité':'unit','page':'page'};

  // ── Formatting ──────────────────────────────────────────────────
  function num(value){var n=parseFloat(String(value==null?'':value).replace(',','.'));return isFinite(n)?n:0;}
  function round2(n){return Math.round((n+Number.EPSILON)*100)/100;}
  // fr-FR formatting uses narrow no-break spaces, which jsPDF's built-in
  // fonts can't draw — normalise to plain spaces everywhere.
  function plainSpaces(text){return String(text).replace(/[    ]/g,' ');}
  function locale(lang){return lang==='en'?'en-GB':'fr-FR';}
  function money(n,lang){return plainSpaces(new Intl.NumberFormat(locale(lang),{style:'currency',currency:'EUR'}).format(n||0));}
  function percent(n,lang){return plainSpaces(new Intl.NumberFormat(locale(lang),{maximumFractionDigits:2}).format(n||0))+(lang==='en'?'%':' %');}
  function qty(n,lang){return plainSpaces(new Intl.NumberFormat(locale(lang),{maximumFractionDigits:2}).format(n||0));}
  function todayIso(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function addDays(iso,days){var d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
  function formatDate(iso,lang){if(!iso)return '';return new Intl.DateTimeFormat(locale(lang),{day:'2-digit',month:lang==='en'?'short':'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(String(iso).slice(0,10)+'T00:00:00Z'));}
  function formatDateTime(iso,lang){if(!iso)return '';return plainSpaces(new Intl.DateTimeFormat(locale(lang),{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(iso)));}
  function unitLabel(unit,lang){return lang==='en'?(UNIT_EN[unit]||unit||''):(unit||'');}
  function hexToRgb(hex,fallback){var m=/^#?([0-9a-f]{6})$/i.exec(String(hex||'').trim());if(!m)return fallback;var n=parseInt(m[1],16);return[n>>16&255,n>>8&255,n&255];}
  function mix(rgb,amount){return rgb.map(function(c){return Math.round(c+(255-c)*amount);});}

  // ── Lines & totals ──────────────────────────────────────────────
  // Line: { type:'item'|'section', name, description, quantity, unit,
  //   unit_price, discount_percent, total, optional, selected, billing:'once'|'monthly' }
  // `total` is always stored (qty × price − line discount, or the amount
  // typed over it in the editor); a blank quantity counts as 1.
  function isSection(item){return item&&item.type==='section';}
  function autoLineTotal(item){var q=item.quantity==null||item.quantity===''?1:num(item.quantity);return round2(q*num(item.unit_price)*(1-num(item.discount_percent)/100));}
  function lineTotal(item){return item.total!=null&&item.total!==''?round2(num(item.total)):autoLineTotal(item);}
  function isCounted(item){return !isSection(item)&&(!item.optional||!!item.selected);}
  function computeTotals(d){
    var items=d.items||[],subtotal=0,once=0,monthlyTotal=0,monthlyPerMonth=0,options=0;
    items.forEach(function(item){
      if(isSection(item))return;
      var total=lineTotal(item);
      if(!isCounted(item)){options+=total;return;}
      subtotal+=total;
      if(item.billing==='monthly'){monthlyTotal+=total;monthlyPerMonth+=item.quantity==null||item.quantity===''||num(item.quantity)===0?total:total/num(item.quantity);}
      else once+=total;
    });
    subtotal=round2(subtotal);
    var discount=round2(subtotal*num(d.discount_percent)/100),totalHt=round2(subtotal-discount);
    var vat=d.vat_exempt?0:round2(totalHt*num(d.vat_rate)/100),ttc=round2(totalHt+vat);
    return{subtotal:subtotal,discount:discount,totalHt:totalHt,vat:vat,ttc:ttc,deposit:round2(ttc*num(d.deposit_percent)/100),
      once:round2(once),monthlyTotal:round2(monthlyTotal),monthlyPerMonth:round2(monthlyPerMonth),options:round2(options)};
  }
  function publicUrl(d){return d&&d.id&&d.public_token?'https://www.sbmarketing.fr/devis/?id='+encodeURIComponent(d.id)+'&t='+encodeURIComponent(d.public_token):'';}
  function slug(text){return String(text||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);}
  function clientLabel(d){return d.client_company||d.client_name||d.client_email||'';}
  function fileBase(d,kind){var en=d.language==='en';var prefix=kind==='facture'?(en?'Invoice-':'Facture-'):(en?'Quote-':'Devis-');return prefix+d.number+(clientLabel(d)?'-'+slug(clientLabel(d)):'');}

  // ── Loading ─────────────────────────────────────────────────────
  function loadScript(src){
    return new Promise(function(resolve,reject){
      var existing=document.querySelector('script[src="'+src+'"]');
      if(existing&&existing.dataset.loaded){resolve();return;}
      var s=existing||document.createElement('script');
      s.addEventListener('load',function(){s.dataset.loaded='1';resolve();});
      s.addEventListener('error',function(){reject(new Error('Could not load '+src.split('/').pop()+' — check your connection.'));});
      if(!existing){s.src=src;document.head.appendChild(s);}
    });
  }
  async function loadPdfLibs(){if(!(window.jspdf&&window.jspdf.jsPDF))await loadScript(JSPDF_URL);if(!window.jspdf.jsPDF.API.autoTable)await loadScript(AUTOTABLE_URL);}
  var imageCache={};
  // Resolves to a data URL, or '' when the image can't be fetched (e.g. a
  // host without CORS) — the PDF then simply leaves it out.
  function loadImage(url){
    if(!url)return Promise.resolve('');
    if(!imageCache[url])imageCache[url]=fetch(url).then(function(r){if(!r.ok)throw new Error();return r.blob();}).then(function(blob){
      return new Promise(function(resolve){var reader=new FileReader();reader.onload=function(){resolve(String(reader.result));};reader.onerror=function(){resolve('');};reader.readAsDataURL(blob);});
    }).catch(function(){return '';});
    return imageCache[url];
  }

  var COPY={
    fr:{devis:'DEVIS',facture:'FACTURE',no:'N°',date:'Date du devis',invDate:'Date de facture',valid:'Valable jusqu’au',due:'Échéance',ref:'Référence',devisRef:'Devis',to:'CLIENT',object:'Objet',desc:'Désignation',qty:'Qté',unit:'Unité',pu:'P.U. HT',disc:'Rem.',total:'Total HT',subtotal:'Sous-total HT',discount:'Remise',totalHt:'Total HT',vat:'TVA',ttc:'Total TTC',net:'Net à payer',deposit:'Acompte à la signature',depositDeducted:'Acompte déjà facturé',amountDue:'Reste à payer',payment:'Conditions de paiement',bank:'Coordonnées bancaires',notes:'Conditions',legal:'Mentions légales',sign:'Bon pour accord',signHint:'Date, signature et cachet du client, précédés de la mention « Bon pour accord »',signedBy:'Signé électroniquement par',page:'Page',siret:'SIRET',vatNo:'TVA intracom.',option:'Option',optionChosen:'Option retenue',optionsNote:'Les lignes « Option » ne sont pas comprises dans le total, sauf si elles sont retenues.',sectionSub:'Sous-total',once:'Dont ponctuel',monthly:'Dont mensuel',perMonth:'/ mois',paid:'PAYÉE',cancelled:'ANNULÉE',cover:'PROPOSITION COMMERCIALE',preparedFor:'Préparée pour',coverTotal:'Montant total',onlineHint:'Consultez et signez ce devis en ligne :'},
    en:{devis:'QUOTE',facture:'INVOICE',no:'No.',date:'Quote date',invDate:'Invoice date',valid:'Valid until',due:'Due date',ref:'Reference',devisRef:'Quote',to:'CLIENT',object:'Subject',desc:'Description',qty:'Qty',unit:'Unit',pu:'Unit price',disc:'Disc.',total:'Amount',subtotal:'Subtotal (excl. VAT)',discount:'Discount',totalHt:'Total excl. VAT',vat:'VAT',ttc:'Total incl. VAT',net:'Total due',deposit:'Deposit due on signature',depositDeducted:'Deposit already invoiced',amountDue:'Balance due',payment:'Payment terms',bank:'Bank details',notes:'Terms & conditions',legal:'Legal notice',sign:'Approval',signHint:'Date, signature and company stamp, preceded by “Approved”',signedBy:'Electronically signed by',page:'Page',siret:'SIRET',vatNo:'VAT no.',option:'Option',optionChosen:'Selected option',optionsNote:'“Option” lines are not included in the total unless selected.',sectionSub:'Subtotal',once:'One-off',monthly:'Monthly',perMonth:'/ month',paid:'PAID',cancelled:'CANCELLED',cover:'COMMERCIAL PROPOSAL',preparedFor:'Prepared for',coverTotal:'Total amount',onlineHint:'View and sign this quote online:'}
  };

  // ── PDF ─────────────────────────────────────────────────────────
  // d: a devis row, or a facture row when ctx.kind === 'facture'.
  // ctx: { settings (devis_settings row), brand (app_settings row),
  //        kind: 'devis' | 'facture', devisNumber (facture only) }
  async function buildPdf(d,ctx){
    ctx=ctx||{};
    await loadPdfLibs();
    var s=ctx.settings||{},brand=ctx.brand||{},isInvoice=ctx.kind==='facture';
    var lang=d.language==='en'?'en':'fr',L=COPY[lang],t=computeTotals(d);
    var portfolio=(!isInvoice&&d.cover_page&&Array.isArray(s.portfolio_images))?s.portfolio_images.slice(0,4):[];
    var images=await Promise.all([loadImage(LOGO_URL),d.signature_data?Promise.resolve(d.signature_data):Promise.resolve('')].concat(portfolio.map(loadImage)));
    var logo=images[0],signature=images[1],portfolioData=images.slice(2).filter(Boolean);
    var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'mm',format:'a4'});
    var NAVY=[4,16,33],ACCENT=hexToRgb(s.accent_color,[242,201,76]),ACCENT_SOFT=mix(ACCENT,.82),TEXT=[17,28,43],MUTED=[107,114,128],LIGHT=[245,246,248],LINE=[228,231,236],WHITE=[255,255,255];
    var left=16,right=194,width=right-left,bottomLimit=276,y;
    var companyName=s.legal_name||brand.company_name||'SB Marketing';
    var website=String(s.website||brand.website_url||'').replace(/^https?:\/\//,'').replace(/\/$/,'');
    function txt(value){return plainSpaces(value==null?'':value);}
    function font(size,style,color){doc.setFont('helvetica',style||'normal');doc.setFontSize(size);doc.setTextColor.apply(doc,color||TEXT);}
    function ensure(height){if(y+height>bottomLimit){doc.addPage();y=20;}}
    function lines(value,maxWidth){return doc.splitTextToSize(txt(value),maxWidth);}
    function fitImage(data,x,yy,w,h){
      try{var p=doc.getImageProperties(data),ratio=Math.min(w/p.width,h/p.height),iw=p.width*ratio,ih=p.height*ratio;doc.addImage(data,x+(w-iw)/2,yy+(h-ih)/2,iw,ih);}catch(error){}
    }

    // Optional cover page (devis only)
    var cover=!isInvoice&&!!d.cover_page;
    if(cover){
      doc.setFillColor.apply(doc,NAVY);doc.rect(0,0,210,297,'F');
      if(logo)fitImage(logo,left,22,74,74*164/740);
      font(10.5,'bold',ACCENT);doc.text(L.cover,left,82,{charSpace:1});
      font(26,'bold',WHITE);var coverTitle=lines(d.title||clientLabel(d)||L.devis,width);doc.text(coverTitle.slice(0,4),left,96,{lineHeightFactor:1.15});
      var cy=96+Math.min(coverTitle.length,4)*10.5+6;
      font(13,'normal',[205,211,222]);doc.text(txt(L.preparedFor+' '+(clientLabel(d)||'')),left,cy);
      font(10,'normal',[154,167,194]);doc.text(txt(L.no+' '+d.number+'   ·   '+formatDate(d.issue_date,lang)),left,cy+7);
      if(portfolioData.length){
        var gy=cy+20,gw=(width-6)/2,gh=portfolioData.length>2?52:70;
        portfolioData.forEach(function(data,i){var gx=left+(i%2)*(gw+6),yy=gy+Math.floor(i/2)*(gh+6);doc.setFillColor(17,28,43);doc.roundedRect(gx,yy,gw,gh,3,3,'F');fitImage(data,gx,yy,gw,gh);});
      }
      doc.setFillColor.apply(doc,ACCENT);doc.roundedRect(left,250,width,20,3,3,'F');
      font(10,'bold',NAVY);doc.text(txt(L.coverTotal).toUpperCase(),left+6,261.5);
      font(16,'bold',NAVY);doc.text(money(t.ttc,lang)+(d.vat_exempt?'':' TTC'),right-6,262,{align:'right'});
      font(9,'normal',[154,167,194]);doc.text(txt([companyName,website].filter(Boolean).join('   ·   ')),105,285,{align:'center'});
      doc.addPage();
    }

    // Header band: logo, website, contact, address and legal numbers on
    // navy (the logo artwork is gold on navy).
    var headerLines=[
      String(s.address||'').replace(/\s*\n\s*/g,', '),
      [s.phone||brand.phone,s.email].filter(Boolean).join('   ·   '),
      [s.legal_form,s.siret?L.siret+' '+s.siret:'',s.vat_number?L.vatNo+' '+s.vat_number:''].filter(Boolean).join('   ·   ')
    ].filter(Boolean);
    var bandH=Math.max(38,(website?33:28)+headerLines.length*4.4+3);
    doc.setFillColor.apply(doc,NAVY);doc.rect(0,0,210,bandH,'F');
    if(logo)fitImage(logo,left,10,52,52*164/740);
    else{font(18,'bold',ACCENT);doc.text(txt(companyName),left,20);}
    var hy=28;
    if(website){font(9.5,'bold',ACCENT);doc.text(txt(website),left,hy);hy+=5;}
    font(8,'normal',[205,211,222]);
    headerLines.forEach(function(line){doc.text(lines(line,128)[0],left,hy);hy+=4.4;});
    font(24,'bold',ACCENT);doc.text(isInvoice?L.facture:L.devis,right,19,{align:'right'});
    font(10,'normal',WHITE);doc.text(L.no+' '+txt(d.number),right,26.5,{align:'right'});
    doc.setFillColor.apply(doc,ACCENT);doc.rect(0,bandH,210,1.2,'F');

    // Document details (left) and client box (right)
    y=bandH+13;
    var details=isInvoice
      ?[[L.invDate,formatDate(d.issue_date,lang)],[L.due,formatDate(d.due_date,lang)||'—'],ctx.devisNumber?[L.devisRef,ctx.devisNumber]:null].filter(Boolean)
      :[[L.date,formatDate(d.issue_date,lang)],[L.valid,formatDate(d.valid_until,lang)||'—'],[L.ref,d.number]];
    details.forEach(function(cell,i){font(7.5,'bold',MUTED);doc.text(txt(cell[0]).toUpperCase(),left,y+i*10);font(10.5,'bold');doc.text(txt(cell[1]),left,y+i*10+5);});
    var detailsBottom=y+(details.length-1)*10+6;
    var boxX=110,boxW=right-boxX;
    var clientDetail=[d.client_company?d.client_name:'',d.client_address,d.client_email,d.client_phone,d.client_siret?L.siret+' '+d.client_siret:'',d.client_vat?L.vatNo+' '+d.client_vat:''].filter(Boolean).join('\n');
    font(9,'normal');var clientLines=lines(clientDetail,boxW-10);
    var boxH=Math.max(26,15+clientLines.length*4.3+4);
    doc.setFillColor.apply(doc,LIGHT);doc.roundedRect(boxX,y-5,boxW,boxH,2.5,2.5,'F');
    font(7.5,'bold',MUTED);doc.text(L.to,boxX+5,y);
    font(11,'bold');doc.text(lines(clientLabel(d),boxW-10)[0]||'',boxX+5,y+6);
    font(9,'normal',TEXT);doc.text(clientLines,boxX+5,y+11.5,{lineHeightFactor:1.35});
    y=Math.max(detailsBottom,y-5+boxH)+9;

    // Object + intro
    if(d.title){font(11,'bold');var titleLines=lines(L.object+' : '+d.title,width);doc.text(titleLines,left,y);y+=titleLines.length*5+1.5;}
    if(d.intro){font(9.5,'normal',TEXT);var introLines=lines(d.intro,width);ensure(introLines.length*4.5);doc.text(introLines,left,y+1,{lineHeightFactor:1.4});y+=introLines.length*4.6+3;}
    y+=2;

    // Lines table: sections (with subtotals), items, options, line discounts
    var items=d.items||[];
    var hasLineDiscount=items.some(function(i){return !isSection(i)&&num(i.discount_percent)>0;});
    var hasOptions=items.some(function(i){return !isSection(i)&&i.optional;});
    var cols=hasLineDiscount?6:5,body=[],stripe=0,section=null;
    function closeSection(){
      if(section&&section.count)body.push([{content:txt(L.sectionSub+' '+section.name),colSpan:cols-1,styles:{halign:'right',fontStyle:'bold',textColor:MUTED,fontSize:8.5,cellPadding:{top:2.2,bottom:3.2,left:3,right:3}}},{content:money(round2(section.total),lang),styles:{halign:'right',fontStyle:'bold',fontSize:9}}]);
      section=null;
    }
    items.forEach(function(item){
      if(isSection(item)){closeSection();section={name:item.name||'',total:0,count:0};stripe=0;body.push([{content:txt(item.name).toUpperCase(),colSpan:cols,styles:{fontStyle:'bold',fillColor:ACCENT_SOFT,textColor:NAVY,fontSize:9,cellPadding:{top:3,bottom:3,left:3,right:3}}}]);return;}
      var counted=isCounted(item),total=lineTotal(item),fill=stripe++%2?[250,250,251]:WHITE;
      if(section&&counted){section.total+=total;section.count++;}
      var prefix=item.optional?(item.selected?L.optionChosen:L.option)+' — ':'';
      var muted=item.optional&&!item.selected;
      var unit=unitLabel(item.unit,lang);
      if(item.billing==='monthly'&&item.unit!=='mois')unit=(unit?unit+' ':'')+L.perMonth;
      var base={fillColor:fill};
      var row=[
        {content:txt(prefix+(item.name||'')),styles:Object.assign({},base,{fontStyle:muted?'italic':'bold',textColor:muted?MUTED:TEXT,cellPadding:{top:3.2,bottom:item.description?1:3.2,left:3,right:3}})},
        {content:item.quantity==null||item.quantity===''?'':qty(item.quantity,lang),styles:base},
        {content:txt(unit),styles:base},
        {content:item.unit_price==null||item.unit_price===''?'':money(item.unit_price,lang),styles:base}
      ];
      if(hasLineDiscount)row.push({content:num(item.discount_percent)>0?'-'+percent(item.discount_percent,lang):'',styles:base});
      row.push({content:muted?'('+money(total,lang)+')':money(total,lang),styles:Object.assign({},base,{fontStyle:muted?'italic':'bold',textColor:muted?MUTED:TEXT})});
      body.push(row);
      if(item.description)body.push([{content:txt(item.description),colSpan:cols,styles:{fillColor:fill,textColor:MUTED,fontSize:8.5,cellPadding:{top:0,bottom:3.2,left:3,right:60}}}]);
    });
    closeSection();
    var head=[L.desc,{content:L.qty,styles:{halign:'right'}},L.unit,{content:L.pu,styles:{halign:'right'}}];
    if(hasLineDiscount)head.push({content:L.disc,styles:{halign:'right'}});
    head.push({content:L.total,styles:{halign:'right'}});
    var columnStyles={1:{halign:'right',cellWidth:14},2:{cellWidth:21},3:{halign:'right',cellWidth:26}};
    if(hasLineDiscount){columnStyles[4]={halign:'right',cellWidth:16};columnStyles[5]={halign:'right',cellWidth:28};}
    else columnStyles[4]={halign:'right',cellWidth:30};
    doc.autoTable({
      startY:y,theme:'plain',margin:{left:left,right:210-right,bottom:24,top:20},
      head:[head],body:body,
      headStyles:{fillColor:NAVY,textColor:WHITE,fontStyle:'bold',fontSize:8.5,cellPadding:3.2},
      bodyStyles:{fontSize:9.5,textColor:TEXT,cellPadding:3.2,valign:'top'},
      columnStyles:columnStyles
    });
    y=doc.lastAutoTable.finalY;
    doc.setDrawColor.apply(doc,LINE);doc.setLineWidth(.3);doc.line(left,y,right,y);
    y+=hasOptions?5:7;
    if(hasOptions){font(8,'italic',MUTED);doc.text(txt(L.optionsNote),left,y);y+=6;}

    // Bottom block — right: totals (+ signature box for a devis);
    // left: payment terms, bank details, conditions, legal mentions.
    var totalRows=[[L.subtotal,money(t.subtotal,lang)]];
    if(t.discount)totalRows.push([L.discount+' ('+percent(d.discount_percent,lang)+')','- '+money(t.discount,lang)],[L.totalHt,money(t.totalHt,lang)]);
    if(!d.vat_exempt)totalRows.push([L.vat+' ('+percent(d.vat_rate,lang)+')',money(t.vat,lang)]);
    var deducted=isInvoice?num(d.deposit_deducted):0;
    var leftBlocks=[];
    if(d.payment_terms)leftBlocks.push([L.payment,d.payment_terms]);
    if(s.iban)leftBlocks.push([L.bank,'IBAN '+s.iban+(s.bic?'\nBIC '+s.bic:'')]);
    if(d.notes)leftBlocks.push([L.notes,d.notes]);
    if(isInvoice&&s.invoice_legal_text)leftBlocks.push([L.legal,s.invoice_legal_text]);
    if(!isInvoice&&d.status==='sent'&&d.public_token)leftBlocks.push(['',L.onlineHint+'\n'+publicUrl(d)]);
    font(9,'normal');
    leftBlocks.forEach(function(b){b[2]=lines(b[1],92);});
    var leftH=leftBlocks.reduce(function(h,b){return h+5.5+b[2].length*4.1+5;},0);
    var signed=!isInvoice&&!!d.signed_at;
    var signH=isInvoice?0:(signed?34:26);
    var breakdown=t.monthlyTotal>0;
    var rightH=totalRows.length*6+10+(d.vat_exempt?6:0)+(!isInvoice&&t.deposit?8.5:0)+(deducted?17:0)+(breakdown?11:0)+(signH?5+signH:0);
    ensure(Math.max(leftH,rightH));
    var tx=118,tw=right-tx,ty=y;
    totalRows.forEach(function(r){font(9.5,'normal',MUTED);doc.text(txt(r[0]),tx+3,ty+4);font(9.5,'bold');doc.text(txt(r[1]),right-3,ty+4,{align:'right'});ty+=6;});
    function highlight(label,value){
      doc.setFillColor.apply(doc,NAVY);doc.roundedRect(tx,ty,tw,10,2,2,'F');
      font(10.5,'bold',WHITE);doc.text(txt(label),tx+3,ty+6.6);font(11.5,'bold',ACCENT);doc.text(txt(value),right-3,ty+6.6,{align:'right'});
      ty+=10;
    }
    if(deducted){
      font(9.5,'bold',TEXT);doc.text(txt(d.vat_exempt?L.net:L.ttc),tx+3,ty+4);doc.text(money(t.ttc,lang),right-3,ty+4,{align:'right'});ty+=6;
      font(9.5,'normal',MUTED);doc.text(txt(L.depositDeducted),tx+3,ty+4);font(9.5,'bold');doc.text('- '+money(deducted,lang),right-3,ty+4,{align:'right'});ty+=7;
      highlight(L.amountDue,money(round2(t.ttc-deducted),lang));
    }else highlight(d.vat_exempt?L.net:L.ttc,money(t.ttc,lang));
    if(d.vat_exempt){font(8,'italic',MUTED);doc.text(txt(s.vat_exempt_mention||'TVA non applicable, art. 293 B du CGI'),right,ty+4.5,{align:'right'});ty+=6;}
    if(!isInvoice&&t.deposit){font(9,'normal',MUTED);doc.text(txt(L.deposit+' ('+percent(d.deposit_percent,lang)+')'),tx+3,ty+6);font(9.5,'bold');doc.text(money(t.deposit,lang),right-3,ty+6,{align:'right'});ty+=8.5;}
    if(breakdown){
      font(8.5,'normal',MUTED);
      if(t.once)doc.text(txt(L.once+' : '+money(t.once,lang)+' HT'),right-3,ty+5,{align:'right'});
      doc.text(txt(L.monthly+' : '+money(t.monthlyPerMonth,lang)+' HT '+L.perMonth),right-3,ty+(t.once?9.5:5),{align:'right'});
      ty+=11;
    }
    if(signH){
      ty+=5;
      doc.setDrawColor.apply(doc,signed?ACCENT:LINE);doc.setLineWidth(.4);doc.roundedRect(tx,ty,tw,signH,2,2,'S');
      font(10,'bold');doc.text(L.sign,tx+4,ty+6.5);
      if(signed){
        if(signature)fitImage(signature,tx+4,ty+9,tw-8,15);
        font(7.5,'normal',MUTED);doc.text(lines(L.signedBy+' '+(d.signed_name||'')+' — '+formatDateTime(d.signed_at,lang),tw-8),tx+4,ty+28.5);
      }else{font(7.5,'normal',MUTED);doc.text(lines(L.signHint,tw-8),tx+4,ty+11.5,{lineHeightFactor:1.3});}
    }
    var py=y;
    leftBlocks.forEach(function(b){
      if(b[0]){font(7.5,'bold',MUTED);doc.text(txt(b[0]).toUpperCase(),left,py+3);}
      font(9,'normal',b[0]?TEXT:MUTED);doc.text(b[2],left,py+(b[0]?8.5:3),{lineHeightFactor:1.3});
      py+=(b[0]?5.5:0)+b[2].length*4.1+5;
    });

    // PAID / CANCELLED stamp on invoices
    if(isInvoice&&(d.status==='paid'||d.status==='cancelled')){
      var stampColor=d.status==='paid'?[26,127,60]:[220,38,38];
      doc.setPage(cover?2:1);font(40,'bold',stampColor);
      var stampAlpha=doc.GState?new doc.GState({opacity:.3}):null;if(stampAlpha)doc.setGState(stampAlpha);
      doc.text(d.status==='paid'?L.paid:L.cancelled,150,bandH+32,{angle:18,align:'center'});
      if(stampAlpha)doc.setGState(new doc.GState({opacity:1}));
      doc.setPage(doc.getNumberOfPages());
    }

    // Footer on every page (not on the cover)
    var footer=[companyName,s.legal_form,s.siret?L.siret+' '+s.siret:'',s.vat_number?L.vatNo+' '+s.vat_number:''].filter(Boolean).join(' · ');
    var footer2=[String(s.address||'').replace(/\s*\n\s*/g,', '),s.email,website].filter(Boolean).join(' · ');
    var pages=doc.getNumberOfPages();
    for(var p=cover?2:1;p<=pages;p++){
      doc.setPage(p);
      doc.setDrawColor.apply(doc,LINE);doc.setLineWidth(.3);doc.line(left,282,right,282);
      font(7.5,'normal',MUTED);
      doc.text(txt(footer),105,286.5,{align:'center',maxWidth:150});
      if(footer2)doc.text(txt(footer2),105,290.5,{align:'center',maxWidth:150});
      doc.text(L.page+' '+p+' / '+pages,right,286.5,{align:'right'});
    }
    doc.setProperties({title:(isInvoice?(lang==='en'?'Invoice ':'Facture '):(lang==='en'?'Quote ':'Devis '))+d.number,author:companyName,subject:d.title||''});
    return doc;
  }

  // ── Images (PNG / JPG) drawn from the PDF itself with pdf.js ──────
  function createCanvas(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function canvasToBlob(canvas,type,quality){return new Promise(function(resolve,reject){canvas.toBlob(function(blob){if(blob)resolve(blob);else reject(new Error('Could not create the image.'));},type,quality);});}
  // opts: { format: 'png'|'jpeg', stacked: bool (all pages in one image), scale }
  async function renderImages(doc,opts){
    opts=opts||{};
    if(!window.pdfjsLib){await loadScript(PDFJS_URL);}
    var lib=window.pdfjsLib;lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;
    var pdf=await lib.getDocument({data:new Uint8Array(doc.output('arraybuffer')),standardFontDataUrl:PDFJS_FONTS_URL}).promise;
    var scale=opts.scale||2;
    // Keep a stacked image under browsers' ~32k px canvas height limit.
    if(opts.stacked&&pdf.numPages>1)scale=Math.min(scale,30000/(pdf.numPages*842+24*pdf.numPages));
    var canvases=[];
    for(var i=1;i<=pdf.numPages;i++){
      var page=await pdf.getPage(i),viewport=page.getViewport({scale:scale});
      var canvas=Core.createCanvas(Math.round(viewport.width),Math.round(viewport.height)),context=canvas.getContext('2d');
      context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
      await page.render({canvasContext:context,viewport:viewport}).promise;
      canvases.push(canvas);
    }
    if(opts.stacked&&canvases.length>1){
      var gap=Math.round(12*scale),w=canvases[0].width,h=canvases.reduce(function(sum,c){return sum+c.height;},0)+gap*(canvases.length-1);
      var sheet=Core.createCanvas(w,h),ctx=sheet.getContext('2d'),offset=0;
      ctx.fillStyle='#d9dde3';ctx.fillRect(0,0,w,h);
      canvases.forEach(function(c){ctx.drawImage(c,0,offset);offset+=c.height+gap;});
      canvases=[sheet];
    }
    var type=opts.format==='jpeg'?'image/jpeg':'image/png';
    return Promise.all(canvases.map(function(c){return Core.canvasToBlob(c,type,.88);}));
  }
  function downloadBlob(blob,filename){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},4000);}
  // Saves the document as PDF, PNG, JPG or one stacked PNG.
  async function exportDoc(doc,base,format){
    if(format==='pdf'){doc.save(base+'.pdf');return;}
    var stacked=format==='stacked',ext=format==='jpeg'?'jpg':'png';
    var blobs=await renderImages(doc,{format:format==='jpeg'?'jpeg':'png',stacked:stacked});
    blobs.forEach(function(blob,i){Core.downloadBlob(blob,base+(blobs.length>1?'-page-'+(i+1):'')+'.'+ext);});
  }
  function whatsappDigits(phone){var digits=String(phone||'').replace(/\D/g,'');if(/^0[1-9]\d{8}$/.test(digits))digits='33'+digits.slice(1);return digits.length>=8?digits:'';}

  var Core=window.SBDevisCore={
    num:num,round2:round2,money:money,percent:percent,qty:qty,plainSpaces:plainSpaces,todayIso:todayIso,addDays:addDays,formatDate:formatDate,formatDateTime:formatDateTime,unitLabel:unitLabel,
    isSection:isSection,autoLineTotal:autoLineTotal,lineTotal:lineTotal,isCounted:isCounted,computeTotals:computeTotals,
    publicUrl:publicUrl,fileBase:fileBase,clientLabel:clientLabel,loadScript:loadScript,
    buildPdf:buildPdf,renderImages:renderImages,exportDoc:exportDoc,downloadBlob:downloadBlob,whatsappDigits:whatsappDigits,
    createCanvas:createCanvas,canvasToBlob:canvasToBlob,COPY:COPY
  };
})();
