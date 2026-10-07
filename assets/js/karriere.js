/* Karriereseite: Bewerbungsformular (Web3Forms), Sticky-Button, Video-Slot */
(function(){
  'use strict';
  var form=document.getElementById('k-form');
  var sticky=document.getElementById('k-sticky');
  var section=document.getElementById('bewerbung');
  var submitted=false;

  /* Herkunft aus Anzeigen-Link mitschicken (utm-Parameter), ohne Cookies */
  try{
    var q=new URLSearchParams(location.search),src=document.getElementById('k-src');
    var parts=['utm_source','utm_medium','utm_campaign'].map(function(k){return q.get(k);}).filter(Boolean);
    if(src&&parts.length)src.value=parts.join(' / ').slice(0,120);
    else if(src&&q.get('fbclid'))src.value='Meta (fbclid)';
  }catch(e){}

  /* Fixierter Button: ausblenden, solange das Formular im Bild ist */
  /* Ebenfalls ausblenden, solange der Hero-Button sichtbar ist (keine doppelten Buttons) */
  var heroBtn=document.querySelector('.k-hero .k-btn-main'),seen={};
  if(sticky&&section&&'IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){seen[e.target===section?'form':'hero']=e.isIntersecting;});
      sticky.classList.toggle('is-off',submitted||!!seen.form||!!seen.hero);
    },{threshold:0,rootMargin:'0px 0px -20% 0px'});
    io.observe(section);if(heroBtn)io.observe(heroBtn);
  }

  /* Stellendetails auf großen Bildschirmen aufgeklappt zeigen */
  if(window.matchMedia&&window.matchMedia('(min-width:961px)').matches){
    document.querySelectorAll('.k-det').forEach(function(d){d.open=true;});
  }

  /* WhatsApp-Button erst zeigen, wenn eine echte Nummer eingetragen ist */
  var wa=document.getElementById('k-wa');
  if(wa&&wa.href.indexOf('/NUMMER')!==-1)wa.style.display='none';

  /* Video-Slot: Platzhalter bleibt, bis das MP4 auf dem Server liegt */
  var vid=document.querySelector('.k-video-el');
  if(vid&&window.fetch){
    var url=vid.getAttribute('data-src');
    fetch(url,{method:'HEAD'}).then(function(r){
      var t=r.headers.get('content-type')||'';
      if(r.ok&&t.indexOf('video')===0){
        vid.src=url;vid.hidden=false;vid.closest('.k-video').classList.add('has-video');
      }
    }).catch(function(){});
  }

  if(!form)return;
  var nameI=document.getElementById('k-name'),telI=document.getElementById('k-tel'),dsI=document.getElementById('k-ds');
  var status=document.getElementById('k-status'),btn=form.querySelector('.k-submit');

  function mark(input,errId,bad){
    var err=document.getElementById(errId);
    input.classList.toggle('is-bad',bad);
    input.setAttribute('aria-invalid',bad?'true':'false');
    if(err)err.hidden=!bad;
    return !bad;
  }
  function validName(){return mark(nameI,'k-name-err',nameI.value.trim().length<2);}
  function validTel(){var d=telI.value.replace(/\D/g,'');return mark(telI,'k-tel-err',d.length<6);}
  function validDs(){return mark(dsI,'k-ds-err',!dsI.checked);}
  nameI.addEventListener('blur',function(){if(nameI.value)validName();});
  telI.addEventListener('blur',function(){if(telI.value)validTel();});
  dsI.addEventListener('change',validDs);

  form.addEventListener('submit',function(e){
    e.preventDefault();
    status.hidden=true;
    var ok=[validName(),validTel(),validDs()];
    if(ok.indexOf(false)!==-1){
      var first=form.querySelector('[aria-invalid="true"]');if(first)first.focus();
      return;
    }
    var fd=new FormData(form);
    fd.set('subject','Bewerbung Geselle: '+nameI.value.trim());
    var body=new URLSearchParams();
    fd.forEach(function(v,k){body.append(k,v);});
    btn.disabled=true;btn.textContent='Wird gesendet …';
    fetch(form.action,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:body.toString()})
      .then(function(r){return r.json().catch(function(){return {success:r.ok};});})
      .then(function(res){
        if(!res||!res.success)throw new Error('send');
        submitted=true;
        var first=nameI.value.trim().split(/\s+/)[0];
        var zeit=(form.querySelector('input[name="Rückruf"]:checked')||{}).value;
        document.getElementById('k-done-h').textContent='Danke, '+first+'. Ihre Bewerbung ist da.';
        document.getElementById('k-done-p').textContent='Wir rufen Sie innerhalb von 24 Stunden an Werktagen zurück'+(zeit?', bevorzugt '+zeit:'')+'.';
        form.hidden=true;
        var done=document.getElementById('k-done');done.hidden=false;done.focus();
        if(sticky)sticky.classList.add('is-off');
      })
      .catch(function(){
        btn.disabled=false;btn.textContent='Bewerbung absenden';
        status.innerHTML='Das Senden hat nicht geklappt. Bitte rufen Sie uns direkt an: <a href="tel:+496987001743">069 87 00 17 43-0</a>';
        status.hidden=false;
      });
  });
})();
