(function(){
  var dataLayer=window.dataLayer=window.dataLayer||[];
  function track(name,params){dataLayer.push(Object.assign({event:name},params||{}));}
  document.querySelectorAll('[data-track]').forEach(function(el){el.addEventListener('click',function(){track(el.dataset.track,{link_text:(el.textContent||'').trim(),link_url:el.href||''});});});
  document.querySelectorAll('[data-site-choice]').forEach(function(el){el.addEventListener('click',function(){track('butcher_website_choice',{choice:el.dataset.siteChoice});});});
  var form=document.querySelector('[data-audit-form]');
  if(form){var started=false;form.addEventListener('focusin',function(){if(!started){started=true;track('free_butcher_audit_start');}});form.addEventListener('submit',function(){track('free_butcher_audit_submit');});}
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:.12});
  document.querySelectorAll('.bm-reveal').forEach(function(el){observer.observe(el);});
  document.querySelectorAll('[data-bm-slider]').forEach(function(slider){
    var track=slider.querySelector('[data-bm-track]'),slides=slider.querySelectorAll('[data-bm-slide]'),dots=slider.querySelectorAll('[data-bm-dot]'),index=0;
    function show(next){index=(next+slides.length)%slides.length;track.style.transform='translateX(-'+(index*100)+'%)';dots.forEach(function(dot,i){dot.setAttribute('aria-current',String(i===index));});}
    slider.querySelector('[data-bm-prev]').addEventListener('click',function(){show(index-1);});
    slider.querySelector('[data-bm-next]').addEventListener('click',function(){show(index+1);});
    dots.forEach(function(dot,i){dot.addEventListener('click',function(){show(i);});});
    show(0);
  });
  [25,50,75,90].forEach(function(depth){var sent=false;window.addEventListener('scroll',function(){if(!sent&&100*(window.scrollY+window.innerHeight)/document.documentElement.scrollHeight>=depth){sent=true;track('scroll_depth',{percent:depth});}},{passive:true});});
})();
