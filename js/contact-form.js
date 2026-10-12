// Native contact form for /contact/ and /en/contact/ (replaced the
// sbmarketing2.lovable.app iframe). Submissions go to the submit-contact
// Edge Function (saves to contact_submissions + emails the admin); if that
// is unreachable they are inserted straight into the table so no lead is
// lost. They appear in /admin/#contacts.
(function(){
  var form=document.querySelector('[data-contact-form]');if(!form)return;
  var lang=form.dataset.language==='en'?'en':'fr',config=window.SB_SUPABASE;
  var dataLayer=window.dataLayer=window.dataLayer||[];
  function track(name,params){dataLayer.push(Object.assign({event:name,form_language:lang},params||{}));}

  // ISO code + dial code; names come from Intl.DisplayNames in the page language.
  var RAW='AF+93 ZA+27 AL+355 DZ+213 DE+49 AD+376 AO+244 AG+1-268 SA+966 AR+54 AM+374 AU+61 AT+43 AZ+994 BS+1-242 BH+973 '+
    'BD+880 BB+1-246 BE+32 BZ+501 BJ+229 BT+975 BY+375 MM+95 BO+591 BA+387 BW+267 BR+55 BN+673 BG+359 BF+226 '+
    'BI+257 KH+855 CM+237 CA+1 CV+238 CF+236 CL+56 CN+86 CY+357 CO+57 KM+269 CD+243 CG+242 KP+850 KR+82 CR+506 '+
    'CI+225 HR+385 CU+53 DK+45 DJ+253 DM+1-767 EG+20 AE+971 EC+593 ER+291 ES+34 EE+372 SZ+268 US+1 ET+251 FJ+679 '+
    'FI+358 FR+33 GA+241 GM+220 GE+995 GH+233 GR+30 GD+1-473 GT+502 GN+224 GQ+240 GW+245 GY+592 HT+509 HN+504 '+
    'HU+36 IN+91 ID+62 IQ+964 IR+98 IE+353 IS+354 IL+972 IT+39 JM+1-876 JP+81 JO+962 KZ+7 KE+254 KG+996 KI+686 '+
    'KW+965 LA+856 LS+266 LV+371 LB+961 LR+231 LY+218 LI+423 LT+370 LU+352 MK+389 MG+261 MY+60 MW+265 MV+960 '+
    'ML+223 MT+356 MA+212 MU+230 MR+222 MX+52 FM+691 MD+373 MC+377 MN+976 ME+382 MZ+258 NA+264 NR+674 NP+977 '+
    'NI+505 NE+227 NG+234 NO+47 NZ+64 OM+968 UG+256 UZ+998 PK+92 PW+680 PS+970 PA+507 PG+675 PY+595 NL+31 PE+51 '+
    'PH+63 PL+48 PT+351 QA+974 DO+1-809 CZ+420 RO+40 GB+44 RU+7 RW+250 KN+1-869 VC+1-784 LC+1-758 SB+677 SV+503 '+
    'WS+685 ST+239 SN+221 RS+381 SC+248 SL+232 SG+65 SK+421 SI+386 SO+252 SD+249 SS+211 LK+94 SE+46 CH+41 SR+597 '+
    'SY+963 TJ+992 TZ+255 TD+235 TH+66 TL+670 TG+228 TO+676 TT+1-868 TN+216 TM+993 TR+90 TV+688 UA+380 UY+598 '+
    'VU+678 VA+379 VE+58 VN+84 YE+967 ZM+260 ZW+263';
  var names=null;try{names=new Intl.DisplayNames([lang],{type:'region'});}catch(e){}
  var countries=RAW.split(' ').map(function(item){var iso=item.slice(0,2);return{iso:iso,code:item.slice(2),name:(names&&names.of(iso))||iso,flag:String.fromCodePoint.apply(null,iso.split('').map(function(c){return c.charCodeAt(0)+127397;}))};}).sort(function(a,b){return a.name.localeCompare(b.name,lang);});
  var selected=countries.find(function(c){return c.iso==='FR';});

  var picker=form.querySelector('[data-country-picker]'),toggle=picker.querySelector('[data-country-toggle]'),label=picker.querySelector('[data-country-label]'),panel=picker.querySelector('[data-country-panel]'),searchInput=picker.querySelector('[data-country-search]'),list=picker.querySelector('[data-country-list]'),prefix=form.querySelector('[data-phone-prefix]');
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function select(country){selected=country;label.textContent=country.flag+' '+country.name+' ('+country.code+')';prefix.textContent=country.code;}
  function renderList(){var term=searchInput.value.trim().toLowerCase(),matches=countries.filter(function(c){return!term||c.name.toLowerCase().indexOf(term)>-1||c.code.indexOf(term)>-1;});list.innerHTML=matches.length?matches.map(function(c){return'<li><button type="button" role="option" data-iso="'+c.iso+'" aria-selected="'+(c===selected)+'"><span>'+c.flag+'</span><span class="cf-country-name">'+escapeHtml(c.name)+'</span><span class="cf-country-code">'+c.code+'</span></button></li>';}).join(''):'<li class="cf-country-empty">'+(lang==='en'?'No country found':'Aucun pays trouvé')+'</li>';}
  function open(state){panel.hidden=!state;toggle.setAttribute('aria-expanded',String(state));if(state){searchInput.value='';renderList();searchInput.focus();}}
  toggle.addEventListener('click',function(){open(panel.hidden);});
  searchInput.addEventListener('input',renderList);
  list.addEventListener('click',function(event){var btn=event.target.closest('[data-iso]');if(!btn)return;select(countries.find(function(c){return c.iso===btn.dataset.iso;}));open(false);toggle.focus();});
  document.addEventListener('mousedown',function(event){if(!picker.contains(event.target))open(false);});
  picker.addEventListener('keydown',function(event){if(event.key==='Escape'){open(false);toggle.focus();}});
  select(selected);
  // Pre-select the visitor's country from their IP, like the previous form did.
  fetch('https://ipwho.is/').then(function(r){return r.ok?r.json():null;}).then(function(geo){if(!geo||geo.success===false||!geo.country_code)return;var match=countries.find(function(c){return c.iso===String(geo.country_code).toUpperCase();});if(match)select(match);}).catch(function(){});

  var started=false;form.addEventListener('focusin',function(){if(!started){started=true;track('contact_form_start');}});
  form.addEventListener('submit',async function(event){
    event.preventDefault();
    var button=form.querySelector('[type="submit"]'),status=form.querySelector('[data-form-status]'),data=new FormData(form),phone=String(data.get('phone')||'').trim();
    // Where the lead came from — remembered across pages by /js/utm-capture.js.
    var attribution=typeof window.sbAttribution==='function'?window.sbAttribution():{};
    var payload=Object.assign({language:lang,name:data.get('name'),company:data.get('company'),email:data.get('email'),country:selected.name,phone:phone?selected.code+' '+phone:'',service:data.get('service'),message:data.get('message'),website:data.get('website'),privacy_consent:data.get('privacy_consent')==='on',source_page:(location.pathname+location.search).slice(0,200)},attribution);
    button.disabled=true;button.textContent=lang==='en'?'Sending…':'Envoi en cours...';status.textContent='';
    var saved=false;
    if(config){
      try{var response=await fetch(config.url+'/functions/v1/submit-contact',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify(payload)});saved=response.ok;}catch(error){}
      if(!saved){
        try{var fallback=await fetch(config.url+'/rest/v1/contact_submissions',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({language:lang,full_name:payload.name,company:payload.company||null,email:payload.email,country:payload.country,phone:payload.phone||null,service:payload.service,message:payload.message,privacy_consent:payload.privacy_consent,source_page:payload.source_page,utm_source:attribution.utm_source||null,utm_medium:attribution.utm_medium||null,utm_campaign:attribution.utm_campaign||null,utm_content:attribution.utm_content||null,utm_term:attribution.utm_term||null,landing_page:attribution.landing_page||null,referrer:attribution.referrer||null})});saved=fallback.ok;}catch(error){}
      }
    }
    if(!saved){
      track('contact_form_error');
      button.disabled=false;button.textContent=lang==='en'?'Send message':'Envoyer le message';
      status.textContent=lang==='en'?'Something went wrong. Please try again or call us on +33 7 45 11 53 91.':'Une erreur est survenue. Réessayez ou appelez-nous au 07 45 11 53 91.';
      return;
    }
    track('contact_form_submit',{service:payload.service,lead_source:attribution.utm_source||'direct'});
    track('generate_lead',{form_name:'contact'});
    form.querySelector('[data-form-fields]').hidden=true;
    form.querySelector('[data-form-success]').hidden=false;
  });
})();
