import {translations} from './i18n.js';
const $=id=>document.getElementById(id);
let lang='fr', imageUrl=null, demoVisible=false, busy=false, messageKey=null;
let draftBuffers={};
let liveReport=null;
function liveDraft(){return t('liveReview')+'\n\n'+liveReport.text+'\n\n'+liveReport.sources.map((source,i)=>`[${i+1}] ${source.title} — ${source.url}`).join('\n');}
function t(key){return translations[lang][key]||key;}
function showMessage(key){messageKey=key;$('message').textContent=t(key);$('message').hidden=false;}
function render(){
 document.documentElement.lang=lang;
 document.title=`Wérify — ${t('headline')}`;
 document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
 document.querySelectorAll('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));
 $('claim').placeholder=t('placeholder');$('image-preview').alt=t('screenshot');
 if(messageKey)$('message').textContent=t(messageKey);
 $('verify').textContent=t(busy?'checking':'verify');
 if(!$('draft-panel').hidden)$('draft').value=draftBuffers[lang]??(liveReport?liveDraft():t('sampleDraft'));
 if(liveReport){document.querySelector('[data-t=reviewDetail]').textContent=t('liveReview');if(!$('live-report').hidden)renderLive();}
 document.querySelectorAll('[data-lang]').forEach(el=>el.disabled=busy);
 $('demo').disabled=busy;
 $('draft-message').textContent='';
}
document.querySelectorAll('[data-lang]').forEach(el=>el.addEventListener('click',()=>{
 if(!$('draft-panel').hidden)draftBuffers[lang]=$('draft').value;
 lang=el.dataset.lang;render();
}));
function setTab(image){
 $('upload-area').hidden=!image;
 $('text-tab').classList.toggle('active',!image);$('image-tab').classList.toggle('active',image);
 $('text-tab').setAttribute('aria-pressed',String(!image));$('image-tab').setAttribute('aria-pressed',String(image));
}
$('text-tab').addEventListener('click',()=>setTab(false));
$('image-tab').addEventListener('click',()=>setTab(true));
$('claim').addEventListener('input',()=>{$('counter').textContent=`${$('claim').value.length} / 1 000`;});
function removeImage(){if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=null;$('image-file').value='';$('image-preview').removeAttribute('src');$('preview-wrap').hidden=true;}
$('remove-image').addEventListener('click',removeImage);
$('image-file').addEventListener('change',()=>{
 const file=$('image-file').files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){removeImage();showMessage('imageError');return;}
 if(imageUrl)URL.revokeObjectURL(imageUrl);
 imageUrl=URL.createObjectURL(file);$('image-preview').src=imageUrl;$('preview-wrap').hidden=false;
 $('message').hidden=true;messageKey=null;
});
$('demo').addEventListener('click',()=>{
 liveReport=null;draftBuffers={};$('live-report').hidden=true;$('draft-panel').hidden=true;
 demoVisible=true;$('empty-report').hidden=true;$('report').hidden=false;
 $('message').hidden=true;messageKey=null;
 $('report-title').setAttribute('tabindex','-1');$('report-title').focus();
 $('report-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
});
$('source-toggle').addEventListener('click',()=>{
 const open=$('source-details').hidden;$('source-details').hidden=!open;$('source-toggle').setAttribute('aria-expanded',String(open));
});
$('prepare-draft').addEventListener('click',()=>{
 if(!demoVisible)return;
 $('draft-panel').hidden=false;$('draft').value=draftBuffers[lang]??(liveReport?liveDraft():t('sampleDraft'));$('draft-panel').scrollIntoView({behavior:'smooth',block:'start'});$('draft').focus();
});
$('draft').addEventListener('input',()=>draftBuffers[lang]=$('draft').value);
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('draft').value);$('draft-message').textContent=t('copied');}catch{$('draft-message').textContent=t('copyFailed');$('draft').focus();$('draft').select();}});
$('download').addEventListener('click',()=>{
 const url=URL.createObjectURL(new Blob([$ ('draft').value],{type:'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=`werify-${liveReport?'research':'example'}-${lang}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('draft-message').textContent=t('downloaded');
});
$('claim-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const claim=$('claim').value.trim();if(!claim||claim.length>1000){showMessage('invalid');return;}
 // A previous fictional example must never look like the result for a submitted claim.
 liveReport=null;draftBuffers={};$('live-report').hidden=true;
 demoVisible=false;$('report').hidden=true;$('empty-report').hidden=false;$('draft-panel').hidden=true;
 busy=true;$('verify').disabled=true;showMessage('checking');render();
 try{
  const response=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({claim,lang}),signal:AbortSignal.timeout(100000)});
  const data=await response.json();
  if(!response.ok){showMessage(({VERIFICATION_NOT_CONFIGURED:'notConfigured',META_AUTH_ERROR:'authError',META_BILLING_ERROR:'billingError',META_RATE_LIMIT:'rateError'})[data.error]||'serviceError');return;}
  if(!data.grounded){showMessage('noEvidence');return;}
  liveReport=data;$('message').hidden=true;messageKey=null;$('empty-report').hidden=true;$('live-report').hidden=false;
  renderLive();$('report-panel').scrollIntoView({behavior:'smooth',block:'start'});
 }catch{showMessage('networkError');}
 finally{busy=false;$('verify').disabled=false;render();}
});
function renderLive(){
 const container=$('live-report');container.replaceChildren();
 const add=(tag,text,className)=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;container.append(el);return el;};
 add('div',t('liveBadge')+' · '+liveReport.model+' · '+liveReport.lang.toUpperCase(),'notice');
 add('p',t('liveReview'),'hint');
 add('h3',liveReport.claim,'sample-claim');
 add('p',liveReport.text,'research-text');
 add('h4',t('sources'));
 liveReport.sources.forEach((source,i)=>{
  const card=add('div','','source-detail');
  const link=document.createElement('a');link.textContent=`[${i+1}] ${source.title}`;link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);
  const passage=document.createElement('p');passage.textContent=source.passage;card.append(passage);
 });
 const button=add('button',t('prepareDraft'),'primary full');button.type='button';
 button.addEventListener('click',()=>{
  $('draft-panel').hidden=false;$('draft').value=draftBuffers[lang]??liveDraft();
  document.querySelector('[data-t=reviewDetail]').textContent=t('liveReview');
  $('draft-panel').scrollIntoView({behavior:'smooth',block:'start'});$('draft').focus();
 });
}
render();
