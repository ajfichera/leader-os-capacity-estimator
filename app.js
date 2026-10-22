
(()=> {
  const STORAGE_KEY="leaderOSCapacityEstimatorV7";
  const WEEKS=12;
  const RAMP=.625;
  const BLS_COMP=88.63;
  const DEFAULTS={
    step:0,
    segment:"individual",
    leaders:1,
    leaks:{reactive:0,rework:0,decisions:0,dependency:0},
    programTime:1,
    reinvest:[]
  };

  const PRIORITY_COPY={
    "Priority work":"Protect more time for the work with the highest strategic consequence instead of allowing reactive demand to keep displacing it.",
    "Better preparation":"Use more capacity before important meetings, decisions, and conversations so the work starts with greater clarity and less downstream churn.",
    "Coaching the team":"Invest more time in building capability so more work can move without repeatedly returning to the leader.",
    "Customer / client work":"Put more leadership attention into customer relationships, delivery quality, important conversations, and issues that deserve senior involvement.",
    "Sales":"Use more leadership capacity for pipeline, key accounts, deal strategy, seller coaching, proposals, and other work that can influence growth.",
    "Strategic thinking":"Create more room to think beyond today's urgency: direction, priorities, tradeoffs, opportunities, and what the business should do next.",
    "Decision-making":"Use more time to make important decisions with the right context rather than making rushed decisions between interruptions.",
    "Hiring / talent":"Spend more leadership attention on selecting, developing, retaining, and positioning the people the organization needs.",
    "Fewer escalations":"Invest in clearer ownership, decision rights, and team capability so fewer issues need to climb back to the leader.",
    "Other":"Direct the capacity toward the higher-value work you identified as most important."
  };

  const $=id=>document.getElementById(id);
  const stages=[...document.querySelectorAll(".stage")];
  const progress=$("progress");
  const clone=()=>JSON.parse(JSON.stringify(DEFAULTS));

  function load(){
    try{
      const raw=sessionStorage.getItem(STORAGE_KEY);
      if(!raw)return clone();
      const saved=JSON.parse(raw);
      return {
        ...clone(),
        ...saved,
        leaks:{...clone().leaks,...(saved.leaks||{})},
        reinvest:Array.isArray(saved.reinvest)?saved.reinvest:[]
      };
    }catch(e){return clone();}
  }

  let state=load();
  const save=()=>{try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}};
  const num=(v,f=0)=>Number.isFinite(parseFloat(v))?parseFloat(v):f;
  const fmtHours=v=>`${(Math.round(v*10)/10).toLocaleString(undefined,{maximumFractionDigits:1})} hrs`;
  const fmtMoney=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);

  function weeklyPerLeader(){
    return Object.values(state.leaks).reduce((sum,v)=>sum+Math.max(0,num(v,0)),0);
  }

  function compute(){
    const leaders=state.segment==="individual"?1:Math.max(2,Math.min(12,num(state.leaders,8)));
    const weekly=weeklyPerLeader();
    const buildGross=weekly*leaders*WEEKS*RAMP;
    const participation=Math.max(.25,num(state.programTime,1))*leaders*WEEKS;
    const buildNet=Math.max(0,buildGross-participation);
    const next12=weekly*leaders*WEEKS;
    const annual=weekly*leaders*52;
    const economicContext=annual*BLS_COMP;
    return {leaders,weekly,buildGross,participation,buildNet,next12,annual,economicContext};
  }

  function sync(){
    document.querySelectorAll("[data-segment]").forEach(el=>el.classList.toggle("selected",el.dataset.segment===state.segment));
    $("teamCount").classList.toggle("show",state.segment==="team");
    $("leaderCount").value=state.leaders;

    document.querySelectorAll(".leak input").forEach(inp=>{
      inp.value=state.leaks[inp.dataset.key] ?? 0;
    });
    $("leakTotal").textContent=`${Math.round(weeklyPerLeader()*100)/100} hrs / week`;

    $("programTime").value=state.programTime;
    $("programTimeValue").textContent=`${state.programTime} hr${Number(state.programTime)===1?"":"s"}`;

    document.querySelectorAll("[data-reinvest]").forEach(el=>{
      el.classList.toggle("selected",state.reinvest.includes(el.dataset.reinvest));
    });
  }

  function renderPriorityCards(){
    const grid=$("priorityGrid");
    grid.innerHTML="";
    const priorities=state.reinvest.length?state.reinvest:["No priority selected"];
    priorities.forEach(item=>{
      const card=document.createElement("div");
      card.className="priority-card";
      const strong=document.createElement("strong");
      const p=document.createElement("p");
      if(item==="No priority selected"){
        strong.textContent="Your next question";
        p.textContent="You did not select a reinvestment area. The result can still show capacity, but its value depends on what you choose to do differently with that time.";
      }else{
        strong.textContent=item;
        p.textContent=PRIORITY_COPY[item] || PRIORITY_COPY["Other"];
      }
      card.appendChild(strong);card.appendChild(p);grid.appendChild(card);
    });
  }

  function renderPrintReport(r){
    $("pBuildNet").innerHTML=`${Math.round(r.buildNet*10)/10}<span> hrs</span>`;
    $("pNext12").innerHTML=`${Math.round(r.next12*10)/10}<span> hrs</span>`;
    $("pAnnual").innerHTML=`${(Math.round(r.annual*10)/10).toLocaleString(undefined,{maximumFractionDigits:1})}<span> hrs</span>`;
    $("pWeekly").textContent=`${Math.round(r.weekly*100)/100} hrs/wk`;
    $("pPeople").textContent=r.leaders;
    $("pProgram").textContent=fmtHours(r.participation);
    $("pEconomic").textContent=fmtMoney(r.economicContext);

    const wrap=$("printPriorities");
    wrap.innerHTML="";
    const values=state.reinvest.length?state.reinvest:["No reinvestment priority selected"];
    values.forEach(item=>{
      const chip=document.createElement("div");
      chip.className="print-priority";
      const strong=document.createElement("strong");
      strong.textContent=item;
      chip.appendChild(strong);
      wrap.appendChild(chip);
    });
  }

  function renderResults(){
    const r=compute();

    $("weeklyAssumption").textContent=`${Math.round(r.weekly*100)/100} hrs / leader / week`;
    $("assumptionExplain").textContent = r.leaders===1
      ? "This is the amount of leadership time you estimated could eventually be used differently each week if the operating patterns improve."
      : `This is the average amount of time you estimated each of the ${r.leaders} leaders could eventually redirect each week if the operating patterns improve.`;

    $("buildNet").innerHTML=`${Math.round(r.buildNet*10)/10}<span> hrs</span>`;
    $("next12").innerHTML=`${Math.round(r.next12*10)/10}<span> hrs</span>`;
    $("grossBuild").textContent=fmtHours(r.buildGross);
    $("participation").textContent=fmtHours(r.participation);
    $("people").textContent=r.leaders;
    $("annualizedTop").innerHTML=`${(Math.round(r.annual*10)/10).toLocaleString(undefined,{maximumFractionDigits:1})}<span> hrs</span>`;
    $("economicContext").textContent=fmtMoney(r.economicContext);

    renderPriorityCards();
    renderPrintReport(r);
  }

  function show(i,opts={}){
    const safe=Math.max(0,Math.min(stages.length-1,i));
    state.step=safe;
    save();
    stages.forEach((s,idx)=>s.classList.toggle("active",idx===safe));
    progress.style.width=`${(safe/(stages.length-1))*100}%`;
    if(safe===stages.length-1)renderResults();
    if(!opts.noScroll)window.scrollTo({top:0,behavior:"smooth"});
  }
  window.go=i=>show(i);

  document.querySelectorAll("[data-segment]").forEach(el=>el.addEventListener("click",()=>{
    state.segment=el.dataset.segment;
    state.leaders=state.segment==="individual"?1:Math.max(2,num(state.leaders,8));
    save();sync();
  }));

  $("leaderCount").addEventListener("input",e=>{
    state.leaders=Math.max(2,Math.min(12,parseInt(e.target.value||8,10)));
    save();
  });

  document.querySelectorAll(".leak input").forEach(inp=>inp.addEventListener("input",()=>{
    state.leaks[inp.dataset.key]=Math.max(0,num(inp.value,0));
    $("leakTotal").textContent=`${Math.round(weeklyPerLeader()*100)/100} hrs / week`;
    save();
  }));

  $("programTime").addEventListener("input",e=>{
    state.programTime=Math.max(.25,num(e.target.value,1));
    $("programTimeValue").textContent=`${state.programTime} hr${Number(state.programTime)===1?"":"s"}`;
    save();
  });

  document.querySelectorAll("[data-reinvest]").forEach(el=>el.addEventListener("click",()=>{
    const v=el.dataset.reinvest;
    state.reinvest=state.reinvest.includes(v)?state.reinvest.filter(x=>x!==v):[...state.reinvest,v];
    save();sync();
  }));

  $("contactLink").addEventListener("click",save);
  $("print").addEventListener("click",()=>{renderResults();window.print();});

  $("reset").addEventListener("click",()=>{
    state=clone();
    try{sessionStorage.removeItem(STORAGE_KEY);}catch(e){}
    sync();show(0);
  });

  window.addEventListener("pageshow",()=>{
    state=load();
    sync();
    show(state.step||0,{noScroll:true});
  });

  sync();
  show(state.step||0,{noScroll:true});

  window.__capacityQA={
    compute,
    setState:s=>{
      state={...clone(),...s,leaks:{...clone().leaks,...(s.leaks||{})},reinvest:Array.isArray(s.reinvest)?s.reinvest:[]};
      sync();
      return compute();
    },
    getState:()=>JSON.parse(JSON.stringify(state))
  };
})();
