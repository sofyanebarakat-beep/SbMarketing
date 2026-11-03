/* Shared Dashly-style shell behaviour for the admin and client dashboards:
   opens the sidebar group holding the active link, mobile slide-in menu,
   profile dropdown (closes on outside click, proxies Log out). */
(function(){
  var nav=document.querySelector('.sidebar-nav,.cd-nav');
  function openActiveGroup(){
    if(!nav)return;
    var active=nav.querySelector('.is-active');
    var group=active&&active.closest('details');
    if(group&&!group.open)group.open=true;
  }
  if(nav&&'MutationObserver' in window){
    new MutationObserver(openActiveGroup).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  openActiveGroup();

  function setMenu(open){document.body.classList.toggle('sidebar-open',open);}
  document.querySelectorAll('[data-sidebar-toggle]').forEach(function(el){
    el.addEventListener('click',function(){setMenu(!document.body.classList.contains('sidebar-open'));});
  });
  if(nav)nav.addEventListener('click',function(event){if(event.target.closest('a'))setMenu(false);});

  var profile=document.querySelector('.profile-menu');
  document.addEventListener('click',function(event){
    if(profile&&profile.open&&!profile.contains(event.target))profile.open=false;
  });
  if(profile)profile.addEventListener('click',function(event){if(event.target.closest('a'))profile.open=false;});
  var logout=document.querySelector('[data-profile-logout]');
  if(logout)logout.addEventListener('click',function(){
    if(profile)profile.open=false;
    var real=document.querySelector('[data-logout]');if(real)real.click();
  });
})();

/* Mirror the page title into the top bar, like the reference's "Dashboard" label. */
(function(){
  var source=document.querySelector('[data-view-title],[data-client-name]'),target=document.querySelector('[data-topbar-title]');
  if(!source||!target||!('MutationObserver' in window))return;
  function sync(){if(source.textContent.trim())target.textContent=source.textContent.trim();}
  new MutationObserver(sync).observe(source,{childList:true,characterData:true,subtree:true});sync();
})();
