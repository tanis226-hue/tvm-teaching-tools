const src=require('fs').readFileSync('rentbuy.js','utf8').split('console.log')[0];
eval(src);
const f=n=>'$'+Math.round(n).toLocaleString();
const P={FORT_MYERS:{rent0:2500,ins:0.014},NATIONAL:{rent0:2200,ins:0.005}};
for(const [name,o] of Object.entries(P)){
  const s=sim({rate:0.0665,...o});
  let ti=0,bal=280000,r=0.0665/12;
  for(let m=1;m<=360;m++){const i=bal*r;ti+=i;bal-=s.pi-i;}
  const cTot=s.rows.find(x=>x.rentOut>x.buyOut);
  const eq=m=>s.rows[m-1].value-s.rows[m-1].bal;
  console.log(`\n--- ${name} ---`);
  console.log(`  upfront                ${f(s.upfront)}`);
  console.log(`  P&I                    ${f(s.pi)}`);
  console.log(`  breakeven month        ${s.be}  (${(s.be/12).toFixed(1)} yr)`);
  console.log(`  total interest         ${f(ti)}`);
  console.log(`  pmt1 principal/interest ${f(s.pi-280000*r)} / ${f(280000*r)}`);
  console.log(`  outlay crossing        yr ${(cTot.m/12).toFixed(1)}`);
  console.log(`  rent yr1 -> yr30       ${f(s.rows[0].rent)} -> ${f(s.rows[359].rent)}`);
  console.log(`  equity yr5/10/30       ${f(eq(60))} / ${f(eq(120))} / ${f(eq(360))}`);
  [36,60,120,360].forEach(m=>console.log(`  yr${String(m/12).padStart(3)}  buyer ${f(s.rows[m-1].buyNW).padStart(10)}  renter ${f(s.rows[m-1].rentNW).padStart(10)}`));
}
