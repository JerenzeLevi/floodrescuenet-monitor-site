/* Shared navigation: native details remains usable without JavaScript. */
(()=>{
 for(const menu of document.querySelectorAll('[data-mobile-nav]')){
  for(const link of menu.querySelectorAll('a'))link.addEventListener('click',()=>{menu.open=false;});
  document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
 }
})();
