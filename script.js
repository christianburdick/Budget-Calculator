let bills = [];
function parseInputDate(dateStr){ const [y,m,d]=dateStr.split("-").map(Number); return new Date(y,m-1,d); }
function computePayPeriodEnd(startDate, scope){
  let end = new Date(startDate);
  switch(scope){
    case "weekly": end.setDate(end.getDate()+6); break;
    case "biweekly": end.setDate(end.getDate()+13); break;
    case "monthly": end = new Date(end.getFullYear(), end.getMonth()+1, 0); break;
    case "yearly": end.setFullYear(end.getFullYear()+1); end.setDate(end.getDate()-1); break;
  }
  return end;
}
function generateBillOccurrences(periodStart, periodEnd, billAnchor, billFrequency){
  let occurrences=[]; let current=new Date(billAnchor);
  while(current<periodStart){
    switch(billFrequency){
      case "weekly": current.setDate(current.getDate()+7); break;
      case "biweekly": current.setDate(current.getDate()+14); break;
      case "monthly": current.setMonth(current.getMonth()+1); break;
      case "yearly": current.setFullYear(current.getFullYear()+1); break;
    }
  }
  while(current<=periodEnd){ occurrences.push(new Date(current));
    switch(billFrequency){
      case "weekly": current.setDate(current.getDate()+7); break;
      case "biweekly": current.setDate(current.getDate()+14); break;
      case "monthly": current.setMonth(current.getMonth()+1); break;
      case "yearly": current.setFullYear(current.getFullYear()+1); break;
    }
  }
  return occurrences;
}

// --- LocalStorage ---
function saveToLocalStorage(){
  localStorage.setItem("bills", JSON.stringify(bills.map(b=>({name:b.name,amount:b.amount,frequency:b.frequency,anchor:b.anchor.toISOString().split("T")[0]}))));
  localStorage.setItem("income", document.getElementById("income").value);
  localStorage.setItem("payRange", document.getElementById("payRange").value);
  localStorage.setItem("payAnchor", document.getElementById("payAnchor").value);
}
function loadFromLocalStorage(){
  const savedBills = JSON.parse(localStorage.getItem("bills")||"[]");
  bills = savedBills.map(b=>({name:b.name,amount:b.amount,frequency:b.frequency,anchor:parseInputDate(b.anchor)}));
  document.getElementById("income").value=localStorage.getItem("income")||"";
  document.getElementById("payRange").value=localStorage.getItem("payRange")||"monthly";
  document.getElementById("payAnchor").value=localStorage.getItem("payAnchor")||"";
}
loadFromLocalStorage();

// --- Modal Handling ---
function openModal(modal){ modal.style.display="flex"; }
function closeModal(modal){ modal.style.display="none"; }
document.getElementById("incomeBtn").onclick=()=>openModal(document.getElementById("incomeModal"));
document.getElementById("billsBtn").onclick=()=>openModal(document.getElementById("billsModal"));
document.getElementById("closeIncome").onclick=()=>closeModal(document.getElementById("incomeModal"));
document.getElementById("closeBills").onclick=()=>closeModal(document.getElementById("billsModal"));

// --- Bill Management ---
function renderBills(){
  const list = document.getElementById("billList"); list.innerHTML="";
  bills.forEach((bill,index)=>{
    const div=document.createElement("div"); 
div.className="bill-row"; // no shaded class in modal
    div.innerHTML=`
      <input type="text" value="${bill.name}" onchange="updateBill(${index},'name',this.value)" placeholder="Bill name">
      <input type="number" value="${bill.amount}" onchange="updateBill(${index},'amount',parseFloat(this.value))" placeholder="Amount">
      <select onchange="updateBill(${index},'frequency',this.value)">
        <option value="weekly" ${bill.frequency==="weekly"?"selected":""}>Weekly</option>
        <option value="biweekly" ${bill.frequency==="biweekly"?"selected":""}>Bi-Weekly</option>
        <option value="monthly" ${bill.frequency==="monthly"?"selected":""}>Monthly</option>
        <option value="yearly" ${bill.frequency==="yearly"?"selected":""}>Yearly</option>
      </select>
      <input type="date" value="${bill.anchor.toISOString().split("T")[0]}" onchange="updateBill(${index},'anchor',this.value)">
      <span class="occurrences" id="preview-${index}"></span>
      <button class="remove-btn" onclick="removeBill(${index})">×</button>
    `;
    list.appendChild(div);
    updateBillPreview(index);
  });
}
function updateBill(index, field, value){
  if(field==="anchor") value=parseInputDate(value);
  bills[index][field]=value;
  updateBillPreview(index);
}
function removeBill(index){ bills.splice(index,1); renderBills(); }
function addEmptyBillRow(){ bills.push({name:"",amount:0,frequency:"monthly",anchor:new Date()}); renderBills(); }
function updateBillPreview(index){
  const periodStartStr=document.getElementById("payAnchor").value;
  const scope=document.getElementById("payRange").value;
  if(!periodStartStr) return;
  const periodStart=parseInputDate(periodStartStr);
  const periodEnd=computePayPeriodEnd(periodStart,scope);
  const occ=generateBillOccurrences(periodStart,periodEnd,bills[index].anchor,bills[index].frequency);
  document.getElementById(`preview-${index}`).textContent=occ.length?`Occurs ${occ.length} times`:"";
}

// --- Save Buttons ---
document.getElementById("saveIncome").onclick=()=>{
  saveToLocalStorage();
  const msg=document.getElementById("incomeSaved"); msg.style.display="inline";
  setTimeout(()=>msg.style.display="none",1000);
  closeModal(document.getElementById("incomeModal"));
};
document.getElementById("saveBills").onclick=()=>{
  saveToLocalStorage();
  const msg=document.getElementById("billsSaved"); msg.style.display="inline";
  setTimeout(()=>msg.style.display="none",1000);
  closeModal(document.getElementById("billsModal"));
};
renderBills();

// --- Calculate Budget ---
document.getElementById("calculateBtn").onclick = () => {
  const output = document.getElementById("budgetOutput");
  output.style.background = "#ffffcc";
  setTimeout(() => output.style.background = "#fff", 300);

  const income = parseFloat(document.getElementById("income").value);
  const scope = document.getElementById("payRange").value;
  const anchorStr = document.getElementById("payAnchor").value;
  if (isNaN(income) || !anchorStr) { alert("Enter income and pay date"); return; }

  const periodStart = parseInputDate(anchorStr);
  const periodEnd = computePayPeriodEnd(periodStart, scope);

  let totalBills = 0;
  let billDetailsHTML = "";

  bills.forEach((bill, idx) => {
    const occ = generateBillOccurrences(periodStart, periodEnd, bill.anchor, bill.frequency);
    const billTotal = bill.amount * occ.length;
    totalBills += billTotal;

    const dateStrings = occ.map(d => `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`).join(", ");

    billDetailsHTML += `
      <div class="${idx%2===0?'shaded':''}">
      <p>${bill.name}: $${bill.amount} × ${occ.length} = $${billTotal.toFixed(2)}</p>
      <p style="font-size:0.85em;color:#555;">Dates: ${dateStrings || "No occurrences in this period"}</p>
      </div>
    `;
  });

  const leftover = income - totalBills;
  output.innerHTML = `
    <p><strong>Income (${scope}):</strong> $${income.toFixed(2)}</p>
    <p><strong>Total Bills:</strong> $${totalBills.toFixed(2)}</p>
    <p><strong>Spending Money Left:</strong> $${leftover.toFixed(2)}</p>
    <hr>
    <h3>Bill Details:</h3>
    ${billDetailsHTML}
  `;
};