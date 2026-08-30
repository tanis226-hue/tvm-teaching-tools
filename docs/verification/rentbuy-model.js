function sim(o){
  const price=o.price??350000, downPct=o.downPct??0.20, rate=o.rate??0.065, termY=o.termY??30,
    closeBuy=o.closeBuy??0.03, closeSell=o.closeSell??0.06, tax=o.tax??0.011, maint=o.maint??0.010,
    ins=o.ins??0.005, hoa=o.hoa??0, appr=o.appr??0.035, pmiRate=o.pmiRate??0.005,
    rent0=o.rent0??1800, rentInc=o.rentInc??0.03, rIns=o.rIns??15, ret=o.ret??0.075,
    rentStep=o.rentStep??'monthly';

  const r=rate/12, N=termY*12, retM=ret/12;
  const apprM=Math.pow(1+appr,1/12)-1, rentM=Math.pow(1+rentInc,1/12)-1;
  let bal=price*(1-downPct);
  const pi=bal*r/(1-Math.pow(1+r,-N));
  const upfront=price*downPct+price*closeBuy;

  let buyInv=0, rentInv=upfront, value=price, be=null;
  const rows=[];
  for(let m=1;m<=360;m++){
    const interest=bal*r, principal=pi-interest;
    bal=Math.max(0,bal-principal);
    value*=(1+apprM);
    const pmi = (bal/value>0.80) ? bal*pmiRate/12 : 0;
    const buyOut = pi + value*(tax+maint+ins)/12 + hoa + pmi;
    const rent = rentStep==='monthly' ? rent0*Math.pow(1+rentM,m-1)
                                      : rent0*Math.pow(1+rentInc,Math.floor((m-1)/12));
    const rentOut = rent + rIns;
    buyInv*=(1+retM); rentInv*=(1+retM);
    const d=rentOut-buyOut;
    if(d>0) buyInv+=d; else rentInv+=-d;
    const buyNW = value - bal - value*closeSell + buyInv;
    const rentNW = rentInv;
    if(be===null && buyNW>rentNW) be=m;
    rows.push({m,pi,rent,buyOut,rentOut,buyNW,rentNW,value,bal});
  }
  return {pi,upfront,be,rows};
}
const f=n=>'$'+Math.round(n).toLocaleString();
const yr=m=>m===null?'never':`${(m/12).toFixed(1)} yr`;

console.log('\n=== Breakeven sensitivity to mortgage rate (all other PRD defaults) ===');
[0.060,0.065,0.0665,0.070,0.075].forEach(rate=>{
  const s=sim({rate});
  console.log(`  rate ${(rate*100).toFixed(2)}%   P&I ${f(s.pi).padStart(7)}   breakeven ${yr(s.be).padStart(8)}`);
});

console.log('\n=== At 6.65%: what moves the breakeven back into 5-8 yr? ===');
const base={rate:0.0665};
[['PRD defaults',{}],
 ['rent $1,950 start',{rent0:1950}],
 ['rent $2,000 start',{rent0:2000}],
 ['rent +3.5%/yr',{rentInc:0.035}],
 ['appreciation 4.0%',{appr:0.040}],
 ['investment return 7.0%',{ret:0.070}],
 ['maintenance 0.75%',{maint:0.0075}],
 ['rent $1,950 + appr 4.0%',{rent0:1950,appr:0.040}],
].forEach(([label,o])=>{
  const s=sim({...base,...o});
  console.log(`  ${label.padEnd(26)} breakeven ${yr(s.be).padStart(8)}`);
});

console.log('\n=== Teaching-moment checks at 6.65%, rent $1,950 ===');
const s=sim({rate:0.0665,rent0:1950});
console.log(`  upfront cash            ${f(s.upfront)}`);
console.log(`  P&I (flat 30 yrs)       ${f(s.pi)}`);
console.log(`  rent at yr 1 / yr 30    ${f(s.rows[0].rent)} -> ${f(s.rows[359].rent)}  (${(s.rows[359].rent/s.rows[0].rent).toFixed(2)}x)`);
const cross=s.rows.find(x=>x.rent>s.pi);
console.log(`  rent passes P&I at      yr ${(cross.m/12).toFixed(1)}`);
console.log(`  breakeven               ${yr(s.be)}`);
let ti=0,bal=350000*0.8,r=0.0665/12,pi=s.pi;
for(let m=1;m<=360;m++){const i=bal*r;ti+=i;bal-=pi-i;}
console.log(`  total interest paid     ${f(ti)}`);
const p1=s.rows[0];
console.log(`  payment 1 principal     ${f(p1.pi-350000*0.8*r)} of ${f(pi)}  (${((p1.pi-350000*0.8*r)/pi*100).toFixed(1)}%)`);
