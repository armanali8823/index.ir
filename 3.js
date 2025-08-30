// =======================
// Firebase Config
// =======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, ref, set, get, update, remove } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCy53wSqqSXf4uFSIxbW6RT1ND9LZ32uok",
  authDomain: "poyajahesh.firebaseapp.com",
  databaseURL: "https://poyajahesh-default-rtdb.firebaseio.com",
  projectId: "poyajahesh",
  storageBucket: "poyajahesh.firebasestorage.app",
  messagingSenderId: "129336211473",
  appId: "1:129336211473:web:f2ae34e45a5225369f99b0",
  measurementId: "G-6XHF5CP26F"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// =======================
// لیست کارمندان
// =======================
const employees = {
  "40480": "نسترن یکه فلاح",
  "40380": "محمدرضا ورزدار",
  "40387": "حسین کمالی",
  "40363": "داود ساعدی"
};

// =======================
// کمک‌کننده‌ها
// =======================
function todayStr(){ return new Date().toLocaleDateString('fa-IR'); }

// =======================
// صفحه حضور و غیاب شخصی
// =======================
const loginContainer = document.getElementById('loginContainer');
const attendanceContainer = document.getElementById('attendanceContainer');
const codeInput = document.getElementById('codeInput');
const loginBtn = document.getElementById('loginBtn');
const codeDisplay = document.getElementById('codeDisplay');
const nameDisplay = document.getElementById('nameDisplay');
const branchEl = document.getElementById('branch');
const entryBtn = document.getElementById('entryBtn');
const exitBtn = document.getElementById('exitBtn');
const currentDateEl = document.getElementById('currentDate');
const tbody = document.getElementById('myAttendance');

let currentEmployee = null;
currentDateEl.textContent = "تاریخ امروز: " + todayStr();

loginBtn.onclick = () => {
  const code = codeInput.value.trim();
  if(employees[code]){
    currentEmployee = { code, name: employees[code] };
    loginContainer.classList.add('hidden');
    attendanceContainer.classList.remove('hidden');
    codeDisplay.textContent = code;
    nameDisplay.textContent = currentEmployee.name;
    showMyAttendance();
  } else alert("کد پرسنلی معتبر نیست!");
};

async function showMyAttendance(){
  tbody.innerHTML = '';
  const today = todayStr();
  const snap = await get(ref(db, `attendance/${today}`));
  const data = snap.exists() ? Object.values(snap.val()) : [];
  const myRecords = data.filter(item => item.code === currentEmployee.code);
  myRecords.forEach(item=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.code}</td>
      <td>${item.entryTime}</td>
      <td>${item.exitTime || ''}</td>
      <td>${item.branch}</td>
    `;
    tbody.appendChild(tr);
  });
}

entryBtn.onclick = async () => {
  const branch = branchEl.value.trim();
  if(!branch){ alert('شعبه را وارد کنید'); return; }
  const now = new Date();
  const today = todayStr();
  const key = currentEmployee.code + '_' + branch;
  await set(ref(db, `attendance/${today}/${key}`), {
    code: currentEmployee.code,
    name: currentEmployee.name,
    entryTime: now.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}),
    exitTime: '',
    branch,
    date: today
  });
  showMyAttendance();
  entryBtn.disabled = true;
  exitBtn.disabled = false;
};

exitBtn.onclick = async () => {
  const branch = branchEl.value.trim();
  if(!branch){ alert('شعبه را وارد کنید'); return; }
  const today = todayStr();
  const key = currentEmployee.code + '_' + branch;
  const snap = await get(ref(db, `attendance/${today}/${key}`));
  if(!snap.exists() || snap.val().exitTime){
    alert("هیچ ورود باز برای این شعبه وجود ندارد!");
    return;
  }
  const now = new Date();
  await update(ref(db, `attendance/${today}/${key}`),{
    exitTime: now.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})
  });
  showMyAttendance();
  entryBtn.disabled = false;
  exitBtn.disabled = true;
  branchEl.value = '';
};

// =======================
// پنل مدیریت حضور و غیاب
// =======================
const managerTable = document.getElementById('managerAttendance');

async function loadAttendance(){
  const today = todayStr();
  const snap = await get(ref(db, `attendance/${today}`));
  window.attendance = snap.exists() ? Object.values(snap.val()) : [];
  showManagerAttendance();
}

function showManagerAttendance(){
  managerTable.innerHTML='';
  const snap = window.attendance || [];
  snap.forEach(item=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="code-cell">${item.code}</td>
      <td class="name-cell">${item.name}</td>
      <td><input type="text" class="entryInput" value="${item.entryTime}" disabled></td>
      <td><input type="text" class="exitInput" value="${item.exitTime}" disabled></td>
      <td><input type="text" class="branchInput" value="${item.branch}" disabled></td>
      <td class="delay-cell"><input type="number" class="delayInput" min="0" max="60" step="5" value="${item.delayIn||''}" disabled></td>
      <td class="delay-cell"><input type="number" class="extraDelayInput" min="0" max="120" step="5" value="${item.delayOut||''}" disabled></td>
      <td><button class="edit" onclick="enableEdit('${item.name}','${item.branch}')">ویرایش</button></td>
      <td><button class="save" onclick="saveEdit('${item.name}','${item.branch}')" disabled>ذخیره</button></td>
      <td><button class="delete" onclick="deleteRecord('${item.name}','${item.branch}')">حذف</button></td>
    `;
    managerTable.appendChild(tr);
  });
}

window.enableEdit = function(name, branch){
  for(let row of managerTable.children){
    if(row.cells[1].textContent===name && row.querySelector('.branchInput').value===branch){
      row.querySelectorAll('input').forEach(inp=>{ inp.disabled=false; inp.classList.add('editable'); });
      row.querySelector('button.save').disabled=false;
      break;
    }
  }
}

window.saveEdit = async function(name, branch){
  for(let row of managerTable.children){
    if(row.cells[1].textContent===name && row.querySelector('.branchInput').value===branch){
      const entry = row.querySelector('.entryInput').value;
      const exit = row.querySelector('.exitInput').value;
      const branchVal = row.querySelector('.branchInput').value;
      const delayIn = row.querySelector('.delayInput').value;
      const delayOut = row.querySelector('.extraDelayInput').value;
      const today = todayStr();
      const key = row.cells[0].textContent + '_' + branchVal;
      await update(ref(db, `attendance/${today}/${key}`), {entryTime: entry, exitTime: exit, delayIn, delayOut, branch: branchVal});
      loadAttendance();
      alert('تغییرات ذخیره شد ✅');
      break;
    }
  }
}

window.deleteRecord = async function(name, branch){
  if(confirm(`آیا مطمئنید که رکورد ${name} در شعبه ${branch} حذف شود؟`)){
    const today = todayStr();
    const key = managerTable.querySelector(`.name-cell:contains('${name}')`).parentElement.cells[0].textContent + '_' + branch;
    await remove(ref(db, `attendance/${today}/${key}`));
    loadAttendance();
  }
}

// =======================
// لود اولیه پنل مدیریت
// =======================
loadAttendance();
