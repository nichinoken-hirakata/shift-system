// 1. Supabaseの初期設定
const SUPABASE_URL = 'https://vekslcqvttjhjepvaslp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZla3NsY3F2dHRqaGplcHZhc2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMDUyMjMsImV4cCI6MjA5MTc4MTIyM30.IX0dEp68SVr90AJKK9yzrNKv1GOIwSKllBahmE0zj0M';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. カレンダー(Flatpickr)の起動
const fp = flatpickr("#date-picker", {
    mode: "multiple",
    dateFormat: "Y-m-d",
    locale: "ja",
    minDate: "today",
    static: true
});

let staffDataList = [];

async function loadNotice() {
    try {
        const { data } = await _supabase.from('notice').select('content').order('id', { ascending: false }).limit(1);
        const noticeBoard = document.getElementById('notice-board');
        if (data && data[0]) { noticeBoard.innerText = data[0].content; }
    } catch (e) { console.error(e); }
}

async function loadStaffList() {
    try {
        const { data } = await _supabase.from('staff_list').select('name, is_tutor').order('name', { ascending: true });
        const select = document.getElementById('staff-name');
        const savedName = localStorage.getItem('myStaffName');
        if (data) {
            staffDataList = data;
            select.innerHTML = '<option value="">選択してください</option>';
            data.forEach(staff => {
                const opt = document.createElement('option');
                opt.value = staff.name;
                opt.textContent = staff.name;
                select.appendChild(opt);
            });
            if (savedName) { select.value = savedName; }
        }
    } catch (e) { console.error(e); }
}

loadNotice();
loadStaffList();

// --- 5. 送信ボタンを押した時の処理 ---
document.getElementById('submit-btn').addEventListener('click', async () => {
    const selectedDates = fp.selectedDates;
    const start = document.getElementById('start-time').value;
    const end = document.getElementById('end-time').value;
    const name = document.getElementById('staff-name').value; 
    
    // 【重要】ここでプルダウンで選ばれた「役割」を直接取得します
    const roleSelectElement = document.getElementById('role-select');
    const selectedRole = roleSelectElement.value; 
    
    const statusMessage = document.getElementById('status-message');

    if (!name) { alert("名前を選択してください"); return; }

    // ★ チューター資格チェック ★
    if (selectedRole === "チューター") {
        const staff = staffDataList.find(s => s.name === name);
        if (staff && staff.is_tutor === false) {
            alert("あなたはチューター資格が登録されていません。教室長に伝えてチューター試験を受けるか、他の役割を選択してください。");
            return;
        }
    }

    if (selectedDates.length === 0) { alert("日付を選択してください"); return; }

    statusMessage.innerText = "送信中...";
    statusMessage.style.color = "black";

    // 【確実性アップ】insertするデータに is_confirmed: false を含めます
    const insertData = selectedDates.map(date => {
        const formattedDate = date.toISOString().split('T')[0];
        return {
            staff_name: name,
            role: selectedRole, 
            work_date: formattedDate,
            shift_time: `${start}〜${end}`,
            is_confirmed: false
        };
    });

    const { error } = await _supabase.from('shifts').insert(insertData);

    if (error) {
        statusMessage.innerText = "エラーが発生しました";
        statusMessage.style.color = "red";
        console.error(error);
    } else {
        statusMessage.innerText = `${selectedDates.length}件の希望（${selectedRole}）を送信しました！`;
        statusMessage.style.color = "blue";
        localStorage.setItem('myStaffName', name);
        fp.clear(); 
    }
});