// ======== بيانات المخزون والسلة والمرتجعات ========
let products = JSON.parse(localStorage.getItem("products")) || [];
let cart = [];
let returns = JSON.parse(localStorage.getItem("returns")) || [];
let notifiedLowStock = JSON.parse(localStorage.getItem("notifiedLowStock")) || [];


// ======== حفظ البيانات ========
function save() {
  localStorage.setItem("products", JSON.stringify(products));
  localStorage.setItem("returns", JSON.stringify(returns));
  renderProducts();
  dailyReport();
  updateStats();
  loadCashier();
  loadReturns();
}

// ======== إضافة منتج جديد / دمج مع القديم إذا موجود ========
function addProduct() {
  let name = document.getElementById("name").value.trim();
  let category = document.getElementById("category").value.trim();
  let price = parseFloat(document.getElementById("price").value);
  let quantity = parseInt(document.getElementById("quantity").value);

  if (!name || !category || isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
    return alert("أدخل بيانات صحيحة");
  }

  // البحث عن المنتج نفسه (نفس الاسم + الفئة + السعر)
  const existing = products.find(p =>
    p.name.trim().toLowerCase() === name.toLowerCase() &&
    p.category.trim().toLowerCase() === category.toLowerCase() &&
    Number(p.price) === price
  );

  if (existing) {
    existing.quantity += quantity;  // لو موجود، نزود الكمية فقط
  } else {
    products.push({
      id: Date.now(),
      name,
      category,
      price,
      quantity,
      soldToday: 0
    });
  }

  save();

  // مسح الـ inputs بعد الإضافة
  document.getElementById("name").value = "";
  document.getElementById("category").value = "";
  document.getElementById("price").value = "";
  document.getElementById("quantity").value = "";
}

// ======== عرض المخزون ========function renderProducts() {
  const tbody = document.getElementById("products");
  const search = document.getElementById("search").value.toLowerCase();
  tbody.innerHTML = "";

  products
    .filter(p => p.name.toLowerCase().includes(search))
    .forEach(p => {

      let stockClass = "";

      if (p.quantity >= 0 && p.quantity <= 49) {
        stockClass = "stock-danger";

        // 🔔 تنبيه مرة واحدة فقط
        if (!notifiedLowStock.includes(p.id)) {
          showToast(`⚠️ الصنف "${p.name}" قرب ينفد`);
          notifiedLowStock.push(p.id);
          localStorage.setItem("notifiedLowStock", JSON.stringify(notifiedLowStock));
        }

      } else if (p.quantity >= 50 && p.quantity <= 99) {
        stockClass = "stock-warning";

        // لو خرج من مرحلة الخطر نشيل التنبيه
        notifiedLowStock = notifiedLowStock.filter(id => id !== p.id);
        localStorage.setItem("notifiedLowStock", JSON.stringify(notifiedLowStock));
      }

      tbody.innerHTML += `
        <tr>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td>${p.price}</td>
          <td class="${stockClass}">${p.quantity}</td>
          <td>${p.soldToday}</td>
          <td>
            <button onclick="sellDirect(${p.id})">بيع مباشر</button>
            <button onclick="removeProduct(${p.id})" style="background:red">حذف</button>
          </td>
        </tr>
      `;
    });



// ======== بيع مباشر ========
function sellDirect(id) {
  const amount = +prompt("الكمية");
  const p = products.find(x => x.id === id);
  if (!p || amount <= 0 || amount > p.quantity) return alert("كمية غير صحيحة");

  p.quantity -= amount;
  p.soldToday += amount;
  save();
}

// ======== تحميل الكاشير ========
function loadCashier() {
  const select = document.getElementById("cashierProduct");
  select.innerHTML = "";
  products.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.name} (متاح ${p.quantity})</option>`;
  });
}

// ======== إضافة للسلة ========
function addToCart() {
  const id = +cashierProduct.value;
  const qty = +cashierQty.value;
  const product = products.find(p => p.id === id);

  if (!product || qty <= 0 || qty > product.quantity)
    return alert("كمية غير صحيحة");

  const item = cart.find(i => i.id === id);
  if (item) item.qty += qty;
  else cart.push({ id, name: product.name, price: product.price, qty });

  renderCart();
}

// ======== عرض السلة ========
function renderCart() {
  cartTable.innerHTML = "";
  let total = 0;

  cart.forEach((i, index) => {
    const sum = i.qty * i.price;
    total += sum;

    cartTable.innerHTML += `
      <tr>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>${i.price}</td>
        <td>${sum}</td>
        <td><button onclick="removeFromCart(${index})">❌</button></td>
      </tr>
    `;
  });

  cartTotal.innerText = `الإجمالي: ${total} ج`;
}

// ======== حذف من السلة ========
function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

// ======== إتمام البيع ========
function checkout() {
  if (cart.length === 0) return alert("السلة فاضية");

  cart.forEach(item => {
    const p = products.find(x => x.id === item.id);
    p.quantity -= item.qty;
    p.soldToday += item.qty;
  });

  cart = [];
  renderCart();
  save();
  alert("تم البيع بنجاح ✅");
}

// ======== الجرد اليومي ========
function dailyReport() {
  const table = document.getElementById("dailyTable");
  table.innerHTML = "";
  let sold = 0, money = 0;

  products.forEach(p => {
    if (p.soldToday > 0) {
      const total = p.soldToday * p.price;
      sold += p.soldToday;
      money += total;

      table.innerHTML += `
        <tr>
          <td>${p.name}</td>
          <td>${p.soldToday}</td>
          <td>${total} ج</td>
        </tr>
      `;
    }
  });

  soldText.innerText = `إجمالي المباع: ${sold}`;
  moneyText.innerText = `إجمالي الإيراد: ${money} ج`;
}

// ======== Dashboard ========
function updateStats() {
  let qty = 0, sold = 0, money = 0;
  products.forEach(p => {
    qty += p.quantity;
    sold += p.soldToday;
    money += p.soldToday * p.price;
  });

  statProducts.innerText = products.length;
  statQty.innerText = qty;
  statSold.innerText = sold;
  statMoney.innerText = money;
}

// ======== حذف منتج ========
function removeProduct(id) {
  if (confirm("حذف الصنف؟")) {
    products = products.filter(p => p.id !== id);
    save();
  }
}

// ======== إنهاء اليوم ========
function resetDaily() {
  if (confirm("إنهاء اليوم؟")) {
    products.forEach(p => p.soldToday = 0);
    returns = []; // مسح المرتجعات
    save();
    alert("تم إنهاء اليوم ✅");
  }
}

// ======== تصدير PDF بالعربي باستخدام html2canvas + jsPDF ========
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');

  const today = new Date();
  const dateStr = today.toLocaleDateString("ar-EG"); // التاريخ بالعربي

  doc.setFontSize(16);
  doc.text("تقرير المخزون", 40, 40);
  doc.setFontSize(12);
  doc.text(`التاريخ: ${dateStr}`, 40, 60);

  // نص عربي كامل باستخدام html2canvas
  html2canvas(document.body).then(canvas => {
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(imgData, 'PNG', 10, 80, 580, 0);
    doc.save(`Inventory_${dateStr}.pdf`);
  });
}

// ======== Dark Mode ========
function toggleDark() {
  document.body.classList.toggle("dark");
}

// ======== المرتجعات ========
function loadReturns() {
  const select = document.getElementById("returnProduct");
  select.innerHTML = "";
  products.forEach(p => {
    select.innerHTML += `<option value="${p.id}">${p.name} (متاح ${p.quantity})</option>`;
  });
  renderReturnTable();
}

function processReturn() {
  const id = +document.getElementById("returnProduct").value;
  const qty = +document.getElementById("returnQty").value;
  const product = products.find(p => p.id === id);

  if (!product || qty <= 0) return alert("كمية غير صحيحة");

  product.quantity += qty;
  product.soldToday -= qty;
  if (product.soldToday < 0) product.soldToday = 0;

  returns.push({
    id: product.id,
    name: product.name,
    qty,
    date: new Date().toLocaleString("ar-EG")
  });

  save();
  renderReturnTable();

  document.getElementById("returnQty").value = "";
  alert("تمت عملية الإرجاع ✅");
}

function renderReturnTable() {
  const tbody = document.getElementById("returnTable");
  tbody.innerHTML = "";
  returns.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.name}</td>
        <td>${r.qty}</td>
        <td>${r.date}</td>
      </tr>
    `;
  });
}

// ======== عناصر الصفحة ========
const cashierProduct = document.getElementById("cashierProduct");
const cashierQty = document.getElementById("cashierQty");
const cartTable = document.getElementById("cartTable");
const cartTotal = document.getElementById("cartTotal");
const soldText = document.getElementById("sold");
const moneyText = document.getElementById("money");

// ======== تشغيل الوظائف عند التحميل ========
renderProducts();
dailyReport();
updateStats();
loadCashier();
loadReturns();
// ======== عرض المخزون ========
function renderProducts() {
  const tbody = document.getElementById("products");
  const search = document.getElementById("search").value.toLowerCase();
  tbody.innerHTML = "";

  products
    .filter(p => p.name.toLowerCase().includes(search))
    .forEach(p => {

      let stockClass = "";

      if (p.quantity >= 0 && p.quantity <= 49) {
        stockClass = "stock-danger";   // 🔴 أحمر
      } else if (p.quantity >= 50 && p.quantity <= 99) {
        stockClass = "stock-warning";  // 🟡 أصفر
      }

      tbody.innerHTML += `
        <tr>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td>${p.price}</td>
          <td class="${stockClass}">${p.quantity}</td>
          <td>${p.soldToday}</td>
          <td>
            <button onclick="sellDirect(${p.id})">بيع مباشر</button>
            <button onclick="removeProduct(${p.id})" style="background:red">حذف</button>
          </td>
        </tr>
      `;
    });
}


function showToast(message) {
  const container = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

