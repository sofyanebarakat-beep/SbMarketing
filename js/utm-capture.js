// Remembers where a visitor came from, so the contact form can save it with
// the lead (contact_submissions.utm_* / landing_page / referrer). Loaded on
// every public page: a visitor often lands on a service page from an ad and
// only reaches /contact/ later. Keeps the latest campaign touch for 30 days;
// a plain direct visit never overwrites it.
(function(){
  var KEY='sb_attribution',MAX_AGE=30*24*60*60*1000;
  try{
    var params=new URLSearchParams(location.search),touch=null;
    var utm={};['source','medium','campaign','content','term'].forEach(function(k){var v=params.get('utm_'+k);if(v)utm['utm_'+k]=v.slice(0,200);});
    if(utm.utm_source)touch=utm;
    else if(params.get('gclid')||params.get('gbraid')||params.get('wbraid'))touch={utm_source:'google',utm_medium:'cpc'};
    else if(params.get('fbclid'))touch={utm_source:'facebook',utm_medium:'social'};
    // ?ref=<client> comes from the "Recommend us on WhatsApp" banner in client emails.
    else if(params.get('ref'))touch={utm_source:'whatsapp',utm_medium:'referral',utm_campaign:'client_share',utm_content:params.get('ref').slice(0,100)};
    else if(document.referrer){
      var host='';try{host=new URL(document.referrer).hostname.replace(/^www\./,'');}catch(e){}
      if(host&&host!==location.hostname.replace(/^www\./,'')){
        var search=/(^|\.)(google|bing|yahoo|duckduckgo|ecosia|qwant|yandex)\./.exec(host);
        touch=search?{utm_source:search[2],utm_medium:'organic'}:{utm_source:host,utm_medium:'referral'};
      }
    }
    if(touch){
      touch.landing_page=(location.pathname+location.search).slice(0,300);
      touch.referrer=(document.referrer||'').slice(0,300)||null;
      touch.at=Date.now();
      localStorage.setItem(KEY,JSON.stringify(touch));
    }
  }catch(e){}
  // Read by js/contact-form.js.
  window.sbAttribution=function(){
    try{var data=JSON.parse(localStorage.getItem(KEY)||'null');if(data&&Date.now()-data.at<MAX_AGE){var copy=Object.assign({},data);delete copy.at;return copy;}}catch(e){}
    return{};
  };
})();
