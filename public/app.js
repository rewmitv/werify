import {translations} from './i18n.js';
const $=id=>document.getElementById(id);
let lang='fr', imageUrl=null, demoVisible=false, busy=false, messageKey=null;
const draftBuffers={};
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
 if(!$('draft-panel').hidden)$('draft').value=draftBuffers[lang]??t('sampleDraft');
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
 $('draft-panel').hidden=false;$('draft').value=draftBuffers[lang]??t('sampleDraft');$('draft-panel').scrollIntoView({behavior:'smooth',block:'start'});$('draft').focus();
});
$('draft').addEventListener('input',()=>draftBuffers[lang]=$('draft').value);
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('draft').value);$('draft-message').textContent=t('copied');}catch{$('draft-message').textContent=t('copyFailed');$('draft').focus();$('draft').select();}});
$('download').addEventListener('click',()=>{
 const url=URL.createObjectURL(new Blob([$ ('draft').value],{type:'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=`werify-example-${lang}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('draft-message').textContent=t('downloaded');
});
$('claim-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;
 const claim=$('claim').value.trim();if(!claim||claim.length>1000){showMessage('invalid');return;}
 // A previous fictional example must never look like the result for a submitted claim.
 demoVisible=false;$('report').hidden=true;$('empty-report').hidden=false;$('draft-panel').hidden=true;
 busy=true;$('verify').disabled=true;showMessage('checking');render();
 try{
  const response=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({claim,lang}),signal:AbortSignal.timeout(20000)});
  const data=await response.json();
  showMessage(data.error==='VERIFICATION_NOT_CONFIGURED'?'notConfigured':'networkError');
 }catch{showMessage('networkError');}
 finally{busy=false;$('verify').disabled=false;render();}
});
render();
