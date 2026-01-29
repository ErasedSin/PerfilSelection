const track=document.getElementById('track');
const label=document.getElementById('label');
let items=[],index=0;

fetch('links.json').then(r=>r.json()).then(d=>{
 items=d.items;render();
});

function render(){
 track.innerHTML='';
 items.forEach((it,i)=>{
  const b=document.createElement('div');
  b.className='bubble'+(i===index?' active':'');
  b.onclick=()=> i===index?window.open(it.url):index=i,render();
  track.appendChild(b);
 });
 label.textContent=items[index].name;
}
