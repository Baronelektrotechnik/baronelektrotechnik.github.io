/* Baron Elektrotechnik — main.js (2026) */
(function(){
  'use strict';

  var nav=document.querySelector('.nav');
  if(nav){window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>24);},{passive:true});}

  var burger=document.querySelector('.burger'),mob=document.querySelector('.mobmenu');
  if(burger&&mob){
    burger.addEventListener('click',function(){
      var open=mob.style.display==='flex';
      mob.style.display=open?'none':'flex';
      burger.setAttribute('aria-expanded',String(!open));
    });
    mob.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){mob.style.display='none';});});
  }

  var obs=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vis');obs.unobserve(e.target);}});
  },{threshold:.08});
  document.querySelectorAll('.rev-up').forEach(function(el){obs.observe(el);});

  /* Kameraflug über Frankfurt — mit Fallback, falls ein Bild nicht lädt */
  var stage=document.querySelector('.stage');
  if(stage){
    var sources=(stage.getAttribute('data-images')||'').split('|').filter(Boolean);
    var layers=[stage.querySelector('.stage-layer.a'),stage.querySelector('.stage-layer.b')];
    var loaded=[],pending=sources.length;
    sources.forEach(function(src){
      var im=new Image();
      im.onload=function(){loaded.push(src);done();};
      im.onerror=function(){done();};
      im.src=src;
    });
    function done(){pending--;if(pending===0)start(loaded);}
    function start(imgs){
      if(!imgs.length)return;
      layers[0].style.backgroundImage='url("'+imgs[0]+'")';
      layers[0].classList.add('on','pathA');
      if(imgs.length>1){
        layers[1].classList.add('pathB');
        var active=0,i=0;
        setInterval(function(){
          var next=1-active;
          i=(i+1)%imgs.length;
          layers[next].style.backgroundImage='url("'+imgs[i]+'")';
          layers[next].classList.add('on');
          layers[active].classList.remove('on');
          active=next;
        },16000);
      }
    }
  }

  /* ===== Einwilligung externe Dienste (Google Ads, Google Maps, Jotform) ===== */
  var CKEY='be-consent',CVER=1,CMAX=365*864e5,adsLoaded=false;
  function getConsent(){
    try{var c=JSON.parse(localStorage.getItem(CKEY));
      if(c&&c.v===CVER&&(Date.now()-c.t)<CMAX)return c;}catch(e){}
    return null;
  }
  function setConsent(all){
    try{localStorage.setItem(CKEY,JSON.stringify({v:CVER,all:all,t:Date.now()}));}catch(e){}
  }
  function loadAds(){
    if(adsLoaded||location.hostname.endsWith('github.io'))return;
    adsLoaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){dataLayer.push(arguments);};
    gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
    gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});
    gtag('js',new Date());gtag('config','AW-17701503501');
    var sc=document.createElement('script');sc.async=true;
    sc.src='https://www.googletagmanager.com/gtag/js?id=AW-17701503501';
    document.head.appendChild(sc);
  }
  function embedMap(box){
    var f=document.createElement('iframe');
    f.className='map-frame';f.loading='lazy';
    f.referrerPolicy='no-referrer-when-downgrade';
    f.title='Google Maps — Baron Elektrotechnik GmbH, Kruppstraße 112, 60388 Frankfurt am Main';
    f.src='https://www.google.com/maps?q=Baron+Elektrotechnik+GmbH,+Kruppstra%C3%9Fe+112,+60388+Frankfurt+am+Main&z=15&output=embed';
    box.replaceWith(f);
  }
  function embedForm(box){
    var id='JotFormIFrame-262423372826963';
    var f=document.createElement('iframe');
    f.id=id;f.title='Anfrageformular Baron Elektrotechnik';
    f.setAttribute('allowtransparency','true');
    f.setAttribute('allow','geolocation; microphone; camera; fullscreen; payment');
    f.setAttribute('scrolling','no');
    f.src='https://heroautomation.jotform.com/262423372826963';
    f.style.cssText='min-width:100%;max-width:100%;height:539px;border:none;display:block';
    box.replaceWith(f);
    var sc=document.createElement('script');
    sc.src='https://heroautomation.jotform.com/s/umd/latest/for-form-embed-handler.js';
    sc.onload=function(){if(window.jotformEmbedHandler)window.jotformEmbedHandler("iframe[id='"+id+"']","https://heroautomation.jotform.com/");};
    document.body.appendChild(sc);
  }
  function unlockAll(){
    loadAds();
    document.querySelectorAll('.form-consent').forEach(embedForm);
    document.querySelectorAll('.map-consent').forEach(embedMap);
  }
  /* Einzelfreigabe per Klick in der Box (gilt nur für diesen Seitenaufruf) */
  window.loadMap=function(btn){var b=btn.closest('.map-consent');if(b)embedMap(b);};
  window.loadForm=function(btn){var b=btn.closest('.form-consent');if(b)embedForm(b);};

  var banner=null;
  function closeBanner(){if(banner){banner.remove();banner=null;}}
  function openBanner(){
    if(banner)return;
    banner=document.createElement('div');
    banner.className='cc-banner';banner.setAttribute('role','dialog');
    banner.setAttribute('aria-label','Cookie-Einstellungen');
    banner.innerHTML='<div class="cc-inner"><b>Cookies und externe Inhalte</b>'+
      '<p>Wir nutzen Google Ads, um den Erfolg unserer Werbung zu messen, sowie Google Maps (Anfahrtskarte) und Jotform (Anfrageformular). Diese Dienste setzen Cookies und übertragen Daten, teils in die USA. Mit „Akzeptieren“ willigen Sie in alle drei ein. Sie können Ihre Wahl jederzeit über „Cookie-Einstellungen“ im Seitenfuß ändern. Details in unserer <a href="/datenschutz/">Datenschutzerklärung</a>.</p>'+
      '<div class="cc-btns"><button type="button" class="btn btn-soft" data-cc="no">Nur notwendige</button>'+
      '<button type="button" class="btn btn-green" data-cc="yes">Akzeptieren</button></div></div>';
    banner.addEventListener('click',function(e){
      var t=e.target.closest('[data-cc]');if(!t)return;
      var yes=t.getAttribute('data-cc')==='yes';
      var had=getConsent();
      setConsent(yes);closeBanner();
      if(yes)unlockAll();
      else if(had&&had.all)location.reload(); /* Widerruf: geladene Dienste entfernen */
    });
    document.body.appendChild(banner);
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-consent-open]')){e.preventDefault();openBanner();}
  });
  var cur=getConsent();
  if(!cur)openBanner();
  else if(cur.all)unlockAll();

  /* Netlify-Formular ohne Seitenwechsel */
  var form=document.getElementById('kontakt-form');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=form.querySelector('button[type="submit"]');
      btn.disabled=true;btn.textContent='Wird gesendet…';
      fetch(form.action,{method:'POST',headers:{'Accept':'application/json'},body:new FormData(form)})
        .then(function(r){
          if(!r.ok)throw new Error('send');
          form.querySelector('.form-ok').classList.remove('hidden');
          form.querySelectorAll('.f-field,.f-row,button,.form-note').forEach(function(el){el.classList.add('hidden');});
        })
        .catch(function(){
          form.querySelector('.form-err').classList.remove('hidden');
          btn.disabled=false;btn.textContent='Nachricht absenden';
        });
    });
  }
})();

/* De-index the github.io mirror only; .de stays fully indexable. */
(function(){if(location.hostname.endsWith('github.io')){var m=document.createElement('meta');m.name='robots';m.content='noindex, nofollow';document.head.appendChild(m);}})();
