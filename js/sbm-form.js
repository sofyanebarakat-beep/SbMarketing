/* SB Marketing sign-up form widget. Embed with:
   <div data-sbm-form="FORM_ID"></div><script src="https://www.sbmarketing.fr/js/sbm-form.js" async></script>
   Renders the form configured in admin → Marketing → Sign-up forms and adds
   the person to the form's groups through the public em_subscribe RPC. */
(function(){
  'use strict';
  var URL_='https://juoyoqcmpqkcwsdtanhv.supabase.co',KEY='sb_publishable_Wn1V8FZCZ1C05UdtYopqvA_K5PpKPEN';
  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
  function rpc(name,body){return fetch(URL_+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.message||'Error');return d;});});}
  var CSS='.sbmf{font-family:Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#041021;background:#fff;border:1px solid #e9eaf3;border-radius:20px;padding:28px;max-width:440px;box-sizing:border-box;box-shadow:0 8px 28px rgba(11,22,44,.08)}.sbmf *{box-sizing:border-box}.sbmf h3{margin:0 0 6px;font-size:22px;line-height:1.25}.sbmf p{margin:0 0 18px;color:#6f7182;font-size:14px;line-height:1.55}.sbmf label{display:block;margin:0 0 12px;font-size:13px;font-weight:600}.sbmf input[type=email],.sbmf input[type=text],.sbmf input[type=tel]{display:block;width:100%;margin-top:6px;padding:12px 14px;border:1px solid #e9eaf3;border-radius:12px;font:inherit;font-size:15px}.sbmf input:focus{outline:0;border-color:#041021}.sbmf .sbmf-consent{display:flex;gap:8px;align-items:flex-start;font-weight:400;color:#6f7182;font-size:12px}.sbmf .sbmf-consent input{margin-top:2px}.sbmf button{width:100%;border:0;border-radius:48px;padding:14px 20px;color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer}.sbmf button[disabled]{opacity:.6}.sbmf .sbmf-msg{margin:10px 0 0;font-size:13px;color:#dc2b2b;min-height:1em}.sbmf .sbmf-ok{text-align:center;padding:18px 0}.sbmf .sbmf-ok b{display:block;font-size:40px;margin-bottom:6px}.sbmf .sbmf-hp{position:absolute;left:-9999px}';
  function mount(el){
    if(el.dataset.sbmMounted)return;el.dataset.sbmMounted='1';var id=el.getAttribute('data-sbm-form');
    if(!document.getElementById('sbmf-css')){var st=document.createElement('style');st.id='sbmf-css';st.textContent=CSS;document.head.appendChild(st);}
    el.innerHTML='<div class="sbmf"><p>…</p></div>';
    rpc('em_form_public',{target_form:id}).then(function(f){
      if(!f){el.innerHTML='<div class="sbmf"><p>Ce formulaire n’est plus disponible.</p></div>';return;}
      var accent=(f.design&&f.design.accent)||'#041021',types={email:'email',phone:'tel'};
      el.innerHTML='<form class="sbmf" novalidate>'+(f.title?'<h3>'+esc(f.title)+'</h3>':'')+(f.description?'<p>'+esc(f.description)+'</p>':'')+
        (f.fields||[{key:'email',label:'Email',required:true}]).map(function(x){return '<label>'+esc(x.label)+(x.required?' *':'')+'<input type="'+(types[x.key]||'text')+'" name="'+esc(x.key)+'"'+(x.required?' required':'')+(x.key==='email'?' autocomplete="email"':'')+'></label>';}).join('')+
        '<input class="sbmf-hp" type="text" name="website_hp" tabindex="-1" autocomplete="off" aria-hidden="true">'+
        (f.consent_text?'<label class="sbmf-consent"><input type="checkbox" name="consent" required> <span>'+esc(f.consent_text)+'</span></label>':'')+
        '<button type="submit" style="background:'+esc(accent)+'">'+esc(f.button_label||'Je m’inscris')+'</button><p class="sbmf-msg" aria-live="polite"></p></form>';
      var form=el.querySelector('form'),msg=form.querySelector('.sbmf-msg');
      form.addEventListener('submit',function(e){
        e.preventDefault();msg.textContent='';
        if(form.website_hp.value)return;
        var data={},missing=false;[].forEach.call(form.querySelectorAll('input[name]'),function(i){if(i.name==='website_hp'||i.name==='consent')return;data[i.name]=i.value.trim();if(i.required&&!data[i.name])missing=true;});
        if(missing){msg.textContent='Merci de remplir les champs obligatoires.';return;}
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email||'')){msg.textContent='Adresse email invalide.';return;}
        if(form.consent&&!form.consent.checked){msg.textContent='Merci de cocher la case de consentement.';return;}
        var btn=form.querySelector('button');btn.disabled=true;
        rpc('em_subscribe',{target_form:id,target_email:data.email,target_name:data.name||null,target_fields:data})
          .then(function(){el.innerHTML='<div class="sbmf"><div class="sbmf-ok"><b>✅</b><h3>'+esc(f.success_title||'Merci !')+'</h3><p>'+esc(f.success_message||'Votre inscription est confirmée.')+'</p></div></div>';})
          .catch(function(){btn.disabled=false;msg.textContent='Une erreur est survenue. Réessayez dans un instant.';});
      });
    }).catch(function(){el.innerHTML='<div class="sbmf"><p>Formulaire indisponible pour le moment.</p></div>';});
  }
  function init(){[].forEach.call(document.querySelectorAll('[data-sbm-form]'),mount);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.SBMForm={mount:mount};
})();
