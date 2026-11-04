/* SB Marketing admin — Email marketing (MailerLite-style).
   Dashboard · Subscribers · Groups · Campaigns (+ reports) · Automations ·
   Templates (drag & drop block builder) · Sign-up forms.
   Data lives in the em_* tables (supabase/email_marketing.sql). Emails go
   out one by one through the existing send-client-report Edge Function
   (type "html"; falls back to "custom" on an older deployment). Scheduled
   campaigns and automation steps are sent by this page while it is open. */
(function(){
  'use strict';
  var config=window.SB_SUPABASE,SESSION_KEY='sb_admin_session',SITE='https://www.sbmarketing.fr';
  var TABS=['email','email-subscribers','email-groups','email-campaigns','email-automations','email-templates','email-forms'];
  var state={loaded:false,loading:null,missing:false,subs:[],groups:[],members:[],templates:[],campaigns:[],automations:[],forms:[],sends:[],runs:[],brand:{}};
  var ui={subSearch:'',subStatus:'',subGroup:'',selected:{},campaignFilter:'',current:null};
  var htmlUnsupported=false,busy=false;

  // ── Utilities ────────────────────────────────────────────────
  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];});}
  function uid(){return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function fmtDate(v,withTime){if(!v)return '—';var d=new Date(v);return new Intl.DateTimeFormat('en-GB',withTime?{dateStyle:'medium',timeStyle:'short'}:{dateStyle:'medium'}).format(d);}
  function pct(a,b){return b?Math.round(a/b*1000)/10+'%':'—';}
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function safeUrl(v){try{var u=new URL(v);return(u.protocol==='http:'||u.protocol==='https:')?u.href:'';}catch(e){return '';}}
  function validEmail(v){return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v||'').trim());}
  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(e){return null;}}
  async function refresh(){var s=session();if(!s||!s.refresh_token)return null;var r=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok)return null;var next=await r.json();localStorage.setItem(SESSION_KEY,JSON.stringify(next));return next;}
  async function rawFetch(url,options,retry){var s=session();var headers=Object.assign({apikey:config.key,Authorization:'Bearer '+(s?s.access_token:config.key)},options&&options.headers||{});var res=await fetch(url,Object.assign({},options||{},{headers:headers}));if(res.status===401&&!retry&&await refresh())return rawFetch(url,options,true);return res;}
  async function api(path,options){var res=await rawFetch(config.url+path,options);if(!res.ok){var d=await res.json().catch(function(){return{};});var err=new Error(d.message||d.error||('Request failed ('+res.status+')'));err.code=d.code;err.status=res.status;throw err;}if(res.status===204)return null;var text=await res.text();return text?JSON.parse(text):null;}
  async function fetchAll(path){var out=[],from=0,size=1000;for(;;){var res=await rawFetch(config.url+path,{headers:{Range:from+'-'+(from+size-1),'Range-Unit':'items'}});if(!res.ok){var d=await res.json().catch(function(){return{};});var err=new Error(d.message||('Request failed ('+res.status+')'));err.code=d.code;throw err;}var rows=await res.json();out=out.concat(rows);if(rows.length<size)break;from+=size;}return out;}
  function post(table,body,ret){return api('/rest/v1/'+table,{method:'POST',headers:{'Content-Type':'application/json',Prefer:ret===false?'return=minimal':'return=representation'},body:JSON.stringify(body)});}
  function patch(table,filter,body){return api('/rest/v1/'+table+'?'+filter,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)});}
  function del(table,filter){return api('/rest/v1/'+table+'?'+filter,{method:'DELETE'});}
  async function invoke(name,payload){var res=await rawFetch(config.url+'/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});var body=await res.json().catch(function(){return{};});if(!res.ok)throw new Error(body.error||('Send failed ('+res.status+')'));return body;}
  function toast(text,kind){var t=document.createElement('div');t.className='em-toast'+(kind?' em-toast--'+kind:'');t.textContent=text;document.body.appendChild(t);setTimeout(function(){t.classList.add('is-out');},2600);setTimeout(function(){t.remove();},3100);}
  function badge(status){return '<span class="em-badge em-badge--'+esc(status)+'">'+esc(String(status||'').replace(/_/g,' '))+'</span>';}
  function icon(name){var p={users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',send:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',layout:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',form:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h4"/>',folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',click:'<path d="m9 9 5 12 1.8-5.2L21 14z"/><path d="M7.2 2.2 8 5.1M5.1 8l-2.9-.8M14 4.1 12 6M6 12l-1.9 2"/>'}[name]||'';return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';}

  // ── Data ─────────────────────────────────────────────────────
  async function load(force){
    if(state.loaded&&!force)return;
    if(state.loading)return state.loading;
    state.loading=(async function(){
      try{
        var r=await Promise.all([
          fetchAll('/rest/v1/em_subscribers?select=*&order=created_at.desc'),
          api('/rest/v1/em_groups?select=*&order=created_at'),
          fetchAll('/rest/v1/em_subscriber_groups?select=subscriber_id,group_id,added_at'),
          api('/rest/v1/em_templates?select=*&order=updated_at.desc'),
          api('/rest/v1/em_campaigns?select=*&order=created_at.desc'),
          api('/rest/v1/em_automations?select=*&order=created_at.desc'),
          api('/rest/v1/em_forms?select=*&order=created_at.desc'),
          fetchAll('/rest/v1/em_sends?select=id,sent_at,campaign_id,automation_id,subscriber_id,email,subject,status,error,clicks,clicked_at&order=sent_at.desc'),
          fetchAll('/rest/v1/em_automation_runs?select=id,automation_id,subscriber_id,step_index,next_run_at,status,last_error'),
          api('/rest/v1/app_settings?id=eq.default&select=*&limit=1').catch(function(){return[];})
        ]);
        state.subs=r[0];state.groups=r[1];state.members=r[2];state.templates=r[3];state.campaigns=r[4];state.automations=r[5];state.forms=r[6];state.sends=r[7];state.runs=r[8];state.brand=(r[9]&&r[9][0])||{};
        state.loaded=true;state.missing=false;
      }catch(error){
        if(error.code==='42P01'||error.code==='PGRST205'||/em_|does not exist|schema cache/i.test(error.message)){state.missing=true;state.loaded=true;}
        else throw error;
      }finally{state.loading=null;}
    })();
    return state.loading;
  }
  function groupName(id){var g=state.groups.find(function(x){return x.id===id;});return g?g.name:'Deleted group';}
  function groupsOf(subId){return state.members.filter(function(m){return m.subscriber_id===subId;}).map(function(m){return m.group_id;});}
  function membersOf(groupId){var ids={};state.members.forEach(function(m){if(m.group_id===groupId)ids[m.subscriber_id]=true;});return state.subs.filter(function(s){return ids[s.id];});}
  function subById(id){return state.subs.find(function(s){return s.id===id;});}
  function fullName(s){return [s.name,s.last_name].filter(Boolean).join(' ');}
  function audienceOf(audience){
    audience=audience||{mode:'all'};
    var active=state.subs.filter(function(s){return s.status==='active';});
    var list=active;
    if(audience.mode==='groups'){var inc={};state.members.forEach(function(m){if((audience.groups||[]).indexOf(m.group_id)>-1)inc[m.subscriber_id]=true;});list=active.filter(function(s){return inc[s.id];});}
    if((audience.exclude_groups||[]).length){var ex={};state.members.forEach(function(m){if(audience.exclude_groups.indexOf(m.group_id)>-1)ex[m.subscriber_id]=true;});list=list.filter(function(s){return !ex[s.id];});}
    if(audience.language)list=list.filter(function(s){return s.language===audience.language;});
    return list;
  }

  // ── Email rendering (builder → table-based HTML) ─────────────
  var DEFAULT_DESIGN={bg:'#f4f5f7',content_bg:'#ffffff',accent:'#041021',text:'#374151',heading:'#111c2b',font:'Arial, Helvetica, sans-serif',width:600,radius:20,header:true,header_bg:'#041021',logo_url:'',footer:true,footer_text:''};
  var FONTS=[['Arial, Helvetica, sans-serif','Arial'],['Helvetica, Arial, sans-serif','Helvetica'],['Georgia, serif','Georgia'],["'Trebuchet MS', sans-serif",'Trebuchet'],['Verdana, Geneva, sans-serif','Verdana'],["'Courier New', monospace",'Courier']];
  function design(doc){return Object.assign({},DEFAULT_DESIGN,doc&&doc.design||{});}
  function inline(text,d){
    var s=esc(text);
    s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|tel:[^)\s]+)\)/g,function(_,label,url){return '<a href="'+url+'" style="color:'+d.accent+';font-weight:700;text-decoration:underline;">'+label+'</a>';});
    s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>');
    return s;
  }
  function richText(text,d,size,align,color){
    var pStyle='margin:0 0 14px;font-size:'+(size||15)+'px;line-height:1.65;color:'+(color||d.text)+';text-align:'+(align||'left')+';';
    return String(text||'').split(/\n{2,}/).map(function(par){
      var lines=par.split('\n');
      if(lines.every(function(l){return /^\s*[-•]\s+/.test(l);}))return '<ul style="margin:0 0 14px;padding-left:22px;'+pStyle.replace('margin:0 0 14px;','')+'">'+lines.map(function(l){return '<li style="margin:0 0 6px;">'+inline(l.replace(/^\s*[-•]\s+/,''),d)+'</li>';}).join('')+'</ul>';
      return '<p style="'+pStyle+'">'+lines.map(function(l){return inline(l,d);}).join('<br>')+'</p>';
    }).join('');
  }
  function wrap(inner,pad){return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:'+(pad||'0 32px 18px')+';">'+inner+'</td></tr></table>';}
  function btnHtml(label,url,d,opts){opts=opts||{};var bg=opts.bg||d.accent,color=opts.color||'#ffffff',r=opts.radius!=null?opts.radius:48;var full=opts.full?'display:block;width:100%;box-sizing:border-box;':'display:inline-block;';return '<a href="'+esc(safeUrl(url)||'#')+'" style="'+full+'background:'+bg+';color:'+color+';font-family:'+d.font+';font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;padding:15px 28px;border-radius:'+r+'px;text-align:center;">'+esc(label||'Button')+'</a>';}
  var BLOCKS={
    heading:{label:'Heading',icon:'H',defaults:{text:'Votre titre ici',level:1,align:'left',color:''},render:function(b,d){var size={1:28,2:22,3:18}[b.level]||28;return wrap('<h'+(b.level||1)+' style="margin:0;font-family:'+d.font+';font-size:'+size+'px;line-height:1.25;font-weight:800;color:'+(b.color||d.heading)+';text-align:'+(b.align||'left')+';">'+inline(b.text,d)+'</h'+(b.level||1)+'>','6px 32px 14px');}},
    text:{label:'Text',icon:'¶',defaults:{text:'Bonjour {$name},\n\nÉcrivez votre message ici. Utilisez **gras**, *italique* et [des liens](https://www.sbmarketing.fr).',align:'left',size:15,color:''},render:function(b,d){return wrap(richText(b.text,d,b.size,b.align,b.color),'0 32px 4px');}},
    button:{label:'Button',icon:'▭',defaults:{label:'Découvrir',url:'https://www.sbmarketing.fr',align:'center',bg:'',color:'#ffffff',radius:48,full:false},render:function(b,d){return wrap('<div style="text-align:'+(b.align||'center')+';">'+btnHtml(b.label,b.url,d,{bg:b.bg,color:b.color,radius:b.radius,full:b.full})+'</div>','8px 32px 22px');}},
    image:{label:'Image',icon:'▣',defaults:{url:'https://www.sbmarketing.fr/images/sb-marketing-email-logo.png',alt:'',link:'',width:100,align:'center',radius:12},render:function(b,d){var img='<img src="'+esc(safeUrl(b.url))+'" alt="'+esc(b.alt)+'" width="'+Math.round((d.width-64)*(b.width||100)/100)+'" style="display:inline-block;max-width:100%;width:'+(b.width||100)+'%;height:auto;border:0;border-radius:'+(b.radius||0)+'px;">';if(safeUrl(b.link))img='<a href="'+esc(safeUrl(b.link))+'">'+img+'</a>';return wrap('<div style="text-align:'+(b.align||'center')+';">'+img+'</div>','4px 32px 18px');}},
    imagetext:{label:'Image + text',icon:'◧',defaults:{url:'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600',title:'Titre de la section',text:'Une courte description de votre produit, service ou actualité.',button:'En savoir plus',link:'https://www.sbmarketing.fr',side:'left'},render:function(b,d){var img='<td width="46%" valign="top" style="padding:0 '+(b.side==='left'?'16px 0 0':'0 0 16px')+';"><img src="'+esc(safeUrl(b.url))+'" alt="" width="240" style="display:block;width:100%;height:auto;border-radius:12px;border:0;"></td>';var txt='<td valign="top"><h3 style="margin:0 0 8px;font-family:'+d.font+';font-size:18px;color:'+d.heading+';">'+inline(b.title,d)+'</h3>'+richText(b.text,d,14)+(b.button?'<a href="'+esc(safeUrl(b.link)||'#')+'" style="color:'+d.accent+';font-weight:700;font-family:'+d.font+';font-size:14px;">'+esc(b.button)+' →</a>':'')+'</td>';return wrap('<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'+(b.side==='right'?txt+img:img+txt)+'</tr></table>','8px 32px 22px');}},
    promo:{label:'Coupon',icon:'%',defaults:{title:'-20% sur votre prochaine commande',code:'BIENVENUE20',text:'Valable jusqu’au 30 du mois.',bg:'#fff7e6',color:'#041021'},render:function(b,d){return wrap('<div style="background:'+(b.bg||'#fff7e6')+';border:2px dashed '+(b.color||d.accent)+';border-radius:16px;padding:22px;text-align:center;font-family:'+d.font+';"><div style="font-size:18px;font-weight:800;color:'+(b.color||d.heading)+';margin:0 0 10px;">'+inline(b.title,d)+'</div><div style="display:inline-block;font-size:22px;font-weight:800;letter-spacing:.12em;color:#fff;background:'+(b.color||d.accent)+';padding:10px 20px;border-radius:10px;">'+esc(b.code)+'</div><div style="font-size:13px;color:'+d.text+';margin-top:10px;">'+inline(b.text,d)+'</div></div>','8px 32px 22px');}},
    quote:{label:'Testimonial',icon:'❝',defaults:{text:'Une équipe à l’écoute, des résultats visibles dès le premier mois.',author:'Marie, Nice',stars:5},render:function(b,d){var stars=b.stars?'<div style="color:#f5b301;font-size:16px;letter-spacing:2px;margin-bottom:8px;">'+'★★★★★'.slice(0,b.stars)+'</div>':'';return wrap('<div style="border-left:4px solid '+d.accent+';background:#f7f9fc;border-radius:12px;padding:18px 20px;font-family:'+d.font+';">'+stars+'<div style="font-size:16px;line-height:1.6;font-style:italic;color:'+d.heading+';">“'+inline(b.text,d)+'”</div>'+(b.author?'<div style="margin-top:8px;font-size:13px;font-weight:700;color:'+d.text+';">— '+esc(b.author)+'</div>':'')+'</div>','8px 32px 22px');}},
    video:{label:'Video',icon:'▶',defaults:{url:'https://www.youtube.com/',thumb:'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600',caption:'Regardez la vidéo'},render:function(b,d){return wrap('<a href="'+esc(safeUrl(b.url)||'#')+'" style="display:block;position:relative;text-decoration:none;"><img src="'+esc(safeUrl(b.thumb))+'" alt="" width="536" style="display:block;width:100%;height:auto;border-radius:12px;border:0;"><div style="text-align:center;margin-top:10px;font-family:'+d.font+';font-size:14px;font-weight:700;color:'+d.accent+';">▶ '+esc(b.caption||'')+'</div></a>','8px 32px 22px');}},
    social:{label:'Social links',icon:'#',defaults:{instagram:'',facebook:'',linkedin:'',tiktok:'',website:'',align:'center'},render:function(b,d){var links=[['instagram','Instagram'],['facebook','Facebook'],['linkedin','LinkedIn'],['tiktok','TikTok'],['website','Website']].filter(function(x){return safeUrl(b[x[0]]);}).map(function(x){return '<a href="'+esc(safeUrl(b[x[0]]))+'" style="display:inline-block;margin:0 5px 6px;padding:8px 14px;border-radius:40px;border:1px solid #e4e7ec;color:'+d.heading+';font-family:'+d.font+';font-size:13px;font-weight:700;text-decoration:none;">'+x[1]+'</a>';}).join('');return wrap('<div style="text-align:'+(b.align||'center')+';">'+(links||'<span style="font-family:'+d.font+';font-size:12px;color:#9ca3af;">Add your social links in the block settings</span>')+'</div>','6px 32px 18px');}},
    divider:{label:'Divider',icon:'—',defaults:{color:'#e9eaf3',thickness:1},render:function(b){return wrap('<div style="border-top:'+(b.thickness||1)+'px solid '+(b.color||'#e9eaf3')+';font-size:0;line-height:0;">&nbsp;</div>','10px 32px 20px');}},
    spacer:{label:'Spacer',icon:'↕',defaults:{height:24},render:function(b){return '<div style="height:'+(b.height||24)+'px;line-height:'+(b.height||24)+'px;font-size:0;">&nbsp;</div>';}},
    html:{label:'Custom HTML',icon:'</>',defaults:{html:'<p style="text-align:center;">Votre HTML</p>'},render:function(b){return wrap(b.html||'','0 32px 18px');}}
  };
  function blockHtml(b,d){var def=BLOCKS[b.type];return def?def.render(Object.assign({},def.defaults,b),d):'';}
  function newBlock(type){return Object.assign({id:uid(),type:type},clone(BLOCKS[type].defaults));}
  function footerCopy(lang){return lang==='en'?{why:'You are receiving this email because you subscribed to updates from',unsub:'Unsubscribe',view:'View in browser'}:{why:'Vous recevez cet email car vous êtes inscrit(e) aux actualités de',unsub:'Se désinscrire',view:'Voir dans le navigateur'};}
  function shellHtml(doc,inner,opts){
    opts=opts||{};var d=design(doc),b=state.brand||{},lang=doc.language==='en'?'en':'fr',c=footerCopy(lang);
    var company=b.company_name||'SB Marketing',logo=d.logo_url||b.logo_url||'https://www.sbmarketing.fr/images/sb-marketing-email-logo.png',site=b.website_url||SITE;
    var header=d.header?'<tr><td style="background:'+d.header_bg+';padding:24px 32px;"><img src="'+esc(logo)+'" height="28" alt="'+esc(company)+'" style="display:block;height:28px;width:auto;border:0;"></td></tr>':'';
    var socials=[[b.instagram_url,'Instagram'],[b.facebook_url,'Facebook']].filter(function(x){return safeUrl(x[0]);}).map(function(x){return ' · <a href="'+esc(x[0])+'" style="color:#9ca3af;">'+x[1]+'</a>';}).join('');
    var tagline=lang==='en'?(b.footer_tagline_en||''):(b.footer_tagline_fr||'');
    var footer=d.footer?'<tr><td style="padding:20px 32px;background:#f7f7f8;border-top:1px solid #ececec;font-family:'+d.font+';">'+(d.footer_text?'<p style="margin:0 0 8px;font-size:12px;color:#6b7280;">'+inline(d.footer_text,d)+'</p>':'')+'<p style="margin:0;font-size:12px;color:#9ca3af;">'+esc(company)+(tagline?' · '+esc(tagline):'')+'</p><p style="margin:6px 0 0;font-size:12px;color:#9ca3af;"><a href="'+esc(site)+'" style="color:#9ca3af;">'+esc(site.replace(/^https?:\/\//,''))+'</a>'+socials+'</p><p style="margin:10px 0 0;font-size:11px;color:#9ca3af;">'+c.why+' '+esc(company)+'. <a href="'+esc(opts.unsubscribeUrl||'{$unsubscribe}')+'" style="color:#9ca3af;text-decoration:underline;">'+c.unsub+'</a></p></td></tr>':'<tr><td style="padding:14px 32px;text-align:center;font-family:'+d.font+';font-size:11px;"><a href="'+esc(opts.unsubscribeUrl||'{$unsubscribe}')+'" style="color:#9ca3af;">'+c.unsub+'</a></td></tr>';
    return '<!doctype html><html lang="'+lang+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(doc.subject||'')+'</title></head><body style="margin:0;padding:0;background:'+d.bg+';">'+
      '<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">'+esc(doc.preheader||'')+'</span>'+
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:'+d.bg+';padding:28px 12px;"><tr><td align="center">'+
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:'+d.width+'px;background:'+d.content_bg+';border-radius:'+d.radius+'px;overflow:hidden;font-family:'+d.font+';">'+header+
      '<tr><td style="padding:26px 0 10px;">'+inner+'</td></tr>'+footer+'</table></td></tr></table></body></html>';
  }
  function renderEmail(doc,opts){var d=design(doc);return shellHtml(doc,(doc.blocks||[]).map(function(b){return blockHtml(b,d);}).join(''),opts);}
  function mergeTags(text,sub,opts){sub=sub||{};opts=opts||{};var map={name:sub.name||'',last_name:sub.last_name||'',email:sub.email||'',company:sub.company||'',city:sub.city||'',unsubscribe:opts.unsubscribeUrl||'#'};return String(text||'').replace(/\{\$([a-z_]+)\}/g,function(m,k){if(!(k in map))return m;return opts.raw?map[k]:esc(map[k]);});}
  function sampleSub(){return{name:'Marie',last_name:'Dupont',email:'marie@example.com',company:'Boulangerie du Port',city:'Nice'};}
  function trackLinks(html,sendId){return html.replace(/href="(https?:\/\/[^"]+)"/g,function(m,url){if(/\/unsubscribe\//.test(url))return m;var real=url.replace(/&amp;/g,'&');return 'href="'+SITE+'/r/?i='+sendId+'&amp;u='+encodeURIComponent(real)+'"';});}
  function plainText(doc){return (doc.blocks||[]).map(function(b){if(b.type==='heading')return b.text;if(b.type==='text')return String(b.text||'').replace(/\*\*|\*/g,'').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1 ($2)');if(b.type==='promo')return b.title+' — '+b.code+'\n'+(b.text||'');if(b.type==='quote')return '“'+b.text+'” — '+(b.author||'');if(b.type==='imagetext')return b.title+'\n'+b.text;return '';}).filter(Boolean).join('\n\n');}

  // ── Sending ──────────────────────────────────────────────────
  async function sendOne(doc,sub,meta){
    var sendId=uid(),unsub=SITE+'/unsubscribe/?s='+sub.id;
    var subject=mergeTags(doc.subject,sub,{raw:true,unsubscribeUrl:unsub});
    var html=mergeTags(renderEmail(doc,{unsubscribeUrl:unsub}),sub,{unsubscribeUrl:unsub});
    if(meta.track!==false)html=trackLinks(html,sendId);
    var row={id:sendId,email:sub.email,subscriber_id:meta.test?null:sub.id,subject:subject,campaign_id:meta.campaign_id||null,automation_id:meta.automation_id||null,status:'sent'};
    var reply=(meta.reply_to||state.brand.reply_to_email||undefined);
    try{
      var result;
      if(!htmlUnsupported){
        try{result=await invoke('send-client-report',{type:'html',to:sub.email,business_name:fullName(sub)||sub.email,subject:subject,html:html,reply_to:reply,language:doc.language||'fr'});}
        catch(e){if(/type must be/i.test(e.message)){htmlUnsupported=true;}else throw e;}
      }
      if(htmlUnsupported){
        var btn=(doc.blocks||[]).find(function(b){return b.type==='button';}),img=(doc.blocks||[]).find(function(b){return b.type==='image';});
        result=await invoke('send-client-report',{type:'custom',to:sub.email,business_name:sub.company||fullName(sub)||sub.email,contact_name:sub.name||undefined,language:doc.language||'fr',subject:subject,body:mergeTags(plainText(doc),sub,{raw:true})+'\n\n'+(doc.language==='en'?'Unsubscribe: ':'Se désinscrire : ')+unsub,cta_label:btn?btn.label:undefined,cta_url:btn?safeUrl(btn.url)||undefined:undefined,extras:img?{bannerUrl:safeUrl(img.url)||undefined}:undefined,reply_to:reply});
      }
      row.provider_id=result&&result.id||null;
    }catch(error){row.status='failed';row.error=String(error.message||error).slice(0,500);}
    if(!meta.test){try{await post('em_sends',row,false);state.sends.unshift(row);if(row.status==='sent'){var now=new Date().toISOString();sub.last_sent_at=now;patch('em_subscribers','id=eq.'+sub.id,{last_sent_at:now}).catch(function(){});}}catch(e){console.warn('Could not log send',e);}}
    return row;
  }
  function campaignDoc(c){return{subject:c.subject,preheader:c.preheader,language:c.language,design:c.design,blocks:c.blocks};}
  async function sendCampaign(c,progress){
    if(busy)throw new Error('Another send is already running. Wait for it to finish.');
    busy=true;
    try{
      var recipients=audienceOf(c.audience),done={};
      state.sends.forEach(function(s){if(s.campaign_id===c.id&&s.status==='sent')done[s.subscriber_id]=true;});
      var todo=recipients.filter(function(s){return !done[s.id];});
      await patch('em_campaigns','id=eq.'+c.id,{status:'sending',updated_at:new Date().toISOString()});c.status='sending';
      var sent=Object.keys(done).length,failed=0,doc=campaignDoc(c);
      for(var i=0;i<todo.length;i++){
        var row=await sendOne(doc,todo[i],{campaign_id:c.id,reply_to:c.reply_to});
        if(row.status==='sent')sent++;else failed++;
        if(progress)progress(i+1,todo.length,sent,failed);
        await sleep(550); // stays under Resend's default 2 requests/second
      }
      var stats={recipients:recipients.length,sent:sent,failed:failed};
      var updated=await patch('em_campaigns','id=eq.'+c.id,{status:'sent',sent_at:c.sent_at||new Date().toISOString(),stats:stats,updated_at:new Date().toISOString()});
      Object.assign(c,updated&&updated[0]||{status:'sent',stats:stats});
      return stats;
    }finally{busy=false;}
  }
  function delayMs(step){var n=Number(step.amount)||0;return n*({hours:3600000,days:86400000,weeks:604800000}[step.unit]||86400000);}
  async function processAutomations(){
    if(busy||state.missing||!state.loaded)return 0;
    var runs=await api('/rest/v1/em_automation_runs?status=eq.active&next_run_at=lte.'+encodeURIComponent(new Date().toISOString())+'&select=*&limit=50');
    if(!runs||!runs.length)return 0;
    busy=true;var count=0;
    try{
      for(var i=0;i<runs.length;i++){
        var run=runs[i],auto=state.automations.find(function(a){return a.id===run.automation_id;}),sub=subById(run.subscriber_id);
        if(!auto||auto.status!=='active')continue;
        if(!sub||sub.status!=='active'){await patch('em_automation_runs','id=eq.'+run.id,{status:'cancelled'});continue;}
        var idx=run.step_index,steps=auto.steps||[],next=new Date().toISOString(),status='active',error=null;
        // Claim the run so two open admin tabs never send the same step twice.
        var claim=await patch('em_automation_runs','id=eq.'+run.id+'&step_index=eq.'+idx+'&status=eq.active',{next_run_at:new Date(Date.now()+600000).toISOString()});
        if(!claim||!claim.length)continue;
        while(idx<steps.length){
          var step=steps[idx];
          if(step.type==='delay'){idx++;next=new Date(Date.now()+delayMs(step)).toISOString();break;}
          if(step.type==='email'){var row=await sendOne({subject:step.subject,preheader:step.preheader,language:step.language||'fr',design:step.design,blocks:step.blocks},sub,{automation_id:auto.id});count++;if(row.status==='failed'){error=row.error;}idx++;await sleep(550);continue;}
          idx++;
        }
        if(idx>=steps.length)status='completed';
        await patch('em_automation_runs','id=eq.'+run.id,{step_index:idx,next_run_at:next,status:error&&status!=='completed'?'active':status,last_error:error});
        var local=state.runs.find(function(r){return r.id===run.id;});if(local)Object.assign(local,{step_index:idx,next_run_at:next,status:status});
      }
    }finally{busy=false;}
    return count;
  }
  async function processScheduled(){
    if(busy||state.missing||!state.loaded)return;
    var due=state.campaigns.filter(function(c){return c.status==='scheduled'&&c.scheduled_at&&new Date(c.scheduled_at)<=new Date();});
    for(var i=0;i<due.length;i++){try{await sendCampaign(due[i]);toast('Scheduled campaign “'+due[i].name+'” sent','ok');}catch(e){console.warn(e);}}
    if(due.length)rerender();
  }
  var ticking=false;
  async function tick(){if(ticking||!session())return;ticking=true;try{await load();await processScheduled();var n=await processAutomations();if(n){toast(n+' automation email'+(n>1?'s':'')+' sent','ok');rerender();}}catch(e){console.warn('Email automation tick',e);}finally{ticking=false;}}

  // ── Modal helper ─────────────────────────────────────────────
  function modal(title,body,opts){
    opts=opts||{};var dlg=document.createElement('dialog');dlg.className='em-modal'+(opts.wide?' em-modal--wide':'');
    dlg.innerHTML='<div class="em-modal__head"><h3>'+esc(title)+'</h3><button type="button" class="icon-button" data-em-close aria-label="Close">✕</button></div><div class="em-modal__body">'+body+'</div>';
    document.body.appendChild(dlg);dlg.addEventListener('close',function(){dlg.remove();});dlg.querySelector('[data-em-close]').addEventListener('click',function(){dlg.close();});dlg.showModal();return dlg;
  }
  function confirmBox(text){return window.confirm(text);}

  // ── Shell for each tab ───────────────────────────────────────
  function root(tab){return document.querySelector('[data-em-root="'+tab+'"]');}
  function setupNeeded(){return '<section class="em-setup"><div class="em-setup__icon">'+icon('mail')+'</div><h2>One-time database setup</h2><p>The email marketing system needs its tables. Open the Supabase SQL Editor, paste the contents of <code>supabase/email_marketing.sql</code> and click Run. Then reload this page.</p><button type="button" data-em-reload>Reload</button></section>';}
  function header(kicker,title,text,actions){return '<section class="em-hero"><div><span class="admin-kicker">'+kicker+'</span><h2>'+title+'</h2><p>'+text+'</p></div><div class="em-hero__actions">'+(actions||'')+'</div></section>';}
  function stat(label,value,note,ic){return '<article class="em-stat">'+(ic?'<span class="em-stat__icon">'+icon(ic)+'</span>':'')+'<div><span>'+label+'</span><strong>'+value+'</strong>'+(note?'<small>'+note+'</small>':'')+'</div></article>';}
  function rerender(){if(ui.current)render(ui.current);}
  function render(tab){
    var el=root(tab);if(!el)return;
    if(state.missing){el.innerHTML=setupNeeded();return;}
    ({'email':renderDashboard,'email-subscribers':renderSubscribers,'email-groups':renderGroups,'email-campaigns':renderCampaigns,'email-automations':renderAutomations,'email-templates':renderTemplates,'email-forms':renderForms}[tab]||function(){})(el);
  }

  // ── Dashboard ────────────────────────────────────────────────
  function renderDashboard(el){
    var active=state.subs.filter(function(s){return s.status==='active';}).length,unsub=state.subs.filter(function(s){return s.status==='unsubscribed';}).length;
    var since=Date.now()-30*86400000,newSubs=state.subs.filter(function(s){return new Date(s.created_at).getTime()>since;}).length;
    var sent30=state.sends.filter(function(s){return s.status==='sent'&&new Date(s.sent_at).getTime()>since;});
    var clicked=sent30.filter(function(s){return s.clicks>0;}).length;
    var weeks=[];for(var w=11;w>=0;w--){var start=Date.now()-(w+1)*7*86400000,end=Date.now()-w*7*86400000;weeks.push({label:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(end)),n:state.subs.filter(function(s){var t=new Date(s.created_at).getTime();return t>start&&t<=end;}).length});}
    var max=Math.max.apply(null,weeks.map(function(x){return x.n;}).concat([1]));
    var recent=state.campaigns.slice(0,5),activeAutos=state.automations.filter(function(a){return a.status==='active';});
    el.innerHTML=header('Email marketing','Grow your audience and send emails people love','Subscribers, groups, campaigns, automations, templates and sign-up forms — all in one place.','<a class="em-btn em-btn--light" href="#email-subscribers" data-em-action="add-sub">+ Subscriber</a><a class="em-btn" href="#email-campaigns" data-em-action="new-campaign">Create campaign</a>')+
      (htmlUnsupported?'<p class="em-note em-note--warn">Your deployed <b>send-client-report</b> function is an older version, so designs are sent as a simplified branded email. Redeploy the function from <code>supabase/functions</code> to send the full design.</p>':'')+
      '<div class="em-stats">'+stat('Active subscribers',active,'+'+newSubs+' in 30 days','users')+stat('Unsubscribed',unsub,pct(unsub,state.subs.length)+' of list','users')+stat('Emails sent (30d)',sent30.length,state.sends.filter(function(s){return s.status==='failed'&&new Date(s.sent_at).getTime()>since;}).length+' failed','send')+stat('Click rate (30d)',pct(clicked,sent30.length),clicked+' clicked','click')+'</div>'+
      '<div class="em-cols"><section class="em-panel"><div class="em-panel__head"><h3>Subscriber growth</h3><span>Last 12 weeks</span></div><div class="em-bars">'+weeks.map(function(x){return '<div class="em-bar" title="'+x.n+' new · week of '+esc(x.label)+'"><i style="height:'+Math.max(4,x.n/max*100)+'%"></i><span>'+esc(x.label.split(' ')[0])+'</span></div>';}).join('')+'</div></section>'+
      '<section class="em-panel"><div class="em-panel__head"><h3>Get started</h3></div><ol class="em-steps">'+
        step(state.subs.length>0,'Add or import subscribers','#email-subscribers')+step(state.groups.length>0,'Organise them into groups','#email-groups')+step(state.templates.length>0,'Design a template','#email-templates')+step(state.campaigns.some(function(c){return c.status==='sent';}),'Send your first campaign','#email-campaigns')+step(activeAutos.length>0,'Turn on a welcome automation','#email-automations')+step(state.forms.length>0,'Publish a sign-up form','#email-forms')+'</ol></section></div>'+
      '<section class="em-panel"><div class="em-panel__head"><h3>Recent campaigns</h3><a href="#email-campaigns">View all</a></div>'+(recent.length?campaignTable(recent):'<div class="em-empty-inline">No campaigns yet.</div>')+'</section>';
    function step(done,label,href){return '<li class="'+(done?'is-done':'')+'"><span>'+(done?'✓':'')+'</span><a href="'+href+'">'+label+'</a></li>';}
  }

  // ── Subscribers ──────────────────────────────────────────────
  function filteredSubs(){var term=ui.subSearch.trim().toLowerCase(),inGroup=null;if(ui.subGroup){inGroup={};state.members.forEach(function(m){if(m.group_id===ui.subGroup)inGroup[m.subscriber_id]=true;});}
    return state.subs.filter(function(s){if(ui.subStatus&&s.status!==ui.subStatus)return false;if(inGroup&&!inGroup[s.id])return false;if(!term)return true;return [s.email,s.name,s.last_name,s.company,s.city].join(' ').toLowerCase().indexOf(term)>-1;});}
  function renderSubscribers(el){
    var counts={};state.subs.forEach(function(s){counts[s.status]=(counts[s.status]||0)+1;});
    var list=filteredSubs(),shown=list.slice(0,300),selCount=Object.keys(ui.selected).length;
    el.innerHTML=header('Audience','Subscribers','Everyone on your list, with their status, groups and email activity.','<button type="button" class="secondary" data-em-action="import">Import</button><button type="button" class="secondary" data-em-action="export-subs">Export CSV</button><button type="button" data-em-action="add-sub">+ Add subscriber</button>')+
      '<div class="em-chips">'+[['','All',state.subs.length],['active','Active',counts.active||0],['unsubscribed','Unsubscribed',counts.unsubscribed||0],['unconfirmed','Unconfirmed',counts.unconfirmed||0],['bounced','Bounced',counts.bounced||0],['junk','Junk',counts.junk||0]].map(function(x){return '<button type="button" class="em-chip'+(ui.subStatus===x[0]?' is-active':'')+'" data-em-sub-status="'+x[0]+'">'+x[1]+' <b>'+x[2]+'</b></button>';}).join('')+'</div>'+
      '<div class="em-toolbar"><label class="search"><span class="sr-only">Search subscribers</span><input type="search" data-em-sub-search value="'+esc(ui.subSearch)+'" placeholder="Search email, name, company…"></label><select data-em-sub-group><option value="">All groups</option>'+state.groups.map(function(g){return '<option value="'+g.id+'"'+(ui.subGroup===g.id?' selected':'')+'>'+esc(g.name)+'</option>';}).join('')+'</select></div>'+
      (selCount?'<div class="em-bulkbar"><strong>'+selCount+' selected</strong><select data-em-bulk-group><option value="">Choose group…</option>'+state.groups.map(function(g){return '<option value="'+g.id+'">'+esc(g.name)+'</option>';}).join('')+'</select><button type="button" class="secondary" data-em-action="bulk-add-group">Add to group</button><button type="button" class="secondary" data-em-action="bulk-remove-group">Remove from group</button><button type="button" class="secondary" data-em-action="bulk-unsub">Unsubscribe</button><button type="button" class="secondary" data-em-action="bulk-resub">Mark active</button><button type="button" class="em-danger" data-em-action="bulk-delete">Delete</button><button type="button" class="link-button" data-em-action="bulk-clear">Clear</button></div>':'')+
      (list.length?'<div class="table-wrap"><table class="em-table"><thead><tr><th><input type="checkbox" data-em-select-all aria-label="Select all"'+(shown.length&&shown.every(function(s){return ui.selected[s.id];})?' checked':'')+'></th><th>Subscriber</th><th>Status</th><th>Groups</th><th>Source</th><th>Subscribed</th><th>Last email</th></tr></thead><tbody>'+shown.map(function(s){var gs=groupsOf(s.id);return '<tr data-em-sub-row="'+s.id+'"><td><input type="checkbox" data-em-select="'+s.id+'"'+(ui.selected[s.id]?' checked':'')+' aria-label="Select"></td><td><button type="button" class="em-link" data-em-open-sub="'+s.id+'"><strong>'+esc(s.email)+'</strong><small>'+esc([fullName(s),s.company].filter(Boolean).join(' · ')||'—')+'</small></button></td><td>'+badge(s.status)+'</td><td>'+(gs.length?gs.slice(0,3).map(function(g){return '<span class="em-tag">'+esc(groupName(g))+'</span>';}).join('')+(gs.length>3?'<span class="em-tag">+'+(gs.length-3)+'</span>':''):'<span class="em-muted">—</span>')+'</td><td>'+esc(s.source)+'</td><td>'+fmtDate(s.subscribed_at||s.created_at)+'</td><td>'+fmtDate(s.last_sent_at)+'</td></tr>';}).join('')+'</tbody></table></div>'+(list.length>shown.length?'<p class="em-note">Showing the first 300 of '+list.length+'. Refine your search to see more.</p>':''):'<div class="empty"><h2>'+(state.subs.length?'No subscribers match':'No subscribers yet')+'</h2><p>'+(state.subs.length?'Try another search or filter.':'Add people one by one, import a CSV, or pull in your clients, leads and contact requests.')+'</p></div>');
  }
  function subscriberForm(s){s=s||{language:'fr',status:'active'};var gs=s.id?groupsOf(s.id):[];
    return '<form class="em-form" data-em-sub-form><div class="em-grid2"><label>Email<input name="email" type="email" required value="'+esc(s.email||'')+'"></label><label>Status<select name="status">'+['active','unsubscribed','unconfirmed','bounced','junk'].map(function(x){return '<option'+(s.status===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select></label><label>First name<input name="name" value="'+esc(s.name||'')+'"></label><label>Last name<input name="last_name" value="'+esc(s.last_name||'')+'"></label><label>Company<input name="company" value="'+esc(s.company||'')+'"></label><label>Phone<input name="phone" value="'+esc(s.phone||'')+'"></label><label>City<input name="city" value="'+esc(s.city||'')+'"></label><label>Language<select name="language"><option value="fr"'+(s.language==='fr'?' selected':'')+'>French</option><option value="en"'+(s.language==='en'?' selected':'')+'>English</option></select></label></div><fieldset class="em-fieldset"><legend>Groups</legend>'+(state.groups.length?state.groups.map(function(g){return '<label class="em-check"><input type="checkbox" name="groups" value="'+g.id+'"'+(gs.indexOf(g.id)>-1?' checked':'')+'> '+esc(g.name)+'</label>';}).join(''):'<span class="em-muted">No groups yet.</span>')+'</fieldset><label>Notes<textarea name="notes" rows="2">'+esc(s.notes||'')+'</textarea></label><div class="em-actions"><button type="submit">Save subscriber</button>'+(s.id?'<button type="button" class="em-danger" data-em-delete-sub="'+s.id+'">Delete</button>':'')+'</div><p class="form-message" data-em-msg></p></form>';}
  function openSubscriber(id){
    var s=id?subById(id):null;
    var activity=s?state.sends.filter(function(x){return x.subscriber_id===s.id;}).slice(0,20):[];
    var body=subscriberForm(s)+(s?'<h4 class="em-subtitle">Email activity</h4>'+(activity.length?'<ul class="em-activity">'+activity.map(function(a){return '<li><span class="em-dot em-dot--'+a.status+'"></span><div><strong>'+esc(a.subject||'(no subject)')+'</strong><small>'+fmtDate(a.sent_at,true)+' · '+(a.campaign_id?'Campaign':'Automation')+(a.clicks?' · clicked '+a.clicks+'×':'')+(a.status==='failed'?' · failed: '+esc(a.error||''):'')+'</small></div></li>';}).join('')+'</ul>':'<p class="em-muted">No emails sent to this subscriber yet.</p>'):'');
    var dlg=modal(s?(fullName(s)||s.email):'Add subscriber',body);
    var form=dlg.querySelector('[data-em-sub-form]');
    form.addEventListener('submit',async function(e){e.preventDefault();var msg=form.querySelector('[data-em-msg]'),fd=new FormData(form),data={};['email','status','name','last_name','company','phone','city','language','notes'].forEach(function(k){data[k]=String(fd.get(k)||'').trim()||null;});data.email=(data.email||'').toLowerCase();
      if(!validEmail(data.email)){msg.textContent='Enter a valid email.';return;}
      var groups=fd.getAll('groups');msg.textContent='Saving…';
      try{
        var saved;
        if(s){data.updated_at=new Date().toISOString();if(data.status==='unsubscribed'&&s.status!=='unsubscribed')data.unsubscribed_at=data.updated_at;saved=(await patch('em_subscribers','id=eq.'+s.id,data))[0];Object.assign(s,saved);}
        else{var dup=state.subs.find(function(x){return x.email.toLowerCase()===data.email;});if(dup){msg.textContent='This email is already on your list.';return;}data.source='manual';saved=(await post('em_subscribers',data))[0];state.subs.unshift(saved);s=saved;}
        await setGroups([s.id],groups,true);
        dlg.close();toast('Subscriber saved','ok');rerender();
      }catch(err){msg.textContent=err.message;}
    });
    var d=dlg.querySelector('[data-em-delete-sub]');if(d)d.addEventListener('click',async function(){if(!confirmBox('Delete '+s.email+'? Their email history is kept but unlinked.'))return;await del('em_subscribers','id=eq.'+s.id);state.subs=state.subs.filter(function(x){return x.id!==s.id;});state.members=state.members.filter(function(m){return m.subscriber_id!==s.id;});dlg.close();toast('Subscriber deleted');rerender();});
  }
  // replace=true → subscriber's groups become exactly `groupIds`
  async function setGroups(subIds,groupIds,replace){
    for(var i=0;i<subIds.length;i++){
      var sid=subIds[i],current=groupsOf(sid),add=groupIds.filter(function(g){return current.indexOf(g)<0;});
      if(replace){var remove=current.filter(function(g){return groupIds.indexOf(g)<0;});if(remove.length){await del('em_subscriber_groups','subscriber_id=eq.'+sid+'&group_id=in.('+remove.join(',')+')');state.members=state.members.filter(function(m){return !(m.subscriber_id===sid&&remove.indexOf(m.group_id)>-1);});}}
      if(add.length){var rows=add.map(function(g){return{subscriber_id:sid,group_id:g};});await api('/rest/v1/em_subscriber_groups?on_conflict=subscriber_id,group_id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(rows)});rows.forEach(function(r){r.added_at=new Date().toISOString();state.members.push(r);});}
    }
  }
  async function addManyToGroup(subIds,groupId){
    var have={};state.members.forEach(function(m){if(m.group_id===groupId)have[m.subscriber_id]=true;});
    var rows=subIds.filter(function(id){return !have[id];}).map(function(id){return{subscriber_id:id,group_id:groupId};});
    for(var i=0;i<rows.length;i+=500){await api('/rest/v1/em_subscriber_groups?on_conflict=subscriber_id,group_id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+500))});}
    rows.forEach(function(r){r.added_at=new Date().toISOString();state.members.push(r);});return rows.length;
  }
  function parseCsv(text){
    var rows=[],row=[],field='',q=false;text=String(text||'').replace(/\r\n?/g,'\n');
    var sep=(text.split('\n')[0].match(/;/g)||[]).length>(text.split('\n')[0].match(/,/g)||[]).length?';':',';
    for(var i=0;i<text.length;i++){var c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')q=false;else field+=c;}else if(c==='"')q=true;else if(c===sep){row.push(field);field='';}else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}else field+=c;}
    if(field||row.length){row.push(field);rows.push(row);}
    return rows.filter(function(r){return r.some(function(x){return x.trim();});});
  }
  function openImport(){
    var dlg=modal('Import subscribers','<div class="em-import-tabs"><button type="button" class="em-chip is-active" data-em-import-tab="csv">CSV / paste</button><button type="button" class="em-chip" data-em-import-tab="sync">From SB Marketing data</button></div>'+
      '<div data-em-import-pane="csv"><p class="em-muted">Upload a CSV or paste rows. The first row can be a header (email, name, last_name, company, phone, city, language). One email per line also works.</p><label class="em-file">Choose CSV file<input type="file" accept=".csv,text/csv,text/plain" data-em-import-file></label><textarea rows="7" data-em-import-text placeholder="email,name,company&#10;marie@example.com,Marie,Boulangerie du Port"></textarea>'+
      '<div class="em-grid2"><label>Add to group<select data-em-import-group><option value="">No group</option>'+state.groups.map(function(g){return '<option value="'+g.id+'">'+esc(g.name)+'</option>';}).join('')+'</select></label><label>Existing emails<select data-em-import-mode><option value="skip">Skip (keep current data)</option><option value="update">Update their details</option></select></label></div>'+
      '<label class="em-check"><input type="checkbox" data-em-import-consent> I confirm these people agreed to receive emails (GDPR).</label><div class="em-actions"><button type="button" data-em-import-run>Import</button></div></div>'+
      '<div data-em-import-pane="sync" hidden><p class="em-muted">Pull people you already have in the admin into your email list. Existing emails are skipped; unsubscribed clients stay unsubscribed.</p><div class="em-sync-grid"><label class="em-check"><input type="checkbox" value="clients" checked data-em-sync> Clients <small>→ “Clients” group</small></label><label class="em-check"><input type="checkbox" value="leads" data-em-sync> Leads (butcher form) <small>→ “Prospects”</small></label><label class="em-check"><input type="checkbox" value="contacts" data-em-sync> Contact requests <small>→ “Prospects”</small></label></div><div class="em-actions"><button type="button" data-em-sync-run>Sync now</button></div></div><p class="form-message" data-em-msg></p>');
    var msg=dlg.querySelector('[data-em-msg]');
    dlg.querySelectorAll('[data-em-import-tab]').forEach(function(b){b.addEventListener('click',function(){dlg.querySelectorAll('[data-em-import-tab]').forEach(function(x){x.classList.toggle('is-active',x===b);});dlg.querySelectorAll('[data-em-import-pane]').forEach(function(p){p.hidden=p.dataset.emImportPane!==b.dataset.emImportTab;});});});
    dlg.querySelector('[data-em-import-file]').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){dlg.querySelector('[data-em-import-text]').value=r.result;};r.readAsText(f);});
    dlg.querySelector('[data-em-import-run]').addEventListener('click',async function(){
      if(!dlg.querySelector('[data-em-import-consent]').checked){msg.textContent='Please confirm consent first.';return;}
      var rows=parseCsv(dlg.querySelector('[data-em-import-text]').value);if(!rows.length){msg.textContent='Nothing to import.';return;}
      var head=rows[0].map(function(h){return h.trim().toLowerCase().replace(/\s+/g,'_');}),hasHead=head.some(function(h){return /mail/.test(h);});
      var map={email:'email','e-mail':'email',mail:'email',name:'name',first_name:'name',firstname:'name','prénom':'name',prenom:'name',last_name:'last_name',lastname:'last_name',nom:'last_name',company:'company',business:'company',entreprise:'company',phone:'phone',telephone:'phone','téléphone':'phone',city:'city',ville:'city',language:'language',langue:'language'};
      var cols=hasHead?head.map(function(h){return map[h]||null;}):['email','name','company'];
      var people=(hasHead?rows.slice(1):rows).map(function(r){var o={};cols.forEach(function(k,i){if(k&&r[i]!=null&&String(r[i]).trim())o[k]=String(r[i]).trim();});if(o.email)o.email=o.email.toLowerCase();if(o.language)o.language=/^en/i.test(o.language)?'en':'fr';return o;}).filter(function(o){return validEmail(o.email);});
      if(!people.length){msg.textContent='No valid emails found.';return;}
      msg.textContent='Importing '+people.length+'…';
      try{var res=await upsertPeople(people,'import',dlg.querySelector('[data-em-import-mode]').value==='update');var g=dlg.querySelector('[data-em-import-group]').value;if(g)await addManyToGroup(res.ids,g);dlg.close();toast(res.created+' added, '+res.updated+' updated, '+res.skipped+' skipped','ok');rerender();}catch(err){msg.textContent=err.message;}
    });
    dlg.querySelector('[data-em-sync-run]').addEventListener('click',async function(){
      var what=[].slice.call(dlg.querySelectorAll('[data-em-sync]:checked')).map(function(x){return x.value;});if(!what.length)return;
      msg.textContent='Syncing…';
      try{var total=0;
        var groupFor=function(name){var g=state.groups.find(function(x){return x.name.toLowerCase()===name.toLowerCase();});return g?g.id:null;};
        if(what.indexOf('clients')>-1){var clients=await api('/rest/v1/clients?select=id,email,contact_name,business_name,language,unsubscribed_at,whatsapp_number');var p=clients.filter(function(c){return validEmail(c.email);}).map(function(c){return{email:c.email.toLowerCase(),name:c.contact_name||null,company:c.business_name||null,language:c.language==='en'?'en':'fr',client_id:c.id,phone:c.whatsapp_number||null,status:c.unsubscribed_at?'unsubscribed':'active'};});var r1=await upsertPeople(p,'client',false);total+=r1.created;var g1=groupFor('Clients');if(g1)await addManyToGroup(r1.ids,g1);}
        var prospects=[];
        if(what.indexOf('leads')>-1){var leads=await api('/rest/v1/butcher_leads?select=*').catch(function(){return[];});leads.forEach(function(l){if(validEmail(l.email))prospects.push({email:l.email.toLowerCase(),name:l.name||l.full_name||l.contact_name||null,company:l.shop_name||l.business_name||null,city:l.city||null,phone:l.phone||null,language:l.language==='en'?'en':'fr',_src:'lead'});});}
        if(what.indexOf('contacts')>-1){var contacts=await api('/rest/v1/contact_submissions?select=*').catch(function(){return[];});contacts.forEach(function(l){if(validEmail(l.email))prospects.push({email:l.email.toLowerCase(),name:l.name||l.full_name||null,company:l.company||null,phone:l.phone||null,language:l.language==='en'?'en':'fr',_src:'contact'});});}
        if(prospects.length){var bySrc={};prospects.forEach(function(p){bySrc[p.email]=p;});var list=Object.keys(bySrc).map(function(k){var o=bySrc[k];var src=o._src;delete o._src;o.source=src;return o;});var r2=await upsertPeople(list,null,false);total+=r2.created;var g2=groupFor('Prospects');if(g2)await addManyToGroup(r2.ids,g2);}
        dlg.close();toast(total+' new subscriber'+(total===1?'':'s')+' synced','ok');rerender();
      }catch(err){msg.textContent=err.message;}
    });
  }
  async function upsertPeople(people,source,update){
    var byEmail={};state.subs.forEach(function(s){byEmail[s.email.toLowerCase()]=s;});
    var seen={},toCreate=[],ids=[],updated=0,skipped=0;
    for(var i=0;i<people.length;i++){var p=people[i];if(seen[p.email])continue;seen[p.email]=true;var ex=byEmail[p.email];
      if(ex){ids.push(ex.id);if(update){var patchData={};['name','last_name','company','phone','city','language'].forEach(function(k){if(p[k])patchData[k]=p[k];});if(Object.keys(patchData).length){patchData.updated_at=new Date().toISOString();Object.assign(ex,(await patch('em_subscribers','id=eq.'+ex.id,patchData))[0]);updated++;}}else skipped++;}
      else{var row=Object.assign({status:'active'},p);if(source)row.source=source;toCreate.push(row);}
    }
    for(var j=0;j<toCreate.length;j+=500){var created=await post('em_subscribers',toCreate.slice(j,j+500));created.forEach(function(c){state.subs.unshift(c);ids.push(c.id);});}
    return{created:toCreate.length,updated:updated,skipped:skipped,ids:ids};
  }
  function exportSubs(){var list=filteredSubs();var rows=[['email','name','last_name','company','phone','city','language','status','groups','source','subscribed_at']].concat(list.map(function(s){return[s.email,s.name,s.last_name,s.company,s.phone,s.city,s.language,s.status,groupsOf(s.id).map(groupName).join(' | '),s.source,s.subscribed_at];}));var csv=rows.map(function(r){return r.map(function(v){v=v==null?'':String(v);return /[",;\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');}).join('\n');var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'}));a.download='subscribers-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}

  // ── Groups ───────────────────────────────────────────────────
  function renderGroups(el){
    el.innerHTML=header('Audience','Groups','Organise subscribers into groups to target campaigns and trigger automations.','<button type="button" data-em-action="new-group">+ Create group</button>')+
      (state.groups.length?'<div class="em-card-grid">'+state.groups.map(function(g){var m=membersOf(g.id),act=m.filter(function(s){return s.status==='active';}).length,sent=0,clicked=0,ids={};m.forEach(function(s){ids[s.id]=true;});state.sends.forEach(function(s){if(ids[s.subscriber_id]&&s.status==='sent'){sent++;if(s.clicks)clicked++;}});var recent=state.members.filter(function(x){return x.group_id===g.id&&Date.now()-new Date(x.added_at).getTime()<30*86400000;}).length;
        return '<article class="em-card"><div class="em-card__head"><span class="em-swatch" style="background:'+esc(g.color||'#041021')+'"></span><h3>'+esc(g.name)+'</h3></div><p>'+esc(g.description||'No description')+'</p><dl class="em-kv"><div><dt>Active</dt><dd>'+act+'</dd></div><div><dt>Total</dt><dd>'+m.length+'</dd></div><div><dt>New (30d)</dt><dd>'+recent+'</dd></div><div><dt>Click rate</dt><dd>'+pct(clicked,sent)+'</dd></div></dl><div class="em-card__actions"><button type="button" class="secondary" data-em-view-group="'+g.id+'">View subscribers</button><button type="button" class="link-button" data-em-edit-group="'+g.id+'">Edit</button></div></article>';}).join('')+'</div>':'<div class="empty"><h2>No groups yet</h2><p>Create groups like “Clients”, “Prospects” or “Newsletter”.</p></div>');
  }
  function openGroup(id){var g=id?state.groups.find(function(x){return x.id===id;}):null;
    var colors=['#041021','#9240fb','#05c168','#ff9e2c','#ff5a65','#1e88e5','#00a3a3'];
    var dlg=modal(g?'Edit group':'Create group','<form class="em-form" data-em-group-form><label>Name<input name="name" required value="'+esc(g?g.name:'')+'"></label><label>Description<input name="description" value="'+esc(g?g.description||'':'')+'"></label><fieldset class="em-fieldset"><legend>Colour</legend><div class="em-colors">'+colors.map(function(c,i){return '<label><input type="radio" name="color" value="'+c+'"'+(((g&&g.color)||colors[0])===c?' checked':'')+'><span style="background:'+c+'"></span></label>';}).join('')+'</div></fieldset><div class="em-actions"><button type="submit">Save group</button>'+(g?'<button type="button" class="em-danger" data-em-del-group>Delete group</button>':'')+'</div><p class="form-message" data-em-msg></p></form>');
    var form=dlg.querySelector('form');form.addEventListener('submit',async function(e){e.preventDefault();var fd=new FormData(form),data={name:String(fd.get('name')).trim(),description:String(fd.get('description')||'').trim()||null,color:fd.get('color')||'#041021'};try{if(g){Object.assign(g,(await patch('em_groups','id=eq.'+g.id,data))[0]);}else{state.groups.push((await post('em_groups',data))[0]);}dlg.close();toast('Group saved','ok');rerender();}catch(err){form.querySelector('[data-em-msg]').textContent=err.message;}});
    var d=dlg.querySelector('[data-em-del-group]');if(d)d.addEventListener('click',async function(){if(!confirmBox('Delete “'+g.name+'”? Subscribers stay on your list.'))return;await del('em_groups','id=eq.'+g.id);state.groups=state.groups.filter(function(x){return x.id!==g.id;});state.members=state.members.filter(function(m){return m.group_id!==g.id;});dlg.close();rerender();});
  }

  // ── Campaigns ────────────────────────────────────────────────
  function campaignStats(c){var rows=state.sends.filter(function(s){return s.campaign_id===c.id;}),sent=rows.filter(function(s){return s.status==='sent';});var clicked=sent.filter(function(s){return s.clicks>0;}).length;var since=c.sent_at?new Date(c.sent_at).getTime():0;var ids={};sent.forEach(function(s){ids[s.subscriber_id]=true;});var unsub=state.subs.filter(function(s){return ids[s.id]&&s.status==='unsubscribed'&&s.unsubscribed_at&&new Date(s.unsubscribed_at).getTime()>=since;}).length;return{rows:rows,sent:sent.length,failed:rows.length-sent.length,clicked:clicked,clicks:sent.reduce(function(a,s){return a+(s.clicks||0);},0),unsub:unsub};}
  function audienceLabel(a){a=a||{};if(a.mode!=='groups')return 'All active subscribers';return (a.groups||[]).map(groupName).join(', ')||'No group selected';}
  function campaignTable(list){return '<div class="table-wrap"><table class="em-table"><thead><tr><th>Campaign</th><th>Status</th><th>Recipients</th><th>Sent</th><th>Click rate</th><th>Date</th><th></th></tr></thead><tbody>'+list.map(function(c){var st=campaignStats(c);var date=c.status==='scheduled'?'Scheduled '+fmtDate(c.scheduled_at,true):c.sent_at?fmtDate(c.sent_at,true):'Edited '+fmtDate(c.updated_at);return '<tr><td><button type="button" class="em-link" data-em-open-campaign="'+c.id+'"><strong>'+esc(c.name)+'</strong><small>'+esc(c.subject||'No subject yet')+'</small></button></td><td>'+badge(c.status)+'</td><td>'+(c.status==='sent'?(c.stats&&c.stats.recipients||st.sent):audienceOf(c.audience).length)+'</td><td>'+st.sent+(st.failed?' <small class="em-fail">('+st.failed+' failed)</small>':'')+'</td><td>'+pct(st.clicked,st.sent)+'</td><td>'+date+'</td><td class="em-row-actions"><button type="button" class="link-button" data-em-open-campaign="'+c.id+'">'+(c.status==='sent'?'Report':'Edit')+'</button><button type="button" class="link-button" data-em-dup-campaign="'+c.id+'">Duplicate</button></td></tr>';}).join('')+'</tbody></table></div>';}
  function renderCampaigns(el){
    var f=ui.campaignFilter,list=state.campaigns.filter(function(c){return !f||c.status===f||(f==='draft'&&c.status==='paused');});
    var count=function(s){return state.campaigns.filter(function(c){return c.status===s;}).length;};
    el.innerHTML=header('Campaigns','Campaigns','Design an email, choose who gets it, then send now or schedule it.','<button type="button" data-em-action="new-campaign">+ Create campaign</button>')+
      '<div class="em-chips">'+[['','All',state.campaigns.length],['draft','Drafts',count('draft')],['scheduled','Scheduled',count('scheduled')],['sending','Sending',count('sending')],['sent','Sent',count('sent')]].map(function(x){return '<button type="button" class="em-chip'+(f===x[0]?' is-active':'')+'" data-em-campaign-filter="'+x[0]+'">'+x[1]+' <b>'+x[2]+'</b></button>';}).join('')+'</div>'+
      (list.length?campaignTable(list):'<div class="empty"><h2>No campaigns here</h2><p>Create a campaign from a template or start from scratch.</p></div>');
  }
  async function newCampaign(){
    var c={name:'Campaign '+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date()),subject:'',preheader:'',language:'fr',from_name:state.brand.company_name||'SB Marketing',reply_to:state.brand.reply_to_email||'contact@sbmarketing.fr',design:clone(DEFAULT_DESIGN),blocks:[],audience:{mode:'all',groups:[],exclude_groups:[]},status:'draft'};
    var saved=(await post('em_campaigns',c))[0];state.campaigns.unshift(saved);openCampaign(saved.id);
  }
  async function duplicateCampaign(id){var c=state.campaigns.find(function(x){return x.id===id;});var copy={name:c.name+' (copy)',subject:c.subject,preheader:c.preheader,language:c.language,from_name:c.from_name,reply_to:c.reply_to,design:c.design,blocks:c.blocks,audience:c.audience,status:'draft'};state.campaigns.unshift((await post('em_campaigns',copy))[0]);toast('Campaign duplicated','ok');rerender();}
  function openCampaign(id){
    var c=state.campaigns.find(function(x){return x.id===id;});if(!c)return;
    if(c.status==='sent')return openReport(c);
    var dlg=modal(c.name,'',{wide:true}),body=dlg.querySelector('.em-modal__body');
    function draw(){
      var n=audienceOf(c.audience).length,hasContent=(c.blocks||[]).length>0;
      var checks=[[!!c.subject,'Subject line'],[hasContent,'Email content'],[n>0,'At least one recipient']];
      body.innerHTML='<div class="em-campaign">'+
        '<section class="em-cstep"><div class="em-cstep__head"><span>1</span><h4>Details</h4></div><div class="em-grid2"><label>Campaign name<input data-c="name" value="'+esc(c.name)+'"></label><label>Language<select data-c="language"><option value="fr"'+(c.language!=='en'?' selected':'')+'>French</option><option value="en"'+(c.language==='en'?' selected':'')+'>English</option></select></label><label class="em-span2">Subject line<input data-c="subject" value="'+esc(c.subject||'')+'" placeholder="e.g. {$name}, nos nouveautés de novembre"><small class="em-hint">Personalise with {$name}, {$company}, {$city}. Keep it under 50 characters ('+String(c.subject||'').length+').</small></label><label class="em-span2">Preview text<input data-c="preheader" value="'+esc(c.preheader||'')+'" placeholder="Shown after the subject in the inbox"></label><label>Sender name<input data-c="from_name" value="'+esc(c.from_name||'')+'"><small class="em-hint">Emails are sent from admin@partners.sbmarketing.fr</small></label><label>Reply-to<input data-c="reply_to" type="email" value="'+esc(c.reply_to||'')+'"></label></div></section>'+
        '<section class="em-cstep"><div class="em-cstep__head"><span>2</span><h4>Content</h4></div>'+(hasContent?'<div class="em-content-row"><div class="em-thumb"><iframe title="Email preview" data-em-thumb tabindex="-1"></iframe></div><div><p><strong>'+(c.blocks.length)+' blocks</strong></p><div class="em-actions"><button type="button" data-em-edit-content>Edit design</button><button type="button" class="secondary" data-em-pick-template>Replace with template</button></div></div></div>':'<p class="em-muted">Start from one of your templates, a starter layout, or a blank canvas.</p><div class="em-actions"><button type="button" data-em-pick-template>Choose template</button><button type="button" class="secondary" data-em-blank>Start from scratch</button></div>')+'</section>'+
        '<section class="em-cstep"><div class="em-cstep__head"><span>3</span><h4>Recipients</h4></div><div class="em-radio-row"><label class="em-check"><input type="radio" name="aud" value="all"'+(c.audience.mode!=='groups'?' checked':'')+'> All active subscribers</label><label class="em-check"><input type="radio" name="aud" value="groups"'+(c.audience.mode==='groups'?' checked':'')+'> Selected groups</label></div>'+
          (c.audience.mode==='groups'?'<div class="em-group-pick">'+state.groups.map(function(g){return '<label class="em-check"><input type="checkbox" data-aud-group value="'+g.id+'"'+((c.audience.groups||[]).indexOf(g.id)>-1?' checked':'')+'> '+esc(g.name)+' <small>('+membersOf(g.id).filter(function(s){return s.status==='active';}).length+')</small></label>';}).join('')+'</div>':'')+
          '<details class="em-exclude"'+((c.audience.exclude_groups||[]).length?' open':'')+'><summary>Exclude groups</summary><div class="em-group-pick">'+state.groups.map(function(g){return '<label class="em-check"><input type="checkbox" data-aud-exclude value="'+g.id+'"'+((c.audience.exclude_groups||[]).indexOf(g.id)>-1?' checked':'')+'> '+esc(g.name)+'</label>';}).join('')+'</div></details>'+
          '<p class="em-recipients"><strong>'+n+'</strong> active subscriber'+(n===1?'':'s')+' will receive this campaign. Unsubscribed, bounced and junk contacts are always skipped.</p></section>'+
        '<section class="em-cstep"><div class="em-cstep__head"><span>4</span><h4>Review &amp; send</h4></div><ul class="em-checklist">'+checks.map(function(x){return '<li class="'+(x[0]?'is-ok':'')+'">'+(x[0]?'✓':'•')+' '+x[1]+'</li>';}).join('')+'</ul>'+
          '<div class="em-test"><input type="email" data-em-test-to placeholder="Send a test to…" value="'+esc(localStorage.getItem('em_test_to')||config.adminEmail||'')+'"><button type="button" class="secondary" data-em-test>Send test</button></div>'+
          '<div class="em-schedule"><label class="em-check"><input type="radio" name="when" value="now"'+(c.status!=='scheduled'?' checked':'')+'> Send now</label><label class="em-check"><input type="radio" name="when" value="later"'+(c.status==='scheduled'?' checked':'')+'> Schedule for</label><input type="datetime-local" data-em-when value="'+(c.scheduled_at?toLocalInput(c.scheduled_at):'')+'"></div>'+
          (c.status==='scheduled'?'<p class="em-note">Scheduled for '+fmtDate(c.scheduled_at,true)+'. Keep any admin tab open around that time — the page sends it automatically.</p>':'')+
          '<div class="em-actions"><button type="button" data-em-send'+(checks.every(function(x){return x[0];})?'':' disabled')+'>'+(c.status==='sending'?'Resume sending':'Send campaign')+'</button>'+(c.status==='scheduled'?'<button type="button" class="secondary" data-em-unschedule>Cancel schedule</button>':'')+'<button type="button" class="em-danger" data-em-del-campaign>Delete</button></div><div class="em-progress" data-em-progress hidden><div><i></i></div><span></span></div><p class="form-message" data-em-msg></p></section></div>';
      var thumb=body.querySelector('[data-em-thumb]');if(thumb)thumb.srcdoc=mergeTags(renderEmail(campaignDoc(c)),sampleSub());
    }
    var saveTimer=null;
    function save(fields){Object.assign(c,fields);clearTimeout(saveTimer);saveTimer=setTimeout(function(){patch('em_campaigns','id=eq.'+c.id,Object.assign({},fields,{updated_at:new Date().toISOString()})).catch(function(e){toast(e.message,'err');});},400);dlg.querySelector('.em-modal__head h3').textContent=c.name;}
    function saveAll(){clearTimeout(saveTimer);return patch('em_campaigns','id=eq.'+c.id,{name:c.name,subject:c.subject,preheader:c.preheader,language:c.language,from_name:c.from_name,reply_to:c.reply_to,design:c.design,blocks:c.blocks,audience:c.audience,updated_at:new Date().toISOString()});}
    draw();
    body.addEventListener('input',function(e){var k=e.target.dataset.c;if(k){var o={};o[k]=e.target.value;save(o);if(k==='subject'){var hint=e.target.parentNode.querySelector('.em-hint');if(hint)hint.textContent='Personalise with {$name}, {$company}, {$city}. Keep it under 50 characters ('+e.target.value.length+').';}}});
    body.addEventListener('change',function(e){var t=e.target;
      if(t.dataset.c==='language'){save({language:t.value});}
      if(t.name==='aud'){c.audience=Object.assign({},c.audience,{mode:t.value});save({audience:c.audience});draw();}
      if(t.hasAttribute('data-aud-group')){c.audience.groups=[].slice.call(body.querySelectorAll('[data-aud-group]:checked')).map(function(x){return x.value;});save({audience:c.audience});draw();}
      if(t.hasAttribute('data-aud-exclude')){c.audience.exclude_groups=[].slice.call(body.querySelectorAll('[data-aud-exclude]:checked')).map(function(x){return x.value;});save({audience:c.audience});draw();}
    });
    body.addEventListener('click',async function(e){var t=e.target.closest('button');if(!t)return;var msg=body.querySelector('[data-em-msg]');
      if(t.hasAttribute('data-em-edit-content'))openBuilder(campaignDoc(c),{title:'Edit campaign: '+c.name,onSave:function(doc){save({design:doc.design,blocks:doc.blocks,subject:doc.subject||c.subject,preheader:doc.preheader||c.preheader});draw();}});
      if(t.hasAttribute('data-em-blank')){var doc={subject:c.subject,preheader:c.preheader,language:c.language,design:clone(DEFAULT_DESIGN),blocks:[newBlock('heading'),newBlock('text'),newBlock('button')]};openBuilder(doc,{title:'Edit campaign: '+c.name,onSave:function(d){save({design:d.design,blocks:d.blocks,subject:d.subject||c.subject,preheader:d.preheader||c.preheader});draw();}});}
      if(t.hasAttribute('data-em-pick-template'))pickTemplate(function(tpl){var doc={subject:c.subject||tpl.subject||'',preheader:c.preheader||tpl.preheader||'',language:c.language,design:clone(tpl.design||DEFAULT_DESIGN),blocks:clone(tpl.blocks||[]).map(function(b){b.id=uid();return b;})};save({design:doc.design,blocks:doc.blocks,subject:doc.subject,preheader:doc.preheader});draw();openBuilder(doc,{title:'Edit campaign: '+c.name,onSave:function(d){save({design:d.design,blocks:d.blocks,subject:d.subject||c.subject,preheader:d.preheader||c.preheader});draw();}});});
      if(t.hasAttribute('data-em-test')){var to=body.querySelector('[data-em-test-to]').value.trim();if(!validEmail(to)){msg.textContent='Enter a valid test email.';return;}if(!c.subject||!(c.blocks||[]).length){msg.textContent='Add a subject and content first.';return;}try{localStorage.setItem('em_test_to',to);}catch(err){}t.disabled=true;msg.textContent='Sending test…';var row=await sendOne(Object.assign(campaignDoc(c),{subject:'[TEST] '+c.subject}),Object.assign(sampleSub(),{id:'test',email:to}),{test:true,track:false,reply_to:c.reply_to});t.disabled=false;msg.textContent=row.status==='sent'?'Test sent to '+to+'.':'Test failed: '+row.error;}
      if(t.hasAttribute('data-em-unschedule')){await patch('em_campaigns','id=eq.'+c.id,{status:'draft',scheduled_at:null});c.status='draft';c.scheduled_at=null;draw();rerender();}
      if(t.hasAttribute('data-em-del-campaign')){if(!confirmBox('Delete this campaign?'))return;await del('em_campaigns','id=eq.'+c.id);state.campaigns=state.campaigns.filter(function(x){return x.id!==c.id;});dlg.close();rerender();}
      if(t.hasAttribute('data-em-send')){
        var when=body.querySelector('[name="when"]:checked').value;await saveAll();
        if(when==='later'){var v=body.querySelector('[data-em-when]').value;if(!v||new Date(v)<=new Date()){msg.textContent='Pick a date and time in the future.';return;}var at=new Date(v).toISOString();await patch('em_campaigns','id=eq.'+c.id,{status:'scheduled',scheduled_at:at});c.status='scheduled';c.scheduled_at=at;toast('Campaign scheduled','ok');draw();rerender();return;}
        var count=audienceOf(c.audience).length;if(!confirmBox('Send “'+c.subject+'” to '+count+' subscriber'+(count===1?'':'s')+' now?'))return;
        t.disabled=true;var bar=body.querySelector('[data-em-progress]');bar.hidden=false;msg.textContent='Sending — keep this window open.';
        try{var stats=await sendCampaign(c,function(i,total,sent,failed){bar.querySelector('i').style.width=(i/total*100)+'%';bar.querySelector('span').textContent=i+' / '+total+' · '+sent+' sent'+(failed?' · '+failed+' failed':'');});toast('Campaign sent to '+stats.sent+' subscribers','ok');dlg.close();rerender();openReport(c);}
        catch(err){msg.textContent=err.message;t.disabled=false;}
      }
    });
    dlg.addEventListener('close',function(){if(saveTimer){clearTimeout(saveTimer);saveAll().catch(function(){});}rerender();});
  }
  function toLocalInput(iso){var d=new Date(iso);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);}
  function openReport(c){
    var st=campaignStats(c),links={};
    var dlg=modal('Report: '+c.name,'<div class="em-report"><div class="em-report__meta"><span>'+badge(c.status)+'</span><span>Sent '+fmtDate(c.sent_at,true)+'</span><span>Subject: <b>'+esc(c.subject)+'</b></span><span>Audience: '+esc(audienceLabel(c.audience))+'</span></div>'+
      '<div class="em-stats">'+stat('Recipients',(c.stats&&c.stats.recipients)||st.sent,'','users')+stat('Delivered to provider',st.sent,st.failed+' failed','send')+stat('Unique clicks',st.clicked,pct(st.clicked,st.sent)+' click rate · '+st.clicks+' total','click')+stat('Unsubscribed',st.unsub,pct(st.unsub,st.sent)+' of recipients','users')+'</div>'+
      '<p class="em-note">Clicks are tracked through sbmarketing.fr/r/. Opens are not tracked (no tracking pixel), so click rate is the engagement metric here.</p>'+
      '<div class="em-cols"><section class="em-panel"><div class="em-panel__head"><h3>Email preview</h3></div><div class="em-thumb em-thumb--tall"><iframe title="Email" data-em-thumb></iframe></div></section><section class="em-panel"><div class="em-panel__head"><h3>Top links</h3></div><div data-em-links class="em-muted">Loading…</div></section></div>'+
      '<section class="em-panel"><div class="em-panel__head"><h3>Recipient activity</h3><span>'+st.rows.length+' emails</span></div><div class="table-wrap"><table class="em-table"><thead><tr><th>Email</th><th>Status</th><th>Clicks</th><th>Sent</th></tr></thead><tbody>'+st.rows.slice(0,500).map(function(r){return '<tr><td>'+esc(r.email)+'</td><td>'+badge(r.status)+(r.error?' <small class="em-fail">'+esc(r.error)+'</small>':'')+'</td><td>'+(r.clicks||0)+'</td><td>'+fmtDate(r.sent_at,true)+'</td></tr>';}).join('')+'</tbody></table></div>'+
      (st.failed?'<div class="em-actions"><button type="button" data-em-retry>Retry '+st.failed+' failed</button></div>':'')+'</section><div class="em-actions"><button type="button" class="secondary" data-em-dup>Duplicate campaign</button></div></div>',{wide:true});
    dlg.querySelector('[data-em-thumb]').srcdoc=mergeTags(renderEmail(campaignDoc(c)),sampleSub());
    api('/rest/v1/em_clicks?select=url,send_id&send_id=in.('+(st.rows.map(function(r){return r.id;}).slice(0,300).join(',')||'00000000-0000-0000-0000-000000000000')+')').then(function(rows){rows.forEach(function(r){links[r.url]=(links[r.url]||0)+1;});var list=Object.keys(links).sort(function(a,b){return links[b]-links[a];});dlg.querySelector('[data-em-links]').innerHTML=list.length?'<ul class="em-linklist">'+list.map(function(u){return '<li><span>'+esc(u)+'</span><b>'+links[u]+'</b></li>';}).join('')+'</ul>':'No clicks yet.';}).catch(function(){dlg.querySelector('[data-em-links]').textContent='No click data.';});
    var retry=dlg.querySelector('[data-em-retry]');if(retry)retry.addEventListener('click',async function(){retry.disabled=true;retry.textContent='Retrying…';try{var failedIds={};st.rows.forEach(function(r){if(r.status==='failed')failedIds[r.subscriber_id]=true;});await sendCampaign(c);toast('Retry finished','ok');dlg.close();openReport(c);}catch(e){retry.textContent=e.message;}});
    dlg.querySelector('[data-em-dup]').addEventListener('click',function(){dlg.close();duplicateCampaign(c.id);});
  }

  // ── Templates ────────────────────────────────────────────────
  function starters(){
    var D=DEFAULT_DESIGN;function b(type,o){return Object.assign(newBlock(type),o||{});}
    return [
      {key:'blank',name:'Blank canvas',category:'basic',subject:'',preheader:'',design:clone(D),blocks:[b('heading',{text:'Votre titre'}),b('text')]},
      {key:'newsletter',name:'Monthly newsletter',category:'newsletter',subject:'{$name}, les nouveautés du mois',preheader:'Actualités, conseils et offres du moment',design:clone(D),blocks:[b('image',{url:'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1200',radius:14}),b('heading',{text:'Les nouveautés du mois'}),b('text',{text:'Bonjour {$name},\n\nVoici ce qui s’est passé ce mois-ci et ce qui vous attend le mois prochain.'}),b('imagetext',{title:'Actualité n°1',text:'Présentez votre première actualité en deux ou trois phrases.'}),b('imagetext',{title:'Actualité n°2',text:'Une deuxième actualité, un nouveau service ou un conseil.',side:'right',url:'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600'}),b('divider'),b('button',{label:'Lire la suite'}),b('social',{instagram:'https://www.instagram.com/sb.marketing06/',facebook:'https://www.facebook.com/profile.php?id=61556671255980',website:'https://www.sbmarketing.fr'})]},
      {key:'promo',name:'Promotion / special offer',category:'promotion',subject:'🎁 {$name}, une offre rien que pour vous',preheader:'-20% pendant 7 jours seulement',design:Object.assign(clone(D),{accent:'#e8453c',header_bg:'#041021'}),blocks:[b('heading',{text:'Une offre exclusive pour vous',align:'center'}),b('text',{text:'Bonjour {$name},\n\nPour vous remercier de votre fidélité, profitez d’une remise spéciale cette semaine.',align:'center'}),b('promo'),b('button',{label:'J’en profite'}),b('text',{text:'Offre valable 7 jours, non cumulable.',size:12,align:'center',color:'#9ca3af'})]},
      {key:'welcome',name:'Welcome email',category:'welcome',subject:'Bienvenue {$name} 👋',preheader:'Merci de nous avoir rejoints',design:clone(D),blocks:[b('heading',{text:'Bienvenue {$name} !',align:'center'}),b('text',{text:'Merci de vous être inscrit(e). Vous recevrez désormais nos conseils marketing, nos actualités et nos offres en avant-première.\n\nVoici ce qui vous attend :\n\n- Des conseils concrets pour attirer plus de clients\n- Les tendances du digital à Nice et sur la Côte d’Azur\n- Des offres réservées aux abonnés',align:'left'}),b('button',{label:'Découvrir nos services'}),b('quote')]},
      {key:'event',name:'Event invitation',category:'event',subject:'Vous êtes invité(e) 🎉',preheader:'Réservez votre place dès maintenant',design:Object.assign(clone(D),{accent:'#9240fb'}),blocks:[b('image',{url:'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200',radius:14}),b('heading',{text:'Vous êtes invité(e) !',align:'center'}),b('text',{text:'**Date :** jeudi 12 décembre, 18h30\n**Lieu :** Nice, Promenade des Anglais\n\nRejoignez-nous pour une soirée d’échanges autour du marketing local.',align:'center'}),b('button',{label:'Je réserve ma place'})]},
      {key:'tip',name:'Marketing tip',category:'newsletter',subject:'💡 Le conseil marketing de la semaine',preheader:'5 minutes pour améliorer votre visibilité',design:clone(D),blocks:[b('heading',{text:'Le conseil de la semaine'}),b('text',{text:'Bonjour {$name},\n\n**Mettez à jour votre fiche Google Business Profile.** Ajoutez 3 nouvelles photos et répondez à vos derniers avis : c’est l’action la plus rentable pour votre visibilité locale.'}),b('quote',{text:'Les fiches avec des photos récentes reçoivent jusqu’à 42% de demandes d’itinéraire en plus.',author:'Google',stars:0}),b('button',{label:'Besoin d’aide ? Parlons-en'})]},
      {key:'review',name:'Ask for a Google review',category:'reviews',subject:'{$name}, votre avis compte pour nous',preheader:'30 secondes pour nous aider',design:clone(D),blocks:[b('heading',{text:'Votre avis compte ⭐',align:'center'}),b('text',{text:'Bonjour {$name},\n\nMerci pour votre confiance ! Si vous êtes satisfait(e), un avis Google nous aiderait énormément. Cela prend moins de 30 secondes.',align:'center'}),b('button',{label:'Laisser un avis Google',url:'https://g.page/r/'}),b('text',{text:'Merci du fond du cœur,\nL’équipe',align:'center',size:14})]},
      {key:'winback',name:'We miss you (re-engagement)',category:'re-engagement',subject:'{$name}, vous nous manquez',preheader:'Un petit cadeau pour votre retour',design:clone(D),blocks:[b('heading',{text:'Vous nous manquez !',align:'center'}),b('text',{text:'Bonjour {$name},\n\nCela fait un moment ! Pour fêter votre retour, voici un code de réduction valable 14 jours.',align:'center'}),b('promo',{title:'-15% sur votre retour',code:'RETOUR15'}),b('button',{label:'Revenir sur le site'})]}
    ];
  }
  function renderTemplates(el){
    el.innerHTML=header('Content','Templates','Reusable email designs built with the drag & drop editor.','<button type="button" data-em-action="new-template">+ Create template</button>')+
      '<h3 class="em-section-title">My templates</h3>'+(state.templates.length?'<div class="em-tpl-grid">'+state.templates.map(function(t){return tplCard(t,'mine');}).join('')+'</div>':'<div class="em-empty-inline">No saved templates yet — start from a layout below.</div>')+
      '<h3 class="em-section-title">Starter layouts</h3><div class="em-tpl-grid">'+starters().map(function(t){return tplCard(t,'starter');}).join('')+'</div>';
    el.querySelectorAll('[data-em-tpl-frame]').forEach(function(f){var t=f.dataset.emTplKind==='mine'?state.templates.find(function(x){return x.id===f.dataset.emTplFrame;}):starters().find(function(x){return x.key===f.dataset.emTplFrame;});if(t)f.srcdoc=mergeTags(renderEmail(t),sampleSub());});
  }
  function tplCard(t,kind){var id=kind==='mine'?t.id:t.key;return '<article class="em-tpl"><div class="em-tpl__preview"><iframe title="'+esc(t.name)+'" tabindex="-1" loading="lazy" data-em-tpl-frame="'+esc(id)+'" data-em-tpl-kind="'+kind+'"></iframe></div><div class="em-tpl__body"><strong>'+esc(t.name)+'</strong><small>'+esc(t.category||'')+(kind==='mine'?' · edited '+fmtDate(t.updated_at):'')+'</small><div class="em-tpl__actions">'+(kind==='mine'?'<button type="button" class="secondary" data-em-edit-tpl="'+id+'">Edit</button><button type="button" class="link-button" data-em-use-tpl="'+id+'">Use in campaign</button><button type="button" class="link-button" data-em-dup-tpl="'+id+'">Duplicate</button><button type="button" class="link-button em-danger-link" data-em-del-tpl="'+id+'">Delete</button>':'<button type="button" class="secondary" data-em-starter="'+id+'">Customise</button>')+'</div></div></article>';}
  function editTemplate(t,isNew){
    var doc={subject:t.subject,preheader:t.preheader,language:t.language||'fr',design:t.design,blocks:t.blocks,name:t.name,category:t.category};
    openBuilder(doc,{title:isNew?'New template':'Edit template',withName:true,onSave:async function(d){var data={name:d.name||'Untitled template',category:d.category||'newsletter',subject:d.subject||null,preheader:d.preheader||null,language:d.language||'fr',design:d.design,blocks:d.blocks,updated_at:new Date().toISOString()};if(t.id){Object.assign(t,(await patch('em_templates','id=eq.'+t.id,data))[0]);}else{var saved=(await post('em_templates',data))[0];state.templates.unshift(saved);t=saved;}toast('Template saved','ok');rerender();}});
  }
  function pickTemplate(cb){
    var all=state.templates.map(function(t){return{kind:'mine',t:t,id:t.id};}).concat(starters().map(function(t){return{kind:'starter',t:t,id:t.key};}));
    var dlg=modal('Choose a template','<div class="em-tpl-grid em-tpl-grid--pick">'+all.map(function(x){return '<button type="button" class="em-tpl em-tpl--pick" data-em-pick="'+x.kind+':'+esc(x.id)+'"><div class="em-tpl__preview"><iframe title="" tabindex="-1" loading="lazy" data-pick-frame="'+x.kind+':'+esc(x.id)+'"></iframe></div><div class="em-tpl__body"><strong>'+esc(x.t.name)+'</strong><small>'+(x.kind==='mine'?'My template':'Starter')+'</small></div></button>';}).join('')+'</div>',{wide:true});
    dlg.querySelectorAll('[data-pick-frame]').forEach(function(f){var x=all.find(function(a){return a.kind+':'+a.id===f.dataset.pickFrame;});f.srcdoc=mergeTags(renderEmail(x.t),sampleSub());});
    dlg.addEventListener('click',function(e){var b=e.target.closest('[data-em-pick]');if(!b)return;var x=all.find(function(a){return a.kind+':'+a.id===b.dataset.emPick;});dlg.close();cb(x.t);});
  }

  // ── Drag & drop builder ──────────────────────────────────────
  function openBuilder(doc,opts){
    doc=clone(doc);doc.design=design(doc);doc.blocks=(doc.blocks||[]).map(function(b){if(!b.id)b.id=uid();return b;});
    var selected=null,device='desktop',dirty=false,history=[JSON.stringify(doc)];
    var dlg=document.createElement('dialog');dlg.className='em-builder';
    dlg.innerHTML='<header class="em-builder__top"><div class="em-builder__title"><button type="button" class="icon-button" data-b-close aria-label="Close">✕</button><strong>'+esc(opts.title||'Email builder')+'</strong></div><div class="em-builder__device"><button type="button" class="is-active" data-b-device="desktop">Desktop</button><button type="button" data-b-device="mobile">Mobile</button></div><div class="em-builder__actions"><button type="button" class="secondary" data-b-undo>Undo</button><button type="button" class="secondary" data-b-preview>Preview</button><button type="button" class="secondary" data-b-test>Send test</button><button type="button" data-b-save>Save</button></div></header>'+
      '<div class="em-builder__body"><aside class="em-builder__palette"><div class="em-ptabs"><button type="button" class="is-active" data-b-ptab="blocks">Blocks</button><button type="button" data-b-ptab="settings">Email settings</button></div><div data-b-ppane="blocks"><p class="em-muted">Drag a block into the email, or click to add it below the selected block.</p><div class="em-palette">'+Object.keys(BLOCKS).map(function(k){return '<button type="button" draggable="true" data-b-add="'+k+'"><span>'+esc(BLOCKS[k].icon)+'</span>'+esc(BLOCKS[k].label)+'</button>';}).join('')+'</div></div><div data-b-ppane="settings" hidden></div></aside>'+
      '<main class="em-builder__canvas" data-b-canvas-wrap><div class="em-builder__paper" data-b-paper></div></main><aside class="em-builder__props" data-b-props></aside></div>';
    document.body.appendChild(dlg);dlg.showModal();
    var paper=dlg.querySelector('[data-b-paper]'),props=dlg.querySelector('[data-b-props]'),settings=dlg.querySelector('[data-b-ppane="settings"]');
    function snapshot(){dirty=true;var s=JSON.stringify(doc);if(history[history.length-1]!==s){history.push(s);if(history.length>60)history.shift();}}
    function drawCanvas(){
      var d=doc.design,b=state.brand||{};
      paper.style.background=d.bg;paper.classList.toggle('is-mobile',device==='mobile');
      var logo=d.logo_url||b.logo_url||'https://www.sbmarketing.fr/images/sb-marketing-email-logo.png';
      paper.innerHTML='<div class="em-paper__inbox"><strong>'+esc(doc.subject||'No subject')+'</strong><span>'+esc(doc.preheader||'')+'</span></div><div class="em-paper__email" style="max-width:'+(device==='mobile'?360:d.width)+'px;background:'+d.content_bg+';border-radius:'+d.radius+'px;font-family:'+d.font+';">'+
        (d.header?'<div class="em-paper__header" data-b-section="settings" style="background:'+d.header_bg+';"><img src="'+esc(logo)+'" alt=""></div>':'')+
        '<div class="em-paper__blocks" data-b-blocks>'+(doc.blocks.length?doc.blocks.map(function(bl,i){return '<div class="em-cblock'+(selected===bl.id?' is-selected':'')+'" draggable="true" data-b-block="'+bl.id+'"><div class="em-cblock__bar"><span>'+esc(BLOCKS[bl.type]?BLOCKS[bl.type].label:bl.type)+'</span><button type="button" data-b-up title="Move up"'+(i===0?' disabled':'')+'>↑</button><button type="button" data-b-down title="Move down"'+(i===doc.blocks.length-1?' disabled':'')+'>↓</button><button type="button" data-b-dup title="Duplicate">⧉</button><button type="button" data-b-del title="Delete">✕</button></div>'+mergeTags(blockHtml(bl,d),sampleSub())+'</div>';}).join(''):'<div class="em-drop-empty">Drag blocks here to start</div>')+'</div>'+
        (d.footer?'<div class="em-paper__footer" data-b-section="settings">'+esc(b.company_name||'SB Marketing')+' · '+(doc.language==='en'?'Unsubscribe':'Se désinscrire')+'</div>':'')+'</div>';
      paper.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();});});
    }
    function field(label,key,val,type,extra){
      if(type==='textarea')return '<label>'+label+'<textarea rows="'+((extra&&extra.rows)||6)+'" data-p="'+key+'">'+esc(val)+'</textarea>'+(extra&&extra.hint?'<small class="em-hint">'+extra.hint+'</small>':'')+'</label>';
      if(type==='select')return '<label>'+label+'<select data-p="'+key+'">'+extra.options.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(val)===String(o[0])?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select></label>';
      if(type==='color')return '<label class="em-color-field">'+label+'<span><input type="color" data-p="'+key+'" value="'+esc(val||'#041021')+'"><input type="text" data-p="'+key+'" value="'+esc(val||'')+'" placeholder="default"></span></label>';
      if(type==='checkbox')return '<label class="em-check"><input type="checkbox" data-p="'+key+'"'+(val?' checked':'')+'> '+label+'</label>';
      if(type==='range')return '<label>'+label+' <b data-range-out="'+key+'">'+val+'</b><input type="range" data-p="'+key+'" value="'+val+'" min="'+extra.min+'" max="'+extra.max+'" step="'+(extra.step||1)+'"></label>';
      return '<label>'+label+'<input type="'+(type||'text')+'" data-p="'+key+'" value="'+esc(val==null?'':val)+'">'+(extra&&extra.hint?'<small class="em-hint">'+extra.hint+'</small>':'')+(extra&&extra.upload?'<button type="button" class="secondary em-upload-btn" data-b-upload="'+key+'">Upload image</button>':'')+'</label>';
    }
    var ALIGN={options:[['left','Left'],['center','Center'],['right','Right']]};
    var MERGE='Merge tags: {$name} {$last_name} {$company} {$city} {$email}. Format: **bold**, *italic*, [link](https://…), lines starting with “- ” become a list.';
    function drawProps(){
      var bl=doc.blocks.find(function(x){return x.id===selected;});
      if(!bl){props.innerHTML='<div class="em-props__empty"><h4>Select a block</h4><p class="em-muted">Click any block in the email to edit its content and style. Use the <b>Email settings</b> tab for colours, fonts, header and footer.</p><h4>Subject &amp; preview</h4>'+field('Subject line','@subject',doc.subject)+field('Preview text','@preheader',doc.preheader)+field('Language','@language',doc.language||'fr','select',{options:[['fr','French'],['en','English']]})+(opts.withName?field('Template name','@name',doc.name)+field('Category','@category',doc.category||'newsletter','select',{options:[['newsletter','Newsletter'],['promotion','Promotion'],['welcome','Welcome'],['event','Event'],['reviews','Reviews'],['re-engagement','Re-engagement'],['basic','Basic']]}):'')+'</div>';return;}
      var f={
        heading:function(){return field('Text','text',bl.text,'textarea',{rows:3,hint:MERGE})+field('Size','level',bl.level,'select',{options:[[1,'Large'],[2,'Medium'],[3,'Small']]})+field('Alignment','align',bl.align,'select',ALIGN)+field('Colour','color',bl.color,'color');},
        text:function(){return field('Text','text',bl.text,'textarea',{rows:10,hint:MERGE})+field('Font size','size',bl.size||15,'range',{min:11,max:22})+field('Alignment','align',bl.align,'select',ALIGN)+field('Colour','color',bl.color,'color');},
        button:function(){return field('Label','label',bl.label)+field('Link','url',bl.url,'url')+field('Alignment','align',bl.align,'select',ALIGN)+field('Background','bg',bl.bg,'color')+field('Text colour','color',bl.color,'color')+field('Corner radius','radius',bl.radius,'range',{min:0,max:48})+field('Full width','full',bl.full,'checkbox');},
        image:function(){return field('Image URL','url',bl.url,'url',{upload:true})+field('Alt text','alt',bl.alt)+field('Link (optional)','link',bl.link,'url')+field('Width %','width',bl.width||100,'range',{min:20,max:100,step:5})+field('Alignment','align',bl.align,'select',ALIGN)+field('Corner radius','radius',bl.radius||0,'range',{min:0,max:30});},
        imagetext:function(){return field('Image URL','url',bl.url,'url',{upload:true})+field('Title','title',bl.title)+field('Text','text',bl.text,'textarea',{rows:4,hint:MERGE})+field('Link label','button',bl.button)+field('Link','link',bl.link,'url')+field('Image side','side',bl.side,'select',{options:[['left','Left'],['right','Right']]});},
        promo:function(){return field('Title','title',bl.title)+field('Code','code',bl.code)+field('Small print','text',bl.text)+field('Background','bg',bl.bg,'color')+field('Accent','color',bl.color,'color');},
        quote:function(){return field('Quote','text',bl.text,'textarea',{rows:4})+field('Author','author',bl.author)+field('Stars','stars',bl.stars,'select',{options:[[0,'None'],[3,'★★★'],[4,'★★★★'],[5,'★★★★★']]});},
        video:function(){return field('Video link (YouTube, Vimeo…)','url',bl.url,'url')+field('Thumbnail image','thumb',bl.thumb,'url',{upload:true})+field('Caption','caption',bl.caption);},
        social:function(){return field('Instagram','instagram',bl.instagram,'url')+field('Facebook','facebook',bl.facebook,'url')+field('LinkedIn','linkedin',bl.linkedin,'url')+field('TikTok','tiktok',bl.tiktok,'url')+field('Website','website',bl.website,'url')+field('Alignment','align',bl.align,'select',ALIGN);},
        divider:function(){return field('Colour','color',bl.color,'color')+field('Thickness','thickness',bl.thickness||1,'range',{min:1,max:6});},
        spacer:function(){return field('Height','height',bl.height||24,'range',{min:8,max:120,step:4});},
        html:function(){return field('HTML','html',bl.html,'textarea',{rows:12,hint:'Use inline styles — email clients ignore <style> tags.'});}
      }[bl.type];
      props.innerHTML='<div class="em-props__head"><h4>'+esc(BLOCKS[bl.type].label)+'</h4><button type="button" class="link-button" data-b-deselect>Done</button></div><div class="em-props__fields">'+(f?f():'')+'</div>';
    }
    function drawSettings(){var d=doc.design;settings.innerHTML='<div class="em-props__fields">'+field('Page background','$bg',d.bg,'color')+field('Email background','$content_bg',d.content_bg,'color')+field('Accent (buttons & links)','$accent',d.accent,'color')+field('Heading colour','$heading',d.heading,'color')+field('Text colour','$text',d.text,'color')+field('Font','$font',d.font,'select',{options:FONTS})+field('Email width','$width',d.width,'range',{min:480,max:700,step:10})+field('Corner radius','$radius',d.radius,'range',{min:0,max:32})+field('Show logo header','$header',d.header,'checkbox')+field('Header background','$header_bg',d.header_bg,'color')+field('Logo URL (optional)','$logo_url',d.logo_url,'url',{upload:true,hint:'Defaults to the logo in admin Settings.'})+field('Show footer','$footer',d.footer,'checkbox')+field('Footer note (optional)','$footer_text',d.footer_text,'textarea',{rows:3})+'<p class="em-muted">The footer always includes an unsubscribe link (required by law).</p></div>';}
    function applyValue(key,val){
      if(key[0]==='$'){doc.design[key.slice(1)]=val;}
      else if(key[0]==='@'){doc[key.slice(1)]=val;}
      else{var bl=doc.blocks.find(function(x){return x.id===selected;});if(bl)bl[key]=val;}
    }
    function onField(e){var t=e.target,key=t.dataset.p;if(!key)return;var val=t.type==='checkbox'?t.checked:(t.type==='range'||t.dataset.p==='level'||t.dataset.p==='stars')?Number(t.value):t.value;
      applyValue(key,val);var out=t.parentNode.querySelector('[data-range-out="'+key+'"]')||t.closest('label').querySelector('[data-range-out]');if(out)out.textContent=t.value;
      if(t.type==='color'){var tx=t.parentNode.querySelector('input[type="text"]');if(tx)tx.value=t.value;}
      if(t.type==='text'&&t.parentNode.querySelector('input[type="color"]')&&/^#[0-9a-f]{6}$/i.test(t.value))t.parentNode.querySelector('input[type="color"]').value=t.value;
      drawCanvas();if(e.type==='change')snapshot();}
    [props,settings].forEach(function(p){p.addEventListener('input',onField);p.addEventListener('change',onField);p.addEventListener('click',async function(e){
      if(e.target.closest('[data-b-deselect]')){selected=null;drawCanvas();drawProps();return;}
      var up=e.target.closest('[data-b-upload]');if(up){var input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=async function(){var file=input.files[0];if(!file)return;up.textContent='Uploading…';try{var url=await uploadImage(file);applyValue(up.dataset.bUpload,url);var fld=up.parentNode.querySelector('input[data-p]');if(fld)fld.value=url;snapshot();drawCanvas();up.textContent='Upload image';}catch(err){up.textContent=err.message;}};input.click();}
    });});
    function insertBlock(type,index){var bl=newBlock(type);if(index==null){var at=doc.blocks.findIndex(function(x){return x.id===selected;});index=at>-1?at+1:doc.blocks.length;}doc.blocks.splice(index,0,bl);selected=bl.id;snapshot();drawCanvas();drawProps();setTimeout(function(){var el=paper.querySelector('[data-b-block="'+bl.id+'"]');if(el)el.scrollIntoView({block:'nearest',behavior:'smooth'});},30);}
    dlg.querySelector('.em-palette').addEventListener('click',function(e){var b=e.target.closest('[data-b-add]');if(b)insertBlock(b.dataset.bAdd);});
    // drag from palette / reorder
    var drag=null;
    dlg.addEventListener('dragstart',function(e){var add=e.target.closest('[data-b-add]'),blk=e.target.closest('[data-b-block]');if(add)drag={add:add.dataset.bAdd};else if(blk)drag={move:blk.dataset.bBlock};else return;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain','block');}catch(err){}});
    function dropIndex(y){var els=[].slice.call(paper.querySelectorAll('[data-b-block]'));for(var i=0;i<els.length;i++){var r=els[i].getBoundingClientRect();if(y<r.top+r.height/2)return i;}return els.length;}
    function clearMarks(){paper.querySelectorAll('.drop-before,.drop-after').forEach(function(x){x.classList.remove('drop-before','drop-after');});}
    paper.addEventListener('dragover',function(e){if(!drag)return;e.preventDefault();clearMarks();var i=dropIndex(e.clientY),els=paper.querySelectorAll('[data-b-block]');if(els[i])els[i].classList.add('drop-before');else if(els.length)els[els.length-1].classList.add('drop-after');});
    paper.addEventListener('dragleave',function(e){if(!paper.contains(e.relatedTarget))clearMarks();});
    paper.addEventListener('drop',function(e){if(!drag)return;e.preventDefault();clearMarks();var i=dropIndex(e.clientY);if(drag.add)insertBlock(drag.add,i);else{var from=doc.blocks.findIndex(function(x){return x.id===drag.move;});if(from>-1){var bl=doc.blocks.splice(from,1)[0];if(from<i)i--;doc.blocks.splice(i,0,bl);snapshot();drawCanvas();}}drag=null;});
    dlg.addEventListener('dragend',function(){drag=null;clearMarks();});
    paper.addEventListener('click',function(e){
      var blk=e.target.closest('[data-b-block]');
      if(e.target.closest('[data-b-section]')){showPane('settings');return;}
      if(!blk)return;var id=blk.dataset.bBlock,i=doc.blocks.findIndex(function(x){return x.id===id;});
      if(e.target.closest('[data-b-up]')&&i>0){doc.blocks.splice(i-1,0,doc.blocks.splice(i,1)[0]);snapshot();}
      else if(e.target.closest('[data-b-down]')&&i<doc.blocks.length-1){doc.blocks.splice(i+1,0,doc.blocks.splice(i,1)[0]);snapshot();}
      else if(e.target.closest('[data-b-dup]')){var copy=clone(doc.blocks[i]);copy.id=uid();doc.blocks.splice(i+1,0,copy);selected=copy.id;snapshot();}
      else if(e.target.closest('[data-b-del]')){doc.blocks.splice(i,1);if(selected===id)selected=null;snapshot();}
      else{selected=id;showPane('blocks');}
      drawCanvas();drawProps();
    });
    function showPane(name){dlg.querySelectorAll('[data-b-ptab]').forEach(function(x){x.classList.toggle('is-active',x.dataset.bPtab===name);});dlg.querySelectorAll('[data-b-ppane]').forEach(function(p){p.hidden=p.dataset.bPpane!==name;});if(name==='settings')drawSettings();}
    dlg.querySelectorAll('[data-b-ptab]').forEach(function(b){b.addEventListener('click',function(){showPane(b.dataset.bPtab);});});
    dlg.querySelectorAll('[data-b-device]').forEach(function(b){b.addEventListener('click',function(){device=b.dataset.bDevice;dlg.querySelectorAll('[data-b-device]').forEach(function(x){x.classList.toggle('is-active',x===b);});drawCanvas();});});
    dlg.querySelector('[data-b-undo]').addEventListener('click',function(){if(history.length<2)return;history.pop();var prev=JSON.parse(history[history.length-1]);doc.design=prev.design;doc.blocks=prev.blocks;doc.subject=prev.subject;doc.preheader=prev.preheader;selected=null;drawCanvas();drawProps();drawSettings();});
    dlg.querySelector('[data-b-preview]').addEventListener('click',function(){var p=modal('Preview','<div class="em-preview-switch"><button type="button" class="em-chip is-active" data-pv="100%">Desktop</button><button type="button" class="em-chip" data-pv="375px">Mobile</button></div><div class="em-preview-frame"><iframe title="Preview" data-pv-frame></iframe></div>',{wide:true});var fr=p.querySelector('[data-pv-frame]');fr.srcdoc=mergeTags(renderEmail(doc),sampleSub());p.querySelectorAll('[data-pv]').forEach(function(b){b.addEventListener('click',function(){p.querySelectorAll('[data-pv]').forEach(function(x){x.classList.toggle('is-active',x===b);});fr.style.width=b.dataset.pv;});});});
    dlg.querySelector('[data-b-test]').addEventListener('click',async function(){var to=window.prompt('Send a test email to:',localStorage.getItem('em_test_to')||config.adminEmail||'');if(!to)return;if(!validEmail(to)){toast('Invalid email','err');return;}try{localStorage.setItem('em_test_to',to);}catch(e){}var btn=this;btn.disabled=true;btn.textContent='Sending…';var row=await sendOne(Object.assign({},doc,{subject:'[TEST] '+(doc.subject||'Email preview')}),Object.assign(sampleSub(),{id:'test',email:to}),{test:true,track:false});btn.disabled=false;btn.textContent='Send test';toast(row.status==='sent'?'Test sent to '+to:'Test failed: '+row.error,row.status==='sent'?'ok':'err');});
    async function close(){if(dirty&&!confirmBox('Close without saving your changes?'))return;dlg.close();}
    dlg.querySelector('[data-b-close]').addEventListener('click',close);
    dlg.addEventListener('cancel',function(e){e.preventDefault();close();});
    dlg.querySelector('[data-b-save]').addEventListener('click',async function(){var btn=this;btn.disabled=true;btn.textContent='Saving…';try{await opts.onSave(clone(doc));dirty=false;dlg.close();}catch(err){toast(err.message,'err');btn.disabled=false;btn.textContent='Save';}});
    dlg.addEventListener('close',function(){dlg.remove();});
    drawCanvas();drawProps();
  }
  async function uploadImage(file){var name=Date.now()+'-'+file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');var res=await rawFetch(config.url+'/storage/v1/object/email-assets/'+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});if(!res.ok){var d=await res.json().catch(function(){return{};});throw new Error(d.message||'Upload failed');}return config.url+'/storage/v1/object/public/email-assets/'+name;}

  // ── Automations ──────────────────────────────────────────────
  function triggerLabel(t){t=t||{};if(t.type==='joins_group')return 'When someone joins “'+(t.group_id?groupName(t.group_id):'…')+'”';if(t.type==='form'){var f=state.forms.find(function(x){return x.id===t.form_id;});return 'When someone signs up via “'+(f?f.name:'…')+'”';}return 'When anyone new subscribes';}
  function autoStats(a){var runs=state.runs.filter(function(r){return r.automation_id===a.id;}),sends=state.sends.filter(function(s){return s.automation_id===a.id&&s.status==='sent';});return{enrolled:runs.length,active:runs.filter(function(r){return r.status==='active';}).length,completed:runs.filter(function(r){return r.status==='completed';}).length,sent:sends.length,clicked:sends.filter(function(s){return s.clicks>0;}).length,failed:runs.filter(function(r){return r.last_error;}).length};}
  function renderAutomations(el){
    var due=state.runs.filter(function(r){return r.status==='active'&&new Date(r.next_run_at)<=new Date();}).length;
    el.innerHTML=header('Automation','Automations','Send the right email at the right moment — welcome series, follow-ups and nurturing, on autopilot.','<button type="button" class="secondary" data-em-action="run-autos">Run due steps'+(due?' ('+due+')':'')+'</button><button type="button" data-em-action="new-auto">+ Create automation</button>')+
      '<p class="em-note">Automations are processed by this admin page: every minute while any admin tab is open, due emails go out automatically. Delays are counted from the previous step.</p>'+
      (state.automations.length?'<div class="em-card-grid">'+state.automations.map(function(a){var s=autoStats(a),emails=(a.steps||[]).filter(function(x){return x.type==='email';}).length;return '<article class="em-card em-card--auto"><div class="em-card__head"><span class="em-auto-icon">'+icon('zap')+'</span><h3>'+esc(a.name)+'</h3>'+badge(a.status)+'</div><p>'+esc(triggerLabel(a.trigger))+' · '+emails+' email'+(emails===1?'':'s')+'</p><dl class="em-kv"><div><dt>In progress</dt><dd>'+s.active+'</dd></div><div><dt>Completed</dt><dd>'+s.completed+'</dd></div><div><dt>Emails sent</dt><dd>'+s.sent+'</dd></div><div><dt>Click rate</dt><dd>'+pct(s.clicked,s.sent)+'</dd></div></dl><div class="em-card__actions"><button type="button" class="secondary" data-em-open-auto="'+a.id+'">Edit workflow</button><button type="button" class="link-button" data-em-toggle-auto="'+a.id+'">'+(a.status==='active'?'Pause':'Activate')+'</button></div></article>';}).join('')+'</div>':'<div class="empty"><h2>No automations yet</h2><p>Start with a welcome series: it greets every new subscriber and introduces your services.</p></div>')+
      '<h3 class="em-section-title">Recipes</h3><div class="em-card-grid">'+[['welcome','👋 Welcome series','3 emails over 7 days for every new subscriber'],['client','🤝 New client onboarding','Welcome + tips when someone joins the Clients group'],['review','⭐ Review request','Ask for a Google review 3 days after joining a group']].map(function(r){return '<article class="em-card em-card--recipe"><h3>'+r[1]+'</h3><p>'+r[2]+'</p><button type="button" class="secondary" data-em-recipe="'+r[0]+'">Use recipe</button></article>';}).join('')+'</div>';
  }
  function recipe(key){
    var s=starters(),pick=function(k){return s.find(function(x){return x.key===k;});};
    var email=function(t,subject){return{type:'email',id:uid(),subject:subject||t.subject,preheader:t.preheader,language:'fr',design:t.design,blocks:t.blocks};};
    var clients=state.groups.find(function(g){return /client/i.test(g.name);});
    if(key==='welcome')return{name:'Welcome series',trigger:{type:'subscribes'},steps:[email(pick('welcome')),{type:'delay',id:uid(),amount:3,unit:'days'},email(pick('tip')),{type:'delay',id:uid(),amount:4,unit:'days'},email(pick('promo'))]};
    if(key==='client')return{name:'New client onboarding',trigger:{type:'joins_group',group_id:clients?clients.id:null},steps:[email(pick('welcome'),'Bienvenue chez SB Marketing, {$name} !'),{type:'delay',id:uid(),amount:7,unit:'days'},email(pick('tip'))]};
    return{name:'Review request',trigger:{type:'joins_group',group_id:clients?clients.id:null},steps:[{type:'delay',id:uid(),amount:3,unit:'days'},email(pick('review'))]};
  }
  async function createAutomation(data){var saved=(await post('em_automations',Object.assign({status:'draft'},data)))[0];state.automations.unshift(saved);rerender();openAutomation(saved.id);}
  function openAutomation(id){
    var a=state.automations.find(function(x){return x.id===id;});if(!a)return;a.steps=a.steps||[];a.trigger=a.trigger||{type:'subscribes'};
    var dlg=modal(a.name,'',{wide:true}),body=dlg.querySelector('.em-modal__body');
    function persist(){return patch('em_automations','id=eq.'+a.id,{name:a.name,trigger:a.trigger,steps:a.steps,updated_at:new Date().toISOString()}).catch(function(e){toast(e.message,'err');});}
    function draw(){var s=autoStats(a);
      body.innerHTML='<div class="em-auto"><div class="em-grid2"><label>Automation name<input data-a-name value="'+esc(a.name)+'"></label><label>Status<span class="em-inline">'+badge(a.status)+'<button type="button" class="secondary" data-a-toggle>'+(a.status==='active'?'Pause':'Activate')+'</button></span></label></div>'+
        '<div class="em-flow"><div class="em-node em-node--trigger"><span class="em-node__icon">'+icon('zap')+'</span><div><small>Trigger</small><select data-a-trigger><option value="subscribes"'+(a.trigger.type==='subscribes'?' selected':'')+'>Anyone new subscribes</option><option value="joins_group"'+(a.trigger.type==='joins_group'?' selected':'')+'>Subscriber joins a group</option><option value="form"'+(a.trigger.type==='form'?' selected':'')+'>Subscriber signs up via a form</option></select>'+
          (a.trigger.type==='joins_group'?'<select data-a-group><option value="">Choose group…</option>'+state.groups.map(function(g){return '<option value="'+g.id+'"'+(a.trigger.group_id===g.id?' selected':'')+'>'+esc(g.name)+'</option>';}).join('')+'</select>':'')+
          (a.trigger.type==='form'?'<select data-a-form><option value="">Choose form…</option>'+state.forms.map(function(f){return '<option value="'+f.id+'"'+(a.trigger.form_id===f.id?' selected':'')+'>'+esc(f.name)+'</option>';}).join('')+'</select>':'')+'</div></div>'+
        a.steps.map(function(st,i){return addBtn(i)+(st.type==='delay'?'<div class="em-node em-node--delay"><span class="em-node__icon">⏱</span><div><small>Wait</small><span class="em-inline"><input type="number" min="1" data-a-amount="'+i+'" value="'+esc(st.amount||1)+'"><select data-a-unit="'+i+'">'+['hours','days','weeks'].map(function(u){return '<option'+(st.unit===u?' selected':'')+'>'+u+'</option>';}).join('')+'</select></span></div><button type="button" class="icon-button" data-a-del="'+i+'" aria-label="Remove step">✕</button></div>':'<div class="em-node em-node--email"><span class="em-node__icon">'+icon('mail')+'</span><div class="em-node__main"><small>Email '+(a.steps.slice(0,i+1).filter(function(x){return x.type==='email';}).length)+'</small><input data-a-subject="'+i+'" value="'+esc(st.subject||'')+'" placeholder="Subject line"><span class="em-muted">'+((st.blocks||[]).length?(st.blocks.length+' blocks'):'No content yet')+' · sent '+state.sends.filter(function(x){return x.automation_id===a.id&&x.subject&&st.subject&&x.status==='sent';}).length+'×</span></div><div class="em-node__actions"><button type="button" class="secondary" data-a-edit="'+i+'">Design</button><button type="button" class="icon-button" data-a-up="'+i+'" aria-label="Move up"'+(i===0?' disabled':'')+'>↑</button><button type="button" class="icon-button" data-a-del="'+i+'" aria-label="Remove step">✕</button></div></div>');}).join('')+addBtn(a.steps.length)+'<div class="em-node em-node--end">End of workflow</div></div>'+
        '<div class="em-stats em-stats--small">'+stat('Enrolled',s.enrolled)+stat('In progress',s.active)+stat('Completed',s.completed)+stat('Emails sent',s.sent)+'</div>'+
        '<div class="em-actions"><button type="button" class="secondary" data-a-enrol>Add existing subscribers…</button><button type="button" class="em-danger" data-a-delete>Delete automation</button></div><p class="form-message" data-em-msg></p></div>';
    }
    function addBtn(i){return '<div class="em-flow__add"><button type="button" class="em-plus" data-a-add-email="'+i+'">+ Email</button><button type="button" class="em-plus" data-a-add-delay="'+i+'">+ Delay</button></div>';}
    draw();
    var t=null;function debounced(){clearTimeout(t);t=setTimeout(persist,400);}
    body.addEventListener('input',function(e){var x=e.target;if(x.hasAttribute('data-a-name')){a.name=x.value;dlg.querySelector('.em-modal__head h3').textContent=a.name;debounced();}if(x.dataset.aSubject!=null){a.steps[+x.dataset.aSubject].subject=x.value;debounced();}if(x.dataset.aAmount!=null){a.steps[+x.dataset.aAmount].amount=Math.max(1,Number(x.value)||1);debounced();}});
    body.addEventListener('change',function(e){var x=e.target;if(x.hasAttribute('data-a-trigger')){a.trigger={type:x.value};persist();draw();}if(x.hasAttribute('data-a-group')){a.trigger.group_id=x.value||null;persist();}if(x.hasAttribute('data-a-form')){a.trigger.form_id=x.value||null;persist();}if(x.dataset.aUnit!=null){a.steps[+x.dataset.aUnit].unit=x.value;persist();}});
    body.addEventListener('click',async function(e){var b=e.target.closest('button');if(!b)return;var msg=body.querySelector('[data-em-msg]');
      if(b.dataset.aAddEmail!=null){var idx=+b.dataset.aAddEmail;pickTemplate(function(tpl){a.steps.splice(idx,0,{type:'email',id:uid(),subject:tpl.subject||'',preheader:tpl.preheader||'',language:tpl.language||'fr',design:clone(tpl.design||DEFAULT_DESIGN),blocks:clone(tpl.blocks||[])});persist();draw();});}
      if(b.dataset.aAddDelay!=null){a.steps.splice(+b.dataset.aAddDelay,0,{type:'delay',id:uid(),amount:1,unit:'days'});persist();draw();}
      if(b.dataset.aDel!=null){a.steps.splice(+b.dataset.aDel,1);persist();draw();}
      if(b.dataset.aUp!=null){var i=+b.dataset.aUp;a.steps.splice(i-1,0,a.steps.splice(i,1)[0]);persist();draw();}
      if(b.dataset.aEdit!=null){var st=a.steps[+b.dataset.aEdit];openBuilder({subject:st.subject,preheader:st.preheader,language:st.language,design:st.design,blocks:st.blocks},{title:'Automation email',onSave:async function(d){Object.assign(st,{subject:d.subject,preheader:d.preheader,language:d.language,design:d.design,blocks:d.blocks});await persist();draw();}});}
      if(b.hasAttribute('data-a-toggle')){var problem=validateAuto(a);if(a.status!=='active'&&problem){msg.textContent=problem;return;}a.status=a.status==='active'?'paused':'active';await patch('em_automations','id=eq.'+a.id,{status:a.status});draw();rerender();toast(a.status==='active'?'Automation activated':'Automation paused','ok');}
      if(b.hasAttribute('data-a-delete')){if(!confirmBox('Delete this automation and its progress?'))return;await del('em_automations','id=eq.'+a.id);state.automations=state.automations.filter(function(x){return x.id!==a.id;});state.runs=state.runs.filter(function(r){return r.automation_id!==a.id;});dlg.close();rerender();}
      if(b.hasAttribute('data-a-enrol'))enrolExisting(a,function(){draw();});
    });
    dlg.addEventListener('close',function(){clearTimeout(t);persist();rerender();});
  }
  function validateAuto(a){if(a.trigger.type==='joins_group'&&!a.trigger.group_id)return 'Choose the group that triggers this automation.';if(a.trigger.type==='form'&&!a.trigger.form_id)return 'Choose the form that triggers this automation.';var emails=(a.steps||[]).filter(function(s){return s.type==='email';});if(!emails.length)return 'Add at least one email step.';if(emails.some(function(s){return !s.subject||!(s.blocks||[]).length;}))return 'Every email needs a subject and content.';return '';}
  function enrolExisting(a,done){
    var dlg=modal('Add existing subscribers','<form class="em-form"><p class="em-muted">Start this workflow now for subscribers who are already on your list. People already enrolled are skipped.</p><label>Who<select name="who"><option value="all">All active subscribers</option>'+state.groups.map(function(g){return '<option value="'+g.id+'">Group: '+esc(g.name)+'</option>';}).join('')+'</select></label><div class="em-actions"><button type="submit">Enrol</button></div><p class="form-message" data-em-msg></p></form>');
    dlg.querySelector('form').addEventListener('submit',async function(e){e.preventDefault();var who=this.elements.who.value,list=who==='all'?audienceOf({mode:'all'}):audienceOf({mode:'groups',groups:[who]});var have={};state.runs.forEach(function(r){if(r.automation_id===a.id)have[r.subscriber_id]=true;});var rows=list.filter(function(s){return !have[s.id];}).map(function(s){return{automation_id:a.id,subscriber_id:s.id};});try{for(var i=0;i<rows.length;i+=500){var saved=await api('/rest/v1/em_automation_runs?on_conflict=automation_id,subscriber_id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(rows.slice(i,i+500))});state.runs=state.runs.concat(saved||[]);}dlg.close();toast(rows.length+' subscriber'+(rows.length===1?'':'s')+' enrolled'+(a.status!=='active'?' — activate the automation to start sending':''),'ok');done();}catch(err){dlg.querySelector('[data-em-msg]').textContent=err.message;}});
  }

  // ── Forms ────────────────────────────────────────────────────
  var FORM_FIELDS=[['email','Email'],['name','First name'],['last_name','Last name'],['company','Company'],['phone','Phone'],['city','City']];
  function renderForms(el){
    el.innerHTML=header('Grow your list','Sign-up forms','Collect new subscribers from your website, Instagram bio or WhatsApp with a hosted page or an embedded form.','<button type="button" data-em-action="new-form">+ Create form</button>')+
      (state.forms.length?'<div class="table-wrap"><table class="em-table"><thead><tr><th>Form</th><th>Status</th><th>Adds to</th><th>Sign-ups</th><th>Created</th><th></th></tr></thead><tbody>'+state.forms.map(function(f){return '<tr><td><button type="button" class="em-link" data-em-open-form="'+f.id+'"><strong>'+esc(f.name)+'</strong><small>'+esc(f.title||'')+'</small></button></td><td>'+badge(f.status)+'</td><td>'+((f.group_ids||[]).map(function(g){return '<span class="em-tag">'+esc(groupName(g))+'</span>';}).join('')||'<span class="em-muted">No group</span>')+'</td><td>'+(f.submissions||0)+'</td><td>'+fmtDate(f.created_at)+'</td><td class="em-row-actions"><button type="button" class="link-button" data-em-open-form="'+f.id+'">Edit</button><a class="link-button" href="'+SITE+'/subscribe/?f='+f.id+'" target="_blank" rel="noopener">Open ↗</a></td></tr>';}).join('')+'</tbody></table></div>':'<div class="empty"><h2>No forms yet</h2><p>Create a form and share its link, or paste the embed code into any page.</p></div>');
  }
  async function newForm(){var news=state.groups.find(function(g){return /newsletter/i.test(g.name);});var saved=(await post('em_forms',{name:'Newsletter sign-up',title:'Recevez nos conseils marketing',description:'Un email utile toutes les deux semaines. Désinscription en un clic.',button_label:'Je m’inscris',success_title:'Merci !',success_message:'Votre inscription est confirmée. À très vite dans votre boîte mail.',consent_text:'J’accepte de recevoir les emails de SB Marketing. Désinscription possible à tout moment.',group_ids:news?[news.id]:[],design:{accent:'#041021',bg:'#ffffff'}}))[0];state.forms.unshift(saved);rerender();openForm(saved.id);}
  function openForm(id){
    var f=state.forms.find(function(x){return x.id===id;});if(!f)return;f.design=f.design||{};f.fields=f.fields||[];
    var dlg=modal(f.name,'',{wide:true}),body=dlg.querySelector('.em-modal__body');
    var link=SITE+'/subscribe/?f='+f.id,embed='<div data-sbm-form="'+f.id+'"></div>\n<script src="'+SITE+'/js/sbm-form.js" async></script>';
    function has(k){return f.fields.some(function(x){return x.key===k;});}
    function req(k){var x=f.fields.find(function(y){return y.key===k;});return x&&x.required;}
    body.innerHTML='<div class="em-form-editor"><form class="em-form" data-f-form><div class="em-grid2"><label>Form name <small>(internal)</small><input name="name" value="'+esc(f.name)+'"></label><label>Status<select name="status"><option value="active"'+(f.status==='active'?' selected':'')+'>Active</option><option value="disabled"'+(f.status!=='active'?' selected':'')+'>Disabled</option></select></label></div>'+
      '<label>Title<input name="title" value="'+esc(f.title||'')+'"></label><label>Description<textarea name="description" rows="2">'+esc(f.description||'')+'</textarea></label>'+
      '<fieldset class="em-fieldset"><legend>Fields</legend><table class="em-mini-table"><thead><tr><th>Field</th><th>Show</th><th>Required</th></tr></thead><tbody>'+FORM_FIELDS.map(function(x){return '<tr><td>'+x[1]+'</td><td><input type="checkbox" name="show_'+x[0]+'"'+(has(x[0])||x[0]==='email'?' checked':'')+(x[0]==='email'?' disabled':'')+'></td><td><input type="checkbox" name="req_'+x[0]+'"'+(req(x[0])||x[0]==='email'?' checked':'')+(x[0]==='email'?' disabled':'')+'></td></tr>';}).join('')+'</tbody></table></fieldset>'+
      '<div class="em-grid2"><label>Button label<input name="button_label" value="'+esc(f.button_label||'')+'"></label><label class="em-color-field">Button colour<span><input type="color" name="accent" value="'+esc(f.design.accent||'#041021')+'"></span></label></div>'+
      '<label>Consent checkbox text<input name="consent_text" value="'+esc(f.consent_text||'')+'"></label>'+
      '<fieldset class="em-fieldset"><legend>Add sign-ups to groups</legend>'+state.groups.map(function(g){return '<label class="em-check"><input type="checkbox" name="groups" value="'+g.id+'"'+((f.group_ids||[]).indexOf(g.id)>-1?' checked':'')+'> '+esc(g.name)+'</label>';}).join('')+'</fieldset>'+
      '<div class="em-grid2"><label>Success title<input name="success_title" value="'+esc(f.success_title||'')+'"></label><label>Success message<input name="success_message" value="'+esc(f.success_message||'')+'"></label></div>'+
      '<div class="em-actions"><button type="submit">Save form</button><button type="button" class="em-danger" data-f-del>Delete</button></div><p class="form-message" data-em-msg></p></form>'+
      '<aside class="em-form-side"><h4>Live preview</h4><div class="em-form-preview" data-f-preview></div><h4>Share link</h4><div class="em-copy"><input readonly value="'+esc(link)+'"><button type="button" class="secondary" data-copy="'+esc(link)+'">Copy</button></div><h4>Embed on any website</h4><div class="em-copy em-copy--code"><textarea readonly rows="3">'+esc(embed)+'</textarea><button type="button" class="secondary" data-copy="'+esc(embed)+'">Copy</button></div><p class="em-muted">'+(f.submissions||0)+' sign-ups so far. Connect an automation with the trigger “signs up via a form” to send a welcome email.</p></aside></div>';
    var form=body.querySelector('[data-f-form]');
    function read(){var fd=new FormData(form);var fields=[{key:'email',label:'Email',required:true}];FORM_FIELDS.slice(1).forEach(function(x){if(fd.get('show_'+x[0]))fields.push({key:x[0],label:x[1],required:!!fd.get('req_'+x[0])});});return{name:String(fd.get('name')||'Form'),status:fd.get('status'),title:fd.get('title'),description:fd.get('description'),button_label:fd.get('button_label')||'Subscribe',consent_text:fd.get('consent_text')||null,success_title:fd.get('success_title'),success_message:fd.get('success_message'),group_ids:fd.getAll('groups'),fields:fields,design:Object.assign({},f.design,{accent:fd.get('accent')})};}
    var LABELS_FR={email:'Email',name:'Prénom',last_name:'Nom',company:'Entreprise',phone:'Téléphone',city:'Ville'};
    function preview(){var d=read();body.querySelector('[data-f-preview]').innerHTML='<div class="sbm-preview"><h3>'+esc(d.title)+'</h3><p>'+esc(d.description)+'</p>'+d.fields.map(function(x){return '<label>'+esc(LABELS_FR[x.key]||x.label)+(x.required?' *':'')+'<input disabled></label>';}).join('')+(d.consent_text?'<label class="sbm-consent"><input type="checkbox" disabled> '+esc(d.consent_text)+'</label>':'')+'<button type="button" style="background:'+esc(d.design.accent)+'">'+esc(d.button_label)+'</button></div>';}
    preview();form.addEventListener('input',preview);form.addEventListener('change',preview);
    form.addEventListener('submit',async function(e){e.preventDefault();var d=read();d.fields=d.fields.map(function(x){return{key:x.key,label:LABELS_FR[x.key]||x.label,required:x.required};});d.updated_at=new Date().toISOString();try{Object.assign(f,(await patch('em_forms','id=eq.'+f.id,d))[0]);toast('Form saved','ok');dlg.close();rerender();}catch(err){form.querySelector('[data-em-msg]').textContent=err.message;}});
    body.querySelector('[data-f-del]').addEventListener('click',async function(){if(!confirmBox('Delete this form? Its link and embed code will stop working.'))return;await del('em_forms','id=eq.'+f.id);state.forms=state.forms.filter(function(x){return x.id!==f.id;});dlg.close();rerender();});
    body.addEventListener('click',function(e){var c=e.target.closest('[data-copy]');if(!c)return;navigator.clipboard.writeText(c.dataset.copy).then(function(){c.textContent='Copied ✓';setTimeout(function(){c.textContent='Copy';},1500);});});
  }

  // ── Event wiring (delegated per tab root) ────────────────────
  function wire(el){
    if(el.dataset.emWired)return;el.dataset.emWired='1';
    el.addEventListener('input',function(e){if(e.target.hasAttribute('data-em-sub-search')){ui.subSearch=e.target.value;var pos=e.target.selectionStart;rerender();var s=root('email-subscribers').querySelector('[data-em-sub-search]');if(s){s.focus();try{s.setSelectionRange(pos,pos);}catch(err){}}}});
    el.addEventListener('change',function(e){var t=e.target;
      if(t.hasAttribute('data-em-sub-group')){ui.subGroup=t.value;rerender();}
      if(t.hasAttribute('data-em-select')){if(t.checked)ui.selected[t.dataset.emSelect]=true;else delete ui.selected[t.dataset.emSelect];rerender();}
      if(t.hasAttribute('data-em-select-all')){filteredSubs().slice(0,300).forEach(function(s){if(t.checked)ui.selected[s.id]=true;else delete ui.selected[s.id];});rerender();}
    });
    el.addEventListener('click',async function(e){
      var t=e.target.closest('[data-em-action],[data-em-sub-status],[data-em-open-sub],[data-em-view-group],[data-em-edit-group],[data-em-campaign-filter],[data-em-open-campaign],[data-em-dup-campaign],[data-em-edit-tpl],[data-em-use-tpl],[data-em-dup-tpl],[data-em-del-tpl],[data-em-starter],[data-em-open-auto],[data-em-toggle-auto],[data-em-recipe],[data-em-open-form],[data-em-reload]');
      if(!t)return;
      try{
        if(t.hasAttribute('data-em-reload')){location.reload();return;}
        if(t.dataset.emSubStatus!=null){ui.subStatus=t.dataset.emSubStatus;rerender();return;}
        if(t.dataset.emOpenSub){openSubscriber(t.dataset.emOpenSub);return;}
        if(t.dataset.emViewGroup){ui.subGroup=t.dataset.emViewGroup;ui.subStatus='';location.hash='#email-subscribers';return;}
        if(t.dataset.emEditGroup){openGroup(t.dataset.emEditGroup);return;}
        if(t.dataset.emCampaignFilter!=null){ui.campaignFilter=t.dataset.emCampaignFilter;rerender();return;}
        if(t.dataset.emOpenCampaign){openCampaign(t.dataset.emOpenCampaign);return;}
        if(t.dataset.emDupCampaign){await duplicateCampaign(t.dataset.emDupCampaign);return;}
        if(t.dataset.emEditTpl){editTemplate(state.templates.find(function(x){return x.id===t.dataset.emEditTpl;}));return;}
        if(t.dataset.emDupTpl){var src=state.templates.find(function(x){return x.id===t.dataset.emDupTpl;});state.templates.unshift((await post('em_templates',{name:src.name+' (copy)',category:src.category,subject:src.subject,preheader:src.preheader,language:src.language,design:src.design,blocks:src.blocks}))[0]);rerender();return;}
        if(t.dataset.emDelTpl){if(!confirmBox('Delete this template?'))return;await del('em_templates','id=eq.'+t.dataset.emDelTpl);state.templates=state.templates.filter(function(x){return x.id!==t.dataset.emDelTpl;});rerender();return;}
        if(t.dataset.emUseTpl){var tpl=state.templates.find(function(x){return x.id===t.dataset.emUseTpl;});var c=(await post('em_campaigns',{name:tpl.name,subject:tpl.subject,preheader:tpl.preheader,language:tpl.language,from_name:state.brand.company_name||'SB Marketing',reply_to:state.brand.reply_to_email||'contact@sbmarketing.fr',design:tpl.design,blocks:tpl.blocks,template_id:tpl.id,audience:{mode:'all',groups:[],exclude_groups:[]}}))[0];state.campaigns.unshift(c);location.hash='#email-campaigns';openCampaign(c.id);return;}
        if(t.dataset.emStarter){var st=starters().find(function(x){return x.key===t.dataset.emStarter;});editTemplate({name:st.name,category:st.category,subject:st.subject,preheader:st.preheader,language:'fr',design:st.design,blocks:st.blocks},true);return;}
        if(t.dataset.emOpenAuto){openAutomation(t.dataset.emOpenAuto);return;}
        if(t.dataset.emToggleAuto){var a=state.automations.find(function(x){return x.id===t.dataset.emToggleAuto;});var problem=validateAuto(a);if(a.status!=='active'&&problem){toast(problem,'err');openAutomation(a.id);return;}a.status=a.status==='active'?'paused':'active';await patch('em_automations','id=eq.'+a.id,{status:a.status});rerender();return;}
        if(t.dataset.emRecipe){await createAutomation(recipe(t.dataset.emRecipe));return;}
        if(t.dataset.emOpenForm){openForm(t.dataset.emOpenForm);return;}
        var action=t.dataset.emAction;if(t.tagName==='A')e.preventDefault();
        var sel=Object.keys(ui.selected),gsel=el.querySelector('[data-em-bulk-group]');
        if(action==='add-sub')openSubscriber(null);
        else if(action==='import')openImport();
        else if(action==='export-subs')exportSubs();
        else if(action==='new-group')openGroup(null);
        else if(action==='new-campaign'){if(t.tagName==='A')location.hash='#email-campaigns';await newCampaign();}
        else if(action==='new-template')editTemplate({name:'Untitled template',category:'newsletter',subject:'',preheader:'',language:'fr',design:clone(DEFAULT_DESIGN),blocks:[newBlock('heading'),newBlock('text'),newBlock('button')]},true);
        else if(action==='new-auto')await createAutomation({name:'New automation',trigger:{type:'subscribes'},steps:[]});
        else if(action==='run-autos'){t.disabled=true;t.textContent='Running…';var n=await processAutomations();toast(n?n+' email'+(n>1?'s':'')+' sent':'Nothing due right now','ok');rerender();}
        else if(action==='new-form')await newForm();
        else if(action==='bulk-clear'){ui.selected={};rerender();}
        else if(action==='bulk-add-group'){if(!gsel.value){toast('Choose a group first','err');return;}var added=await addManyToGroup(sel,gsel.value);toast(added+' added to '+groupName(gsel.value),'ok');ui.selected={};rerender();}
        else if(action==='bulk-remove-group'){if(!gsel.value){toast('Choose a group first','err');return;}var g=gsel.value;for(var i=0;i<sel.length;i+=100){await del('em_subscriber_groups','group_id=eq.'+g+'&subscriber_id=in.('+sel.slice(i,i+100).join(',')+')');}state.members=state.members.filter(function(m){return !(m.group_id===g&&ui.selected[m.subscriber_id]);});ui.selected={};rerender();}
        else if(action==='bulk-unsub'||action==='bulk-resub'){var st2=action==='bulk-unsub'?'unsubscribed':'active',now=new Date().toISOString();for(var j=0;j<sel.length;j+=100){await patch('em_subscribers','id=in.('+sel.slice(j,j+100).join(',')+')',{status:st2,unsubscribed_at:st2==='unsubscribed'?now:null,updated_at:now});}state.subs.forEach(function(s){if(ui.selected[s.id]){s.status=st2;s.unsubscribed_at=st2==='unsubscribed'?now:null;}});ui.selected={};rerender();}
        else if(action==='bulk-delete'){if(!confirmBox('Permanently delete '+sel.length+' subscriber'+(sel.length===1?'':'s')+'?'))return;for(var k=0;k<sel.length;k+=100){await del('em_subscribers','id=in.('+sel.slice(k,k+100).join(',')+')');}state.subs=state.subs.filter(function(s){return !ui.selected[s.id];});state.members=state.members.filter(function(m){return !ui.selected[m.subscriber_id];});ui.selected={};rerender();}
      }catch(err){toast(err.message,'err');}
    });
  }

  async function show(tab){
    if(TABS.indexOf(tab)<0)tab='email';ui.current=tab;var el=root(tab);if(!el)return;wire(el);
    if(!state.loaded)el.innerHTML='<div class="ops-loading">Loading email marketing…</div>';
    try{await load();render(tab);}catch(error){el.innerHTML='<div class="empty"><h2>Could not load email marketing</h2><p>'+esc(error.message)+'</p></div>';}
  }
  window.SBEmail={show:show,tabs:TABS,reload:function(){state.loaded=false;return show(ui.current||'email');}};
  setInterval(tick,60000);setTimeout(tick,8000);
})();
