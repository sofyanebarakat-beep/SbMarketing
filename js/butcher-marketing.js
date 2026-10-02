(function(){
  var dataLayer=window.dataLayer=window.dataLayer||[];
  function track(name,params){dataLayer.push(Object.assign({event:name},params||{}));}
  document.querySelectorAll('[data-track]').forEach(function(el){el.addEventListener('click',function(){track(el.dataset.track,{link_text:(el.textContent||'').trim(),link_url:el.href||''});});});
  document.querySelectorAll('[data-site-choice]').forEach(function(el){el.addEventListener('click',function(){track('butcher_website_choice',{choice:el.dataset.siteChoice});});});
  var form=document.querySelector('[data-audit-form]');
  if(form){var started=false;form.addEventListener('focusin',function(){if(!started){started=true;track('free_butcher_audit_start');}});form.addEventListener('submit',async function(event){
    track('free_butcher_audit_submit');
    if(form.dataset.saving==='true')return;
    event.preventDefault();
    var config=window.SB_SUPABASE,button=form.querySelector('[type="submit"]'),status=form.querySelector('[data-form-status]'),data=new FormData(form),isFrench=form.dataset.language==='fr';
    button.disabled=true;button.textContent=isFrench?'Envoi en cours…':'Sending…';if(status)status.textContent=isFrench?'Enregistrement sécurisé de votre demande…':'Securely saving your request…';
    if(config){
      try{
        await fetch(config.url+'/rest/v1/butcher_leads',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({language:form.dataset.language||'fr',full_name:data.get('name'),butcher_shop:data.get('butcher_shop'),phone:data.get('phone'),email:data.get('email'),city_country:data.get('city_country'),website:data.get('website')||null,has_website:data.get('has_website'),privacy_consent:data.get('privacy_consent')==='on',source_page:location.pathname})}).then(function(response){if(!response.ok)throw new Error('Database request failed');});
      }catch(error){track('free_butcher_audit_database_error');}
    }
    form.dataset.saving='true';form.submit();
  });}
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:.12});
  document.querySelectorAll('.bm-reveal').forEach(function(el){observer.observe(el);});
  document.querySelectorAll('[data-bm-slider]').forEach(function(slider){
    var track=slider.querySelector('[data-bm-track]'),slides=slider.querySelectorAll('[data-bm-slide]'),dots=slider.querySelectorAll('[data-bm-dot]'),count=slider.querySelector('[data-bm-count]'),index=0;
    function show(next){index=(next+slides.length)%slides.length;track.style.transform='translateX(-'+(index*100)+'%)';dots.forEach(function(dot,i){dot.setAttribute('aria-current',String(i===index));});if(count)count.textContent=(index+1)+' / '+slides.length;}
    slider.querySelector('[data-bm-prev]').addEventListener('click',function(){show(index-1);});
    slider.querySelector('[data-bm-next]').addEventListener('click',function(){show(index+1);});
    dots.forEach(function(dot,i){dot.addEventListener('click',function(){show(i);});});
    show(0);
  });
  var mobileCta=document.querySelector('.bm-mobile-cta');
  if(mobileCta){var updateMobileCta=function(){mobileCta.classList.toggle('is-visible',window.scrollY>Math.min(420,window.innerHeight*.55));};window.addEventListener('scroll',updateMobileCta,{passive:true});updateMobileCta();}
  [25,50,75,90].forEach(function(depth){var sent=false;window.addEventListener('scroll',function(){if(!sent&&100*(window.scrollY+window.innerHeight)/document.documentElement.scrollHeight>=depth){sent=true;track('scroll_depth',{percent:depth});}},{passive:true});});
})();
