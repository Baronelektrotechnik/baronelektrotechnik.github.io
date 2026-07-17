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

  /* Google Maps erst nach Klick (Datenschutz) */
  window.loadMap=function(btn){
    var box=btn.closest('.map-consent');
    if(!box)return;
    var f=document.createElement('iframe');
    f.className='map-frame';
    f.loading='lazy';
    f.referrerPolicy='no-referrer-when-downgrade';
    f.title='Google Maps — Baron Elektrotechnik GmbH, Kruppstraße 112, 60388 Frankfurt am Main';
    f.src='https://www.google.com/maps?q=Baron+Elektrotechnik+GmbH,+Kruppstra%C3%9Fe+112,+60388+Frankfurt+am+Main&z=15&output=embed';
    box.replaceWith(f);
  };

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
