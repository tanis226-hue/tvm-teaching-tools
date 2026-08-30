const INFL=0.03, R_PRE=0.075, R_POST=0.04, LIFE=85, RESID=0.10;

function calc(curAge, retAge, incomeToday, opts={}){
  const rateConv = opts.rateConv || 'apr12';      // 'apr12' | 'geo'
  const inflConv = opts.inflConv || 'geo';        // 'geo'   | 'apr12'
  const residual = opts.residual || 'nominal';    // 'nominal' | 'real'

  const i  = rateConv==='apr12' ? R_POST/12 : Math.pow(1+R_POST,1/12)-1;
  const ip = rateConv==='apr12' ? R_PRE/12  : Math.pow(1+R_PRE,1/12)-1;
  const g  = inflConv==='geo'   ? Math.pow(1+INFL,1/12)-1 : INFL/12;

  const yrsSave = retAge-curAge, N = yrsSave*12;
  const yrsDraw = LIFE-retAge,   n = yrsDraw*12;

  const P = incomeToday*Math.pow(1+INFL, yrsSave);
  const PV = P/(i-g)*(1-Math.pow((1+g)/(1+i), n));
  const residFrac = residual==='nominal' ? RESID : RESID*Math.pow(1+INFL,yrsDraw);
  const L = PV/(1-residFrac/Math.pow(1+i,n));
  const fvFactor = (Math.pow(1+ip,N)-Math.pow(1+g,N))/(ip-g);
  const pmt1 = L/fvFactor;
  const pmtLast = pmt1*Math.pow(1+g,N-1);
  const totalContrib = pmt1*(Math.pow(1+g,N)-1)/g;
  return {P,L,pmt1,pmtLast,totalContrib,yrsDraw};
}

const f=n=>'$'+Math.round(n).toLocaleString();
const chk=(label,got,want)=>{
  const d=Math.abs(got-want)/want*100;
  console.log(`  ${d<0.5?'PASS':'FAIL'}  ${label.padEnd(26)} got ${f(got).padStart(12)}  want ${f(want).padStart(12)}  (${d.toFixed(3)}%)`);
  return d<0.5;
};

console.log('\n=== Worked example: age 20, retire 65, $5,000/mo ===');
let r=calc(20,65,5000);
chk('first withdrawal',r.P,18908);
chk('lump sum',r.L,4278724);
chk('first contribution',r.pmt1,644);
chk('final contribution',r.pmtLast,2430);
chk('total contributed',r.totalContrib,726388);

console.log('\n=== Cost of waiting (retire 65, $5,000/mo) ===');
[[20,644],[25,839],[30,1107],[35,1486],[40,2042]].forEach(([a,w])=>
  chk(`start age ${a}`,calc(a,65,5000).pmt1,w));

console.log('\n=== Retirement age sensitivity (age 20, $5,000/mo) ===');
[[55,4475000,1556],[60,4461945,1015],[65,4278724,644],[70,3855055,387],[75,3095719,209]]
 .forEach(([ra,wl,wp])=>{const x=calc(20,ra,5000);chk(`retire ${ra} lump`,x.L,wl);chk(`retire ${ra} pmt`,x.pmt1,wp);});

console.log('\n=== The shrinking million ===');
[[20,553676,1806111],[30,411987,2427262],[40,306557,3262038],[45,264439,3781596]]
 .forEach(([y,back,fwd])=>{chk(`${y}yr $1M -> today`,1e6/Math.pow(1.03,y),back);chk(`${y}yr $1M -> future`,1e6*Math.pow(1.03,y),fwd);});

console.log('\n=== Alternative conventions (age 20/65/$5k) — do they match $644? ===');
[['apr12/geo/nominal (spec)',{}],
 ['all-geometric',{rateConv:'geo'}],
 ['all-APR/12',{inflConv:'apr12'}],
 ['real residual',{residual:'real'}]].forEach(([n,o])=>{
   const x=calc(20,65,5000,o);
   console.log(`  ${n.padEnd(26)} lump ${f(x.L).padStart(12)}   pmt ${f(x.pmt1).padStart(8)}`);
 });
