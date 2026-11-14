(function(){
  'use strict';
  document.querySelectorAll('[data-climanova-dashboard]').forEach(function(dashboard){
    var count=dashboard.querySelector('[data-dashboard-count]');
    var rate=dashboard.querySelector('[data-dashboard-rate]');
    var bar=dashboard.querySelector('[data-dashboard-bar]');
    dashboard.addEventListener('click',function(event){
      var button=event.target.closest('[data-dashboard-stage]');
      if(!button)return;
      dashboard.querySelectorAll('[data-dashboard-stage]').forEach(function(item){
        var active=item===button;
        item.classList.toggle('is-active',active);
        item.setAttribute('aria-pressed',active?'true':'false');
      });
      count.textContent=button.dataset.count;
      rate.textContent=button.dataset.rate+'%';
      bar.style.width=button.dataset.rate+'%';
    });
  });
})();
